# py_bot.py
import asyncio
import subprocess
import time
import sys
import os
from pyrogram import Client, filters
from pyrogram.types import Message
import aiohttp
import logging

logging.basicConfig(level=logging.INFO, format='%(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

API_ID = 21624658
API_HASH = "041636f0be841d66a5010d9b9a55285a"
SESSION_STRING = "AgFJ91IAIUPcrQuke810_XtgTZsDMz2lhH7F0NOCPXfCf7IsIlKInhDu7I_iP8AhffO8Uv7duDbx-oxBlukoW6sNArLzagcz0V8rDfvVnOijVw_hYhDWJQ7Jh6Y5a06t8yH8pjMnuz89PFA-ee-n3S8Cc2V1CTI69sKz50JxFuiMSnzAuSYqqZhX491ZBUe40sz9sXRq7dNVTgv2MGo5t3O4ioMBTQ8ew5Wu_nsc9SDmyuC5SBBZ0Bg6CvHY3vF4_XWvjrkfZ27MSXA4B4Q0rCyjugEefH3RZ_rR8MBs6kNLUT-hSpdtrtuaEwSP76InAf_UnC05VOXr-jzNb-dF8VRkTNB3EAAAAAHYrRf3AA"

class BotManager:
    def __init__(self):
        self.db_process = None
        self.node_process = None
        self.plugin_process = None
        self.bot_client = None

    def start_servers(self):
        print("🚀 Запуск всех серверов...")
        
        os.makedirs('modules/root', exist_ok=True)
        os.makedirs('modules/user', exist_ok=True)
        os.makedirs('python_plugins', exist_ok=True)
        
        servers = [
            {"name": "Python БД сервер", "port": 5000, "script": "core/db_server.py"},
            {"name": "Python Plugin сервер", "port": 6000, "script": "core/py_plugin_server.py"},
            {"name": "Node.js сервер", "port": 3000, "script": "node_server.js"}
        ]
        
        for server in servers:
            print(f"📊 Запуск {server['name']} (порт {server['port']})...")
            try:
                process = subprocess.Popen(
                    [sys.executable, server['script']] if server['script'].endswith('.py') else ["node", server['script']],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                if server['port'] == 5000:
                    self.db_process = process
                elif server['port'] == 6000:
                    self.plugin_process = process
                else:
                    self.node_process = process
                    
                time.sleep(2)
                
            except Exception as e:
                print(f"❌ Ошибка запуска {server['name']}: {e}")
                return False
        
        print("✅ Все серверы запущены!")
        return True

    async def start_bot(self):
        print("🤖 Запуск Telegram бота...")
        
        try:
            self.bot_client = Client(
                "my_bot",
                api_id=API_ID,
                api_hash=API_HASH
            )
            
            async def handle_command_message(client, message: Message, is_group: bool):
                username = message.from_user.username if message.from_user else "unknown"
                
                is_master = await self.check_user_auth(username)
                
                if not is_master:
                    return
                
                prefix = await self.get_current_prefix()
                
                if message.text.startswith(prefix):
                    command = message.text[len(prefix):].split()[0]
                    params = {"args": message.text.split()[1:]}
                    
                    processing_text = f"🔄 Выполняется команда `{command}`..."
                    try:
                        await message.edit_text(processing_text)
                    except Exception as e:
                        processing_msg = await message.reply(processing_text)
                    
                    result = await self.execute_command(command, username, params, message)
                    
                    if result.get("success"):
                        response_text = result['data']
                        if response_text and response_text.strip():
                            try:
                                await message.edit_text(response_text)
                            except Exception as e:
                                logger.error(f"Error editing message: {e}")
                                await message.reply(response_text)
                    else:
                        error_msg = result.get('error', 'Unknown error')
                        if error_msg and "Недостаточно прав" not in error_msg and "недостаточно прав" not in error_msg:
                            error_text = f"❌ **Ошибка**: `{error_msg}`"
                            try:
                                await message.edit_text(error_text)
                            except Exception as e:
                                logger.error(f"Error editing error message: {e}")
                                await message.reply(error_text)
                        else:
                            try:
                                await message.delete()
                            except:
                                pass

            @self.bot_client.on_message(filters.text & filters.group)
            async def handle_group_messages(client, message: Message):
                await handle_command_message(client, message, is_group=True)

            @self.bot_client.on_message(filters.text & filters.private)
            async def handle_private_messages(client, message: Message):
                await handle_command_message(client, message, is_group=False)
            
            await self.bot_client.start()
            print("✅ Telegram бот запущен!")
            print(f"👤 Бот работает как: {await self.bot_client.get_me()}")
            
            await self.idle()
            
        except Exception as e:
            logger.error(f"❌ Ошибка запуска бота: {e}")
            raise

    async def check_user_auth(self, username: str) -> bool:
        async with aiohttp.ClientSession() as session:
            try:
                payload = {"username": username}
                async with session.post(
                    "http://localhost:5000/auth/check", 
                    json=payload,
                    timeout=5
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get('is_master', False)
                    return False
            except Exception as e:
                logger.error(f"Auth check error: {e}")
                return False

    async def execute_command(self, command: str, username: str, params: dict = None, message: Message = None):
        async with aiohttp.ClientSession() as session:
            try:
                if not await self.check_user_auth(username):
                    return {
                        "success": False, 
                        "error": ""
                    }
                
                if command == 'install' and message:
                    try:
                        import importlib.util
                        spec = importlib.util.spec_from_file_location("module_installer", "python_plugins/module_installer.py")
                        module_installer = importlib.util.module_from_spec(spec)
                        spec.loader.exec_module(module_installer)
                        
                        result = await module_installer.install_module(self.bot_client, message)
                        
                        return {
                            "success": True,
                            "data": result
                        }
                    except Exception as e:
                        return {"success": False, "error": f"Ошибка установки: {str(e)}"}
                
                message_data = self.serialize_message(message) if message else None
                
                payload = {
                    "username": username, 
                    "params": params or {},
                    "message": message_data
                }
                
                async with session.post(
                    f"http://localhost:3000/command/{command}", 
                    json=payload,
                    timeout=10
                ) as response:
                    return await response.json()
            except Exception as e:
                return {"success": False, "error": f"Ошибка подключения: {e}"}

    def serialize_message(self, message: Message) -> dict:
        try:
            message_dict = {
                "id": message.id,
                "date": message.date.isoformat() if message.date else None,
                "text": message.text,
                "chat_id": message.chat.id if message.chat else None,
            }
            
            if message.reply_to_message:
                reply = message.reply_to_message
                message_dict["reply_to_message"] = {
                    "id": reply.id,
                    "date": reply.date.isoformat() if reply.date else None,
                    "text": reply.text,
                }
                
                if reply.document:
                    message_dict["reply_to_message"]["document"] = {
                        "file_name": reply.document.file_name,
                        "file_size": reply.document.file_size,
                        "mime_type": reply.document.mime_type,
                        "file_id": reply.document.file_id
                    }
            
            return message_dict
            
        except Exception as e:
            return {}

    async def get_current_prefix(self):
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get("http://localhost:5000/settings/prefix", timeout=5) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get('prefix', '.')
            except:
                return '.'

    def check_servers(self):
        import requests
        
        servers_ok = True
        
        servers_to_check = [
            {"name": "Node.js", "url": "http://localhost:3000/health"},
            {"name": "Python БД", "url": "http://localhost:5000/health"}, 
            {"name": "Python Plugin", "url": "http://localhost:6000/health"}
        ]
        
        for server in servers_to_check:
            try:
                response = requests.get(server['url'], timeout=5)
                if response.status_code == 200:
                    print(f"✅ {server['name']} сервер работает")
                else:
                    print(f"❌ {server['name']} сервер не отвечает")
                    servers_ok = False
            except Exception as e:
                print(f"❌ {server['name']} сервер не запущен: {e}")
                servers_ok = False
                
        return servers_ok

    async def idle(self):
        print("\n" + "="*50)
        print("🤖 Бот работает! Команды работают только для владельца")
        print("📁 Модули автоматически загружаются из папок modules/")
        print("🐍 Python плагины доступны из папки python_plugins/")
        print("🔐 Сообщения от других пользователей игнорируются")
        print("🔄 Сообщения команд теперь заменяются результатом")
        print("🛑 Для остановки нажми Ctrl+C")
        print("="*50)
        
        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Останавливаем бота...")

    def stop_servers(self):
        print("\n🛑 Остановка серверов...")
        
        if self.bot_client:
            try:
                self.bot_client.stop()
                print("✅ Бот остановлен")
            except:
                pass
        
        if self.node_process:
            try:
                self.node_process.terminate()
                print("✅ Node.js сервер остановлен")
            except:
                pass
        
        if self.plugin_process:
            try:
                self.plugin_process.terminate()
                print("✅ Python Plugin сервер остановлен")
            except:
                pass
        
        if self.db_process:
            try:
                self.db_process.terminate()
                print("✅ Python БД сервер остановлен")
            except:
                pass
        
        print("👋 Все остановлено!")

async def main():
    manager = BotManager()
    
    try:
        if not manager.start_servers():
            print("❌ Не удалось запустить серверы")
            return
        
        print("\n🔍 Проверка серверов...")
        time.sleep(2)
        if not manager.check_servers():
            print("❌ Серверы не работают корректно")
            return
        
        await manager.start_bot()
        
    except KeyboardInterrupt:
        print("\n🛑 Получен сигнал остановки...")
    except Exception as e:
        logger.error(f"❌ Критическая ошибка: {e}")
    finally:
        manager.stop_servers()

if __name__ == "__main__":
    required_files = ["core/db_server.py", "node_server.js", "core/py_plugin_server.py"]
    
    for file in required_files:
        if not os.path.exists(file):
            print(f"❌ Отсутствует файл: {file}")
            sys.exit(1)
    
    os.makedirs("modules/root", exist_ok=True)
    os.makedirs("modules/user", exist_ok=True)
    os.makedirs("python_plugins", exist_ok=True)
    
    asyncio.run(main())