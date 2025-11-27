# core/database.py
import sqlite3
import os

class Database:
    def __init__(self):
        self.db_path = './bot.db'
        self.init_database()
    
    def init_database(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS authorized_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                is_master BOOLEAN DEFAULT FALSE,
                is_admin BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS bot_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        ''')
        
        cursor.execute('INSERT OR IGNORE INTO bot_settings (key, value) VALUES (?, ?)', ('prefix', '.'))
        
        conn.commit()
        conn.close()
    
    def set_master_user(self, username):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        try:
            cursor.execute('UPDATE authorized_users SET is_master = FALSE')
            cursor.execute('SELECT * FROM authorized_users WHERE username = ?', (username,))
            existing_user = cursor.fetchone()
            if existing_user:
                cursor.execute('UPDATE authorized_users SET is_master = TRUE WHERE username = ?', (username,))
            else:
                cursor.execute('INSERT INTO authorized_users (username, is_master) VALUES (?, TRUE)', (username,))
            conn.commit()
            return True
        except Exception as e:
            print(f"Database error: {e}")
            return False
        finally:
            conn.close()
    
    def is_authorized_user(self, username):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM authorized_users WHERE username = ? AND (is_master = TRUE OR is_admin = TRUE)', (username,))
        row = cursor.fetchone()
        conn.close()
        return bool(row)
    
    def is_master(self, username):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM authorized_users WHERE username = ? AND is_master = TRUE', (username,))
        row = cursor.fetchone()
        conn.close()
        return bool(row)
    
    def is_admin(self, username):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM authorized_users WHERE username = ? AND (is_master = TRUE OR is_admin = TRUE)', (username,))
        row = cursor.fetchone()
        conn.close()
        return bool(row)
    
    def add_admin(self, username, master_username):
        if not self.is_master(master_username):
            return False
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        try:
            cursor.execute('SELECT * FROM authorized_users WHERE username = ?', (username,))
            existing_user = cursor.fetchone()
            if existing_user:
                cursor.execute('UPDATE authorized_users SET is_admin = TRUE WHERE username = ?', (username,))
            else:
                cursor.execute('INSERT INTO authorized_users (username, is_admin) VALUES (?, TRUE)', (username,))
            conn.commit()
            return True
        except Exception as e:
            return False
        finally:
            conn.close()
    
    def remove_admin(self, username, master_username):
        if not self.is_master(master_username):
            return False
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        try:
            cursor.execute('UPDATE authorized_users SET is_admin = FALSE WHERE username = ?', (username,))
            conn.commit()
            return cursor.rowcount > 0
        except Exception as e:
            return False
        finally:
            conn.close()
    
    def get_master_user(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT username FROM authorized_users WHERE is_master = TRUE LIMIT 1')
        row = cursor.fetchone()
        conn.close()
        return {'username': row[0]} if row else None
    
    def get_admins(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT username FROM authorized_users WHERE is_admin = TRUE OR is_master = TRUE')
        rows = cursor.fetchall()
        conn.close()
        return [row[0] for row in rows]
    
    def get_admin_list(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT username FROM authorized_users WHERE is_admin = TRUE AND is_master = FALSE')
        rows = cursor.fetchall()
        conn.close()
        return [row[0] for row in rows]
    
    def get_setting(self, key):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT value FROM bot_settings WHERE key = ?', (key,))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else None
    
    def set_setting(self, key, value):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        try:
            cursor.execute('INSERT OR REPLACE INTO bot_settings (key, value) VALUES (?, ?)', (key, str(value)))
            conn.commit()
            return True
        except Exception as e:
            return False
        finally:
            conn.close()
    
    def get_all_settings(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT key, value FROM bot_settings')
        rows = cursor.fetchall()
        conn.close()
        return {row[0]: row[1] for row in rows}
    
    def get_all_users(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('SELECT username, is_master, is_admin, created_at FROM authorized_users')
        rows = cursor.fetchall()
        conn.close()
        return [{'username': row[0], 'is_master': bool(row[1]), 'is_admin': bool(row[2]), 'created_at': row[3]} for row in rows]