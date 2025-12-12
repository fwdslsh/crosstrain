---
description: Review a pull request by number or URL
---

# Pull Request Review

Review pull request: $ARGUMENTS

## Instructions

1. Fetch the PR details using `gh pr view $1`
2. Get the diff using `gh pr diff $1`
3. Analyze all changes for:
   - Code quality
   - Potential bugs
   - Security concerns
   - Test coverage
   - Documentation

4. Provide a structured review with:
   - Summary of changes
   - List of concerns (if any)
   - Suggested improvements
   - Overall recommendation (approve, request changes, or comment)

Be constructive and specific in your feedback.
