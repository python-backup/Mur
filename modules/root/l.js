// modules/user/l.js
const axios = require('axios');

const PLUGIN_SERVER = 'http://localhost:6000';

class ModuleL {
    async call(functionName, args = []) {
        try {
            const response = await axios.post(
                `${PLUGIN_SERVER}/photo/${functionName}`,
                { args },
                { timeout: 30000 }
            );
            return response.data;
        } catch (error) {
            return {
                success: false,
                error: `Photo плагин недоступен: ${error.message}`
            };
        }
    }
}

const modulel = new ModuleL();

module.exports.commands = {
    "ph": async (data) => {
        try {
            const result = await modulel.call("dl_last_photo");
            if (result.success && result.data) {
                return result.data;
            } else {
                return `❌ Ошибка: ${result.error || 'Неизвестная ошибка'}`;
            }
        } catch (error) {
            return `❌ Ошибка выполнения команды ph: ${error.message}`;
        }
    }
};