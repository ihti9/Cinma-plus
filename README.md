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
