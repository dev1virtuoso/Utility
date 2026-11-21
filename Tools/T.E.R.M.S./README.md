# Term Explanation & Retrieval Mapping System (T.E.R.M.S.)

A lightweight Gradio web app that analyzes sentences, detects professional/technical terms, explains them, and links each term to a Google Search query. It runs entirely against a local [Ollama](https://ollama.com/) instance — no cloud API keys required.

Supports **Chinese**, **English**, and **mixed** text.

## Features

- **Automatic language detection** — distinguishes Chinese, English, and mixed input.
- **Sentence-aware chunking** — long text is split on sentence boundaries (respecting `。！？；，` and `. ! ? ; ,`), so terms are analyzed in context rather than in arbitrary character windows.
- **Structured JSON output** — the model is asked to return strict JSON (`term`, `explanation`, `search_keyword`), which is parsed and rendered as Markdown.
- **Google Search links** — every detected term is mapped to a ready-to-click Google Search URL.
- **Local LLM** — talks to Ollama's `/api/generate` endpoint; no data leaves your machine.
- **Raw debug panel** — a collapsible accordion shows per-chunk raw output for troubleshooting.

## Requirements

- Python **3.13+**
- [uv](https://docs.astral.sh/uv/) (recommended) or pip
- [Ollama](https://ollama.com/) running locally on `127.0.0.1:11434`
- The model referenced in `app.py`:

```bash
ollama pull qwen3.5:9b
```

> The model name is set via the `MODEL` constant at the top of `app.py`. Change it there if you prefer a different Ollama model.

## Installation

### With uv (recommended)

```bash
uv sync
```

### With pip

```bash
pip install "gradio>=6.32.0"
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

4. Type or paste a sentence, then press **Analyze** (or hit Enter).

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

## Configuration

All tunables live at the top of `app.py`:

| Constant | Default | Description |
| --- | --- | --- |
| `MODEL` | `qwen3.5:9b` | Ollama model name. |
| `CHUNK_SIZE` | `100` | Max characters per chunk before splitting. |

Server settings are configured in the `demo.launch(...)` call (`server_name`, `server_port`, `max_threads`).

## How It Works

1. **Language detection** — counts CJK vs. Latin characters and classifies input as `zh`, `en`, or `mixed`.
2. **Chunking** — splits text on sentence-ending punctuation while keeping each chunk under `CHUNK_SIZE` characters.
3. **Prompting** — builds a language-appropriate prompt instructing the model to return only JSON.
4. **Inference** — POSTs to Ollama's `/api/generate` with `format: "json"` and a low temperature.
5. **Parsing & rendering** — parses the JSON, builds Markdown with per-term explanations and Google Search links, and joins chunk results with horizontal rules.

If the model returns reasoning content instead of the final answer, the code attempts to recover the JSON object from the `thinking` field.

## Project Structure

```
.
├── app.py            # Gradio app + Ollama client
├── pyproject.toml    # Project metadata and dependencies
└── README.md
```

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | ---|
| `❌ Connection error` | Ollama isn't running, or not on `127.0.0.1:11434`. |
| `⚠️ Empty API response` | Model exhausted its reasoning tokens; try a larger `num_predict` or a different model. |
| Model returns prose instead of JSON | The model doesn't support JSON mode well; switch models. |
| Slow responses | Local inference on large models is CPU/GPU-bound; consider a smaller model. |

## License

MIT License
