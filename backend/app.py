#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DX-AIモデル REST API Server
Flask + SQLite3によるRESTful API
"""

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import sqlite3
from pathlib import Path
from functools import wraps
import traceback
from io import BytesIO

app = Flask(__name__, 
            static_folder='../assets',
            static_url_path='/assets')
CORS(app)  # 全てのオリジンからのアクセスを許可（開発用）

# データベースパス
DB_PATH = Path(__file__).parent / 'dx_ai_model.db'

# ===== ユーティリティ関数 =====

def get_db():
    """データベース接続を取得"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # 辞書形式でアクセス可能
    return conn

def handle_errors(f):
    """エラーハンドリングデコレータ"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            print(f"Error in {f.__name__}: {e}")
            traceback.print_exc()
            return jsonify({'error': str(e)}), 500
    return decorated_function

# ===== API エンドポイント =====

@app.route('/favicon.ico', methods=['GET'])
def favicon():
    """Favicon リクエストに対応（404 を避ける）"""
    return '', 204  # No Content で対応

@app.route('/api/health', methods=['GET'])
def health_check():
    """ヘルスチェック"""
    return jsonify({'status': 'ok', 'message': 'DX-AI Model API is running'})

# ----- Domains API -----

@app.route('/api/domains', methods=['GET'])
@handle_errors
def get_domains():
    """全ドメインを取得 - JSONファイルを優先"""
    import json
    from pathlib import Path
    
    # JSONファイルから直接読み込み（最新のデータを常に返す）
    json_path = Path(__file__).parent.parent / 'assets' / 'data' / 'domains.json'
    with open(json_path, 'r', encoding='utf-8') as f:
        json_data = json.load(f)
    
    # メタ情報をマージ（既存の demoMetaInfo は保持、costPerHour のみ追加）
    if 'meta' not in json_data:
        json_data['meta'] = {}
    if 'demoMetaInfo' not in json_data['meta']:
        json_data['meta']['demoMetaInfo'] = {}
    
    # costPerHour を追加（既存値は保持）
    if 'costPerHour' not in json_data['meta']['demoMetaInfo']:
        json_data['meta']['demoMetaInfo']['costPerHour'] = 3000
    
    return jsonify(json_data)

@app.route('/api/domains/<domain_id>', methods=['GET'])
@handle_errors
def get_domain(domain_id):
    """特定のドメインを取得"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM domains WHERE id = ?', (domain_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        return jsonify({'error': 'Domain not found'}), 404
    
    domain = dict(row)
    
    # デモメトリクスと依存関係を取得（get_domains()と同じロジック）
    # ... (省略、必要に応じて実装)
    
    conn.close()
    return jsonify(domain)

@app.route('/api/domains/<domain_id>/documents', methods=['GET'])
@handle_errors
def get_domain_documents(domain_id):
    """特定ドメインの書類一覧を取得"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT d.*, 
               GROUP_CONCAT(
                   json_object(
                       'id', f.field_id,
                       'label', f.label,
                       'source', f.source,
                       'requiredIf', f.required_if
                   ), '||'
               ) as input_fields_json
        FROM documents d
        LEFT JOIN input_fields f ON d.id = f.document_id
        WHERE d.domain_id = ?
        GROUP BY d.id
        ORDER BY d.category, d.name
    ''', (domain_id,))
    
    documents = []
    for row in cursor.fetchall():
        doc = dict(row)
        
        # 入力項目をパース
        if doc['input_fields_json']:
            import json
            fields_str = doc['input_fields_json']
            doc['inputFields'] = [json.loads(f) for f in fields_str.split('||')]
        else:
            doc['inputFields'] = []
        
        del doc['input_fields_json']
        documents.append(doc)
    
    conn.close()
    return jsonify(documents)

# ----- Characters API -----

@app.route('/api/characters', methods=['GET'])
@handle_errors
def get_characters():
    """全ペルソナを取得"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM characters')
    characters = [dict(row) for row in cursor.fetchall()]
    
    for char in characters:
        char_id = char['id']
        
        # 痛み点を取得
        cursor.execute('''
            SELECT pain_point FROM character_pain_points
            WHERE character_id = ?
            ORDER BY point_order
        ''', (char_id,))
        char['pain_points'] = [row['pain_point'] for row in cursor.fetchall()]
        
        # ドメイン関連を取得
        cursor.execute('''
            SELECT cd.domain_id, cd.priority, cd.frequency, cd.documents, cd.fields,
                   GROUP_CONCAT(ct.task, '||') as tasks
            FROM character_domains cd
            LEFT JOIN character_tasks ct ON cd.id = ct.character_domain_id
            WHERE cd.character_id = ?
            GROUP BY cd.id
        ''', (char_id,))
        
        domains = {}
        for row in cursor.fetchall():
            domain_id = row['domain_id']
            domains[domain_id] = {
                'priority': row['priority'],
                'frequency': row['frequency'],
                'documents': row['documents'],
                'fields': row['fields'],
                'tasks': row['tasks'].split('||') if row['tasks'] else []
            }
        
        char['domains'] = domains
    
    conn.close()
    return jsonify({'characters': characters})

