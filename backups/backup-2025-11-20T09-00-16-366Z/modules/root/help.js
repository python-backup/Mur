// modules/user/help.js
const fs = require('fs');
const path = require('path');

class HelpSystem {
    constructor() {
        this.modulesPath = path.join(__dirname, '..');
    }

    async getAllModules() {
        const modules = {
            root: [],
            user: []
        };

        // Модули из root
        const rootPath = path.join(this.modulesPath, 'root');
        if (fs.existsSync(rootPath)) {
            modules.root = fs.readdirSync(rootPath)
                .filter(file => file.endsWith('.js'))
                .map(file => file.replace('.js', ''));
        }

        // Модули из user  
        const userPath = path.join(this.modulesPath, 'user');
        if (fs.existsSync(userPath)) {
            modules.user = fs.readdirSync(userPath)
                .filter(file => file.endsWith('.js'))
                .map(file => file.replace('.js', ''));
        }

        return modules;
    }

    getModuleCommands(moduleName) {
        try {
            // Сначала проверяем в user
            let modulePath = path.join(this.modulesPath, 'user', `${moduleName}.js`);
            if (!fs.existsSync(modulePath)) {
                // Проверяем в root
                modulePath = path.join(this.modulesPath, 'root', `${moduleName}.js`);
                if (!fs.existsSync(modulePath)) {
                    return [];
                }
            }

            const module = require(modulePath);
            return Object.keys(module.commands || {});
        } catch (error) {
            return [];
        }
    }

    async formatModuleList(modules) {
        // Используем MARKDOWN плагин для форматирования
        let response = "";
        
        try {
            // Вызываем MARKDOWN плагин для создания заголовка
            const markdownResult = await this.callMarkdownPlugin('create_header', ['ДОСТУПНЫЕ МОДУЛИ', 1]);
            if (markdownResult.success) {
                response = markdownResult.data + "\n\n";
            } else {
                response = "**ДОСТУПНЫЕ МОДУЛИ**\n\n";
            }
        } catch (e) {
            response = "**ДОСТУПНЫЕ МОДУЛИ**\n\n";
        }

        if (modules.root.length > 0) {
            try {
                const headerResult = await this.callMarkdownPlugin('create_header', ['СИСТЕМНЫЕ МОДУЛИ', 2]);
                response += headerResult.success ? headerResult.data + "\n" : "**СИСТЕМНЫЕ МОДУЛИ**\n";
            } catch (e) {
                response += "**СИСТЕМНЫЕ МОДУЛИ**\n";
            }
            
            for (const module of modules.root) {
                const commands = this.getModuleCommands(module);
                try {
                    const boldResult = await this.callMarkdownPlugin('format_bold', [module]);
                    const moduleName = boldResult.success ? boldResult.data : `**${module}**`;
                    response += `• ${moduleName} (${commands.length} команд)\n`;
                } catch (e) {
                    response += `• **${module}** (${commands.length} команд)\n`;
                }
            }
            response += "\n";
        }

        if (modules.user.length > 0) {
            try {
                const headerResult = await this.callMarkdownPlugin('create_header', ['ПОЛЬЗОВАТЕЛЬСКИЕ МОДУЛИ', 2]);
                response += headerResult.success ? headerResult.data + "\n" : "**ПОЛЬЗОВАТЕЛЬСКИЕ МОДУЛИ**\n";
            } catch (e) {
                response += "**ПОЛЬЗОВАТЕЛЬСКИЕ МОДУЛИ**\n";
            }
            
            for (const module of modules.user) {
                const commands = this.getModuleCommands(module);
                try {
                    const boldResult = await this.callMarkdownPlugin('format_bold', [module]);
                    const moduleName = boldResult.success ? boldResult.data : `**${module}**`;
                    response += `• ${moduleName} (${commands.length} команд)\n`;
                } catch (e) {
                    response += `• **${module}** (${commands.length} команд)\n`;
                }
            }
        }

        if (modules.root.length === 0 && modules.user.length === 0) {
            try {
                const italicResult = await this.callMarkdownPlugin('format_italic', ['Модули не найдены']);
                response += italicResult.success ? italicResult.data + "\n" : "*Модули не найдены*\n";
            } catch (e) {
                response += "Модули не найдены\n";
            }
        }

        response += "\n";
        try {
            const codeResult = await this.callMarkdownPlugin('format_code', ['Используйте .help <модуль> для информации о модуле']);
            response += codeResult.success ? codeResult.data : "Используйте `.help <модуль>` для информации о модуле";
        } catch (e) {
            response += "Используйте `.help <модуль>` для информации о модуле";
        }

        return response;
    }

