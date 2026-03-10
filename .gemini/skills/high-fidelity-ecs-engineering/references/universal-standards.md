# Universal Engineering Standards: ECS Integration

These standards are adapted from the core `~/dev/.ai` frameworks to ensure that our high-fidelity game engine development follows industry-leading software engineering rigor.

## I. ECS System Design & Trade-offs
Every architectural decision in the ECS-First paradigm must be evaluated through explicit trade-off analysis.

### 1. The Indirection vs. Composition Trade-off
- **Indirection (Cost)**: Accessing data requires querying the `World` for a `Component` by `EntityId`. This is more verbose than direct object access.
- **Composition (Benefit)**: Systems are decoupled and orthogonal. Adding new behavior (e.g., a "Burning" flag) does not require modifying a "Weapon" or "Player" class.
- **Standard**: ADRs MUST explicitly state why the benefits of composition outweigh the costs of indirection for a given feature.

### 2. Data Flow & API Contracts
- **Branded IDs**: Use branded types (e.g., `EntityId`, `IntentId`) to prevent primitive obsession and accidental ID mixing.
- **Pure Systems**: Systems are pure functions. They do not hold state. If a system needs state (e.g., a "Tick Counter"), that state MUST be moved into a `Component`.

## II. Tech Debt Prioritization (The Audit Formula)
Use this framework during `architectural-audit` to prioritize refactors from legacy OOP to ECS.

### 1. The Prioritization Formula
**Priority = (Impact + Risk) x (6 - Effort)**
- **Impact (1-5)**: How much does this "Fat Object" or "Type Escape" slow down development?
- **Risk (1-5)**: What is the probability of a "Ghost Bug" or "State Pollution" if this is NOT refactored?
- **Effort (1-5)**: How complex is the migration to a pure ECS System? (1 = Easy, 5 = High Complexity).

### 2. Game Engine Debt Categories
- **Fidelity Debt**: Discrepancies between the engine math and the "In-Game Knowledge Bible."
- **Type Debt**: Any usage of `any`, `unknown`, or unsafe casts.
- **State Debt**: Hidden mutations or shared state across Monte Carlo iterations.

## III. ECS Testing Strategy (The Pyramid)
A high-fidelity engine requires a layered verification approach.

### 1. The Testing Pyramid
- **Unit (Systems)**: Test a single System (pure function) in isolation. Mock the `World` with minimal components.
- **Integration (Pipelines)**: Test the full `COMBAT_PIPELINE` pass. Verify that multiple systems interact correctly to resolve damage.
- **Contract (Ingestion)**: Ensure the `GameDataCompiler` (Translation Layer) correctly maps raw JSON to strictly typed ECS Components.

### 2. Coverage Targets
- **Critical Paths**: 100% coverage for the `Universal Bucket Resolver` and `Trigger Evaluation System`.
- **Edge Cases**: Explicitly test "Zero-Value" buckets, "MAX_DEPTH" chain caps, and "First-Half-of-Mag" conditionals.
