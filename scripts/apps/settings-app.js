
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class LLMSettingsApp extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        tag: "form",
        id: "llm-helper-settings",
        classes: ["llm-settings"],
        window: {
            title: "LLM Helper Settings",
            icon: "fas fa-brain",
            resizable: true
        },
        position: {
            width: 400,
            height: "auto"
        },
        form: {
            handler: LLMSettingsApp.formHandler,
            submitOnChange: false,
            closeOnSubmit: true
        }
    };

    static PARTS = {
        form: {
            template: "modules/llm-helper-foundryvtt/templates/settings.hbs"
        }
    };

    async _prepareContext(options) {
        const currentConfig = game.settings.get('llm-helper-module', 'llmConfig');
        return {
            config: currentConfig,
            providers: {
                ollama: "Ollama",
                oobabooga: "Oobabooga",
                chatGPT: "ChatGPT",
                claude: "Claude",
                gemini: "Gemini"
            },
            isConnected: currentConfig.isConnected
        };
    }

    static async formHandler(event, form, formData) {
        const object = formData.object;
        const currentConfig = game.settings.get('llm-helper-module', 'llmConfig');
        
        // Merge existing config with new data
        const newConfig = {
            ...currentConfig,
            ...object
        };

        await game.settings.set('llm-helper-module', 'llmConfig', newConfig);
        ui.notifications.info("LLM Helper Settings Saved");
    }

    _onRender(context, options) {
        super._onRender(context, options);
        
        // Bind connect button
        const connectBtn = this.element.querySelector("#llm-connect-button");
        if(connectBtn) {
            connectBtn.addEventListener("click", this._onConnect.bind(this));
        }

        // Bind provider change to update placeholder
        const providerSelect = this.element.querySelector("select[name='provider']");
        const urlInput = this.element.querySelector("input[name='apiEndpoint']");
        
        if(providerSelect && urlInput) {
            providerSelect.addEventListener("change", (e) => {
                const provider = e.target.value;
                if(provider === 'ollama') urlInput.placeholder = "http://localhost:11434/api/generate";
                else if(provider === 'oobabooga') urlInput.placeholder = "http://localhost:5000/api/v1/generate";
                else if(provider === 'chatGPT') urlInput.placeholder = "https://api.openai.com/v1/chat/completions";
            });
        }
    }

    async _onConnect(event) {
        event.preventDefault();
        const btn = event.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        btn.disabled = true;

        // Gather current form data to test connection without saving yet
        const formData = new FormData(this.element);
        const testConfig = {};
        for(let [key, value] of formData.entries()) {
            testConfig[key] = value;
        }

        try {
            // Dynamic import to avoid circular dependency issues if any, or just use global/module scope
            const { LLMService } = await import('../services/llm-service.js');
            await LLMService.testConnection(testConfig);
            
            ui.notifications.info("Successfully connected!");
            btn.innerHTML = '<i class="fas fa-check"></i> Connected';
            
            // Update setting to reflect connection status
            const currentConfig = game.settings.get('llm-helper-module', 'llmConfig');
            currentConfig.isConnected = true;
            await game.settings.set('llm-helper-module', 'llmConfig', currentConfig);

        } catch (e) {
            ui.notifications.error("Connection failed: " + e.message);
            btn.innerHTML = '<i class="fas fa-plug"></i> Connect';
            
             // Update setting to reflect connection status
             const currentConfig = game.settings.get('llm-helper-module', 'llmConfig');
             currentConfig.isConnected = false;
             await game.settings.set('llm-helper-module', 'llmConfig', currentConfig);
        } finally {
            btn.disabled = false;
            setTimeout(() => {
                if(btn.innerHTML.includes("Connected")) {
                     // Keep connected state visible or revert to 'Connect' if you want to allow re-test
                } else {
                    btn.innerHTML = originalText;
                }
            }, 2000);
        }
    }
}
