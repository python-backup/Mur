from pyrogram import Client

# Замени эти значения на свои из https://my.telegram.org/apps
API_ID = 21624658
API_HASH = "041636f0be841d66a5010d9b9a55285a"

with Client("my_session", API_ID, API_HASH) as app:
    session_string = app.export_session_string()
    print("=" * 50)
    print("ВАШ session_string:")
    print(session_string)
    print("=" * 50)
    print("Скопируйте эту строку в py_bot.py")
