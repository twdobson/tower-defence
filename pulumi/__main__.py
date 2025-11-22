"""
Tower Defense GCP Infrastructure
Manages service accounts, IAM permissions, and Artifact Registry for Cloud Run deployment.
"""

import pulumi
import pulumi_gcp as gcp
import json

# Configuration
config = pulumi.Config("gcp")
project_id = config.get("project") or "game-zone-479009"
region = config.get("region") or "us-central1"

# Enable required APIs
apis = [
    "run.googleapis.com",
    "containerregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
]

enabled_services = []
for api in apis:
    service = gcp.projects.Service(
        f"enable-{api.replace('.', '-')}",
        service=api,
        project=project_id,
        disable_on_destroy=False,
    )
    enabled_services.append(service)

# Create service account for GitHub Actions
github_actions_sa = gcp.serviceaccount.Account(
    "github-actions",
    account_id="github-actions",
    display_name="GitHub Actions for Tower Defense",
    project=project_id,
)

# Grant IAM roles to the service account
roles = [
    "roles/run.admin",
    "roles/storage.admin",
    "roles/artifactregistry.admin",
    "roles/iam.serviceAccountUser",
]

iam_bindings = []
for role in roles:
    binding = gcp.projects.IAMMember(
        f"github-actions-{role.replace('/', '-')}",
        project=project_id,
        role=role,
        member=github_actions_sa.email.apply(lambda email: f"serviceAccount:{email}"),
    )
    iam_bindings.append(binding)

# Create Artifact Registry repository for GCR
gcr_repository = gcp.artifactregistry.Repository(
    "gcr-repository",
    repository_id="gcr.io",
    location="us",
    format="DOCKER",
    description="Container Registry for Tower Defense",
    project=project_id,
    opts=pulumi.ResourceOptions(depends_on=enabled_services),
)

# Create service account key for GitHub Actions
sa_key = gcp.serviceaccount.Key(
    "github-actions-key",
    service_account_id=github_actions_sa.name,
    public_key_type="TYPE_X509_PEM_FILE",
)

# Export outputs
pulumi.export("project_id", project_id)
pulumi.export("region", region)
pulumi.export("service_account_email", github_actions_sa.email)
pulumi.export("artifact_registry_repository", gcr_repository.name)

# Export the service account key (base64 encoded JSON)
pulumi.export(
    "service_account_key_base64",
    sa_key.private_key,
)

# Export decoded key for easier GitHub secrets setup
pulumi.export(
    "service_account_key_json",
    sa_key.private_key.apply(
        lambda key: pulumi.Output.secret(
            key  # This is already the JSON, base64 decoded by Pulumi
        )
    ),
)

# Export helpful commands
pulumi.export(
    "github_secret_setup_commands",
    pulumi.Output.all(project_id, sa_key.private_key).apply(
        lambda args: f"""
# Set GitHub secrets using these commands:

# 1. Set GCP_PROJECT_ID:
echo "{args[0]}" | gh secret set GCP_PROJECT_ID --repo=twdobson/tower-defence

# 2. Set GCP_SA_KEY (decode the base64 key first):
pulumi stack output service_account_key_base64 --show-secrets | base64 -d | gh secret set GCP_SA_KEY --repo=twdobson/tower-defence
"""
    ),
)
