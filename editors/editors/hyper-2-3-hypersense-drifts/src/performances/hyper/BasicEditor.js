export class BasicEditor {

    static params = {
        fontSize: 16,
        height: 100,
        darkmode: false,
    }

    static settings = [
        { name: 'fontSize', type: 'number', description: 'Font size for the editor text (px)'},
        { name: 'height', default: 100, type: 'select', description: 'Editor height percent modifier', options: [50, 75, 100, 125, 150, 175, 200]},
        { name: 'darkmode', default: false, type: 'boolean', description: 'Dark mode for the editor'},
    ]

    static setColors(isDark) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }

    static onSettingChanged(game, name, value, oldValue) {
        if (name === 'fontSize') {
            game.editor.style.fontSize = `${value}px`;
        } else if (name === 'height') {
            let height = game.params.baseWidth * value / 100;
            game.editor.parentElement.style.height = `${height}px`;
            console.log("BasicEditor.onSettingChanged() %", height);
        } else if (name === 'darkmode') {
            BasicEditor.setColors(value);
        }
    }

    static calcBaseHeight(game) {
        // depending on screen size, return a good initial size for the editor
        let width = 0;

        if (window.innerHeight < 450) {
            width = window.innerHeight * 0.9; // px
        } else if (window.innerHeight < 600) {
            width = window.innerHeight * 0.8; // px
        } else if (window.innerHeight < 900) {
            width = window.innerHeight * 0.6; // px
        } else {
            width = window.innerHeight * 0.6; // px
        }


        console.log("BasicEditor.calcBaseWidth() width", width);
        return width;
    }

}