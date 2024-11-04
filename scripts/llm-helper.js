// Register module settings
Hooks.once('init', function() {
    console.log('LLM Helper | Initializing module');

    // Register core settings
    game.settings.register('llm-helper-module', 'enableFeature', {
        name: 'Enable LLM Integration',
        hint: 'Enables the LLM integration features',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true
    });

    // Register LLM connection settings
    game.settings.register('llm-helper-module', 'llmConfig', {
        name: 'LLM Configuration',
        scope: 'world',
        config: false,
        type: Object,
        default: {
            provider: 'ollama',
            baseUrl: '',
            apiKey: '',
            model: 'llama3.2',
            isConnected: false
        }
    });
});

Hooks.on('getSceneControlButtons', (controls) => {
    let llmTool = {
        name: "llm",
        title: "LLM Interface",
        icon: "fas fa-brain",  // This should stay fas
        visible: true,
        tools: [
            {
                name: "llm-chat",
                title: "Open LLM Chat",
                icon: "fas fa-comments",
                button: true,
                onClick: () => openLLMInterface()
            },
            {
                name: "llm-settings",
                title: "Open LLM Settings",
                icon: "fas fa-cog", // Changed from fa-gear to fa-cog for better compatibility
                button: true,
                onClick: () => openLLMSettings()
            }
        ],
        layer: "controls"
    };
    controls.push(llmTool);
});

function openLLMSettings() {
    // Get current config or use default if not set
    let currentConfig;
    try {
        currentConfig = game.settings.get('llm-helper-module', 'llmConfig');
    } catch (error) {
        console.warn('LLM Helper | Settings not found, using defaults');
        currentConfig = {
            provider: 'ollama',
            baseUrl: 'http://localhost:11434/api/',
            apiKey: '',
            model: 'llama3.2',
            isConnected: false
        };
    }

    // Create dialog content
    const dialogContent = `
        <div class="llm-settings"> 
            <div class="llm-settings-container">
                <div class="llm-settings-fields">
                    <div class="llm-chat-form-group-dropdown-fields">
                        <label for="api-list">Choose what to connect to:</label>
                        <select name="api-list" id="api-list">
                            <option value="ollama" ${currentConfig.provider === 'ollama' ? 'selected' : ''}>Ollama</option>
                            <option value="oobabooga" ${currentConfig.provider === 'oobabooga' ? 'selected' : ''}>Oobabooga</option>
                            <option value="chatGPT" ${currentConfig.provider === 'chatGPT' ? 'selected' : ''}>ChatGPT</option>
                            <option value="claude" ${currentConfig.provider === 'claude' ? 'selected' : ''}>Claude</option>
                            <option value="gemini" ${currentConfig.provider === 'gemini' ? 'selected' : ''}>Gemini</option>
                        </select>
                    </div>
                    <div class="llm-chat-form-group-text-fields">
                        <label for="llm-settings-address">Base Url:</label>
                        <input id="llm-settings-address" class='llm-settings-address' type="text" value="${currentConfig.baseUrl || ''}" placeholder="http://localhost:11434">
                    </div>
                    <div class="llm-chat-form-group-text-fields">
                        <label for="llm-settings-api-key">API Key:</label>
                        <input id="llm-settings-api-key" class='llm-settings-api-key' type="password" value="${currentConfig.apiKey || ''}">
                    </div>
                    <button id="llm-connect-button" class="llm-connect-button">
                        <i class="fas ${currentConfig.isConnected ? 'fa-check' : 'fa-plug'}"></i>
                        ${currentConfig.isConnected ? 'Connected' : 'Connect'}
                    </button>
                    <div class="llm-chat-form-group-dropdown-fields">
                        <label for="model-list">Model:</label>
                        <select name="model-list" id="model-list">
                            <option value="llama3.2">Loading models...</option>
                        </select>
                    </div>
                </div>
            </div>
            <button id="llm-settings-save" type="button">
                <i class="fas fa-save"></i>
                Save
            </button>
        </div>
    `;

    // Create render function with bound config
    const renderFunction = async function(html) {
        const saveButton = html.find('#llm-settings-save');
        const connectButton = html.find('#llm-connect-button');
        const apiSelect = html.find('#api-list');
        const baseUrlInput = html.find('#llm-settings-address');
        const apiKeyInput = html.find('#llm-settings-api-key');

        // Update model list based on current config
        if (currentConfig.isConnected) {
            await updateModelList(html, currentConfig);
        }

        apiSelect.change(async () => {
            const provider = apiSelect.val();
            switch(provider) {
                case 'ollama':
                    baseUrlInput.attr('placeholder', 'http://localhost:11434');
                    break;
                case 'oobabooga':
                    baseUrlInput.attr('placeholder', 'http://localhost:5000');
                    break;
            }
        });

        connectButton.click(async () => {
            const newConfig = {
                provider: apiSelect.val(),
                baseUrl: baseUrlInput.val(),
                apiKey: apiKeyInput.val(),
                model: html.find('#model-list').val()
            };

            //connectButton.prop('disabled', true);
            connectButton.html('<i class="fas fa-spinner fa-spin"></i> Connecting...');

            try {
                await LLMService.testConnection(newConfig);
                await updateModelList(html, newConfig);

                newConfig.isConnected = true;
                await game.settings.set('llm-helper-module', 'llmConfig', newConfig);

                connectButton.html('<i class="fas fa-check"></i> Connected');
                ui.notifications.info('Successfully connected to LLM service');
            } catch (error) {
                newConfig.isConnected = false;
                //connectButton.prop('disabled', false);
                connectButton.html('<i class="fas fa-plug"></i> Connect');
                ui.notifications.error('Failed to connect to LLM service');
            }
        });

        saveButton.click(async () => {
            const newConfig = {
                provider: apiSelect.val(),
                baseUrl: baseUrlInput.val(),
                apiKey: apiKeyInput.val(),
                model: html.find('#model-list').val(),
                isConnected: currentConfig.isConnected
            };

            await game.settings.set('llm-helper-module', 'llmConfig', newConfig);
            ui.notifications.info('Settings saved successfully');
            dialog.close();
        });
    };

    // Create dialog with prepared content and render function
    const dialog = new Dialog({
        title: "LLM Settings",
        content: dialogContent,
        buttons: {},
        render: renderFunction,
        close: () => {}
    }, {
        width: 400,
        height: 500,
        resizable: true
    });

    dialog.render(true);
}

