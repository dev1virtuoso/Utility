import gradio as gr
import re
import json
import urllib.request
import urllib.error
import urllib.parse
import time
import os

MODEL = os.environ.get("TERMS_MODEL", "qwen3.5:9b")
OLLAMA_GEN_URL = os.environ.get("OLLAMA_GEN_URL", "http://127.0.0.1:11434/api/generate")

# 稍微放大 Chunk，減少總分塊數量，並拉長 Timeout
CHUNK_SIZE = 60 
OVERLAP_SIZE = 20 
CHUNK_TIMEOUT = 180 # 推理模型需要更多時間

def detect_lang(text: str) -> str:
    cjk = len(re.findall(r'[\u4e00-\u9fff\u3400-\u4dbf]', text))
    latin = len(re.findall(r'[A-Za-z]', text))
    total = cjk + latin
    if total == 0: return "en"
    ratio = cjk / total
    if ratio > 0.7: return "zh"
    if ratio < 0.3: return "en"
    return "mixed"

def split_into_chunks(text: str, chunk_size: int, overlap: int):
    sentences = re.split(r'(?<=[。！？；，\n\.\!\?\;\,])', text)
    chunks = []
    current_chunk = ""
    for sentence in sentences:
        if not sentence.strip(): continue
        if len(current_chunk) + len(sentence) > chunk_size and current_chunk:
            chunks.append(current_chunk.strip())
            current_chunk = current_chunk[-overlap:] + sentence
        else:
            current_chunk += sentence
    if current_chunk.strip(): chunks.append(current_chunk.strip())
    return chunks

def build_prompt(text_chunk: str, lang: str) -> str:
    if lang == "zh":
        return f"""你是一個專業的術語解釋系統。
【嚴格指令】
1. 絕對不要輸出任何思考過程、解釋、或 Markdown 標記（不要用 ```json）。
2. 你的回答必須以 {{ 開始，並以 }} 結束。
3. 找出句子中的專業術語、英文縮寫。
4. 只返回以下純 JSON 格式：
{{
  "terms": [
    {{
      "term": "術語名稱",
      "explanation": "解釋內容",
      "search_keyword": "Google 搜尋關鍵字"
    }}
  ]
}}
如果沒有術語，返回 {{"terms": []}}。

句子：{text_chunk}"""
    else:
        return f"""You are a terminology extraction system.
【STRICT RULES】
1. DO NOT output any thinking process, explanations, or Markdown formatting (no ```json).
2. Your response MUST start with {{ and end with }}.
3. Extract professional terms and abbreviations.
4. Return ONLY pure JSON in this format:
{{
  "terms": [
    {{
      "term": "term",
      "explanation": "explanation",
      "search_keyword": "keyword"
    }}
  ]
}}
If no terms, return {{"terms": []}}.

Sentence: {text_chunk}"""

def _extract_json(raw: str):
    """強力提取 JSON，無視模型前面的廢話"""
    if not raw: return None
    
    # 嘗試直接解析
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # 使用 raw_decode 找出第一個合法的 JSON 對象
    decoder = json.JSONDecoder()
    for i, char in enumerate(raw):
        if char == '{':
            try:
                obj, _ = decoder.raw_decode(raw[i:])
                return obj
            except json.JSONDecodeError:
                continue
    return None

