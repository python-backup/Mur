# python_plugins/markdown.py
"""
MARKDOWN плагин для Pyrogram
Предоставляет функции форматирования текста для других модулей
"""

def format_bold(text: str) -> str:
    """**Жирный текст**"""
    return f"**{text}**"

def format_italic(text: str) -> str:
    """*Курсивный текст*"""
    return f"*{text}*"

def format_code(text: str) -> str:
    """`Моноширинный текст`"""
    return f"`{text}`"

def format_link(text: str, url: str) -> str:
    """[Текст ссылки](URL)"""
    return f"[{text}]({url})"

def format_code_block(code: str, language: str = "") -> str:
    """Блок кода с подсветкой синтаксиса"""
    return f"```{language}\n{code}\n```"

def format_underline(text: str) -> str:
    """__Подчеркнутый текст__"""
    return f"__{text}__"

def format_strikethrough(text: str) -> str:
    """~~Зачеркнутый текст~~"""
    return f"~~{text}~~"

def create_header(text: str, level: int = 1) -> str:
    """Заголовок (# ## ###)"""
    hashes = "#" * level
    return f"{hashes} {text}"

def create_list(items: list, ordered: bool = False) -> str:
    """Создает маркированный или нумерованный список"""
    if ordered:
        return "\n".join([f"{i+1}. {item}" for i, item in enumerate(items)])
    else:
        return "\n".join([f"• {item}" for item in items])

def create_table(headers: list, rows: list) -> str:
    """Создает таблицу в Markdown"""
    table = "| " + " | ".join(headers) + " |\n"
    table += "|" + "|".join(["---"] * len(headers)) + "|\n"
    
    for row in rows:
        table += "| " + " | ".join(str(cell) for cell in row) + " |\n"
    
    return table

def escape_markdown(text: str) -> str:
    """Экранирует специальные символы Markdown"""
    import re
    chars = r'\_*[]()~`>#+-=|{}.!'
    return re.sub(f'([{re.escape(chars)}])', r'\\\1', text)

# Пример использования в других модулях
def example_usage():
    """Пример использования функций MARKDOWN"""
    
    # Жирный текст
    bold_text = format_bold("Важное сообщение")
    
    # Курсив
    italic_text = format_italic("Внимание")
    
    # Ссылка
    link_text = format_link("Google", "https://google.com")
    
    # Блок кода
    code_block = format_code_block("print('Hello World')", "python")
    
    # Список
    item_list = create_list(["Пункт 1", "Пункт 2", "Пункт 3"])
    
    # Таблица
    table = create_table(
        ["Имя", "Возраст", "Город"],
        [["Анна", 25, "Москва"], ["Иван", 30, "СПб"]]
    )
    
    example_message = f"""
{create_header("Пример MARKDOWN", 2)}

{bold_text} - это важно!
{italic_text} - обратите внимание

{create_header("Ссылка", 3)}
{link_text}

{create_header("Код", 3)}
{code_block}

{create_header("Список", 3)}
{item_list}

{create_header("Таблица", 3)}
{table}
    """
    
    return example_message

# Функция для тестирования
def test_markdown():
    """Тестирование всех функций MARKDOWN"""
    return example_usage()

# Основная функция плагина
def MARKDOWN():
    """Главная функция MARKDOWN плагина"""
    return {
        "format_bold": format_bold,
        "format_italic": format_italic, 
        "format_code": format_code,
        "format_link": format_link,
        "format_code_block": format_code_block,
        "format_underline": format_underline,
        "format_strikethrough": format_strikethrough,
        "create_header": create_header,
        "create_list": create_list,
        "create_table": create_table,
        "escape_markdown": escape_markdown,
        "example_usage": example_usage,
        "test": test_markdown
    }