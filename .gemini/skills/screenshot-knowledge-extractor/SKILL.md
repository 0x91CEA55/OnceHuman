---
name: screenshot-knowledge-extractor
description: A repeatable workflow for extracting qualitative game knowledge from screenshots (OCR) and consolidating it into the 'In-Game Knowledge Bible'. Orchestrated by the main agent and executed by the knowledge_extractor sub-agent.
---

# Screenshot Knowledge Extraction Protocol

Use this skill whenever new in-game screenshots are provided or when a recurring audit of visual data is needed to verify the simulator's alignment with the live game state.

## Orchestration Workflow

1.  **Preparation**:
    *   Main agent identifies the directory of screenshots to process (e.g., `research/data/ingame-screenshots/Weapon/`).
    *   Main agent lists all images to define the scope for the sub-agent.

2.  **Delegation**:
    *   Main agent invokes the `knowledge_extractor` sub-agent with a specific focused task (e.g., "Extract all set bonuses from the Armor/ folder and update the Bible").
    *   The sub-agent is responsible for OCR, semantic cross-referencing (for ID resolution only), and updating `research/INGAME_KNOWLEDGE_BIBLE.md`.

3.  **Review**:
    *   Upon completion, the main agent reviews the updates to the Bible and identifies any "Schema Breaking" changes (e.g., a new damage bucket revealed in UI).

4.  **Refinement**:
    *   Main agent proposes updates to the `DamageResolutionStrategy` or internal `StatType` enums based on the sub-agent's findings.

## Sub-Agent Instructions (`knowledge_extractor`)

### I. OCR Precision
Extract text exactly as written. If the UI says "Hyper-sensitive Blaze DMG," do not simplify it to "Fire Damage."

### II. ID Resolution (The ONLY JSON Use Case)
If a screenshot lacks a name, search the extracted "Unique Effects" text in `research/data/custom-datamine/*.json` to find the corresponding `weapon_id`. **NEVER** use values or formulas from these JSON files to fill in the Bible. If it's not in the screenshot, it's not "Source Truth."

### III. Bible Updates
*   Maintain `research/INGAME_KNOWLEDGE_BIBLE.md`.
*   Ensure every entry is tagged with its source screenshot file path.
*   Update canonical terminology in Section I before adding specific items.

## Main Agent Mandates
*   **Context Preservation**: Use the sub-agent to keep the bulk of visual processing and textual mapping out of the main conversation context.
*   **Verification**: Ensure the sub-agent identifies discrepancies between the UI and the current engine code.
