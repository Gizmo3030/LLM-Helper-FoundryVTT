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

    game.settings.register('llm-helper-module', 'npcTemplate', {
        name: 'NPC Generation Template',
        hint: 'Template prompt for generating NPCs',
        scope: 'world',
        config: true,
        type: String,
        default: `Generate a detailed D&D 5e NPC with the following format. Use the metric system where applicable and follow the Rules D&D 5th:
        {
            "name": "NPC's name and don't wrap in quotes",
            "race": "NPC's race and don't wrap in quotes",
            "class": "NPC's class or profession and don't wrap in quotes",
            "biography": "Physical description including unique features and clothing and demeanor and Detailed background story with motivations goals and recent events in plain text. The equipment and character will Align with D&D 5th edition rules and restrictions.",
            "stats": {
                "str": number (3-18),
                "dex": number (3-18),
                "con": number (3-18),
                "int": number (3-18),
                "wis": number (3-18),
                "cha": number (3-18)
            },
            "equipment": {
                "weapons": [
                    {
                        "name": "weapon name",
                        "type": "melee or ranged",
                        "damage": "damage dice (e.g., 1d8)",
                        "damageType": "damage type (e.g., slashing, piercing)",
                        "properties": ['list of weapon properties']
                    }waw
                ],
                "armor": {
                    "name": "armor name",
                    "type": "light, medium, or heavy",
                    "ac": "base armor class",
                    "properties": ['list of armor properties']
                },
                "items": [
                    {
                        "name": "item name",
                        "quantity": "number of items",
                        "description": "brief description of the item"
                    }
                ]
            }
        }`
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

// Add to your LLM toolbar controls
Hooks.on('getSceneControlButtons', (controls) => {
    // Find the llm tool group
    const llmTools = controls.find(c => c.name === "llm");

    if (llmTools) {
        // Add the NPC generator tool
        llmTools.tools.push({
            name: "generate-npc",
            title: "Generate NPC",
            icon: "fas fa-user-plus",
            button: true,
            onClick: () => openNPCGenerator()
        });
    }
});

function openNPCGenerator() {
    const dialogContent = `
        <div class="llm-npc-generator">
            <div class="form-group">
                <label>NPC Prompt:</label>
                <textarea id="npc-prompt" rows="3" placeholder="Generate a merchant NPC who..."></textarea>
            </div>
            <div class="form-group">
                <label>Place on Map:</label>
                <input type="checkbox" id="place-on-map" checked>
            </div>
        </div>
    `;

    new Dialog({
        title: "Generate NPC",
        content: dialogContent,
        buttons: {
            generate: {
                icon: '<i class="fas fa-magic"></i>',
                label: "Generate",
                callback: (html) => generateNPC(html)
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        render: (html) => {
            // Any render logic here
        },
        default: "generate"
    }).render(true);
}

// NPC Generation Function
async function generateNPC(html) {
    const prompt = html.find('#npc-prompt').val();
    const placeOnMap = html.find('#place-on-map').is(':checked');
    const template = game.settings.get('llm-helper-module', 'npcTemplate');

    try {
        const config = game.settings.get('llm-helper-module', 'llmConfig');
        if (!config.isConnected) {
            throw new Error('LLM is not connected. Please check your settings.');
        }

        ui.notifications.info("Generating NPC...");

        // Combine user prompt with the enhanced template
        const fullPrompt = `${template}\n\nSpecific requirements: ${prompt}\n\nRespond only with the JSON object. Do not include any additional text or explanations. Please in the value fields only use blocked text and do no use double quotes in the value reposes and use the metric system`;

        // Get response from LLM
        const response = await LLMService.sendMessage(fullPrompt, config);
        console.log("LLM Raw Response:", response);
        // Parse the JSON response
        const npcData = parseNPCResponse(response);

        // Create the actor in Foundry
        const actor = await createNPCActor(npcData);

        if (placeOnMap && canvas.scene && actor) {
            await placeNPCToken(actor);
        }

        ui.notifications.info(`NPC "${npcData.name}" created successfully!`);

    } catch (error) {
        ui.notifications.error(`Failed to generate NPC: ${error.message}`);
        console.error(error);
    }
}



// Helper function to parse LLM response
function parseNPCResponse(response) {
    try {
        // Remove Markdown code block markers (if present)
        let jsonStr = response.replace(/```json|```/g, '').trim();

        // Log raw response for debugging
        console.log("Raw Response:", response);
        console.log("Cleaned JSON String (before sanitization):", jsonStr);

        // Sanitize the JSON string by removing bad control characters
        jsonStr = sanitizeJSON(jsonStr);

        // Validate JSON structure by ensuring it starts and ends correctly
        const jsonStart = jsonStr.indexOf('{');
        const jsonEnd = jsonStr.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error('No valid JSON object found in the response.');
        }

        // Extract the JSON substring
        jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);

        // Parse the sanitized JSON string
        let npcData = JSON.parse(jsonStr);

        // Clean string values (optional)
        npcData = cleanStringValues(npcData);

        // Validate required fields
        validateNPCData(npcData);

        console.log("Parsed NPC Data:", npcData);
        return npcData;
    } catch (error) {
        console.error('Error parsing NPC response:', error);

        // Log the problematic JSON string
        console.error("Problematic JSON String:", response);

        throw new Error(`Failed to parse NPC data: ${error.message}`);
    }
}


function sanitizeJSON(jsonStr) {
    // Replace control characters (except valid escape sequences) with a space
    return jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, (char) => {
        if (char === '\n' || char === '\r' || char === '\t') return char; // Keep valid control characters
        console.warn(`Removing invalid character: ${char.charCodeAt(0)}`);
        return ''; // Strip invalid characters
    });
}



// Create NPC Actor in Foundry
async function createNPCActor(npcData) {
    const actorData = {
        name: npcData.name,
        type: "npc",
        system: {
            abilities: {
                str: { value: npcData.stats.str },
                dex: { value: npcData.stats.dex },
                con: { value: npcData.stats.con },
                int: { value: npcData.stats.int },
                wis: { value: npcData.stats.wis },
                cha: { value: npcData.stats.cha }
            },
            details: {
                race: npcData.race,
                biography: {
                    value: npcData.biography
                },
            },
        },
        prototypeToken: {
            actorLink: true,
            disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
            name: npcData.name,
            displayName: CONST.TOKEN_DISPLAY_MODES.HOVER,
            displayBars: CONST.TOKEN_DISPLAY_MODES.HOVER,
            vision: true,
            width: 1,
            height: 1,
            scale: 1
        }
    };

    try {
        // Create the actor
        const actor = await Actor.create(actorData);
        const itemsToCreate = [];

        // Process equipment if present
        if (npcData.equipment) {
            // Handle weapons (ensure it's an array before calling reduce)
            if (Array.isArray(npcData.equipment.weapons)) {
                for (const weapon of npcData.equipment.weapons) {
                    // Search for weapon in compendiums
                    let weaponData = await findItemInCompendiums(weapon.name, 'weapon');

                    // If not found in compendiums, try fuzzy matching
                    if (!weaponData) {
                        weaponData = fuzzyMatch(weapon.name, 'weapon');
                    }

                    // If still not found, create custom weapon
                    if (!weaponData) {
                        weaponData = {
                            name: weapon.name,
                            type: "weapon",
                            system: {
                                weaponType: weapon.type,
                                damage: {
                                    parts: [[weapon.damage, weapon.damageType]]
                                },
                                properties: weapon.properties && weapon.properties.reduce((obj, prop) => {
                                    obj[prop.toLowerCase()] = true;
                                    return obj;
                                }, {}) || {} // Ensure properties is an empty object if undefined
                            }
                        };
                    }

                    itemsToCreate.push(weaponData);
                }
            }

            // Handle armor (ensure it's an object before accessing properties)
            if (npcData.equipment.armor && typeof npcData.equipment.armor === 'object') {
                let armorData = await findItemInCompendiums(npcData.equipment.armor.name, 'equipment');

                if (!armorData) {
                    armorData = fuzzyMatch(npcData.equipment.armor.name, 'equipment');
                }

                if (!armorData) {
                    armorData = {
                        name: npcData.equipment.armor.name,
                        type: "equipment",
                        system: {
                            armor: {
                                type: npcData.equipment.armor.type,
                                value: npcData.equipment.armor.ac
                            },
                            properties: npcData.equipment.armor.properties && npcData.equipment.armor.properties.reduce((obj, prop) => {
                                obj[prop.toLowerCase()] = true;
                                return obj;
                            }, {}) || {}
                        }
                    };
                }

                itemsToCreate.push(armorData);
            }

            // Handle other items (ensure it's an array before calling reduce)
            if (Array.isArray(npcData.equipment.items)) {
                for (const item of npcData.equipment.items) {
                    let itemData = await findItemInCompendiums(item.name);

                    if (!itemData) {
                        itemData = fuzzyMatch(item.name);
                    }

                    if (!itemData) {
                        itemData = {
                            name: item.name,
                            type: "loot",
                            system: {
                                quantity: item.quantity,
                                description: {
                                    value: item.description
                                }
                            }
                        };
                    } else {
                        itemData.system.quantity = item.quantity;
                    }

                    itemsToCreate.push(itemData);
                }
            }
        }

        // Create all items for the actor
        if (itemsToCreate.length > 0) {
            await actor.createEmbeddedDocuments("Item", itemsToCreate);
            console.log(`Created ${itemsToCreate.length} items for ${actor.name}`);
        }

        return actor;
    } catch (error) {
        ui.notifications.error(`Failed to create actor: ${error.message}`);
        console.error(error);
        throw error;
    }
}


// Place NPC Token on Map
async function placeNPCToken(actor) {
    if (!canvas.scene) {
        ui.notifications.error("No active scene found.");
        return;
    }

    // Get the center of the current view
    const viewPosition = canvas.app.renderer.screen.width / 2;
    const x = canvas.stage.pivot.x + viewPosition;
    const y = canvas.stage.pivot.y + (canvas.app.renderer.screen.height / 2);

    // Snap to grid
    const snappedPosition = canvas.grid.getSnappedPosition(x, y);

    // Validate snappedPosition is an object and has x, y properties
    if (!snappedPosition || typeof snappedPosition !== 'object' || !('x' in snappedPosition && 'y' in snappedPosition)) {
        ui.notifications.error("Failed to determine snapped position.");
        console.error("Invalid snappedPosition:", snappedPosition);
        return;
    }

    const snapX = snappedPosition.x;
    const snapY = snappedPosition.y;

    try {
        // Search for a suitable token, defaulting to a commoner token if none found
        const tokenImage = await findBestMatchingToken(actor) || "systems/dnd5e/tokens/humanoid/Commoner.webp";

        // Create the token data
        const tokenData = {
            name: actor.name,
            x: snapX,
            y: snapY,
            actorId: actor.id,
            actorLink: true,
            disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
            displayName: CONST.TOKEN_DISPLAY_MODES.HOVER,
            displayBars: CONST.TOKEN_DISPLAY_MODES.HOVER,
            vision: true,
            dimSight: 0,
            brightSight: 0,
            width: 1,
            height: 1,
            scale: 1,
            texture: { src: tokenImage }
        };

        await canvas.scene.createEmbeddedDocuments("Token", [tokenData]);
        ui.notifications.info(`Token for ${actor.name} placed successfully.`);
    } catch (error) {
        ui.notifications.error(`Failed to place token: ${error.message}`);
        console.error(error);
    }
}



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
                model: html.find('#model-list')[0].value
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
                model: html.find('#model-list')[0].value,
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
            const chatWindow = html.find('#llm-messages')[0];
            const input = html.find('#llm-input');
            const sendButton = html.find('#llm-send');

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

if (typeof window !== 'undefined') {
    window.openLLMSettings = openLLMSettings;
}


function cleanStringValues(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'string') {
            // Replace multiple spaces, tabs, and newlines with single space
            obj[key] = obj[key].replace(/\s+/g, ' ').trim();
        } else if (Array.isArray(obj[key])) {
            // Clean strings in arrays
            obj[key] = obj[key].map(item => {
                if (typeof item === 'string') {
                    return item.replace(/\s+/g, ' ').trim();
                }
                return cleanStringValues(item);
            });
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            // Recursively clean nested objects
            obj[key] = cleanStringValues(obj[key]);
        }
    });
    return obj;
}

