import gradio as gr
import re
import json
import urllib.request
import urllib.parse
import time

MODEL = "qwen3.5:9b"
CHUNK_SIZE = 100

def detect_lang(text: str) -> str:
    cjk = len(re.findall(r'[\u4e00-\u9fff\u3400-\u4dbf]', text))
    latin = len(re.findall(r'[A-Za-z]', text))
    total = cjk + latin
    if total == 0:
        return "en"
    ratio = cjk / total
    if ratio > 0.7:
        return "zh"
    if ratio < 0.3:
        return "en"
    return "mixed"


def split_into_chunks(text: str, chunk_size: int):
    sentences = re.split(r'(?<=[。！？；，\n\.\!\?\;\,])', text)
    chunks = []
    current_chunk = ""
    for sentence in sentences:
        if not sentence.strip():
            continue
        if len(current_chunk) + len(sentence) > chunk_size and current_chunk:
            chunks.append(current_chunk.strip())
            current_chunk = sentence
        else:
            current_chunk += sentence
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    return chunks


def build_prompt(text_chunk: str, lang: str) -> str:
    if lang == "zh":
        return f"""請分析以下句子，找出專業術語並提供解釋。
句子：{text_chunk}

請只返回以下 JSON 格式，不要包含任何其他文字或思考過程：
{{
  "terms": [
    {{
      "term": "術語名稱",
      "explanation": "解釋內容",
      "search_keyword": "Google 搜尋關鍵字"
    }}
  ]
}}
如果冇術語，返回 {{"terms": []}}。"""
    else:
        return f"""Analyze the following sentence, identify technical/professional terms, and explain them.
Sentence: {text_chunk}

Return ONLY the JSON format below, with no other text or reasoning:
{{
  "terms": [
    {{
      "term": "term name",
      "explanation": "explanation",
      "search_keyword": "Google search keyword"
    }}
  ]
}}
If there are no terms, return {{"terms": []}}."""


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
        "options": {
            "temperature": 0.1,
            "num_predict": 2048
        }
    }

    try:
        req = urllib.request.Request(
            "http://127.0.0.1:11434/api/generate",
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        with urllib.request.urlopen(req, timeout=300) as response:
            result = json.loads(response.read().decode('utf-8'))

            raw = result.get("response", "").strip()

            if not raw:
                thinking = result.get("thinking", "")
                if "{" in thinking and "}" in thinking:
                    raw = thinking[thinking.find("{"):thinking.rfind("}") + 1]

            if not raw:
                return "⚠️ Empty API response (reasoning tokens exhausted)"

            try:
                data = json.loads(raw)
                terms = data.get("terms", [])
                if not terms:
                    return "No obvious terms" if lang != "zh" else "無明顯術語"

                md = ""
                for t in terms:
                    term = t.get("term", "")
                    exp = t.get("explanation", "")
                    kw = t.get("search_keyword", term) or term
                    md += (
                        f"**{term}**: {exp}\n"
                        f"→ [Google Search](https://www.google.com/search?q={urllib.parse.quote(kw)})\n\n"
                    )
                return md
            except json.JSONDecodeError:
                return raw

    except Exception as e:
        return f"❌ Connection error: {str(e)}"


def process_text(text: str):
    if not text or not text.strip():
        return "", ""

    chunks = split_into_chunks(text, CHUNK_SIZE)
    all_markdown_results = []
    all_raw_outputs = []

    for i, chunk in enumerate(chunks):
        if len(chunk.strip()) < 2:
            continue

        md_chunk = process_single_chunk(chunk)
        all_raw_outputs.append(
            f"--- Chunk {i + 1} ---\n{md_chunk if md_chunk else '(empty)'}"
        )

        if (md_chunk
                and "無明顯術語" not in md_chunk
                and "No obvious terms" not in md_chunk
                and "⚠️" not in md_chunk
                and "❌" not in md_chunk):
            all_markdown_results.append(md_chunk)

    lang = detect_lang(text)
    lang_label = {"zh": "Chinese", "en": "English", "mixed": "Mixed"}.get(lang, "English")

    md = f"### Original Text ({lang_label})\n{text}\n\n### Term Explanations\n\n"

    if not all_markdown_results:
        md += "_(No obvious terms detected)_\n"
    else:
        md += "\n\n---\n\n".join(all_markdown_results)

    raw_final = "\n\n".join(all_raw_outputs)
    return md, raw_final

with gr.Blocks(title="T.E.R.M.S.") as demo:
    gr.Markdown(
        "# T.E.R.M.S.\n"
        "**T**erm **E**xplanation & **R**etrieval **M**apping **S**ystem\n\n"
        "Enter a sentence — terms are detected, explained, and linked to Google Search.\n"
        "Supports Chinese, English, and mixed text."
    )

    with gr.Row():
        with gr.Column():
            inp = gr.Textbox(
                lines=6,
                show_label=False,
                placeholder="Type or paste a sentence in Chinese or English..."
            )
            with gr.Row():
                btn = gr.Button("Analyze", variant="primary")
                clear = gr.Button("Clear")

        with gr.Column():
            out = gr.Markdown()

    with gr.Accordion("Raw Output (debug)", open=False):
        raw_output_box = gr.Textbox(lines=10, show_label=False, interactive=False)

    btn.click(fn=process_text, inputs=inp, outputs=[out, raw_output_box])
    inp.submit(fn=process_text, inputs=inp, outputs=[out, raw_output_box])
    clear.click(lambda: ("", "", ""), inputs=None, outputs=[inp, out, raw_output_box])

if __name__ == "__main__":
    demo.queue(default_concurrency_limit=1)
    demo.launch(server_name="127.0.0.1", server_port=7860, max_threads=1)