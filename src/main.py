import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))  # DON'T CHANGE THIS !!!

from flask import Flask, render_template, request, redirect, url_for, jsonify, session, flash
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_dance.contrib.google import make_google_blueprint, google
import json
import uuid
import geopandas as gpd
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['SECRET_KEY'] = os.urandom(24)
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max upload

# Google OAuth configuration
app.config["GOOGLE_OAUTH_CLIENT_ID"] = "YOUR_GOOGLE_CLIENT_ID"  # To be replaced with actual client ID
app.config["GOOGLE_OAUTH_CLIENT_SECRET"] = "YOUR_GOOGLE_CLIENT_SECRET"  # To be replaced with actual client secret

# Initialize Google OAuth blueprint
google_bp = make_google_blueprint(
    client_id=app.config["GOOGLE_OAUTH_CLIENT_ID"],
    client_secret=app.config["GOOGLE_OAUTH_CLIENT_SECRET"],
    scope=["profile", "email"]
)
app.register_blueprint(google_bp, url_prefix="/login")

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# User class for Flask-Login
class User(UserMixin):
    def __init__(self, id, email, name):
        self.id = id
        self.email = email
        self.name = name

# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    if user_id in users:
        return User(user_id, users[user_id]['email'], users[user_id]['name'])
    return None

# In-memory user storage (replace with database in production)
users = {}

# Routes
@app.route('/')
def index():
    if current_user.is_authenticated:
        return render_template('index.html')
    return redirect(url_for('login'))

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/login/google')
def login_google():
    if not google.authorized:
        return redirect(url_for("google.login"))
    return redirect(url_for("google_authorized"))

@app.route('/logout')
@login_required
def logout():
    logout_user()
    session.clear()
    return redirect(url_for('login'))

@app.route('/login/authorized')
def google_authorized():
    if not google.authorized:
        return redirect(url_for("google.login"))
    
    resp = google.get("/oauth2/v1/userinfo")
    if resp.ok:
        user_info = resp.json()
        user_id = str(uuid.uuid4())
        users[user_id] = {
            'email': user_info['email'],
            'name': user_info['name']
        }
        
        user = User(user_id, user_info['email'], user_info['name'])
        login_user(user)
        
        return redirect(url_for('index'))
    
    return "Failed to fetch user info from Google", 400

# API routes for GIS data handling
@app.route('/api/upload', methods=['POST'])
@login_required
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)
    
    file_type = os.path.splitext(filename)[1].lower()
    
    try:
        # Process different file types
        if file_type == '.shp':
            # Handle shapefile
            gdf = gpd.read_file(file_path)
            return jsonify({
                'success': True,
                'filename': filename,
                'type': 'shapefile',
                'features': len(gdf),
                'columns': list(gdf.columns),
                'crs': str(gdf.crs)
            })
        elif file_type == '.gdb':
            # Handle File Geodatabase
            # Note: For GDB, we need the directory, not a specific file
            return jsonify({
                'success': True,
                'filename': filename,
                'type': 'geodatabase',
                'message': 'GDB files need to be extracted and processed separately'
            })
        else:
            return jsonify({
                'success': True,
                'filename': filename,
                'type': 'unknown',
                'message': 'File uploaded but format not recognized for processing'
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/layers', methods=['GET'])
@login_required
def get_layers():
    # This would return a list of available layers
    # For now, we'll return a mock response
    return jsonify({
        'layers': [
            {'id': 1, 'name': 'Sample Layer 1', 'type': 'point'},
            {'id': 2, 'name': 'Sample Layer 2', 'type': 'polygon'}
        ]
    })

@app.route('/api/wmts', methods=['POST'])
@login_required
def add_wmts():
    data = request.json
    if not data or 'url' not in data:
        return jsonify({'error': 'No URL provided'}), 400
    
    # In a real app, we would validate and store the WMTS URL
    return jsonify({
        'success': True,
        'message': 'WMTS layer added',
        'url': data['url']
    })

if __name__ == '__main__':
    # Ensure upload directory exists
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.run(host='0.0.0.0', port=5000, debug=True)
