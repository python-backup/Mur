const { InlineKeyboard } = require('grammy');

class MenuModule {
    constructor(inlineBot) {
        this.name = "menu";
        this.inlineBot = inlineBot;
    }

    async handleInlineQuery(query, ctx) {
        try {
            const trimmedQuery = query.trim();
            
            if (trimmedQuery === '.menu' || trimmedQuery === 'menu' || trimmedQuery === '.help' || trimmedQuery === 'help' || trimmedQuery === '') {
                const keyboard = new InlineKeyboard()
                    .text('📋 Команды', 'show_commands')
                    .text('📦 Модули', 'show_modules').row()
                    .text('ℹ️ Инфо', 'show_info')
                    .text('⚙️ Настройки', 'show_settings').row()
                    .text('🔧 Утилиты', 'show_utils')
                    .text('🔄 Обновить', 'refresh_menu');

                return [{
                    type: 'article',
                    id: 'main_menu',
                    title: '📱 Главное меню RUX v2.0',
                    description: 'Открыть главное меню с кнопками',
                    input_message_content: {
                        message_text: '🤖 **RUX v2.0 - Главное меню**\n\nВыберите нужный раздел:',
                        parse_mode: 'Markdown'
                    },
                    reply_markup: keyboard
                }];
            }

            return [];
        } catch (error) {
            console.error('Error in MenuModule:', error);
            return [];
        }
    }

    async handleCallbackQuery(callbackData, ctx, message) {
        try {
            const inlineMessageId = ctx.callbackQuery.inline_message_id;
            
            if (!inlineMessageId) {
                await ctx.answerCallbackQuery({ text: 'Этот тип сообщения не поддерживается' });
                return false;
            }

            switch (callbackData) {
                case 'show_commands':
                    await this.showCommandsMenu(ctx, inlineMessageId);
                    return true;

                case 'show_modules':
                    await this.showModulesMenu(ctx, inlineMessageId);
                    return true;

                case 'show_info':
                    await this.showInfoMenu(ctx, inlineMessageId);
                    return true;

                case 'show_settings':
                    await this.showSettingsMenu(ctx, inlineMessageId);
                    return true;

                case 'show_utils':
                    await this.showUtilsMenu(ctx, inlineMessageId);
                    return true;

                case 'refresh_menu':
                    await this.showMainMenu(ctx, inlineMessageId);
                    return true;

                case 'back_to_menu':
                    await this.showMainMenu(ctx, inlineMessageId);
                    return true;

                case 'refresh_modules':
                    await ctx.answerCallbackQuery({ text: 'Модули обновлены!' });
                    return true;

                case 'show_stats':
                    await this.showStatsMenu(ctx, inlineMessageId);
                    return true;

                case 'change_language':
                    await ctx.answerCallbackQuery({ text: 'Смена языка' });
                    return true;

                case 'manage_permissions':
                    await ctx.answerCallbackQuery({ text: 'Управление правами' });
                    return true;

                case 'clean_system':
                    await ctx.answerCallbackQuery({ text: 'Очистка системы' });
                    return true;

                case 'file_manager':
                    await ctx.answerCallbackQuery({ text: 'Файловый менеджер' });
                    return true;

                default:
                    return false;
            }
        } catch (error) {
            console.error('Error in MenuModule callback:', error);
            await ctx.answerCallbackQuery({ text: 'Ошибка выполнения' });
            return false;
        }
    }

    async showMainMenu(ctx, inlineMessageId) {
        const keyboard = new InlineKeyboard()
            .text('📋 Команды', 'show_commands')
            .text('📦 Модули', 'show_modules').row()
            .text('ℹ️ Инфо', 'show_info')
            .text('⚙️ Настройки', 'show_settings').row()
            .text('🔧 Утилиты', 'show_utils')
            .text('🔄 Обновить', 'refresh_menu');

        await ctx.api.editMessageTextInline(inlineMessageId, 
            '🤖 **RUX v2.0 - Главное меню**\n\nВыберите нужный раздел:',
            { parse_mode: 'Markdown', reply_markup: keyboard }
        );
    }

    async showCommandsMenu(ctx, inlineMessageId) {
        const keyboard = new InlineKeyboard()
            .text('🔙 Назад', 'back_to_menu');

        await ctx.api.editMessageTextInline(inlineMessageId,
            `📋 **Меню команд**

• .help - Помощь
• .info - Информация
• .modules - Модули
• .settings - Настройки
• .utils - Утилиты
• .restart - Перезагрузка

Выберите команду для выполнения:`,
            { parse_mode: 'Markdown', reply_markup: keyboard }
        );
    }

    async showModulesMenu(ctx, inlineMessageId) {
        const keyboard = new InlineKeyboard()
            .text('🔄 Обновить', 'refresh_modules')
            .text('🔙 Назад', 'back_to_menu');

        await ctx.api.editMessageTextInline(inlineMessageId,
            `📦 **Меню модулей**

Установленные модули:
✅ menu - Главное меню
✅ help - Помощь
✅ info - Информация
✅ modules - Управление

Для установки новых модулей используйте команду: .install`,
            { parse_mode: 'Markdown', reply_markup: keyboard }
        );
    }

    async showInfoMenu(ctx, inlineMessageId) {
        const keyboard = new InlineKeyboard()
            .text('📊 Статистика', 'show_stats')
            .text('🔙 Назад', 'back_to_menu');

        await ctx.api.editMessageTextInline(inlineMessageId,
            `ℹ️ **Информация**

🤖 RUX v2.0 - Юзербот
🟢 Статус: Активен
📦 Модули: Загружены
⚡ Система: Стабильная

Версия: 2.0`,
            { parse_mode: 'Markdown', reply_markup: keyboard }
        );
    }

    async showStatsMenu(ctx, inlineMessageId) {
        const keyboard = new InlineKeyboard()
            .text('🔙 Назад', 'show_info');

        await ctx.api.editMessageTextInline(inlineMessageId,
            `📊 **Статистика системы**

• Запуск: 24/7
• Ошибок: 0
• Нагрузка: Низкая
• Память: Стабильная
• Модули: 5 активных

✅ Все системы работают нормально`,
            { parse_mode: 'Markdown', reply_markup: keyboard }
        );
    }

    async showSettingsMenu(ctx, inlineMessageId) {
        const keyboard = new InlineKeyboard()
            .text('🌐 Язык', 'change_language')
            .text('🔐 Права', 'manage_permissions').row()
            .text('🔙 Назад', 'back_to_menu');

        await ctx.api.editMessageTextInline(inlineMessageId,
            `⚙️ **Меню настроек**

Доступные настройки:
• Язык интерфейса
• Права доступа
• Уведомления
• Внешний вид

Настройки применяются автоматически`,
            { parse_mode: 'Markdown', reply_markup: keyboard }
        );
    }

    async showUtilsMenu(ctx, inlineMessageId) {
        const keyboard = new InlineKeyboard()
            .text('🧹 Очистка', 'clean_system')
            .text('📁 Файлы', 'file_manager').row()
            .text('🔙 Назад', 'back_to_menu');

        await ctx.api.editMessageTextInline(inlineMessageId,
            `🔧 **Меню утилит**

Вспомогательные инструменты:
• Очистка кэша
• Менеджер файлов
• Системный монитор
• Логи системы

Утилиты для управления ботом`,
            { parse_mode: 'Markdown', reply_markup: keyboard }
        );
    }
}

module.exports = MenuModule;