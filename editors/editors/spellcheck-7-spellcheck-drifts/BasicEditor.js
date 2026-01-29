export class BasicEditor {

    static params = {
        fontSize: 16,
        width: 100,
        darkmode: false,
    }

    static settings = [
        { name: 'fontSize', type: 'number', description: 'Font size for the editor text (px)'},
        { name: 'width', default: 100, type: 'select', description: 'Editor width', options: [50, 75, 100, 125, 150, 175, 200]},
        { name: 'darkmode', default: false, type: 'boolean', description: 'Dark mode for the editor'},
    ]

    static setColors(isDark) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }

    static onSettingChanged(game, name, value, oldValue) {
        if (name === 'fontSize') {
            game.editor.style.fontSize = `${value}px`;
        } else if (name === 'width') {
            let width = game.params.baseWidth * value / 100;
            game.editor.parentElement.style.width = `${width}px`;
            console.log("BasicEditor.onSettingChanged() %", width);
        } else if (name === 'darkmode') {
            BasicEditor.setColors(value);
        }
    }

    static calcBaseWidth(game) {
        // depending on screen size, return a good initial size for the editor
        let width = 0;

        if (window.innerWidth < 450) {
            width = window.innerWidth * 0.9; // px
        } else if (window.innerWidth < 600) {
            width = window.innerWidth * 0.8; // px
        } else if (window.innerWidth < 900) {
            width = window.innerWidth * 0.6; // px
        } else {
            width = window.innerWidth * 0.6; // px
        }


        console.log("BasicEditor.calcBaseWidth() width", width);
        return width;
    }

}