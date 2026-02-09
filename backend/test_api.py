#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API動作確認スクリプト
"""

import requests
import json

BASE_URL = 'http://localhost:5000/api'

def test_api():
    """APIエンドポイントをテスト"""
    print("=" * 60)
    print("🧪 DX-AI Model API テスト")
    print("=" * 60)
    
    tests = [
        {
            'name': 'ヘルスチェック',
            'url': f'{BASE_URL}/health',
            'expected_keys': ['status', 'message']
        },
        {
            'name': 'ドメイン一覧',
            'url': f'{BASE_URL}/domains',
            'expected_keys': ['meta', 'domains']
        },
        {
            'name': 'ペルソナ一覧',
            'url': f'{BASE_URL}/characters',
            'expected_keys': ['characters']
        },
        {
            'name': 'フロー質問',
            'url': f'{BASE_URL}/flows/questions',
            'expected_keys': ['baseQuestions']
        },
        {
            'name': '統計サマリー',
            'url': f'{BASE_URL}/statistics/summary',
            'expected_keys': ['domains', 'documents', 'fields', 'characters']
        }
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        print(f"\n📋 テスト: {test['name']}")
        print(f"   URL: {test['url']}")
        
        try:
            response = requests.get(test['url'], timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                
                # 期待するキーが存在するか確認
                missing_keys = [k for k in test['expected_keys'] if k not in data]
                
                if not missing_keys:
                    print(f"   ✅ 成功 - ステータス: {response.status_code}")
                    
                    # データ件数を表示
                    if 'domains' in data:
                        if isinstance(data['domains'], list):
                            print(f"   📊 ドメイン数: {len(data['domains'])}")
                    if 'characters' in data:
                        if isinstance(data['characters'], list):
                            print(f"   📊 ペルソナ数: {len(data['characters'])}")
                    if 'baseQuestions' in data:
                        print(f"   📊 質問数: {len(data['baseQuestions'])}")
                    
                    passed += 1
                else:
                    print(f"   ❌ 失敗 - 必須キーが不足: {missing_keys}")
                    failed += 1
            else:
                print(f"   ❌ 失敗 - ステータス: {response.status_code}")
                failed += 1
                
        except requests.ConnectionError:
            print(f"   ❌ 失敗 - サーバーに接続できません")
            print(f"   💡 'python backend/app.py' でサーバーを起動してください")
            failed += 1
        except Exception as e:
            print(f"   ❌ 失敗 - エラー: {e}")
            failed += 1
    
    # サマリー
    print("\n" + "=" * 60)
    print(f"📊 テスト結果")
    print("=" * 60)
    print(f"✅ 成功: {passed}/{len(tests)}")
    print(f"❌ 失敗: {failed}/{len(tests)}")
    
    if failed == 0:
        print("\n🎉 すべてのテストに合格しました！")
    else:
        print(f"\n⚠️  {failed}件のテストが失敗しました")
    
    print("=" * 60)

if __name__ == '__main__':
    test_api()