    async formatModuleHelp(moduleName) {
        const commands = this.getModuleCommands(moduleName);
        
        if (commands.length === 0) {
            try {
                const boldResult = await this.callMarkdownPlugin('format_bold', [moduleName]);
                const moduleNameFormatted = boldResult.success ? boldResult.data : `**${moduleName}**`;
                return `Модуль ${moduleNameFormatted} не найден или не содержит команд`;
            } catch (e) {
                return `Модуль **${moduleName}** не найден или не содержит команд`;
            }
        }

        let response = "";
        
        // Заголовок модуля
        try {
            const headerResult = await this.callMarkdownPlugin('create_header', [`МОДУЛЬ: ${moduleName.toUpperCase()}`, 1]);
            response = headerResult.success ? headerResult.data + "\n\n" : `**МОДУЛЬ: ${moduleName.toUpperCase()}**\n\n`;
        } catch (e) {
            response = `**МОДУЛЬ: ${moduleName.toUpperCase()}**\n\n`;
        }

        // Список команд
        try {
            const headerResult = await this.callMarkdownPlugin('create_header', ['Доступные команды:', 2]);
            response += headerResult.success ? headerResult.data + "\n" : "**Доступные команды:**\n";
        } catch (e) {
            response += "**Доступные команды:**\n";
        }

        for (const command of commands) {
            try {
                const boldResult = await this.callMarkdownPlugin('format_bold', [command]);
                response += boldResult.success ? `\n${boldResult.data}` : `\n**${command}**`;
            } catch (e) {
                response += `\n**${command}**`;
            }
        }

        // Пример использования
        response += `\n\n`;
        try {
            const headerResult = await this.callMarkdownPlugin('create_header', ['Пример использования:', 2]);
            response += headerResult.success ? headerResult.data + "\n" : "**Пример использования:**\n";
        } catch (e) {
            response += "**Пример использования:**\n";
        }

        try {
            const codeResult = await this.callMarkdownPlugin('format_code', [`.${commands[0]}`]);
            response += codeResult.success ? codeResult.data : `\`.${commands[0]}\``;
        } catch (e) {
            response += `\`.${commands[0]}\``;
        }

        return response;
    }

    async callMarkdownPlugin(functionName, args = []) {
        try {
            const response = await fetch('http://localhost:6000/markdown' + functionName, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    args: args
                })
            });
            
            return await response.json();
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

const helpSystem = new HelpSystem();

module.exports = {
    commands: {
        "help": async (data) => {
            const args = data.params.args || [];
            const modules = await helpSystem.getAllModules();

            if (args.length === 0) {
                return await helpSystem.formatModuleList(modules);
            }

            const moduleName = args[0].toLowerCase();
            return await helpSystem.formatModuleHelp(moduleName);
        },
        
        "mdtest": async (data) => {
            // Тест MARKDOWN плагина
            try {
                const result = await helpSystem.callMarkdownPlugin('test', []);
                if (result.success) {
                    return result.data;
                } else {
                    return `❌ Ошибка MARKDOWN плагина: ${result.error}`;
                }
            } catch (error) {
                return `❌ Ошибка подключения к MARKDOWN плагину: ${error.message}`;
            }
        }
    }
};