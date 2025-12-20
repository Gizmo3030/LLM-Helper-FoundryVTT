import { LLMHelperDataModel } from './models/llm-data-model.js';
import { LLMSettingsApp } from './apps/settings-app.js';
import { LLMChatApp } from './apps/chat-app.js';

Hooks.once('init', function() {
    console.log('LLM Helper | Initializing module');

    // Register Data Model
    // Note: Foundry v12+ DataModels are typically used for Documents, but we can use the schema for validation
    // For settings, we register the object structure.
    
    game.settings.register('llm-helper-module', 'llmConfig', {
        name: 'LLM Configuration',
        scope: 'world',
        config: false,
        type: Object,
        default: {
            provider: 'ollama',
            apiEndpoint: 'http://localhost:11434/api/generate',
            apiKey: '',
            model: 'llama3.2',
            contextWindow: 2048,
            systemPrompt: 'You are a helpful assistant for a Tabletop RPG.',
            isConnected: false
        }
    });

    // Register Menu to open the ApplicationV2 settings
    game.settings.registerMenu("llm-helper-module", "llmSettingsMenu", {
        name: "LLM Helper Settings",
        label: "Configure LLM",
        hint: "Configure your Local LLM or OpenAI connection.",
        icon: "fas fa-brain",
        type: LLMSettingsApp,
        restricted: true
    });
});

Hooks.on('getSceneControlButtons', (controls) => {
    // V13 switched scene controls to an object keyed by control name instead of an array; keep backward compat.
    const controlName = "llm";
    const openChat = () => new LLMChatApp().render(true);
    const openSettings = () => new LLMSettingsApp().render(true);

    const legacyControl = {
        name: controlName,
        title: "LLM Interface",
        icon: "fas fa-brain",
        visible: true,
        tools: [
            {
                name: "llm-chat",
                title: "Open LLM Chat",
                icon: "fas fa-comments",
                button: true,
                onClick: openChat
            },
            {
                name: "llm-settings",
                title: "Open LLM Settings",
                icon: "fas fa-cog",
                button: true,
                onClick: openSettings
            }
        ],
        layer: "controls"
    };

    const modernControl = {
        name: controlName,
        order: Object.keys(controls ?? {}).length,
        title: "LLM Interface",
        icon: "fas fa-brain",
        visible: true,
        activeTool: "llm-chat",
        tools: {
            "llm-chat": {
                name: "llm-chat",
                order: 0,
                title: "Open LLM Chat",
                icon: "fas fa-comments",
                button: true,
                onChange: openChat
            },
            "llm-settings": {
                name: "llm-settings",
                order: 1,
                title: "Open LLM Settings",
                icon: "fas fa-cog",
                button: true,
                onChange: openSettings
            }
        }
    };
    
    if (Array.isArray(controls)) {
        controls.push(legacyControl);
    } else if (controls && typeof controls === "object") {
        controls[controlName] = modernControl;
    }
});
