# core/py_plugin_server.py
import sys
import os
from flask import Flask, request, jsonify
import importlib.util
import logging
import asyncio

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

class PluginManager:
    def __init__(self):
        self.plugins_dir = "python_plugins"
        os.makedirs(self.plugins_dir, exist_ok=True)
        self.loaded_plugins = {}
    
    def load_plugin(self, plugin_name):
        try:
            plugin_path = os.path.join(self.plugins_dir, f"{plugin_name}.py")
            
            if not os.path.exists(plugin_path):
                return {"success": False, "error": f"Плагин {plugin_name} не найден"}
            
            if plugin_name in self.loaded_plugins:
                return {"success": True, "message": "Плагин уже загружен"}
            
            spec = importlib.util.spec_from_file_location(plugin_name, plugin_path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            
            self.loaded_plugins[plugin_name] = module
            return {"success": True, "message": f"Плагин {plugin_name} загружен"}
            
        except Exception as e:
            return {"success": False, "error": f"Ошибка загрузки плагина: {str(e)}"}
    
    def execute_plugin_function(self, plugin_name, function_name):
        try:
            if plugin_name not in self.loaded_plugins:
                load_result = self.load_plugin(plugin_name)
                if not load_result["success"]:
                    return load_result
            
            module = self.loaded_plugins[plugin_name]
            
            if not hasattr(module, function_name):
                return {"success": False, "error": f"Функция {function_name} не найдена в плагине {plugin_name}"}
            
            func = getattr(module, function_name)
            
            from client_manager import client_manager
            client = client_manager.get_client()
            
            if client is None:
                return {"success": False, "error": "Клиент Pyrogram не доступен"}
            
            if asyncio.iscoroutinefunction(func):
                result = asyncio.run(func(client))
            else:
                result = func(client)
            
            return {"success": True, "data": str(result)}
            
        except Exception as e:
            return {"success": False, "error": f"Ошибка выполнения: {str(e)}"}

plugin_manager = PluginManager()

@app.route('/<plugin_name>/<function_name>', methods=['GET', 'POST'])
def call_plugin(plugin_name, function_name):
    try:
        logger.info(f"🎯 Вызов: {plugin_name}.{function_name}")
        
        result = plugin_manager.execute_plugin_function(plugin_name, function_name)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f"Ошибка сервера: {str(e)}"
        }), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'Python Plugin Server'})

if __name__ == '__main__':
    print('🚀 Python Plugin Server running on port 6000')
    app.run(host='0.0.0.0', port=6000, debug=False)