# ECS Standards & Engineering Rigor

## I. The ECS Architecture
Entities are simple IDs. Components are pure data structures. Systems are the logic that processes components.

1. **Entity Purity**: Entities should not contain logic. They are strictly identifiers or containers for components.
2. **Component Data**: Components must be Plain Old JavaScript Objects (POJOs) or simple classes with NO methods. They represent state, not behavior.
3. **System Isolation**: Systems should be independent and decoupled. They operate on specific sets of components (Queries).
4. **Reactive Flow**: Use a central `World` or `Manager` to coordinate system execution. Avoid systems calling each other directly.

## II. Type Safety & Zero-Trust Engineering
The User demands absolute type safety. Loose typing is a technical debt that we will not incur.

1. **Zero Tolerance for `as any`**: Any use of `as any` or `any` type is a failure of engineering. If a type is difficult to express, it indicates a flaw in the abstraction or a need for a more sophisticated generic or discriminated union.
2. **Discriminated Unions**: Use them for Effects, Triggers, and Actions to ensure exhaustive pattern matching.
3. **Nominal Typing/Branding**: Use branded types for IDs (e.g., `EntityID`, `ComponentID`) to prevent accidental mixing of primitive types.
4. **Validation at Boundaries**: All data entering the ECS (from JSON, user input, or external APIs) MUST be validated against a schema (e.g., Zod) before being turned into a Component.

## III. Principled Decision Making
1. **Long-Term over Short-Term**: If a change makes the build pass but compromises the architecture, it is rejected.
2. **Anti-Prototyping**: We do not "hack it together" to see if it works. We design the solution correctly from the start.
3. **Documenting Intent**: Every major architectural decision must be backed by a rationale. Use ADRs (Architectural Decision Records) for significant changes.
4. **Testing is Mandatory**: A system without tests is a broken system. Every new Component or System requires unit tests covering edge cases and "impossible" states.

## IV. Once Human Simulator Specifics
1. **Formula Fidelity**: Game formulas (Damage, Scaling, Mitigation) must be implemented with bit-perfect accuracy. Use `Decimal.js` or similar if floating-point precision is an issue (verify project usage).
2. **Tick-Rate & Timing**: Simulation must account for tick-based logic if the game requires it (e.g., DoT intervals, ICDs).
3. **Telemetry & Audit**: Every change in the simulation state must be traceable. The ECS should support an audit log of which System modified which Component at what "Time".
