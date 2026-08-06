export type UserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
export type WorkspaceStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
export type MembershipStatus = "ACTIVE" | "INACTIVE" | "REMOVED";
export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER";
export type WorkspacePlan = "FREE" | "PRO" | "BUSINESS";
export type GoogleDriveConnectionStatus = "DISCONNECTED" | "CONNECTED" | "ERROR";

export interface User {
  id: string;
  googleSub: string;
  email: string;
  googleName: string;
  displayName: string | null;
  profileImageUrl: string | null;
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
}
