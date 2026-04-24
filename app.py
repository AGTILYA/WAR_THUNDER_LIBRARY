import os
import uuid
import random
import hashlib
import secrets
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from database import Database

app = Flask(__name__, static_folder='.')
CORS(app)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

db = Database()
API_PREFIX = '/api'

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def hash_password(password):
    salt = secrets.token_hex(16)
    return salt + ':' + hashlib.sha256((salt + password).encode()).hexdigest()

# ---------- Статические страницы ----------
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/vehicle/<int:vehicle_id>')
def vehicle_page(vehicle_id):
    return send_from_directory('.', 'vehicle.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# ---------- API: здоровье ----------
@app.route(f'{API_PREFIX}/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})

# ---------- Вся техника ----------
@app.route(f'{API_PREFIX}/vehicles', methods=['GET'])
def get_vehicles():
    try:
        return jsonify(db.get_all_vehicles())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- Одна техника ----------
@app.route(f'{API_PREFIX}/vehicles/<int:vehicle_id>', methods=['GET'])
def get_vehicle(vehicle_id):
    try:
        vehicle = db.get_vehicle_by_id(vehicle_id)
        if vehicle:
            return jsonify(vehicle)
        return jsonify({'error': 'Не найдено'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- Случайная техника ----------
@app.route(f'{API_PREFIX}/vehicles/random', methods=['GET'])
def random_vehicle():
    try:
        vehicles = db.get_all_vehicles()
        if not vehicles:
            return jsonify({'error': 'Нет техники'}), 404
        return jsonify(random.choice(vehicles))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- Добавление (с несколькими изображениями) ----------
@app.route(f'{API_PREFIX}/vehicles', methods=['POST'])
def add_vehicle():
    try:
        name = request.form.get('name')
        type_ = request.form.get('type')
        nation = request.form.get('nation')
        rank = request.form.get('rank')
        battle_rating = request.form.get('battle_rating')
        description = request.form.get('description')
        tags_json = request.form.get('tags')

        if not all([name, type_, nation, rank, battle_rating, description]):
            return jsonify({'error': 'Все поля обязательны'}), 400

        valid_types = ['tank', 'plane', 'boat', 'submarine', 'ship']
        if type_ not in valid_types:
            return jsonify({'error': 'Неверный тип'}), 400
        valid_nations = ['ussr', 'germany', 'usa', 'britain', 'japan']
        if nation not in valid_nations:
            return jsonify({'error': 'Неверная нация'}), 400

        rank_int = int(rank)
        if not 1 <= rank_int <= 7:
            return jsonify({'error': 'Ранг от 1 до 7'}), 400
        br_float = float(battle_rating)
        if not 1.0 <= br_float <= 11.7:
            return jsonify({'error': 'БР от 1.0 до 11.7'}), 400

        uploaded_files = request.files.getlist('images')
        if not uploaded_files or len(uploaded_files) == 0:
            return jsonify({'error': 'Выберите хотя бы одно изображение'}), 400
        if len(uploaded_files) > 5:
            return jsonify({'error': 'Максимум 5 изображений'}), 400

        image_urls = []
        for file in uploaded_files:
            if file and file.filename != '' and allowed_file(file.filename):
                ext = file.filename.rsplit('.', 1)[1].lower()
                filename = f"{uuid.uuid4().hex}.{ext}"
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                image_urls.append(f"/uploads/{filename}")
            else:
                return jsonify({'error': 'Недопустимый тип файла'}), 400

        vehicle_data = {
            'name': name,
            'type': type_,
            'nation': nation,
            'rank': rank_int,
            'battle_rating': br_float,
            'description': description
        }
        vehicle_id = db.add_vehicle(vehicle_data, image_urls)

        if tags_json:
            tags = json.loads(tags_json)
            db.add_tags_to_vehicle(vehicle_id, tags)

        with db.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT id FROM users')
            for user in cursor.fetchall():
                db.add_notification(user['id'], f'Добавлена новая техника: {name}', f'/vehicle/{vehicle_id}')

        return jsonify({'message': 'Техника добавлена', 'id': vehicle_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- Редактирование ----------
@app.route(f'{API_PREFIX}/vehicles/<int:vehicle_id>', methods=['PUT'])
def update_vehicle(vehicle_id):
    try:
        old = db.get_vehicle_by_id(vehicle_id)
        if not old:
            return jsonify({'error': 'Техника не найдена'}), 404

        name = request.form.get('name')
        type_ = request.form.get('type')
        nation = request.form.get('nation')
        rank = request.form.get('rank')
        battle_rating = request.form.get('battle_rating')
        description = request.form.get('description')
        tags_json = request.form.get('tags')

        if not all([name, type_, nation, rank, battle_rating, description]):
            return jsonify({'error': 'Все поля обязательны'}), 400

        valid_types = ['tank', 'plane', 'boat', 'submarine', 'ship']
        if type_ not in valid_types:
            return jsonify({'error': 'Неверный тип'}), 400
        valid_nations = ['ussr', 'germany', 'usa', 'britain', 'japan']
        if nation not in valid_nations:
            return jsonify({'error': 'Неверная нация'}), 400

        rank_int = int(rank)
        if not 1 <= rank_int <= 7:
            return jsonify({'error': 'Ранг от 1 до 7'}), 400
        br_float = float(battle_rating)
        if not 1.0 <= br_float <= 11.7:
            return jsonify({'error': 'БР от 1.0 до 11.7'}), 400

        uploaded_files = request.files.getlist('images')
        new_image_urls = None
        if uploaded_files and uploaded_files[0].filename != '':
            if len(uploaded_files) > 5:
                return jsonify({'error': 'Максимум 5 новых изображений'}), 400
            new_image_urls = []
            for file in uploaded_files:
                if file and allowed_file(file.filename):
                    ext = file.filename.rsplit('.', 1)[1].lower()
                    filename = f"{uuid.uuid4().hex}.{ext}"
                    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    file.save(filepath)
                    new_image_urls.append(f"/uploads/{filename}")
                else:
                    return jsonify({'error': 'Недопустимый тип файла'}), 400

        vehicle_data = {
            'name': name,
            'type': type_,
            'nation': nation,
            'rank': rank_int,
            'battle_rating': br_float,
            'description': description
        }
        db.update_vehicle(vehicle_id, vehicle_data, new_image_urls)

        if tags_json:
            tags = json.loads(tags_json)
            with db.get_connection() as conn:
                conn.execute('DELETE FROM vehicle_tags WHERE vehicle_id = ?', (vehicle_id,))
            db.add_tags_to_vehicle(vehicle_id, tags)

        return jsonify({'message': 'Техника обновлена'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- Удаление ----------
@app.route(f'{API_PREFIX}/vehicles/<int:vehicle_id>', methods=['DELETE'])
def delete_vehicle(vehicle_id):
    try:
        vehicle = db.get_vehicle_by_id(vehicle_id)
        if vehicle and vehicle.get('image_url'):
            filename = vehicle['image_url'].split('/')[-1]
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if os.path.exists(filepath):
                os.remove(filepath)
        if db.delete_vehicle(vehicle_id):
            return jsonify({'message': 'Удалено'}), 200
        return jsonify({'error': 'Не найдено'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- Поиск с фильтрами ----------
@app.route(f'{API_PREFIX}/vehicles/search', methods=['GET'])
def search_vehicles():
    try:
        filters = {}
        if request.args.get('type'): filters['type'] = request.args['type']
        if request.args.get('nation'): filters['nation'] = request.args['nation']
        if request.args.get('min_rank'): filters['min_rank'] = int(request.args['min_rank'])
        if request.args.get('max_rank'): filters['max_rank'] = int(request.args['max_rank'])
        if request.args.get('min_br'): filters['min_br'] = float(request.args['min_br'])
        if request.args.get('max_br'): filters['max_br'] = float(request.args['max_br'])
        if request.args.get('search'): filters['search'] = request.args['search']
        vehicles = db.search_vehicles(filters)
        return jsonify(vehicles)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- Избранное ----------
@app.route(f'{API_PREFIX}/favorites', methods=['GET'])
def get_favorites():
    user_id = request.args.get('user_id', 1, type=int)
    try:
        return jsonify(db.get_favorites(user_id))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route(f'{API_PREFIX}/favorites/<int:vehicle_id>', methods=['POST', 'DELETE'])
def toggle_favorite(vehicle_id):
    user_id = request.args.get('user_id', 1, type=int)
    try:
        if request.method == 'POST':
            success = db.add_favorite(user_id, vehicle_id)
            return jsonify({'favorite': success})
        else:
            success = db.remove_favorite(user_id, vehicle_id)
            return jsonify({'favorite': not success})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route(f'{API_PREFIX}/favorites/<int:vehicle_id>/status', methods=['GET'])
def favorite_status(vehicle_id):
    user_id = request.args.get('user_id', 1, type=int)
    try:
        return jsonify({'favorite': db.is_favorite(user_id, vehicle_id)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- Комментарии ----------
@app.route(f'{API_PREFIX}/vehicles/<int:vehicle_id>/comments', methods=['GET'])
def get_comments(vehicle_id):
    try:
        comments = db.get_comments(vehicle_id)
        rating = db.get_average_rating(vehicle_id)
        return jsonify({'comments': comments, 'rating': rating})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route(f'{API_PREFIX}/vehicles/<int:vehicle_id>/comments', methods=['POST'])
def add_comment(vehicle_id):
    try:
        data = request.get_json()
        author = data.get('author_name', 'Аноним')
        text = data.get('text', '')
        rating = data.get('rating')
        if not text and rating is None:
            return jsonify({'error': 'Добавьте текст или оценку'}), 400
        comment_id = db.add_comment(vehicle_id, author, text, rating, user_id=None)
        return jsonify({'message': 'Комментарий добавлен', 'id': comment_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- Статистика ----------
@app.route(f'{API_PREFIX}/stats/detailed', methods=['GET'])
def get_detailed_stats():
    try:
        return jsonify(db.get_detailed_stats())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- Данные для карты ----------
@app.route(f'{API_PREFIX}/map-data', methods=['GET'])
def get_map_data():
    try:
        return jsonify(db.get_map_data())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- Регистрация и логин ----------
@app.route(f'{API_PREFIX}/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        if not username or not password or not email:
            return jsonify({'error': 'Все поля обязательны'}), 400
        if db.get_user_by_username(username):
            return jsonify({'error': 'Пользователь уже существует'}), 400
        password_hash = hash_password(password)
        user_id = db.create_user(username, password_hash, email)
        return jsonify({'message': 'Регистрация успешна', 'user_id': user_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route(f'{API_PREFIX}/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        user = db.get_user_by_username(username)
        if not user:
            return jsonify({'error': 'Неверное имя или пароль'}), 401
        token = secrets.token_hex(32)
        return jsonify({'message': 'Вход выполнен', 'token': token, 'user': user})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- Профиль ----------
@app.route(f'{API_PREFIX}/profile/<int:user_id>', methods=['GET'])
def get_profile(user_id):
    try:
        user = db.get_user_by_id(user_id)
        if not user:
            return jsonify({'error': 'Пользователь не найден'}), 404
        return jsonify(user)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route(f'{API_PREFIX}/profile/<int:user_id>', methods=['PUT'])
def update_profile(user_id):
    try:
        data = request.get_json()
        avatar = data.get('avatar')
        bio = data.get('bio')
        db.update_user_profile(user_id, avatar, bio)
        return jsonify({'message': 'Профиль обновлён'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- Теги ----------
@app.route(f'{API_PREFIX}/tags', methods=['GET'])
def get_tags():
    try:
        return jsonify(db.get_all_tags())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route(f'{API_PREFIX}/vehicles/<int:vehicle_id>/tags', methods=['GET'])
def get_vehicle_tags(vehicle_id):
    try:
        return jsonify(db.get_vehicle_tags(vehicle_id))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route(f'{API_PREFIX}/vehicles/<int:vehicle_id>/tags', methods=['POST'])
def add_tags_to_vehicle(vehicle_id):
    try:
        data = request.get_json()
        tags = data.get('tags', [])
        db.add_tags_to_vehicle(vehicle_id, tags)
        return jsonify({'message': 'Теги добавлены'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route(f'{API_PREFIX}/vehicles/<int:vehicle_id>/tags/<int:tag_id>', methods=['DELETE'])
def remove_tag_from_vehicle(vehicle_id, tag_id):
    try:
        db.remove_tag_from_vehicle(vehicle_id, tag_id)
        return jsonify({'message': 'Тег удалён'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ---------- Уведомления ----------
@app.route(f'{API_PREFIX}/notifications/<int:user_id>', methods=['GET'])
def get_notifications(user_id):
    try:
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        return jsonify(db.get_user_notifications(user_id, unread_only))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route(f'{API_PREFIX}/notifications/<int:notification_id>/read', methods=['POST'])
def mark_notification_read(notification_id):
    try:
        db.mark_notification_read(notification_id)
        return jsonify({'message': 'Уведомление отмечено прочитанным'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route(f'{API_PREFIX}/notifications/<int:user_id>/read-all', methods=['POST'])
def mark_all_notifications_read(user_id):
    try:
        db.mark_all_notifications_read(user_id)
        return jsonify({'message': 'Все уведомления прочитаны'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

