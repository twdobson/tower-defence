#!/bin/bash

# Tower Defense Game - GCP Setup Script
# This script sets up the necessary GCP resources for Cloud Run deployment

set -e  # Exit on error

PROJECT_ID="game-zone-479009"
SERVICE_ACCOUNT_NAME="github-actions"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "🎮 Setting up GCP for Tower Defense Game"
echo "Project ID: $PROJECT_ID"
echo ""

# Set the project
echo "📌 Setting GCP project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo ""
echo "🔧 Enabling required APIs..."
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com

# Check if service account already exists
echo ""
echo "👤 Checking for existing service account..."
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL &>/dev/null; then
    echo "⚠️  Service account already exists: $SERVICE_ACCOUNT_EMAIL"
    read -p "Do you want to continue and create a new key? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting..."
        exit 1
    fi
else
    echo "📝 Creating service account..."
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --display-name="GitHub Actions for Tower Defense"
fi

# Grant necessary permissions
echo ""
echo "🔐 Granting IAM permissions..."

echo "  - Cloud Run Admin"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/run.admin" \
    --quiet

echo "  - Storage Admin"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/storage.admin" \
    --quiet

echo "  - Service Account User"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/iam.serviceAccountUser" \
    --quiet

# Create and download service account key
echo ""
echo "🔑 Creating service account key..."
KEY_FILE="gcp-key.json"

if [ -f "$KEY_FILE" ]; then
    echo "⚠️  Key file already exists: $KEY_FILE"
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm "$KEY_FILE"
    else
        KEY_FILE="gcp-key-$(date +%s).json"
        echo "Creating new key file: $KEY_FILE"
    fi
fi

gcloud iam service-accounts keys create $KEY_FILE \
    --iam-account=$SERVICE_ACCOUNT_EMAIL

echo ""
echo "✅ GCP setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to your GitHub repository: https://github.com/twdobson/tower-defence"
echo "2. Navigate to Settings → Secrets and variables → Actions"
echo "3. Add these secrets:"
echo ""
echo "   Name: GCP_PROJECT_ID"
echo "   Value: $PROJECT_ID"
echo ""
echo "   Name: GCP_SA_KEY"
echo "   Value: <paste the entire contents of $KEY_FILE>"
echo ""
echo "To view the key file contents, run:"
echo "   cat $KEY_FILE"
echo ""
echo "⚠️  IMPORTANT: Delete the key file after adding it to GitHub:"
echo "   rm $KEY_FILE"
echo ""
