# `.worktrees/` — Isolated Workspaces

Each subdirectory is a fully independent checkout of the repo on its own branch. Use them to run multiple Claude sessions in parallel without conflicts.

## ⚡ Automatic Worktree Protocol

**For AI agents / Claude Code sessions:**

When assigned a new task, ALWAYS:

```bash
# 1. Check existing worktrees
git worktree list

# 2a. If a worktree for this domain already exists → reuse it
cd .worktrees/<existing-name>

# 2b. If it doesn't exist → create a new worktree from main
cd /c/Code/vaani  # back to main repo (never nest worktrees)
git worktree add .worktrees/<task-name> -b <branch-name>
cd .worktrees/<task-name>

# 3. Update this README table
# 4. Work inside the worktree — never work directly in main
```

**Naming:**
| Branch | Worktree |
|--------|----------|
| `feat/landing-redesign` | `.worktrees/landing-redesign` |
| `fix/auth-crash` | `.worktrees/auth-crash` |
| `refactor/logger` | `.worktrees/logger` |

**Lifecycle:** create → work → merge → remove:
```bash
# When the branch is merged into main:
cd /c/Code/vaani
git worktree remove .worktrees/<name>
git branch -d <branch-name>
```

## Current worktrees

| Directory | Branch | Purpose |
|-----------|--------|---------|
| `vaani-changes` | `vaani-changes` | UX improvements: dead UI, toast feedback, save bug |
| `landing-redesign` | `feat/landing-redesign` | Landing page redesign |
| `dashboard-refresh` | `feat/dashboard-refresh` | Dashboard refresh |
| `channels-v2` | `feat/channels-v2` | Channels v2 |
| `settings-cleanup` | `feat/settings-cleanup` | Settings page cleanup |
| `pipeline-hardening` | `feat/pipeline-hardening` | Server-side pipeline hardening |

## How to create a new worktree

```bash
# From the main repo (on main branch):
git worktree add .worktrees/<name> -b <branch-name>
```

Then `cd .worktrees/<name>` and open your editor/Claude there.

## How to clean up a finished worktree

```bash
# Remove the worktree (after merging or discarding):
git worktree remove .worktrees/<name>

# If you also want to delete the branch:
git branch -d <branch-name>
```

## How to see all active worktrees

```bash
git worktree list
```

## Rules

- Always branch from `main` (or the integration branch you want)
- Never commit to `main` from inside a worktree
- When done, open a PR from the worktree branch back to `main`
- Don't create nested worktrees (don't be inside a worktree when running `git worktree add`)
