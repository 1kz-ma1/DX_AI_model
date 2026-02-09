-- DX-AIモデル データベーススキーマ
-- SQLite3用のスキーマ定義

-- 1. DX分野マスタテーブル
CREATE TABLE IF NOT EXISTS domains (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT,
    intro TEXT,
    description TEXT,
    annual_maintenance_cost_smart INTEGER,
    annual_maintenance_cost_ai INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. デモモード統計テーブル
CREATE TABLE IF NOT EXISTS demo_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    daily_documents INTEGER,
    reduction_rate REAL,
    time_reduction_rate REAL,
    cost_reduction_percentage REAL,
    implementation_cost INTEGER,
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
    UNIQUE(domain_id, mode)
);

CREATE INDEX idx_demo_metrics_domain ON demo_metrics(domain_id);

-- 3. 書類テンプレートテーブル
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    domain_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);

CREATE INDEX idx_documents_domain ON documents(domain_id);
CREATE INDEX idx_documents_category ON documents(category);

-- 4. 入力項目テーブル
CREATE TABLE IF NOT EXISTS input_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id TEXT NOT NULL,
    field_id TEXT NOT NULL,
    label TEXT NOT NULL,
    source TEXT NOT NULL,
    required_if TEXT,
    field_order INTEGER DEFAULT 0,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_input_fields_document ON input_fields(document_id);

-- 5. ペルソナテーブル
CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT,
    role TEXT,
    age INTEGER,
    description TEXT,
    situation TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. ペルソナの痛み点テーブル
CREATE TABLE IF NOT EXISTS character_pain_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    pain_point TEXT NOT NULL,
    point_order INTEGER DEFAULT 0,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX idx_pain_points_character ON character_pain_points(character_id);

-- 7. ペルソナとDX分野の関連テーブル
CREATE TABLE IF NOT EXISTS character_domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id TEXT NOT NULL,
    domain_id TEXT NOT NULL,
    priority TEXT,
    frequency TEXT,
    documents INTEGER,
    fields INTEGER,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
    UNIQUE(character_id, domain_id)
);

CREATE INDEX idx_character_domains_character ON character_domains(character_id);
CREATE INDEX idx_character_domains_domain ON character_domains(domain_id);

-- 8. ペルソナのタスクテーブル
CREATE TABLE IF NOT EXISTS character_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_domain_id INTEGER NOT NULL,
    task TEXT NOT NULL,
    task_order INTEGER DEFAULT 0,
    FOREIGN KEY (character_domain_id) REFERENCES character_domains(id) ON DELETE CASCADE
);

CREATE INDEX idx_tasks_character_domain ON character_tasks(character_domain_id);

-- 9. 依存関係テーブル
CREATE TABLE IF NOT EXISTS domain_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_domain_id TEXT NOT NULL,
    target_domain_id TEXT NOT NULL,
    dependency_rate REAL NOT NULL CHECK(dependency_rate >= 0 AND dependency_rate <= 1),
    description TEXT,
    FOREIGN KEY (source_domain_id) REFERENCES domains(id) ON DELETE CASCADE,
    FOREIGN KEY (target_domain_id) REFERENCES domains(id) ON DELETE CASCADE,
    UNIQUE(source_domain_id, target_domain_id)
);

CREATE INDEX idx_dependencies_source ON domain_dependencies(source_domain_id);
CREATE INDEX idx_dependencies_target ON domain_dependencies(target_domain_id);

-- 10. フロー定義テーブル（入院手続きフロー用）
CREATE TABLE IF NOT EXISTS flow_questions (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    type TEXT NOT NULL,
    required INTEGER DEFAULT 0,
    placeholder TEXT,
    question_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. フロー質問の選択肢テーブル
CREATE TABLE IF NOT EXISTS flow_question_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id TEXT NOT NULL,
    value TEXT NOT NULL,
    label TEXT NOT NULL,
    option_order INTEGER DEFAULT 0,
    FOREIGN KEY (question_id) REFERENCES flow_questions(id) ON DELETE CASCADE
);

CREATE INDEX idx_options_question ON flow_question_options(question_id);

-- 更新日時を自動更新するトリガー
CREATE TRIGGER IF NOT EXISTS update_domains_timestamp 
AFTER UPDATE ON domains
BEGIN
    UPDATE domains SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
