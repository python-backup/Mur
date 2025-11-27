import subprocess
import sys
import os
from flask import Flask, request, jsonify

app = Flask(__name__)

class PyrogramPluginManager:
    def __init__(self):
        self.plugins_dir = "python_plugins"
        os.makedirs(self.plugins_dir, exist_ok=True)
    
    def execute_plugin_function(self, plugin_name, function_name, args=None, kwargs=None):
        try:
            plugin_path = os.path.join(self.plugins_dir, f"{plugin_name}.py")
            
            if not os.path.exists(plugin_path):
                return {"success": False, "error": f"Плагин {plugin_name} не найден"}
            
            args_str = str(args or [])
            kwargs_str = str(kwargs or {})
            
            python_code = f"""
import asyncio
import sys
import os
sys.path.append(r'{os.path.dirname(plugin_path)}')

async def main():
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location('{plugin_name}', r'{plugin_path}')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        
        func = getattr(module, '{function_name}')
        result = func(*{args_str}, **{kwargs_str})
        
        if asyncio.iscoroutine(result):
            result = await result
            
        if isinstance(result, (str, int, float, bool)) or result is None:
            print(str(result))
        else:
            print(str(result))
            
    except Exception as e:
        print(f"ERROR:{{str(e)}}")

asyncio.run(main())
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

plugin_manager = PyrogramPluginManager()

@app.route('/<plugin_name>/<function_name>', methods=['GET', 'POST'])
def call_plugin(plugin_name, function_name):
    try:
        if request.method == 'POST':
            data = request.get_json() or {}
            args = data.get('args', [])
            kwargs = data.get('kwargs', {})
        else:
            args_str = request.args.get('args', '')
            args = [arg.strip() for arg in args_str.split(',')] if args_str else []
            kwargs = {}
        
        result = plugin_manager.execute_plugin_function(plugin_name, function_name, args, kwargs)
        
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
    app.run(host='0.0.0.0', port=6000, debug=False)