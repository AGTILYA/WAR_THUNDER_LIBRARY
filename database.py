import sqlite3
from datetime import datetime
import os
class Database:
    def __init__(self, db_name = os.path.join(os.path.dirname(__file__), 'war_thunder.db')):
        self.db_name = db_name
        self.init_database()
    
    def get_connection(self):
        conn = sqlite3.connect(self.db_name)
        conn.row_factory = sqlite3.Row
        return conn
    
    def init_database(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Таблица техники (без image_url)
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS vehicles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('tank', 'plane', 'boat', 'submarine', 'ship')),
                nation TEXT NOT NULL CHECK(nation IN ('ussr', 'germany', 'usa', 'britain', 'japan')),
                rank INTEGER NOT NULL CHECK(rank BETWEEN 1 AND 7),
                battle_rating REAL NOT NULL CHECK(battle_rating BETWEEN 1.0 AND 11.7),
                description TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            ''')
            
            # Таблица изображений техники
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS vehicle_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vehicle_id INTEGER NOT NULL,
                image_url TEXT NOT NULL,
                sort_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
            )
            ''')
            
            # Таблица пользователей
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            ''')
            
            # Таблица избранного
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS favorites (
                user_id INTEGER NOT NULL,
                vehicle_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, vehicle_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
            )
            ''')
            
            # Таблица комментариев и оценок
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vehicle_id INTEGER NOT NULL,
                user_id INTEGER,
                author_name TEXT DEFAULT 'Аноним',
                text TEXT NOT NULL,
                rating INTEGER CHECK(rating BETWEEN 1 AND 5),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
            ''')
            
            # Таблица тегов
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS tags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            ''')
            
            # Связь техники с тегами
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS vehicle_tags (
                vehicle_id INTEGER NOT NULL,
                tag_id INTEGER NOT NULL,
                PRIMARY KEY (vehicle_id, tag_id),
                FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
            )
            ''')
            
            # Таблица уведомлений
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                link TEXT,
                is_read BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
            ''')
            
            # Миграция: если есть старая таблица vehicles с колонкой image_url, переносим данные
            cursor.execute("PRAGMA table_info(vehicles)")
            columns = [col[1] for col in cursor.fetchall()]
            if 'image_url' in columns:
                cursor.execute("SELECT id, image_url FROM vehicles WHERE image_url IS NOT NULL AND image_url != ''")
                old_images = cursor.fetchall()
                for row in old_images:
                    cursor.execute('''
                    INSERT INTO vehicle_images (vehicle_id, image_url, sort_order) VALUES (?, ?, ?)
                    ''', (row['id'], row['image_url'], 0))
            
            # Добавляем колонки в users (без UNIQUE)
            cursor.execute("PRAGMA table_info(users)")
            user_columns = [col[1] for col in cursor.fetchall()]
            if 'email' not in user_columns:
                cursor.execute("ALTER TABLE users ADD COLUMN email TEXT")
            if 'avatar' not in user_columns:
                cursor.execute("ALTER TABLE users ADD COLUMN avatar TEXT")
            if 'bio' not in user_columns:
                cursor.execute("ALTER TABLE users ADD COLUMN bio TEXT")
            
            # Добавляем тестового пользователя
            cursor.execute("SELECT id FROM users WHERE id = 1")
            if not cursor.fetchone():
                cursor.execute('''
                INSERT INTO users (id, username, password_hash, email)
                VALUES (1, 'guest', '', 'guest@localhost')
                ''')
            else:
                cursor.execute('''
                UPDATE users SET email = 'guest@localhost' WHERE id = 1 AND (email IS NULL OR email = '')
                ''')
            
            conn.commit()
    
    # ----- Основные методы работы с техникой -----
    def add_vehicle(self, vehicle_data, image_urls=[]):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
            INSERT INTO vehicles (name, type, nation, rank, battle_rating, description)
            VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                vehicle_data['name'],
                vehicle_data['type'],
                vehicle_data['nation'],
                vehicle_data['rank'],
                vehicle_data['battle_rating'],
                vehicle_data['description']
            ))
            vehicle_id = cursor.lastrowid
            for idx, url in enumerate(image_urls):
                cursor.execute('''
                INSERT INTO vehicle_images (vehicle_id, image_url, sort_order) VALUES (?, ?, ?)
                ''', (vehicle_id, url, idx))
            conn.commit()
            return vehicle_id
    
    def update_vehicle(self, vehicle_id, vehicle_data, new_image_urls=None):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
            UPDATE vehicles
            SET name=?, type=?, nation=?, rank=?, battle_rating=?, description=?
            WHERE id=?
            ''', (
                vehicle_data['name'],
                vehicle_data['type'],
                vehicle_data['nation'],
                vehicle_data['rank'],
                vehicle_data['battle_rating'],
                vehicle_data['description'],
                vehicle_id
            ))
            if new_image_urls is not None:
                # Удаляем старые изображения
                cursor.execute('DELETE FROM vehicle_images WHERE vehicle_id = ?', (vehicle_id,))
                for idx, url in enumerate(new_image_urls):
                    cursor.execute('''
                    INSERT INTO vehicle_images (vehicle_id, image_url, sort_order) VALUES (?, ?, ?)
                    ''', (vehicle_id, url, idx))
            conn.commit()
            return True
    
    def get_all_vehicles(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
            SELECT id, name, type, nation, rank, battle_rating, description, created_at
            FROM vehicles ORDER BY created_at DESC
            ''')
            vehicles = [dict(row) for row in cursor.fetchall()]
            for v in vehicles:
                cursor.execute('''
                SELECT image_url FROM vehicle_images WHERE vehicle_id = ? ORDER BY sort_order
                ''', (v['id'],))
                images = [row['image_url'] for row in cursor.fetchall()]
                v['images'] = images
                v['image_url'] = images[0] if images else ''
            return vehicles
    
    def get_vehicle_by_id(self, vehicle_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
            SELECT id, name, type, nation, rank, battle_rating, description, created_at
            FROM vehicles WHERE id = ?
            ''', (vehicle_id,))
            row = cursor.fetchone()
            if not row:
                return None
            vehicle = dict(row)
            cursor.execute('''
            SELECT image_url FROM vehicle_images WHERE vehicle_id = ? ORDER BY sort_order
            ''', (vehicle_id,))
            images = [r['image_url'] for r in cursor.fetchall()]
            vehicle['images'] = images
            vehicle['image_url'] = images[0] if images else ''
            return vehicle
    
    def delete_vehicle(self, vehicle_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if not self.get_vehicle_by_id(vehicle_id):
                return False
            cursor.execute('DELETE FROM vehicles WHERE id = ?', (vehicle_id,))
            conn.commit()
            return True
    
    def delete_all_vehicles(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM vehicles')
            conn.commit()
            return True
    
    def get_stats(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            stats = {}
            cursor.execute('SELECT COUNT(*) as total FROM vehicles')
            stats['total'] = cursor.fetchone()['total']
            cursor.execute('SELECT type, COUNT(*) as count FROM vehicles GROUP BY type')
            for row in cursor.fetchall():
                stats[row['type']] = row['count']
            return stats
    
    def search_vehicles(self, filters=None):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = '''
            SELECT id, name, type, nation, rank, battle_rating, description, created_at
            FROM vehicles WHERE 1=1
            '''
            params = []
            if filters:
                if 'type' in filters and filters['type']:
                    query += ' AND type = ?'
                    params.append(filters['type'])
                if 'nation' in filters and filters['nation']:
                    query += ' AND nation = ?'
                    params.append(filters['nation'])
                if 'min_rank' in filters and filters['min_rank']:
                    query += ' AND rank >= ?'
                    params.append(filters['min_rank'])
                if 'max_rank' in filters and filters['max_rank']:
                    query += ' AND rank <= ?'
                    params.append(filters['max_rank'])
                if 'min_br' in filters and filters['min_br']:
                    query += ' AND battle_rating >= ?'
                    params.append(filters['min_br'])
                if 'max_br' in filters and filters['max_br']:
                    query += ' AND battle_rating <= ?'
                    params.append(filters['max_br'])
                if 'search' in filters and filters['search']:
                    query += ' AND name LIKE ?'
                    params.append(f'%{filters["search"]}%')
            query += ' ORDER BY created_at DESC'
            cursor.execute(query, params)
            vehicles = [dict(row) for row in cursor.fetchall()]
            for v in vehicles:
                cursor.execute('''
                SELECT image_url FROM vehicle_images WHERE vehicle_id = ? ORDER BY sort_order
                ''', (v['id'],))
                images = [row['image_url'] for row in cursor.fetchall()]
                v['images'] = images
                v['image_url'] = images[0] if images else ''
            return vehicles
    
    # ----- Избранное -----
    def add_favorite(self, user_id, vehicle_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('INSERT OR IGNORE INTO favorites (user_id, vehicle_id) VALUES (?, ?)',
                           (user_id, vehicle_id))
            conn.commit()
            return cursor.rowcount > 0
    
    def remove_favorite(self, user_id, vehicle_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM favorites WHERE user_id = ? AND vehicle_id = ?',
                           (user_id, vehicle_id))
            conn.commit()
            return cursor.rowcount > 0
    
    def get_favorites(self, user_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
            SELECT v.* FROM vehicles v
            JOIN favorites f ON v.id = f.vehicle_id
            WHERE f.user_id = ?
            ORDER BY f.created_at DESC
            ''', (user_id,))
            vehicles = [dict(row) for row in cursor.fetchall()]
            for v in vehicles:
                cursor.execute('''
                SELECT image_url FROM vehicle_images WHERE vehicle_id = ? ORDER BY sort_order
                ''', (v['id'],))
                images = [row['image_url'] for row in cursor.fetchall()]
                v['images'] = images
                v['image_url'] = images[0] if images else ''
            return vehicles
    
    def is_favorite(self, user_id, vehicle_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT 1 FROM favorites WHERE user_id = ? AND vehicle_id = ?',
                           (user_id, vehicle_id))
            return cursor.fetchone() is not None
    
    # ----- Комментарии и рейтинги -----
    def add_comment(self, vehicle_id, author_name, text, rating=None, user_id=None):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
            INSERT INTO comments (vehicle_id, user_id, author_name, text, rating)
            VALUES (?, ?, ?, ?, ?)
            ''', (vehicle_id, user_id, author_name, text, rating))
            conn.commit()
            return cursor.lastrowid
    
    def get_comments(self, vehicle_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
            SELECT id, author_name, text, rating, created_at
            FROM comments WHERE vehicle_id = ?
            ORDER BY created_at DESC
            ''', (vehicle_id,))
            return [dict(row) for row in cursor.fetchall()]
    
    def get_average_rating(self, vehicle_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
            SELECT AVG(rating) as avg_rating, COUNT(rating) as count
            FROM comments WHERE vehicle_id = ? AND rating IS NOT NULL
            ''', (vehicle_id,))
            row = cursor.fetchone()
            return {'avg': round(row['avg_rating'], 1) if row['avg_rating'] else 0,
                    'count': row['count']}
    
    # ----- Детальная статистика -----
    def get_detailed_stats(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            stats = {}
            
            cursor.execute('SELECT type, COUNT(*) as count FROM vehicles GROUP BY type')
            stats['by_type'] = {row['type']: row['count'] for row in cursor.fetchall()}
            
            cursor.execute('SELECT nation, COUNT(*) as count FROM vehicles GROUP BY nation')
            stats['by_nation'] = {row['nation']: row['count'] for row in cursor.fetchall()}
            
            cursor.execute('SELECT rank, COUNT(*) as count FROM vehicles GROUP BY rank ORDER BY rank')
            stats['by_rank'] = {str(row['rank']): row['count'] for row in cursor.fetchall()}
            
            cursor.execute('''
            SELECT CAST(ROUND(battle_rating) AS INTEGER) as br_group, COUNT(*) as count
            FROM vehicles GROUP BY br_group ORDER BY br_group
            ''')
            stats['by_br'] = {str(row['br_group']): row['count'] for row in cursor.fetchall()}
            
            stats['by_br_detail'] = self.get_br_distribution()
            
            return stats
    
    def get_br_distribution(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
            SELECT battle_rating, COUNT(*) as count
            FROM vehicles
            GROUP BY battle_rating
            ORDER BY battle_rating
            ''')
            rows = cursor.fetchall()
            result = {}
            for row in rows:
                result[str(row['battle_rating'])] = row['count']
            return result
    
    # ----- Данные для карты -----
    def get_map_data(self):
        nation_coords = {
            'ussr': {'lat': 55.7558, 'lng': 37.6173, 'name': 'СССР'},
            'germany': {'lat': 52.5200, 'lng': 13.4050, 'name': 'Германия'},
            'usa': {'lat': 38.9072, 'lng': -77.0369, 'name': 'США'},
            'britain': {'lat': 51.5074, 'lng': -0.1278, 'name': 'Великобритания'},
            'japan': {'lat': 35.6895, 'lng': 139.6917, 'name': 'Япония'}
        }
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
            SELECT nation, COUNT(*) as count
            FROM vehicles GROUP BY nation
            ''')
            rows = cursor.fetchall()
            result = []
            for row in rows:
                nation = row['nation']
                coords = nation_coords.get(nation, {'lat': 0, 'lng': 0, 'name': nation})
                result.append({
                    'nation': nation,
                    'name': coords['name'],
                    'lat': coords['lat'],
                    'lng': coords['lng'],
                    'count': row['count']
                })
            return result
    
    # ----- Теги -----
    def add_tag(self, tag_name):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('INSERT OR IGNORE INTO tags (name) VALUES (?)', (tag_name,))
            conn.commit()
            cursor.execute('SELECT id FROM tags WHERE name = ?', (tag_name,))
            return cursor.fetchone()['id']
    
    def get_all_tags(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, name FROM tags ORDER BY name')
            return [dict(row) for row in cursor.fetchall()]
    
    def add_tags_to_vehicle(self, vehicle_id, tag_names):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            for tag in tag_names:
                tag_id = self.add_tag(tag.strip())
                cursor.execute('INSERT OR IGNORE INTO vehicle_tags (vehicle_id, tag_id) VALUES (?, ?)',
                               (vehicle_id, tag_id))
            conn.commit()
    
    def get_vehicle_tags(self, vehicle_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
            SELECT t.id, t.name FROM tags t
            JOIN vehicle_tags vt ON t.id = vt.tag_id
            WHERE vt.vehicle_id = ?
            ''', (vehicle_id,))
            return [dict(row) for row in cursor.fetchall()]
    
    def remove_tag_from_vehicle(self, vehicle_id, tag_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM vehicle_tags WHERE vehicle_id = ? AND tag_id = ?',
                           (vehicle_id, tag_id))
            conn.commit()
    
    # ----- Пользователи -----
    def create_user(self, username, password_hash, email):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
            INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)
            ''', (username, password_hash, email))
            conn.commit()
            return cursor.lastrowid
    
    def get_user_by_username(self, username):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, username, email, avatar, bio FROM users WHERE username = ?', (username,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def get_user_by_id(self, user_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id, username, email, avatar, bio FROM users WHERE id = ?', (user_id,))
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def update_user_profile(self, user_id, avatar=None, bio=None):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            if avatar:
                cursor.execute('UPDATE users SET avatar = ? WHERE id = ?', (avatar, user_id))
            if bio:
                cursor.execute('UPDATE users SET bio = ? WHERE id = ?', (bio, user_id))
            conn.commit()
    
    # ----- Уведомления -----
    def add_notification(self, user_id, message, link=''):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
            INSERT INTO notifications (user_id, message, link) VALUES (?, ?, ?)
            ''', (user_id, message, link))
            conn.commit()
            return cursor.lastrowid
    
    def get_user_notifications(self, user_id, unread_only=False):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            query = 'SELECT * FROM notifications WHERE user_id = ?'
            params = [user_id]
            if unread_only:
                query += ' AND is_read = 0'
            query += ' ORDER BY created_at DESC'
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
    
    def mark_notification_read(self, notification_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('UPDATE notifications SET is_read = 1 WHERE id = ?', (notification_id,))
            conn.commit()
    
    def mark_all_notifications_read(self, user_id):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', (user_id,))
            conn.commit()