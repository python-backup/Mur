// inline_mod/update.js
const { InlineKeyboard } = require('grammy');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

class UpdateModule {
    constructor(inlineBot) {
        this.name = "update";
        this.inlineBot = inlineBot;
        this.repoUrl = "https://github.com/python-backup/Mur";
    }

    async handleInlineQuery(query, ctx) {
        if (query.trim() === 'update' || query.trim() === 'обновить') {
            const status = await this.getRepoStatus();
            
            let description = 'Проверить и установить обновления';
            if (!status.exists) {
                description = '❌ Репозиторий не настроен';
            } else if (status.changes) {
                description = '⚠️ Есть локальные изменения';
            }

            return [{
                type: 'article',
                id: 'update_bot',
                title: '🔄 Обновить Mur UserBot',
                description: description,
                input_message_content: {
                    message_text: '🔄 **Обновление Mur UserBot**\n\n' + await this.getStatusText(),
                    parse_mode: 'Markdown'
                },
                reply_markup: await this.getMainKeyboard()
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

        if (callbackData.startsWith('force_update')) {
            await this.handleForceUpdate(ctx);
            return true;
        }

        if (callbackData.startsWith('init_repo')) {
            await this.handleInitRepo(ctx);
            return true;
        }

        if (callbackData.startsWith('status_update')) {
            await this.handleStatusUpdate(ctx);
            return true;
        }

        return false;
    }

    async handleCheckUpdate(ctx) {
        try {
            await ctx.answerCallbackQuery({ text: '🔍 Проверяем обновления...' });

            const status = await this.getRepoStatus();
            if (!status.exists) {
                await ctx.editMessageText('❌ **Репозиторий не настроен!**\n\nИспользуйте кнопку "⚙️ Настроить" для инициализации.', {
                    parse_mode: 'Markdown',
                    reply_markup: await this.getMainKeyboard()
                });
                return;
            }

            await execAsync('git fetch');
            const { stdout: statusOutput } = await execAsync('git status -uno');

            let response = '🔄 **Проверка обновлений**\n\n';

            if (statusOutput.includes('Your branch is up to date')) {
                response += '✅ **Ваша версия актуальна!**\n\nНет доступных обновлений.';
            } else if (statusOutput.includes('Your branch is behind')) {
                const behindMatch = statusOutput.match(/behind by (\d+) commit/);
                const behindCount = behindMatch ? behindMatch[1] : 'несколько';

                response += `🔄 **Доступны обновления!**\n\n`;
                response += `• Отставание: ${behindCount} коммит(ов)\n`;
                response += `• Для обновления нажмите "⚡ Обновить"\n\n`;
                response += `📋 **Последние изменения:**\n`;

                try {
                    const { stdout: log } = await execAsync('git log --oneline HEAD..origin/main');
                    const commits = log.split('\n').filter(line => line.trim());
                    commits.slice(0, 3).forEach(commit => {
                        response += `• ${commit}\n`;
                    });
                    if (commits.length > 3) {
                        response += `• ... и еще ${commits.length - 3} коммит(ов)\n`;
                    }
                } catch (logError) {
                    response += `• Не удалось получить список изменений\n`;
                }
            } else {
                response += 'ℹ️ **Статус репозитория:**\n' + statusOutput;
            }

            await ctx.editMessageText(response, {
                parse_mode: 'Markdown',
                reply_markup: await this.getUpdateKeyboard()
            });

        } catch (error) {
            await ctx.editMessageText(`❌ Ошибка проверки: ${error.message}`, {
                reply_markup: await this.getMainKeyboard()
            });
        }
    }

    async handlePullUpdate(ctx) {
        try {
            await ctx.answerCallbackQuery({ text: '⚡ Начинаем обновление...' });

            const status = await this.getRepoStatus();
            if (status.changes) {
                await ctx.editMessageText('⚠️ **Обнаружены локальные изменения!**\n\nИспользуйте "🔨 Принудительно" для перезаписи.', {
                    parse_mode: 'Markdown',
                    reply_markup: await this.getUpdateKeyboard()
                });
                return;
            }

            let response = '🔄 **Начинаю обновление...**\n\n';
            
            const backup = await this.backupUserData();
            response += `💾 Создан бэкап данных\n`;

            response += `📥 Загружаем обновления...\n`;
            const { stdout: pullOutput } = await execAsync('git pull --rebase origin main');
            response += `✅ Обновление загружено\n\n`;

            if (pullOutput.includes('package.json')) {
                response += `📦 Обновление зависимостей...\n`;
                try {
                    await execAsync('npm install');
                    response += `✅ Зависимости обновлены\n`;
                } catch (npmError) {
                    response += `⚠️ Ошибка зависимостей: ${npmError.message}\n`;
                }
            }

            await this.restoreUserData(backup);
            response += `✅ Данные восстановлены\n\n`;
            response += `🎉 **Обновление завершено!**\n`;

            await ctx.editMessageText(response, {
                parse_mode: 'Markdown',
                reply_markup: await this.getRestartKeyboard()
            });

        } catch (error) {
            await ctx.editMessageText(`❌ Ошибка обновления: ${error.message}`, {
                reply_markup: await this.getMainKeyboard()
            });
        }
    }

    async handleForceUpdate(ctx) {
        try {
            await ctx.answerCallbackQuery({ text: '🔨 Принудительное обновление...' });

            let response = '🔨 **Принудительное обновление...**\n\n';

            const backup = await this.backupUserData();
            response += `💾 Создан бэкап данных\n`;

            response += `🔄 Сбрасываю изменения...\n`;
            await execAsync('git reset --hard HEAD');

            response += `📥 Загружаем обновления...\n`;
            await execAsync('git pull --force origin main');

            response += `📦 Обновление зависимостей...\n`;
            try {
                await execAsync('npm install');
                response += `✅ Зависимости обновлены\n`;
            } catch (npmError) {
                response += `⚠️ Ошибка зависимостей: ${npmError.message}\n`;
            }

            await this.restoreUserData(backup);
            response += `✅ Данные восстановлены\n\n`;
            response += `🎉 **Обновление завершено!**\n`;

            await ctx.editMessageText(response, {
                parse_mode: 'Markdown',
                reply_markup: await this.getRestartKeyboard()
            });

        } catch (error) {
            await ctx.editMessageText(`❌ Ошибка обновления: ${error.message}`, {
                reply_markup: await this.getMainKeyboard()
            });
        }
    }

    async handleRestartBot(ctx) {
        try {
            await ctx.answerCallbackQuery({ text: '🔄 Перезапускаем бота...' });

            await ctx.editMessageText('🔄 **Перезапуск бота...**\n\nБот будет перезапущен через 3 секунды.', {
                parse_mode: 'Markdown'
            });

            setTimeout(() => {
                process.exit(0);
            }, 3000);

        } catch (error) {
            await ctx.editMessageText(`❌ Ошибка перезапуска: ${error.message}`, {
                reply_markup: await this.getMainKeyboard()
            });
        }
    }

    async handleInitRepo(ctx) {
        try {
            await ctx.answerCallbackQuery({ text: '⚙️ Настраиваем репозиторий...' });

            let response = '⚙️ **Настройка репозитория...**\n\n';

            try {
                await execAsync('git status');
                response += `✅ Git репозиторий уже инициализирован\n`;
            } catch (error) {
                await execAsync('git init');
                response += `✅ Git инициализирован\n`;
            }

            try {
                await execAsync('git remote get-url origin');
                response += `✅ Remote origin уже настроен\n`;
            } catch (error) {
                await execAsync('git remote add origin https://github.com/python-backup/Mur.git');
                response += `✅ Remote origin добавлен\n`;
            }

            await execAsync('git fetch origin');

            try {
                await execAsync('git checkout main');
                response += `✅ Переключены на ветку main\n`;
            } catch (error) {
                try {
                    await execAsync('git checkout -b main origin/main');
                    response += `✅ Создана ветка main\n`;
                } catch (error2) {
                    response += `⚠️ Не удалось переключиться на main\n`;
                }
            }

            response += `\n🎉 **Репозиторий настроен!**\n`;

            await ctx.editMessageText(response, {
                parse_mode: 'Markdown',
                reply_markup: await this.getMainKeyboard()
            });

        } catch (error) {
            await ctx.editMessageText(`❌ Ошибка настройки: ${error.message}`, {
                reply_markup: await this.getMainKeyboard()
            });
        }
    }

    async handleStatusUpdate(ctx) {
        try {
            await ctx.answerCallbackQuery({ text: '📊 Получаем статус...' });

            const response = await this.getStatusText();

            await ctx.editMessageText(response, {
                parse_mode: 'Markdown',
                reply_markup: await this.getMainKeyboard()
            });

        } catch (error) {
            await ctx.editMessageText(`❌ Ошибка получения статуса: ${error.message}`, {
                reply_markup: await this.getMainKeyboard()
            });
        }
    }

    async getRepoStatus() {
        try {
            await execAsync('git status');

            const [branchResult, commitResult, changesResult, remoteResult] = await Promise.all([
                execAsync('git branch --show-current').catch(() => ({ stdout: '' })),
                execAsync('git log --oneline -1').catch(() => ({ stdout: '' })),
                execAsync('git status --porcelain').catch(() => ({ stdout: '' })),
                execAsync('git remote get-url origin').catch(() => ({ stdout: '' }))
            ]);

            return {
                exists: true,
                branch: branchResult.stdout.trim(),
                commit: commitResult.stdout.trim(),
                changes: changesResult.stdout.trim().length > 0,
                remote: remoteResult.stdout.trim()
            };
        } catch (error) {
            return {
                exists: false,
                branch: null,
                commit: null,
                changes: false,
                remote: null
            };
        }
    }

    async getStatusText() {
        const status = await this.getRepoStatus();
        
        let response = `📊 **Статус Mur UserBot**\n`;
        response += `📁 Репозиторий: ${this.repoUrl}\n\n`;

        if (status.exists) {
            response += `✅ **Репозиторий настроен**\n`;
            response += `• Ветка: ${status.branch}\n`;
            response += `• Коммит: ${status.commit}\n`;
            response += `• Изменения: ${status.changes ? '⚠️ Есть' : '✅ Нет'}\n`;

            try {
                await execAsync('git fetch');
                const { stdout: behind } = await execAsync('git rev-list HEAD..origin/main --count 2>/dev/null || echo 0');
                const behindCount = parseInt(behind.trim());
                
                response += `\n🔍 **Обновления:** ${behindCount > 0 ? `🔄 ${behindCount} коммит(ов)` : '✅ Актуальна'}\n`;
            } catch (error) {
                response += `\n🔍 **Обновления:** ⚠️ Не проверено\n`;
            }
        } else {
            response += `❌ **Репозиторий не настроен**\n`;
            response += `Для работы обновлений необходимо настроить репозиторий\n`;
        }

        return response;
    }

    async getMainKeyboard() {
        const status = await this.getRepoStatus();
        const keyboard = new InlineKeyboard();

        if (!status.exists) {
            keyboard.text('⚙️ Настроить', 'init_repo');
            return keyboard;
        }

        keyboard
            .text('🔍 Проверить', 'check_update')
            .text('⚡ Обновить', 'pull_update')
            .row()
            .text('🔨 Принудительно', 'force_update')
            .text('🔄 Перезапуск', 'restart_bot')
            .row()
            .text('📊 Статус', 'status_update');

        return keyboard;
    }

    async getUpdateKeyboard() {
        const keyboard = new InlineKeyboard();
        keyboard
            .text('⚡ Обновить', 'pull_update')
            .text('🔨 Принудительно', 'force_update')
            .row()
            .text('🔍 Проверить снова', 'check_update')
            .text('📊 Статус', 'status_update');
        return keyboard;
    }

    async getRestartKeyboard() {
        const keyboard = new InlineKeyboard();
        keyboard
            .text('🔄 Перезапуск', 'restart_bot')
            .text('📊 Статус', 'status_update');
        return keyboard;
    }

    async backupUserData() {
        const backup = { modules: [], plugins: [] };
        
        try {
            const userModulesPath = path.join(__dirname, '..', '..', 'modules', 'user');
            if (fs.existsSync(userModulesPath)) {
                const files = fs.readdirSync(userModulesPath);
                for (const file of files) {
                    if (file.endsWith('.js')) {
                        const filePath = path.join(userModulesPath, file);
                        const content = fs.readFileSync(filePath, 'utf8');
                        backup.modules.push({ name: file, content: content });
                    }
                }
            }

            const pluginsPath = path.join(__dirname, '..', '..', 'python_plugins');
            if (fs.existsSync(pluginsPath)) {
                const files = fs.readdirSync(pluginsPath);
                for (const file of files) {
                    if (file.endsWith('.py')) {
                        const filePath = path.join(pluginsPath, file);
                        const content = fs.readFileSync(filePath, 'utf8');
                        backup.plugins.push({ name: file, content: content });
                    }
                }
            }
        } catch (error) {
            console.error('Backup error:', error);
        }
        
        return backup;
    }

    async restoreUserData(backup) {
        try {
            const userModulesPath = path.join(__dirname, '..', '..', 'modules', 'user');
            if (!fs.existsSync(userModulesPath)) {
                fs.mkdirSync(userModulesPath, { recursive: true });
            }
            
            for (const module of backup.modules) {
                const filePath = path.join(userModulesPath, module.name);
                fs.writeFileSync(filePath, module.content, 'utf8');
            }

            const pluginsPath = path.join(__dirname, '..', '..', 'python_plugins');
            if (!fs.existsSync(pluginsPath)) {
                fs.mkdirSync(pluginsPath, { recursive: true });
            }
            
            for (const plugin of backup.plugins) {
                const filePath = path.join(pluginsPath, plugin.name);
                fs.writeFileSync(filePath, plugin.content, 'utf8');
            }
        } catch (error) {
            console.error('Restore error:', error);
        }
    }
}

module.exports = UpdateModule;