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

`/insights/` is the landing page for the white-paper series (`insights/index.html`, styled by `css/insights-landing.css`). Each paper lives in `insights/papers/` as `<slug>.html` (styled by the shared `css/insights.css`) and `<slug>.pdf`, with any figures named `<slug>-figure-<n>.svg`. A paper has two lime **Subscribe** boxes (below the subtitle and after the closing note), each with a **Download PDF** button that sets `download="<Paper Title> - Max Analytics.pdf"` so the file saves under the paper's name. The **Insights** nav link points at the landing page.

To publish a paper the landing page lists as coming soon:

1. Add `<slug>.html`, `<slug>.pdf` and its figures to `insights/papers/`. Build the HTML by copying an existing paper and swapping in the body — the content team's standalone HTML has its own top bar and inline CSS, where ours uses the shared nav, footer and toolbar.
2. In `insights/index.html`, on that paper's card: remove `paper--soon` from the `<article>`, replace the "Landing …" tag and **Get it by email** button with the **Read online** / **Download PDF** buttons, and replace the status line with pages · read time · month. Copy Paper 1's card.
3. Add the paper's URL to `sitemap.xml`.
4. Update the release dates where they appear: the landing page's note under the hero cards and the paper cards, and the lead paragraphs of `insights/subscribe/index.html` and `insights/subscribe/thanks/index.html`.

The landing page draws its win-rate chart twice: `chart--full` (the content team's SVG, verbatim) and `chart--compact`, a 320-px-wide redraw of the same bins for phones. When the data changes, redraw the compact one from the full one's bar counts.

### Insights sign-up

Every subscribe button links to `insights/subscribe/`, a standard HTML form (`#insights-subscribe`, styled by `css/insights-subscribe.css`). It posts to Customer.io's hosted Forms endpoint (`customerioforms.com/forms/submit_action`), so there is no backend and no Customer.io JS snippet to install. Customer.io creates or updates the person and redirects to `insights/subscribe/thanks/`. The site ID (public, not a secret) and form ID **insights-series** live in the form's `action`; `js/insights-subscribe.js` points `success_url` at whichever host served the page, so local and preview tests return to themselves.

| Form field | Customer.io attribute | Value |
| --- | --- | --- |
| Name | `name` | Free text, optional |
| Email | `email` | The identifier, required |
| Relationship to hockey | `hockey_relationship` | Ticked boxes joined as one string, e.g. `parent, coach` (segment with *contains*) |
| Consent | `marketing_consent` | `yes`, required: express consent under Canada's anti-spam law |
| hidden | `insights_series_subscriber` | `true` |

Every sign-up joins the **MaxAnalytics Marketing Updates** manual segment (id 15, Max Production workspace), the explicit list for marketing sends. The hosted form can't add to a segment itself, so the Customer.io automation *Marketing Form Subscriptions* does: trigger *form submitted: insights-series*, action *Manual Segment Update → add*. Keep the form ID unchanged or that automation stops firing.

Bot defence today is client-side only: a hidden honeypot field (`company_website`) and a 1.5 s minimum between page load and submit. A tripped check shows the thank-you page and sends nothing. It stops form-filling bots but not a script posting straight to Customer.io; reCAPTCHA and rate limits need a server endpoint, which is the planned follow-up.

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
