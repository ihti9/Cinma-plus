# CINEMA+ — Vercel deployment

Arabic movie and TV catalog using TMDB (no video streaming).

## Deploy through GitHub + Vercel
1. Create a GitHub repository and upload the files in this folder to its root.
2. Visit https://vercel.com/new, import your GitHub repository.
3. Framework Preset: Vite; Build Command: `npm run build`; Output Directory: `dist`.
4. Under Environment Variables, add either `VITE_TMDB_API_KEY` or `VITE_TMDB_READ_TOKEN` from your TMDB account. Set Production (and Preview if desired).
5. Click Deploy. Open the production domain shown on your Vercel project dashboard.

## Local run
`npm install && npm run dev`

## Notes
- Values starting `VITE_` are bundled into the browser and **are not secret**. Use a server-side proxy if credential confidentiality is required.
- If TMDB credentials are not configured, the app uses demonstration entries.
- This product uses the TMDB API but is not endorsed or certified by TMDB.
- No copyrighted streams or media hosting are included.

## v3 additions
- Genre and year filters, sorting by popularity, ratings, or date
- Season names and episode counts in TV detail pages
- No playback, only TMDB metadata
- After editing files on GitHub's `main` branch, Vercel deploys automatically if Git integration remains connected.


## v4: YouTube trailers
- Film/TV detail modal fetches `/movie/{id}/videos` or `/tv/{id}/videos` from TMDB.
- Searches Arabic first, then English when an Arabic trailer is unavailable.
- Only YouTube trailer/teaser video IDs with valid keys are accepted.
- Privacy-enhanced `youtube-nocookie.com` embed loads **only when the visitor clicks Play**.
- Closing the detail dialog removes the iframe and stops playback.
- Displays an unavailable message if no trailer is returned; demo items have no trailers.
- Keep the existing `VITE_TMDB_API_KEY` Vercel environment variable; no YouTube API key is needed.

### Update an existing Vercel site
Replace `src.js`, `style.css`, and `README.md` on your existing GitHub `main` branch. Vercel redeploys automatically when connected. Do not create a new Vercel project.
