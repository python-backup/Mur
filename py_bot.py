# py_bot.py
import asyncio
import subprocess
import time
import sys
import os
from pyrogram import Client, filters
from pyrogram.types import Message
import aiohttp
from core.client_manager import client_manager

API_ID = 21624658
API_HASH = "041636f0be841d66a5010d9b9a55285a"

class BotManager:
    def __init__(self):
        self.db_process = None
        self.node_process = None
        self.plugin_process = None
        self.bot_client = None

    def start_servers(self):
        print("Запуск серверов...")
        
        os.makedirs('modules/root', exist_ok=True)
        os.makedirs('modules/user', exist_ok=True)
        os.makedirs('python_plugins', exist_ok=True)
        
        servers = [
            {"name": "Python БД сервер", "port": 5000, "script": "core/db_server.py"},
            {"name": "Python Plugin сервер", "port": 6000, "script": "core/py_plugin_server.py"},
            {"name": "Node.js сервер", "port": 3000, "script": "node_server.js"}
        ]
        
        for server in servers:
            print(f"Запуск {server['name']}...")
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
                print(f"Ошибка запуска {server['name']}: {e}")
                return False
        
        print("Все серверы запущены!")
        return True

    async def start_bot(self):
        print("Запуск Telegram бота...")
        
        try:
            self.bot_client = Client(
                "my_bot",
                api_id=API_ID,
                api_hash=API_HASH,
            )
            
            # Регистрируем клиент
            client_manager.set_client(self.bot_client)
            
            @self.bot_client.on_message(filters.text & (filters.group | filters.private))
            async def handle_all_messages(client, message: Message):
                me = await client.get_me()
                if message.from_user and message.from_user.id != me.id:
                    return
                
                username = me.username
                
                is_authorized = await self.check_user_auth(username)
                
                if not is_authorized:
                    return
                
                prefix = await self.get_current_prefix()
                
                if message.text.startswith(prefix):
                    command = message.text[len(prefix):].split()[0]
                    params = {"args": message.text.split()[1:]}
                    
                    processing_text = f"Выполняется команда `{command}`..."
                    try:
                        processing_msg = await message.reply(processing_text)
                    except Exception as e:
                        processing_msg = await message.reply(processing_text)
                    
                    result = await self.execute_command(command, username, params, message)
                    
                    if result.get("success"):
                        response_text = result['data']
                        if response_text and response_text.strip():
                            try:
                                await processing_msg.edit_text(response_text)
                            except Exception as e:
                                await message.reply(response_text)
                    else:
                        error_msg = result.get('error', 'Unknown error')
                        if error_msg and "Недостаточно прав" not in error_msg and "недостаточно прав" not in error_msg:
                            error_text = f"Ошибка: `{error_msg}`"
                            try:
                                await processing_msg.edit_text(error_text)
                            except Exception as e:
                                await message.reply(error_text)
                        else:
                            try:
                                await processing_msg.delete()
                            except:
                                pass
            
            await self.bot_client.start()
            print("Telegram бот запущен!")
            
            await self.idle()
            
        except Exception as e:
            print(f"Ошибка запуска бота: {e}")
            raise

    async def check_user_auth(self, username: str) -> bool:
        async with aiohttp.ClientSession() as session:
            try:
                if not username or username == 'unknown':
                    return False
                    
                payload = {"username": username}
                async with session.post(
                    "http://localhost:5000/auth/check", 
                    json=payload,
                    timeout=5
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get('is_master', False) or data.get('first_run', False) or data.get('is_authorized', False)
                    return False
            except Exception as e:
                return False

    async def execute_command(self, command: str, username: str, params: dict = None, message: Message = None):
        async with aiohttp.ClientSession() as session:
            try:
                payload = {
                    "username": username, 
                    "params": params or {},
                    "message": self.serialize_message(message) if message else None
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
                    print(f"{server['name']} сервер работает")
                else:
                    print(f"{server['name']} сервер не отвечает")
                    servers_ok = False
            except Exception as e:
                print(f"{server['name']} сервер не запущен: {e}")
                servers_ok = False
                
        return servers_ok

    async def idle(self):
        print("Бот работает!")
        
        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            print("Останавливаем бота...")

    def stop_servers(self):
        print("Остановка серверов...")
        
        if self.bot_client:
            try:
                self.bot_client.stop()
                print("Бот остановлен")
            except:
                pass
        
        if self.node_process:
            try:
                self.node_process.terminate()
                print("Node.js сервер остановлен")
            except:
                pass
        
        if self.plugin_process:
            try:
                self.plugin_process.terminate()
                print("Python Plugin сервер остановлен")
            except:
                pass
        
        if self.db_process:
            try:
                self.db_process.terminate()
                print("Python БД сервер остановлен")
            except:
                pass
        
        print("Все остановлено!")

async def main():
    manager = BotManager()
    
    try:
        if not manager.start_servers():
            print("Не удалось запустить серверы")
            return
        
        print("Проверка серверов...")
        time.sleep(2)
        if not manager.check_servers():
            print("Серверы не работают корректно")
            return
        
        await manager.start_bot()
        
    except KeyboardInterrupt:
        print("Получен сигнал остановки...")
    except Exception as e:
        print(f"Критическая ошибка: {e}")
    finally:
        manager.stop_servers()

if __name__ == "__main__":
    required_files = ["core/db_server.py", "node_server.js", "core/py_plugin_server.py"]
    
    for file in required_files:
        if not os.path.exists(file):
            print(f"Отсутствует файл: {file}")
            sys.exit(1)
    
    os.makedirs("modules/root", exist_ok=True)
    os.makedirs("modules/user", exist_ok=True)
    os.makedirs("python_plugins", exist_ok=True)
    
    asyncio.run(main())