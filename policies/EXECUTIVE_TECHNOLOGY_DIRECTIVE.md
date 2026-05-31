# Executive Technology Directive — TrAIner Project

**Status:** Formal active reference  
**Revision date:** 20/05/2026  
**Scope:** Entire TrAIner software ecosystem (client app, Trainer Studio, AI pipeline, backend services)

## 1. Purpose

This document consolidates, into a single formal reference, the directives for:

- systems architecture
- frontend architecture
- software engineering
- AI integration governance
- health data compliance
- change operations
- technical quality

Its goal is to reduce ambiguity between historical documents, establish a canonical standard, and guide:

- new implementations
- refactoring
- code review
- architecture decisions
- AI model prompt and contract evolution
- releases
- rollback and technical governance

## 2. Formal Reference Area

This directive integrates into the project's formal reference area:

- `references/`

Documents in `references/` remain valid as historical, technical, and contextual sources, but this directive exists to consolidate canonical understanding.

### 2.1. Active Governance via AI

To ensure that the rules described in this document are applied consistently in new developments and code reviews, the content of this directive and `PROFILE.md` together form the mandatory governance baseline. Any AI agent operating on the TrAIner project must comply with these documents for architectural and technical conformity (Shift-Left Governance).

### 2.2. Complementary Documents

Product-specific cases (such as legacy frontend prototypes, workout algorithm specs, or cycle-tracking models) remain as complementary or practical-implementation documents of this directive.

They should be used to:

- preserve historical rationale and domain-specific decisions
- guide operational blueprints of the respective products
- support code reviews focused on application context

In case of conflict, this unified directive prevails.

## 3. Precedence Rule

When there is conflict between architectural or engineering documents, precedence follows this order:

1. this unified directive
2. formal directives with date suffix in `YYYYMMDD` pattern
3. active operational manifests and playbooks
4. findings, plans, and historical records

### Application of the rule

In case of divergence between historical findings and operational execution directives, this executive directive prevails.

## 4. Engineering Principles

### 4.1. Stability and safe execution before sophistication

No solution is considered good if it compromises operational predictability, consistent navigation, or fault isolation. Every evolution must start from the premise that the current stability is an asset to be protected, prioritizing incremental changes and rigorous pre-publication validation to prevent regressions in already-conquered flows.

**TrAIner-specific implication:** Workout sessions are runtime-critical. A crash mid-workout, mid-tracking, or mid-AI recommendation generation is an architectural failure, not a UI bug. The workout flow must tolerate network loss, component failure, and data gaps without disrupting the user's training session.

### 4.2. Minimal shell and resolved data before features

The shell exists as the initial validation boundary. It resolves:

- authentication and session (OAuth or email/password)
- user profile and preferences
- role context (client vs. trainer)
- navigation scaffolding

Modules consume this context. Features must not re-open the entire validation tree mid-navigation. Everything that does not belong to this layer must be displaced to the modules.

### 4.3. Growth by modules, not by accumulation

The product must evolve as a **modular monolith**, with:

- single shell
- internally isolated modules
- explicit contracts
- clear responsibility boundaries

Micro-frontends are not the current project standard. Each screen group (Profile, Workout, Cycle, Trainer Studio, Settings) must maintain clear module boundaries with defined input/output contracts.

### 4.4. Backend is authority in critical flows

When a flow depends on canonical validation, sensitive persistence, authorization, or critical generation:

- the frontend initiates, informs, and presents
- the backend validates, resolves, decides, and persists

This applies especially to:

- AI workout plan generation (prompt assembly + response validation must happen server-side)
- user authentication and session management
- cycle/health data storage and computation
- B2B trainer-client relationship and data access governance
- payment and subscription state

### 4.5. One capability, one contract

Every cross-cutting capability must have:

- a single entry point
- a canonical contract
- a coherent error policy

This applies especially to:

- AI workout personalization pipeline
- cycle phase computation
- translation/localization
- report/insight generation
- context reading (user state, preferences, check-in data)
- authorization (client vs. trainer vs. admin)

### 4.6. Cache serves stability, not the illusion of performance

Cache is only acceptable when:

- it reduces real loading time
- it reduces redundant refetching
- it does not create phantom states
- it does not duplicate the source of truth

Workout data, AI recommendations, and cycle tracking data must never rely on stale cache that could present incorrect health or fitness guidance to the user.

