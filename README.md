# LaunchDarkly Feature Flags Ready For Removal Action

[![GitHub Super-Linter](https://github.com/rkhaslarov/launchdarkly-outdated-feature-flags-reporter-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/rkhaslarov/launchdarkly-outdated-feature-flags-reporter-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/rkhaslarov/launchdarkly-outdated-feature-flags-reporter-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/rkhaslarov/launchdarkly-outdated-feature-flags-reporter-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/rkhaslarov/launchdarkly-outdated-feature-flags-reporter-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/rkhaslarov/launchdarkly-outdated-feature-flags-reporter-action/actions/workflows/codeql-analysis.yml)

## Overview

This GitHub Action automates the process of identifying feature flags that
are ready for removal based on specified criteria.
It generates a report of such feature flags, which can be sent
to designated channels such as Slack or a custom API endpoint.

## Usage

### Parameters

**Required:**

- `access-token`: Access token for authentication with LaunchDarkly
- `project-key`: Project key for accessing the LaunchDarkly project
- `environment-key`: Environment key for the LaunchDarkly environment
- `rules-config`: Rules configuration in YAML format (see below)

**Optional:**

- `maintainer-teams`: Comma-separated list of teams responsible for
  maintaining feature flags
- `report-type`: Report type - `slack`, `api`, or `default`
  (default: `default`)
- `webhook-url`: Webhook URL for sending reports (required for `slack` and
  `api` report types)
- `webhook-token`: Authentication token for webhook (sent as Bearer token for
  `api` report type)

### Rules Configuration

The `rules-config` parameter accepts YAML format with the following rules:

**Filter Rules** (must pass ALL enabled filter rules):

- `min-age`: Filters out flags created within the specified number of days
  - `days`: Number of days (default: 30)
- `exclude-tags`: Filters out flags with specified tags
  - `tags`: Array of tag strings to exclude
- `temporary-only`: Filters out permanent flags (only includes temporary flags)
- `boolean-only`: Filters out multivariate flags (only includes boolean flags)

**Detection Rules** (must pass at least ONE enabled detection rule):

- `unused`: Flags feature flags with no code references
- `default-only`: Flags feature flags with only default variation

**Default Configuration:**

```yaml
min-age:
  days: 30
exclude-tags:
  tags: []
temporary-only: true
boolean-only: true
unused: true
default-only: true
```

### Trigger

This action can be triggered on a schedule or manually.

- **Schedule:** It runs on a weekly schedule every Friday at 11:00 AM UTC.
- **Manual:** You can also trigger the action manually through
  GitHub's workflow dispatch feature.

## Example Workflows

### Basic Slack Report

```yaml
name: Feature Flags Ready For Removal
on:
  schedule:
    - cron: "00 11 * * 5"
  workflow_dispatch:

jobs:
  send-feature-flags-report:
    name: Feature Flags
    runs-on: ubuntu-latest
    steps:
      - name: 'Send Report'
        uses: rkhaslarov/launchdarkly-outdated-feature-flags-reporter-action@v2.0.0
        with:
          access-token: ${{ secrets.ACCESS_TOKEN }}
          project-key: ${{ secrets.PROJECT_KEY }}
          environment-key: ${{ secrets.LD_ENV }}
          report-type: 'slack'
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
```

### Custom API Report

```yaml
name: Feature Flags Ready For Removal
on:
  schedule:
    - cron: "00 11 * * 5"
  workflow_dispatch:

jobs:
  send-feature-flags-report:
    name: Feature Flags
    runs-on: ubuntu-latest
    steps:
      - name: 'Send Report'
        uses: rkhaslarov/launchdarkly-outdated-feature-flags-reporter-action@v2.0.0
        with:
          access-token: ${{ secrets.ACCESS_TOKEN }}
          project-key: ${{ secrets.PROJECT_KEY }}
          environment-key: ${{ secrets.LD_ENV }}
          report-type: 'api'
          webhook-url: ${{ secrets.API_URL }}
          webhook-token: ${{ secrets.API_TOKEN }}
```

### Custom Rules Configuration

You can customize rules by providing YAML configuration:

```yaml
name: Feature Flags Ready For Removal
on:
  schedule:
    - cron: "00 11 * * 5"
  workflow_dispatch:

jobs:
  send-feature-flags-report:
    name: Feature Flags
    runs-on: ubuntu-latest
    steps:
      # Example 1: Only check for unused flags (skip all filters)
      - name: 'Send Report - Only Unused Flags'
        uses: rkhaslarov/launchdarkly-outdated-feature-flags-reporter-action@v2.0.0
        with:
          access-token: ${{ secrets.ACCESS_TOKEN }}
          project-key: ${{ secrets.PROJECT_KEY }}
          environment-key: ${{ secrets.LD_ENV }}
          report-type: 'slack'
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          rules-config: |
            min-age:
              days: 0
            exclude-tags:
              tags: []
            temporary-only: false
            boolean-only: false
            unused: true
            default-only: false
      
      # Example 2: Old flags with custom age threshold and excluded tags
      - name: 'Send Report - Old Flags'
        uses: rkhaslarov/launchdarkly-outdated-feature-flags-reporter-action@v2.0.0
        with:
          access-token: ${{ secrets.ACCESS_TOKEN }}
          project-key: ${{ secrets.PROJECT_KEY }}
          environment-key: ${{ secrets.LD_ENV }}
          report-type: 'slack'
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          rules-config: |
            min-age:
              days: 90
            exclude-tags:
              tags: ['KEEP', 'MANUAL_REVIEW']
            temporary-only: true
            boolean-only: true
            unused: true
            default-only: true
      
      # Example 3: Only temporary boolean flags with default variation
      - name: 'Send Report - Temporary Boolean Flags'
        uses: rkhaslarov/launchdarkly-outdated-feature-flags-reporter-action@v2.0.0
        with:
          access-token: ${{ secrets.ACCESS_TOKEN }}
          project-key: ${{ secrets.PROJECT_KEY }}
          environment-key: ${{ secrets.LD_ENV }}
          report-type: 'slack'
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          maintainer-teams: 'team-a,team-b'
          rules-config: |
            min-age:
              days: 30
            exclude-tags:
              tags: []
            temporary-only: true
            boolean-only: true
            unused: false
            default-only: true
```

## API Report Format

When using a custom API webhook (non-Slack URL), the action will send a POST
request with the following payload format:

```json
[
  {
    "maintainerTeam": {
      "key": "team-key-1",
      "name": "Team Name 1"
    },
    "featureFlags": [
      {
        "key": "flag-key-1",
        "creationDate": "2024-01-15T10:30:00Z",
        "createdAgo": "9 months ago",
        "link": "https://app.launchdarkly.com/project/env/features/flag-key-1"
      }
    ]
  },
  {
    "maintainerTeam": {
      "key": "team-key-2",
      "name": "Team Name 2"
    },
    "featureFlags": [
      {
        "key": "flag-key-2",
        "creationDate": "2024-02-20T14:20:00Z",
        "createdAgo": "8 months ago",
        "link": "https://app.launchdarkly.com/project/env/features/flag-key-2"
      }
    ]
  }
]
```

If `webhook-token` is provided, it will be sent as a Bearer token in the
Authorization header.

## Notes

- Ensure that all secrets (e.g., `ACCESS_TOKEN`, `PROJECT_KEY`, `LD_ENV`,
  `SLACK_WEBHOOK`, `API_URL`, `API_TOKEN`) are properly configured in your
  repository's secrets settings.
- Set `report-type` to `slack` for Slack webhooks, `api` for custom API
  endpoints, or `default` for console output only.
- Rules configuration uses YAML format for better readability and
  maintainability.
- This action helps streamline the process of identifying and managing outdated
  feature flags in your LaunchDarkly environment.
