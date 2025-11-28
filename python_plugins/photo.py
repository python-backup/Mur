# python_plugins/photo.py
import os
import asyncio

async def dl_last_photo(Client):
    file_path = await client.download_media("https://t.me/lfotk/2")
    return f"✅ Фото скачано: {file_path}"