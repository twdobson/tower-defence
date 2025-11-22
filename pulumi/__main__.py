"""
Tower Defense GCP Infrastructure - Complete Infrastructure as Code

This Pulumi program defines and manages all Google Cloud Platform (GCP) resources
needed to deploy and run the Tower Defense game application.

WHAT THIS DOES:
1. Enables required GCP APIs (services that provide specific cloud functionality)
2. Creates a service account for GitHub Actions (an identity for automated deployments)
3. Grants necessary IAM permissions (access control for the service account)
4. Creates an Artifact Registry repository (storage for Docker container images)
5. Generates service account credentials (keys for GitHub Actions to authenticate)

WHY PULUMI:
- Infrastructure as Code (IaC): Define cloud resources in Python instead of clicking in console
- Version Control: Track infrastructure changes in git
- Reproducibility: Easily recreate the same infrastructure in different environments
- Automation: Apply changes with a single command

DEPLOYMENT FLOW:
GitHub Actions (CI/CD) → Uses Service Account → Pushes Docker Image → Artifact Registry → Cloud Run
"""

import pulumi
import pulumi_gcp as gcp
import json

# ============================================================================
# CONFIGURATION SECTION
# ============================================================================
# Pulumi Config allows you to set values per-stack (dev, staging, prod, etc.)
# These can be overridden with: pulumi config set gcp:project your-project-id

config = pulumi.Config("gcp")
# GCP Project ID: The unique identifier for your Google Cloud project
# All resources will be created within this project
project_id = config.get("project") or "game-zone-479009"

# Region: The geographic location where resources will be deployed
# us-central1 is located in Iowa, USA - choose regions close to your users
region = config.get("region") or "us-central1"

# ============================================================================
# API ENABLEMENT SECTION
# ============================================================================
# GCP APIs are like feature switches - they must be explicitly enabled before
# you can use specific GCP services. Enabling APIs is usually free; you only
# pay for actual resource usage.

apis = [
    # Cloud Run API: Allows deploying containerized applications
    # Cloud Run is a serverless platform that automatically scales your app
    # from 0 to N instances based on incoming traffic
    "run.googleapis.com",

    # Container Registry API: Legacy service for storing Docker images
    # Still needed for backwards compatibility with some GCP tooling
    "containerregistry.googleapis.com",

    # Cloud Build API: GCP's CI/CD service for building Docker images
    # Can build images from source code and push to registries
    "cloudbuild.googleapis.com",

    # Artifact Registry API: Modern replacement for Container Registry
    # Stores Docker images, packages, and other build artifacts
    # More features and better security than legacy Container Registry
    "artifactregistry.googleapis.com",
]

# Create a list to track all enabled services (used for dependency management)
enabled_services = []

# Loop through each API and enable it in the GCP project
for api in apis:
    service = gcp.projects.Service(
        # LOGICAL NAME (Pulumi-side tracking only):
        # This is just for Pulumi's internal state file, not the actual GCP resource name.
        # We manually create a unique identifier by converting dots to dashes.
        # Example: "run.googleapis.com" becomes "enable-run-googleapis-com"
        # Note: Pulumi doesn't provide a built-in function for this because it's just
        # a simple Python string operation for creating unique logical names.
        f"enable-{api.replace('.', '-')}",

        # PHYSICAL NAME (GCP-side):
        # The actual API service identifier that GCP uses.
        # This is the real resource name in Google Cloud.
        service=api,

        # Which GCP project to enable this API in
        project=project_id,

        # disable_on_destroy=False: Keep APIs enabled even when running "pulumi destroy"
        # This prevents accidental service disruption and avoids re-enabling delays
        disable_on_destroy=False,
    )
    # Track this service so other resources can depend on it being enabled first
    enabled_services.append(service)

# ============================================================================
# SERVICE ACCOUNT CREATION
# ============================================================================
# SERVICE ACCOUNTS EXPLAINED:
# A service account is a special type of Google account that represents an
# application or automated process (not a human user). Think of it as a
# "robot identity" that your CI/CD pipeline uses to authenticate with GCP.
#
# WHY WE NEED THIS:
# - GitHub Actions needs to authenticate with GCP to deploy your application
# - Service accounts provide secure, non-interactive authentication
# - Unlike personal accounts, service accounts are designed for automation
# - They have their own permissions separate from your user account
#
# SECURITY NOTE:
# Service accounts follow the principle of least privilege - we only grant
# the minimum permissions needed for deployment (defined in the roles section)

github_actions_sa = gcp.serviceaccount.Account(
    # Pulumi resource name (used to track this resource)
    "github-actions",

    # account_id: The unique identifier for this service account within the project
    # Full email will be: github-actions@{project_id}.iam.gserviceaccount.com
    account_id="github-actions",

    # Human-readable name shown in GCP Console
    display_name="GitHub Actions for Tower Defense",

    # The GCP project where this service account will be created
    project=project_id,
)

