#!/bin/bash

# Setup GitHub Secrets from Pulumi Outputs
# This script extracts the service account key from Pulumi and sets GitHub secrets

set -e

GITHUB_REPO="twdobson/tower-defence"

echo "🔐 Setting up GitHub Secrets from Pulumi outputs"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) not found. Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &>/dev/null; then
    echo "❌ GitHub CLI not authenticated. Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is authenticated"
echo ""

# Check if pulumi is available
if ! command -v pulumi &> /dev/null; then
    echo "❌ Pulumi CLI not found. Install it from: https://www.pulumi.com/docs/install/"
    exit 1
fi

echo "✅ Pulumi CLI found"
echo ""

# Get project ID
echo "📌 Getting project ID..."
PROJECT_ID=$(pulumi stack output project_id 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Could not get project_id from Pulumi. Have you run 'pulumi up'?"
    exit 1
fi

echo "   Project ID: $PROJECT_ID"

# Get service account key
echo ""
echo "🔑 Getting service account key..."
KEY_FILE="/tmp/gcp-key-$$.json"

# Export the key to a temporary file
pulumi stack output service_account_key_base64 --show-secrets | base64 -d > "$KEY_FILE"

if [ ! -f "$KEY_FILE" ] || [ ! -s "$KEY_FILE" ]; then
    echo "❌ Failed to get service account key from Pulumi"
    rm -f "$KEY_FILE"
    exit 1
fi

echo "✅ Service account key retrieved"

# Set GitHub secrets
echo ""
echo "🔧 Setting GitHub secrets..."

# Set GCP_PROJECT_ID
echo "$PROJECT_ID" | gh secret set GCP_PROJECT_ID --repo="$GITHUB_REPO"
echo "   ✅ GCP_PROJECT_ID set"

# Set GCP_SA_KEY
gh secret set GCP_SA_KEY --repo="$GITHUB_REPO" < "$KEY_FILE"
echo "   ✅ GCP_SA_KEY set"

# Clean up
rm -f "$KEY_FILE"
echo ""
echo "✅ GitHub secrets configured successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Push your code to GitHub:"
echo "      git push origin main"
echo ""
echo "   2. GitHub Actions will automatically deploy to Cloud Run"
echo ""
