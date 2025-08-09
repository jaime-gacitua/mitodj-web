# MITO DJ — Static Site

A minimal, fast static site for your DJ hobby with a full-screen animated intro and a second section for projects/ideas.

## Run locally (npm)

```bash
npm install
npm run dev
```
- This starts Vite on `http://localhost:5173` and opens your browser.

Alternative: build and preview production build
```bash
npm run build
npm run preview
```

## Add your transparent portrait

- Put the transparent PNG or SVG here: `public/images/portrait.png`
- In code, reference it as `/images/portrait.png` (Vite serves `public` at root).
- Recommended size: height 1600–2200 px, optimized (< 500 KB).

## Add your logo

- Save your logo as `public/images/logo.png` (or `logo.svg`).
- It will be used as the favicon via `<link rel="icon" href="/images/logo.png">` in `index.html`.

## Match your logo colors

- Update CSS variables in `src/styles/main.css` under `:root`:
  - `--color-accent` (neon violet)
  - `--color-accent-2` (neon cyan)
  - You can also tweak the background gradients for a perfect match.

## Structure

- `index.html` — main page with two sections
- `public/` — static assets (images); accessible under `/images/...`
- `src/styles/main.css` — styling, color tokens
- `src/scripts/main.js` — GSAP intro animations 