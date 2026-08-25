$worktrees = @(
    "C:/Code/vaani/.claude/worktrees/agent-a8d3f02050fdbc8ff",
    "C:/Code/vaani/.claude/worktrees/agent-aaee60c2b2acbb922",
    "C:/Code/vaani/.claude/worktrees/fix-beta-ui-rollout",
    "C:/Code/vaani/.worktrees/beta-access",
    "C:/Code/vaani/.worktrees/channels-v2",
    "C:/Code/vaani/.worktrees/dashboard-refresh",
    "C:/Code/vaani/.worktrees/landing-redesign",
    "C:/Code/vaani/.worktrees/pipeline-hardening",
    "C:/Code/vaani/.worktrees/settings-cleanup",
    "C:/Code/vaani/.worktrees/vaani-changes"
)

foreach ($wt in $worktrees) {
    if (Test-Path $wt) {
        Write-Host "========================================"
        Write-Host "Checking worktree: $wt"
        Set-Location $wt
        $branch = (git rev-parse --abbrev-ref HEAD).Trim()
        Write-Host "Branch: $branch"
        $status = (git status --porcelain)
        if ($status) {
            Write-Host "Uncommitted changes found! Committing..."
            git add -A
            git commit -m "chore: save worktree changes on $branch"
        } else {
            Write-Host "No uncommitted changes."
        }
        Write-Host "Pushing branch $branch to origin..."
        git push origin $branch 2>&1
    } else {
        Write-Host "Worktree path does not exist: $wt"
    }
}
Set-Location "C:/Code/vaani"
