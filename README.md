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
| Staging site    | `max-website-staging` (target `staging`), https://max-website-staging.web.app |
| Public dir      | `dist/` (built by `scripts/build.mjs`) |

## Run Locally

```sh
npm run dev      # build, start the Firebase emulator on dist/, rebuild on every save
npm run dev:staging  # the same for the staging build (dist-staging/, with the staging/ review pages)
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
<!-- partial:cta-demo location="compare_hub" secondary_href="/pricing.html" secondary_label="See pricing" -->
```

`npm run build` (and every deploy) replaces each marker in the `dist/` copy; the source page keeps the marker. Values in a partial come from the marker first, then from the page (`{{title}}`, `{{description}}` and `{{url}}` are read from its `<title>`, meta description and canonical link; `{{root}}` is the path back to the site root). `{{name|fallback}}` supplies a default. An unknown partial or a missing value fails the build.

| Partial | Used on | What it holds |
| --- | --- | --- |
| `site-nav` | every page, top of `<body>` | Plain menu links for crawlers that skip JavaScript, and `js/header.js`, which builds the real menu **from those links**. Edit the menu here only. |
| `site-footer` | every page, end of `<body>` | Footer links for crawlers, and `js/footer.js`, which builds the footer from them. |
| `head-services` | every page, in `<head>` | Favicon, Google Analytics and the Zendesk widget. |
| `social-meta` | indexable pages with a canonical link | Open Graph and Twitter tags, built from the page's title, description and canonical. Override any of them on the marker (`title`, `description`, `image`, `image_type`, `image_width`, `image_height`, `image_alt`, `type`), as the Insights pages do. |
| `cta-demo` | tryout and comparison pages | The closing "See Max run a tryout" section. Takes `location` (the analytics label), `secondary_href` and `secondary_label`. |

