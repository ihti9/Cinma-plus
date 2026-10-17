# CINEMA+ — pre-generated Arabic anime subtitles

The website can load a pre-generated WebVTT file automatically from:
`public/subtitles/anilist/<AniList-ID>/<episode>.vtt`

For example, the first episode of an anime with AniList ID 269:
`public/subtitles/anilist/269/1.vtt`

## Generate subtitles for media you are authorized to process

On a computer with Python 3 and FFmpeg installed:

```bash
pip install openai-whisper argostranslate
python scripts/generate_arabic_subtitles.py /path/to/episode.mp4 --anilist 269 --episode 1
```

The script uses Whisper to recognize speech and translate it to **English**, then Argos Translate to translate English to Arabic **locally**. It downloads open models on first use, so the initial run needs internet. Later processing can run locally without per-minute cloud AI charges. Accuracy, especially Japanese names and anime terminology, requires human review.

Commit the generated `.vtt` file and redeploy. The CINEMA+ subtitle panel will detect it automatically; press **Start subtitles** when the external player starts, then adjust ±5 seconds if needed. Ani.pm's embedded player does **not** expose audio or playback time to CINEMA+, so the site cannot automatically sync or transcribe its iframe. A viewer can also upload their own SRT/VTT/ASS file; SRT/VTT uploads are cached per episode on their device.

**Limitations:** The app does not download or extract video from third-party players, does not process copyrighted episodes without a supplied authorized file, and does not generate subtitles in the browser. No pre-generated subtitle files are bundled until someone runs the generator and publishes reviewed outputs. No paid cloud service is required for the local generation path.
