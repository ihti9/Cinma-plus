#!/usr/bin/env python3
"""Offline/batch Japanese -> Arabic subtitle generation using Whisper + Argos Translate.
Install: pip install openai-whisper argostranslate
Requires ffmpeg on PATH. Run once per legally obtained episode:
python scripts/generate_arabic_subtitles.py episode.mp4 --anilist 269 --episode 1
"""
import argparse
from pathlib import Path

def stamp(seconds):
    millis = max(0, round(float(seconds) * 1000))
    h, rest = divmod(millis, 3600000)
    m, rest = divmod(rest, 60000)
    s, ms = divmod(rest, 1000)
    return f"{h:02}:{m:02}:{s:02}.{ms:03}"

def main():
    parser = argparse.ArgumentParser(description="Prepare Arabic subtitles from authorized media")
    parser.add_argument("video", type=Path)
    parser.add_argument("--anilist", type=int, required=True)
    parser.add_argument("--episode", type=int, required=True)
    parser.add_argument("--model", default="small", help="Whisper model: tiny/base/small/medium/large")
    args = parser.parse_args()
    if not args.video.is_file() or args.anilist < 1 or args.episode < 1:
        parser.error("Provide an existing media file and positive AniList/episode numbers")

    import whisper
    import argostranslate.package
    import argostranslate.translate
    print("Transcribing and translating speech to English locally with Whisper...")
    model = whisper.load_model(args.model)
    result = model.transcribe(str(args.video), task="translate", fp16=False)
    print("Preparing offline English-to-Arabic translation model...")
    installed = argostranslate.translate.get_installed_languages()
    en = next((x for x in installed if x.code == "en"), None)
    ar = next((x for x in installed if x.code == "ar"), None)
    translation = en.get_translation(ar) if en and ar else None
    if translation is None:
        argostranslate.package.update_package_index()
        available = argostranslate.package.get_available_packages()
        package = next((p for p in available if p.from_code == "en" and p.to_code == "ar"), None)
        if package is None:
            raise RuntimeError("No English-to-Arabic Argos model is available")
        argostranslate.package.install_from_path(package.download())
        installed = argostranslate.translate.get_installed_languages()
        en = next(x for x in installed if x.code == "en")
        ar = next(x for x in installed if x.code == "ar")
        translation = en.get_translation(ar)

    out = Path("public/subtitles/anilist") / str(args.anilist) / f"{args.episode}.vtt"
    out.parent.mkdir(parents=True, exist_ok=True)
    lines = ["WEBVTT", ""]
    for seg in result.get("segments", []):
        text = str(seg.get("text", "")).strip()
        if not text:
            continue
        arabic = translation.translate(text).strip()
        if not arabic:
            continue
        lines.extend([f"{stamp(seg['start'])} --> {stamp(seg['end'])}", arabic, ""])
    out.write_text("\n".join(lines), encoding="utf-8")
    print(f"Saved {out} (review accuracy and timing before publishing)")

if __name__ == "__main__":
    main()
