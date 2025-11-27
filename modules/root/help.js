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

    getModuleDescription(moduleName) {
        try {
            let modulePath = path.join(this.modulesPath, 'user', `${moduleName}.js`);
            if (!fs.existsSync(modulePath)) {
                modulePath = path.join(this.modulesPath, 'root', `${moduleName}.js`);
                if (!fs.existsSync(modulePath)) {
                    return null;
                }
            }

            const module = require(modulePath);
            return module.description || "Описание отсутствует";
        } catch (error) {
            return null;
        }
    }

    async formatModuleList(modules) {
        let response = "🎯 **Доступные модули**\n\n";
        
        // Системные модули
        if (modules.root.length > 0) {
            response += "🔧 **Системные модули:**\n";
            for (const module of modules.root) {
                const commands = this.getModuleCommands(module);
                const description = this.getModuleDescription(module);
                
                response += `• **${module}** - ${description}\n`;
                response += `  └─ ${commands.length} команд • \`.help ${module}\`\n\n`;
            }
        }

        // Пользовательские модули
        if (modules.user.length > 0) {
            response += "💫 **Пользовательские модули:**\n";
            for (const module of modules.user) {
                const commands = this.getModuleCommands(module);
                const description = this.getModuleDescription(module);
                
                response += `• **${module}** - ${description}\n`;
                response += `  └─ ${commands.length} команд • \`.help ${module}\`\n\n`;
            }
        }

        if (modules.root.length === 0 && modules.user.length === 0) {
            response += "📭 Модули не найдены\n\n";
        }

        response += "💡 **Использование:**\n";
        response += "• `.help` - показать этот список\n";
        response += "• `.help <модуль>` - информация о модуле\n";
        response += "• `.help all` - полный список команд\n";

        return response;
    }

    async formatModuleHelp(moduleName) {
        const commands = this.getModuleCommands(moduleName);
        const description = this.getModuleDescription(moduleName);
        
        if (commands.length === 0) {
            return `❌ Модуль **${moduleName}** не найден или не содержит команд`;
        }

        let response = `🎯 **Модуль: ${moduleName}**\n`;
        response += `📝 ${description}\n\n`;
        
        response += `🛠 **Доступные команды (${commands.length}):**\n`;
        
        for (const command of commands) {
            response += `\n• **.${command}**`;
        }

        response += `\n\n💡 **Пример:** \`.${commands[0]}\``;
        response += `\n📚 Используйте команду для получения подробной справки`;

        return response;
    }

    async formatAllCommands(modules) {
        let response = "📚 **Полный список команд**\n\n";
        let totalCommands = 0;

        // Собираем все команды из всех модулей
        const allCommands = [];
        
        for (const moduleType of ['root', 'user']) {
            for (const module of modules[moduleType]) {
                const commands = this.getModuleCommands(module);
                const description = this.getModuleDescription(module);
                
                commands.forEach(cmd => {
                    allCommands.push({
                        command: cmd,
                        module: module,
                        description: description
                    });
                });
                totalCommands += commands.length;
            }
        }

        // Сортируем команды по алфавиту
        allCommands.sort((a, b) => a.command.localeCompare(b.command));

        // Формируем список
        allCommands.forEach(cmd => {
            response += `• **.${cmd.command}** - ${cmd.module}\n`;
        });

        response += `\n📊 **Всего команд:** ${totalCommands}`;
        response += `\n💡 Используйте \`.help <модуль>\` для подробной информации`;

        return response;
    }
}

const helpSystem = new HelpSystem();

module.exports = {
    description: "помощь",
    commands: {
        "help": async (data) => {
            const args = data.params.args || [];
            const modules = await helpSystem.getAllModules();

            if (args.length === 0) {
                return await helpSystem.formatModuleList(modules);
            }

            const moduleName = args[0].toLowerCase();
            
            if (moduleName === 'all') {
                return await helpSystem.formatAllCommands(modules);
            }

            return await helpSystem.formatModuleHelp(moduleName);
        }
    }
};