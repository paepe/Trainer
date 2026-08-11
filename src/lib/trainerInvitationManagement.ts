export type InvitationStatus = 'sent' | 'accepted' | 'declined' | 'expired' | 'revoked';
export type InvitationFilter = 'all' | InvitationStatus;
export type InvitationArchiveScope = 'active' | 'archived';
export type InvitationSort = 'recent' | 'oldest' | 'nameAsc' | 'nameDesc' | 'status';

export interface ManagedTrainerInvitation {
  id: string;
  invited_name: string;
  invited_email: string;
  status: string;
  created_at: string | null;
  expires_at: string;
  archived_at?: string | null;
}

export function effectiveInvitationStatus(invitation: Pick<ManagedTrainerInvitation, 'status' | 'expires_at'>): InvitationStatus {
  return invitation.status === 'sent' && new Date(invitation.expires_at) < new Date()
    ? 'expired'
    : invitation.status as InvitationStatus;
}

export function visibleTrainerInvitations(
  invitations: ManagedTrainerInvitation[],
  archiveScope: InvitationArchiveScope,
  filter: InvitationFilter,
  search: string,
  sort: InvitationSort,
) {
  return invitations
    .filter(inv => archiveScope === 'archived' ? !!inv.archived_at : !inv.archived_at)
    .filter(inv => filter === 'all' || effectiveInvitationStatus(inv) === filter)
    .filter(inv => matchesOperationalSearch(`${inv.invited_name} ${inv.invited_email}`, search))
    .sort((a, b) => {
      if (sort === 'nameAsc') return a.invited_name.localeCompare(b.invited_name);
      if (sort === 'nameDesc') return b.invited_name.localeCompare(a.invited_name);
      if (sort === 'oldest') return (a.created_at ?? '').localeCompare(b.created_at ?? '');
      if (sort === 'status') return effectiveInvitationStatus(a).localeCompare(effectiveInvitationStatus(b)) || (b.created_at ?? '').localeCompare(a.created_at ?? '');
      return (b.created_at ?? '').localeCompare(a.created_at ?? '');
    });
}

export function toggleManagedSelection(current: ReadonlySet<string>, id: string) {
  return toggleOperationalSelection(current, id);
}

export function toggleAllManagedSelection(current: ReadonlySet<string>, ids: string[]) {
  return toggleAllOperationalSelection(current, ids);
}
import {
  matchesOperationalSearch,
  toggleAllOperationalSelection,
  toggleOperationalSelection,
} from './operationalListManagement';
