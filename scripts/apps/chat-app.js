
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
import { LLMService } from '../services/llm-service.js';
import { RAGEngine } from '../services/rag-engine.js';

export class LLMChatApp extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        tag: "div",
        id: "llm-chat-interface",
        classes: ["llm-interface"],
        window: {
            title: "LLM Assistant",
            icon: "fas fa-brain",
            resizable: true
        },
        position: {
            width: 400,
            height: 600
        }
    };

    static PARTS = {
        chat: {
            template: "modules/llm-helper-foundryvtt/templates/chat.hbs"
        }
    };

    async _prepareContext(options) {
        return {
            messages: this.messages || []
        };
    }

    _onRender(context, options) {
        super._onRender(context, options);

        const input = this.element.querySelector("#llm-input");
        const sendBtn = this.element.querySelector("#llm-send");
        const messagesDiv = this.element.querySelector("#llm-messages");

        if (sendBtn && input) {
            sendBtn.addEventListener("click", () => this._sendMessage(input, messagesDiv));
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    this._sendMessage(input, messagesDiv);
                }
            });
        }
        
        // Scroll to bottom
        if(messagesDiv) messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    async _sendMessage(input, messagesDiv) {
        const text = input.value.trim();
        if (!text) return;

        // Add user message
        this._appendMessage(messagesDiv, text, true);
        input.value = "";

        // Show loading
        const loadingId = this._appendLoading(messagesDiv);

        try {
            const config = game.settings.get('llm-helper-module', 'llmConfig');
            
            // RAG Retrieval
            const context = await RAGEngine.retrieveContext(text);
            
            const response = await LLMService.sendMessage(text, config, context);
            
            // Remove loading and add response
            this._removeLoading(messagesDiv, loadingId);
            this._appendMessage(messagesDiv, response, false);

        } catch (error) {
            this._removeLoading(messagesDiv, loadingId);
            this._appendMessage(messagesDiv, "Error: " + error.message, false, true);
        }
    }

    _appendMessage(container, text, isUser, isError = false) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `llm-message ${isUser ? 'user-message' : 'llm-response'} ${isError ? 'error-message' : ''}`;
        
        const icon = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-brain"></i>';
        msgDiv.innerHTML = `<span class="message-icon">${icon}</span><span class="message-content">${text}</span>`;
        
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    }

    _appendLoading(container) {
        const id = "loading-" + Date.now();
        const msgDiv = document.createElement("div");
        msgDiv.id = id;
        msgDiv.className = "llm-message llm-response loading";
        msgDiv.innerHTML = '<span class="message-icon"><i class="fas fa-brain"></i></span><span class="message-content">Thinking...</span>';
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
        return id;
    }

    _removeLoading(container, id) {
        const el = container.querySelector(`#${id}`);
        if (el) el.remove();
    }
}
