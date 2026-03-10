---
name: architectural-audit
description: Holistic architectural audit to enforce ECS (Entity Component System) principles, Zero-Trust data ingestion, and rigorous game simulation fidelity. Orchestrated by the main agent and executed by the architectural_auditor sub-agent.
---

# Architectural Audit: Game Engineering & ECS Fidelity

Use this skill to perform a deep-dive architectural audit of the game engine. This process is designed to be **orchestrated by the main agent** and **executed by the architectural_auditor sub-agent** to maintain context efficiency and extreme diligence.

## Orchestration Workflow

1.  **Scope Definition**:
    *   Main agent identifies the target systems or directories for the audit (e.g., `simulator/src/engine/`).
    *   Main agent defines the specific goals (e.g., "Refactor DamageEngine into ECS Systems").

2.  **Delegation**:
    *   Main agent invokes the `architectural_auditor` sub-agent with the specific objective.
    *   The sub-agent follows its "Core Mandates" to perform the deep dive, trace data flow, and identify "Fat Objects" or type escapes.

3.  **ADR Generation**:
    *   The sub-agent drafts a formally numbered ADR in `simulator/docs/designs/`.
    *   The ADR MUST include a **Task & Implementation Tracking** section with a granular TODO list for the `game_engineer`.

4.  **Review & Approval**:
    *   Main agent reviews the generated ADR and identifies any conflicts with existing ADRs or high-level goals.
    *   Main agent halts and asks the user for explicit approval of the ADR before any implementation begins.

## Core Principles (Enforced by Auditor)

### I. ECS Fidelity & Domain Purity
- **Entity Purity**: Entities are opaque IDs.
- **Component Purity**: Components are pure data (POJOs) with NO methods.
- **System Purity**: Logic resides ONLY in pure systems that query components.
- **Zero Tolerance for `as any`**: All domain models and systems must be strictly typed. Identify and refactor all type escapes.

### II. The Zero-Trust Ingestion Barrier
- Assume all external data is malformed or structurally inconsistent.
- Mapping and normalization logic belongs in the **Translation Layer**, not the **Domain**.
- Raw data must never reach a Component directly without validation (e.g., Zod).

### III. Legacy Elimination & Tech Debt
- **Legacy Identification**: Actively scan for obsolete components, stat types, or systems that have been superseded by newer architectural patterns (e.g., universal bucket topology).
- **Pruning**: Account for the explicit elimination of purpose-less code when drafting ADRs. Dead code paths and legacy context interfaces (e.g., `LegacyCombatContext`) must be targeted for deletion.

### IV. Build + Test + Verify Dev Loop
- Regression prevention is mandatory. Every refactor or mechanic change MUST be verified with high-fidelity integration tests.
- Maintain absolute continuity with previous ADRs.
- Simulation output must be bit-perfect with source truth.
