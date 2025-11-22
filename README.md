# Tower Defense Game

A feature-rich tower defense game built with HTML5 Canvas, Node.js, and Express. Deploy to Google Cloud Run with GitHub Actions.

## Features

- 9 unique tower types with special abilities (basic, rapid, sniper, poison, splash, anti-air, freeze, electric, laser)
- 6 enemy types with different behaviors (basic, fast, tank, healer, flying, boss)
- Tower upgrade system (up to level 5)
- Three difficulty levels (Easy, Normal, Hard)
- Auto-starting waves with countdown timer
- Pause and speed controls (1x, 2x, 3x)
- Keyboard shortcuts for quick tower placement
- Wave preview system
- Persistent leaderboard
- Visual effects and animations

## Local Development

### Prerequisites

- Node.js 20 or higher
- npm

### Installation

```bash
npm install
```

### Running Locally

```bash
npm start
```

The game will be available at `http://localhost:3000`

## Deployment

This project is configured for automated deployment to Google Cloud Run using GitHub Actions.

### Prerequisites

1. Google Cloud Platform account
2. GitHub repository
3. GCP project with Cloud Run API enabled

### Setup Instructions

1. **Create GCP Service Account**:
   ```bash
   gcloud iam service-accounts create github-actions \
     --display-name="GitHub Actions"

   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/run.admin"

   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/storage.admin"

   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/iam.serviceAccountUser"
   ```

2. **Create and Download Service Account Key**:
   ```bash
   gcloud iam service-accounts keys create key.json \
     --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

3. **Configure GitHub Secrets**:
   - Go to your GitHub repository settings
   - Navigate to Secrets and Variables > Actions
   - Add the following secrets:
     - `GCP_PROJECT_ID`: Your GCP project ID
     - `GCP_SA_KEY`: Contents of the key.json file

4. **Push to GitHub**:
   ```bash
   git push origin main
   ```

The GitHub Actions workflow will automatically build and deploy to Cloud Run on every push to the main branch.

## Game Controls

### Mouse
- Click to place towers
- Click on towers to view info and upgrade/sell

### Keyboard
- `1-9`: Select tower types
- `Space` or `P`: Pause/unpause
- `Enter`: Start wave (or start wave now during countdown)
- `Escape`: Cancel tower placement

## Technology Stack

- **Frontend**: HTML5 Canvas, Vanilla JavaScript
- **Backend**: Node.js, Express
- **Database**: JSON file storage
- **Deployment**: Docker, Google Cloud Run
- **CI/CD**: GitHub Actions
