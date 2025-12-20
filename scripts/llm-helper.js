import { LLMSettingsApp } from './apps/settings-app.js';
import { LLMChatApp } from './apps/chat-app.js';
import { LLMService } from './services/llm-service.js';

Hooks.once('init', function() {
    console.log('LLM Helper | Initializing module');

    game.settings.register('llm-helper-module', 'llmConfig', {
        name: 'LLM Configuration',
        scope: 'world',
        config: false,
        type: Object,
        default: {
            provider: 'ollama',
            apiEndpoint: 'http://localhost:11434/api/generate',
            apiKey: '',
            model: 'llama3.2',
            contextWindow: 2048,
            systemPrompt: 'You are a helpful assistant for a Tabletop RPG.',
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
            "name": "NPC's name (no quotes around value)",
            "race": "NPC's race (no quotes around value)",
            "class": "NPC's class or profession (no quotes around value)",
            "biography": "Physical description, demeanor, and a detailed background with motivations and recent events.",
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
                        "properties": ["list of weapon properties"]
                    }
                ],
                "armor": {
                    "name": "armor name",
                    "type": "light, medium, or heavy",
                    "ac": "base armor class",
                    "properties": ["list of armor properties"]
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

    game.settings.registerMenu('llm-helper-module', 'llmSettingsMenu', {
        name: 'LLM Helper Settings',
        label: 'Configure LLM',
        hint: 'Configure your Local LLM or OpenAI connection.',
        icon: 'fas fa-brain',
        type: LLMSettingsApp,
        restricted: true
    });
});

Hooks.on('getSceneControlButtons', (controls) => {
    const controlName = 'llm';
    const openChat = () => new LLMChatApp().render(true);
    const openSettings = () => new LLMSettingsApp().render(true);
    const openNPC = () => openNPCGenerator();

    const legacyControl = {
        name: controlName,
        title: 'LLM Interface',
        icon: 'fas fa-brain',
        visible: true,
        tools: [
            {
                name: 'llm-chat',
                title: 'Open LLM Chat',
                icon: 'fas fa-comments',
                button: true,
                onClick: openChat
            },
            {
                name: 'llm-settings',
                title: 'Open LLM Settings',
                icon: 'fas fa-cog',
                button: true,
                onClick: openSettings
            },
            {
                name: 'generate-npc',
                title: 'Generate NPC',
                icon: 'fas fa-user-plus',
                button: true,
                onClick: openNPC
            }
        ],
        layer: 'controls'
    };

    const modernControl = {
        name: controlName,
        order: Object.keys(controls ?? {}).length,
        title: 'LLM Interface',
        icon: 'fas fa-brain',
        visible: true,
        activeTool: 'llm-chat',
        tools: {
            'llm-chat': {
                name: 'llm-chat',
                order: 0,
                title: 'Open LLM Chat',
                icon: 'fas fa-comments',
                button: true,
                onChange: openChat
            },
            'llm-settings': {
                name: 'llm-settings',
                order: 1,
                title: 'Open LLM Settings',
                icon: 'fas fa-cog',
                button: true,
                onChange: openSettings
            },
            'generate-npc': {
                name: 'generate-npc',
                order: 2,
                title: 'Generate NPC',
                icon: 'fas fa-user-plus',
                button: true,
                onChange: openNPC
            }
        }
    };

    if (Array.isArray(controls)) {
        controls.push(legacyControl);
    } else if (controls && typeof controls === 'object') {
        controls[controlName] = modernControl;
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
        title: 'Generate NPC',
        content: dialogContent,
        buttons: {
            generate: {
                icon: '<i class="fas fa-magic"></i>',
                label: 'Generate',
                callback: (html) => generateNPC(html)
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: 'Cancel'
            }
        },
        default: 'generate'
    }).render(true);
}

async function generateNPC(html) {
    const prompt = html.find('#npc-prompt').val();
    const placeOnMap = html.find('#place-on-map').is(':checked');
    const template = game.settings.get('llm-helper-module', 'npcTemplate');

    try {
        const config = game.settings.get('llm-helper-module', 'llmConfig');
        if (!config.isConnected) {
            throw new Error('LLM is not connected. Please check your settings.');
        }

        ui.notifications.info('Generating NPC...');

        const fullPrompt = `${template}\n\nSpecific requirements: ${prompt}\n\nRespond only with the JSON object. Do not include any additional text or explanations. Use metric units.`;
        const response = await LLMService.sendMessage(fullPrompt, config);
        const npcData = parseNPCResponse(response);
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

function parseNPCResponse(response) {
    try {
        let jsonStr = response.replace(/```json|```/g, '').trim();
        jsonStr = sanitizeJSON(jsonStr);

        const jsonStart = jsonStr.indexOf('{');
        const jsonEnd = jsonStr.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) throw new Error('No valid JSON object found in the response.');

        jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
        let npcData = JSON.parse(jsonStr);
        npcData = cleanStringValues(npcData);
        validateNPCData(npcData);
        return npcData;
    } catch (error) {
        console.error('Error parsing NPC response:', error);
        throw new Error(`Failed to parse NPC data: ${error.message}`);
    }
}

function sanitizeJSON(jsonStr) {
    return jsonStr.replace(/[\u0000-\u001F\u007F-\u009F]/g, (char) => {
        if (char === '\n' || char === '\r' || char === '\t') return char;
        return '';
    });
}

function cleanStringValues(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'string') {
            obj[key] = obj[key].replace(/\s+/g, ' ').trim();
        } else if (Array.isArray(obj[key])) {
            obj[key] = obj[key].map(item => (typeof item === 'string' ? item.replace(/\s+/g, ' ').trim() : cleanStringValues(item)));
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            obj[key] = cleanStringValues(obj[key]);
        }
    });
    return obj;
}

