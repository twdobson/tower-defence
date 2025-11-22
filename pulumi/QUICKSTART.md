# Pulumi Quick Start

Get your infrastructure running in 5 minutes.

## 1. Install Pulumi

```bash
# macOS
brew install pulumi

# Verify installation
pulumi version
```

## 2. Setup Python Environment

```bash
cd pulumi

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## 3. Login to Pulumi

Choose one:

**Option A: Local State (Simple)**
```bash
pulumi login --local
```

**Option B: Pulumi Cloud (Recommended)**
```bash
pulumi login  # Follow prompts, free tier available
```

## 4. Initialize Stack

```bash
# Create your first stack
pulumi stack init dev

# Verify configuration (should show game-zone-479009)
pulumi config
```

## 5. Authenticate with GCP

```bash
gcloud auth application-default login
```

## 6. Deploy!

```bash
# See what will be created
pulumi preview

# Create all resources
pulumi up
# Type "yes" when prompted
```

This creates:
- ✅ Service account
- ✅ IAM permissions
- ✅ Artifact Registry repository
- ✅ Service account key

## 7. Setup GitHub Secrets

```bash
# Automated way
./setup-github-secrets.sh

# Manual way
pulumi stack output service_account_key_base64 --show-secrets | base64 -d > /tmp/key.json
echo "game-zone-479009" | gh secret set GCP_PROJECT_ID --repo=twdobson/tower-defence
gh secret set GCP_SA_KEY --repo=twdobson/tower-defence < /tmp/key.json
rm /tmp/key.json
```

## Done! 🎉

Your infrastructure is now managed by Pulumi. Push to GitHub and your game will auto-deploy!

## Useful Commands

```bash
# View outputs
pulumi stack output

# See current state
pulumi stack

# Update infrastructure
pulumi up

# Destroy everything
pulumi destroy

# Get help
pulumi --help
```

## Troubleshooting

**"No credentials"**
```bash
gcloud auth application-default login
```

**"Stack not found"**
```bash
pulumi stack init dev
```

**Need to start over?**
```bash
pulumi destroy --yes
pulumi stack rm dev --yes
```
