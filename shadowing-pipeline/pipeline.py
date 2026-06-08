#!/usr/bin/env python3
"""
쉐도잉 자료 통합 파이프라인.

입력:
  - audio_source: YouTube URL 또는 mp3 파일 경로
  - reference_text: 정본 텍스트 파일 경로
  - material_id: 자료 ID (예: 'nicolas-1')
  - language: ISO 코드 (예: 'fr')
  - overrides (선택): 사용자 수동 조정 (sentence start/end)

출력:
  - shadowing/audio/{id}/full.mp3, sentences/, paragraphs/, segments/
  - shadowing/data/{id}.json
  - shadowing/data/materials.json (자동 업데이트)
  - shadowing/data/{id}_report.json (검증 결과)

사용:
  python3 pipeline.py --config configs/nicolas-1.json
"""
import argparse, json, os, re, subprocess, sys, unicodedata, difflib, shutil
from pathlib import Path

# ============================================================
# 상수 & 설정
# ============================================================
UPPER = 'A-ZÀÁÂÄÉÈÊËÎÏÔÖÙÚÛÜÇŒ'

# 문장 분리 패턴 (공통)
SPLIT_PATTERN = (
    r'(?:'
    rf'(?<=[.!?])\s+(?=[«"{UPPER}])'        # 1. 마침표/!/? 후
    rf'|(?<=»)\s+(?=[«"{UPPER}])'            # 2. 인용 종료 후
    r'|(?<=:)\s+(?=«)'                       # 3. 콜론 + 인용
    rf'|(?<=\s)[—–]\s+(?=[{UPPER}])'         # 4. em dash 다양한 형태
    r'|;\s+(?=\w)'                           # 5. 세미콜론
    r')'
)

# 짧은 인용 마스킹 기준
SHORT_QUOTE_MAX_WORDS = 4

# 너무 짧은 단편 병합 임계값 (단어 수)
MIN_FRAGMENT_WORDS = 2


# ============================================================
# 정규화
# ============================================================
def normalize_word(t):
    t = unicodedata.normalize('NFC', t.lower())
    t = re.sub(r"[«»\"'’‘“”\-—–\(\):;,.!?…]", "", t)
    return t.strip()


def phonetic_equivalent(w1, w2):
    """프랑스어 발음 동일 단어 매칭."""
    n1, n2 = normalize_word(w1), normalize_word(w2)
    if n1 == n2:
        return True
    # 끝 자음 (s, x, t) 생략
    for suffix in ['s', 'x', 't', 'e', 'es', 'er', 'ée', 'ées']:
        if n1 + suffix == n2 or n2 + suffix == n1:
            return True
    # 한 글자 차이 (악센트, e/é 등) — Levenshtein 1
    if abs(len(n1) - len(n2)) <= 1 and levenshtein(n1, n2) <= 1:
        return True
    return False


def levenshtein(a, b):
    if len(a) < len(b):
        return levenshtein(b, a)
    if len(b) == 0:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, c1 in enumerate(a):
        cur = [i + 1]
        for j, c2 in enumerate(b):
            ins = prev[j + 1] + 1
            dele = cur[j] + 1
            sub = prev[j] + (c1 != c2)
            cur.append(min(ins, dele, sub))
        prev = cur
    return prev[-1]


# ============================================================
# 문장 분리
# ============================================================
def split_sentences(text):
    """대문자 확장 + ; + em dash 변형 + 짧은 인용 마스킹."""
    # 마스킹 영역 (짧은 « ... » )
    masked_ranges = []
    for m in re.finditer(r'«([^»]{1,40})»', text):
        inside = m.group(1).strip()
        if len(inside.split()) <= SHORT_QUOTE_MAX_WORDS:
            masked_ranges.append((m.start(), m.end()))

    def in_masked(pos):
        return any(s <= pos < e for s, e in masked_ranges)

    parts = []
    last = 0
    for m in re.finditer(SPLIT_PATTERN, text):
        if in_masked(m.start()):
            continue
        parts.append(text[last:m.start() + (1 if text[m.start()] in '.!?»;' else 0)].strip())
        last = m.end()
    parts.append(text[last:].strip())

    # 단순 split + 보정
    parts = re.split(SPLIT_PATTERN, text) if not parts or len(parts) == 1 else parts
    parts = [p.strip() for p in parts if p.strip()]

    # 너무 짧은 단편 병합
    final = []
    for p in parts:
        if final and len(p.split()) < MIN_FRAGMENT_WORDS:
            final[-1] += ' ' + p
        else:
            final.append(p)
    return final


