# LLM Helper for Foundry VTT

Chat with locally hosted LLMs inside Foundry VTT, pull context from your Journals, and now generate NPCs directly onto the scene—no external paid APIs required.

## Highlights

- **Local LLM first**: Works with Ollama (default) and other compatible endpoints.
- **Modern UI (v13-ready)**: Uses the ApplicationV2 APIs and the new v13 scene control structure, with legacy fallback for v12.
- **Context-aware answers**: Lightweight RAG over Journal entries for in-world responses.
- **NPC Generator**: One-click prompt to create an NPC actor and drop a token on the map.
- **Custom personas**: Tune the system prompt, model, and context window per world.

## Install

1. Foundry VTT → **Add-on Modules** → **Install Module**.
2. Manifest URL:
     ```
     https://raw.githubusercontent.com/Gizmo3030/LLM-Helper-FoundryVTT/refs/heads/main/module.json
     ```
3. Install and enable in your world.

## Configure

### Ollama (recommended)
1. Install [Ollama](https://ollama.com/) and pull a model, e.g. `ollama pull llama3.2`.
2. Allow cross-origin requests:
     - Linux/Mac: `OLLAMA_ORIGINS="*" ollama serve`
     - Windows: set env var `OLLAMA_ORIGINS="*"` before starting Ollama.
3. Ensure Ollama is running (default `http://localhost:11434`).

### Module settings (Game Settings → Configure Settings → LLM Helper)
- **Provider**: `ollama` (or other configured backends).
- **API Endpoint**: defaults to `http://localhost:11434/api/generate` (auto-normalized if you give a base URL).
- **Model**: the pulled model name (e.g. `llama3.2`).
- **System Prompt / Context Window**: shape the assistant.
- **NPC Template**: edit the JSON-format prompt used for NPC generation.
- Click **Connect** to test.

## Use

- Open the **LLM** control on the left toolbar (brain icon).
- Tools:
    - **Open LLM Chat**: chat window with journal-aware context.
    - **Open LLM Settings**: quick access to settings UI.
    - **Generate NPC**: prompt → actor creation → optional token drop at view center.

## Tips / Troubleshooting

- If Ollama rejects requests, re-run with `OLLAMA_ORIGINS="*" ollama serve`.
- Endpoint flexibility: you can supply base `http://host:11434` or full `/api/generate`; the module normalizes it.
- If JSON parsing fails for NPC generation, check the LLM response formatting and the template you provided.

## Compatibility

- Foundry VTT: v12+, verified on v13
- System: system-agnostic (NPC creation assumes D&D 5e fields; adjust template for other systems)

## License

MIT

## Author

Gizmo3030
