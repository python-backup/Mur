import os
import asyncio

async def install_module(client, message):
    try:
        if not message.reply_to_message:
            return "❌ Это не ответ на сообщение"
        
        reply_message = message.reply_to_message
        
        if not reply_message.document:
            return "❌ В ответе нет файла"
        
        file_name = reply_message.document.file_name.lower()
        
        if not file_name.endswith('.js'):
            return "❌ Файл должен быть JavaScript модулем (.js)"
        
        module_name = file_name[:-3]
        
        system_modules = ['core', 'system', 'admin', 'auth', 'config', 'settings', 'module_installer']
        if module_name in system_modules:
            return f"❌ Модуль '{module_name}' является системным"
        
        result = []
        result.append(f"📦 Установка модуля: {module_name}")
        result.append(f"📝 Файл: {file_name}")
        result.append(f"📏 Размер: {reply_message.document.file_size} bytes")
        
        modules_dir = "modules/user"
        os.makedirs(modules_dir, exist_ok=True)
        module_path = os.path.join(modules_dir, file_name)
        
        if os.path.exists(module_path):
            result.append("🔄 Модуль уже установлен - обновляем...")
            backup_path = module_path + '.backup'
            try:
                import shutil
                shutil.copy2(module_path, backup_path)
            except:
                pass
        
        try:
            await client.download_media(reply_message, file_name=module_path)
        except Exception as e:
            return f"❌ Не удалось скачать файл: {str(e)}"
        
        if not os.path.exists(module_path):
            return "❌ Файл не был скачан"
        
        try:
            with open(module_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            file_size = os.path.getsize(module_path)
            result.append(f"✅ Файл скачан успешно ({file_size} bytes)")
            
        except Exception as e:
            return f"❌ Ошибка чтения файла: {str(e)}"
        
        result.append("✅ Модуль установлен успешно!")
        result.append("🔄 Модуль будет автоматически перезагружен")
        
        return "\n".join(result)
        
    except Exception as e:
        return f"❌ Ошибка установки: {str(e)}"

def get_installer_info():
    return """🔧 Система установки модулей

Использование:
1. Загрузите JavaScript файл модуля в чат
2. Ответьте на него командой .install

💡 Просто ответьте на файл .js командой .install"""

def list_protected_modules():
    protected = ['core', 'system', 'admin', 'auth', 'config', 'settings', 'module_installer']
    return f"🛡️ Защищенные модули:\n" + "\n".join([f"• {mod}" for mod in protected])