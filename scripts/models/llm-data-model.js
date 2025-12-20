
export class LLMHelperDataModel extends foundry.abstract.DataModel {
    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            provider: new fields.StringField({ required: true, initial: "ollama" }),
            apiEndpoint: new fields.StringField({ required: true, initial: "http://localhost:11434/api/generate" }),
            apiKey: new fields.StringField({ required: false, initial: "" }), // Should be handled carefully, maybe not stored in plain text if possible, but for now standard field
            model: new fields.StringField({ required: true, initial: "llama3.2" }),
            contextWindow: new fields.NumberField({ required: true, initial: 2048, integer: true, min: 512 }),
            systemPrompt: new fields.StringField({ required: false, initial: "You are a helpful assistant for a Tabletop RPG." }),
            isConnected: new fields.BooleanField({ required: true, initial: false })
        };
    }
}
