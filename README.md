# TrAIner — Fitness & Gym Workout App

Welcome to **TrAIner** ("The PT & ME Experience"), an AI-powered fitness app that pairs real trainers with AI-personalized workouts.

This repository holds the TrAIner software ecosystem, including the client application, Trainer Studio, and AI pipeline.

---

## Architecture & Technology Stack

The active production architecture for TrAIner (V2) is built on a modern **Serverless CSR (Client-Side Rendered)** stack:

- **Frontend Core:** React 18, TypeScript, Vite
- **Backend & Database:** Supabase (PostgreSQL with Row Level Security)
- **State Management:** Unidirectional flow via `App.tsx` and Custom Hooks (`src/hooks/useData.ts`)
- **Mobile Support:** PWA Ready + Capacitor (for iOS and Android native wrappers)

> [!IMPORTANT]
> The TrAIner ecosystem enforces a **Role-Based Design System**:
> - **CLIENT (Student/etc):** Adopts the System Design from `references/trainer_system_design.md`.
> - **TRAINER (Personal/Coach):** Adopts the System Design from `references/coach_dna_system_design.md`.
> - **STUDIO:** To be defined.
> 
> For a comprehensive overview of the base architecture, data models, state management, and B2B multi-tenant setup, **you must read the [Trainer System Design Document](references/trainer_system_design.md)**.

---

## Governance & Policies

All development on TrAIner is strictly governed by the Executive Technology Directive. This establishes the rules for modularity, backend authority over health data, UI/UX consistency, and release safety.

- 📄 **[Executive Technology Directive](policies/EXECUTIVE_TECHNOLOGY_DIRECTIVE.md)**: Mandatory reading for all architectural decisions and code reviews.
- 📄 **[Profile](policies/PROFILE.md)**: AI agent governance baseline.

---

## Getting Started (Development)

To run the application locally in development mode:

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Ensure your `.env` file is configured with the necessary Supabase and AI pipeline keys (consult the team lead for the current staging keys).

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173` (or the port specified by Vite).

---

## Legacy Prototype

The original V1 interactive prototype was built using pure HTML, React 18 via CDN, and in-browser Babel transpilation. 

While active development has migrated to the Vite + TypeScript stack, you can still reference the original prototype documentation and file structures here:
👉 **[Legacy Prototype Documentation](docs/LEGACY_PROTOTYPE.md)**

---

## Project Structure (V2 Overview)

```
.
├── src/
│   ├── components/       # Shared UI components and Atoms
│   ├── hooks/            # Custom hooks (useAuth, useWorkoutData, useAIContext)
│   ├── screens/          # Main screen modules (Workout, Cycle, Studio)
│   ├── App.tsx           # Main application shell and state orchestrator
│   └── main.tsx          # Vite entry point
├── policies/             # Governance directives
├── docs/                 # Historical documentation
└── references/           # System design and architecture docs
```

---

*Tagline: "Train smarter, not harder."*
*Claim: "The PT & ME Experience"*