function validateNPCData(npcData) {
    const requiredFields = ['name', 'race', 'class', 'biography', 'stats'];
    const requiredStats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

    // Check main fields
    for (const field of requiredFields) {
        if (!npcData[field]) {
            throw new Error(`Missing required field: ${field}`);
        }
    }

    // Check stats
    for (const stat of requiredStats) {
        if (!npcData.stats[stat] ||
            typeof npcData.stats[stat] !== 'number' ||
            npcData.stats[stat] < 3 ||
            npcData.stats[stat] > 18) {
            throw new Error(`Invalid or missing stat: ${stat}`);
        }
    }

    // Validate equipment if present
    if (npcData.equipment) {
        validateEquipment(npcData.equipment);
    }
}

function validateEquipment(equipment) {
    // Validate weapons
    if (equipment.weapons) {
        if (!Array.isArray(equipment.weapons)) {
            throw new Error('Weapons must be an array');
        }

        equipment.weapons.forEach((weapon, index) => {
            if (!weapon.name || !weapon.type || !weapon.damage || !weapon.damageType) {
                throw new Error(`Invalid weapon data at index ${index}`);
            }
        });
    }

    // Validate armor
    if (equipment.armor) {
        if (!equipment.armor.name || !equipment.armor.type || !equipment.armor.ac) {
            throw new Error('Invalid armor data');
        }
    }

    // Validate items
    if (equipment.items) {
        if (!Array.isArray(equipment.items)) {
            throw new Error('Items must be an array');
        }

        equipment.items.forEach((item, index) => {
            if (!item.name || !item.quantity) {
                throw new Error(`Invalid item data at index ${index}`);
            }
        });
    }
}

