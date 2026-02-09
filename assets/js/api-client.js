/**
 * API クライアント
 * REST API経由でデータを取得（フォールバック付き）
 */

const API_BASE_URL = 'http://localhost:5000/api';
const USE_API = true; // false にするとJSONファイルから読み込み

class ApiClient {
  /**
   * APIリクエストを実行（フォールバック付き）
   */
  static async request(endpoint, options = {}) {
    if (!USE_API) {
      // APIを使わない場合はJSONファイルから読み込み
      return this.fallbackToJSON(endpoint);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.warn(`API failed for ${endpoint}, falling back to JSON files:`, error);
      return this.fallbackToJSON(endpoint);
    }
  }

  /**
   * JSONファイルからのフォールバック読み込み
   */
  static async fallbackToJSON(endpoint) {
    let jsonPath = '';
    
    if (endpoint === '/domains' || endpoint.startsWith('/domains')) {
      jsonPath = 'assets/data/domains.json';
    } else if (endpoint === '/characters' || endpoint.startsWith('/characters')) {
      jsonPath = 'assets/data/characters.json';
    } else if (endpoint.includes('/flows')) {
      jsonPath = 'assets/data/flows.json';
    } else {
      throw new Error(`No fallback available for ${endpoint}`);
    }

    const response = await fetch(jsonPath);
    if (!response.ok) {
      throw new Error(`Failed to load ${jsonPath}`);
    }
    return await response.json();
  }

  /**
   * ヘルスチェック
   */
  static async healthCheck() {
    return this.request('/health');
  }

  /**
   * 全ドメインを取得
   */
  static async getDomains() {
    return this.request('/domains');
  }

  /**
   * 特定ドメインを取得
   */
  static async getDomain(domainId) {
    return this.request(`/domains/${domainId}`);
  }

  /**
   * ドメインの書類一覧を取得
   */
  static async getDomainDocuments(domainId) {
    return this.request(`/domains/${domainId}/documents`);
  }

  /**
   * 全ペルソナを取得
   */
  static async getCharacters() {
    return this.request('/characters');
  }

  /**
   * 特定ペルソナを取得
   */
  static async getCharacter(characterId) {
    return this.request(`/characters/${characterId}`);
  }

  /**
   * フロー質問を取得
   */
  static async getFlowQuestions() {
    return this.request('/flows/questions');
  }

  /**
   * 統計サマリーを取得
   */
  static async getStatisticsSummary() {
    return this.request('/statistics/summary');
  }
}

// グローバルに公開
window.ApiClient = ApiClient;
