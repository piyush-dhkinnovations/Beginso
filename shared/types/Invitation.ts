import type { WorkspaceId } from './Workspace';
import type { Role } from './Membership';

export type InvitationId = string;

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';

export interface Invitation {
  id: InvitationId;
  workspaceId: WorkspaceId;
  email: string;
  role: Role;
  status: InvitationStatus;
  token: string;
  expiresAt: string;
  createdAt: string;
}
