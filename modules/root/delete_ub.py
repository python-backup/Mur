// modules/user/self_destruct.js
const fs = require('fs');
const path = require('path');
const { Bot, InlineKeyboard } = require('grammy');

class SelfDestructModule {
    constructor() {
        this.confirmationRequests = new Map(); // хранит ожидающие подтверждения
        this.bot = new Bot("8509450905:AAHIUJNdmNdWt--8p5mVb7EMc0aPXkPn5OQ");
    }

    // Основная команда для запуска процесса удаления
    async initiateSelfDestruct(data) {
        const username = data.username;
        
        return `🗑️ **Удаление RUX Юзербота**\n\n` +
               `⚠️ **ВНИМАНИЕ:** Это действие невозможно отменить!\n\n` +
               `Будет удалено:\n` +
               `• 📁 Файл сессии\n` +
               `• 🗃️ База данных\n` +
               `• ⚙️ Все настройки\n` +
               `• 📦 Пользовательские модули\n\n` +
               `Для подтверждения используйте инлайн-режим:\n` +
               `Напишите @rux_v2_bot в любом чате и выберите "Удалить мой RUX"`;
    }

    // Обработчик инлайн-запросов
    async handleInlineQuery(query, ctx) {
        if (query.includes('удалить') || query.includes('delete') || query.includes('selfdestruct')) {
            const username = ctx.inlineQuery.from.username;
            
            if (!username) {
                return [{
                    type: 'article',
                    id: 'no_username',
                    title: '❌ Ошибка',
                    description: 'У вас должен быть username в Telegram',
                    input_message_content: {
                        message_text: '❌ Для удаления бота у вас должен быть установлен username в Telegram',
                        parse_mode: 'Markdown'
                    }
                }];
            }

            // Сохраняем запрос на подтверждение
            this.confirmationRequests.set(username, {
                userId: ctx.inlineQuery.from.id,
                timestamp: Date.now()
            });

            const keyboard = new InlineKeyboard()
                .text('✅ Да, удалить всё', `confirm_destruct_${username}`)
                .text('❌ Отмена', `cancel_destruct_${username}`);

            return [{
                type: 'article',
                id: 'self_destruct',
                title: '🗑️ Удалить мой RUX',
                description: 'Полное удаление юзербота и всех данных',
                input_message_content: {
                    message_text: `🗑️ **Подтверждение удаления RUX Юзербота**\n\n` +
                                `Пользователь: @${username}\n\n` +
                                `⚠️ **Будет удалено без возможности восстановления:**\n` +
                                `• Файл сессии и авторизация\n` +
                                `• База данных с настройками\n` +
                                `• Все пользовательские модули\n` +
                                `• История и конфигурация\n\n` +
                                `❓ **Вы уверены?**`,
                    parse_mode: 'Markdown'
                },
                reply_markup: keyboard
            }];
        }

        return [];
    }

    // Обработчик callback-ов от кнопок
    async handleCallbackQuery(callbackQuery) {
        const data = callbackQuery.data;
        const username = callbackQuery.from.username;
        
        if (!data.startsWith('confirm_destruct_') && !data.startsWith('cancel_destruct_')) {
            return;
        }

        const targetUsername = data.split('_').pop();
        
        // Проверяем, что это тот же пользователь
        if (username !== targetUsername) {
            await this.bot.api.answerCallbackQuery(callbackQuery.id, {
                text: '❌ Это не ваш запрос на удаление!',
                show_alert: true
            });
            return;
        }

        if (data.startsWith('cancel_destruct_')) {
            this.confirmationRequests.delete(username);
            await this.bot.api.answerCallbackQuery(callbackQuery.id, {
                text: '✅ Удаление отменено',
                show_alert: true
            });
            
            // Редактируем сообщение
            try {
                await this.bot.api.editMessageText(
                    callbackQuery.message.chat.id,
                    callbackQuery.message.message_id,
                    {
                        text: '✅ **Удаление отменено**\n\nВаш RUX юзербот продолжает работать.',
                        parse_mode: 'Markdown'
                    }
                );
            } catch (e) {
                console.log('Error editing message:', e);
            }
            return;
        }

        if (data.startsWith('confirm_destruct_')) {
            try {
                await this.bot.api.answerCallbackQuery(callbackQuery.id, {
                    text: '🗑️ Начинаю удаление...',
                    show_alert: true
                });

                // Выполняем удаление
                const result = await this.executeSelfDestruct(username);
                
                // Редактируем сообщение с результатом
                await this.bot.api.editMessageText(
                    callbackQuery.message.chat.id,
                    callbackQuery.message.message_id,
                    {
                        text: result,
                        parse_mode: 'Markdown'
                    }
                );

                this.confirmationRequests.delete(username);

            } catch (error) {
                console.error('Self-destruct error:', error);
                await this.bot.api.answerCallbackQuery(callbackQuery.id, {
                    text: '❌ Ошибка при удалении',
                    show_alert: true
                });
            }
        }
    }

