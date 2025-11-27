const axios = require('axios');

const PLUGIN_SERVER = 'http://localhost:6000';

class ModuleInfo {
    async call(functionName, args = []) {
        try {
            const response = await axios.post(
                `${PLUGIN_SERVER}/info/${functionName}`,
                { args },
                { timeout: 15000 }
            );
            return response.data;
        } catch (error) {
            return {
                success: false,
                error: `Info плагин недоступен: ${error.message}`
            };
        }
    }
}

const moduleInfo = new ModuleInfo();

module.exports = {
    commands: {
        "info": async (data) => {
            try {
                const result = await moduleInfo.call("info_text", [data]);
                return result.success ? result.data : `❌ Ошибка: ${result.error}`;
            } catch (error) {
                return `❌ Ошибка выполнения команды info: ${error.message}`;
            }
        }
    }
};