# ============================================================
# 참조 텍스트 정리
# ============================================================
def clean_reference(text):
    """줄바꿈 처리, 따옴표 정규화, 악센트 정정."""
    # 라인 단위로 합침
    text = ' '.join(text.split())
    # 따옴표 정규화
    text = text.replace('’', "'").replace('‘', "'")
    text = text.replace('“', '"').replace('”', '"')
    # 일반적인 PDF 변환 오류 정정
    fixes = [
        (', a côté ', ', à côté '),
        (' A part ', ' À part '),
    ]
    for old, new in fixes:
        text = text.replace(old, new)
    return text


# ============================================================
# 오디오 추출
# ============================================================
def extract_audio(source, out_mp3):
    """YouTube URL 또는 로컬 파일."""
    if source.startswith('http'):
        subprocess.run([
            'yt-dlp', '-x', '--audio-format', 'mp3', '--audio-quality', '0',
            '-o', out_mp3, source
        ], check=True)
    else:
        shutil.copy(source, out_mp3)


# ============================================================
# Whisper transcribe (word-level)
# ============================================================
def whisper_transcribe(mp3, language, model_path):
    """word-level timestamps JSON 반환."""
    wav = '/tmp/pipeline_tmp.wav'
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error', '-i', mp3,
        '-ar', '16000', '-ac', '1', wav
    ], check=True)
    out = '/tmp/pipeline_w'
    subprocess.run([
        'whisper-cli', '-m', model_path, '-l', language,
        '-ojf', '-of', out, wav
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with open(f'{out}.json') as f:
        return json.load(f)


# ============================================================
# Whisper 결과에서 word stream 추출
# ============================================================
def extract_whisper_words(raw):
    """raw transcription → flat word list with timestamps."""
    all_tokens = []
    for seg in raw['transcription']:
        for tok in seg.get('tokens', []):
            t = tok['text']
            if t.startswith('[_') or not t.strip():
                continue
            all_tokens.append({
                'text': t,
                'start': tok['offsets']['from'] / 1000,
                'end': tok['offsets']['to'] / 1000,
            })

    # 환각 제거 (잘 알려진 패턴)
    HALLUCINATION = ['Sous-titrage', 'Société Radio-Canada', 'sous-titres', 'Musique']
    filtered = [t for t in all_tokens
                if not any(h in t['text'] for h in HALLUCINATION)]

    # sub-word → 단어 합치기 (공백 시작이 새 단어).
    # 단어 직후 punctuation 토큰은 word.end에 흡수 (끝 자음 release + 약한 pause 포함).
    words = []
    i = 0
    while i < len(filtered):
        cur = filtered[i]['text']
        s = i; j = i + 1
        while j < len(filtered):
            nt = filtered[j]['text']
            if nt.startswith(' ') or re.match(r'^[.,;:!?…]', nt):
                break
            cur += nt
            j += 1
        word_end = filtered[j - 1]['end']
        # 다음 토큰이 punctuation이면 그 end까지 흡수
        while j < len(filtered) and re.match(r'^[.,;:!?…]', filtered[j]['text']):
            word_end = filtered[j]['end']
            j += 1
        nw = normalize_word(cur)
        if nw:
            words.append({
                'text': nw,
                'start': filtered[s]['start'],
                'end': word_end,
            })
        i = j
    return words


# ============================================================
# 단어 align: PDF ↔ Whisper
# ============================================================
def align_words(pdf_words, whisper_words):
    """
    PDF 단어 stream에 timestamps 할당.
    difflib + 발음 동일 매칭 보강.
    """
    pdf_norm = [normalize_word(w) for w in pdf_words]
    wh_norm = [w['text'] for w in whisper_words]

    # difflib 매칭 (발음 동일 단어를 같은 것으로 인정)
    # → autojunk=False, junk=None, 발음 동일 → equal로 처리
    # 단순 접근: 1차 align + 2차 발음 동일 보강
    sm = difflib.SequenceMatcher(None, pdf_norm, wh_norm, autojunk=False)
    pdf_time = [None] * len(pdf_norm)

    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == 'equal':
            for k in range(i2 - i1):
                w = whisper_words[j1 + k]
                pdf_time[i1 + k] = (w['start'], w['end'])
        elif tag == 'replace':
            # 발음 동일 단어 추가 매칭
            for k in range(min(i2 - i1, j2 - j1)):
                if phonetic_equivalent(pdf_norm[i1 + k], wh_norm[j1 + k]):
                    w = whisper_words[j1 + k]
                    pdf_time[i1 + k] = (w['start'], w['end'])

    # 보간
    for i in range(len(pdf_time)):
        if pdf_time[i] is None:
            prev = i - 1
            while prev >= 0 and pdf_time[prev] is None:
                prev -= 1
            nxt = i + 1
            while nxt < len(pdf_time) and pdf_time[nxt] is None:
                nxt += 1
            if prev >= 0 and nxt < len(pdf_time):
                gap = (pdf_time[nxt][0] - pdf_time[prev][1]) / (nxt - prev)
                pdf_time[i] = (
                    pdf_time[prev][1] + gap * (i - prev - 1),
                    pdf_time[prev][1] + gap * (i - prev)
                )
            elif prev >= 0:
                pdf_time[i] = (pdf_time[prev][1], pdf_time[prev][1] + 0.1)
            elif nxt < len(pdf_time):
                pdf_time[i] = (pdf_time[nxt][0] - 0.1, pdf_time[nxt][0])
            else:
                pdf_time[i] = (0, 0.1)
    return pdf_time


# ============================================================
# silence detection (ffmpeg)
# ============================================================
def detect_silences(mp3, noise_db='-30dB', min_duration=0.2):
    """ffmpeg silencedetect → [(silence_start, silence_end), ...] (초)."""
    result = subprocess.run([
        'ffmpeg', '-i', mp3,
        '-af', f'silencedetect=noise={noise_db}:d={min_duration}',
        '-f', 'null', '-'
    ], capture_output=True, text=True)
    silences = []
    cur_start = None
    for line in result.stderr.splitlines():
        m = re.search(r'silence_start: ([\d.]+)', line)
        if m:
            cur_start = float(m.group(1))
            continue
        m = re.search(r'silence_end: ([\d.]+)', line)
        if m and cur_start is not None:
            silences.append((cur_start, float(m.group(1))))
            cur_start = None
    return silences


# ============================================================
# silence 기반 경계 보정
# ============================================================
def refine_boundaries(sentences, silences, window=1.2, pad=0.05):
    """
    각 sentence의 start/end를 가장 가까운 silence boundary로 snap.
    - start가 silence 내부 → silence end + pad로 밀어줌 (군더더기 제거)
    - silence가 start 직전 (window 내) → silence end + pad로 snap
    - end가 silence 내부 → silence start + pad로 당김 (trailing 잘림 방지)
    - silence가 end 직후 (window 내) → silence start + pad로 snap
    인접 sentence와의 충돌은 막는다.
    """
    silences_sorted = sorted(silences)
    refined_count = 0
    for i, s in enumerate(sentences):
        orig_start, orig_end = s['start'], s['end']

        # ---- START snap ----
        new_start = s['start']
        best_diff = float('inf')
        for sil_s, sil_e in silences_sorted:
            if sil_e < s['start'] - window:
                continue
            if sil_s > s['start'] + window:
                break
            # case A: start가 silence 내부
            if sil_s <= s['start'] < sil_e:
                new_start = sil_e + pad
                best_diff = 0
                break
            # case B: silence가 start 직전 (또는 직후 짧게)
            diff = abs(s['start'] - sil_e)
            if diff < window and diff < best_diff:
                best_diff = diff
                new_start = sil_e + pad

        # ---- END snap ----
        new_end = s['end']
        best_diff = float('inf')
        for sil_s, sil_e in silences_sorted:
            if sil_e < s['end'] - window:
                continue
            if sil_s > s['end'] + window:
                break
            # case A: end가 silence 내부 → silence start로 (+pad)
            if sil_s < s['end'] <= sil_e:
                new_end = sil_s + pad
                best_diff = 0
                break
            # case B: silence가 end 직후 시작
            diff = abs(sil_s - s['end'])
            if diff < window and diff < best_diff:
                best_diff = diff
                new_end = sil_s + pad

        # 인접 sentence와 충돌 방지
        if i > 0:
            new_start = max(new_start, sentences[i - 1]['end'] + 0.03)
        if i + 1 < len(sentences):
            new_end = min(new_end, sentences[i + 1]['start'] - 0.03)
        # start < end 보장
        if new_end <= new_start + 0.1:
            new_end = new_start + 0.1

        if abs(new_start - orig_start) > 0.02 or abs(new_end - orig_end) > 0.02:
            refined_count += 1
        s['start'] = round(new_start, 3)
        s['end'] = round(new_end, 3)
    return refined_count


# ============================================================
# mp3 frame-accurate cut
# ============================================================
def cut_mp3(src, start, dur, out):
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error', '-i', src,
        '-ss', f'{start:.3f}', '-t', f'{dur:.3f}',
        '-c:a', 'libmp3lame', '-b:a', '128k', out
    ], check=True)


