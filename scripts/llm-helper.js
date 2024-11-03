Hooks.once('init', async function() {
    console.log('My Custom Module | Initializing module');

    game.settings.register('my-custom-module', 'enableFeature', {
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

function openLLMInterface() {
    let d = new Dialog({
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

    d.render(true);
}