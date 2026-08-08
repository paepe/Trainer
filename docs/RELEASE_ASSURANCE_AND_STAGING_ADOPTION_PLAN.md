# TrAIner — Release Assurance and Staging Adoption Plan

**Status:** Historical — deferred by project lead on 2026-08-06; not approved or in execution
**Version:** 1.0
**Last reviewed:** 2026-08-06
**Owners:** Engineering / Product / Privacy
**Authority:** [Executive Technology Directive](../policies/references/EXECUTIVE_TECHNOLOGY_DIRECTIVE.md) §§8–10
**Related operational control:** [AI Governance Change Gate](AI_GOVERNANCE_CHANGE_GATE.md)

---

## Archival record

On 2026-08-06, the project lead deferred this plan for a more appropriate
occasion. No phase was approved, no checklist item was completed, and this
document must not be used as authorization for infrastructure, production or
governance changes. It is retained as historical analysis and may be reopened
only through an explicit new decision.

---

## 1. Purpose

Make releases demonstrably safe before launch by adding a repeatable verification
path for frontend code, database schema, RPCs, RLS, triggers, secrets and
authenticated user journeys. This plan does not redefine product policy or
entitlements. It operationalises existing release, evidence, rollback and
staging requirements.

The current remote environment remains **production beta controlled** until a
separate staging environment is provisioned. Local development is not staging:
it validates code in isolation but cannot prove remote configuration, secrets,
auth redirects, deployment behaviour or infrastructure parity.

## 2. Outcome and non-goals

### Outcome

Before a relevant release can be promoted, an immutable commit has evidence of:

1. type, lint, unit and production-build validation;
2. migration application against an isolated PostgreSQL/Supabase instance;
3. critical RPC, RLS and trigger integration tests in that isolated instance;
4. authenticated smoke validation in staging; and
5. a controlled production promotion and post-deploy smoke when expressly
   authorised.

### Non-goals

- No production data is copied to local or staging.
- No secret value is committed to the repository or test output.
- No legal acceptance, payment, subscription or workout data is changed merely
  to run a smoke test; tests use dedicated accounts and reversible fixtures.
- A post-production smoke test never substitutes for staging validation.

## 3. Principles and acceptance model

| Principle | Operational consequence |
|---|---|
| Backend is authority | Client tests alone cannot approve a critical persistence flow. |
| Evidence before hypothesis | Every phase links commands, run output, commit SHA or deployment URL. |
| Rollback by design | Database tests run in isolated databases or explicit rollback transactions. |
| Privacy by default | Synthetic fixtures only; health, voice and cycle data are never copied from production. |
| No implicit production action | Production deployment, migration, secret or rerun requires project-lead authorization at execution time. |

**Definition of release-ready:** all applicable required gates are green on the
same promoted SHA, the change has a rollback path, and staging evidence exists.
An exception is explicit, time-bound, risk-owned and recorded; it is not a
silent bypass.

## 4. Estimated effort

Estimates are focused engineering effort, not elapsed calendar time. With
existing provider access, Codex can execute implementation work continuously;
environment creation, secret provisioning and production promotion remain
external authorization boundaries.

| Phase | Focused effort | External dependency |
|---|---:|---|
| 0 — Baseline and governance | 2–3 h | Approval of the operational standard |
| 1 — Local database integration harness | 5–8 h | Docker/Supabase local runtime available in CI |
| 2 — CI quality gate | 4–6 h | GitHub Actions enabled for the repository |
| 3 — Staging environment and parity | 3–5 h | Supabase/Vercel project access and approval |
| 4 — Authenticated staging smoke suite | 5–8 h | Dedicated staging test accounts and non-production secrets |
| 5 — Controlled adoption and first release | 2–4 h | Project-lead release authorization |
| **Total** | **21–34 h** | Provider access and approvals can add waiting time, not engineering effort |

## 5. Phased implementation checklist

### Phase 0 — Baseline, ownership and operating standard

**Objective:** make the existing directive enforceable without creating a
competing governance source.

- [ ] Confirm this plan as the implementation record for the directive’s §§8–9.
- [ ] Create `docs/RELEASE_VERIFICATION_STANDARD.md` with required checks,
      evidence format, exception process and approval owners.
- [ ] Create `docs/ENVIRONMENT_AND_SECRETS_MATRIX.md` with Local, Staging and
      Production rows, secret *names* only, owners, parity requirements and
      rotation/reference procedures.
- [ ] Update the Executive Technology Directive §§8–9 to require database
      integration validation and CI enforcement for critical flows.
