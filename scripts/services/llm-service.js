
export class LLMService {
    static async testConnection(config) {
        try {
            switch(config.provider) {
                case 'ollama':
                    return await this.testOllama(config);
                case 'oobabooga':
                    // Placeholder for oobabooga test
                    return true; 
                case 'chatGPT':
                    // Placeholder for chatGPT test
                    return true;
                default:
                    throw new Error('Unsupported provider');
            }
        } catch (error) {
            console.error('Connection test failed:', error);
            throw error;
        }
    }

    static async sendMessage(message, config, context = []) {
        try {
            switch(config.provider) {
                case 'ollama':
                    return await this.sendOllamaMessage(message, config, context);
                case 'oobabooga':
                     // Placeholder
                    return "Oobabooga support not fully implemented yet.";
                case 'chatGPT':
                     // Placeholder
                    return "ChatGPT support not fully implemented yet.";
                default:
                    throw new Error('Unsupported provider');
            }
        } catch (error) {
            console.error('Message send failed:', error);
            throw error;
        }
    }

    static async testOllama(config) {
        // Ollama usually has a /api/tags endpoint to list models
        // We can use that to verify connection
        // Construct base URL from the endpoint if possible, or just assume the user provided the generate endpoint
        // If the user provided http://localhost:11434/api/generate, we want http://localhost:11434/api/tags
        
        let baseUrl = config.apiEndpoint;
        if (baseUrl.endsWith('/generate')) {
            baseUrl = baseUrl.replace('/generate', '/tags');
        } else if (!baseUrl.endsWith('/tags')) {
             // Try to guess or just use as is if it looks like a base
             if(baseUrl.endsWith('/api')) baseUrl += '/tags';
             else if(!baseUrl.includes('/api/')) baseUrl += '/api/tags';
        }

        const response = await fetch(baseUrl, {
            method: 'GET',
            headers: { "Content-Type": "application/json" }
        });
        
        if (!response.ok) throw new Error("Failed to connect to Ollama");
        return true;
    }

    static async sendOllamaMessage(message, config, context = []) {
        // Prepare request for Ollama
        // Ollama expects: { model: "...", prompt: "...", stream: false, ... }
        // We can also inject system prompt and context
        
        const payload = {
            model: config.model,
            prompt: message,
            stream: false,
            system: config.systemPrompt
        };

        // If we have context (RAG), we might append it to the prompt or system prompt
        if (context.length > 0) {
            const contextText = context.join("\n\n");
            payload.system += `\n\nContext Information:\n${contextText}`;
        }

        const response = await fetch(config.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to get response from Ollama');
        const data = await response.json();
        return data.response;
    }
}
