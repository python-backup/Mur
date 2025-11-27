# py_plugin_server.py
import subprocess
import sys
import os
from flask import Flask, request, jsonify
import importlib.util
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

class SimplePluginManager:
    def __init__(self):
        self.plugins_dir = "python_plugins"
        os.makedirs(self.plugins_dir, exist_ok=True)
    
    def execute_plugin_function(self, plugin_name, function_name, args=None):
        try:
            plugin_path = os.path.join(self.plugins_dir, f"{plugin_name}.py")
            
            if not os.path.exists(plugin_path):
                return {"success": False, "error": f"Плагин {plugin_name} не найден"}
            
            args_str = str(args or [])
            
            python_code = f"""
import sys
import os
sys.path.append(r'{os.path.dirname(plugin_path)}')

try:
    import importlib.util
    spec = importlib.util.spec_from_file_location('{plugin_name}', r'{plugin_path}')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    
    func = getattr(module, '{function_name}')
    result = func(*{args_str})
    
    if isinstance(result, (str, int, float, bool)) or result is None:
        print(str(result))
    else:
        print(str(result))
        
except Exception as e:
    print(f"ERROR:{{str(e)}}")
"""
            
            process = subprocess.run(
                [sys.executable, "-c", python_code],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            output = process.stdout.strip()
            
            if process.returncode == 0:
                if output.startswith("ERROR:"):
                    return {"success": False, "error": output[6:]}
                else:
                    return {"success": True, "data": output}
            else:
                return {"success": False, "error": process.stderr}
                
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Таймаут выполнения"}
        except Exception as e:
            return {"success": False, "error": f"Ошибка: {str(e)}"}

plugin_manager = SimplePluginManager()

@app.route('/<plugin_name>/<function_name>', methods=['GET', 'POST'])
def call_plugin(plugin_name, function_name):
    try:
        if request.method == 'POST':
            data = request.get_json() or {}
            args = data.get('args', [])
        else:
            args_str = request.args.get('args', '')
            args = [arg.strip() for arg in args_str.split(',')] if args_str else []
        
        logger.info(f"🎯 Вызов: {plugin_name}.{function_name} с args: {args}")
        
        result = plugin_manager.execute_plugin_function(plugin_name, function_name, args)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f"Ошибка сервера: {str(e)}"
        }), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'Simple Python Plugin Server'})

@app.route('/')
def index():
    return jsonify({
        'message': 'Simple Python Plugin Server',
        'usage': 'GET/POST /plugin_name/function_name?args=arg1,arg2,arg3'
    })

if __name__ == '__main__':
    print('🚀 Simple Python Plugin Server running on port 6000')
    app.run(host='0.0.0.0', port=6000, debug=False)