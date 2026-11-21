# Term Explanation & Retrieval Mapping System (T.E.R.M.S.)

A lightweight Gradio web app that analyzes sentences, detects professional/technical terms, explains them, and links each term to a Google Search query. It runs entirely against a local [Ollama](https://ollama.com/) instance — no cloud API keys required.

Supports **Chinese**, **English**, and **mixed** text.

## Features

- **Automatic language detection** — distinguishes Chinese, English, and mixed input.
- **Sentence-aware chunking with overlap** — long text is split on sentence boundaries (respecting `。！？；，` and `. ! ? ; ,`), and consecutive chunks share a configurable tail overlap so terms straddling a boundary aren't lost.
- **Strict JSON prompting** — the model is instructed to return pure JSON only (no thinking, no Markdown fences), with `think: False`, a raised `num_predict` ceiling, and `stop` tokens to cut off stray formatting.
- **Robust JSON extraction** — falls back to `JSONDecoder.raw_decode` to pull the first valid JSON object out of noisy model output.
- **Term deduplication** — repeated terms within a chunk are collapsed (case-insensitive).
- **Google Search links** — every detected term is mapped to a ready-to-click Google Search URL.
- **Streaming progress** — the UI shows live per-chunk status and a running timer while chunks are processed.
- **Local LLM** — talks to Ollama's `/api/generate` endpoint; no data leaves your machine.
- **Raw debug panel** — an accordion shows per-chunk raw output for troubleshooting.

## Requirements

- Python **3.13+**
- [uv](https://docs.astral.sh/uv/) (recommended) or pip
- [Ollama](https://ollama.com/) running locally on `127.0.0.1:11434`
- The model referenced in `app.py`:

```bash
ollama pull qwen3.5:9b
```

> The model name and Ollama endpoint can be overridden with the `TERMS_MODEL` and `OLLAMA_GEN_URL` environment variables.

## Installation

### With uv (recommended)

```bash
uv sync
```

### With pip

```bash
pip install "gradio>=6.32.0" "aiohttp>=3.14.5"
```

## Usage

1. Make sure Ollama is running:

   ```bash
   ollama serve
   ```

2. Start the app:

   ```bash
   uv run app.py
   ```

   or, with pip:

   ```bash
   python app.py
   ```

3. Open <http://127.0.0.1:7860> in your browser.

4. Type or paste a sentence, then press **Analyze** (or hit Enter). Progress and timing are shown live; results stream into the Markdown panel.

### Example

Input:

```
The transformer architecture uses self-attention to model long-range dependencies.
```

Output (rendered as Markdown):

```
**transformer architecture**: A neural network design based on self-attention...
→ [Google Search](https://www.google.com/search?q=transformer+architecture)

**self-attention**: A mechanism that lets each token attend to all others...
→ [Google Search](https://www.google.com/search?q=self-attention)

**long-range dependencies**: Relationships between distant elements in a sequence...
→ [Google Search](https://www.google.com/search?q=long-range+dependencies)
```

---

## Configuration

Environment variables:

| Variable          | Default                                       | Description                     |
| ----------------- | --------------------------------------------- | ------------------------------- |
| `TERMS_MODEL`     | `qwen3.5:9b`                                  | Ollama model name.              |
| `OLLAMA_GEN_URL`  | `http://127.0.0.1:11434/api/generate`         | Ollama generate endpoint.       |

Tunables at the top of `app.py`:

| Constant        | Default | Description                                                       |
| --------------- | ------- | ----------------------------------------------------------------- |
| `CHUNK_SIZE`    | `60`    | Max characters per chunk before splitting.                        |
| `OVERLAP_SIZE`  | `20`    | Characters of overlap carried into the next chunk.                |
| `CHUNK_TIMEOUT` | `180`   | Per-chunk HTTP timeout in seconds (reasoning models need headroom). |

Server settings are configured in the `demo.launch(...)` call (`server_name`, `server_port`).

## How It Works

1. **Language detection** — counts CJK vs. Latin characters and classifies input as `zh`, `en`, or `mixed`.
2. **Chunking with overlap** — splits text on sentence-ending punctuation while keeping each chunk under `CHUNK_SIZE` characters, prepending the last `OVERLAP_SIZE` characters of the previous chunk to preserve cross-boundary context.
3. **Prompting** — builds a language-appropriate prompt with strict "JSON only, no thinking, no Markdown" rules.
4. **Inference** — POSTs to Ollama with `format: "json"`, `think: False`, `temperature: 0.1`, `num_predict: 8192`, and a `stop` list to terminate any stray Markdown fences.
5. **Parsing** — first tries `json.loads`; on failure, walks the string and uses `JSONDecoder.raw_decode` to locate the first valid JSON object. If `response` is empty but `thinking` is populated, it attempts to recover from there.
6. **Rendering** — deduplicates terms, builds Markdown with per-term explanations and Google Search links, and joins chunk results with horizontal rules. Errors and "no terms" markers are filtered from the final Markdown (but preserved in the raw debug panel).

## Project Structure

```
.
├── app.py            # Gradio app + Ollama client
├── pyproject.toml    # Project metadata and dependencies
└── README.md
```

## Troubleshooting

| Symptom                            | Likely cause / fix                                                                                  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| `❌ 連線失敗: ...` / connection error | Ollama isn't running, or `OLLAMA_GEN_URL` points somewhere unreachable.                             |
| `❌ 超時 (Ns)`                      | Chunk exceeded `CHUNK_TIMEOUT`. Increase it, or use a faster / smaller model.                       |
| `⚠️ Empty API response`            | Model returned nothing (e.g., reasoning tokens exhausted). Try a larger `num_predict` or another model. |
| `⚠️ JSON Parse Failed: ...`        | Model didn't return parseable JSON. Switch models, or check the snippet shown in the message.       |
| Model returns prose instead of JSON | The model doesn't support JSON mode well. Try `qwen3.5:9b` or another JSON-friendly model.          |
| Slow responses                     | Local inference on large models is CPU/GPU-bound; consider a smaller model.                         |

---

## License

MIT License. See `LICENSE` for details.