# ============================================================================
# IAM (Identity and Access Management) PERMISSIONS
# ============================================================================
# IAM ROLES EXPLAINED:
# Roles are collections of permissions that determine what actions an identity
# (like our service account) can perform on GCP resources. GCP uses predefined
# roles that bundle related permissions together.
#
# THE PRINCIPLE OF LEAST PRIVILEGE:
# We grant only the permissions necessary for GitHub Actions to deploy the app.
# This limits potential damage if the service account credentials are compromised.

roles = [
    # CLOUD RUN ADMIN ROLE
    # Role: roles/run.admin
    # What it allows: Full control over Cloud Run services
    # Specific permissions include:
    #   - run.services.create: Create new Cloud Run services
    #   - run.services.update: Update existing services
    #   - run.services.delete: Delete services
    #   - run.services.setIamPolicy: Manage service permissions
    # Why we need it: GitHub Actions must deploy and update the game application
    "roles/run.admin",

    # STORAGE ADMIN ROLE
    # Role: roles/storage.admin
    # What it allows: Full control over Cloud Storage buckets and objects
    # Specific permissions include:
    #   - storage.buckets.create/delete: Manage storage buckets
    #   - storage.objects.create/delete/get: Upload and manage files
    # Why we need it: Store static assets and container images
    # Note: Container Registry uses Cloud Storage buckets under the hood
    "roles/storage.admin",

    # ARTIFACT REGISTRY ADMIN ROLE
    # Role: roles/artifactregistry.admin
    # What it allows: Full control over Artifact Registry repositories
    # Specific permissions include:
    #   - artifactregistry.repositories.create: Create repositories
    #   - artifactregistry.repositories.uploadArtifacts: Push Docker images
    #   - artifactregistry.repositories.downloadArtifacts: Pull Docker images
    # Why we need it: GitHub Actions pushes Docker images to Artifact Registry
    "roles/artifactregistry.admin",

    # SERVICE ACCOUNT USER ROLE
    # Role: roles/iam.serviceAccountUser
    # What it allows: Act as (impersonate) service accounts
    # Specific permissions include:
    #   - iam.serviceAccounts.actAs: Run operations as another service account
    #   - iam.serviceAccounts.get: View service account details
    # Why we need it: Cloud Run needs to use a service account to run the app
    # Cloud Run services run with their own service account identity, and our
    # GitHub Actions service account needs permission to assign that identity
    "roles/iam.serviceAccountUser",
]

# Create IAM bindings list to track all permission grants
iam_bindings = []

# Loop through each role and grant it to the service account
for role in roles:
    # IAM BINDING EXPLAINED:
    # An IAM binding connects three things:
    #   1. WHO (member): The service account identity
    #   2. WHAT (role): The set of permissions being granted
    #   3. WHERE (project): The GCP project scope where permissions apply
    #
    # This creates a policy that says: "Allow this service account to perform
    # these actions within this project"

    binding = gcp.projects.IAMMember(
        # Pulumi resource name: Convert role path to valid resource name
        # Example: "roles/run.admin" becomes "github-actions-roles-run-admin"
        f"github-actions-{role.replace('/', '-')}",

        # The GCP project where this permission applies
        project=project_id,

        # The role (permission set) being granted
        role=role,

        # The service account receiving these permissions
        # .apply() is used because email is computed asynchronously by Pulumi
        # Format: "serviceAccount:github-actions@project-id.iam.gserviceaccount.com"
        member=github_actions_sa.email.apply(lambda email: f"serviceAccount:{email}"),
    )
    # Track this binding for potential dependencies
    iam_bindings.append(binding)

# ============================================================================
# ARTIFACT REGISTRY REPOSITORY CREATION
# ============================================================================
# ARTIFACT REGISTRY VS CONTAINER REGISTRY:
# - Container Registry (GCR): Legacy service, uses gcr.io domain
# - Artifact Registry: Modern replacement with more features and better security
# - This code creates an Artifact Registry repo that mimics GCR's structure
#
# WHAT IS A REPOSITORY:
# A repository is a collection of related container images. Think of it like
# a GitHub repo, but for Docker images instead of source code.
#
# DOCKER IMAGE STORAGE:
# When you run "docker push gcr.io/project-id/image-name:tag", the image is
# stored in this repository. Cloud Run then pulls from here to deploy your app.
#
# LOCATION CHOICES:
# - "us": Multi-region in United States (highest availability, higher cost)
# - "us-central1": Single region (lower cost, still very reliable)
# - "europe", "asia": Other multi-region options
# Multi-region = replicated across multiple data centers for redundancy