def concat_with_silence(files, silence_path, out):
    lf = '/tmp/pipeline_concat.txt'
    with open(lf, 'w') as f:
        for k, mp3 in enumerate(files):
            f.write(f"file '{os.path.abspath(mp3)}'\n")
            if k < len(files) - 1:
                f.write(f"file '{silence_path}'\n")
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error',
        '-f', 'concat', '-safe', '0', '-i', lf,
        '-c:a', 'libmp3lame', '-b:a', '128k', out
    ], check=True)


def make_silence(duration, out):
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error',
        '-f', 'lavfi', '-i', f'anullsrc=r=44100:cl=mono',
        '-t', str(duration),
        '-c:a', 'libmp3lame', '-b:a', '128k', out
    ], check=True)


# ============================================================
# 단일 sentence 검증 (word timestamp 활용)
# ============================================================
LEADING_NOISE_THRESHOLD = 0.4   # 시작에 0.4s 이상 비음성 → 군더더기
TRAILING_NOISE_THRESHOLD = 0.5  # 끝에 0.5s 이상 비음성 → 군더더기
TARGET_PADDING = 0.15           # 보정 후 남길 padding


def validate_sentence(mp3, expected_text, language, model_path, mp3_duration):
    """
    Returns dict with word-level boundary check:
      - actual_text
      - start_ok, end_ok (단어 누락 여부)
      - missing_start, missing_end (단어 수)
      - leading_silence (시작에서 첫 단어까지 거리, 초)
      - trailing_silence (마지막 단어부터 끝까지 거리, 초)
      - category: 'OK' | 'REAL_CUT_END' | 'REAL_CUT_START'
                  | 'EXTRA_AT_START' | 'EXTRA_AT_END' | 'FALSE_POSITIVE'
    """
    raw = whisper_transcribe(mp3, language, model_path)
    actual_text = ''.join(s['text'] for s in raw['transcription']).strip()
    actual_word_objs = extract_whisper_words(raw)
    actual_words = [w['text'] for w in actual_word_objs]
    expected_words = [normalize_word(w) for w in expected_text.split() if normalize_word(w)]

    if not expected_words:
        return {'category': 'OK', 'actual_text': actual_text,
                'leading_silence': 0, 'trailing_silence': 0}

    def matches(w1, w2):
        return phonetic_equivalent(w1, w2)

    # word timestamp 기반 경계 거리
    # leading: expected 첫 단어가 실제로 등장한 시점까지 (hallucination 무시)
    leading_silence = 0
    if actual_word_objs:
        leading_silence = actual_word_objs[0]['start']
        for wo in actual_word_objs[:5]:
            if matches(wo['text'], expected_words[0]):
                leading_silence = wo['start']
                break
    # trailing: expected 마지막 단어 end부터 mp3 끝까지
    trailing_silence = 0
    if actual_word_objs:
        trailing_silence = mp3_duration - actual_word_objs[-1]['end']
        for wo in reversed(actual_word_objs[-5:]):
            if matches(wo['text'], expected_words[-1]):
                trailing_silence = mp3_duration - wo['end']
                break

    # 단어 누락 여부
    end_ok = bool(actual_words) and any(matches(expected_words[-1], aw) for aw in actual_words[-3:])
    start_ok = bool(actual_words) and any(matches(expected_words[0], aw) for aw in actual_words[:3])

    missing_end = 0
    if not end_ok:
        for i in range(len(expected_words) - 1, -1, -1):
            if any(matches(expected_words[i], aw) for aw in actual_words):
                missing_end = len(expected_words) - 1 - i
                break
        else:
            missing_end = len(expected_words)

    missing_start = 0
    if not start_ok:
        for i in range(len(expected_words)):
            if any(matches(expected_words[i], aw) for aw in actual_words):
                missing_start = i
                break
        else:
            missing_start = len(expected_words)

    # 카테고리: 우선순위 = 단어 누락 > 군더더기
    category = 'OK'
    if not end_ok and missing_end > 0:
        category = 'REAL_CUT_END'
    elif not start_ok and missing_start > 0:
        category = 'REAL_CUT_START'
    elif leading_silence > LEADING_NOISE_THRESHOLD:
        category = 'EXTRA_AT_START'
    elif trailing_silence > TRAILING_NOISE_THRESHOLD:
        category = 'EXTRA_AT_END'

    # 단어 누락 의심이지만 sequence 비교 시 거의 같으면 false positive
    if category in ['REAL_CUT_END', 'REAL_CUT_START']:
        sm = difflib.SequenceMatcher(None, expected_words, actual_words)
        if sm.ratio() > 0.85:
            category = 'FALSE_POSITIVE'

    return {
        'actual_text': actual_text,
        'start_ok': start_ok,
        'end_ok': end_ok,
        'missing_start': missing_start,
        'missing_end': missing_end,
        'leading_silence': round(leading_silence, 3),
        'trailing_silence': round(trailing_silence, 3),
        'category': category,
    }


