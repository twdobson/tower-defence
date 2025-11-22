# Deployment Guide

This guide covers the fully automated deployment of the Tower Defense game to Google Cloud Run using GitHub Actions.

## Architecture

- **Frontend**: Static HTML/CSS/JavaScript served by Express
- **Backend**: Node.js Express server
- **Database**: JSON file storage
- **Container**: Docker
- **Hosting**: Google Cloud Run
- **CI/CD**: GitHub Actions

## Prerequisites

1. **Google Cloud Platform**:
   - Active GCP account
   - Project ID: `game-zone-479009` (or update in scripts)
   - `gcloud` CLI installed and authenticated
   ```bash
   gcloud auth login
   gcloud config set project game-zone-479009
   ```

2. **GitHub**:
   - Repository created at `https://github.com/twdobson/tower-defence`
   - GitHub CLI installed (optional, for automated secrets setup)
   ```bash
   # macOS
   brew install gh

   # Authenticate
   gh auth login
   ```

3. **Local Tools**:
   - Git
   - Docker (optional, for local testing)

## Automated Deployment Process

### Step 1: Initial Repository Setup

```bash
# Clone or navigate to your project
cd /Users/tim/Documents/code/tower-defence

# Add GitHub remote (if not already added)
git remote add origin https://github.com/twdobson/tower-defence.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 2: Run GCP Setup Script

The `setup-gcp.sh` script automates all GCP infrastructure setup:

```bash
./setup-gcp.sh
```

**What this script does:**
1. ✅ Configures GCP project (`game-zone-479009`)
2. ✅ Enables required APIs (Cloud Run, Container Registry, Cloud Build)
3. ✅ Creates service account (`github-actions@game-zone-479009.iam.gserviceaccount.com`)
4. ✅ Grants necessary IAM permissions:
   - `roles/run.admin` - Deploy to Cloud Run
   - `roles/storage.admin` - Push to Container Registry
   - `roles/iam.serviceAccountUser` - Use service account
5. ✅ Generates service account key
6. ✅ Configures GitHub secrets (if GitHub CLI is authenticated)
   - `GCP_PROJECT_ID`
   - `GCP_SA_KEY`
7. ✅ Cleans up temporary files

**If GitHub CLI is not available**, the script will provide manual instructions for adding secrets.

### Step 3: Deploy

Every push to the `main` branch automatically triggers deployment:

```bash
git push origin main
```

**GitHub Actions workflow does:**
1. Checks out code
2. Authenticates to GCP using service account
3. Builds Docker image
4. Pushes image to Google Container Registry
5. Deploys to Cloud Run with configuration:
   - Region: `us-central1`
   - Memory: 512Mi
   - CPU: 1
   - Max instances: 10
   - Port: 3000
   - Public access: Enabled

### Step 4: Access Your Game

After deployment completes (2-3 minutes), find your URL:

1. Check GitHub Actions logs: `https://github.com/twdobson/tower-defence/actions`
2. Or use gcloud:
   ```bash
   gcloud run services describe tower-defence --region=us-central1 --format='value(status.url)'
   ```

The game will be live at: `https://tower-defence-[hash]-uc.a.run.app`

## Reproducibility

### Complete Setup from Scratch

```bash
# 1. Clone repository
git clone https://github.com/twdobson/tower-defence.git
cd tower-defence

# 2. Install dependencies (for local testing)
npm install

# 3. Run GCP setup
./setup-gcp.sh

# 4. Push any changes
git push origin main
```

### Re-running Setup (Idempotent)

The setup script is idempotent - running it multiple times is safe:

```bash
./setup-gcp.sh
```

- Existing service accounts are reused
- New keys are generated only if needed
- IAM permissions are updated if changed
- GitHub secrets are overwritten with new values

### Teardown (Cleanup)

To completely remove all GCP resources:

```bash
./teardown-gcp.sh
```

**This removes:**
- Cloud Run service
- Container images from GCR
- Service account
- IAM policy bindings
- Local key files

**Note**: APIs remain enabled. Disable manually if needed:
```bash
gcloud services disable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com
```

## Infrastructure as Code

