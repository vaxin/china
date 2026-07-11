#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../../.." && pwd)"
source_road="$repo_root/assets/source/generated/roads-v2/road-base-alpha.png"
center_texture="$repo_root/apps/game-web/public/assets/runtime/v1/terrain/road-top.png"
output_dir="$repo_root/apps/game-web/public/assets/runtime/v2/roads"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

mkdir -p "$output_dir"

magick "$source_road" -resize 512x512! "$work_dir/vertical.png"
magick "$work_dir/vertical.png" -rotate 90 "$work_dir/horizontal.png"

# Each arm reaches 96px beyond the tile centre. At corners and T-junctions
# the road-width overlap forms one continuous turn; no circular junction is
# painted under a straight road.
arm_size=352
arm_start=160
magick "$work_dir/vertical.png" -crop 512x${arm_size}+0+0 +repage "$work_dir/n.png"
magick "$work_dir/vertical.png" -crop 512x${arm_size}+0+${arm_start} +repage "$work_dir/s.png"
magick "$work_dir/horizontal.png" -crop ${arm_size}x512+${arm_start}+0 +repage "$work_dir/e.png"
magick "$work_dir/horizontal.png" -crop ${arm_size}x512+0+0 +repage "$work_dir/w.png"

# A junction disk was formerly composited into *every* tile. That made a
# straight road look like an accidental crossbar ("=||="). The four half-road
# segments already meet at the tile centre, so only the truly isolated tile
# needs a small compacted-earth patch.
magick -size 512x512 xc:none -fill white \
  -draw 'circle 256,256 374,256' -blur 0x2 "$work_dir/isolated-mask.png"
magick "$center_texture" -resize 512x512! \
  "$work_dir/isolated-mask.png" -compose DstIn -composite "$work_dir/isolated.png"

names=(isolated n e ne s ns es nes w nw ew new sw nsw esw nesw)
for mask in {0..15}; do
  command=(magick -size 512x512 xc:none)
  if ((mask & 1)); then command+=("$work_dir/n.png" -geometry +0+0 -composite); fi
  if ((mask & 2)); then command+=("$work_dir/e.png" -geometry +${arm_start}+0 -composite); fi
  if ((mask & 4)); then command+=("$work_dir/s.png" -geometry +0+${arm_start} -composite); fi
  if ((mask & 8)); then command+=("$work_dir/w.png" -geometry +0+0 -composite); fi
  if ((mask == 0)); then
    command+=("$work_dir/isolated.png" -geometry +0+0 -composite)
  fi
  printf -v prefix '%02x' "$mask"
  "${command[@]}" "$output_dir/$prefix-${names[$mask]}.png"
done
