---
name: architectural-audit
description: Holistic architectural audit and refactoring to enforce strict OOP and Domain-Driven Design (DDD) through the lens of a professional Game Engineering team, with a focus on data ingestion and domain purity.
---

# Architectural Audit: Game Engineering & Data Fidelity

Perform a holistic architectural audit. While OOP and DDD provide the structure, the guiding philosophy is that of a **Professional RPG Game Studio** operating with imperfect, manually-mined data. The goal is a high-fidelity simulation engine that remains architecturally pure while ingesting "dirty" data.

## Audit Workflow

1. **Initial Investigation**: Invoke `codebase_investigator` to map architectural boundaries and identify "script-kid" anti-patterns.
2. **Dirty-Source Analysis**: Deep-dive into `research/data/custom-datamine/raw.json`. Identify inconsistencies in variable naming, stat tiers, and scaling (e.g., Tier 1 vs Tier 5).
3. **External Verification**: Use `google_web_search` or `web_fetch` to find community-driven evidence to refine or validate "dirty" data points.
4. **Schema Mapping & Ingestion Design**: Design a **Translation Layer** (Mappers/Factories) that sits between the "Dirty Source" (`raw.json`) and the "Clean Domain." Ensure that:
    - The **Domain Models** maintain a strict, standardized schema.
    - The **Translation Layer** handles normalization, scaling factors (Stars/Tiers), and validation.
5. **Contextual Analysis**: Evaluate findings through a **Game Design Lens**. Ask: "Does this architecture allow us to refine our data without refactoring the engine core?"
6. **Targeted Refactoring**: Execute refactors that prioritize **Planned Extensibility**. Favor patterns that allow for "soft-coding" mechanics so they can be tuned as data reliability improves.
7. **Formal Proposal**: Synthesize findings into a markdown document in `simulator/docs/plans/` using the pattern: `YYYY-MM-DDThhmmss-architectural-audit-proposal.md`.

### Proposal Structure Requirements
Every generated proposal MUST conclude with a **Task & Implementation Tracking** section. This section serves as the authoritative source of truth for progress and as a persistent checkpoint for the development lifecycle.

#### Task & Implementation Tracking (Mandatory)
This section contains a granular TODO list of all implementation steps. 
- **Ownership**: The `game_engineer` sub-agent is solely responsible for updating this list. 
- **Execution Protocol**: As the `game_engineer` completes tasks or sub-tasks defined in the implementation plan, it MUST update this markdown file, marking items as complete (`[x]`) and adding any technical notes or discovered deviations.
- **Auditability**: This allows for clean auditing and ensures that if session context is lost, the `game_engineer` can resume exactly where it left off by reading the current state of this file.

## Core Principles

### I. The Game Engineering Mindset
1. **Schema Separation (Domain Purity)**: NEVER allow the messy structure of external data to dictate the design of your Domain Models. Build a robust Mapping layer to bridge the gap.
2. **Scaling Intelligence**: Logic for predictable scaling (Tiers, Stars, Calibrations) belongs in the **Engine**, not the **Data**. The data provides the "Seed" values; the engine applies the math.
3. **Iterative Fidelity**: Build for resilience. Use "Safe Defaults" and "Unknown Mechanic" placeholders so the engine can run even with incomplete data.
4. **Combat System Fidelity**: Treat mechanics (ICDs, Snapshotting, Tick Rates) as first-class domain concepts. Model them with high-fidelity objects.

### II. Structural Rigor (The OOP Foundation)
1. **Polymorphism Over Imperative Logic**: Use polymorphic delegation to handle diverse game behaviors.
2. **Authoritative Domain Models**: Entities (Weapons, Mods, Effects) must own their logic. Avoid "data-bag" interfaces.
3. **Rigorous Type Safety**: No `any` or brittle casts. Use strict Enums and Discriminated Unions.
4. **Context Encapsulation**: Use focused Context objects (e.g., `CombatContext`, `TargetContext`) to avoid parameter drilling.
5. **Clean Delegation**: Managers/Processors are thin coordinators. Complex logic belongs to the Domain Objects.
6. **Purge Primitive Obsession**: Eliminate hardcoded strings and magic numbers. Everything tunable belongs in a Typesafe Enum or a Configuration Data entry.