All infrastructure is defined in code:

1. **Docker Configuration**: `Dockerfile`
2. **CI/CD Pipeline**: `.github/workflows/deploy.yml`
3. **GCP Resources**: `setup-gcp.sh`
4. **Cleanup**: `teardown-gcp.sh`

## Local Development

### Run Locally

```bash
npm start
```

Game available at: `http://localhost:3000`

### Test Docker Build Locally

```bash
# Build
docker build -t tower-defence .

# Run
docker run -p 3000:3000 tower-defence

# Test
curl http://localhost:3000
```

## Troubleshooting

### Deployment Failed

1. Check GitHub Actions logs:
   ```
   https://github.com/twdobson/tower-defence/actions
   ```

2. Verify secrets are set:
   ```bash
   gh secret list --repo=twdobson/tower-defence
   ```

3. Check service account permissions:
   ```bash
   gcloud projects get-iam-policy game-zone-479009 \
     --flatten="bindings[].members" \
     --filter="bindings.members:serviceAccount:github-actions@game-zone-479009.iam.gserviceaccount.com"
   ```

### Service Not Starting

1. Check Cloud Run logs:
   ```bash
   gcloud run services logs read tower-defence --region=us-central1
   ```

2. Test container locally:
   ```bash
   docker build -t test-tower-defence .
   docker run -p 3000:3000 test-tower-defence
   ```

### GitHub Secrets Not Working

Re-run setup script or set manually:

```bash
# Using GitHub CLI
echo "game-zone-479009" | gh secret set GCP_PROJECT_ID --repo=twdobson/tower-defence
gh secret set GCP_SA_KEY --repo=twdobson/tower-defence < .gcp-key-temp.json

# Or via GitHub UI
# https://github.com/twdobson/tower-defence/settings/secrets/actions
```

## Cost Estimation

Google Cloud Run pricing (as of 2024):

- **Free tier**: 2 million requests/month
- **Compute**: $0.00002400 per vCPU-second
- **Memory**: $0.00000250 per GiB-second
- **Requests**: $0.40 per million requests

Estimated monthly cost for moderate traffic (~10k requests/month):
- **~$1-5/month** depending on usage

## Security Notes

1. ✅ Service account keys never committed to git (in `.gitignore`)
2. ✅ Keys stored securely in GitHub Secrets
3. ✅ Minimal IAM permissions (principle of least privilege)
4. ✅ Temporary keys deleted after upload
5. ✅ CORS configured appropriately
6. ✅ No sensitive data in client-side code

## Monitoring

### View Logs

```bash
# Real-time logs
gcloud run services logs tail tower-defence --region=us-central1

# Recent logs
gcloud run services logs read tower-defence --region=us-central1 --limit=50
```

### View Metrics

```bash
# In Cloud Console
https://console.cloud.google.com/run/detail/us-central1/tower-defence/metrics?project=game-zone-479009
```

## Updating the Deployment

### Change Application Code

```bash
# Make changes
vim frontend/js/game.js

# Commit and push
git add .
git commit -m "Update game logic"
git push origin main

# GitHub Actions automatically deploys
```

### Change Infrastructure

```bash
# Update setup script
vim setup-gcp.sh

# Re-run setup
./setup-gcp.sh

# Update workflow if needed
vim .github/workflows/deploy.yml
git add .
git commit -m "Update deployment configuration"
git push origin main
```

### Change Environment Variables

Update in `.github/workflows/deploy.yml` and push:

```yaml
- name: Deploy to Cloud Run
  run: |
    gcloud run deploy tower-defence \
      --image gcr.io/$PROJECT_ID/tower-defence:$GITHUB_SHA \
      --region us-central1 \
      --set-env-vars="NODE_ENV=production,CUSTOM_VAR=value"
```

## Rollback

### To Previous Version

```bash
# List revisions
gcloud run revisions list --service=tower-defence --region=us-central1

# Rollback to specific revision
gcloud run services update-traffic tower-defence \
  --to-revisions=tower-defence-00001-abc=100 \
  --region=us-central1
```

### Via Git

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# GitHub Actions will deploy the reverted version
```
