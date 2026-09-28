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

## Run Locally

```sh
firebase emulators:start --only hosting
```

Then open http://127.0.0.1:8765 (port pinned in `firebase.json`; macOS AirPlay Receiver holds 5000). Stop with `Ctrl+C`.

Use the emulator rather than a generic static server (`python3 -m http.server`, `npx serve`, …) — it reproduces production routing:

- Any unknown path, at any depth, returns `404.html` with a 404 status.
- A folder without an `index.html` (e.g. `/insights/papers/`, `/css/`) is a 404 — directory contents are never listed.
- A folder URL without its trailing slash redirects to the slash form.

Because `404.html` is served at whatever path was requested, every asset and link in it is root-absolute (`/css/...`, `/js/...`).

## Insights

`/insights/` is the landing page for the white-paper series (`insights/index.html`, styled by `css/insights-landing.css`). Each paper lives in `insights/papers/` as `<slug>.html` (styled by the shared `css/insights.css`) and `<slug>.pdf`, with any figures named `<slug>-figure-<n>.svg`. Both **Download PDF** buttons (toolbar and after the closing note) set `download="<Paper Title> - Max Analytics.pdf"` so the file saves under the paper's name. The **Insights** nav link points at the landing page.

To publish a paper the landing page lists as coming soon:

1. Add `<slug>.html`, `<slug>.pdf` and its figures to `insights/papers/`. Build the HTML by copying an existing paper and swapping in the body — the content team's standalone HTML has its own top bar and inline CSS, where ours uses the shared nav, footer and PDF toolbar.
2. In `insights/index.html`, on that paper's card: remove `paper--soon` from the `<article>`, replace the "Landing …" tag with the **Read online** / **Download PDF** buttons, and replace the status line with pages · read time · month. Copy Paper 1's card.
3. Add the paper's URL to `sitemap.xml`.

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
| `firebase.json` | Hosting configuration (site ID, public directory, ignore patterns — dotfiles and `*.md` never deploy) and the local emulator port |
| `.firebaserc` | Maps the `default` project alias to `maxanalytics` |
| `.github/workflows/firebase-hosting-merge.yml` | Auto-deploy on push to `master` |
| `.github/workflows/firebase-hosting-pull-request.yml` | Preview deploy on PRs |