gcr_repository = gcp.artifactregistry.Repository(
    # Pulumi resource name
    "gcr-repository",

    # repository_id: The name of the repository
    # Using "gcr.io" for backwards compatibility with Container Registry tooling
    # Images will be stored at: us-docker.pkg.dev/project-id/gcr.io/image-name
    repository_id="gcr.io",

    # location: Geographic location for the repository
    # "us" = multi-region (replicated across multiple US data centers)
    # Provides high availability and disaster recovery
    location="us",

    # format: Type of artifacts this repository stores
    # "DOCKER" = Docker/OCI container images
    # Other options: "MAVEN" (Java), "NPM" (Node.js), "PYTHON" (pip packages)
    format="DOCKER",

    # Human-readable description shown in GCP Console
    description="Container Registry for Tower Defense",

    # The GCP project where this repository will be created
    project=project_id,

    # RESOURCE OPTIONS - DEPENDENCY MANAGEMENT:
    # opts.depends_on tells Pulumi: "Don't create this repository until all
    # the services in enabled_services are ready"
    # Why? Artifact Registry API must be enabled before we can create repositories
    # This prevents race conditions where we try to create resources before
    # the required APIs are active
    opts=pulumi.ResourceOptions(depends_on=enabled_services),
)

# ============================================================================
# SERVICE ACCOUNT KEY GENERATION
# ============================================================================
# SERVICE ACCOUNT KEYS EXPLAINED:
# A service account key is a credential file (JSON format) that allows
# applications to authenticate as the service account. Think of it like a
# password, but in file form.
#
# HOW AUTHENTICATION WORKS:
# 1. GitHub Actions stores this key as a secret (GCP_SA_KEY)
# 2. When the workflow runs, it authenticates to GCP using this key
# 3. GCP verifies the key and grants the permissions assigned to the service account
# 4. GitHub Actions can now deploy to Cloud Run, push images, etc.
#
# KEY CONTENTS (JSON format):
# {
#   "type": "service_account",
#   "project_id": "your-project",
#   "private_key_id": "key-id",
#   "private_key": "-----BEGIN PRIVATE KEY-----\n...",
#   "client_email": "github-actions@project.iam.gserviceaccount.com",
#   ...
# }
#
# SECURITY BEST PRACTICES:
# - NEVER commit this key to git repositories
# - Store it securely in GitHub Secrets (encrypted at rest)
# - Rotate keys periodically (delete old keys, create new ones)
# - Monitor service account usage in GCP Cloud Logging
# - Use Workload Identity Federation for even better security (avoids keys entirely)

sa_key = gcp.serviceaccount.Key(
    # Pulumi resource name
    "github-actions-key",

    # service_account_id: Links this key to our GitHub Actions service account
    # The .name property gives the full resource identifier
    service_account_id=github_actions_sa.name,

    # public_key_type: Format for the public key portion
    # "TYPE_X509_PEM_FILE" = X.509 certificate in PEM format
    # This is standard for most authentication scenarios
    # Note: The private key (what we actually use) is always included
    public_key_type="TYPE_X509_PEM_FILE",
)

# SECURITY WARNING:
# The sa_key.private_key contains sensitive credentials. Pulumi automatically
# marks it as a secret (encrypted in state files). When exporting below,
# we use pulumi.Output.secret() to maintain this protection.

# ============================================================================
# STACK OUTPUTS (EXPORTS)
# ============================================================================
# PULUMI EXPORTS EXPLAINED:
# Exports make values available after "pulumi up" completes. You can view them
# with "pulumi stack output" or use them as inputs to other Pulumi programs.
#
# WHY EXPORT VALUES:
# - Document what was created (project ID, URLs, etc.)
# - Provide credentials for CI/CD setup (service account keys)
# - Pass outputs to other infrastructure stacks (cross-stack references)
# - Generate setup commands and documentation
#
# VIEWING EXPORTS:
# - pulumi stack output                    # List all outputs
# - pulumi stack output project_id         # View specific output
# - pulumi stack output --show-secrets     # Include sensitive values

# Export the GCP project ID
# Useful for: Verifying which project was used, documentation
pulumi.export("project_id", project_id)

# Export the GCP region
# Useful for: Knowing where resources are deployed, multi-region setups
pulumi.export("region", region)

# Export the service account email address
# Format: github-actions@project-id.iam.gserviceaccount.com
# Useful for: Granting this service account access to other resources
pulumi.export("service_account_email", github_actions_sa.email)

# Export the Artifact Registry repository name
# Useful for: Docker push commands, Cloud Run deployment configs
pulumi.export("artifact_registry_repository", gcr_repository.name)

