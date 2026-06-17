#!/bin/bash
# FIX: Remove .env.local from git history if it was accidentally committed
# Run this ONCE from D:\Luckfixer directory
#
# Step 1: Check if .env.local is tracked
# git ls-files --error-unmatch .env.local
#
# Step 2: If tracked, remove from git index (stops tracking, keeps file locally)
git rm --cached .env.local 2>/dev/null || echo ".env.local not in git index"
git rm --cached .env 2>/dev/null || echo ".env not in git index"

# Step 3: Add .gitignore and commit
git add .gitignore
git add -A
git commit -m "security: add .gitignore, remove env files from tracking"
git push origin main

echo ""
echo "Done! .env.local will no longer be tracked."
echo "Remember: All secrets must be set in Netlify dashboard, never in code."