# ============================================================
# 자동 보정 (충돌 시 양쪽 sentence 동시 조정)
# ============================================================
def auto_fix(sentences, idx, validation, raw_mp3, sents_dir, language, model_path):
    """REAL_CUT / EXTRA 케이스 보정. 보정한 sentence index 집합 리턴 (재검증용)."""
    s = sentences[idx]
    cat = validation['category']
    mp3 = f'{sents_dir}/{idx+1:03d}.mp3'

    # 군더더기 trim (silence-snap이 못 잡은 잔여)
    if cat == 'EXTRA_AT_START':
        trim = max(0, validation['leading_silence'] - TARGET_PADDING)
        if trim > 0.05:
            s['start'] = round(s['start'] + trim, 3)
            cut_mp3(raw_mp3, s['start'], s['end'] - s['start'], mp3)
            return True
        return False
    if cat == 'EXTRA_AT_END':
        trim = max(0, validation['trailing_silence'] - TARGET_PADDING)
        if trim > 0.05:
            s['end'] = round(s['end'] - trim, 3)
            cut_mp3(raw_mp3, s['start'], s['end'] - s['start'], mp3)
            return True
        return False

    if cat == 'REAL_CUT_END':
        extend = validation['missing_end'] * 0.4 + 0.3
        if idx + 1 < len(sentences):
            next_start = sentences[idx + 1]['start']
            new_end = min(s['end'] + extend, next_start - 0.03)
            if new_end <= s['end']:
                # 다음 sentence start도 같이 늦춤
                shrink = min(extend, sentences[idx + 1]['end'] - next_start - 0.5)
                if shrink > 0:
                    sentences[idx + 1]['start'] += shrink
                    new_end = s['end'] + shrink
                    next_mp3 = f'{sents_dir}/{idx+2:03d}.mp3'
                    cut_mp3(raw_mp3, sentences[idx + 1]['start'],
                            sentences[idx + 1]['end'] - sentences[idx + 1]['start'], next_mp3)
        else:
            new_end = s['end'] + extend
        if new_end > s['end']:
            s['end'] = round(new_end, 3)
            cut_mp3(raw_mp3, s['start'], s['end'] - s['start'], mp3)
            return True

    elif cat == 'REAL_CUT_START':
        extend = validation['missing_start'] * 0.4 + 0.3
        if idx > 0:
            prev_end = sentences[idx - 1]['end']
            new_start = max(s['start'] - extend, prev_end + 0.03)
            if new_start >= s['start']:
                # 이전 sentence end도 같이 줄임
                shrink = min(extend, prev_end - sentences[idx - 1]['start'] - 0.5)
                if shrink > 0:
                    sentences[idx - 1]['end'] -= shrink
                    new_start = s['start'] - shrink
                    prev_mp3 = f'{sents_dir}/{idx:03d}.mp3'
                    cut_mp3(raw_mp3, sentences[idx - 1]['start'],
                            sentences[idx - 1]['end'] - sentences[idx - 1]['start'], prev_mp3)
        else:
            new_start = max(0, s['start'] - extend)
        if new_start < s['start']:
            s['start'] = round(new_start, 3)
            cut_mp3(raw_mp3, s['start'], s['end'] - s['start'], mp3)
            return True

    return False


