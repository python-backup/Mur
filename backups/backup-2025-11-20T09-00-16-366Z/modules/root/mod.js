const axios = require('axios');

const PLUGIN_SERVER = 'http://localhost:6000';

class ModuleInstaller {
    async call(functionName, args = []) {
        try {
            const response = await axios.post(
                `${PLUGIN_SERVER}/module_installer/${functionName}`,
                { args },
                { timeout: 15000 }
            );
            return response.data;
        } catch (error) {
            return {
                success: false,
                error: `Module Installer недоступен: ${error.message}`
            };
        }
    }

    getInstalledModules() {
        const fs = require('fs');
        const path = require('path');
        const userModulesPath = path.join(__dirname, '..', 'user');
        
        const modules = [];
        
        try {
            if (fs.existsSync(userModulesPath)) {
                const files = fs.readdirSync(userModulesPath);
                files.forEach(file => {
                    if (file.endsWith('.js')) {
                        modules.push(file.slice(0, -3));
                    }
                });
            }
        } catch (error) {
            console.error('Error reading modules:', error);
        }
        
        return modules;
    }
}

const moduleInstaller = new ModuleInstaller();

module.exports.commands = {
    'install': async (data) => {
        if (!data.message) {
            return "❌ Ошибка: Нет данных сообщения";
        }

        const messageData = data.message;
        const result = await moduleInstaller.call('install_module', [messageData]);
        
        return result.success ? result.data : `❌ Ошибка: ${result.error}`;
    },

    'installer': async (data) => {
        const result = await moduleInstaller.call('get_installer_info', []);
        return result.success ? result.data : `❌ Ошибка: ${result.error}`;
    },

    'protected': async (data) => {
        const result = await moduleInstaller.call('list_protected_modules', []);
        return result.success ? result.data : `❌ Ошибка: ${result.error}`;
    },

    'modules': async (data) => {
        const installed = moduleInstaller.getInstalledModules();
        if (installed.length === 0) {
            return "📦 Установленные модули:\n❌ Нет установленных модулей";
        }
        return "📦 Установленные модули:\n" + installed.map(mod => `• ${mod}`).join('\n');
    }
};

console.log('✅ Module Installer модуль загружен!');