function validateNPCData(npcData) {
    const requiredFields = ['name', 'race', 'class', 'biography', 'stats'];
    const requiredStats = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

    for (const field of requiredFields) {
        if (!npcData[field]) {
            throw new Error(`Missing required field: ${field}`);
        }
    }

    for (const stat of requiredStats) {
        if (!npcData.stats[stat] || typeof npcData.stats[stat] !== 'number' || npcData.stats[stat] < 3 || npcData.stats[stat] > 18) {
            throw new Error(`Invalid or missing stat: ${stat}`);
        }
    }

    if (npcData.equipment) {
        validateEquipment(npcData.equipment);
    }
}

function validateEquipment(equipment) {
    if (equipment.weapons) {
        if (!Array.isArray(equipment.weapons)) throw new Error('Weapons must be an array');
        equipment.weapons.forEach((weapon, index) => {
            if (!weapon.name || !weapon.type || !weapon.damage || !weapon.damageType) {
                throw new Error(`Invalid weapon data at index ${index}`);
            }
        });
    }

    if (equipment.armor) {
        if (!equipment.armor.name || !equipment.armor.type || !equipment.armor.ac) {
            throw new Error('Invalid armor data');
        }
    }

    if (equipment.items) {
        if (!Array.isArray(equipment.items)) throw new Error('Items must be an array');
        equipment.items.forEach((item, index) => {
            if (!item.name || !item.quantity) {
                throw new Error(`Invalid item data at index ${index}`);
            }
        });
    }
}

async function createNPCActor(npcData) {
    const actorData = {
        name: npcData.name,
        type: 'npc',
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
                biography: { value: npcData.biography }
            }
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
        const actor = await Actor.create(actorData);
        const itemsToCreate = [];

        if (npcData.equipment) {
            if (Array.isArray(npcData.equipment.weapons)) {
                for (const weapon of npcData.equipment.weapons) {
                    let weaponData = await findItemInCompendiums(weapon.name, 'weapon');
                    if (!weaponData) weaponData = fuzzyMatch(weapon.name, 'weapon');
                    if (!weaponData) {
                        weaponData = {
                            name: weapon.name,
                            type: 'weapon',
                            system: {
                                weaponType: weapon.type,
                                damage: { parts: [[weapon.damage, weapon.damageType]] },
                                properties: weapon.properties?.reduce((obj, prop) => {
                                    obj[prop.toLowerCase()] = true;
                                    return obj;
                                }, {}) || {}
                            }
                        };
                    }
                    itemsToCreate.push(weaponData);
                }
            }

            if (npcData.equipment.armor && typeof npcData.equipment.armor === 'object') {
                let armorData = await findItemInCompendiums(npcData.equipment.armor.name, 'equipment');
                if (!armorData) armorData = fuzzyMatch(npcData.equipment.armor.name, 'equipment');
                if (!armorData) {
                    armorData = {
                        name: npcData.equipment.armor.name,
                        type: 'equipment',
                        system: {
                            armor: {
                                type: npcData.equipment.armor.type,
                                value: npcData.equipment.armor.ac
                            },
                            properties: npcData.equipment.armor.properties?.reduce((obj, prop) => {
                                obj[prop.toLowerCase()] = true;
                                return obj;
                            }, {}) || {}
                        }
                    };
                }
                itemsToCreate.push(armorData);
            }

            if (Array.isArray(npcData.equipment.items)) {
                for (const item of npcData.equipment.items) {
                    let itemData = await findItemInCompendiums(item.name);
                    if (!itemData) itemData = fuzzyMatch(item.name);
                    if (!itemData) {
                        itemData = {
                            name: item.name,
                            type: 'loot',
                            system: {
                                quantity: item.quantity,
                                description: { value: item.description }
                            }
                        };
                    } else {
                        itemData.system.quantity = item.quantity;
                    }
                    itemsToCreate.push(itemData);
                }
            }
        }

        if (itemsToCreate.length > 0) {
            await actor.createEmbeddedDocuments('Item', itemsToCreate);
        }

        return actor;
    } catch (error) {
        ui.notifications.error(`Failed to create actor: ${error.message}`);
        console.error(error);
        throw error;
    }
}

