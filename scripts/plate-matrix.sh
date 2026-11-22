#!/usr/bin/env bash
# Shoots the comparison matrix of the makie plate into <outDir>: the same pictures before and after a change that must not
# move a pixel (docs/plans/2026-11-18-material-table.md §8.2). Every picture is the lid alone under a pinned clock.
# Usage: bash scripts/plate-matrix.sh <outDir> [group…]      (dev server on 127.0.0.1:3000; no other page may hold the GPU)
#   groups (default: all): base coat0 new v4 v5 v6 swapA swapB lightoff mobile
# Then: node scripts/plate-diff.mjs <before>/<group> <after>/<group>
# Do not edit src/ while it runs: the dev server reloads the page and the batch is lost.
set -u
out=${1:?usage: bash scripts/plate-matrix.sh <outDir> [group…]}; shift
groups=${*:-base coat0 new v4 v5 v6 swapA swapB lightoff mobile}
wards="minami ukyo nishikyo yamashina fushimi kita kamigyo shimogyo higashiyama nakagyo sakyo"
jobs() { # jobs <theme> <size> [ward…]
  local theme=$1 size=$2; shift 2
  for w in ${*:-$wards}; do printf '%s-%s:%s:%s-still:%s:1:.5,.5 ' "$w" "$theme" "$w" "$theme" "$size"; done
}
export PLATE_CLOCK=60000
fail=0
for g in $groups; do
  unset PLATE_SHOT_QUERY PLATE_VIEW PLATE_LIGHT PLATE_TONE
  case $g in
    base)     export PLATE_TONE=1; j="$(jobs day 1440x900) $(jobs night 1440x900)";;
    coat0)    export PLATE_SHOT_QUERY='?coat=0'; j=$(jobs night 1440x900);;
    new)      export PLATE_SHOT_QUERY='?years=0'; j=$(jobs day 1440x900);;
    v4|v5|v6) export PLATE_VIEW=${g#v}; j=$(jobs day 1440x900);;
    # Materials no ward draws on the lid: 19 and 20 (banks) stand in for 21 and 22, 3 for 2; then 4 for 2 and 13 for the plain ground.
    swapA)    export PLATE_SHOT_QUERY='?matSwap=21:19,22:20,2:3'; j=$(jobs day 1440x900);;
    swapB)    export PLATE_SHOT_QUERY='?matSwap=2:4,1:13'; j=$(jobs day 1440x900 minami ukyo kita kamigyo);;
    lightoff) export PLATE_LIGHT=.02,.95; j=$(jobs day 1440x900);;
    mobile)   j=$(jobs day 375x812 minami fushimi kamigyo);;
    *) echo "unknown group $g"; fail=1; continue;;
  esac
  mkdir -p "$out/$g"
  # shellcheck disable=SC2086
  node scripts/plate-shot.mjs "$out/$g" $j > "$out/$g.log" 2>&1 || fail=1
  grep -E "WRONG|FAILED|CONSOLE|EXC" "$out/$g.log" | head -5
  echo "$g: $(ls "$out/$g" | grep -c '\.png$') pictures"
done
exit $fail
