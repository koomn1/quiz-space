@echo off
echo Starting push to GitHub Pages...
git branch -M main
git remote set-url origin https://github.com/koomn1/quiz-space.git
git push -u origin main --force
echo Done! GitHub Actions is now deploying your site to GitHub Pages.
pause
