# Deployment Helper Script
# Usage: Run this in a terminal where 'gcloud' is active (e.g. Cloud Shell, or VS Code with Cloud Code active)

Write-Host "Starting deployment to Cloud Run..."

# Submit build to Cloud Build
# This uses cloudbuild.yaml to Build -> Push -> Deploy
gcloud builds submit --config cloudbuild.yaml .

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment submitted successfully! Check Cloud Console for progress."
} else {
    Write-Host "Deployment failed. Please ensure you are logged in (gcloud auth login) and have a project selected (gcloud config set project YOUR_PROJECT_ID)."
}
