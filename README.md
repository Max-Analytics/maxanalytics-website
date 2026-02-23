# MaxAnalytics Website

Static HTML site for MaxAnalytics, deployed to [Firebase Hosting](https://firebase.google.com/docs/hosting).

There is no build step — HTML, CSS, and JS files are served directly from the repository root.

## Prerequisites

1. Install the [Firebase CLI](https://firebase.google.com/docs/cli):

   ```sh
   npm install -g firebase-tools
   ```

2. Authenticate with your Google account:

   ```sh
   firebase login
   ```

3. Verify you have access to the project:

   ```sh
   firebase projects:list
   ```

   You should see `maxanalytics` in the output.

## Firebase Project Details

| Setting    | Value          |
| ---------- | -------------- |
| Project ID | `maxanalytics` |
| Site ID    | `max-static`   |
| Public dir | `.` (repo root) |

## Manual Deployment

**Deploy to production:**

```sh
firebase deploy --only hosting:max-static
```

**Deploy to a preview channel** (creates a temporary URL for testing):

```sh
firebase hosting:channel:deploy CHANNEL_NAME --only max-static
```

Replace `CHANNEL_NAME` with any label (e.g. `feature-xyz`). Firebase returns a preview URL you can share.

**List active preview channels:**

```sh
firebase hosting:channel:list --site max-static
```

**Delete a preview channel:**

```sh
firebase hosting:channel:delete CHANNEL_NAME --site max-static
```

## CI/CD

GitHub Actions handles deployment automatically:

- **On merge to `master`** — the site is deployed to the live production channel.
  See `.github/workflows/firebase-hosting-merge.yml`.

- **On pull request** — a preview channel deploy is created and the preview URL is posted as a PR comment.
  See `.github/workflows/firebase-hosting-pull-request.yml`.

Both workflows use the `FIREBASE_SERVICE_ACCOUNT_MAXANALYTICS` repository secret for authentication.

## Key Config Files

| File | Purpose |
| ---- | ------- |
| `firebase.json` | Hosting configuration (site ID, public directory, ignore patterns) |
| `.firebaserc` | Maps the `default` project alias to `maxanalytics` |
| `.github/workflows/firebase-hosting-merge.yml` | Auto-deploy on push to `master` |
| `.github/workflows/firebase-hosting-pull-request.yml` | Preview deploy on PRs |
