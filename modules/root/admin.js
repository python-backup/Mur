// modules/root/admin_manager.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class AdminManager {
    constructor() {
        this.allowedUserModules = this.getUserModules();
    }

    getUserModules() {
        try {
            const userModulesPath = path.join(__dirname, '..', 'user');
            if (!fs.existsSync(userModulesPath)) {
                return [];
            }
            
            const files = fs.readdirSync(userModulesPath);
            const modules = files
                .filter(file => file.endsWith('.js'))
                .map(file => file.replace('.js', ''));
            
            console.log(`📁 User modules found: ${modules.join(', ') || 'none'}`);
            return modules;
        } catch (error) {
            console.log('❌ Error reading user modules:', error.message);
            return [];
        }
    }

    isModuleAllowed(moduleName) {
        const isAllowed = this.allowedUserModules.includes(moduleName);
        console.log(`🔍 Check module ${moduleName} for admin: ${isAllowed}`);
        return isAllowed;
    }

    getAllowedModules() {
        return this.getUserModules(); // Всегда актуальный список
    }

    async checkAdminRights(username) {
        try {
            const response = await axios.post('http://localhost:5000/auth/check_admin', {
                username: username
            });
            console.log(`🔐 Admin check for ${username}:`, response.data);
            return response.data.is_admin || false;
        } catch (error) {
            console.log('❌ Admin check error:', error.message);
            return false;
        }
    }

    async checkMasterRights(username) {
        try {
            const response = await axios.post('http://localhost:5000/auth/check_master', {
                username: username
            });
            return response.data.is_master || false;
        } catch (error) {
            return false;
        }
    }

    // Метод для принудительного обновления списка модулей
    refreshModules() {
        this.allowedUserModules = this.getUserModules();
        console.log(`🔄 Refreshed admin modules: ${this.allowedUserModules.join(', ') || 'none'}`);
    }
}

const adminManager = new AdminManager();

module.exports = {
    commands: {
        "admin_add": async (data) => {
            const username = data.params.args[0];
            
            if (!username) {
                return "❌ Укажите username пользователя\n💡 Пример: .admin_add @username";
            }

            try {
                const isMaster = await adminManager.checkMasterRights(data.username);
                if (!isMaster) {
                    return "❌ Только владелец может добавлять администраторов";
                }

                const response = await axios.post('http://localhost:5000/admin/add', {
                    username: username,
                    master: data.username
                });

                if (response.data.success) {
                    // Обновляем список модулей после добавления админа
                    adminManager.refreshModules();
                    const userModules = adminManager.getUserModules();
                    
                    let responseText = `✅ Администратор добавлен: **${username}**\n\n`;
                    
                    if (userModules.length > 0) {
                        responseText += `📋 **Доступные модули:**\n${userModules.join(', ')}`;
                    } else {
                        responseText += `📋 **Нет пользовательских модулей**\nСоздайте модули в папке /modules/user/`;
                    }
                    
                    return responseText;
                } else {
                    return `❌ Ошибка: ${response.data.error}`;
                }
            } catch (error) {
                return `❌ Ошибка сервера: ${error.message}`;
            }
        },

        "admin_remove": async (data) => {
            const username = data.params.args[0];
            
            if (!username) {
                return "❌ Укажите username администратора\n💡 Пример: .admin_remove @username";
            }

            try {
                const isMaster = await adminManager.checkMasterRights(data.username);
                if (!isMaster) {
                    return "❌ Только владелец может удалять администраторов";
                }

                const response = await axios.post('http://localhost:5000/admin/remove', {
                    username: username,
                    master: data.username
                });

                if (response.data.success) {
                    return `✅ Администратор удален: **${username}**`;
                } else {
                    return `❌ Ошибка: ${response.data.error}`;
                }
            } catch (error) {
                return `❌ Ошибка сервера: ${error.message}`;
            }
        },

        "admin_list": async (data) => {
            try {
                const response = await axios.get('http://localhost:5000/admin/list');
                const admins = response.data.admins || [];
                
                if (admins.length === 0) {
                    return "📋 **Список администраторов пуст**";
                }

                let responseText = "👥 **АДМИНИСТРАТОРЫ**\n\n";
                
                admins.forEach(admin => {
                    responseText += `• ${admin}\n`;
                });

                responseText += `\n📊 Всего: ${admins.length} администраторов`;
                
                return responseText;
            } catch (error) {
                return `❌ Ошибка получения списка: ${error.message}`;
            }
        },

        "admin_modules": async (data) => {
            // Всегда получаем актуальный список
            adminManager.refreshModules();
            const userModules = adminManager.getUserModules();
            
            if (userModules.length === 0) {
                return "📚 **Нет пользовательских модулей**\n\nСоздайте модули в папке /modules/user/";
            }

            let response = "📚 **ДОСТУПНЫЕ МОДУЛИ ДЛЯ АДМИНОВ**\n\n";
            
            userModules.forEach(module => {
                response += `• ${module}\n`;
            });

            response += `\n📋 Всего: ${userModules.length} модулей`;
            response += `\n\n⚡ Админы могут использовать только пользовательские модули`;
            
            return response;
        },

        "admin_refresh": async (data) => {
            adminManager.refreshModules();
            const userModules = adminManager.getUserModules();
            
            return `🔄 Список модулей обновлен!\nДоступно модулей: ${userModules.length}\n${userModules.join(', ') || 'Нет модулей'}`;
        }
    },

    adminManager: adminManager
};