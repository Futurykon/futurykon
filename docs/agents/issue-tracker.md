# Issue Tracker

Provider: GitHub Issues
Repo: Futurykon/futurykon
CLI: gh

## Creating issues
gh issue create --title "..." --body "..."

## Listing issues
gh issue list --state open

## Updating issues
gh issue edit <number> --add-label "..." --remove-label "..."

## Closing issues
gh issue close <number>

## Notes
- Always create issues from the `main` branch context
- Link PRs to issues using "Closes #<number>" in PR body
