import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

BASE_DIR = r"c:\KIRTSOY_CORE\AI_PROGRAMS\twitch_music_panel"
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
os.makedirs(ASSETS_DIR, exist_ok=True)
OUT_PATH = os.path.join(ASSETS_DIR, "twitch_banner.png")

# Twitch panel standard width is 320px
width = 320
height = 140

img = Image.new("RGBA", (width, height), (7, 9, 8, 255))
draw = ImageDraw.Draw(img)

# Try loading cover
cover_path = os.path.join(ASSETS_DIR, "cover.png")
if not os.path.exists(cover_path):
    cover_path = os.path.join(ASSETS_DIR, "cover.webp")

if os.path.exists(cover_path):
    cover = Image.open(cover_path).convert("RGBA")
    # Resize cover to square height - 20
    cover_size = 100
    cover = cover.resize((cover_size, cover_size), Image.Resampling.LANCZOS)
    
    # Rounded mask for cover
    mask = Image.new("L", (cover_size, cover_size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([(0, 0), (cover_size, cover_size)], radius=12, fill=255)
    
    img.paste(cover, (16, 20), mask)

# Neon glow border
draw.rounded_rectangle([(2, 2), (width - 3, height - 3)], radius=14, outline=(77, 255, 0, 160), width=2)
draw.rounded_rectangle([(0, 0), (width - 1, height - 1)], radius=16, outline=(29, 185, 84, 80), width=1)

# Subtle background glow on left
# Text placement
# Fonts: default or system
try:
    font_bold = ImageFont.truetype("arialbd.ttf", 16)
    font_sub = ImageFont.truetype("arial.ttf", 10)
    font_badge = ImageFont.truetype("arialbd.ttf", 9)
    font_btn = ImageFont.truetype("arialbd.ttf", 11)
except:
    font_bold = ImageFont.load_default()
    font_sub = font_bold
    font_badge = font_bold
    font_btn = font_bold

# Badge
badge_x = 126
badge_y = 20
draw.rounded_rectangle([(badge_x, badge_y), (badge_x + 95, badge_y + 16)], radius=8, fill=(77, 255, 0, 30), outline=(77, 255, 0, 120))
draw.text((badge_x + 8, badge_y + 2), "● AUTONOMOUS", fill=(77, 255, 0, 255), font=font_badge)

# Title
draw.text((126, 42), "420 MIXTAPE", fill=(255, 255, 255, 255), font=font_bold)
draw.text((126, 62), "VOL. 1 • 24 ТРЕКА", fill=(77, 255, 0, 255), font=font_sub)
draw.text((126, 76), "KIRTSOY OFFICIAL", fill=(139, 157, 141, 255), font=font_sub)

# Play Button Badge
btn_x = 126
btn_y = 96
btn_w = 175
btn_h = 26
draw.rounded_rectangle([(btn_x, btn_y), (btn_x + btn_w, btn_y + btn_h)], radius=6, fill=(29, 185, 84, 255))

# Draw crisp triangle play icon
tri_x = btn_x + 14
tri_y = btn_y + 8
draw.polygon([(tri_x, tri_y), (tri_x + 9, tri_y + 5), (tri_x, tri_y + 10)], fill=(0, 0, 0, 255))

draw.text((btn_x + 30, btn_y + 6), "СЛУШАТЬ В ПЛЕЕРЕ", fill=(0, 0, 0, 255), font=font_btn)

img.save(OUT_PATH, "PNG")
print(f"Generated Twitch Banner: {OUT_PATH}")
