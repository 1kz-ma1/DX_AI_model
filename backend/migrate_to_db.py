#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JSONデータをSQLiteデータベースにマイグレーションするスクリプト

Usage:
    python migrate_to_db.py
"""

import json
import sqlite3
import os
from pathlib import Path

# パス設定
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / 'assets' / 'data'
BACKEND_DIR = BASE_DIR / 'backend'
DB_PATH = BACKEND_DIR / 'dx_ai_model.db'
SCHEMA_PATH = BACKEND_DIR / 'schema.sql'

def create_database():
    """データベースを作成し、スキーマを適用"""
    print(f"📦 データベースを作成中: {DB_PATH}")
    
    # 既存のDBファイルを削除
    if DB_PATH.exists():
        DB_PATH.unlink()
        print("  ✓ 既存のデータベースを削除しました")
    
    # スキーマを読み込んで実行
    conn = sqlite3.connect(DB_PATH)
    with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
        schema_sql = f.read()
    
    conn.executescript(schema_sql)
    conn.commit()
    print("  ✓ スキーマを適用しました")
    
    return conn

def migrate_domains(conn, domains_data):
    """domains.jsonからドメインデータを移行"""
    print("\n🏛️  ドメインデータを移行中...")
    cursor = conn.cursor()
    
    domains = domains_data.get('domains', [])
    
    for domain in domains:
        # 基本情報を挿入
        cursor.execute('''
            INSERT INTO domains (id, name, emoji, intro, description, 
                                annual_maintenance_cost_smart, annual_maintenance_cost_ai)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            domain['id'],
            domain['name'],
            domain.get('emoji', ''),
            domain.get('intro', ''),
            domain.get('description', ''),
            domain.get('annualMaintenanceCost', {}).get('smart', 0),
            domain.get('annualMaintenanceCost', {}).get('ai', 0)
        ))
        
        # デモメトリクスを挿入
        demo_metrics = domain.get('demoMetrics', {})
        for mode in ['plain', 'smart', 'ai']:
            cursor.execute('''
                INSERT INTO demo_metrics (domain_id, mode, daily_documents, 
                                         reduction_rate, time_reduction_rate, 
                                         cost_reduction_percentage, implementation_cost)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                domain['id'],
                mode,
                demo_metrics.get('dailyDocuments', {}).get(mode, 0),
                demo_metrics.get('reductionRates', {}).get(mode, 0.0),
                demo_metrics.get('timeReductionRates', {}).get(mode, 0.0),
                demo_metrics.get('costReductionPercentage', {}).get(mode, 0.0),
                demo_metrics.get('implementationCost', {}).get(mode, 0)
            ))
        
        # 書類テンプレートを挿入
        documents_dict = domain.get('documents', {})
        for category, docs in documents_dict.items():
            for doc in docs:
                cursor.execute('''
                    INSERT INTO documents (id, domain_id, name, description, category)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    doc['id'],
                    domain['id'],
                    doc['name'],
                    doc.get('description', ''),
                    category
                ))
                
                # 入力項目を挿入
                for order, field in enumerate(doc.get('inputFields', [])):
                    cursor.execute('''
                        INSERT INTO input_fields (document_id, field_id, label, source, 
                                                 required_if, field_order)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (
                        doc['id'],
                        field['id'],
                        field['label'],
                        field['source'],
                        field.get('requiredIf'),
                        order
                    ))
        
        # 依存関係を挿入
        dependencies = domain.get('dependencies', {})
        for target_id, rate in dependencies.items():
            cursor.execute('''
                INSERT INTO domain_dependencies (source_domain_id, target_domain_id, 
                                                dependency_rate, description)
                VALUES (?, ?, ?, ?)
            ''', (
                domain['id'],
                target_id,
                rate,
                f"{domain['name']}が{target_id}に依存"
            ))
    
    conn.commit()
    print(f"  ✓ {len(domains)}個のドメインを移行しました")

def migrate_characters(conn, characters_data):
    """characters.jsonからペルソナデータを移行"""
    print("\n👥 ペルソナデータを移行中...")
    cursor = conn.cursor()
    
    characters = characters_data.get('characters', [])
    
    for char in characters:
        # 基本情報を挿入
        cursor.execute('''
            INSERT INTO characters (id, name, emoji, role, age, description, situation)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            char['id'],
            char['name'],
            char.get('emoji', ''),
            char.get('role', ''),
            char.get('age', 0),
            char.get('description', ''),
            char.get('situation', '')
        ))
        
        # 痛み点を挿入
        for order, pain in enumerate(char.get('pain_points', [])):
            cursor.execute('''
                INSERT INTO character_pain_points (character_id, pain_point, point_order)
                VALUES (?, ?, ?)
            ''', (char['id'], pain, order))
        
        # ドメインとの関連を挿入
        domains_dict = char.get('domains', {})
        for domain_id, domain_info in domains_dict.items():
            cursor.execute('''
                INSERT INTO character_domains (character_id, domain_id, priority, 
                                              frequency, documents, fields)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                char['id'],
                domain_id,
                domain_info.get('priority', ''),
                domain_info.get('frequency', ''),
                domain_info.get('documents', 0),
                domain_info.get('fields', 0)
            ))
            
            # タスクを挿入
            char_domain_id = cursor.lastrowid
            for order, task in enumerate(domain_info.get('tasks', [])):
                cursor.execute('''
                    INSERT INTO character_tasks (character_domain_id, task, task_order)
                    VALUES (?, ?, ?)
                ''', (char_domain_id, task, order))
    
    conn.commit()
    print(f"  ✓ {len(characters)}人のペルソナを移行しました")

def migrate_flows(conn, flows_data):
    """flows.jsonからフローデータを移行"""
    print("\n📋 フローデータを移行中...")
    cursor = conn.cursor()
    
    questions = flows_data.get('baseQuestions', [])
    
    for order, question in enumerate(questions):
        cursor.execute('''
            INSERT INTO flow_questions (id, label, type, required, placeholder, question_order)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            question['id'],
            question['label'],
            question['type'],
            1 if question.get('required', False) else 0,
            question.get('placeholder', ''),
            order
        ))
        
        # 選択肢を挿入
        for opt_order, option in enumerate(question.get('options', [])):
            cursor.execute('''
                INSERT INTO flow_question_options (question_id, value, label, option_order)
                VALUES (?, ?, ?, ?)
            ''', (
                question['id'],
                option['value'],
                option['label'],
                opt_order
            ))
    
    conn.commit()
    print(f"  ✓ {len(questions)}個の質問を移行しました")

def verify_migration(conn):
    """マイグレーション結果を検証"""
    print("\n🔍 マイグレーション結果を検証中...")
    cursor = conn.cursor()
    
    tables = [
        ('domains', 'ドメイン'),
        ('demo_metrics', 'デモメトリクス'),
        ('documents', '書類'),
        ('input_fields', '入力項目'),
        ('characters', 'ペルソナ'),
        ('character_domains', 'ペルソナ-ドメイン関連'),
        ('flow_questions', 'フロー質問')
    ]
    
    for table_name, display_name in tables:
        cursor.execute(f'SELECT COUNT(*) FROM {table_name}')
        count = cursor.fetchone()[0]
        print(f"  ✓ {display_name}: {count}件")

def main():
    """メイン処理"""
    print("=" * 60)
    print("🚀 DX-AIモデル データベースマイグレーション")
    print("=" * 60)
    
    # JSONファイルを読み込み
    print("\n📂 JSONファイルを読み込み中...")
    with open(DATA_DIR / 'domains.json', 'r', encoding='utf-8') as f:
        domains_data = json.load(f)
    print("  ✓ domains.json")
    
    with open(DATA_DIR / 'characters.json', 'r', encoding='utf-8') as f:
        characters_data = json.load(f)
    print("  ✓ characters.json")
    
    with open(DATA_DIR / 'flows.json', 'r', encoding='utf-8') as f:
        flows_data = json.load(f)
    print("  ✓ flows.json")
    
    # データベースを作成
    conn = create_database()
    
    try:
        # データを移行
        migrate_domains(conn, domains_data)
        migrate_characters(conn, characters_data)
        migrate_flows(conn, flows_data)
        
        # 検証
        verify_migration(conn)
        
        print("\n" + "=" * 60)
        print("✅ マイグレーション完了！")
        print(f"📦 データベース: {DB_PATH}")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ エラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == '__main__':
    main()