// LLM Service class to handle different providers
class LLMService {
    static async testConnection(config) {
        try {
            switch(config.provider) {
                case 'ollama':
                    return await this.testOllama(config);
                case 'oobabooga':
                    return await this.testOobabooga(config);
                case 'chatGPT':
                    return await this.testChatGPT(config);
                default:
                    throw new Error('Unsupported provider');
            }
        } catch (error) {
            console.error('Connection test failed:', error);
            throw error;
        }
    }

    static async getModels(config) {
        try {
            switch(config.provider) {
                case 'ollama':
                    const response = await fetch(`${config.baseUrl}/api/tags`,{
                        headers:
                        {
                            "Content-Type": "application/json"
                        }
                    });
                    if (!response.ok) throw new Error('Failed to fetch models');
                    const data = await response.json();
                    return data.models || [];
                default:
                    return ['llama3.2']; // Default fallback
            }
        } catch (error) {
            console.error('Failed to fetch models:', error);
            return ['llama3.2']; // Fallback
        }
    }

    static async sendMessage(message, config) {
        try {
            switch(config.provider) {
                case 'ollama':
                    return await this.sendOllamaMessage(message, config);
                case 'oobabooga':
                    return await this.sendOobaboogaMessage(message, config);
                case 'chatGPT':
                    return await this.sendChatGPTMessage(message, config);
                default:
                    throw new Error('Unsupported provider');
            }
        } catch (error) {
            console.error('Message send failed:', error);
            throw error;
        }
    }

    // Provider-specific methods
    static async testOllama(config) {
        const response = await fetch(`${config.baseUrl}/api/tags`,{
            headers:
            {
                "Content-Type": "application/json"
            }
        });
        return response.ok;
    }

