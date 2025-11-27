// inline_mod/update.js
const { InlineKeyboard } = require('grammy');

class UpdateModule {
    constructor(inlineBot) {
        this.name = "update";
        this.inlineBot = inlineBot;
    }

    async handleInlineQuery(query, ctx) {
        if (query.trim() === 'update' || query.trim() === 'обновить') {
            return [{
                type: 'article',
                id: 'update_bot',
                title: '🔄 Обновить RUX UserBot',
                description: 'Проверить и установить обновления',
                input_message_content: {
                    message_text: '🔄 **Обновление RUX UserBot**\n\nВыберите действие:',
                    parse_mode: 'Markdown'
                },
                reply_markup: new InlineKeyboard()
                    .text('🔍 Проверить', 'check_update')
                    .text('⚡ Обновить', 'pull_update')
                    .row()
                    .text('🔄 Перезапустить', 'restart_bot')
            }];
        }

        return [];
    }

    async handleCallbackQuery(callbackData, ctx, message) {
        if (callbackData.startsWith('check_update')) {
            await this.handleCheckUpdate(ctx);
            return true;
        }

        if (callbackData.startsWith('pull_update')) {
            await this.handlePullUpdate(ctx);
            return true;
        }

        if (callbackData.startsWith('restart_bot')) {
            await this.handleRestartBot(ctx);
            return true;
        }

        return false;
    }

    async handleCheckUpdate(ctx) {
        try {
            await ctx.answerCallbackQuery({ text: '🔍 Проверяем обновления...' });

            const response = await this.executeCommand('update', ['check']);
            
            await ctx.editMessageText(response, {
                parse_mode: 'Markdown',
                reply_markup: new InlineKeyboard()
                    .text('⚡ Обновить', 'pull_update')
                    .text('🔍 Проверить снова', 'check_update')
            });

        } catch (error) {
            await ctx.editMessageText(`❌ Ошибка: ${error.message}`, {
                reply_markup: new InlineKeyboard()
                    .text('🔄 Попробовать снова', 'check_update')
            });
        }
    }

    async handlePullUpdate(ctx) {
        try {
            await ctx.answerCallbackQuery({ text: '⚡ Начинаем обновление...' });

            const response = await this.executeCommand('update', ['pull']);
            
            await ctx.editMessageText(response, {
                parse_mode: 'Markdown',
                reply_markup: new InlineKeyboard()
                    .text('🔄 Перезапустить', 'restart_bot')
                    .text('🔍 Проверить обновления', 'check_update')
            });

        } catch (error) {
            await ctx.editMessageText(`❌ Ошибка обновления: ${error.message}`, {
                reply_markup: new InlineKeyboard()
                    .text('🔄 Попробовать снова', 'pull_update')
                    .text('🔍 Проверить обновления', 'check_update')
            });
        }
    }

    async handleRestartBot(ctx) {
        try {
            await ctx.answerCallbackQuery({ text: '🔄 Перезапускаем бота...' });

            const response = await this.executeCommand('update', ['restart']);
            
            await ctx.editMessageText(response, {
                parse_mode: 'Markdown'
            });

        } catch (error) {
            await ctx.editMessageText(`❌ Ошибка перезапуска: ${error.message}`, {
                reply_markup: new InlineKeyboard()
                    .text('🔄 Попробовать снова', 'restart_bot')
            });
        }
    }

    async executeCommand(command, args = []) {
        const axios = require('axios');
        
        try {
            const response = await axios.post(`http://localhost:3000/command/${command}`, {
                username: 'inline_bot',
                params: { args }
            }, { timeout: 30000 });

            if (response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data.error);
            }
        } catch (error) {
            if (error.response) {
                throw new Error(error.response.data.error || 'Unknown error');
            } else {
                throw new Error(error.message);
            }
        }
    }
}

module.exports = UpdateModule;