Hooks.once('init', async function() {
    console.log('LLM Helper | Initializing module');

    game.settings.register('llm-helper-module', 'enableFeature', {
        name: 'Enable LLM Integration',
        hint: 'Enables the LLM integration features',
        scope: 'world',
        config: true,
        type: Boolean,
        default: true
    });
});

Hooks.on('getSceneControlButtons', (controls) => {
    let llmTool = {
        name: "llm",
        title: "LLM Interface",
        icon: "fas fa-brain",
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
                icon: "fas fa-gear",
                button: true,
                onClick: () => opeLLMSettings()
            }
        ],
        layer: "controls"
    };
    controls.push(llmTool);
});

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

async function handleLLMResponse(userMessage, chatWindow) {
    // Add user message to chat
    chatWindow.appendChild(createMessageElement(userMessage, true));

    // Simulate LLM thinking with loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.classList.add('llm-message', 'llm-response', 'loading');
    loadingDiv.innerHTML = '<span class="message-icon"><i class="fas fa-brain"></i></span><span class="message-content">Thinking...</span>';
    chatWindow.appendChild(loadingDiv);

    // Scroll to bottom
    chatWindow.scrollTop = chatWindow.scrollHeight;

    try {
        // TODO: Replace this with your actual LLM API call
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
        const response = "This is a sample response from the LLM. Replace this with actual API integration.";

        // Remove loading message
        loadingDiv.remove();

        // Add LLM response
        chatWindow.appendChild(createMessageElement(response, false));

        // Scroll to bottom again
        chatWindow.scrollTop = chatWindow.scrollHeight;
    } catch (error) {
        loadingDiv.remove();
        ui.notifications.error("Failed to get LLM response");
    }
}

function opeLLMSettings(){
    let dialog = new Dialog({
        title: "LLM Settings",
        content: `
            <div class="llm-settings"> 
                <div class="llm-settings-container">
                    <div class="llm-settings-fields">
                        <div class="llm-chat-form-group-dropdown-fields">
                            <label for="api-list">Choose what to connect to:</label>
                            <select name="api-list" id="api-list">
                                <option value="ollama">Ollama</option>
                                <option value="oobabooga">Oobabooga</option>
                                <option value="chatGPT">ChatGPT</option>
                                <option value="claude">Claude</option>
                                <option value="gemini">Gemini</option>
                            </select>
                        </div>
                        <div class="llm-chat-form-group-text-fields">
                            <label for="llm-settings-address">Base Url:</label>
                            <input id="llm-settings-address" class='llm-settings-address' type="text">
                        </div>
                        <div class="llm-chat-form-group-text-fields">
                            <label for="llm-settings-api-key">API Key:</label>
                            <input id="llm-settings-api-key" class='llm-settings-api-key' type="password">
                        </div>
                        <button id="llm-connect-button" class="llm-connect-button">
                                <i class="fad fa-plug"></i>
                                Connect
                        </button>
                        <div class="llm-chat-form-group-dropdown-fields">
                            <label for="model-list">Model:</label>
                            <select name="model-list" id="model-list">
                                <option value="llama3.2">llama3.2</option>
                            </select>
                        </div>
                    </div>
                </div>
                <button id="llm-settings-save" type="button">
                    <i class="fal fa-save"></i>
                    Save
                </button>
            </div>
        `,
        buttons: {},
        render: (html) => {
            const saveButton = html.find('#llm-settings-save');
            const connectButton = html.find('#llm-connect-button');

            saveButton.click(async () => {
                await console.log("save llm settings");
            });

            connectButton.click(async () => {
                await console.log("connecting llm settings");
            })
        },
        close: () => {
            // Cleanup when dialog is closed
        }
    },
    {
        width: 400,
        height: 500,
        resizable: true
    });

    dialog.render(true);
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
        render: (html) => {
            const chatWindow = html.find('#llm-messages')[0];
            const input = html.find('#llm-input');
            const sendButton = html.find('#llm-send');

            // Handle send button click
            sendButton.click(async () => {
                const message = input.val().trim();
                if (message) {
                    input.val('');
                    await handleLLMResponse(message, chatWindow);
                }
            });

            // Handle enter key (but shift+enter for new line)
            input.keydown(async (event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    const message = input.val().trim();
                    if (message) {
                        input.val('');
                        await handleLLMResponse(message, chatWindow);
                    }
                }
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