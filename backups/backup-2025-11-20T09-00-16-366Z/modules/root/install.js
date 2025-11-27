module.exports = {
    commands: {
        "install": async (data) => {
            const fs = require('fs');
            const path = require('path');
            
            console.log('Install data:', JSON.stringify(data, null, 2));
            
            let fileContent = null;
            let fileName = null;
            
            // Вариант 1: ответ на сообщение с файлом
            if (data.params.reply_message && data.params.reply_message.document) {
                fileName = data.params.reply_message.document.file_name;
                fileContent = data.params.reply_message.text || data.params.reply_message.caption;
                
                if (!fileContent) {
                    return "❌ Файл получен, но содержимое недоступно. Убедитесь, что файл отправлен корректно.";
                }
            }
            // Вариант 2: ответ на сообщение с кодом
            else if (data.params.reply_message && data.params.reply_message.text) {
                fileContent = data.params.reply_message.text;
                const nameMatch = fileContent.match(/(@name|\/\/ name:)\s*([^\s\n]+)/);
                fileName = nameMatch ? nameMatch[2] + '.js' : 'module_' + Date.now() + '.js';
            }
            // Вариант 3: файл в основном сообщении
            else if (data.params.document) {
                fileName = data.params.document.file_name;
                fileContent = data.params.text || data.params.caption;
            }
            // Вариант 4: код в основном сообщении
            else if (data.params.text && data.params.text.includes('module.exports')) {
                fileContent = data.params.text;
                fileName = 'module_' + Date.now() + '.js';
            }
            // Вариант 5: код в аргументах
            else if (data.params.args && data.params.args.length > 0) {
                const code = data.params.args.join(' ');
                if (code.includes('module.exports')) {
                    fileContent = code;
                    fileName = 'module_' + Date.now() + '.js';
                }
            }

            if (!fileContent) {
                let response = "❌ Не удалось получить файл модуля\n\n";
                response += "📝 **Способы отправки модуля:**\n";
                response += "1. Ответьте на сообщение с файлом .js командой `.install`\n";
                response += "2. Ответьте на сообщение с кодом командой `.install`\n";
                response += "3. Отправьте код модуля в сообщении с командой `.install <код>`\n";
                response += "4. Прикрепите файл .js к сообщению с командой `.install`\n\n";
                response += "💡 **Пример:**\n";
                response += "• Ответьте на файл module.js: `.install`\n";
                response += "• Или отправьте: `.install module.exports = { commands: { test: () => 'test' } }`";
                return response;
            }

            // Убеждаемся что расширение .js
            if (!fileName.endsWith('.js')) {
                fileName += '.js';
            }

            try {
                const userModulesPath = path.join(__dirname, '..', '..', 'modules', 'user');
                
                if (!fs.existsSync(userModulesPath)) {
                    fs.mkdirSync(userModulesPath, { recursive: true });
                }

                const filePath = path.join(userModulesPath, fileName);
                
                // Проверяем что это валидный модуль
                if (!fileContent.includes('module.exports')) {
                    return "❌ Это не валидный модуль\n💡 Модуль должен содержать 'module.exports'";
                }
                
                if (!fileContent.includes('commands') || !fileContent.includes('commands:')) {
                    return "❌ Модуль должен содержать объект 'commands'";
                }
                
                // Проверяем синтаксис модуля
                try {
                    // Создаем временную функцию для проверки синтаксиса
                    new Function(fileContent);
                } catch (e) {
                    return `❌ Ошибка в синтаксисе модуля: ${e.message}`;
                }
                
                // Проверяем, не перезаписываем ли мы системный модуль
                const rootModulesPath = path.join(__dirname, '..', '..', 'modules', 'root');
                const rootModulePath = path.join(rootModulesPath, fileName);
                if (fs.existsSync(rootModulePath)) {
                    return `❌ Нельзя перезаписать системный модуль **${fileName}**`;
                }
                
                // Проверяем, существует ли уже такой модуль у пользователя
                if (fs.existsSync(filePath)) {
                    return `❌ Модуль **${fileName}** уже установлен. Используйте \`.uninstall ${fileName.replace('.js', '')}\` сначала`;
                }
                
                // Сохраняем файл
                fs.writeFileSync(filePath, fileContent, 'utf8');
                
                return `✅ Модуль **${fileName}** успешно установлен!\n🔄 Для применения модуля перезагрузите бота: \`.restart\``;
                
            } catch (error) {
                return `❌ Ошибка установки: ${error.message}`;
            }
        },

        "uninstall": async (data) => {
            const fs = require('fs');
            const path = require('path');
            
            const moduleName = data.params.args[0];
            
            if (!moduleName) {
                const availableModules = getAvailableModules();
                if (availableModules.length === 0) {
                    return "❌ Нет установленных модулей";
                }
                return "❌ Укажите название модуля\n💡 Пример: `.uninstall info`\n📦 Доступные модули: " + availableModules.join(', ');
            }

            const userModulesPath = path.join(__dirname, '..', '..', 'modules', 'user');
            const filePath = path.join(userModulesPath, moduleName + '.js');

            if (!fs.existsSync(filePath)) {
                const availableModules = getAvailableModules();
                return `❌ Модуль **${moduleName}** не найден\n📦 Доступные модули: ${availableModules.length > 0 ? availableModules.join(', ') : 'нет модулей'}`;
            }

            try {
                // Проверяем, не пытаемся ли удалить системный модуль
                const rootModulesPath = path.join(__dirname, '..', '..', 'modules', 'root');
                const rootModulePath = path.join(rootModulesPath, moduleName + '.js');
                if (fs.existsSync(rootModulePath)) {
                    return `❌ Нельзя удалить системный модуль **${moduleName}**`;
                }
                
                fs.unlinkSync(filePath);
                return `✅ Модуль **${moduleName}** удален\n🔄 Для применения изменений перезагрузите бота: \`.restart\``;
            } catch (error) {
                return `❌ Ошибка удаления: ${error.message}`;
            }
        },

        "modules": async (data) => {
            const fs = require('fs');
            const path = require('path');

            const userModulesPath = path.join(__dirname, '..', '..', 'modules', 'user');
            const rootModulesPath = path.join(__dirname, '..', '..', 'modules', 'root');
            
            let userModules = [];
            let rootModules = [];
            
            try {
                if (fs.existsSync(userModulesPath)) {
                    userModules = fs.readdirSync(userModulesPath)
                        .filter(file => file.endsWith('.js'))
                        .map(file => file.replace('.js', ''));
                }
                
                if (fs.existsSync(rootModulesPath)) {
                    rootModules = fs.readdirSync(rootModulesPath)
                        .filter(file => file.endsWith('.js'))
                        .map(file => file.replace('.js', ''));
                }
            } catch (error) {
                console.error('Error reading modules:', error);
            }

            let result = "📦 **СИСТЕМНЫЕ МОДУЛИ**\n";
            if (rootModules.length > 0) {
                rootModules.forEach(module => {
                    result += `🔧 ${module}\n`;
                });
            } else {
                result += "ℹ️ Нет системных модулей\n";
            }
            
            result += "\n👤 **ПОЛЬЗОВАТЕЛЬСКИЕ МОДУЛИ**\n";
            if (userModules.length > 0) {
                userModules.forEach(module => {
                    result += `🔹 ${module}\n`;
                });
                result += `\n📊 Всего пользовательских: ${userModules.length} модулей`;
            } else {
                result += "ℹ️ Модули не установлены\n";
            }

            result += "\n\n💡 **Команды:**";
            result += "\n`.install` - установить модуль (ответом на файл или код)";
            result += "\n`.uninstall <имя>` - удалить модуль";
            result += "\n`.modules` - список модулей";
            result += "\n`.module_info <имя>` - информация о модуле";

            return result;
        },

        "module_info": async (data) => {
            const fs = require('fs');
            const path = require('path');
            
            const moduleName = data.params.args[0];
            
            if (!moduleName) {
                return "❌ Укажите название модуля\n💡 Пример: `.module_info info`";
            }

            const userModulesPath = path.join(__dirname, '..', '..', 'modules', 'user');
            const rootModulesPath = path.join(__dirname, '..', '..', 'modules', 'root');
            
            let filePath = path.join(userModulesPath, moduleName + '.js');
            let moduleType = "пользовательский";
            
            if (!fs.existsSync(filePath)) {
                filePath = path.join(rootModulesPath, moduleName + '.js');
                moduleType = "системный";
                
                if (!fs.existsSync(filePath)) {
                    return `❌ Модуль **${moduleName}** не найден`;
                }
            }

            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const stats = fs.statSync(filePath);
                
                let info = `📄 **Информация о модуле:** ${moduleName}\n`;
                info += `📝 Тип: ${moduleType}\n`;
                info += `📏 Размер: ${(stats.size / 1024).toFixed(2)} KB\n`;
                info += `📅 Изменен: ${stats.mtime.toLocaleString()}\n`;
                
                // Пытаемся извлечь команды из модуля
                const commandMatches = content.match(/commands:\s*{([\s\S]*?)}(\s*,|\s*})/);
                if (commandMatches) {
                    const commandsSection = commandMatches[1];
                    const commands = commandsSection.match(/"([^"]+)":\s*\([^)]*\)\s*=>/g) || 
                                   commandsSection.match(/'([^']+)':\s*\([^)]*\)\s*=>/g) ||
                                   commandsSection.match(/(\w+):\s*\([^)]*\)\s*=>/g) ||
                                   commandsSection.match(/"([^"]+)":\s*async\s*\([^)]*\)/g) ||
                                   commandsSection.match(/'([^']+)':\s*async\s*\([^)]*\)/g);
                    
                    if (commands && commands.length > 0) {
                        const commandNames = commands.map(cmd => {
                            const match = cmd.match(/"([^"]+)"|'([^']+)'|(\w+)/);
                            return match[1] || match[2] || match[3];
                        }).filter(name => name && name !== 'commands');
                        
                        info += `⚡ Команды: ${commandNames.join(', ')}\n`;
                    }
                }
                
                // Извлекаем описание модуля если есть
                const descMatch = content.match(/(@description|\/\/ description:)\s*([^\n]+)/);
                if (descMatch) {
                    info += `📋 Описание: ${descMatch[2]}\n`;
                }
                
                if (moduleType === "пользовательский") {
                    info += `\n💡 Используйте \`.uninstall ${moduleName}\` для удаления`;
                }

                return info;
                
            } catch (error) {
                return `❌ Ошибка чтения модуля: ${error.message}`;
            }
        }
    }
};

// Вспомогательная функция для получения списка модулей
function getAvailableModules() {
    const fs = require('fs');
    const path = require('path');
    
    const userModulesPath = path.join(__dirname, '..', '..', 'modules', 'user');
    
    try {
        if (fs.existsSync(userModulesPath)) {
            return fs.readdirSync(userModulesPath)
                .filter(file => file.endsWith('.js'))
                .map(file => file.replace('.js', ''));
        }
    } catch (error) {
        console.error('Error getting modules:', error);
    }
    
    return [];
}