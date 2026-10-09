# MaxAnalytics Website

Static HTML site for MaxAnalytics, deployed to [Firebase Hosting](https://firebase.google.com/docs/hosting).

Pages are written in the repository root, then a small build (`scripts/build.mjs`, Node 20, no dependencies) copies the site into `dist/` and fills in the shared snippets from `partials/`. Firebase serves and deploys `dist/`, never the raw pages. See [Build and partials](#build-and-partials).

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

| Setting         | Value |
| --------------- | ----- |
| Project ID      | `maxanalytics` |
| Production site | `max-static` (target `production`), serving maxanalytics.ca |
| Public dir      | `dist/` (built by `scripts/build.mjs`) |

## Run Locally

```sh
npm run dev      # build, start the Firebase emulator on dist/, rebuild on every save
npm run serve    # build once, then serve (no watching)
npm run build    # just build dist/
```

Then open http://127.0.0.1:8765 (port pinned in `firebase.json`; macOS AirPlay Receiver holds 5000). Stop with `Ctrl+C`. If the port is taken, an old emulator is still running: stop it, since it may be serving an outdated config.

Never preview the raw pages (opening the files, or a static server on the repo root): they hold partial markers, not the menu, footer or head snippets. Use the emulator, which serves `dist/` and reproduces production routing:

- Any unknown path, at any depth, returns `404.html` with a 404 status.
- A folder without an `index.html` (e.g. `/insights/papers/`, `/css/`) is a 404 — directory contents are never listed.
- A folder URL without its trailing slash redirects to the slash form.

Because `404.html` is served at whatever path was requested, every asset and link in it is root-absolute (`/css/...`, `/js/...`).

## Build and partials

Anything repeated across pages lives once in `partials/` and is placed with a marker on its own line:

```html
<!-- partial:site-nav -->
```

`npm run build` (and every deploy) replaces each marker in the `dist/` copy; the source page keeps the marker. Values in a partial come from the marker first, then from the page (`{{title}}`, `{{description}}` and `{{url}}` are read from its `<title>`, meta description and canonical link; `{{root}}` is the path back to the site root). `{{name|fallback}}` supplies a default. An unknown partial or a missing value fails the build.

| Partial | Used on | What it holds |
| --- | --- | --- |
| `site-nav` | every page, top of `<body>` | Plain menu links for crawlers that skip JavaScript, and `js/header.js`, which builds the real menu **from those links**. Edit the menu here only. |
| `site-footer` | every page, end of `<body>` | Footer links for crawlers, and `js/footer.js`, which builds the footer from them. |
| `head-services` | every page, in `<head>` | Favicon, Google Analytics and the Zendesk widget. |

When the same markup turns up on a second page, make it a partial rather than copying it.

## Search and AI visibility

The site is meant to rank for, and be cited by Google AI Overviews and other AI search on, queries like "minor hockey evaluation and tryout software". What keeps that working:

- **Plain links for crawlers.** Many crawlers (ChatGPT, Perplexity, Claude) don't run JavaScript, so the `site-nav` and `site-footer` partials put the menu and footer links in the HTML, and the scripts build the visible menu and footer from them. There is one copy of each link list, in `partials/`.

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
npm run deploy:prod
```

This is `firebase deploy --only hosting:production`. The `predeploy` hook in `firebase.json` rebuilds `dist/` first, so a deploy never ships stale or raw pages.

**Deploy to a preview channel** (creates a temporary URL for testing):

```sh
npm run build && firebase hosting:channel:deploy CHANNEL_NAME --only production
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

Both workflows run `node scripts/build.mjs` before deploying. Both deploy the `production` target and use the `FIREBASE_SERVICE_ACCOUNT_MAXANALYTICS` repository secret for authentication.

## Key Config Files

| File | Purpose |
| ---- | ------- |
| `firebase.json` | Hosting configuration: the `production` target, `dist/` as the public directory, the `predeploy` build, and the local emulator port |
| `package.json` | `npm run dev`, `serve`, `build` and `deploy:prod` (no dependencies) |
| `scripts/build.mjs` | Builds `dist/`: copies the site (skipping dotfiles, `*.md`, `*.log`, `partials/`, `scripts/` and config files) and fills in the partials |
| `partials/` | Shared snippets placed by `<!-- partial:name -->` markers |
| `.firebaserc` | Maps the `default` project alias to `maxanalytics`, and the `production` hosting target to `max-static` |
| `.github/workflows/firebase-hosting-merge.yml` | Auto-deploy on push to `master` |
| `.github/workflows/firebase-hosting-pull-request.yml` | Preview deploy on PRs |
