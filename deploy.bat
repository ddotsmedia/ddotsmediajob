@echo off
REM ===========================================================
REM  DdotsMediaJobs - Windows deploy helper.
REM  Commits and pushes; GitHub Actions handles build + deploy.
REM ===========================================================
setlocal

echo.
echo === DdotsMediaJobs deploy ===
echo.

REM Stage everything
git add -A

REM Commit message (arg or default)
set "MSG=%~1"
if "%MSG%"=="" set "MSG=deploy: update %DATE% %TIME%"

git commit -m "%MSG%"
if errorlevel 1 (
  echo No changes to commit, pushing anyway...
)

REM Push current branch
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%b"
echo Pushing branch %BRANCH%...
git push origin %BRANCH%

echo.
echo Done. GitHub Actions will build and deploy to the VPS.
echo Track progress: https://github.com/ddotsmedia/ddotsmediajobs/actions
endlocal
