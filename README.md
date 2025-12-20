# LLM Helper for Foundry VTT

Integrate locally hosted Large Language Models (LLMs) directly into your Foundry Virtual Tabletop games. This module provides a seamless interface to chat with AI assistants powered by tools like **Ollama**, allowing for dynamic world-building, rule lookups, and roleplay assistance without relying on external paid services.

## Features

*   **Local LLM Support**: Connect to your own locally running models via **Ollama** (default) or other compatible APIs.
*   **Integrated Chat Interface**: A dedicated, floating chat window to interact with the AI assistant.
*   **Context Awareness (RAG)**: The assistant can read from your world's **Journal Entries** to provide context-aware answers based on your lore and notes.
*   **Customizable Persona**: Define a custom "System Prompt" to give your AI a specific personality or role (e.g., "Rules Lawyer", "Lorekeeper").
*   **Modern UI**: Built with Foundry VTT's ApplicationV2 API for a native and responsive experience.

## Installation

1.  Open the Foundry VTT **Add-on Modules** tab.
2.  Click **Install Module**.
3.  Paste the following Manifest URL into the bottom field:
    ```
    https://raw.githubusercontent.com/Gizmo3030/LLM-Helper-FoundryVTT/refs/heads/main/module.json
    ```
4.  Click **Install**.
5.  Enable the module in your Game World.

## Configuration

### 1. Setting up Ollama (Recommended)
1.  Download and install [Ollama](https://ollama.com/).
2.  Pull a model (e.g., `ollama pull llama3.2`).
3.  **Important**: You must allow Ollama to accept requests from Foundry.
    *   **Linux/Mac**: Run `OLLAMA_ORIGINS="*" ollama serve`
    *   **Windows**: Set the environment variable `OLLAMA_ORIGINS="*"` in your system settings before starting Ollama.
4.  Ensure Ollama is running (usually on port `11434`).

### 2. Module Settings
In Foundry VTT, go to **Game Settings** -> **Configure Settings** -> **LLM Helper**.

*   **Provider**: Select `Ollama` (or others if configured).
*   **API Endpoint**: Default is `http://localhost:11434/api/generate`.
*   **Model Name**: Enter the name of the model you pulled (e.g., `llama3.2`).
*   **System Prompt**: Customize how the AI behaves.
*   **Context Window**: Adjust the token limit for memory.

Click **Connect** to verify the connection.

## Usage

1.  Look for the **Brain Icon** in the Scene Controls (left sidebar).
2.  Click **Open LLM Chat** to open the assistant window.
3.  Type your query. The module will automatically search your Journal Entries for relevant keywords and include them as context for the AI.

## Compatibility

*   **Foundry VTT**: v12+ (Verified for v13)
*   **System**: System Agnostic

## License

MIT License

## Author

Gizmo3030
