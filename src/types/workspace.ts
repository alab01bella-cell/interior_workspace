export type UserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
export type WorkspaceStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
export type MembershipStatus = "ACTIVE" | "INACTIVE" | "REMOVED";
export type WorkspaceRole = "OWNER" | "MEMBER";
export type WorkspacePlan = "FREE" | "PRO" | "BUSINESS";
export type GoogleDriveConnectionStatus = "DISCONNECTED" | "CONNECTED" | "ERROR";
export type DriveConnectionStatus = "CONNECTED" | "REVOKED" | "ERROR";

export interface WorkspaceGoogleConnection {
  id: string;
  workspaceId: string;
  connectedByUserId: string;
  googleAccountEmail: string;
  encryptedRefreshToken: string | null;
  tokenIv: string | null;
  tokenAuthTag: string | null;
  grantedScopes: string[];
  driveRootFolderId: string | null;
  connectionStatus: DriveConnectionStatus;
  connectedAt: string;
  updatedAt: string;
  revokedAt: string | null;
}

export type PublicWorkspaceGoogleConnection = Omit<
  WorkspaceGoogleConnection,
  "encryptedRefreshToken" | "tokenIv" | "tokenAuthTag"
>;

export interface User {
  id: string;
  googleSub: string;
  email: string;
  googleName: string;
  displayName: string | null;
  profileImageUrl: string | null;
  googleProfileImageUrl: string | null;
  customProfileDriveFileId: string | null;
  customProfileWorkspaceId: string | null;
  jobTitle: string | null;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  status: UserStatus;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
  plan: WorkspacePlan;
  onboardingCompleted: boolean;
  googleDriveConnectionStatus: GoogleDriveConnectionStatus;
  createdAt: string;
  updatedAt: string;
  status: WorkspaceStatus;
  consultationShortCode: string | null;
}

export interface WorkspaceMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  status: MembershipStatus;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceContext {
  user: User;
  workspace: Workspace;
  membership: WorkspaceMembership;
}

export interface WorkspaceIdentity {
  displayName: string;
  email: string;
  profileImageUrl: string | null;
  jobTitle: string | null;
  workspaceName: string;
  consultationChecklistUrl: string | null;
}
