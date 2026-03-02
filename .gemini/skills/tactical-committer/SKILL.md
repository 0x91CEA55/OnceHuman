---
name: tactical-committer
description: A rigorous git-commit procedure that enforces pre-commit verification, sensitive data protection via .gitignore, and high-fidelity commit messaging. Use when the user requests a 'commit pass' or 'tactical commit' to ensure absolute source control integrity.
---

# Tactical Committer Procedure

Follow this exact sequence whenever a commit is requested.

## 1. Pre-Commit Reconnaissance
Run `git status` and `git diff` to analyze all pending changes.
- Identify every modified file and the core intent of each change.
- **Diligence Check:** Look for any sensitive files (e.g., `.env`, `.gemini/`, `GEMINI.md`, secrets) that should NOT be committed.

## 2. Sensitive Data Interception
If any sensitive or agent-meta files are detected in the status:
- Update the `.gitignore` file immediately to exclude them.
- Re-run `git status` to verify they are no longer tracked.

## 3. Staging & High-Fidelity Messaging
Once the workspace is "Clear," stage all relevant changes.
- Propose a commit message that follows this standard:
  - **Header:** Concise summary of the primary change.
  - **Body:** Bulleted list detailing the evolution of the system since the last commit (Architectural shifts, UX enhancements, Engine refinements).
- **CRITICAL:** Wait for user confirmation of the message before executing the commit.

## 4. Execution & Pause
Execute the `git commit`.
- **MANDATORY:** Pause immediately after the commit.
- **DO NOT PUSH** unless explicitly given a second "go ahead" directive.

## 5. Final Verification
Run `git status` one last time to confirm a clean working tree and successful commit.