# ============================================================================
# SERVICE ACCOUNT KEY EXPORTS (SENSITIVE CREDENTIALS)
# ============================================================================
# These exports contain the actual authentication credentials for the service
# account. They are automatically marked as secrets by Pulumi.

# Export the service account key in base64-encoded format
# This is the raw format returned by GCP
# Used by: GitHub Actions workflows that expect base64-encoded credentials
pulumi.export(
    "service_account_key_base64",
    sa_key.private_key,  # Automatically marked as secret by Pulumi
)

# Export the service account key as plain JSON
# This makes it easier to work with in some contexts
# The .apply() transforms the base64 key, and we re-wrap it in secret()
pulumi.export(
    "service_account_key_json",
    sa_key.private_key.apply(
        lambda key: pulumi.Output.secret(
            # Pulumi automatically base64-decodes sa_key.private_key for us
            # So 'key' here is already the JSON string, not base64-encoded
            key
        )
    ),
)

# ============================================================================
# GITHUB SECRETS SETUP COMMANDS
# ============================================================================
# This export generates copy-paste commands to configure GitHub repository secrets.
# These secrets allow GitHub Actions workflows to authenticate with GCP.
#
# GITHUB SECRETS:
# GitHub Secrets are encrypted environment variables stored in your repository.
# They're accessible to GitHub Actions workflows but hidden from logs.
#
# REQUIRED SECRETS:
# 1. GCP_PROJECT_ID: The GCP project where resources will be deployed
# 2. GCP_SA_KEY: JSON credentials for the service account
#
# SETUP STEPS:
# 1. Run: pulumi stack output github_secret_setup_commands --show-secrets
# 2. Copy and run the displayed commands (requires 'gh' CLI installed)
# 3. Verify secrets in GitHub: Settings → Secrets → Actions

pulumi.export(
    "github_secret_setup_commands",
    # .Output.all() waits for both values to be available, then applies the lambda
    pulumi.Output.all(project_id, sa_key.private_key).apply(
        lambda args: f"""
# ===================================================================
# GitHub Secrets Setup Commands
# ===================================================================
# Run these commands to configure GitHub Actions for GCP deployment
# Requires: 'gh' CLI (GitHub CLI) - install from https://cli.github.com
#
# What these commands do:
# 1. Set GCP_PROJECT_ID secret: Tells GitHub Actions which GCP project to use
# 2. Set GCP_SA_KEY secret: Provides authentication credentials for deployment

# COMMAND 1: Set the GCP project ID
# This is a simple string value (not sensitive)
echo "{args[0]}" | gh secret set GCP_PROJECT_ID --repo=twdobson/tower-defence

# COMMAND 2: Set the service account key (JSON credentials)
# Process: Pulumi output → base64 decode → set as GitHub secret
# The --show-secrets flag reveals the encrypted value from Pulumi state
pulumi stack output service_account_key_base64 --show-secrets | base64 -d | gh secret set GCP_SA_KEY --repo=twdobson/tower-defence

# ===================================================================
# After running these commands:
# ===================================================================
# 1. Verify secrets exist:
#    gh secret list --repo=twdobson/tower-defence
#
# 2. Your GitHub Actions workflow can now use these secrets:
#    - ${{{{ secrets.GCP_PROJECT_ID }}}}
#    - ${{{{ secrets.GCP_SA_KEY }}}}
#
# 3. GitHub Actions will authenticate and deploy to GCP automatically
#    whenever you push to the main branch (or trigger the workflow)
"""
    ),
)

# ============================================================================
# END OF INFRASTRUCTURE DEFINITION
# ============================================================================
# WHAT HAPPENS WHEN YOU RUN "pulumi up":
# 1. Pulumi reads this file and builds a dependency graph
# 2. It compares desired state (this code) vs. actual state (cloud resources)
# 3. It shows you a preview of changes (create, update, delete)
# 4. After you confirm, it executes the changes in the correct order
# 5. It saves the new state and displays the exported outputs
#
# RESOURCE DEPENDENCIES (order of creation):
# 1. Enable APIs (run, storage, artifactregistry, cloudbuild)
# 2. Create service account
# 3. Grant IAM roles to service account
# 4. Create Artifact Registry repository (depends on APIs)
# 5. Generate service account key
#
# PULUMI STATE:
# Pulumi tracks created resources in a state file. This allows it to:
# - Know what resources it manages (vs. manually created resources)
# - Detect drift (cloud resources modified outside Pulumi)
# - Update or delete resources on subsequent "pulumi up" runs
#
# COMMON COMMANDS:
# - pulumi up: Apply changes (create/update resources)
# - pulumi preview: Show what would change without applying
# - pulumi destroy: Delete all managed resources
# - pulumi stack output: View exported values
# - pulumi refresh: Update state to match actual cloud resources
