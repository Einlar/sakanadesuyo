# GitHub Actions Setup

This repository is configured with a GitHub Actions workflow that automatically runs End-to-End (E2E) tests and deploys the application to CapRover upon a successful push to the `main` branch.

## Workflow Overview

The workflow is defined in `.github/workflows/ci-cd.yml` and consists of two jobs:

1.  **Test**: Runs the Playwright E2E tests. This job requires the `OPENROUTER_API_KEY` to function correctly.
2.  **Deploy**: If the tests pass, this job deploys the application to your CapRover instance using the CapRover CLI.

## Configuration

To enable this workflow, you must configure the following secrets in your GitHub repository.

### setting up Secrets

1.  Go to your GitHub repository.
2.  Navigate to **Settings** > **Secrets and variables** > **Actions**.
3.  Click on **New repository secret**.
4.  Add the following secrets:

| Secret Name | Description | Example Value |
| :--- | :--- | :--- |
| `OPENROUTER_API_KEY` | Your OpenRouter API Key for the AI features. | `sk-or-v1-...` |
| `CAPROVER_SERVER_URL` | The URL of your CapRover server (dashboard). | `https://captain.your-domain.com` |
| `CAPROVER_APP_PASSWORD` | The password for your CapRover server. | `your-secure-password` |
| `CAPROVER_APP_NAME` | The name of your app in CapRover. | `sakanadesuyo` |

### Manual Trigger

You can also manually trigger the workflow from the **Actions** tab in GitHub:
1.  Go to **Actions**.
2.  Select the **CI/CD** workflow.
3.  Click **Run workflow**.
