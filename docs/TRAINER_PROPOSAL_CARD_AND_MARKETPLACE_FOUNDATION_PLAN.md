# TrAIner — Trainer Proposal Card and Marketplace Foundation Plan

**Status:** Draft — planning only, not approved for implementation

**Version:** 1.0

**Created:** 2026-08-08

**Owners:** Product / Engineering / Privacy

**Scope:** The direct TRAINER invitation flow and the first commercial-context
layer presented to a prospective CLIENT.

## 1. Purpose

The current invitation lifecycle correctly establishes consent, eligibility and
the TRAINER–CLIENT relationship. It does not yet provide enough context for a
prospective CLIENT to decide whether the professional and their training style
are relevant.

This plan adds a **Trainer Proposal Card** to the invitation experience. It is
an informational, consent-preserving introduction to a specific TRAINER. It is
not a public marketplace listing, a payment offer, a contract, a lead sale or a
commission system.

## 2. Product boundaries

| Included now | Explicitly excluded from this plan |
|---|---|
| Trainer identity, professional introduction and training approach | Public/indexable trainer profiles |
| Delivery mode: in-person, remote or hybrid | Price, checkout, subscription sale or contract acceptance |
| Trainer-declared specialties and suitable goals | Availability calendar, bookings or appointment scheduling |
| Optional limited-capacity message with truthful wording | Commission, referral attribution or revenue share |
| Proposal shown only to the authenticated invitee | Ranking, matching algorithm, reviews or public search |
| Consent-preserving accept/decline in Inbox | Health data, Coach DNA internals or client history in the card |

The future Marketplace remains governed by the historical
`Monetization_Implementation_Roadmap.md` and requires its own Product, Privacy,
commercial and payment decisions before implementation.

## 3. Non-negotiable rules

- The card is attached to a direct invitation and is visible only to its
  authenticated recipient.
- The proposal never exposes a CLIENT's e-mail, health, workout, check-in,
  cycle, Coach DNA, preferences or relationship history.
- The TRAINER controls only their own presentation data. The backend validates
  ownership, field limits and publishability.
- The invitation remains optional: **Accept invitation** and **Decline
  invitation** retain equal prominence.
- Limited-capacity wording is optional, factual and bounded. It must not claim
  a price, guaranteed result, medical outcome, false urgency or availability
  that the system cannot substantiate.
- The proposal does not grant an entitlement, change the CLIENT plan or create
  a trainer-client link. Only the existing explicit acceptance RPC creates that
  link.

## 4. Phased execution checklist

### Phase 0 — Product and governance decision

**Objective:** establish a small, safe first release before modelling a
Marketplace.

- [ ] Approve the boundary in §2: direct invitation context only; no price,
      payment, marketplace visibility, commission or booking.
- [ ] Approve the initial field set: public-facing display name, avatar,
      short introduction, specialties, delivery modes, training approach and
      optional limited-capacity copy.
- [ ] Define allowed and prohibited commercial wording, including a maximum
      length and factual capacity rule.
- [ ] Decide whether the proposal is mandatory for every invitation or optional
      per TRAINER; recommended: optional card with a complete default state.
- [ ] Apply `AI_GOVERNANCE_CHANGE_GATE.md`: classify consent, commercial claim,
      entitlement and Privacy impact; record controlled-document changes or an
      evidenced no-impact conclusion.
- [ ] Obtain explicit Product and Privacy approval before any database or UI
      implementation.

**Exit:** an approved card contract, copy policy and scope boundary.

### Phase 1 — Data contract and backend authority

**Objective:** model the proposal as trainer-owned presentation data, isolated
from sensitive or operational data.

- [ ] Define `trainer_proposal_profiles` with one row per TRAINER and only the
      approved presentation fields.
- [ ] Define normalized specialty and delivery-mode values; reject arbitrary
      uncontrolled categories where they affect filtering or future matching.
- [ ] Add server-side validation for field lengths, allowed values, optional
      capacity wording and ownership.
- [ ] Keep writes behind authenticated TRAINER authority; enable RLS and deny
      direct CLIENT writes.
- [ ] Expose a narrow invitation-recipient projection only through the existing
      invitation authority path; never expose raw profile rows to unrelated
      users.
- [ ] Version the proposal snapshot or define an explicit live-read rule.
      Recommended: snapshot approved copy into the invitation, preserving what
      the recipient saw at decision time.
- [ ] Define retention: invitation snapshot follows invitation retention;
      editable trainer profile is retained until the TRAINER changes or deletes
      it, subject to account lifecycle rules.
- [ ] Provide a reversible migration and document rollback behavior.

**Exit:** migration, RLS and API/RPC contract reviewed against Privacy and
authorization requirements.

### Phase 2 — TRAINER authoring experience

**Objective:** let a TRAINER create a credible proposal without turning the
dashboard into a sales back office.

- [ ] Add a **Proposal card** section to the TRAINER profile/dashboard.
- [ ] Provide guided fields with live character counts, examples and a preview.
- [ ] Offer delivery-mode controls: in-person, remote and hybrid.
- [ ] Offer structured specialties and training-focus selection.
- [ ] Add optional factual capacity copy, such as “Limited places for new
      clients this month”; validate length and prohibited claims.
