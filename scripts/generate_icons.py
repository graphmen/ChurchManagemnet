import os
from PIL import Image

workspace = r"c:\Users\ndebelem.ZINGSERVER1\Desktop\2026\EZC\ezc"
src_image = os.path.join(workspace, "frontend", "public", "sda_logo.png")
res_dir = os.path.join(workspace, "frontend", "android", "app", "src", "main", "res")

# Target mipmaps and sizes: (folder_name, ic_launcher_size, ic_launcher_foreground_size)
CONFIGS = [
    ("mipmap-mdpi", 48, 108),
    ("mipmap-hdpi", 72, 162),
    ("mipmap-xhdpi", 96, 216),
    ("mipmap-xxhdpi", 144, 324),
    ("mipmap-xxxhdpi", 192, 432)
]

def generate_icons():
    if not os.path.exists(src_image):
        print(f"Source image not found: {src_image}")
        return
    
    img = Image.open(src_image)
    
    for folder, icon_size, fg_size in CONFIGS:
        target_folder = os.path.join(res_dir, folder)
        os.makedirs(target_folder, exist_ok=True)
        
        # 1. Generate ic_launcher.png
        icon_img = img.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        icon_img.save(os.path.join(target_folder, "ic_launcher.png"), "PNG")
        
        # 2. Generate ic_launcher_round.png
        icon_img.save(os.path.join(target_folder, "ic_launcher_round.png"), "PNG")
        
        # 3. Generate ic_launcher_foreground.png (Centered with padding for adaptive icons)
        fg_canvas = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        logo_size = int(fg_size * 0.65) # 65% safe zone
        logo_resized = img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
        
        # Calculate paste position to center the logo
        offset = (fg_size - logo_size) // 2
        
        # Handle alpha channel paste mask if present
        mask = logo_resized if logo_resized.mode == "RGBA" else None
        fg_canvas.paste(logo_resized, (offset, offset), mask)
        fg_canvas.save(os.path.join(target_folder, "ic_launcher_foreground.png"), "PNG")
        
        print(f"Generated icons in {folder} (Size: {icon_size}px, FG: {fg_size}px)")

if __name__ == "__main__":
    generate_icons()
