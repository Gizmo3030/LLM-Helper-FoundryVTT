
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
        // Ollama expects: { model, prompt, stream: false, system }
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

        // Normalize endpoint: accept base URL or specific API path
        let endpoint = config.apiEndpoint || "";
        const lower = endpoint.toLowerCase();
        const hasGenerate = lower.endsWith('/api/generate');
        const hasChat = lower.endsWith('/api/chat');
        if (!hasGenerate && !hasChat) {
            if (lower.endsWith('/api')) endpoint += '/generate';
            else if (lower.endsWith('/')) endpoint += 'api/generate';
            else endpoint += '/api/generate';
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        const bodyText = await response.text();
        const body = isJson && bodyText ? JSON.parse(bodyText) : bodyText;

        if (!response.ok) {
            const detail = isJson && body?.error ? body.error : bodyText || response.statusText;
            throw new Error(`Failed to get response from Ollama (HTTP ${response.status}): ${detail}`);
        }

        if (isJson && body) {
            return body.response ?? body.message?.content ?? JSON.stringify(body);
        }

        // Fallback if the server returned plain text
        return typeof body === 'string' ? body : 'No response text received from Ollama';
    }
}
