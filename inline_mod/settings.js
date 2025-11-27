
const { InlineKeyboard } = require('grammy');
const fs = require('fs');
const path = require('path');

module.exports = class SettingsModule {
    constructor(inlineBot) {
        this.inlineBot = inlineBot;
        this.name = "settings";
        this.configs = new Map();
        this.editSessions = new Map();
        this.loadConfigs();
    }

    loadConfigs() {
        try {
            const configPath = path.join(__dirname, '..', 'module_configs.json');
            if (fs.existsSync(configPath)) {
                const configData = fs.readFileSync(configPath, 'utf8');
                const configs = JSON.parse(configData);
                this.configs = new Map(Object.entries(configs));
            }
        } catch (error) {
            console.error('Error loading configs:', error);
        }
    }

    saveConfigs() {
        try {
            const configPath = path.join(__dirname, '..', 'module_configs.json');
            const configObj = Object.fromEntries(this.configs);
            fs.writeFileSync(configPath, JSON.stringify(configObj, null, 2));
        } catch (error) {
            console.error('Error saving configs:', error);
        }
    }

    getModuleConfig(moduleName) {
        if (!this.configs.has(moduleName)) {
            // Базовая конфигурация для модуля
            this.configs.set(moduleName, {
                enabled: true,
                settings: this.getDefaultSettings(moduleName)
            });
        }
        return this.configs.get(moduleName);
    }

    getDefaultSettings(moduleName) {
        // Дефолтные настройки для разных типов модулей
        const defaultSettings = {
            'admin_manager': {
                'notifications': { type: 'boolean', value: true, name: 'Уведомления' },
                'log_actions': { type: 'boolean', value: false, name: 'Логирование действий' },
                'auto_backup': { type: 'boolean', value: true, name: 'Авто-бэкап' }
            },
            'info': {
                'show_detailed': { type: 'boolean', value: true, name: 'Детальная информация' },
                'include_stats': { type: 'boolean', value: true, name: 'Включать статистику' },
                'cache_time': { type: 'number', value: 300, name: 'Время кэша (сек)' }
            },
            'servers': {
                'auto_restart': { type: 'boolean', value: true, name: 'Авто-рестарт' },
                'check_interval': { type: 'number', value: 60, name: 'Интервал проверки (сек)' },
                'notification_chat': { type: 'string', value: '', name: 'Чат для уведомлений' }
            },
            'language_system': {
                'default_lang': { type: 'string', value: 'ru', name: 'Язык по умолчанию' },
                'auto_translate': { type: 'boolean', value: false, name: 'Авто-перевод' }
            }
        };

        return defaultSettings[moduleName] || {
            'enabled': { type: 'boolean', value: true, name: 'Включен' },
            'debug_mode': { type: 'boolean', value: false, name: 'Режим отладки' }
        };
    }

    async handleInlineQuery(query, ctx) {
        const results = [];

        if (!query || query === 'settings' || query === 'настройки') {
            results.push({
                type: 'article',
                id: 'modules_list',
                title: '📋 Список модулей',
                description: 'Просмотр и управление модулями',
                input_message_content: {
                    message_text: '⚙️ **Управление модулей**\n\nВыберите действие:',
                    parse_mode: 'Markdown'
                },
                reply_markup: new InlineKeyboard()
                    .text('📋 Список модулей', 'settings:modules_list')
                    .text('🔧 Конфигурация', 'settings:global_config')
            });

            results.push({
                type: 'article',
                id: 'global_config',
                title: '🔧 Глобальные настройки',
                description: 'Настройки префикса и других параметров',
                input_message_content: {
                    message_text: '🔧 **Глобальные настройки**\n\nУправление общими настройками бота:',
                    parse_mode: 'Markdown'
                },
                reply_markup: new InlineKeyboard()
                    .text('⚙️ Префикс команд', 'settings:change_prefix')
                    .text('📊 Статистика', 'settings:stats')
            });
        }

        if (query === 'config' || query === 'конфиг') {
            results.push({
                type: 'article',
                id: 'module_config',
                title: '🔧 Конфигурация модулей',
                description: 'Настройки параметров модулей',
                input_message_content: {
                    message_text: '🔧 **Конфигурация модулей**\n\nНастройте параметры каждого модуля:',
                    parse_mode: 'Markdown'
                },
                reply_markup: new InlineKeyboard()
                    .text('📋 Модули с настройками', 'settings:configurable_modules')
            });
        }

        return results;
    }

    async handleCallbackQuery(callbackData, ctx, message) {
        if (!callbackData.startsWith('settings:')) {
            return false;
        }

        const action = callbackData.replace('settings:', '');

        try {
            switch (action) {
                case 'modules_list':
                    await this.showModulesList(ctx);
                    return true;

                case 'global_config':
                    await this.showGlobalConfig(ctx);
                    return true;

                case 'change_prefix':
                    await this.showPrefixSettings(ctx);
                    return true;

                case 'stats':
                    await this.showStats(ctx);
                    return true;

                case 'configurable_modules':
                    await this.showConfigurableModules(ctx);
                    return true;

                case 'back_to_main':
                    await this.showMainMenu(ctx);
                    return true;

                default:
                    if (action.startsWith('module_')) {
                        const moduleName = action.replace('module_', '');
                        await this.showModuleSettings(ctx, moduleName);
                        return true;
                    }
                    if (action.startsWith('toggle_')) {
                        const parts = action.replace('toggle_', '').split('_');
                        const moduleName = parts[0];
                        const settingName = parts[1];
                        await this.toggleBooleanSetting(ctx, moduleName, settingName);
                        return true;
                    }
                    if (action.startsWith('edit_')) {
                        const parts = action.replace('edit_', '').split('_');
                        const moduleName = parts[0];
                        const settingName = parts[1];
                        await this.startEditSetting(ctx, moduleName, settingName);
                        return true;
                    }
                    if (action.startsWith('cancel_')) {
                        const parts = action.replace('cancel_', '').split('_');
                        const moduleName = parts[0];
                        await this.showModuleSettings(ctx, moduleName);
                        return true;
                    }
                    return false;
            }
        } catch (error) {
            console.error('Settings module error:', error);
            await ctx.answerCallbackQuery({ text: 'Ошибка выполнения' });
            return true;
        }
    }

    async showMainMenu(ctx) {
        const text = '⚙️ **Управление модулями**\n\nВыберите раздел настроек:';
        
        const keyboard = new InlineKeyboard()
            .text('📋 Список модулей', 'settings:modules_list')
            .text('🔧 Глобальные настройки', 'settings:global_config')
            .row()
            .text('🔧 Конфигурация модулей', 'settings:configurable_modules');

        await ctx.editMessageText(text, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
        await ctx.answerCallbackQuery();
    }

    async showModulesList(ctx) {
        const availableCommands = this.inlineBot.moduleLoader.getAvailableCommands();
        const modulesMap = new Map();
        
        // Группируем команды по модулям
        availableCommands.forEach(cmd => {
            const handler = this.inlineBot.moduleLoader.commands.get(cmd);
            if (handler && handler.__moduleName) {
                const moduleName = handler.__moduleName;
                if (!modulesMap.has(moduleName)) {
                    modulesMap.set(moduleName, {
                        name: moduleName,
                        commands: [],
                        path: handler.__modulePath,
                        isUserModule: handler.__modulePath.includes('user')
                    });
                }
                modulesMap.get(moduleName).commands.push(cmd);
            }
        });

        const modules = Array.from(modulesMap.values());
        
        let text = '📋 **Список модулей**\n\n';
        
        modules.forEach(module => {
            const moduleType = module.isUserModule ? '👤' : '⚙️';
            const config = this.getModuleConfig(module.name);
            const status = config.enabled ? '✅' : '❌';
            
            text += `${status} ${moduleType} **${module.name}**\n`;
            text += `   Команд: ${module.commands.length}\n`;
            text += `   Настроек: ${Object.keys(config.settings).length}\n\n`;
        });

        text += `Всего модулей: ${modules.length}`;

        const keyboard = new InlineKeyboard();
        
        // Добавляем кнопки для каждого модуля
        modules.forEach((module, index) => {
            if (index % 2 === 0 && index > 0) {
                keyboard.row();
            }
            keyboard.text(module.name, `settings:module_${module.name}`);
        });

        keyboard.row().text('🔙 Назад', 'settings:back_to_main');

        await ctx.editMessageText(text, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
        await ctx.answerCallbackQuery();
    }

    async showModuleSettings(ctx, moduleName) {
        const availableCommands = this.inlineBot.moduleLoader.getAvailableCommands();
        const moduleCommands = availableCommands.filter(cmd => {
            const handler = this.inlineBot.moduleLoader.commands.get(cmd);
            return handler && handler.__moduleName === moduleName;
        });

        const config = this.getModuleConfig(moduleName);
        
        let text = `⚙️ **Настройки модуля: ${moduleName}**\n\n`;
        text += `**Статус:** ${config.enabled ? '✅ Включен' : '❌ Выключен'}\n`;
        text += `**Команд:** ${moduleCommands.length}\n\n`;
        
        text += `**Доступные команды:**\n`;
        moduleCommands.forEach(cmd => {
            text += `• \`${cmd}\`\n`;
        });

        text += `\n**Настройки модуля:**\n`;
        
        const keyboard = new InlineKeyboard();
        let settingsCount = 0;

        Object.entries(config.settings).forEach(([key, setting]) => {
            if (setting.type === 'boolean') {
                const buttonText = setting.value ? `✅ ${setting.name}` : `❌ ${setting.name}`;
                keyboard.text(buttonText, `settings:toggle_${moduleName}_${key}`);
                settingsCount++;
            } else if (setting.type === 'string' || setting.type === 'number') {
                const valueDisplay = setting.value || 'не задано';
                const buttonText = `📝 ${setting.name}: ${valueDisplay}`;
                keyboard.text(buttonText, `settings:edit_${moduleName}_${key}`);
                settingsCount++;
            }

            // Добавляем новую строку после каждой второй настройки
            if (settingsCount % 2 === 0) {
                keyboard.row();
            }
        });

        // Добавляем кнопку для добавления новой настройки
        if (settingsCount > 0) {
            keyboard.row();
        }
        keyboard.text('➕ Добавить настройку', `settings:add_setting_${moduleName}`);
        keyboard.row().text('🔙 Назад к списку', 'settings:modules_list');

        await ctx.editMessageText(text, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
        await ctx.answerCallbackQuery();
    }

    async toggleBooleanSetting(ctx, moduleName, settingName) {
        const config = this.getModuleConfig(moduleName);
        if (config.settings[settingName] && config.settings[settingName].type === 'boolean') {
            config.settings[settingName].value = !config.settings[settingName].value;
            this.saveConfigs();

            await this.showModuleSettings(ctx, moduleName);
            await ctx.answerCallbackQuery({ 
                text: `Настройка "${config.settings[settingName].name}" ${config.settings[settingName].value ? 'включена' : 'выключена'}`
            });
        }
    }

    async startEditSetting(ctx, moduleName, settingName) {
        const config = this.getModuleConfig(moduleName);
        const setting = config.settings[settingName];
        
        if (!setting) {
            await ctx.answerCallbackQuery({ text: 'Настройка не найдена' });
            return;
        }

        const userId = ctx.from.id;
        this.editSessions.set(userId, {
            moduleName,
            settingName,
            settingType: setting.type
        });

        let text = `📝 **Изменение настройки**\n\n`;
        text += `**Модуль:** ${moduleName}\n`;
        text += `**Параметр:** ${setting.name}\n`;
        text += `**Тип:** ${setting.type}\n`;
        text += `**Текущее значение:** ${setting.value || 'не задано'}\n\n`;

        if (setting.type === 'string') {
            text += `Введите новое текстовое значение:\n`;
            text += `Пример: @username или любой текст`;
        } else if (setting.type === 'number') {
            text += `Введите новое числовое значение:\n`;
            text += `Пример: 60 или 100`;
        }

        text += `\n\n**Отправьте новое значение в ответ на это сообщение**`;

        const keyboard = new InlineKeyboard()
            .text('❌ Отмена', `settings:cancel_${moduleName}`);

        await ctx.editMessageText(text, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
        await ctx.answerCallbackQuery();
    }

    async handleTextMessage(ctx) {
        const userId = ctx.from.id;
        const session = this.editSessions.get(userId);
        
        if (!session) {
            return false;
        }

        const newValue = ctx.message.text;
        const { moduleName, settingName, settingType } = session;

        const config = this.getModuleConfig(moduleName);
        const setting = config.settings[settingName];

        if (!setting) {
            await ctx.reply('❌ Настройка не найдена');
            this.editSessions.delete(userId);
            return true;
        }

        try {
            // Валидация значения
            if (settingType === 'number') {
                const numValue = parseFloat(newValue);
                if (isNaN(numValue)) {
                    await ctx.reply('❌ Введите корректное число');
                    return true;
                }
                setting.value = numValue;
            } else {
                setting.value = newValue;
            }

            this.saveConfigs();
            this.editSessions.delete(userId);

            await ctx.reply(`✅ Настройка "${setting.name}" обновлена: ${setting.value}`);

            // Возвращаемся к настройкам модуля
            const keyboard = new InlineKeyboard()
                .text('🔙 К настройкам модуля', `settings:module_${moduleName}`);

            await ctx.reply('Вернуться к настройкам модуля:', { reply_markup: keyboard });

        } catch (error) {
            await ctx.reply('❌ Ошибка сохранения настройки');
            console.error('Error saving setting:', error);
        }

        return true;
    }

    async showGlobalConfig(ctx) {
        let text = '🔧 **Глобальные настройки**\n\n';
        text += 'Настройте общие параметры бота:\n\n';
        
        text += '⚙️ **Префикс команд**\n';
        text += 'Текущий префикс: `.`\n\n';
        
        text += '📊 **Статистика**\n';
        text += 'Просмотр статистики бота';

        const keyboard = new InlineKeyboard()
            .text('⚙️ Изменить префикс', 'settings:change_prefix')
            .text('📊 Статистика', 'settings:stats')
            .row()
            .text('🔙 Назад', 'settings:back_to_main');

        await ctx.editMessageText(text, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
        await ctx.answerCallbackQuery();
    }

    async showPrefixSettings(ctx) {
        const text = '⚙️ **Настройка префикса**\n\n' +
                   'Текущий префикс: `.`\n\n' +
                   'Для изменения префикса используйте команду:\n' +
                   '`.setprefix <новый_префикс>`\n\n' +
                   'Пример: `.setprefix !`';

        const keyboard = new InlineKeyboard()
            .text('🔙 Назад', 'settings:global_config');

        await ctx.editMessageText(text, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
        await ctx.answerCallbackQuery();
    }

    async showStats(ctx) {
        const availableCommands = this.inlineBot.moduleLoader.getAvailableCommands();
        const modulesMap = new Map();
        
        availableCommands.forEach(cmd => {
            const handler = this.inlineBot.moduleLoader.commands.get(cmd);
            if (handler && handler.__moduleName) {
                const moduleName = handler.__moduleName;
                if (!modulesMap.has(moduleName)) {
                    modulesMap.set(moduleName, {
                        name: moduleName,
                        commands: []
                    });
                }
                modulesMap.get(moduleName).commands.push(cmd);
            }
        });

        let text = '📊 **Статистика бота**\n\n';
        text += `**Всего модулей:** ${modulesMap.size}\n`;
        text += `**Всего команд:** ${availableCommands.length}\n\n`;
        
        text += '**Модули по типам:**\n';
        let userModules = 0;
        let systemModules = 0;
        
        modulesMap.forEach(module => {
            const handler = this.inlineBot.moduleLoader.commands.get(module.commands[0]);
            if (handler && handler.__modulePath.includes('user')) {
                userModules++;
            } else {
                systemModules++;
            }
        });
        
        text += `👤 Пользовательские: ${userModules}\n`;
        text += `⚙️ Системные: ${systemModules}\n`;

        const keyboard = new InlineKeyboard()
            .text('🔙 Назад', 'settings:global_config');

        await ctx.editMessageText(text, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
        await ctx.answerCallbackQuery();
    }

    async showConfigurableModules(ctx) {
        const text = '🔧 **Конфигурация модулей**\n\n' +
                   'Выберите модуль для настройки его параметров:';

        const keyboard = new InlineKeyboard()
            .text('📋 Список модулей', 'settings:modules_list')
            .row()
            .text('🔙 Назад', 'settings:back_to_main');

        await ctx.editMessageText(text, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
        });
        await ctx.answerCallbackQuery();
    }
}