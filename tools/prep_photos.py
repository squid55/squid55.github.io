#!/usr/bin/env python3
"""컨퍼런스 사진을 저장소에 넣기 전에 줄이고 EXIF(GPS 포함)를 지운다.

사이트로 나가는 사진은 Hugo 가 다시 인코딩하므로 EXIF 가 빠지지만,
공개 저장소에 올라간 원본에는 그대로 남는다. 그래서 커밋 전에 한 번 돌린다.

    python3 tools/prep_photos.py ~/Pictures/행사/*.jpg -o content/conference/2026-osskorea/photos

필요: pip install pillow  (HEIC 는 pillow-heif 도)
"""
import argparse
from pathlib import Path

from PIL import Image, ImageOps

try:
    import pillow_heif  # 아이폰 HEIC
    pillow_heif.register_heif_opener()
except ImportError:
    pass

ap = argparse.ArgumentParser()
ap.add_argument("files", nargs="+", type=Path)
ap.add_argument("-o", "--out", type=Path, required=True)
ap.add_argument("--max", type=int, default=2500, help="긴 변 최대 픽셀 (기본 2500)")
ap.add_argument("-q", "--quality", type=int, default=85)
args = ap.parse_args()

args.out.mkdir(parents=True, exist_ok=True)
for src in args.files:
    im = ImageOps.exif_transpose(Image.open(src))   # 회전 정보를 픽셀에 반영하고 나서 EXIF 를 버린다
    im.thumbnail((args.max, args.max), Image.Resampling.LANCZOS)
    dst = args.out / (src.stem.lower().replace(" ", "-") + ".jpg")
    im.convert("RGB").save(dst, "JPEG", quality=args.quality, optimize=True, progressive=True)
    print(f"{src.name} → {dst}  {im.width}x{im.height}  {dst.stat().st_size // 1024} KB")