def process_single_chunk(text_chunk: str) -> str:
    if not text_chunk or len(text_chunk.strip()) < 2:
        return ""

    lang = detect_lang(text_chunk)
    prompt = build_prompt(text_chunk, lang)

    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "think": False, # 關鍵：告訴 Ollama 如果模型支援，請關閉思考模式
        "options": {
            "temperature": 0.1, 
            "num_predict": 8192, # 關鍵：加大額度，避免思考把額度吃光
            "stop": ["```"] # 如果模型還是想加 markdown，強制它停下
        }
    }

    try:
        req = urllib.request.Request(
            OLLAMA_GEN_URL,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        with urllib.request.urlopen(req, timeout=CHUNK_TIMEOUT) as response:
            result = json.loads(response.read().decode('utf-8'))
            raw = (result.get("response") or "").strip()

            # 如果 response 空的，嘗試從 thinking 抽（Qwen 的備用方案）
            if not raw and result.get("thinking"):
                raw = result.get("thinking", "").strip()

            if not raw:
                return "⚠️ Empty API response"

            data = _extract_json(raw)
            if data is None:
                safe_raw = raw[:300].replace('\n', ' ')
                return f"⚠️ JSON Parse Failed: {safe_raw}..."

            terms = data.get("terms", []) if isinstance(data, dict) else []
            if not terms:
                return "無明顯術語"

            md = ""
            seen = set()
            for t in terms:
                term = str(t.get("term", "")).strip()
                exp = str(t.get("explanation", "")).strip()
                kw = str(t.get("search_keyword", "")).strip() or term
                
                if not term or term.lower() in seen: continue
                seen.add(term.lower())
                
                safe_kw = urllib.parse.quote(kw, safe="")
                md += (
                    f"**{term}**: {exp}\n"
                    f"→ [Google Search](https://www.google.com/search?q={safe_kw})\n\n"
                )
            return md if md else "無明顯術語"

    except urllib.error.URLError as e:
        reason = getattr(e, 'reason', e)
        if isinstance(reason, TimeoutError):
            return f"❌ 超時 ({CHUNK_TIMEOUT}s)"
        return f"❌ 連線失敗: {reason}"
    except TimeoutError:
        return f"❌ 超時 ({CHUNK_TIMEOUT}s)"
    except Exception as e:
        return f"❌ 錯誤: {type(e).__name__}: {e}"

def process_text(text: str):
    if not text or not text.strip():
        yield "", "0.0s", "", ""
        return

    start_time = time.time()
    chunks = split_into_chunks(text, CHUNK_SIZE, OVERLAP_SIZE)
    total_chunks = len(chunks)

    if total_chunks == 0:
        yield "", "0.0s", "", ""
        return

    results = [None] * total_chunks

    initial_debug = "\n\n".join([f"--- Chunk {i+1} ---\n(處理中...)" for i in range(total_chunks)])
    yield f"⏳ 準備處理 {total_chunks} 個分塊...", "⏱️ 0.0 秒", "", initial_debug

    for i, chunk in enumerate(chunks):
        if len(chunk.strip()) < 2:
            results[i] = "(empty chunk)"
        else:
            results[i] = process_single_chunk(chunk)

        current_debug = "\n\n".join([
            f"--- Chunk {j + 1} ---\n{res if res is not None else '(處理中...)'}"
            for j, res in enumerate(results)
        ])
        
        elapsed = time.time() - start_time
        yield f"⏳ 已完成 {i+1}/{total_chunks} 個分塊...", f"⏱️ {elapsed:.1f} 秒", "", current_debug

    elapsed = time.time() - start_time
    timer_str = f"✅ 總耗時: {elapsed:.1f} 秒"
    
    lang = detect_lang(text)
    lang_label = {"zh": "Chinese", "en": "English", "mixed": "Mixed"}.get(lang, "English")

    valid_results = [
        res for res in results 
        if res and res != "(empty chunk)" and "無明顯術語" not in res and "⚠️" not in res and "❌" not in res
    ]

    md = f"### Original Text ({lang_label})\n{text}\n\n### Term Explanations\n\n"
    if not valid_results:
        md += "_(No obvious terms detected)_\n"
    else:
        md += "\n\n---\n\n".join(valid_results)

    raw_final = "\n\n".join([f"--- Chunk {i + 1} ---\n{res if res else '(empty)'}" for i, res in enumerate(results)])
    yield "", timer_str, md, raw_final

with gr.Blocks(title="T.E.R.M.S.") as demo:
    gr.Markdown(
        "# T.E.R.M.S.\n"
        "**T**erm **E**xplanation & **R**etrieval **M**apping **S**ystem\n\n"
        "Enter a sentence — terms are detected, explained, and linked to Google Search."
    )

    with gr.Row():
        with gr.Column():
            inp = gr.Textbox(lines=6, show_label=False, placeholder="Type or paste a sentence...")
            with gr.Row():
                btn = gr.Button("Analyze", variant="primary")
                clear = gr.Button("Clear")
            with gr.Row():
                status = gr.Textbox(label="Status", value="", interactive=False, scale=3)
                timer = gr.Textbox(label="Timer", value="", interactive=False, scale=1)
        with gr.Column():
            out = gr.Markdown()

    with gr.Accordion("Raw Output (debug)", open=True):
        raw_output_box = gr.Textbox(lines=10, show_label=False, interactive=False)

    btn.click(fn=process_text, inputs=inp, outputs=[status, timer, out, raw_output_box])
    inp.submit(fn=process_text, inputs=inp, outputs=[status, timer, out, raw_output_box])
    clear.click(fn=lambda: ("", "", "", "", ""), outputs=[inp, status, timer, out, raw_output_box])

if __name__ == "__main__":
    demo.queue(default_concurrency_limit=1)
    demo.launch(server_name="127.0.0.1", server_port=7860)