# Zero-Trust Architectural Audit Report & Strategy Proposal (Revised)

---
> **STATUS**: **Screenshot Foundational Audit COMPLETED**
> We have successfully extracted canonical terminology and bucket classifications from the in-game UI.
> **Key Discovery**: "The 113 Test" confirmed that "DMG Factor" and "DMG Coefficient" are **additive** within a single multiplicative bucket applied to the keyword's intrinsic power.
> **Source**: [INGAME_KNOWLEDGE_BIBLE.md](../../research/INGAME_KNOWLEDGE_BIBLE.md) | [damage-formula-engine-abstraction.md](../designs/damage-formula-engine-abstraction.md)
---

## 1. Audit Findings: The "Source Truth" Synthesis

### I. Multiplier Bucket Taxonomy (Revised)
Based on the "113 Test," we are simplifying the bucket hierarchy to a **3-Layer Tag-Based System**:
1.  **Base Layer**: `SourceStat (Psi/Attack) * IntrinsicValue (0.50/0.12)`.
2.  **Additive Layer**: `1 + Sum(Tags)` (Where both "Factor" and "Coefficient" mods reside).
3.  **Multiplicative Layer**: `Product(FinalModifiers)` (Where "Final DMG" and "Ultimate DMG" reside).

### II. Terminology Alignment
Internal enums (`StatType`, `DamageTrait`) must be renamed to match the UI:
*   `Fire` -> `Blaze`, `Ice` -> `Frost`, `Lightning` -> `Shock`.
*   Incorporate `Status DMG Bonus` and `Elemental DMG Bonus` as distinct categories.

---

## 2. Strategy: Stabilization & Tag-Based Ingestion

### I. Test Suite Stabilization (Immediate Priority)
Before refactoring, we must fix the broken test suite:
1.  Fix `Entity` vs `Enemy` mismatch.
2.  Adjust `PsiIntensity` baseline errors in legacy tests.
3.  Establish a "Green" build baseline.

### II. The "Compiler" DataMapper
The `DataMapper` will transition into a **Tag-Based Mechanics Compiler**:
*   **Parsing**: It will parse JSON strings and tag them as `AdditiveKeywordBonus` or `MultiplicativeFinalBonus` based on the Bible's canonical wording.
*   **Agnosticism**: It will no longer distinguish between "Factor" and "Coefficient" structurally, as they interact identically in the math.

---

## 3. Task & Implementation Tracking (Mandatory)

### Phase 0: Stabilization & Cleanup (The "Test First" Loop)
- [ ] **Fix Broken Tests**:
    - [ ] Resolve `Enemy` class constructor and inheritance issues.
    - [ ] Ensure `npm test` passes consistently.
- [ ] **Rename Enums**:
    - [ ] Update `StatType` and `DamageTrait` to use `Blaze`, `Frost`, `Shock`.

### Phase 1: Zero-Trust Ingestion (The Compiler)
- [ ] **Implement `MechanicsParser`**:
    - [ ] Logic to map JSON strings to `TriggeredEffect` objects with appropriate interaction tags.
- [ ] **Anchor ScalingEngine**:
    - [ ] Use Bible Tier V baselines to validate `calculateFinalBaseDamage`.

### Phase 2: User-Driven Design Review (PENDING)
- [ ] **Review User Alternative**:
    - [ ] Analyze the user's "even cleaner abstraction" for the formula engine.
    - [ ] Re-align `DamageResolutionStrategy` based on approved abstraction.

### Phase 3: High-Fidelity Implementation
- [ ] **Refine `RefinedResolutionStrategy`**:
    - [ ] Implement the 3-layer tag-based math.
- [ ] **Deterministic RNG**:
    - [ ] Inject `RNGService`.
- [ ] **Bible Regression**:
    - [ ] Verify "Full Star" simulations match screenshot DMG values.