- [ ] Update `AI_GOVERNANCE_CHANGE_GATE.md` so impacted AI, entitlement,
      consent and sensitive-data changes cite backend and staging evidence.
- [ ] Record the current gap honestly: no CI workflow and no formal staging.
- [ ] Define the initial critical-flow inventory: authentication, legal consent,
      subscription/entitlement, trainer-client isolation, workout persistence,
      AI authorization/rate limiting and sensitive-data boundaries.

**Exit criteria:** one authoritative operational standard, one environment
matrix, named owners and a reviewed critical-flow inventory exist in version
control.

**Phase completion update:** replace every applicable checkbox, record commit
SHA(s), and add the actual outcome/date below before beginning Phase 1.

**Evidence / outcome:** pending.

### Phase 1 — Isolated database and backend integration harness

**Objective:** prove that migrations, RPCs, RLS and triggers work against a
real PostgreSQL/Supabase-compatible database before remote deployment.

- [ ] Define a canonical ordered migration source; archived ad-hoc SQL cannot
      remain the only deployable schema history.
- [ ] Add reproducible local database bootstrap/reset commands.
- [ ] Apply the complete schema/migration sequence in CI and fail on SQL errors.
- [ ] Add integration tests for `accept_current_legal_documents`: authenticated
      success, two-document result, idempotency, unauthenticated rejection and
      no cross-user read.
- [ ] Add integration tests for trainer invitation acceptance and trainer/client
      isolation, including failure paths.
- [ ] Add integration tests for subscription role/plan constraints and the
      relevant database triggers.
- [ ] Add integration tests for AI idempotency and rate-limit RPCs using
      synthetic hashes and rollback/isolated fixtures.
- [ ] Make RLS assertions use two distinct synthetic identities for every
      sensitive table in scope.
- [ ] Ensure test logs redact credentials, tokens, health fields and payloads.

**Exit criteria:** a clean isolated database can be created from repository
state; the critical RPC/RLS/trigger suite passes and fails deterministically
when a protected behavior is intentionally broken.

**Phase completion update:** record command, test count, duration, commit SHA
and any intentionally deferred flow.

**Evidence / outcome:** pending.

### Phase 2 — CI quality gate and promotion evidence

**Objective:** prevent an unverified commit from being merged or promoted.

- [ ] Add a GitHub Actions workflow triggered by pull requests and `main`.
- [ ] Run `npm run lint`, `npx tsc --noEmit`, `npm test` and `npm run build`.
- [ ] Run the Phase 1 database bootstrap and integration suite.
- [ ] Run static checks for migration ordering, feature-permission completeness
      and absence of committed secrets.
- [ ] Upload non-sensitive test reports and build metadata as CI artifacts.
- [ ] Protect `main` with required successful checks and pull-request review.
- [ ] Record the commit SHA, workflow URL, result and rollback reference in a
      promotion record template.

**Exit criteria:** a failing unit, build, migration, RPC/RLS integration or
required static check blocks merge/promotion of the same SHA.

**Phase completion update:** record required-check names and a successful,
deliberately failing validation run.

**Evidence / outcome:** pending.

### Phase 3 — Provision a formal staging environment

**Objective:** create a non-production environment with controlled parity,
without copying production personal or health data.

- [ ] Provision a separate Supabase staging project and record only its
      identifier/owner in the environment matrix.
- [ ] Provision Vercel Preview/Staging deployment and a stable staging URL.
- [ ] Create separate staging secrets; compare secret names and required flags
      against production without revealing values.
- [ ] Apply repository migrations to staging from a traceable commit.
- [ ] Create synthetic test users, trainer-client links and fixtures only in
      staging; document ownership and cleanup.
- [ ] Verify auth redirect URLs, CORS, edge/API configuration and feature flags.
- [ ] Establish a tested rollback procedure for code, migration-compatible
      changes and configuration.
- [ ] Classify the existing remote environment as production beta controlled
      until the first staging promotion is evidenced.

**Exit criteria:** staging is separate from production, deployable from a
commit, parity-reviewed at secret-name/configuration level, and has no copied
production user or health data.

**Phase completion update:** record staging URL, project identifiers, parity
review result and rollback proof; never record secret values.

**Evidence / outcome:** pending.

### Phase 4 — Authenticated smoke and end-to-end release validation

**Objective:** prove critical user journeys against staging after deployment.

- [ ] Extend Playwright with the legal-consent journey: login, gate, documents,
      acceptance persistence and post-acceptance navigation.
