<#
.SYNOPSIS
  Complete remote deploy of DdotsMediaJobs from Windows — pushes the current
  branch, then SSHes to the VPS and runs the full deploy.sh pipeline.

.USAGE
  pwsh deploy/remote-deploy.ps1 -VpsHost 1.2.3.4 -User deploy
  # or set env once:  $env:VPS_HOST='1.2.3.4'; $env:VPS_USER='deploy'
  pwsh deploy/remote-deploy.ps1 -Push        # also git add/commit/push first
#>
param(
  [string]$VpsHost = $env:VPS_HOST,
  [string]$User    = $env:VPS_USER,
  [string]$AppDir  = '/var/www/ddotsmediajobs',
  [string]$Branch  = 'main',
  [switch]$Push,
  [string]$Message = ''
)

$ErrorActionPreference = 'Stop'

if (-not $VpsHost) { throw 'Set -VpsHost or $env:VPS_HOST' }
if (-not $User)    { throw 'Set -User or $env:VPS_USER' }

if ($Push) {
  Write-Host '▶ Committing and pushing…' -ForegroundColor Cyan
  git add -A
  if (-not $Message) { $Message = "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')" }
  git commit -m $Message 2>$null
  git push origin $Branch
}

$remote = @"
set -e
cd $AppDir
git fetch --all --prune
git reset --hard origin/$Branch
BRANCH=$Branch bash deploy/deploy.sh
"@

Write-Host "▶ Deploying on $User@$VpsHost…" -ForegroundColor Cyan
$remote | ssh "$User@$VpsHost" 'bash -s'

if ($LASTEXITCODE -ne 0) { throw "Remote deploy failed (exit $LASTEXITCODE)" }
Write-Host '✓ Deploy complete.' -ForegroundColor Green
