
const { Bot, InlineKeyboard } = require('grammy');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class InlineBot {
    constructor(moduleLoader) {
        this.token = "8509450905:AAHofLjTnzzyCiASFmr3CmtAd0jAKhBgIss";
        this.bot = new Bot(this.token);
        this.moduleLoader = moduleLoader;
        this.modules = new Map();
        this.init();
    }

    async checkUserRights(userId, username) {
        try {
            const response = await axios.post('http://localhost:5000/auth/check_master', {
                username: username
            }, { timeout: 5000 });
            return response.data.is_master || false;
        } catch (error) {
            return false;
        }
    }

    init() {
        this.bot.on('inline_query', async (ctx) => {
            try {
                const userId = ctx.from.id;
                const username = ctx.from.username || `user_${userId}`;
                
                // Проверка прав пользователя
                const isMaster = await this.checkUserRights(userId, username);
                if (!isMaster) {
                    await ctx.answerInlineQuery([], {
                        switch_pm_text: "❌ Доступ запрещен. Только владелец может использовать инлайн-режим",
                        switch_pm_parameter: "access_denied",
                        cache_time: 3600
                    });
                    return;
                }

                const query = ctx.inlineQuery.query;
                const results = [];
                
                // Добавляем результаты из модулей
                for (let [name, module] of this.modules) {
                    try {
                        if (typeof module.handleInlineQuery === 'function') {
                            const moduleResults = await module.handleInlineQuery(query, ctx);
                            if (moduleResults && Array.isArray(moduleResults)) {
                                results.push(...moduleResults);
                            }
                        }
                    } catch (error) {
                        console.error(`Error in inline module ${name}:`, error);
                    }
                }
                
                // Если нет результатов от модулей, показываем стандартные
                if (results.length === 0) {
                    results.push({
                        type: 'article',
                        id: 'help',
                        title: '📖 Помощь по боту',
                        description: 'Показать все доступные команды',
                        input_message_content: {
                            message_text: '🤖 **RUX v2.0 - Юзербот**\n\n**Доступные команды:**\n`.menu` - главное меню\n`.help` - показать помощь\n`.modules` - список модулей\n`.info` - информация о боте\n\n**Инлайн-режим:**\nНапишите `@your_bot команда` для быстрого доступа',
                            parse_mode: 'Markdown'
                        }
                    });
                }
                
                await ctx.answerInlineQuery(results, { cache_time: 1 });
            } catch (error) {
                console.error('Inline query error:', error);
            }
        });

        this.bot.on('callback_query:data', async (ctx) => {
            try {
                const userId = ctx.from.id;
                const username = ctx.from.username || `user_${userId}`;
                
                // Проверка прав пользователя
                const isMaster = await this.checkUserRights(userId, username);
                if (!isMaster) {
                    await ctx.answerCallbackQuery({ 
                        text: '❌ Доступ запрещен',
                        show_alert: true 
                    });
                    return;
                }

                const callbackData = ctx.callbackQuery.data;
                const message = ctx.callbackQuery.message;
                
                // Передача обработки модулям
                for (let [name, module] of this.modules) {
                    try {
                        if (typeof module.handleCallbackQuery === 'function') {
                            const handled = await module.handleCallbackQuery(callbackData, ctx, message);
                            if (handled) {
                                await ctx.answerCallbackQuery();
                                return;
                            }
                        }
                    } catch (error) {
                        console.error(`Error in inline module ${name} callback:`, error);
                    }
                }
                
                await ctx.answerCallbackQuery({ text: 'Команда не найдена' });
            } catch (error) {
                console.error('Callback query error:', error);
                await ctx.answerCallbackQuery({ text: 'Ошибка обработки запроса' });
            }
        });

        // Обработка текстовых сообщений для редактирования настроек
        this.bot.on('message', async (ctx) => {
            try {
                const userId = ctx.from.id;
                const username = ctx.from.username || `user_${userId}`;
                
                // Проверка прав пользователя
                const isMaster = await this.checkUserRights(userId, username);
                if (!isMaster) {
                    return;
                }

                // Передача обработки модулям
                for (let [name, module] of this.modules) {
                    try {
                        if (typeof module.handleTextMessage === 'function') {
                            const handled = await module.handleTextMessage(ctx);
                            if (handled) {
                                return;
                            }
                        }
                    } catch (error) {
                        console.error(`Error in inline module ${name} text handler:`, error);
                    }
                }
            } catch (error) {
                console.error('Text message error:', error);
            }
        });

        this.bot.catch((err) => {
            console.error('Inline bot error:', err);
        });

        this.loadInlineModules();
        this.start();
    }

    loadInlineModules() {
        const inlineModulesPath = path.join(__dirname, 'inline_mod');
        
        if (!fs.existsSync(inlineModulesPath)) {
            fs.mkdirSync(inlineModulesPath, { recursive: true });
            console.log('📁 Created inline_mod directory');
            return;
        }

        const files = fs.readdirSync(inlineModulesPath);
        
        files.forEach(file => {
            if (file.endsWith('.js')) {
                try {
                    const modulePath = path.join(inlineModulesPath, file);
                    const moduleName = path.basename(file, '.js');
                    
                    delete require.cache[require.resolve(modulePath)];
                    const moduleClass = require(modulePath);
                    
                    const moduleInstance = new moduleClass(this);
                    this.modules.set(moduleName, moduleInstance);
                    
                    console.log(`✅ Inline module loaded: ${moduleName}`);
                } catch (error) {
                    console.error(`❌ Error loading inline module ${file}:`, error);
                }
            }
        });

        if (this.modules.size === 0) {
            console.log('⚠️  No inline modules found in inline_mod/');
        }
    }

    async start() {
        try {
            await this.bot.start();
            console.log('✅ Inline bot started');
        } catch (error) {
            console.error('❌ Failed to start inline bot:', error);
        }
    }

    stop() {
        this.bot.stop();
        console.log('🛑 Inline bot stopped');
    }
}

module.exports = InlineBot;