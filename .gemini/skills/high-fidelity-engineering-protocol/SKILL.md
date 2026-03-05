---
name: high-fidelity-engineering-protocol
description: Mandatory high-precision development workflow. Use this for ALL tasks involving architectural changes, domain materialization, or engine logic to ensure Zero-Trust integrity and Bit-Perfect simulation through formal ADR documentation and verbatim code specs.
---

# High-Fidelity Engineering Protocol

This protocol defines the strict, non-negotiable development flow for the OnceHuman Simulator project. It is designed to eliminate "completion bias," "sloppiness," and "corner-cutting" by enforcing absolute transparency and rigorous verification.

## 1. The Mandatory Sequence

You MUST follow this exact sequence for every task. Do not skip steps. Do not start with a "Plan" or "Strategy" sketch.

### Step 1: Full ADR Reconnaissance
Before touching any code or formulating a plan, you MUST read **ALL** existing ADRs in the `simulator/docs/designs/` directory in their entirety.
- Goal: Maintain absolute continuity with previous architectural decisions.
- Tool: `read_file` on every ADR file.

### Step 2: Formal ADR Creation
You MUST create a new, formally numbered ADR (e.g., `ADR-005-...`) before implementing any change.
- The ADR must be written in the `simulator/docs/designs/` directory.
- Use the status "Proposed" or "In-Progress" as appropriate.

### Step 3: Verbatim Implementation Specification
The ADR MUST contain **verbatim code blocks** for:
1.  **Every single logic change**: Show the exact classes, methods, and types you will add or modify.
2.  **Every registry update**: Show the exact data objects being added to weapons, armor, or mod files.
3.  **High-Fidelity Tests**: You MUST include the verbatim code for the integration tests that will verify the change. No exceptions.

### Step 4: Verification & Proof
After implementation, you MUST prove the presence of the code in the ADR using explicit grep checks.
- Command: `grep -F "first 50 chars of verbatim block" path/to/file`
- This proves that what is documented is what was actually built.

## 2. Standards of Excellence

- **Zero Type Escapes**: The use of `as any` or `any` is strictly prohibited. If a type is missing, create it.
- **Enum Discoverability**: Never use raw strings for registry lookups (e.g., `bucketMultipliers['weapon_damage']`). Use enums (e.g., `BucketId.WeaponDamage`).
- **Bit-Perfect Simulation**: Every logic change must be verifiable against the "In-Game Knowledge Bible" through bit-perfect output matching.
- **Verification is Finality**: A task is NOT complete until `npm test` and `npx tsc --noEmit` return zero errors and the ADR is updated with verbatim proof of implementation.

## 3. Disrespect Protocol
Failing to follow this protocol—by being vague, omitting code blocks, or cutting corners in tests—is considered a failure of the agent's core mandate and a sign of disrespect to the project's engineering standards.