### 4.7. UX and trust are architectural requirements

In the TrAIner ecosystem:

- flow clarity
- visual consistency
- interaction predictability
- premium polish

are not cosmetic. They are architecture and quality criteria. The app's brand identity (navy/cyan/coral palette, Plus Jakarta Sans + Inter typography, the "PT & ME Experience") is an architectural constant, not a theming afterthought.

**Role-Based Design Constraints:**
To maintain clear visual boundaries and cognitive separation between user roles, the system enforces the following design authority:
- **CLIENT (Student/etc):** Adopts the System Design of `trainer_system_design.md` (Standard Light/Dark modes, Navy/Cyan primary palette).
- **TRAINER (Personal/Coach):** Adopts the System Design of `coach_dna_system_design.md` (Always-Dark mode, Dark/Coral primary palette).
- **STUDIO:** To be defined.

UI components must strictly respect the design system corresponding to the active role.

### 4.8. Refactor to protect, not to exhibit virtuosity

Refactoring only makes sense when it:

- reduces risk
- improves clarity
- increases stability
- prepares for safe expansion

Moving from the current React 18 + Babel prototype to a build-tool-based architecture (Vite/Next.js) is a valid refactoring goal when it serves stability, performance, and maintainability — not when driven by technology preference alone.

### 4.9. Rollback is part of the design

Every relevant change must be:

- isolatable for validation
- clearly reversible
- able to preserve the system in case of error

### 4.10. Evidence is worth more than hypothesis

Real problems must be addressed with:

- logs
- explicit contracts
- traceability
- root cause analysis

Not with comfortable assumptions or cosmetic fixes. AI model output anomalies must be traced to their prompt, context, or model version — not patched with client-side string replacements.

## 5. Frontend Architecture

### 5.1. Current topology

The TrAIner application (V2) runs on a modern build toolchain. The application is structured as:

- **Frontend Core:** React 18, TypeScript, and Vite for proper bundling and environment management.
- **State Management:** Orchestrated via `App.tsx` (State Container) and specific Custom Hooks (`src/hooks/useData.ts` including `useAuth`, `useCheckinData`, `useWorkoutData`), ensuring unidirectional data flow without relying on heavy global state libraries.
- **Component Separation:** Modularized components and screens with clear domain boundaries.

*(Note: The legacy V1 prototype using HTML, Babel, `app.jsx`, and `screens.jsx` is preserved only for historical reference).*

### 5.2. Evolution path

The architecture must continue to evolve toward:

- **Mobile Support:** Expanding the PWA foundation into native wrappers via Capacitor.
- **Type Safety:** Maintaining strict TypeScript for all new code; no new modules should be written in plain JavaScript.
- **Mobile-first rendering:** All UI must be designed, tested, and validated on mobile viewports first; the current iPhone-style frame is a prototyping convenience, not a substitute for responsive design

### 5.3. Screen module boundaries

Each screen group must maintain explicit boundaries:

| Module | Screens | Owns |
|---|---|---|
| Auth | Welcome, Login, Register | OAuth flow, email/password, session init |
| Onboarding | Onboarding | Goal, Level, Time, Body (incl. cycle opt-in) |
| Profile | Profile, Edit Profile | User data, stats cards, daily check-in CTA |
| Check-in | Daily Check-in | Energy, soreness, time, focus, AI synthesis trigger |
| Workout | Start Workout, Goal Achieved, Workout Stats, Workout History | Training flow, AI plan, stats, history |
| Cycle | Cycle | Phase tracking, day/length editing, phase-aware recommendations |
| B2B | Trainer Studio | KPI strip, Feed the AI methodology, client adherence |
| Settings | Settings, Side Menu | Preferences, toggles, white-label, navigation |

### 5.4. Stability of the base and pattern preservation

No new module enters on top of an unstable shell. Every frontend evolution must simultaneously preserve:

- shell stability and authentication predictability (Login, OAuth)
- integrity of user profile and preferences
- onboarding flow completion guarantees
- workout session reliability (no crash during active training)
- visual consistency of critical screens

**Warning signs indicating pattern violation:**

1. return of fragile transitions or white screens
2. increase in concurrent checks between screens
3. reappearance of overloaded shell
4. critical pages re-concentrating rules, visuals, and navigation excessively
5. improvised module growth without catalog or contract