// Helper function to search all compendiums for an item
async function findItemInCompendiums(itemName, type = null) {
    // Get all compendiums the user has access to
    const compendiums = game.packs.filter(pack =>
        pack.documentName === 'Item' && pack.visible
    );

    // Clean and normalize the search name
    const searchName = itemName.toLowerCase().trim();

    // Search through each compendium
    for (const pack of compendiums) {
        try {
            // Get the index of the current compendium
            const index = await pack.getIndex({
                fields: ['name', 'type', 'system']
            });

            // Find matching items
            const matches = index.filter(i => {
                const nameMatch = i.name.toLowerCase() === searchName;
                return type ? (nameMatch && i.type === type) : nameMatch;
            });

            // If we found matches, get the full item data
            if (matches.length > 0) {
                const item = await pack.getDocument(matches[0]._id);
                return item.toObject();
            }
        } catch (error) {
            console.warn(`Error searching compendium ${pack.title}:`, error);
            continue;
        }
    }

    // If no match found, return null
    return null;
}

function fuzzyMatch(itemName, type = null) {
    // Get all items from the game's items directory
    const items = game.items.filter(i => type ? i.type === type : true);

    // Clean and normalize the search name
    const searchName = itemName.toLowerCase().trim();

    // Try exact match first
    const exactMatch = items.find(i => i.name.toLowerCase() === searchName);
    if (exactMatch) return exactMatch.toObject();

    // Try partial matches
    const partialMatch = items.find(i => i.name.toLowerCase().includes(searchName) ||
        searchName.includes(i.name.toLowerCase()));
    if (partialMatch) return partialMatch.toObject();

    return null;
}

