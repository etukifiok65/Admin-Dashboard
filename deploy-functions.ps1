# Deploy Admin Edge Functions to Supabase
# Run this script from the repository root: .\deploy-functions.ps1

Write-Host "Deploying Admin Edge Functions to Supabase" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Supabase CLI not found" -ForegroundColor Red
    Write-Host "Install it with one of these methods:" -ForegroundColor Yellow
    Write-Host "  Scoop: scoop bucket add supabase https://github.com/supabase/scoop-bucket.git; scoop install supabase" -ForegroundColor Gray
    Write-Host "  Chocolatey: choco install supabase" -ForegroundColor Gray
    Write-Host "  npx: Use 'npx supabase' instead of 'supabase' in all commands" -ForegroundColor Gray
    exit 1
}

# Check if project is linked
$linkStatus = supabase status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Project not linked to Supabase" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run these commands first:" -ForegroundColor Cyan
    Write-Host "  1. supabase login" -ForegroundColor White
    Write-Host "  2. supabase link --project-ref spjqtdxnspndnnluayxp" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "SUCCESS: Project linked" -ForegroundColor Green
Write-Host ""

# Deploy functions
$functions = @(
    "list-admin-users",
    "list-audit-logs",
    "get-verification-details",
    "create-admin-user",
    "check-admin-status"
)

foreach ($func in $functions) {
    Write-Host "Deploying $func..." -ForegroundColor Cyan
    supabase functions deploy $func
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  SUCCESS: $func deployed successfully" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: Failed to deploy $func" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

Write-Host "All functions deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Set Edge Function secrets (if not already set):" -ForegroundColor White
Write-Host "     supabase secrets set SUPABASE_URL=https://spjqtdxnspndnnluayxp.supabase.co" -ForegroundColor Gray
Write-Host "     supabase secrets set SERVICE_ROLE_KEY=<your-service-role-key>" -ForegroundColor Gray
Write-Host "     supabase secrets set ALLOWED_ORIGINS=https://your-domain.com" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Test in production at your Cloudflare Pages URL" -ForegroundColor White
Write-Host ""
