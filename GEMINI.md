# OnceHuman Simulator — Project Context & Engineering Standards

<See .gemini folder>

## Architectural Protocol: Skill-Agent Matrix

To maintain **Context Efficiency** and **Zero-Trust Integrity**, this project operates on a "Process vs. Actor" pattern. **Skills** define the mandatory SOP (Standard Operating Procedure), while **Agents** are the specialized experts that execute those procedures.

| The Skill (The Workflow/SOP) | The Agent (The Specialist/Actor) | Relationship |
| :--- | :--- | :--- |
| `architectural-audit` | `architectural_auditor` | **1-1** (Deep analysis & ADR drafting) |
| `high-fidelity-ecs-engineering` | `game_engineer` | **1-1** (Implementation of ECS mechanics) |
| `screenshot-knowledge-extractor` | `knowledge_extractor` | **1-1** (Visual truth & Bible updates) |
| `tactical-committer` | *Main Agent (Gemini CLI)* | **Procedural** (Standard for Main Agent commits) |

### Core Operating Principles
1. **Context Efficiency**: Complex, turn-intensive tasks (like deep-dive audits or OCR extraction) are delegated to specialized Agents. This "compresses" the work into a single summary in the main conversation context.
2. **Process Integrity (SOPs)**: No specialized Agent should act without an associated Skill that defines its mandatory workflow, verification steps, and reporting standards (e.g., ADR generation).
3. **ECS-First Paradigm**: All new engineering and refactoring must prioritize the Entity Component System (ECS) architecture. Entities are IDs, Components are pure data, and Systems are pure logic.
4. **Zero-Trust Data Ingestion**: All external data must pass through a strictly typed validation and mapping layer before entering the ECS domain.
5. **Bit-Perfect Simulation**: Every logic change must be verifiable against the "In-Game Knowledge Bible" with bit-perfect output matching via high-fidelity integration tests.