# ============================================================
# 메인 파이프라인
# ============================================================
def run(config):
    print(f"=== {config['title']} 파이프라인 시작 ===\n")

    base_dir = Path(config['base_dir'])
    audio_dir = base_dir / 'audio' / config['material_id']
    data_dir = base_dir / 'data'
    audio_dir.mkdir(parents=True, exist_ok=True)
    data_dir.mkdir(parents=True, exist_ok=True)

    # 1. 오디오 추출
    raw_mp3 = audio_dir / 'source.mp3'
    if not raw_mp3.exists() or config.get('force_reextract'):
        print("[1/8] 오디오 추출...")
        extract_audio(config['audio_source'], str(raw_mp3))
    else:
        print("[1/8] 오디오 추출... (캐시 사용)")

    # 2. Whisper transcribe
    whisper_cache = data_dir / f"{config['material_id']}_whisper.json"
    if not whisper_cache.exists() or config.get('force_whisper'):
        print("[2/8] Whisper transcribe...")
        raw = whisper_transcribe(str(raw_mp3), config['language'], config['whisper_model'])
        with open(whisper_cache, 'w') as f:
            json.dump(raw, f, ensure_ascii=False)
    else:
        print("[2/8] Whisper transcribe... (캐시 사용)")
        with open(whisper_cache) as f:
            raw = json.load(f)

    # 3. 참조 텍스트 정리
    print("[3/8] 참조 텍스트 정리...")
    with open(config['reference_text']) as f:
        ref = f.read()
    ref = clean_reference(ref)

    # 챕터 제목 + 본문 sentence 분리
    if config.get('title_text'):
        # 본문 분리
        body_sentences = split_sentences(ref)
        sentences_text = [config['title_text']] + body_sentences
    else:
        sentences_text = split_sentences(ref)
    print(f"  → 초기 sentence 분리: {len(sentences_text)}개")

    # 4. word align
    print("[4/8] PDF ↔ Whisper word align...")
    whisper_words = extract_whisper_words(raw)
    pdf_words = []
    pdf_sent_idx = []
    for s_i, st in enumerate(sentences_text):
        for w in st.split():
            if normalize_word(w):
                pdf_words.append(w)
                pdf_sent_idx.append(s_i)
    pdf_time = align_words(pdf_words, whisper_words)
    print(f"  → Whisper 단어: {len(whisper_words)}, PDF 단어: {len(pdf_words)}")

    # 5. sentences 구성 (timestamps 할당) + silence-snap 경계 보정
    print("[5/8] sentences 구성 + silence-snap...")
    sentences = []
    for s_i, text in enumerate(sentences_text):
        word_indices = [i for i, si in enumerate(pdf_sent_idx) if si == s_i]
        if not word_indices:
            continue
        start = pdf_time[word_indices[0]][0]
        end = pdf_time[word_indices[-1]][1]
        sentences.append({
            'text': text,
            'start': round(start, 3),
            'end': round(end, 3),
            'word_count': len(word_indices),
        })

    # align timestamps에 기본 padding (silence-snap이 잡지 못하는 케이스 대비)
    pad_lead = config.get('default_lead_pad', 0.05)
    pad_tail = config.get('default_tail_pad', 0.2)
    for i, s in enumerate(sentences):
        s['start'] = round(max(0, s['start'] - pad_lead), 3)
        s['end'] = round(s['end'] + pad_tail, 3)
    # 인접 sentence 겹침 방지
    for i in range(len(sentences) - 1):
        if sentences[i]['end'] >= sentences[i + 1]['start']:
            mid = (sentences[i]['end'] + sentences[i + 1]['start']) / 2
            sentences[i]['end'] = round(mid - 0.015, 3)
            sentences[i + 1]['start'] = round(mid + 0.015, 3)

    # silence detection (캐싱) + boundary refinement
    silence_cache = data_dir / f"{config['material_id']}_silences.json"
    noise_db = config.get('silence_noise_db', '-30dB')
    silence_min = config.get('silence_min_duration', 0.2)
    if not silence_cache.exists() or config.get('force_silence'):
        silences = detect_silences(str(raw_mp3), noise_db=noise_db, min_duration=silence_min)
        with open(silence_cache, 'w') as f:
            json.dump(silences, f)
    else:
        with open(silence_cache) as f:
            silences = json.load(f)
    refined = refine_boundaries(sentences, silences,
                                window=config.get('snap_window', 1.2),
                                pad=config.get('snap_pad', 0.05))
    print(f"  → silence {len(silences)}개 / 경계 보정 {refined}건")

    # User overrides (마지막 적용 — 항상 우선)
    overrides = config.get('overrides', {})
    for k, v in overrides.items():
        idx = int(k) - 1
        if 0 <= idx < len(sentences):
            for field in ['start', 'end']:
                if field in v:
                    sentences[idx][field] = v[field]
            print(f"  override #{idx+1}: {v}")

    # 6. mp3 분할 (frame-accurate)
    print("[6/8] mp3 분할...")
    sents_dir = audio_dir / 'sentences'
    if sents_dir.exists():
        shutil.rmtree(sents_dir)
    sents_dir.mkdir()
    for i, s in enumerate(sentences):
        out = f'{sents_dir}/{i+1:03d}.mp3'
        dur = max(0.1, s['end'] - s['start'])
        cut_mp3(str(raw_mp3), s['start'], dur, out)
        s['audio_file'] = f'audio/{config["material_id"]}/sentences/{i+1:03d}.mp3'
    print(f"  → {len(sentences)} sentences 추출")

    # 7. 검증 + 자동 보정 (REAL_CUT + EXTRA)
    print("[7/8] Whisper 재검증 + 자동 보정...")
    report = []
    fixed_count = 0
    for i, s in enumerate(sentences):
        for attempt in range(4):
            dur = s['end'] - s['start']
            v = validate_sentence(f'{sents_dir}/{i+1:03d}.mp3', s['text'],
                                  config['language'], config['whisper_model'],
                                  mp3_duration=dur)
            if v['category'] in ['OK', 'FALSE_POSITIVE']:
                break
            if not auto_fix(sentences, i, v, str(raw_mp3), str(sents_dir),
                            config['language'], config['whisper_model']):
                break
            fixed_count += 1
        report.append({
            'idx': i + 1,
            'text_preview': s['text'][:60],
            'duration': round(s['end'] - s['start'], 2),
            **v,
        })
        if (i + 1) % 10 == 0:
            print(f"  검증 진행: {i+1}/{len(sentences)}")

    issues = [r for r in report if r['category'] not in ['OK', 'FALSE_POSITIVE']]
    print(f"  → 보정 {fixed_count}회, 미해결 {len(issues)}개")

    # 8. paragraphs / segments / full
    print("[8/8] paragraph/segment/full 생성...")
    silence = audio_dir / 'silence.mp3'
    make_silence(config.get('silence_sec', 0.3), str(silence))

    para_dir = audio_dir / 'paragraphs'
    seg_dir = audio_dir / 'segments'
    for d in [para_dir, seg_dir]:
        if d.exists():
            shutil.rmtree(d)
        d.mkdir()

    paragraphs = []
    i = 0
    while i < len(sentences):
        chunk = sentences[i:i + 5]
        files = [f'{sents_dir}/{j+1:03d}.mp3' for j in range(i, i + len(chunk))]
        out = f'{para_dir}/{len(paragraphs)+1:03d}.mp3'
        concat_with_silence(files, str(silence), out)
        paragraphs.append({
            'text': ' '.join(s['text'] for s in chunk),
            'start': chunk[0]['start'],
            'end': chunk[-1]['end'],
            'sentence_count': len(chunk),
            'audio_file': f'audio/{config["material_id"]}/paragraphs/{len(paragraphs)+1:03d}.mp3',
        })
        i += 5

    target_seg = config.get('segment_target_sec', 60)
    segs = []
    current = None
    cur_range = [0, 0]
    for i, s in enumerate(sentences):
        if current is None:
            current = {'text': '', 'start': s['start'], 'end': s['end'], 'sentence_count': 0}
            cur_range = [i, i]
        current['text'] = (current['text'] + ' ' + s['text']).strip()
        current['end'] = s['end']
        current['sentence_count'] += 1
        cur_range[1] = i
        if current['end'] - current['start'] >= target_seg:
            files = [f'{sents_dir}/{j+1:03d}.mp3' for j in range(cur_range[0], cur_range[1] + 1)]
            out = f'{seg_dir}/{len(segs)+1:03d}.mp3'
            concat_with_silence(files, str(silence), out)
            current['audio_file'] = f'audio/{config["material_id"]}/segments/{len(segs)+1:03d}.mp3'
            segs.append(current)
            current = None
    if current:
        files = [f'{sents_dir}/{j+1:03d}.mp3' for j in range(cur_range[0], cur_range[1] + 1)]
        out = f'{seg_dir}/{len(segs)+1:03d}.mp3'
        concat_with_silence(files, str(silence), out)
        current['audio_file'] = f'audio/{config["material_id"]}/segments/{len(segs)+1:03d}.mp3'
        segs.append(current)

    all_files = [f'{sents_dir}/{i+1:03d}.mp3' for i in range(len(sentences))]
    concat_with_silence(all_files, str(silence), str(audio_dir / 'full.mp3'))

    # 데이터 저장
    silence_sec = config.get('silence_sec', 0.3)
    total = sum(s['end'] - s['start'] for s in sentences) + (len(sentences) - 1) * silence_sec

    data = {
        'meta': {
            'title': config['title'],
            'youtube_url': config.get('source_url', config['audio_source']),
            'audio_full': f'audio/{config["material_id"]}/full.mp3',
            'duration': round(total, 2),
            'source': config.get('source_label', ''),
        },
        'sentences': sentences,
        'paragraphs': paragraphs,
        'segments': segs,
        'full_text': ' '.join(s['text'] for s in sentences),
    }

    with open(data_dir / f"{config['material_id']}.json", 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # materials.json 업데이트
    mats_path = data_dir / 'materials.json'
    if mats_path.exists():
        with open(mats_path) as f:
            mats = json.load(f)
    else:
        mats = {'materials': []}
    mats['materials'] = [m for m in mats['materials'] if m['id'] != config['material_id']]
    mats['materials'].append({
        'id': config['material_id'],
        'title': config['title'],
        'subtitle': config.get('subtitle', ''),
        'author': config.get('author', ''),
        'duration_sec': round(total),
        'sentence_count': len(sentences),
        'paragraph_count': len(paragraphs),
        'segment_count': len(segs),
        'source_url': config.get('source_url', config['audio_source']),
        'data_file': f"data/{config['material_id']}.json",
    })
    with open(mats_path, 'w', encoding='utf-8') as f:
        json.dump(mats, f, ensure_ascii=False, indent=2)

    # 보고서 저장
    with open(data_dir / f"{config['material_id']}_report.json", 'w') as f:
        json.dump({
            'total': len(sentences),
            'auto_fixes': fixed_count,
            'unresolved_issues': len(issues),
            'issues': issues,
            'category_counts': {
                cat: sum(1 for r in report if r['category'] == cat)
                for cat in set(r['category'] for r in report)
            }
        }, f, ensure_ascii=False, indent=2)

    print(f"\n=== 완료 ===")
    print(f"sentences: {len(sentences)}")
    print(f"paragraphs: {len(paragraphs)}")
    print(f"segments: {len(segs)}")
    print(f"전체 길이: {total:.1f}초")
    print(f"자동 보정 횟수: {fixed_count}")
    print(f"미해결 이슈: {len(issues)}")
    if issues:
        print("\n미해결 sentence:")
        for iss in issues[:10]:
            print(f"  #{iss['idx']} [{iss['category']}] {iss['text_preview']}")


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--config', required=True)
    args = ap.parse_args()
    with open(args.config) as f:
        config = json.load(f)
    run(config)
