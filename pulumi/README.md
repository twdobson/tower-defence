# Pulumi Infrastructure Setup

This directory contains the Infrastructure as Code (IaC) for the Tower Defense game deployment on GCP using Pulumi.

## What This Creates

- ✅ Service account for GitHub Actions
- ✅ IAM permissions (Cloud Run, Storage, Artifact Registry)
- ✅ Artifact Registry repository for Docker images
- ✅ Service account key for GitHub authentication
- ✅ Enabled GCP APIs

## Prerequisites

1. **Pulumi CLI**: Install from [pulumi.com](https://www.pulumi.com/docs/get-started/install/)
   ```bash
   # macOS
   brew install pulumi

   # Or use the install script
   curl -fsSL https://get.pulumi.com | sh
   ```

2. **Python 3.9+**: Required for the Pulumi program

3. **GCP CLI**: Already installed (gcloud)

4. **GitHub CLI**: For setting secrets (optional)
   ```bash
   brew install gh
   gh auth login
   ```

## Quick Start

### 1. Initialize Pulumi

```bash
cd pulumi

# Create a Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Login to Pulumi (choose local or cloud backend)
pulumi login --local  # For local state storage
# OR
pulumi login  # For Pulumi Cloud (free tier available)
```

### 2. Initialize Stack

```bash
# Create a new stack (like an environment)
pulumi stack init dev

# Set GCP project (if different from default)
pulumi config set gcp:project game-zone-479009
```

### 3. Authenticate with GCP

```bash
# Authenticate with your GCP account
gcloud auth application-default login
```

### 4. Preview Changes

```bash
# See what will be created
pulumi preview
```

### 5. Deploy Infrastructure

```bash
# Create all resources
pulumi up

# Pulumi will show you:
# - What resources will be created
# - Prompt for confirmation
# - Create all resources
# - Show outputs
```

### 6. Set GitHub Secrets

After deployment, get the outputs:

```bash
# View all outputs
pulumi stack output

# Get the service account key
pulumi stack output service_account_key_base64 --show-secrets | base64 -d > /tmp/gcp-key.json

# Set GitHub secrets using gh CLI
echo "game-zone-479009" | gh secret set GCP_PROJECT_ID --repo=twdobson/tower-defence
gh secret set GCP_SA_KEY --repo=twdobson/tower-defence < /tmp/gcp-key.json

# Clean up the key file
rm /tmp/gcp-key.json
```

Or use the automated script:

```bash
./setup-github-secrets.sh
```

## Useful Commands

### View Current State

```bash
# List all stacks
pulumi stack ls

# Show current stack outputs
pulumi stack output

# Show full state
pulumi stack export
```

### Update Infrastructure

```bash
# Preview changes
pulumi preview

# Apply changes
pulumi up

# Apply without confirmation
pulumi up --yes
```

### Destroy Infrastructure

```bash
# Preview what will be destroyed
pulumi destroy --preview

# Destroy all resources
pulumi destroy
```

### Refresh State

```bash
# Sync Pulumi state with actual GCP resources
pulumi refresh
```

## Outputs

After `pulumi up`, you can access:

```bash
# Project ID
pulumi stack output project_id

# Service account email
pulumi stack output service_account_email

# Service account key (sensitive)
pulumi stack output service_account_key_base64 --show-secrets

# GitHub setup commands
pulumi stack output github_secret_setup_commands
```

## State Management

### Local State (Default)

State is stored locally in `.pulumi/` directory.

**Pros:**
- No external dependencies
- Complete control

**Cons:**
- Not shared with team
- Manual backup needed

### Cloud State (Recommended for Teams)

State is stored in Pulumi Cloud.

```bash
pulumi login
```

**Pros:**
- Automatic state locking
- State history
- Team collaboration
- Free tier available

## Comparison with Shell Scripts

### Before (Shell Scripts):
```bash
./setup-gcp.sh  # Imperative, run commands
```

### After (Pulumi):
```bash
pulumi up  # Declarative, describe desired state
```

### Advantages:

| Feature | Shell Script | Pulumi |
|---------|-------------|--------|
| Language | Bash | Python |
| State Management | ❌ | ✅ |
| Preview Changes | ❌ | ✅ (`pulumi preview`) |
| Dependency Management | Manual | ✅ Automatic |
| Idempotency | Manual checks | ✅ Built-in |
| Type Safety | ❌ | ✅ |
| IDE Support | Limited | ✅ Full autocomplete |
| Testing | Difficult | ✅ Unit tests possible |
| Rollback | Manual | ✅ `pulumi up --refresh` |

## Troubleshooting

### "No credentials found"

```bash
gcloud auth application-default login
```

### "Project not found"

```bash
pulumi config set gcp:project game-zone-479009
```

### "Permission denied"

Ensure your GCP user has project owner or equivalent permissions.

### Reset Everything

```bash
pulumi destroy --yes
pulumi stack rm dev --yes
```

## Next Steps

1. Keep shell scripts for reference
2. Use Pulumi for infrastructure changes
3. Consider adding automated testing
4. Set up CI/CD for infrastructure changes

## Resources

- [Pulumi GCP Documentation](https://www.pulumi.com/docs/clouds/gcp/)
- [Pulumi Python API](https://www.pulumi.com/docs/languages-sdks/python/)
- [GCP Provider Reference](https://www.pulumi.com/registry/packages/gcp/)
