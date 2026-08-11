import { describe, expect, it } from 'vitest';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';

const locales = { en, pt, es, de };

describe('trainer invitation UI copy', () => {
  it('keeps the management and consent controls available in every supported language', () => {
    for (const [locale, copy] of Object.entries(locales)) {
      const dashboard = copy.trainer.dashboard;
      for (const key of [
        'manageInvites', 'finishManagingInvites', 'searchInvites', 'selectAll',
        'selectedInvitations', 'clearSelection', 'archiveSelected', 'restoreSelected', 'invitationScopeLabel',
        'revokeAndArchive', 'confirmArchiveSelected', 'confirmRevokeAndArchive',
        'findInTrainer', 'searchCandidates', 'errInviteRecipientNotClient',
      ]) {
        expect(dashboard[key as keyof typeof dashboard], `${locale}:${key}`).toEqual(expect.any(String));
        expect(dashboard[key as keyof typeof dashboard], `${locale}:${key}`).not.toHaveLength(0);
      }
      const detail = copy.trainer.detail;
      expect(detail.availableForLaterReview, `${locale}:detail.availableForLaterReview`).toEqual(expect.any(String));
      expect(detail.availableForLaterReview, `${locale}:detail.availableForLaterReview`).not.toHaveLength(0);
      expect(detail.checkinApplied, `${locale}:detail.checkinApplied`).toEqual(expect.any(String));
      expect(detail.checkinApplied, `${locale}:detail.checkinApplied`).not.toHaveLength(0);
      const workout = copy.client.workout;
      for (const key of ['trainerTimeoutBanner', 'trainerTimeoutBannerCoachDna', 'trainerTimeoutBannerAi', 'limitWeekly', 'limitWeeklyCta']) {
        expect(workout[key as keyof typeof workout], `${locale}:workout.${key}`).toEqual(expect.any(String));
        expect(workout[key as keyof typeof workout], `${locale}:workout.${key}`).not.toHaveLength(0);
      }
      for (const plan of ['all', 'free', 'ai_fitness', 'ai_performance']) {
        expect(dashboard.candidatePlan[plan as keyof typeof dashboard.candidatePlan], `${locale}:${plan}`).toEqual(expect.any(String));
      }
      for (const status of ['all', 'sent', 'accepted', 'declined', 'expired', 'revoked', 'archived']) {
        expect(dashboard.inviteFilter[status as keyof typeof dashboard.inviteFilter], `${locale}:${status}`).toEqual(expect.any(String));
      }
      for (const scope of ['active', 'archived']) {
        expect(dashboard.invitationScope[scope as keyof typeof dashboard.invitationScope], `${locale}:invitationScope.${scope}`).toEqual(expect.any(String));
      }
      for (const order of ['recent', 'oldest', 'nameAsc', 'nameDesc', 'status']) {
        expect(dashboard.inviteSort[order as keyof typeof dashboard.inviteSort], `${locale}:${order}`).toEqual(expect.any(String));
      }
    }
  });
});
