# Atelier — Figure Study Studio

A free, no-install web app for generating artistic **figure-drawing reference studies** — full-body nude figure sketches in a variety of mediums, poses, and body types. Built for artists, illustrators, and anatomy practice.

- **100% free** — powered by [Pollinations.ai](https://pollinations.ai), no API key, no signup required
- **No backend** — a single-page static site that calls the image API directly from the browser
- **Host anywhere** — works on GitHub Pages, Netlify, Cloudflare Pages, or just `file://`

## Features

- **Subject control** — gender, age range, body type
- **30+ poses & activities** — standing, seated, reclining, running, dancing, yoga, and more
- **Sketch mediums** — graphite, charcoal, sanguine chalk, ink, crosshatch, gesture, white chalk
- **Technique** — line handling and shading intensity
- **Composition** — view angle, background, lighting, aspect ratio
- **Generation** — model picker (Flux / Turbo / SD), seed control, batch of 1–4
- **Prompt preview** — see the exact prompt sent to the API, copy it anywhere
- **Session gallery** — thumbnails, view, download, delete

## Run it locally

No install needed. Just open `index.html` in a browser — the app is fully client-side.

For development convenience you can also serve it:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. Repo **Settings → Pages → Source → Deploy from a branch → `main` / root** → Save.
3. Your app will be live at `https://<your-username>.github.io/<repo-name>/`.

## Optional: identify your app & remove the watermark

Anonymous requests are rate-limited to ~1 image per 15 seconds. To get higher limits and watermark-free images:

1. Create a free account at [enter.pollinations.ai](https://enter.pollinations.ai) (or the legacy [auth.pollinations.ai](https://auth.pollinations.ai)).
2. Set the `REFERRER` constant in `app.js` to your site URL (e.g. `myart.app`) so your registered app is credited.

## How it works

1. The UI builds a rich art prompt from your selections (subject → pose → medium → composition).
2. The prompt is sent to:

   ```
   GET https://image.pollinations.ai/prompt/{prompt}?model=flux&width=768&height=1024&seed=...&private=true
   ```

3. The returned image is shown in the viewer and added to the session gallery.

The `private=true` flag keeps generated studies out of Pollinations' public image feed.

## Privacy & content

This tool generates **artistic nude figure studies** — a long-standing academic art practice (life drawing). Pollinations.ai allows this content by default; its `safe` filter is opt-in and is intentionally not used here.

All generation happens remotely and nothing is stored on your machine beyond the session's in-memory gallery. Clear the gallery to drop every image from the current session.

## Disclaimer

Generated content is non-deterministic and should be used as creative reference only, not medical or anatomical truth. Respect local laws and the terms of service of any service you deploy this to.

---

Built with ♥ using vanilla HTML/CSS/JS. Image generation by [Pollinations.ai](https://pollinations.ai).
