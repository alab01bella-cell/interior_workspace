import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig } from "@/lib/auth/config";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { clearDriveProcessCookie, DRIVE_PROCESS_COOKIE, unseal } from "@/lib/auth/session";
import {
  createDriveRootFolder,
  deleteDriveFolder,
  DRIVE_FILE_SCOPE,
  getDriveAccountEmail,
  isUsableDriveFolder,
} from "@/lib/google/drive-api";
import { findDriveConnection, saveConnectedDrive } from "@/lib/google/drive-connection-repository";
import { encryptRefreshToken } from "@/lib/google/token-encryption";

export const runtime = "nodejs";

interface DriveProcessTransaction {
  state: string;
  codeVerifier: string;
  workspaceId: string;
  userId: string;
  code: string;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

type ProcessEvent =
  | { type: "step"; step: "account" | "security" | "folder" | "save" }
  | { type: "complete"; email: string; workspaceName: string; folderId: string }
  | { type: "error"; reason: "expired" | "account" | "security" | "folder" | "save" | "temporary" };

function publicReason(error: unknown): Extract<ProcessEvent, { type: "error" }>["reason"] {
  const message = error instanceof Error ? error.message : "";
  if (["drive_account_unavailable", "token_exchange_failed", "invalid_token_response", "drive_scope_missing"].includes(message)) return "account";
  if (["drive_encryption_not_configured", "refresh_token_missing"].includes(message)) return "security";
  if (["drive_folder_check_failed", "drive_folder_create_failed"].includes(message)) return "folder";
  if (message === "connection_save_failed") return "save";
  return "temporary";
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get(DRIVE_PROCESS_COOKIE)?.value;
  const transaction = token ? await unseal<DriveProcessTransaction>(token) : null;
  const context = await getWorkspaceContextForSession();
  if (!transaction || !context || transaction.workspaceId !== context.workspace.id || transaction.userId !== context.user.id) {
    return NextResponse.json({ error: "expired" }, { status: 409 });
  }
  if (context.membership.role !== "OWNER") {
    return NextResponse.json({ error: "owner_required" }, { status: 403 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ProcessEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      let createdFolderId: string | null = null;
      let accessToken: string | null = null;
      try {
        const config = getAuthConfig();
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code: transaction.code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: `${config.baseUrl}/api/google/drive/callback`,
            grant_type: "authorization_code",
            code_verifier: transaction.codeVerifier,
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(30_000),
        });
        if (!tokenResponse.ok) throw new Error("token_exchange_failed");
        const tokens = await tokenResponse.json() as TokenResponse;
        if (!tokens.access_token || !tokens.expires_in) throw new Error("invalid_token_response");
        accessToken = tokens.access_token;
        const grantedScopes = (tokens.scope ?? "").split(" ").filter(Boolean);
        if (!grantedScopes.includes(DRIVE_FILE_SCOPE)) throw new Error("drive_scope_missing");

        const [email, existing] = await Promise.all([
          getDriveAccountEmail(tokens.access_token),
          findDriveConnection(context.workspace.id),
        ]);
        send({ type: "step", step: "account" });

        const encryptedToken = tokens.refresh_token
          ? await encryptRefreshToken(tokens.refresh_token, context.workspace.id)
          : existing?.encryptedRefreshToken && existing.tokenIv && existing.tokenAuthTag
            ? { ciphertext: existing.encryptedRefreshToken, iv: existing.tokenIv, authTag: existing.tokenAuthTag }
            : null;
        if (!encryptedToken) throw new Error("refresh_token_missing");
        send({ type: "step", step: "security" });

        let folderId = existing?.driveRootFolderId ?? null;
        if (folderId && !await isUsableDriveFolder(tokens.access_token, folderId)) folderId = null;
        if (!folderId) {
          folderId = await createDriveRootFolder(tokens.access_token, context.workspace.name);
          createdFolderId = folderId;
        }
        send({ type: "step", step: "folder" });

        try {
          await saveConnectedDrive({
            workspaceId: context.workspace.id,
            userId: context.user.id,
            email,
            token: encryptedToken,
            grantedScopes,
            folderId,
          });
        } catch {
          throw new Error("connection_save_failed");
        }
        createdFolderId = null;
        send({ type: "step", step: "save" });
        send({ type: "complete", email, workspaceName: context.workspace.name, folderId });
      } catch (error) {
        if (createdFolderId && accessToken) {
          try { await deleteDriveFolder(accessToken, createdFolderId); } catch { /* best-effort compensation */ }
        }
        send({ type: "error", reason: publicReason(error) });
      } finally {
        controller.close();
      }
    },
  });

  const response = new NextResponse(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
  clearDriveProcessCookie(response);
  return response;
}
