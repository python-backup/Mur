from flask import Flask, request, jsonify
from database import Database

app = Flask(__name__)
db = Database()

@app.route('/auth/check', methods=['POST'])
def check_auth():
    data = request.get_json()
    username = data.get('username')
    
    if not username or username == 'unknown':
        return jsonify({'error': 'Username required'}), 400
    
    master_user = db.get_master_user()
    if not master_user:
        db.set_master_user(username)
        return jsonify({'is_master': True, 'first_run': True})
    
    is_master = db.is_master(username)
    is_admin = db.is_admin(username)
    is_authorized = is_master or is_admin
    
    return jsonify({
        'is_master': is_master,
        'is_admin': is_admin,
        'is_authorized': is_authorized,
        'first_run': False
    })

@app.route('/auth/check_master', methods=['POST'])
def check_master():
    data = request.get_json()
    username = data.get('username')
    
    if not username:
        return jsonify({'error': 'Username required'}), 400
    
    is_master = db.is_master(username)
    return jsonify({'is_master': is_master})

@app.route('/auth/check_admin', methods=['POST'])
def check_admin():
    data = request.get_json()
    username = data.get('username')
    
    if not username:
        return jsonify({'error': 'Username required'}), 400
    
    is_admin = db.is_admin(username)
    return jsonify({'is_admin': is_admin})

@app.route('/admin/add', methods=['POST'])
def add_admin():
    data = request.get_json()
    username = data.get('username')
    master = data.get('master')
    
    if not username or not master:
        return jsonify({'error': 'Username and master required'}), 400
    
    if not db.is_master(master):
        return jsonify({'error': 'Only master can add admins'}), 403
    
    success = db.add_admin(username, master)
    if success:
        return jsonify({'success': True, 'new_admin': username})
    else:
        return jsonify({'error': 'Failed to add admin'}), 500

@app.route('/admin/remove', methods=['POST'])
def remove_admin():
    data = request.get_json()
    username = data.get('username')
    master = data.get('master')
    
    if not username or not master:
        return jsonify({'error': 'Username and master required'}), 400
    
    if not db.is_master(master):
        return jsonify({'error': 'Only master can remove admins'}), 403
    
    success = db.remove_admin(username, master)
    if success:
        return jsonify({'success': True, 'removed_admin': username})
    else:
        return jsonify({'error': 'Failed to remove admin'}), 500

@app.route('/admin/list', methods=['GET'])
def list_admins():
    admins = db.get_admin_list()
    return jsonify({'admins': admins})

@app.route('/settings/prefix', methods=['GET'])
def get_prefix():
    prefix = db.get_setting('prefix')
    return jsonify({'prefix': prefix})

@app.route('/settings/prefix', methods=['POST'])
def set_prefix():
    data = request.get_json()
    username = data.get('username')
    prefix = data.get('prefix')
    
    if not username or not prefix:
        return jsonify({'error': 'Username and prefix required'}), 400
    
    if not db.is_authorized_user(username):
        return jsonify({'error': 'Only authorized users can change prefix'}), 403
    
    if len(prefix) > 5:
        return jsonify({'error': 'Prefix too long'}), 400
    
    success = db.set_setting('prefix', prefix)
    if success:
        return jsonify({'success': True, 'new_prefix': prefix})
    else:
        return jsonify({'error': 'Failed to set prefix'}), 500

@app.route('/settings/get', methods=['POST'])
def get_setting():
    data = request.get_json()
    username = data.get('username')
    key = data.get('key')
    
    if not username or not key:
        return jsonify({'error': 'Username and key required'}), 400
    
    if not db.is_authorized_user(username):
        return jsonify({'error': 'Only authorized users can access settings'}), 403
    
    value = db.get_setting(key)
    return jsonify({'key': key, 'value': value})

@app.route('/settings/set', methods=['POST'])
def set_setting():
    data = request.get_json()
    username = data.get('username')
    key = data.get('key')
    value = data.get('value')
    
    if not username or not key or value is None:
        return jsonify({'error': 'Username, key and value required'}), 400
    
    if not db.is_authorized_user(username):
        return jsonify({'error': 'Only authorized users can change settings'}), 403
    
    success = db.set_setting(key, value)
    if success:
        return jsonify({'success': True, 'key': key, 'value': value})
    else:
        return jsonify({'error': 'Failed to set setting'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'service': 'Python DB Server',
        'timestamp': '2024-01-01T00:00:00Z'
    })

@app.route('/stats', methods=['GET'])
def get_stats():
    master_user = db.get_master_user()
    prefix = db.get_setting('prefix')
    
    return jsonify({
        'master': master_user['username'] if master_user else None,
        'prefix': prefix,
        'service': 'Database Server'
    })

if __name__ == '__main__':
    print('🚀 Python DB Server running on port 5000')
    print('📊 Database initialized')
    print('🔐 Authentication system ready')
    app.run(host='0.0.0.0', port=5000, debug=False)