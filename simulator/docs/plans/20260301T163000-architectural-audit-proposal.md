# Architectural Audit & Data Fidelity Proposal: OnceHuman Simulator (Revised)

## Analysis: Current State & "High-Fidelity" Gaps

The OnceHuman Simulator is transitioning toward a "Professional Game Studio" architecture. While core models are well-structured, we face a critical challenge: **Source Data Fragility**.

### 1. The "Dirty Source" vs. "Clean Domain" Gap
*   **Inconsistent Data (`raw.json`)**: Our primary data source is a hodgepodge of manually-scraped stats with inconsistent naming, mixed rarity tiers (I-V), and varying star levels.
*   **Architectural Leakage**: Currently, some models are beginning to mirror the messiness of the source data. This risks "LLM Drift," where the assistant might misinterpret a JSON property and propagate a bug into the clean engine logic.
*   **Scaling Confusion**: Logic for weapon scaling (Stars/Tiers) is currently mixed into the data factory. In a high-fidelity engine, the **Data** provides the "Seed" (Base Stats), while the **Engine** provides the "Intelligence" (Scaling Math).

### 2. Multiplier & Pipeline Weaknesses
*   **Bucket Conflation**: PARITY GAP: The 2026 game meta uses a strict 5-bucket system (A: Base, B: Crit/Weakspot, C: Enemy Type, D: Ultimate, E: Final). Our current `DamageProcessor` conflates "Ultimate" (additive within its bucket) and "Final" (true global multiplier).
*   **Status vs. Elemental**: Community theorycrafting proves these are separate multiplicative categories. Our current trait-based system is too loose to enforce this "balancing act" for optimization.

---

## Implementation Strategy: The "Clean Domain" Refactor

### 1. Robust Ingestion & Mapping Layer (The "Protection Layer")
*   **The Translation Layer**: Build a dedicated `DataMapper` utility. 
    *   It will map inconsistent JSON keys (e.g., `dmg_per_projectile`) to standardized Domain properties (`baseDamage`).
    *   It will serve as the "Zero-Trust" boundary, validating data before it ever reaches a class constructor.
*   **Scaling Intelligence**: Move the logic for Star/Tier scaling into a `ScalingEngine` service.
    *   The `Weapon` model will only hold the *calculated* final stats for the current simulation.
    *   The `WeaponFactory` will use the `ScalingEngine` to project a "Tier 1 Seed" from `raw.json` into a "Tier 5, 6-Star" instance.

### 2. High-Fidelity Damage Pipeline (The 5-Bucket System)
*   **Refactor `DamageIntent`**: Formalize the 5-bucket structure (A through E).
*   **Bucket D (Ultimate Summing)**: Ensure all "Ultimate" trait bonuses (e.g., Ultimate Status DMG) are summed together *before* being applied as a single multiplicative layer.
*   **Bucket E (Final DMG)**: Reserved for absolute global multipliers (Vulnerability, food buffs).
*   **Strict Category Enforcement**: Architecturally separate **Status DMG** and **Elemental DMG** into their own multiplicative buckets.

### 3. Data-Driven "Behavior" Strategy
*   **Registry Pattern**: Introduce an `EffectRegistry` that maps textual IDs in `raw.json` to reusable `TriggeredEffect` templates.
*   **Behavior Composition**: Remove weapon subclasses. A weapon's unique behavior (e.g., "Jaws" explosion) will be composed of reusable `Conditions` (e.g., `HitCounterCondition`) and `Effects` (e.g., `ExplosionEffect`).

---

## High-Fidelity Testing & Regression Plan

To ensure the structural integrity of the new architecture, we will implement a tiered testing strategy that "breaks loudly" upon any deviation from our foundation.

### 1. "Golden Formula" Contract Tests
*   **The 5-Bucket Audit**: Implement a suite of tests that pass a `DamageIntent` through the `DamageProcessor` and verify the exact value of each bucket (A-E) before the final resolution.
    *   *Regression Trigger*: If a new mod accidentally adds a "Final" bonus to the "Ultimate" bucket, this test will fail immediately.
*   **Multiplicative Category Invariants**: Tests to ensure **Status DMG** and **Elemental DMG** never sum together. They must remain independent multiplicative factors.

### 2. "Zero-Trust" Ingestion Tests
*   **Schema Mapping Validation**: A test suite that runs against a "Chaos JSON" (a mocked `raw.json` with extreme naming inconsistencies). It verifies that the `DataMapper` correctly normalizes values into the Domain Model.
    *   *Regression Trigger*: If a property is added to a model that isn't explicitly handled by the Mapper, the build fails.
*   **Scaling Projection Checks**: Verify that a Tier 1 weapon "Seed" correctly projects to Tier 5 values using the `ScalingEngine`.

### 3. "Studio-Grade" Combat Log Audits
*   **Traceability Tests**: Automated scripts that run complex simulations (e.g., "Burn stacking with BBQ Gloves and Lonewolf") and verify the `AuditLog` trace.
    *   It checks that frequency scaling $F = 1 / (1 + B)$ is applied correctly and that every multiplier in the log matches the theoretical 5-bucket formula.

### 4. Architectural Purity Enforcement (Linting/Static Analysis)
*   **Subclass Ban**: A custom lint rule or build-step script to prevent the creation of new subclasses in `src/data/`.
*   **Context Purity**: A test to ensure `CombatContext` contains zero instances of `any` and no circular references.

---

## Success Criteria
*   **Domain Purity**: Zero properties in the `Weapon` or `Mod` classes are named based on `raw.json` quirks.
*   **Ingestion Reliability**: The `DataMapper` logs warnings for missing or anomalous data during initialization.
*   **Calculation Transparency**: The `AuditLog` explicitly shows the 5-bucket breakdown ($A \times B \times C \times D \times E$) for every hit.
*   **Extensibility**: Adding a new weapon with a complex "reload-to-trigger" perk requires zero changes to core engine logic.