async function placeNPCToken(actor) {
    if (!canvas.scene) {
        ui.notifications.error('No active scene found.');
        return;
    }

    const viewPosition = canvas.app.renderer.screen.width / 2;
    const x = canvas.stage.pivot.x + viewPosition;
    const y = canvas.stage.pivot.y + (canvas.app.renderer.screen.height / 2);
    const snappedPosition = canvas.grid.getSnappedPosition(x, y);

    if (!snappedPosition || typeof snappedPosition !== 'object' || !('x' in snappedPosition && 'y' in snappedPosition)) {
        ui.notifications.error('Failed to determine snapped position.');
        return;
    }

    const tokenImage = await findBestMatchingToken(actor) || 'systems/dnd5e/tokens/humanoid/Commoner.webp';

    const tokenData = {
        name: actor.name,
        x: snappedPosition.x,
        y: snappedPosition.y,
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

    try {
        await canvas.scene.createEmbeddedDocuments('Token', [tokenData]);
        ui.notifications.info(`Token for ${actor.name} placed successfully.`);
    } catch (error) {
        ui.notifications.error(`Failed to place token: ${error.message}`);
        console.error(error);
    }
}

async function findItemInCompendiums(itemName, type = null) {
    const compendiums = game.packs.filter(pack => pack.documentName === 'Item' && pack.visible);
    const searchName = itemName.toLowerCase().trim();

    for (const pack of compendiums) {
        try {
            const index = await pack.getIndex({ fields: ['name', 'type', 'system'] });
            const matches = index.filter(i => {
                const nameMatch = i.name.toLowerCase() === searchName;
                return type ? (nameMatch && i.type === type) : nameMatch;
            });

            if (matches.length > 0) {
                const item = await pack.getDocument(matches[0]._id);
                return item.toObject();
            }
        } catch (error) {
            console.warn(`Error searching compendium ${pack.title}:`, error);
            continue;
        }
    }

    return null;
}

function fuzzyMatch(itemName, type = null) {
    const items = game.items.filter(i => (type ? i.type === type : true));
    const searchName = itemName.toLowerCase().trim();

    const exactMatch = items.find(i => i.name.toLowerCase() === searchName);
    if (exactMatch) return exactMatch.toObject();

    const partialMatch = items.find(i => i.name.toLowerCase().includes(searchName) || searchName.includes(i.name.toLowerCase()));
    if (partialMatch) return partialMatch.toObject();

    return null;
}

async function findBestMatchingToken(actor) {
    const baseDirectory = 'systems/dnd5e/tokens';
    const classification = classifyNPC(actor);

    try {
        const folder = classification || 'humanoid';
        const filePickerResult = await FilePicker.browse('data', `${baseDirectory}/${folder}`, { extensions: ['.png', '.jpg', '.webp'] });
        if (!filePickerResult.files || filePickerResult.files.length === 0) return null;

        const actorRace = (actor.system.details.race || '').toLowerCase();
        const actorClass = (actor.system.details.class || '').toLowerCase();

        let bestMatch = null;
        for (const file of filePickerResult.files) {
            const lowerFile = file.toLowerCase();
            if (actorRace && lowerFile.includes(actorRace)) {
                bestMatch = file;
                break;
            }
            if (actorClass && lowerFile.includes(actorClass)) {
                bestMatch = file;
            }
        }

        return bestMatch || null;
    } catch (error) {
        console.error(`Error searching for tokens in ${baseDirectory}/${classification}:`, error);
        return null;
    }
}

function classifyNPC(actor) {
    const race = typeof actor.system.details.race === 'string' ? actor.system.details.race.toLowerCase() : '';
    const type = typeof actor.system.details.type === 'string' ? actor.system.details.type.toLowerCase() : '';

    if (race.includes('bear') || race.includes('wolf') || race.includes('dire wolf')) return 'beast';
    if (race.includes('dragon')) return 'dragon';
    if (race.includes('zombie') || race.includes('skeleton') || race.includes('vampire')) return 'undead';
    if (race.includes('elf') || race.includes('fey')) return 'fey';
    if (type === 'elemental') return 'elemental';
    return 'humanoid';
}

