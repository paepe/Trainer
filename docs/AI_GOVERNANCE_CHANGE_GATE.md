# TrAIner — AI Governance Change Gate

**Status:** Active operational control
**Version:** 1.0
**Last updated:** 2026-08-06
**Owners:** Product / Engineering / Privacy
**Authority:** [Executive Technology Directive](../policies/references/EXECUTIVE_TECHNOLOGY_DIRECTIVE.md) §2.3–2.4

## Purpose

Keep product promises, licensing, AI safeguards and operational controls aligned
with implementation as TrAIner evolves. This gate applies before implementation,
during review and before release; it is not retrospective documentation.

## Trigger

Apply this gate when a change affects one or more of:

- an AI endpoint, provider, model, prompt contract, fallback or fan-out;
- usage cost, telemetry, retention, rate limiting, abuse signal or alert;
- authentication, entitlement, plan limit, feature access or TRAINER sponsorship;
- health/sensitive-data processing, consent or an external processor;
- marketing wording, “unlimited” claims, Terms or Privacy wording.

For all other changes, record **No impact** with the reason in the PR, commit
description or release note.

## Required checklist

- [ ] Classify the change against the trigger list before implementation.
- [ ] Identify the source-of-truth documents below that are affected.
- [ ] Update each affected document in the same change set, including its
      version/revision date and implementation or approval status.
- [ ] Update the relevant phased-plan checklist and link implementation evidence
      (test, migration, deployment, query or decision).
- [ ] Verify that UI/marketing wording matches the effective backend entitlement
      and that no unsupported commercial promise is introduced.
- [ ] Obtain explicit Product / Privacy / Legal approval where policy, sensitive
      data, Terms or public claims change. An engineering merge is not approval.
- [ ] Record a release decision: ready, operationally enabled, shadow/observe, or
      blocked pending approval/baseline.

## Document routing

| Change impact | Documents that must be reviewed |
|---|---|
| Fair use, provider cost, abuse, rate/alert controls | [Plan](AI_FAIR_USE_AND_COST_PROTECTION_PLAN.md), [Policy](AI_FAIR_USE_POLICY_DRAFT.md), [Terms clause](AI_FAIR_USE_TERMS_CLAUSE_DRAFT.md), [signal catalog](AI_ABUSE_SIGNAL_CATALOG_DRAFT.md), [response runbook](AI_ABUSE_RESPONSE_RUNBOOK_DRAFT.md) |
| AI endpoint, payload, authority or safe fallback | [endpoint authority matrix](AI_ENDPOINT_AUTHORITY_MATRIX.md), [operational bounds](AI_ENDPOINT_OPERATIONAL_BOUNDS.md), [degradation policy](AI_ENDPOINT_DEGRADATION_POLICY.md), [telemetry contract](AI_TELEMETRY_DATA_CONTRACT.md) |
| Licence, entitlement, plan limits or sponsored student capability | [feature access matrix](FEATURE_ACCESS_MATRIX.md), [TRAINER-sponsored policy](AI_TRAINER_SPONSORED_CONSUMPTION_POLICY_DRAFT.md), [endpoint authority matrix](AI_ENDPOINT_AUTHORITY_MATRIX.md) |
| Consent, health/sensitive data or external processing | [Plan](AI_FAIR_USE_AND_COST_PROTECTION_PLAN.md), [telemetry contract](AI_TELEMETRY_DATA_CONTRACT.md), [degradation policy](AI_ENDPOINT_DEGRADATION_POLICY.md), applicable Privacy/Terms materials |

## Continuity and versioning rules

1. The document named in the routing table is the maintained reference, not a
   duplicate created per feature.
2. Material changes increment its version (or revision date where the document uses
   dates), retain prior decisions in its changelog/history, and cite the
   implementation evidence.
3. Status uses: **Draft** (not approved or published), **Active operational
   control** (implemented), **Approved for publication** (business/legal approved)
   and **Historical** (superseded). A document may be operational while its public
   wording remains Draft.
4. No release may silently diverge from an approved/public claim. If approval is
   pending, retain the technically safe state and mark the release blocked or
   observe-only.
5. The next feature begins by reading this gate and its routed documents; code
   review verifies the completed checklist and linked evidence.

## Current baseline

This gate was instituted on 2026-08-06. Existing AI fair-use work is governed by
the plan above; enforcement thresholds remain in controlled observation until
real-use evidence and the required approvals exist.
