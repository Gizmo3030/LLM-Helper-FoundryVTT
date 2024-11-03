console.log("Hello World! This code runs immediately when the file is loaded.");

Hooks.on("init", function() {
    console.log("This code runs once the Foundry VTT software begins its initialization workflow.");
});

Hooks.on("ready", function() {
    console.log("This code runs once core initialization is ready and game data is available.");
});

// Define Hooks to Montior
const watchedHooks = ['ActorSheet']
// Loop through hooks and attach header button and listener
watchedHooks.forEach(hook => {
    Hooks.on(`get${hook}HeaderButtons`, attachHeaderButton);
    Hooks.on(`render${hook}`, updateHeaderButton);
});

function attachHeaderButton(app, buttons) {
    if (!game.user.isGM) return;

    buttons.unshift({
        class: "ai-tools-button",
        get icon() {
            // Get GM Notes
            return `fa-solid fa-robot`;
        },
        onclick: (ev) => {
            console.log("AI-Tools Button Clicked");
        }
    })
}