## 6. Platform & Persistence

### 6.1. Backend as ground truth

The backend is the canonical authority for all data that affects user safety, health guidance, or business integrity:

- user identity and authentication
- AI workout plan generation and validation
- cycle tracking data computation
- workout history storage
- trainer-client relationship management
- subscription and payment state

### 6.2. Critical persistence must be atomic

Flows that consume paid APIs, generate AI artifacts, or persist sensitive health data must:

1. receive input from the frontend
2. validate on the backend
3. process on the backend
4. persist on the backend
5. return the final result to the frontend

**TrAIner-specific:** AI workout plan generation must never expose raw API keys, prompt templates, or model configuration in client-side code. The daily check-in data flows to the backend, the backend assembles the prompt, calls the LLM, validates the structured response, and returns only the safe, pre-validated plan to the frontend.

### 6.3. AI output must respect UI contracts

Changes to prompts, parsers, or schemas must not break:

- exercise plan layout
- phase-aware recommendation rendering
- data semantics (duration values, exercise names, intensity levels)
- visual consistency of the workout screen

Whenever possible:

- persist structured JSON objects from AI responses
- do not depend solely on freeform markdown
- maintain resilient parsing with explicit fallback defaults
- version AI response schemas alongside prompt versions

### 6.4. Health data storage compliance

All health, biometric, cycle, and location data must:

- be stored with encryption at rest
- follow data minimization principles (collect only what is needed for workout personalization)
- be governed by explicit user consent with per-category granularity
- support data export and deletion requests (GDPR-aligned)
- never be shared with third parties without explicit, revocable consent
- be anonymized or aggregated for any analytics or model training purposes

**Cycle data** is classified as sensitive health information and must receive the highest protection tier within the data architecture.

### 6.5. Contracts for translatable reports and insights

AI-generated insights and workout reports must declare explicit contracts:

- content contract (what data is presented)
- translation contract (which fields are localizable)
- presentation contract (layout, styling, rendering mode)

This exists to prevent:

- a translation fix from breaking the premium workout-summary layout
- a payload normalization from altering the rendering mode
- a fallback from silently changing the editorial anatomy of the report

## 7. Localization (I18n) & Business Identity

### 7.1. Data identity is not a translation target

Identity-bearing data must remain raw and canonical:

- user names
- trainer names and studio names
- exercise names (if they carry brand-specific meaning)
- brand tokens and trademarks ("TrAIner", "PT & ME Experience", "Train smarter, not harder.")

### 7.2. Translatable scope

The following may be translated:

- labels, headings, and subtitles
- placeholders and helper text
- state messages and error dialogs
- AI-generated workout descriptions and insight summaries
- onboarding copy
- settings descriptions

### 7.3. Operational rule

- use a canonical helper for display
- never wrap identity-bearing data in translation functions
- never send user names, trainer names, or brand terms to dynamic translation pipelines

## 8. Code Governance & Development Flow

### 8.1. GitHub as operational mirror

The development flow must follow:

- frequent pushes
- named branches (feature branches, not direct commits to main)
- merge via Pull Request
- avoid prolonged divergence between local and remote

### 8.2. Minimum quality before publication

No relevant publication may occur without:

- `lint` green
- `test` green (once test infrastructure is established)
- `build` green

on the impacted scope.

### 8.3. Environment uniqueness and predictability

To ensure security, traceability, reproducibility, and operational coherence:

- the repository is the single promotable source of truth
- no shared environment may be promoted from uncommitted local changes
- every promotion must be traceable by an immutable commit SHA
- the promoted deployment must be recreatable from the repository without depending on implicit local state

**Minimum promotion record:**

- source branch
- commit SHA and promoted diff
- deployment URL
- target domain/environment
- promotion date and time

## 9. Operations, Environments & Releases

### 9.1. Release discipline

Changes to infrastructure, schemas, AI models, and critical business flows must follow controlled release discipline.

### 9.2. Mandatory distinction between staging validation and post-production verification

To avoid operational ambiguity between environments:

- staging validation is pre-promotion verification in a non-production environment
- smoke/post-production verification is a distinct step and does not replace prior staging validation
- canonical validation of a workstream remains limited to traceable staging in a non-production environment