    // Функция выполнения удаления
    async executeSelfDestruct(username) {
        try {
            const filesToDelete = [];
            
            // 1. Файлы сессии Pyrogram
            const sessionFiles = [
                'my_bot.session',
                'my_bot.session-journal',
                'my_bot2.session',
                'my_bot2.session-journal'
            ];
            
            sessionFiles.forEach(file => {
                if (fs.existsSync(file)) {
                    filesToDelete.push(file);
                    fs.unlinkSync(file);
                }
            });

            // 2. База данных
            const dbFile = './bot.db';
            if (fs.existsSync(dbFile)) {
                filesToDelete.push(dbFile);
                fs.unlinkSync(dbFile);
            }

            // 3. Пользовательские модули
            const userModulesPath = path.join(__dirname, '..', '..', 'modules', 'user');
            if (fs.existsSync(userModulesPath)) {
                const userModules = fs.readdirSync(userModulesPath);
                userModules.forEach(module => {
                    if (module.endsWith('.js')) {
                        const modulePath = path.join(userModulesPath, module);
                        filesToDelete.push(`modules/user/${module}`);
                        fs.unlinkSync(modulePath);
                    }
                });
            }

            // 4. Python плагины
            const pythonPluginsPath = './python_plugins';
            if (fs.existsSync(pythonPluginsPath)) {
                const plugins = fs.readdirSync(pythonPluginsPath);
                plugins.forEach(plugin => {
                    if (plugin.endsWith('.py')) {
                        const pluginPath = path.join(pythonPluginsPath, plugin);
                        filesToDelete.push(`python_plugins/${plugin}`);
                        fs.unlinkSync(pluginPath);
                    }
                });
            }

            // 5. Логи и временные файлы
            const logFiles = ['bot.log', 'error.log', 'session.log'];
            logFiles.forEach(logFile => {
                if (fs.existsSync(logFile)) {
                    filesToDelete.push(logFile);
                    fs.unlinkSync(logFile);
                }
            });

            // Очищаем подтверждения
            this.confirmationRequests.clear();

            let resultMessage = `🗑️ **RUX Юзербот удален!**\n\n` +
                              `👤 Пользователь: @${username}\n` +
                              `📊 Удалено файлов: ${filesToDelete.length}\n\n` +
                              `📁 **Удаленные файлы:**\n`;
            
            filesToDelete.forEach((file, index) => {
                if (index < 15) { // Показываем первые 15 файлов
                    resultMessage += `• ${file}\n`;
                }
            });

            if (filesToDelete.length > 15) {
                resultMessage += `• ... и еще ${filesToDelete.length - 15} файлов\n`;
            }

            resultMessage += `\n⚠️ **Для полной остановки:**\n` +
                           `• Завершите процессы Python (py_bot.py)\n` +
                           `• Завершите процессы Node.js (node_server.js)\n` +
                           `• Удалите папку с ботом вручную\n\n` +
                           `👋 **Прощайте!**`;

            // Записываем лог удаления
            const deleteLog = `[${new Date().toISOString()}] Self-destruct by @${username}\n` +
                            `Deleted ${filesToDelete.length} files:\n` +
                            filesToDelete.join('\n') + '\n\n';
            
            fs.appendFileSync('deletion.log', deleteLog);

            return resultMessage;

        } catch (error) {
            return `❌ **Ошибка при удалении:**\n\n${error.message}\n\n` +
                   `⚠️ Возможно, некоторые файлы были удалены. Проверьте вручную.`;
        }
    }

    // Очистка старых запросов подтверждения
    cleanupOldRequests() {
        const now = Date.now();
        const tenMinutes = 10 * 60 * 1000;
        
        for (const [username, request] of this.confirmationRequests.entries()) {
            if (now - request.timestamp > tenMinutes) {
                this.confirmationRequests.delete(username);
            }
        }
    }
}

const selfDestructModule = new SelfDestructModule();

// Запускаем очистку старых запросов каждые 5 минут
setInterval(() => {
    selfDestructModule.cleanupOldRequests();
}, 5 * 60 * 1000);

module.exports = {
    description: "полное удаление юзербота и всех данных",
    commands: {
        "selfdestruct": async (data) => {
            return await selfDestructModule.initiateSelfDestruct(data);
        },
        
        "delete_bot": async (data) => {
            return await selfDestructModule.initiateSelfDestruct(data);
        },
        
        "удалить": async (data) => {
            return await selfDestructModule.initiateSelfDestruct(data);
        }
    },

    // Для инлайн-режима
    handleInlineQuery: async (query, ctx) => {
        return await selfDestructModule.handleInlineQuery(query, ctx);
    },

    // Для обработки callback-ов
    handleCallbackQuery: async (callbackQuery) => {
        return await selfDestructModule.handleCallbackQuery(callbackQuery);
    }
};