@app.route('/api/characters/<character_id>', methods=['GET'])
@handle_errors
def get_character(character_id):
    """特定のペルソナを取得"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM characters WHERE id = ?', (character_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        return jsonify({'error': 'Character not found'}), 404
    
    char = dict(row)
    
    # 痛み点とドメイン関連を取得（get_characters()と同じロジック）
    # ... (省略)
    
    conn.close()
    return jsonify(char)

# ----- Flows API -----

@app.route('/api/flows/questions', methods=['GET'])
@handle_errors
def get_flow_questions():
    """フロー質問を取得"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT * FROM flow_questions
        ORDER BY question_order
    ''')
    
    questions = []
    for row in cursor.fetchall():
        question = dict(row)
        question['required'] = bool(question['required'])
        
        # 選択肢を取得
        cursor.execute('''
            SELECT value, label FROM flow_question_options
            WHERE question_id = ?
            ORDER BY option_order
        ''', (question['id'],))
        
        options = [{'value': r['value'], 'label': r['label']} for r in cursor.fetchall()]
        if options:
            question['options'] = options
        
        questions.append(question)
    
    conn.close()
    return jsonify({'baseQuestions': questions})

# ----- Statistics API -----

@app.route('/api/statistics/summary', methods=['GET'])
@handle_errors
def get_statistics_summary():
    """統計サマリーを取得"""
    conn = get_db()
    cursor = conn.cursor()
    
    # ドメイン数
    cursor.execute('SELECT COUNT(*) as count FROM domains')
    domain_count = cursor.fetchone()['count']
    
    # 書類数
    cursor.execute('SELECT COUNT(*) as count FROM documents')
    document_count = cursor.fetchone()['count']
    
    # 入力項目数
    cursor.execute('SELECT COUNT(*) as count FROM input_fields')
    field_count = cursor.fetchone()['count']
    
    # ペルソナ数
    cursor.execute('SELECT COUNT(*) as count FROM characters')
    character_count = cursor.fetchone()['count']
    
    conn.close()
    
    return jsonify({
        'domains': domain_count,
        'documents': document_count,
        'fields': field_count,
        'characters': character_count
    })

# ===== フロントエンド配信 =====

@app.route('/', methods=['GET'])
def serve_home():
    """home.html を配信"""
    frontend_path = Path(__file__).parent.parent / 'home.html'
    if frontend_path.exists():
        with open(frontend_path, 'r', encoding='utf-8') as f:
            return f.read()
    return jsonify({'error': 'home.html not found'}), 404

@app.route('/<path:filename>', methods=['GET'])
def serve_frontend(filename):
    """フロントエンド HTML ファイルを配信"""
    frontend_path = Path(__file__).parent.parent / filename
    if frontend_path.exists() and frontend_path.suffix == '.html':
        with open(frontend_path, 'r', encoding='utf-8') as f:
            return f.read()
    return jsonify({'error': f'{filename} not found'}), 404

# ===== メイン実行 =====

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 DX-AI Model REST API Server")
    print("=" * 60)
    print(f"📦 Database: {DB_PATH}")
    print(f"🌐 Server: http://localhost:5000")
    print(f"📚 API Docs: http://localhost:5000/api/health")
    print("=" * 60)
    
    app.run(debug=True, host='0.0.0.0', port=5000)