// Function to find the best matching token image
async function findBestMatchingToken(actor) {
    const baseDirectory = "systems/dnd5e/tokens";

    // Classify the NPC based on its characteristics (race, type, etc.)
    let classification = classifyNPC(actor);

    try {
        // Use the classification to determine the folder to search
        const folder = classification || "humanoid"; // Default to humanoid if no classification is found

        // Use the FilePicker API to list files in the determined folder and its subfolders
        const filePickerResult = await FilePicker.browse("data", `${baseDirectory}/${folder}`, { extensions: [".png", ".jpg", ".webp"] });

        if (!filePickerResult.files || filePickerResult.files.length === 0) {
            console.warn(`No tokens found in folder: ${folder}`);
            return null;
        }

        // Filter files for better matching
        const actorRace = (actor.system.details.race || "").toLowerCase();
        const actorClass = (actor.system.details.class || "").toLowerCase();

        // Find the most suitable token file based on the actor's race or class
        let bestMatch = null;
        for (const file of filePickerResult.files) {
            const lowerFile = file.toLowerCase();
            if (actorRace && lowerFile.includes(actorRace)) {
                bestMatch = file;
                break; // Prioritize race matches
            }
            if (actorClass && lowerFile.includes(actorClass)) {
                bestMatch = file; // Use class match if race match isn't found
            }
        }

        // Return the best match or null if no matches found
        return bestMatch || null;
    } catch (error) {
        console.error(`Error searching for tokens in ${baseDirectory}/${folder}:`, error);
        return null;
    }
}

// Classify the NPC based on its race, type, or other attributes
function classifyNPC(actor) {
    const race = typeof actor.system.details.race === "string" ? actor.system.details.race.toLowerCase() : "";
    const type = typeof actor.system.details.type === "string" ? actor.system.details.type.toLowerCase() : "";

    // Classification logic...
    if (race.includes("bear") || race.includes("wolf") || race.includes("dire wolf")) {
        return "beast";
    }
    if (race.includes("dragon")) {
        return "dragon";
    }
    if (race.includes("zombie") || race.includes("skeleton") || race.includes("vampire")) {
        return "undead";
    }
    if (race.includes("elf") || race.includes("fey")) {
        return "fey";
    }
    if (type === "elemental") {
        return "elemental";
    }

    return "humanoid"; // Default classification
}

