# Git Worktrees — The Complete How-To Guide

> A worktree gives you a **fully independent working directory** that shares the same `.git` database. Think of it as having multiple copies of your repo checked out at different branches, without cloning.

---

## Why worktrees?

| Without worktrees | With worktrees |
|---|---|
| One working directory = one branch at a time | Many directories, each on its own branch |
| Must stash/unstash when switching tasks | Switch by `cd`-ing to another directory |
| `git checkout` other branch = lose current state | Each worktree preserves its own state |
| Can't run tests on two features simultaneously | Run tests in parallel across worktrees |
| Multiple Claude terminals fight over one working dir | Each Claude terminal gets its own worktree |

---

## Setup (one time per project)

### Step 1: Create the worktree directory and add to `.gitignore`

```bash
# From the project root:
mkdir .worktrees

# Add to .gitignore so worktree contents aren't tracked
echo ".worktrees/" >> .gitignore
git add .gitignore
git commit -m "chore: add .worktrees/ to .gitignore"
```

### Step 2: Create your first worktree

```bash
git worktree add .worktrees/my-feature -b my-feature
```

This creates a new directory `.worktrees/my-feature/` with the repo checked out at a new branch called `my-feature`, based on whatever branch you're currently on (usually `main`).

### Step 3: Work inside the worktree

```bash
cd .worktrees/my-feature

# Now use this directory as if it were the repo:
# - Open your editor here
# - Open Claude here
# - Run tests, build, etc.
# Everything is isolated from the main working directory
```

---

## Everyday Commands

### See all active worktrees

```bash
git worktree list
```

Output looks like:
```
C:/Code/vaani                              abc1234 [main]
C:/Code/vaani/.worktrees/my-feature        abc1234 [my-feature]
C:/Code/vaani/.worktrees/other-feature     abc1234 [other-feature]
 new worktree for a task

```bash
# MUST be in the main repo or a non-worktree directory when creating
git worktree add .worktrees/<task-name> -b <branch-name>
```

**Naming convention:** Name the directory after the task/feature, and the branch the same thing. Examples:
```bash
git worktree add .worktrees/auth-fix -b fix/auth-crash
git worktree add .worktrees/dark-mode -b feat/dark-mode
git worktree add .worktrees/refactor-logging -b refactor/logger
```

### Move to a worktree

```bash
cd .worktrees/my-feature
```

### Work with multiple terminals

Open **Terminal 1:**
```bash
cd /c/Code/vaani         # main repo, on main branch
```

Open **Terminal 2:**
```bash
cd /c/Code/vaani/.worktrees/my-feature   # worktree, on my-feature branch
```

Open **Terminal 3:**
```bash
cd /c/Code/vaani/.worktrees/other-feature  # another worktree
```

Each terminal has its own branch, its own `node_modules`, its own `.next/` build cache — complete isolation.

---

## When the worktree is done

### Option A: Merge it into main via PR

```bash
# From the worktree directory:
git push -u origin my-feature

# Then on GitHub, create a PR from my-feature → main
# After PR is merged:
```

### Option B: Merge locally

```bash
# From the main repo (not inside a worktree):
git checkout main
git merge my-feature
```

### Clean up the worktree

```bash
# From the project root (NOT inside the worktree):
git worktree remove .worktrees/my-feature

# Delete the branch too (optional):
git branch -d my-feature
```

---

## Project-specific setup: Vaani

This repo is already set up with:
- `.worktrees/` in `.gitignore` (line 43)
- A worktree at `.worktrees/vaani-changes` for the current session

### Vaani workflow example

You want to work on two things at once — fix a bug and start a new feature:

```bash
# Terminal 1: work on main repo, fix the bug
cd /c/Code/vaani                       # already on main
git worktree add .worktrees/bugfix -b fix/decrypt-crash
cd .worktrees/bugfix
# ... Claude / editor / fix ...

# Terminal 2: start the new feature
cd /c/Code/vaani                       # back to main
git worktree add .worktrees/new-feature -b feat/real-time-chat
cd .worktrees/new-feature
# ... Claude / editor / build feature ...

# When done with bugfix:
cd /c/Code/vaani
git worktree remove .worktrees/bugfix
git merge fix/decrypt-crash
```

---

## Rules / Best Practices

### DO:
- ✅ Always create worktrees from the **main repo root** (not from inside another worktree)
- ✅ Name the directory and branch the same thing
- ✅ Run `git worktree list` regularly to see what's active
- ✅ Remove worktrees when done to keep things clean
- ✅ Use worktrees for any task that takes longer than 5 minutes

### DON'T:
- ❌ Create a worktree while inside another worktree (creates nested worktrees — confusing Commit directly to `main` while inside a worktree
- ❌ Share a worktree directory between multiple PRUs/agents
- ❌ Leave worktrees around for weeks — they accumulate and `git worktree list` gets messy

---

## Troubleshooting

### "fatal: this working tree is not a linked worktree"
You tried to `cd` into a worktree and use `git` commands but something's wrong. Check:
```bash
# Are you actually in a worktree?
pwd
# Should show something like: /c/Code/vaani/.worktrees/my-feature

# Is git recognizing it?
git rev-parse --git-dir
# Should show: /c/Code/vaani/.git/worktrees/my-feature
```

### "fatal: '<branchname>' is already checked out by another worktree"
That branch is already attached to another worktree. Either:
- Use a different branch name: `git worktree add .worktrees/new -b different-branch`
- Or remove the worktree that has that branch: `git worktree remove .worktrees/other-dir`

### Worktree won't remove: "contains modified files"
Either commit or stash your changes first, or force remove:
```bash
git worktree remove --force .worktrees/my-feature
```

### Clean up ALL stale worktrees
If things get messy:
```bash
# List all worktrees
git worktree list

# Prune any stale references (worktree dirs that no longer exist)
git worktree prune
```

---

## Quick Reference (cheat sheet)

```bash
# Setup
mkdir .worktrees && echo ".worktrees/" >> .gitignore

# Create
git worktree add .worktrees/<name> -b <branch-name>

# Enter
cd .worktrees/<name>

# List
git worktree list

# Remove (after merging)
git worktree remove .worktrees/<name>
git branch -d <branch-name>

# Emergency force-remove
git worktree remove --force .worktrees/<name>

# Cleanup stale refs
git worktree prune
```

---

## How it actually works (for the curious)

```
 .git/objects/          ← shared across ALL worktrees (no duplication)
 .git/worktrees/         ← metadata linking each worktree to its branch
 .worktrees/
   └── my-feature/
 ├── .git          ← a FILE (not dir!) pointing back to main .git
       ├── src/          ← fully independent working copy
       ├── node_modules/ ← independent (if you npm install)
       └── ...
```

Each worktree is just a **checkout of a different branch** of the same repository. The `.git` objects (commit history, blobs) are shared — only the working files are different. This means worktrees are fast to create and use zero extra disk for the repo itself.
