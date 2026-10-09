import os
import zipfile

BASE_DIR = r"c:\KIRTSOY_CORE\AI_PROGRAMS\twitch_music_panel"
ZIP_PATH = os.path.join(BASE_DIR, "twitch_music_panel_ext.zip")

files_to_pack = [
    ("panel.html", "panel.html"),
    ("style.css", "style.css"),
    ("app.js", "app.js"),
    ("tracks.json", "tracks.json"),
    ("assets/cover.png", "assets/cover.png"),
    ("assets/cover.webp", "assets/cover.webp"),
    ("assets/twitch_banner.png", "assets/twitch_banner.png"),
]

with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zipf:
    for src_rel, arc_name in files_to_pack:
        src_path = os.path.join(BASE_DIR, src_rel)
        if os.path.exists(src_path):
            zipf.write(src_path, arc_name)
            print(f"Added: {arc_name}")
        else:
            print(f"Warning: Missing {src_path}")

print(f"\nCreated Twitch Extension Zip ({os.path.getsize(ZIP_PATH) / 1024:.1f} KB): {ZIP_PATH}")