### 9.3. Mandatory parity and operational secrets tracking

Secret drift between environments is treated as an operational regression.

Therefore:

- the project must maintain a formal environmental secrets tracking matrix
- new secrets must be registered in the corresponding matrix in the same change set that introduces their dependency
- a release with a dependency on a formally unmapped secret is considered incomplete and must be blocked

### 9.4. Prohibition of production changes without explicit authorization

Production is a protected environment.

Therefore:

- no alteration to code, database, workflow, secret, configuration, domain, deploy, promote, rollback, operational rerun, or any other component with effect on `production` may be executed without explicit authorization from the project lead
- diagnosis, reading, comparison, evidence collection, and proposal formulation must precede any remote action in production
- green staging, technical intuition, perceived urgency, or attempts to "resolve quickly" do not constitute implicit authorization
- interface fixes, resilience improvements, fault tolerance, or UX tweaks must not be used to mask data errors, migration issues, runtime failures, or configuration problems without prior causal analysis
- every proposed action for `production` must make clear: probable cause, impact, scope, reversibility, and post-validation criteria
- in the absence of explicit authorization, the mandatory conduct is: stop, evaluate, propose, and await decision

This rule exists to prevent impulsive intervention, operational drift, and regression in a live environment.

## 10. Technical Review Criteria

Every relevant review must answer, at minimum:

1. does the change reduce or increase structural complexity?
2. did the shell become simpler or more overloaded?
3. did the contract between frontend and backend become clearer?
4. was a duplicated source of truth created?
5. does the change preserve premium UX and visual consistency?
6. does the change preserve workout-session reliability?
7. is there a reasonable rollback path?
8. is the decision supported by evidence or hypothesis?
9. does the change respect health data privacy boundaries?
10. does the AI pipeline maintain or improve safety guarantees?

### 10.1. Additional frontend-specific review criteria

For evolving frontend applications, the following must also be explicitly answered:

1. does this reduce or increase control variables per transition?
2. does this reduce or increase coupling to the main shell?
3. does this guarantee cross-browser reliability (especially mobile Safari/WebKit)?
4. does this introduce a new source of truth for global user/company context?
5. does this require a new round of global patches?

## 11. Explicitly Discouraged Anti-patterns

The following are discouraged:

- refactoring for technical vanity
- growth of central pages by accumulating responsibility
- multiple sources of truth for critical context
- cache used to mask poor design
- critical persistence logic in the frontend
- translation of identity-bearing business data
- publication without a minimum validation and rollback trail
- AI prompt changes without response contract versioning
- health data logged to console or exposed in client-side state inspection
- workout session state managed through multiple competing mechanisms (localStorage + React state + URL params)
- hardcoding user-facing AI responses in the frontend as a substitute for fixing the AI pipeline

## 12. Consolidated Authoritative Sources

This directive was consolidated and adapted from:

- `../../../sevenseeds-web/PERFIL.md` (Seven Seeds — original professional profile template)
- `../../../sevenseeds-web/references/Diretriz_Executiva_de_Tecnologia_Seven_Seeds.md` (original engineering directive template)
- `../README.md` (TrAIner Project — current architecture, screens, and brand system)

The following documents serve as the TrAIner-specific operational foundation:

- `references/trainer_system_design.md` — authoritative architecture, data models, state management, B2B multi-tenant setup, and system design principles (Canonical for Client).
- `references/coach_dna_system_design.md` — authoritative visual system design, token palette, and typography for the Trainer role.
- `../README.md` — project overview, setup instructions, and high-level directory structure.
- `PROFILE.md` — official professional profile and quality standards for this project.

Additional reference documents shall be maintained in `references/` as the project evolves.

## 13. Update Clause

This directive remains active until:

- it is replaced by a new formal directive in the `references/` area
- or it receives an explicit update with a new dated document

Any future directive that contradicts it must:

- explicitly declare what it replaces
- indicate the date of the new directive
- record the reason for supersession

---

**Executive summary:** In the TrAIner project, architecture and software engineering are not disciplines separate from the fitness product experience. The canonical rule is simple: stabilize before expanding, modularize before accumulating, validate before publishing, and preserve user trust — especially regarding health data — as a structural requirement. The AI is a tool serving the trainer and the client, not an autonomous authority. Every AI-generated recommendation must be traceable, reversible, and safe.
