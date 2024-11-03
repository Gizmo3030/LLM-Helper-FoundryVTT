Hooks.once('init', async function() {
    console.log('LLM Helper | Initializing module');

    // Register module settings
    game.settings.register('llm-helper-foundryvtt', 'enableFeature', {
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
        icon: "fas fa-mind-share",
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

    // Add to the end of the controls array
    controls.push(llmTool);
});

function openLLMInterface() {
    // Create a dialog for the LLM interface
    let d = new Dialog({
        title: "LLM Interface",
        content: `
            <div class="llm-interface">
                <div class="llm-chat-messages"></div>
                <div class="llm-input-area">
                    <textarea id="llm-input" placeholder="Type your message..."></textarea>
                </div>
            </div>
        `,
        buttons: {
            submit: {
                icon: '<i class="fas fa-paper-plane"></i>',
                label: "Send",
                callback: (html) => {
                    let message = html.find('#llm-input').val();
                    // Handle the message here
                    console.log("Message to send:", message);
                }
            }
        },
        default: "submit",
        render: (html) => {
            // Any post-render operations
        },
        close: () => {
            // Cleanup when dialog is closed
        }
    });
    d.render(true);
}