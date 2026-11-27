#!/usr/bin/env bash
# Shoots the pictures scripts/plate-room-stats.mjs measures, with their masks, into <outDir>/<group>
# (docs/plans/2026-11-28-room.md §4 V4–V7). Every picture is the lid alone under a pinned clock.
# Usage: bash scripts/plate-room-shots.sh <outDir> [group…]     (dev server on 127.0.0.1:3000; no other page may hold the GPU)
#   groups (default: all): centre lightoff mobile tiltL tiltR close      PLATE_ROOM_WARDS="minami kita" shoots only those wards
#   centre: eleven wards by day and by night, the light on the middle of the lid; lightoff: by day, the light off the lid;
#   mobile: 375 px; tiltL, tiltR: the box leaning to either end (not paused, so the lean is live); close: twice the size.
# Then: node scripts/plate-room-stats.mjs stats <outDir>/<group>   (or check <baseDir>/<group> <outDir>/<group>)
set -u
out=${1:?usage: bash scripts/plate-room-shots.sh <outDir> [group…]}; shift
groups=${*:-centre lightoff mobile tiltL tiltR close}
wards=${PLATE_ROOM_WARDS:-"minami ukyo nishikyo yamashina fushimi kita kamigyo shimogyo higashiyama nakagyo sakyo"}
few="minami fushimi kamigyo higashiyama" # wards with the most gold and silver pieces, for the costlier groups
jobs() { # jobs <theme> <size> <zoom> <fx,fy> [ward…]
  local theme=$1 size=$2 zoom=$3 at=$4; shift 4
  for w in ${*:-$wards}; do printf '%s-%s:%s:%s:%s:%s:%s ' "$w" "${theme%%-*}" "$w" "$theme" "$size" "$zoom" "$at"; done
}
export PLATE_CLOCK=60000 PLATE_MASK=gold,silver,parts,room PLATE_TONE=1
fail=0
for g in $groups; do
  unset PLATE_LIGHT PLATE_CENTER
  case $g in
    centre)   j="$(jobs day-still 1440x900 1 .5,.5) $(jobs night-still 1440x900 1 .5,.5)";;
    lightoff) export PLATE_LIGHT=.02,.95; j=$(jobs day-still 1440x900 1 .5,.5);;
    mobile)   j=$(jobs day-still 375x812 1 .5,.5 minami fushimi kamigyo);;
    tiltL)    j=$(jobs day 1440x900 1 .08,.5 $few);;
    tiltR)    j=$(jobs day 1440x900 1 .92,.5 $few);;
    close)    export PLATE_CENTER=1; j=$(jobs day-still 1440x900 2 .5,.45 $few);;
    *) echo "unknown group $g"; fail=1; continue;;
  esac
  mkdir -p "$out/$g"
  # shellcheck disable=SC2086
  node scripts/plate-shot.mjs "$out/$g" $j > "$out/$g.log" 2>&1 || fail=1
  grep -E "WRONG|FAILED|CONSOLE|EXC" "$out/$g.log" | head -5
  echo "$g: $(ls "$out/$g" | grep -c -- '-mask-room\.png$') pictures with masks"
done
exit $fail
