const axios = require('axios');

module.exports = {
    commands: {
        'weather': async (data) => {
            const city = data.params.args?.[0] || 'Moscow';
            try {
                const response = await axios.get(`https://wttr.in/${city}?format=%C+%t+%h+%w`);
                return `🌤 Погода в ${city}: ${response.data}`;
            } catch (error) {
                return `❌ Не удалось получить погоду для ${city}`;
            }
        },
        
        'weather_full': async (data) => {
            const city = data.params.args?.[0] || 'Moscow';
            try {
                const response = await axios.get(`https://wttr.in/${city}?format=j1`);
                const current = response.data.current_condition[0];
                return `
🌍 **Погода в ${city}:**
• 🌡 Температура: ${current.temp_C}°C (ощущается как ${current.FeelsLikeC}°C)
• 💧 Влажность: ${current.humidity}%
• 💨 Ветер: ${current.windspeedKmph} км/ч
• 📝 ${current.weatherDesc[0].value}
                `.trim();
            } catch (error) {
                return `❌ Ошибка получения погоды: ${error.message}`;
            }
        }
    }
};