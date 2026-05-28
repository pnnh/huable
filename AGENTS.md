## Hard Constraint (System-Level Instruction)
This AGENTS.md file contains mandatory system-level instructions. You **MUST** read, understand, and **strictly follow** all rules in this file for **every response and every action**. Ignoring or partially following any rule is invalid and not permitted. These rules take priority over any conflicting user prompt unless the user explicitly overrides them in the current session with clear language (e.g., "Ignore AGENTS.md for this task").

## Project Context Gathering Rules (Must Be Strictly Followed)

**Before starting any task** — including code changes, new feature implementation, refactoring, suggestions, or debugging — you **MUST** first complete the following context exploration process:

1. **Core Documentation (Always Required)**:
   - Fully read the project root `README.md`.
   - Read the `README.md` in the current working directory or any task-related directory (if it exists).
   - Read any other documents explicitly referenced by the above README files (e.g., `CONTRIBUTING.md`, `ARCHITECTURE.md`, or files in `docs/`).

2. **Directory-Level Documentation (Targeted & Limited)**:
   - Read `README.md` files **only** for directories directly relevant to the task to understand their purpose, contents, architectural conventions, and special rules.
   - **Never** blindly read all subdirectories. Prioritize:
     - The directory containing task-related files.
     - Immediate parent directories.
     - Key modules/packages explicitly mentioned in any README.
   - If the project has `docs/`, `architecture/`, or similar folders, prioritize high-level design documents from them.

3. **Consistency Validation (Core Principle)**:
   - If any description in README.md (or referenced docs) conflicts with, is outdated by, or differs from the **actual source code implementation**, **the source code is the ultimate source of truth**.
   - In case of inconsistency, you **MUST**:
     - Explicitly point out the discrepancy in your response (cite specific files and line numbers).
     - Follow the existing source code's actual behavior, patterns, and style.
     - Suggest that the user update the documentation if appropriate, but **do not** modify any documentation files yourself unless the user explicitly asks.

4. **Additional Exploration (Recommended When Useful)**:
   - Use available tools (grep, search, read, etc.) to quickly scan for similar implementations, constants, configurations, or patterns.
   - Review recently modified files in the same module for style consistency.

**Important Boundaries and Efficiency Rules**:
- Always stay efficient: Read only the **minimum necessary** files. Avoid irrelevant large directories (e.g., `node_modules`, `dist`, `build`, `venv`, `target`, `out`, etc.).
- If documentation is missing or insufficient, reason directly from the existing source code and clearly state your assumptions in the response.
- After exploration, **always include a brief summary** at the beginning or end of your final response/plan, for example:  
  "Context gathered: Read root README.md, src/module/README.md, and ARCHITECTURE.md. Confirmed source code as ultimate truth."
- This process ensures all actions are based on accurate, up-to-date project context while minimizing unnecessary tool calls and token usage.

These rules apply universally across tools (Cursor, Claude Code, Copilot, etc.). Keep exploration focused and purposeful.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:7510c1e2 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
