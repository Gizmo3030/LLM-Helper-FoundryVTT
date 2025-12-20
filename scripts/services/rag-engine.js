
export class RAGEngine {
    static async retrieveContext(query) {
        // Basic keyword matching for now
        // In a real implementation, this would use embeddings or a more sophisticated search
        
        const keywords = query.toLowerCase().split(" ").filter(w => w.length > 3);
        const relevantSnippets = [];

        // Search Journal Entries
        for (const journal of game.journal) {
            for (const page of journal.pages) {
                if (page.type === "text") {
                    const text = page.text.content || "";
                    const plainText = text.replace(/<[^>]*>/g, ""); // Strip HTML
                    
                    let score = 0;
                    for (const word of keywords) {
                        if (plainText.toLowerCase().includes(word)) score++;
                    }

                    if (score > 0) {
                        relevantSnippets.push(`Source: ${journal.name} - ${page.name}\n${plainText.substring(0, 500)}...`);
                    }
                }
            }
        }

        // Limit to top 3 results to avoid context overflow
        return relevantSnippets.slice(0, 3);
    }
}
