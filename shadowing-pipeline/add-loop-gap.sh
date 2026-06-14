#!/usr/bin/env bash
# 쉐도잉 클립 끝에 무음을 덧붙인다.
# 플레이어가 audio.loop으로 반복할 때 문장 사이에 잠깐의 여유를 주기 위해서다.
# 예전에는 setTimeout으로 이 여유를 만들었는데, 화면이 꺼지면 타이머가 멈춰
# 다음 재생이 끊겼다. 그래서 여유를 자산 무음으로 옮겨 OS가 loop만으로 이어가게 했다.
#
# ⚠️ 같은 자료에 두 번 실행하면 무음이 겹쳐 쌓인다.
#    자료를 새로 만든 직후 딱 한 번만 실행한다.
#
# 사용: ./add-loop-gap.sh public/shadowing/audio/<id> [gap_sec]
set -euo pipefail

DIR="${1:?사용법: add-loop-gap.sh <audio_dir> [gap_sec]}"
GAP="${2:-0.6}"

sample=$(find "$DIR" -name '*.mp3' | head -1)
[ -n "$sample" ] || { echo "mp3 없음: $DIR" >&2; exit 1; }

# 무음을 클립과 같은 샘플레이트·채널로 맞춰야 다시 인코딩하지 않고(-c copy) 이어붙일 수 있다.
sr=$(ffprobe -v error -show_entries stream=sample_rate -of csv=p=0 "$sample")
ch=$(ffprobe -v error -show_entries stream=channels -of csv=p=0 "$sample")
br=$(ffprobe -v error -show_entries stream=bit_rate -of csv=p=0 "$sample")
cl=$([ "$ch" = 1 ] && echo mono || echo stereo)
[ -n "$br" ] && [ "$br" != "N/A" ] || br=128000

sil="/tmp/loopgap_$$.mp3"
trap 'rm -f "$sil" /tmp/loopgaplist_$$' EXIT
ffmpeg -y -loglevel error -f lavfi -i "anullsrc=r=${sr}:cl=${cl}" \
  -t "$GAP" -c:a libmp3lame -b:a "$br" "$sil"

count=0
while IFS= read -r f; do
  list="/tmp/loopgaplist_$$"
  printf "file '%s'\nfile '%s'\n" \
    "$(cd "$(dirname "$f")" && pwd)/$(basename "$f")" "$sil" > "$list"
  tmp="${f%.mp3}.gap.mp3"
  ffmpeg -y -loglevel error -f concat -safe 0 -i "$list" -c copy "$tmp"
  mv "$tmp" "$f"
  count=$((count + 1))
done < <(find "$DIR" -name '*.mp3')

echo "✓ ${count}개 클립에 ${GAP}s 무음 추가 ($DIR)"