Any link with `data-demo="<label>"` opens the Zendesk widget (its `href` is the fallback when the widget hasn't loaded) and records a `cta_click` with that label; `js/header.js` handles it on every page.

When the same markup turns up on a second page, make it a partial rather than copying it.

## Images

Pages use WebP images sized to about twice their on-screen size, which keeps the homepage near 0.8 MB of images instead of 10 MB. The build fails if any image a page, stylesheet or script uses is over 300 KB, and it warns about images that ship but nothing uses.

To add or replace an image:

```sh
cwebp -q 80 -resize <2x display width> 0 -metadata none input.png -o images/name.webp   # brew install webp
```

- Photos and illustrations: quality 75–80. Background textures: 60. Logos: 85–90, at twice their display width (a 45 px-tall logo is exported 90 px tall).
- Keep transparency: `cwebp` preserves it from PNG input.
- Social share images (`og:image`) stay JPEG, 1200 × 630, because some social sites still don't read WebP.
- Don't keep the full-size original in the repo; git history has the ones replaced in October 2026.

### Social cards

`assets/social/*.jpg` are the cards social sites show when a page is shared (`og:image`, `twitter:card`), in the style of the Insights paper card. They are generated, not designed by hand: `scripts/social-cards.mjs` holds each card's copy and art, and `scripts/social-cards/template.html` lays it out.

```sh
node scripts/social-cards.mjs            # render every card (needs Google Chrome; CHROME=... to override its path)
node scripts/social-cards.mjs pricing    # render one card
```

- A new shareable page gets a new entry in `CARDS`, then `image="https://maxanalytics.ca/assets/social/<name>.jpg"` and an `image_alt` on its `social-meta` marker.
- Card copy follows the page: no claim, number or name the page doesn't already make. When a page's prices or wording change, re-render its card.
- The script is not part of the build. Commit the rendered JPEGs; they go live with the next deploy, and social sites refresh their cached preview within days (LinkedIn's Post Inspector and Facebook's Sharing Debugger refresh one URL on demand).

## Search and AI visibility

The site is meant to rank for, and be cited by Google AI Overviews and other AI search on, queries like "minor hockey evaluation and tryout software". What keeps that working:

- **The landing page.** `minor-hockey-tryout-software/index.html` (styled by `css/redesign.css` plus `css/tryout-software.css`) answers the query in its first paragraph. It is the hub every blog post and outside listing links to. Its FAQ is repeated as `FAQPage` structured data in the head, so edit both together. Its social tags come from the `social-meta` partial.
- **Comparison pages.** `compare/` is the hub, with one page per competitor that shows up for the query (`max-vs-teamgenius/`, `max-vs-skillshark/`, `max-vs-playbook/`). Every competitor claim comes from that vendor's own site and is dated in the page's "Sources and method" section. Competitor cells state only what the vendor publishes; leave out a row rather than write "not described". Re-check them each quarter and before evaluation season, then update the reviewed date and `dateModified`. These pages carry no `FAQPage` markup (Google stopped showing FAQ rich results in May 2026).
- **Plain links for crawlers.** Many crawlers (ChatGPT, Perplexity, Claude) don't run JavaScript, so the `site-nav` and `site-footer` partials put the menu and footer links in the HTML, and the scripts build the visible menu and footer from them. There is one copy of each link list, in `partials/`.
- **Every page has** a specific `<title>` (about 60 characters), a `description` (about 160), and a `canonical` link. The duplicate `privacy/`, `privacy-policy/`, `terms/` and `terms-of-service/` pages point their canonical at `privacy.html` / `terms.html`.
- **Structured data.** `index.html` declares the `Organization` (`@id` `https://maxanalytics.ca/#organization`), the landing page declares the `SoftwareApplication` with pricing, and `faqs.html` has `FAQPage`. Update the prices there when `pricing.html` changes.
- **Sitemap, generated.** The build writes `dist/sitemap.xml`; there is no hand-kept sitemap. A page is listed when its canonical link points at itself and it isn't `noindex`, dated by the last commit that changed its source file. To keep a page out, mark it `noindex` or point its canonical elsewhere (the family feedback form is excluded in `scripts/build.mjs` until it gets `noindex`). `robots.txt` points at the sitemap. Submit it once in Google Search Console and Bing Webmaster Tools; they reread it themselves after that.
- **IndexNow, every production deploy.** `npm run deploy:prod` runs `scripts/indexnow.mjs` twice through Firebase hooks: before deploying it saves the live sitemap, and after a successful deploy it sends IndexNow (Bing, which feeds ChatGPT search and Copilot, plus Yandex, Seznam and Naver) every page that is new or whose `lastmod` changed, so they're recrawled within hours. Shared partials don't count as changes, and a page changed twice in one day is sent only on that day's first deploy. A failed notification is a warning and never fails the deploy. `<key>.txt` in the site root is the public key IndexNow checks; keep it and the `KEY` in the script in step. Preview what would be sent with `npm run build && node scripts/indexnow.mjs --snapshot && node scripts/indexnow.mjs --dry-run`. Google doesn't take IndexNow and relies on the sitemap.
- **Build checks.** The build fails on structured data that isn't valid JSON, an unknown partial, or a partial missing a value.
- **Social preview.** Every shareable page has its own 1200 × 630 card in `assets/social/`, set by `image` and `image_alt` on its `social-meta` marker; a page without one falls back to the home card. The Insights papers keep the card that ships with each paper. See "Social cards" below.

## Insights

`/insights/` is the landing page for the white-paper series (`insights/index.html`, styled by `css/insights-landing.css`). Each paper lives in `insights/papers/` as `<slug>.html` (styled by the shared `css/insights.css`) and `<slug>.pdf`, with any figures named `<slug>-figure-<n>.svg`. A paper has two lime **Subscribe** boxes (below the subtitle and after the closing note), each with a **Download PDF** button that sets `download="<Paper Title> - Max Analytics.pdf"` so the file saves under the paper's name. The **Insights** nav link points at the landing page.

To publish a paper the landing page lists as coming soon:

1. Add `<slug>.html`, `<slug>.pdf` and its figures to `insights/papers/`. Build the HTML by copying an existing paper and swapping in the body — the content team's standalone HTML has its own top bar and inline CSS, where ours uses the shared nav, footer and toolbar.
2. In `insights/index.html`, on that paper's card: remove `paper--soon` from the `<article>`, replace the "Landing …" tag and **Get it by email** button with the **Read online** / **Download PDF** buttons, and replace the status line with pages · read time · month. Copy Paper 1's card.
3. Give the paper a self-referencing canonical link; the build adds it to the sitemap.
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

This is `firebase deploy --only hosting:production`. The `predeploy` hook in `firebase.json` rebuilds `dist/` first (including the sitemap), so a deploy never ships stale or raw pages. Deploys are manual; there is no CI deploy. Deploy from an up-to-date `master` with a clean working tree, since the build ships whatever is on disk and dates the sitemap from git history. Always name the target: a bare `firebase deploy` deploys to production **and** staging.

**Deploy to staging** (https://max-website-staging.web.app, a permanent URL for reviewing a version before it goes live):

```sh
npm run deploy:staging
```

This builds your working tree, so it shows uncommitted changes too; deploy from the branch you want reviewed. The staging build (`node scripts/build.mjs --staging`) writes its own folder, `dist-staging/`, and adds the review pages from `staging/`, such as https://max-website-staging.web.app/social-cards-review/ (every share card on one page). Production's `dist/` never holds them, so even a deploy to both targets keeps them off maxanalytics.ca. Staging is the `max-website-staging` site in the same Firebase project, mapped in `.firebaserc`. It sends `X-Robots-Tag: noindex` so search engines never index the copy (its canonical links also point at maxanalytics.ca). Anything a reviewer does on staging is real: Google Analytics counts the visit and the Insights sign-up form adds a real Customer.io subscriber.

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

## Key Config Files

| File | Purpose |
| ---- | ------- |
| `firebase.json` | Hosting configuration: the `production` and `staging` targets, their public directories (`dist/`, `dist-staging/`), the `predeploy` build and IndexNow hooks, staging's noindex header, and the local emulator port |
| `package.json` | `npm run dev`, `serve`, `build`, `deploy:prod` and `deploy:staging` (no dependencies) |
| `scripts/build.mjs` | Builds `dist/`: copies the site (skipping dotfiles, `*.md`, `*.log`, `partials/`, `scripts/`, `staging/` and config files), fills in the partials, writes the sitemap and checks structured data. `--staging` builds `dist-staging/` with the `staging/` pages added |
| `staging/` | Review pages for the staging site only, laid out as they are served (`staging/social-cards-review/index.html` → `/social-cards-review/`). The build fails if one shares a path with a site file or lacks `<meta name="robots" content="noindex">`. It doesn't count as using an image |
| `scripts/indexnow.mjs` | Sends a production deploy's changed pages to IndexNow (run by the `production` target's predeploy and postdeploy hooks) |
| `f2b7d001fdf70d4f23c61b922d7002ab.txt` | IndexNow key file; public by design |
| `partials/` | Shared snippets placed by `<!-- partial:name -->` markers |
| `.firebaserc` | Maps the `default` project alias to `maxanalytics`, and the hosting targets to sites (`production` → `max-static`, `staging` → `max-website-staging`) |