- [ ] Cover plan selection only after legal acceptance and confirm backend
      persistence before subscription mutation.
- [ ] Cover client/trainer authorization boundaries and an unauthorized access
      attempt.
- [ ] Cover workout start/resume and confirm that a failed optional AI action
      does not interrupt an active workout.
- [ ] Cover the AI endpoint refusal paths (`401`, `403`, `429` where a
      controlled test mechanism exists) without invoking billable providers.
- [ ] Run mobile viewport smoke for the critical flows and retain non-sensitive
      screenshots/video only on failure.
- [ ] Publish a staging validation report associated with the commit SHA.

**Exit criteria:** the critical smoke suite passes in staging, its fixtures are
isolated, and a failure is diagnosable from retained non-sensitive evidence.

**Phase completion update:** record suite name, staging URL, commit SHA,
executed flows and any authorized exception.

**Evidence / outcome:** pending.

### Phase 5 — Adoption, first controlled release and steady state

**Objective:** activate the process without treating post-production testing as
pre-release validation.

- [ ] Perform the first promotion through the new gate from a protected SHA.
- [ ] Obtain explicit project-lead authorization immediately before any
      production-affecting action.
- [ ] Record source branch, SHA, diff, staging evidence, target, date/time and
      rollback path.
- [ ] Execute a minimal authenticated production smoke using a dedicated
      non-commercial account; do not alter legal, payment or health records
      unless explicitly authorized and reversible.
- [ ] Confirm observability/error channels have no new critical event.
- [ ] Retrospectively review the first release and update the operational
      standard with only evidence-backed improvements.
- [ ] Apply this gate to every subsequent relevant release.

**Exit criteria:** one release has complete traceable evidence from local to
staging to authorized production verification; the process is adopted as normal
engineering work.

**Phase completion update:** record release evidence, review findings and the
next review date.

**Evidence / outcome:** pending.

## 6. Dependencies, decision points and stop conditions

| Item | Owner | Needed by | Stop condition |
|---|---|---|---|
| Approval of operational standard | Project lead | Phase 0 | No directive/governance change is applied without approval. |
| GitHub Actions availability and branch protection rights | Repository owner | Phase 2 | CI can be drafted but not enforced. |
| Docker/Supabase local runtime in CI | Engineering | Phase 1 | Use a compatible ephemeral PostgreSQL strategy; do not skip database tests. |
| Separate Supabase and Vercel staging resources | Project lead / DevOps | Phase 3 | No staging claim is made until resources are separate and evidenced. |
| Staging secret values and test accounts | Project lead / DevOps | Phases 3–4 | Do not use production credentials or user data as substitutes. |
| Production release authorization | Project lead | Phase 5 | Stop before any production action. |

## 7. Continuity rule

At the end of each phase, the executor must update this document in the same
change set with: checklist state, evidence links/commands, date, commit SHA,
actual result, deviations and next dependency. A phase is not complete merely
because its code merged. Any newly identified critical flow is added to the
inventory before the next release.

## 8. Plan self-review — 2026-08-06

The plan was reviewed after drafting for logical flow and policy consistency.

| Review question | Result / adjustment made |
|---|---|
| Does it confuse local validation with staging? | No. Phase 1 is explicitly isolated local/CI database validation; Phase 3 is a separate remote staging environment. |
| Does it make production smoke a substitute for staging? | No. The distinction is explicit in §§1, 4 and 5, consistent with Directive §9.2. |
| Does it assume silent production authority? | No. Phase 5 contains an explicit authorization stop condition, consistent with Directive §9.4. |
| Does it duplicate the Executive Directive? | No. The directive remains normative; this document is the phased implementation record and proposes a single operational standard. |
| Does it cover the demonstrated failure mode? | Yes. Phase 1 requires real database execution of migrations and the legal-acceptance RPC; Phase 2 blocks promotion on it. |
| Does it protect sensitive data? | Yes. Staging fixtures are synthetic, secrets are names-only and test output is redacted. |
| Does it introduce a hidden dependency or impossible ordering? | No. Governance precedes harness; harness precedes CI enforcement; CI precedes staging smoke; staging precedes a controlled production release. Provider access is listed as an explicit dependency. |
| Does it over-promise full defect absence? | No. Exit criteria require evidence for critical flows, not a claim that all defects are impossible. |

**Self-review conclusion:** the flow is coherent and aligned with the existing
Executive Technology Directive. It should be approved before implementation;
no operational change is made by this planning document alone.