    static async sendOllamaMessage(message, config) {
        const response = await fetch(`${config.baseUrl}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: config.model,
                prompt: message,
                stream: false
            })
        });

        if (!response.ok) throw new Error('Failed to get response');
        const data = await response.json();
        return data.response;
    }

    // Add other provider methods as needed
}

// Update your existing functions
async function handleLLMResponse(userMessage, chatWindow) {
    chatWindow.appendChild(createMessageElement(userMessage, true));

    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('llm-message', 'llm-response', 'loading');
    loadingDiv.innerHTML = '<span class="message-icon"><i class="fas fa-brain"></i></span><span class="message-content">Thinking...</span>';
    chatWindow.appendChild(loadingDiv);

    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
        const config = game.settings.get('llm-helper-module', 'llmConfig');
        if (!config.isConnected) {
            throw new Error('LLM is not connected. Please check your settings.');
        }

        const response = await LLMService.sendMessage(userMessage, config);

        loadingDiv.remove();
        chatWindow.appendChild(createMessageElement(response, false));
        chatWindow.scrollTop = chatWindow.scrollHeight;
    } catch (error) {
        loadingDiv.remove();
        ui.notifications.error(error.message);

        const errorDiv = createMessageElement('Error: ' + error.message, false);
        errorDiv.classList.add('error-message');
        chatWindow.appendChild(errorDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
}

async function updateModelList(html, config) {
    const modelSelect = html.find('#model-list');
    modelSelect.empty();

    try {
        const models = await LLMService.getModels(config);
        models.forEach(model => {
            modelSelect.append(`<option value="${model.name}">${model.name}</option>`);
        });

        if (config.model) {
            modelSelect.val(config.model.name);
        }
    } catch (error) {
        ui.notifications.warn('Failed to fetch models list');
    }
}

// ... rest of the settings dialog code remains the same
function createMessageElement(message, isUser = true) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('llm-message');
    messageDiv.classList.add(isUser ? 'user-message' : 'llm-response');

    const iconSpan = document.createElement('span');
    iconSpan.classList.add('message-icon');
    iconSpan.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-brain"></i>';

    const contentSpan = document.createElement('span');
    contentSpan.classList.add('message-content');
    contentSpan.textContent = message;

    messageDiv.appendChild(iconSpan);
    messageDiv.appendChild(contentSpan);

    return messageDiv;
}

function openLLMInterface() {
    let dialog = new Dialog({
        title: "LLM Interface",
        content: `
            <div class="llm-interface">
                <div class="llm-chat-container">
                    <div class="llm-chat-messages" id="llm-messages">
                        <div class="llm-message system-message">
                            <span class="message-icon"><i class="fas fa-info-circle"></i></span>
                            <span class="message-content">How can I assist you today?</span>
                        </div>
                    </div>
                    <div class="llm-input-area">
                        <textarea id="llm-input" placeholder="Type your message..."></textarea>
                        <button id="llm-send" type="button">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `,
        buttons: {},
        render: async (html) => {
            const saveButton = html.find('#llm-settings-save');
            const connectButton = html.find('#llm-connect-button');
            const apiSelect = html.find('#api-list');
            const baseUrlInput = html.find('#llm-settings-address');
            const apiKeyInput = html.find('#llm-settings-api-key');

            // Update model list based on current config
            if (currentConfig.isConnected) {
                await updateModelList(html, currentConfig);
            }

            apiSelect.change(async () => {
                const provider = apiSelect.val();
                // Update placeholder/hints based on selected provider
                switch(provider) {
                    case 'ollama':
                        baseUrlInput.attr('placeholder', 'http://localhost:11434');
                        break;
                    case 'oobabooga':
                        baseUrlInput.attr('placeholder', 'http://localhost:5000');
                        break;
                    // Add other cases as needed
                }
            });

            connectButton.click(async () => {
                const config = {
                    provider: apiSelect.val(),
                    baseUrl: baseUrlInput.val(),
                    apiKey: apiKeyInput.val(),
                    model: html.find('#model-list').val()
                };

                //connectButton.prop('disabled', true);
                connectButton.html('<i class="fas fa-spinner fa-spin"></i> Connecting...');

                try {
                    await LLMService.testConnection(config);
                    await updateModelList(html, config);

                    config.isConnected = true;
                    await game.settings.set('llm-helper-module', 'llmConfig', config);

                    connectButton.html('<i class="fas fa-check"></i> Connected');
                    ui.notifications.info('Successfully connected to LLM service');
                } catch (error) {
                    config.isConnected = false;
                    //connectButton.prop('disabled', false);
                    connectButton.html('<i class="fas fa-plug"></i> Connect');
                    ui.notifications.error('Failed to connect to LLM service');
                }
            });

            saveButton.click(async () => {
                const config = {
                    provider: apiSelect.val(),
                    baseUrl: baseUrlInput.val(),
                    apiKey: apiKeyInput.val(),
                    model: html.find('#model-list').val(),
                    isConnected: currentConfig.isConnected
                };

                await game.settings.set('llm-helper-module', 'llmConfig', config);
                ui.notifications.info('Settings saved successfully');
                dialog.close();
            });
        },
        close: () => {
            // Cleanup when dialog is closed
        }
    }, {
        width: 400,
        height: 500,
        resizable: true
    });

    dialog.render(true);
}

if (typeof window !== 'undefined') {
    window.openLLMSettings = openLLMSettings;
}
