#!/bin/bash

# Tower Defense Game - GCP Setup Script
# This script sets up the necessary GCP resources for Cloud Run deployment

set -e  # Exit on error

PROJECT_ID="game-zone-479009"
SERVICE_ACCOUNT_NAME="github-actions"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
GITHUB_REPO="twdobson/tower-defence"

echo "🎮 Setting up GCP for Tower Defense Game"
echo "Project ID: $PROJECT_ID"
echo "GitHub Repo: $GITHUB_REPO"
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI (gh) not found. Install it from: https://cli.github.com/"
    echo "    After installation, run: gh auth login"
    AUTO_GITHUB=false
else
    # Check if authenticated
    if gh auth status &>/dev/null; then
        echo "✅ GitHub CLI is authenticated"
        AUTO_GITHUB=true
    else
        echo "⚠️  GitHub CLI not authenticated. Run: gh auth login"
        AUTO_GITHUB=false
    fi
fi

echo ""

# Set the project
echo "📌 Setting GCP project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo ""
echo "🔧 Enabling required APIs (this may take a minute)..."
gcloud services enable run.googleapis.com \
    containerregistry.googleapis.com \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    --quiet

echo "✅ APIs enabled"

# Check if service account already exists
echo ""
echo "👤 Checking for existing service account..."
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL &>/dev/null; then
    echo "✅ Service account already exists: $SERVICE_ACCOUNT_EMAIL"
else
    echo "📝 Creating service account..."
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --display-name="GitHub Actions for Tower Defense" \
        --quiet
    echo "✅ Service account created"
fi

# Grant necessary permissions
echo ""
echo "🔐 Granting IAM permissions..."

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/run.admin" \
    --condition=None \
    --quiet >/dev/null 2>&1

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/storage.admin" \
    --condition=None \
    --quiet >/dev/null 2>&1

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/artifactregistry.admin" \
    --condition=None \
    --quiet >/dev/null 2>&1

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/iam.serviceAccountUser" \
    --condition=None \
    --quiet >/dev/null 2>&1

echo "✅ IAM permissions granted"

# Create Artifact Registry repository for GCR
echo ""
echo "📦 Setting up Artifact Registry for GCR..."
if gcloud artifacts repositories describe gcr.io --location=us &>/dev/null; then
    echo "✅ Artifact Registry repository already exists"
else
    echo "📝 Creating Artifact Registry repository..."
    gcloud artifacts repositories create gcr.io \
        --repository-format=docker \
        --location=us \
        --description="Container Registry for Tower Defense" \
        --quiet
    echo "✅ Artifact Registry repository created"
fi

# Create and download service account key
echo ""
echo "🔑 Creating service account key..."
KEY_FILE=".gcp-key-temp.json"

# Remove old key if exists
rm -f "$KEY_FILE"

gcloud iam service-accounts keys create "$KEY_FILE" \
    --iam-account=$SERVICE_ACCOUNT_EMAIL \
    --quiet

echo "✅ Service account key created"

# Configure GitHub secrets
echo ""
if [ "$AUTO_GITHUB" = true ]; then
    echo "🔧 Configuring GitHub secrets..."

    # Set GCP_PROJECT_ID secret
    echo "$PROJECT_ID" | gh secret set GCP_PROJECT_ID \
        --repo="$GITHUB_REPO"

    # Set GCP_SA_KEY secret
    gh secret set GCP_SA_KEY \
        --repo="$GITHUB_REPO" < "$KEY_FILE"

    echo "✅ GitHub secrets configured"

    # Clean up key file
    rm -f "$KEY_FILE"
    echo "✅ Temporary key file deleted"
else
    echo "⚠️  Manual GitHub secrets setup required:"
    echo ""
    echo "1. Go to: https://github.com/$GITHUB_REPO/settings/secrets/actions"
    echo "2. Add these secrets:"
    echo ""
    echo "   Name: GCP_PROJECT_ID"
    echo "   Value: $PROJECT_ID"
    echo ""
    echo "   Name: GCP_SA_KEY"
    echo "   Value: (paste contents of $KEY_FILE)"
    echo ""
    echo "To view the key:"
    echo "   cat $KEY_FILE"
    echo ""
    echo "After adding secrets, delete the key file:"
    echo "   rm $KEY_FILE"
fi

echo ""
echo "✅ GCP setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Push your code to GitHub:"
echo "   git push origin main"
echo ""
echo "2. GitHub Actions will automatically deploy to Cloud Run"
echo "3. Check deployment status at:"
echo "   https://github.com/$GITHUB_REPO/actions"
echo ""
