#!/bin/bash

# Tower Defense Game - GCP Teardown Script
# This script removes all GCP resources created for the project

set -e  # Exit on error

PROJECT_ID="game-zone-479009"
SERVICE_ACCOUNT_NAME="github-actions"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SERVICE_NAME="tower-defence"
REGION="us-central1"

echo "🧹 Tearing down GCP resources for Tower Defense Game"
echo "Project ID: $PROJECT_ID"
echo ""
echo "⚠️  WARNING: This will delete the following resources:"
echo "  - Cloud Run service: $SERVICE_NAME"
echo "  - Service account: $SERVICE_ACCOUNT_EMAIL"
echo "  - Container images in GCR"
echo ""
read -p "Are you sure you want to continue? (yes/no) " -r
echo

if [[ ! $REPLY == "yes" ]]; then
    echo "Aborted."
    exit 1
fi

# Set the project
gcloud config set project $PROJECT_ID

# Delete Cloud Run service
echo ""
echo "🗑️  Deleting Cloud Run service..."
if gcloud run services describe $SERVICE_NAME --region=$REGION &>/dev/null; then
    gcloud run services delete $SERVICE_NAME \
        --region=$REGION \
        --quiet
    echo "✅ Cloud Run service deleted"
else
    echo "ℹ️  Cloud Run service not found"
fi

# Delete Artifact Registry repository
echo ""
echo "🗑️  Deleting Artifact Registry repository..."
if gcloud artifacts repositories describe gcr.io --location=us &>/dev/null; then
    gcloud artifacts repositories delete gcr.io \
        --location=us \
        --quiet 2>/dev/null || true
    echo "✅ Artifact Registry repository deleted"
else
    echo "ℹ️  Artifact Registry repository not found"
fi

# Remove IAM policy bindings
echo ""
echo "🗑️  Removing IAM policy bindings..."
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL &>/dev/null; then
    gcloud projects remove-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="roles/run.admin" \
        --quiet >/dev/null 2>&1 || true

    gcloud projects remove-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="roles/storage.admin" \
        --quiet >/dev/null 2>&1 || true

    gcloud projects remove-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="roles/artifactregistry.admin" \
        --quiet >/dev/null 2>&1 || true

    gcloud projects remove-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="roles/iam.serviceAccountUser" \
        --quiet >/dev/null 2>&1 || true

    echo "✅ IAM policy bindings removed"
fi

# Delete service account
echo ""
echo "🗑️  Deleting service account..."
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL &>/dev/null; then
    gcloud iam service-accounts delete $SERVICE_ACCOUNT_EMAIL --quiet
    echo "✅ Service account deleted"
else
    echo "ℹ️  Service account not found"
fi

# Clean up any local key files
echo ""
echo "🗑️  Cleaning up local key files..."
rm -f gcp-key*.json .gcp-key*.json key.json
echo "✅ Local key files cleaned up"

echo ""
echo "✅ Teardown complete!"
echo ""
echo "Note: APIs remain enabled. To disable them, run:"
echo "  gcloud services disable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com"
echo ""
