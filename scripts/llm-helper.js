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