- [ ] Provide a complete default card when the TRAINER has not customized it.
- [ ] Save drafts explicitly; failed saves preserve local input and show a
      clear retry state.
- [ ] Localize UI controls in EN/PT/ES/DE. Trainer-authored free text remains
      the TRAINER's authored language; no automatic translation promise is
      introduced in this phase.

**Exit:** a TRAINER can author, preview, save and update their proposal without
affecting invitations already sent.

### Phase 3 — CLIENT invitation experience

**Objective:** make the decision informed, calm and non-invasive.

- [ ] Render the proposal card inside the invitation item in the CLIENT Inbox.
- [ ] Show trainer identity, introduction, specialties, delivery modes and
      approved limited-capacity copy.
- [ ] Keep **Accept invitation** and **Decline invitation** explicit, equally
      accessible and independent of card expansion.
- [ ] Do not present the card as a login-blocking modal or interrupt a workout,
      check-in or active session.
- [ ] Gracefully handle absent, older or incomplete proposal snapshots.
- [ ] Preserve the existing expired-invitation renewal flow; a new invitation
      receives a new proposal snapshot.
- [ ] Confirm accepted invitations create a link only through the existing
      authoritative acceptance RPC.

**Exit:** the recipient can understand the direct invitation and decide without
unintended commercial pressure or data exposure.

### Phase 4 — Measurement, safeguards and quality

**Objective:** learn whether the card improves informed acceptance without
building surveillance or premature growth mechanics.

- [ ] Add aggregate, minimized events: card available, expanded, accepted,
      declined and expired. Do not store free text, invitation token, e-mail,
      raw user ID, health data or search terms.
- [ ] Define event retention and RLS consistent with the existing invitation
      observability model.
- [ ] Add abuse/quality controls: allowed copy policy, server validation,
      report path for misleading presentation and operator review procedure.
- [ ] Test authorization/RLS negative paths, recipient-only visibility,
      snapshot immutability and no entitlement change.
- [ ] Test authoring and Inbox UI in EN/PT/ES/DE, mobile viewport and screen
      reader labels.
- [ ] Run an authenticated pre-release E2E: author card → send invitation →
      recipient views card → decline/accept → verify link and telemetry.
- [ ] Apply the governance gate and record the pre-release release decision.

**Exit:** measurable, privacy-preserving proposal-card flow validated in the
shared pre-release environment.

### Phase 5 — Controlled release and Marketplace decision gate

**Objective:** release the card safely and decide separately whether a
Marketplace is justified.

- [ ] Publish only after Product approval of final wording and Privacy approval
      of the card/snapshot/telemetry contract.
- [ ] Monitor aggregate card exposure, expansion, acceptance, decline and
      expiration for a representative period; do not infer conversion targets
      from pre-release test data.
- [ ] Review whether capacity copy is understood and not misleading.
- [ ] Record product findings: keep, simplify or revise the card.
- [ ] Hold a separate Marketplace decision: public profile, discoverability,
      search/matching, prices, booking, payments, referrals and commission each
      require a new approved plan and controlled-document review.

**Exit:** the Proposal Card has either a controlled operating baseline or a
documented revision decision. Marketplace implementation remains unstarted
unless separately approved.

## 5. Acceptance criteria

- A card is visible only to the recipient of its direct invitation.
- No proposal field can change a CLIENT plan, AI entitlement, sponsorship,
  payment state or trainer-client link without explicit invitation acceptance.
- No health, training, Coach DNA, e-mail or relationship-history data appears
  in the card or its telemetry.
- A TRAINER cannot edit another TRAINER's proposal or an invitation snapshot.
- A missing card never blocks invitation acceptance/decline or the workout flow.
- “Limited availability” is optional, factual, bounded and never a price,
  promise of outcome or fabricated urgency.
- All system controls are localized in EN/PT/ES/DE.

## 6. Estimated effort

| Phase | Agent execution estimate | Main dependency |
|---|---:|---|
| 0 | 20–40 min | Product/Privacy decisions |
| 1 | 45–75 min | Approved contract |
| 2 | 60–90 min | Phase 1 |
| 3 | 45–75 min | Phase 1–2 |
| 4 | 60–90 min | Phase 1–3 |
| 5 | 20–40 min plus observation | Product/Privacy approval and real-use sample |

The estimates describe active execution only. They exclude the intentional
observation period and any external approval wait.

## 7. Consistency review

- [x] The card precedes Marketplace mechanics; it does not imply public search,
      payment, commission or a contractual offer.
- [x] Presentation data is separated from health, training and Coach DNA data.
- [x] The acceptance RPC remains the single authority for relationship creation.
- [x] Consent and recipient-only visibility precede UI polish and measurement.
- [x] “Scarcity” is constrained to factual, optional capacity language rather
      than deceptive pressure.
- [x] Telemetry is introduced only after minimization, retention and RLS are
      defined.
- [x] Release observation is distinct from implementation completion.

**Review conclusion:** the sequence is coherent: govern the commercial claim,
model a narrow private contract, author safely, present in Inbox, validate and
observe. The plan deliberately stops before public Marketplace construction.
