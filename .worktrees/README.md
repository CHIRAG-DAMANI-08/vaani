# `.worktrees/` — Isolated Workspaces

Each subdirectory here is a fully independent checkout of the repo on its own branch. Use them to run multiple Claude sessions (or any work) in parallel without conflicts.

## Current worktrees

| Directory | Branch | Purpose |
|-----------|--------|---------|
| `vaani-changes` | `vaani-changes` | UX improvements: dead UI, toast feedback, save bug |

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
