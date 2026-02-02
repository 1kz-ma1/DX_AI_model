// state.js - 状態管理（localStorage + URLパラメータ）

/**
 * プロファイルをlocalStorageに保存
 * @param {Object} profile - { myna, online, consent_unify, persona }
 */
function saveProfile(profile) {
  localStorage.setItem('dx_profile', JSON.stringify(profile));
}

/**
 * プロファイルをlocalStorageから取得
 * @returns {Object|null}
 */
function loadProfile() {
  const stored = localStorage.getItem('dx_profile');
  return stored ? JSON.parse(stored) : null;
}

/**
 * プロファイルをクリア
 */
function clearProfile() {
  localStorage.removeItem('dx_profile');
}

/**
 * URLパラメータを取得
 * @returns {Object}
 */
function getParams() {
  const params = new URLSearchParams(window.location.search);
  const result = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

/**
 * URLパラメータを設定（リプレース）
 * @param {Object} params
 * @param {boolean} replace - trueの場合はreplaceState、falseの場合はpushState
 */
function setParams(params, replace = true) {
  const url = new URL(window.location);
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined) {
      url.searchParams.set(key, params[key]);
    } else {
      url.searchParams.delete(key);
    }
  });
  
  if (replace) {
    window.history.replaceState({}, '', url);
  } else {
    window.history.pushState({}, '', url);
  }
}

/**
 * プロファイルとURLパラメータをマージ
 * 優先順位: URL > localStorage > デフォルト
 * @returns {Object}
 */
function mergeWithProfile() {
  const defaults = {
    myna: '0',
    online: '0',
    consent_unify: '0',
    persona: 'citizen'
  };
  
  const profile = loadProfile() || {};
  const urlParams = getParams();
  
  // localStorage の値を文字列化
  const profileParams = {};
  Object.keys(defaults).forEach(key => {
    if (profile[key] !== undefined) {
      profileParams[key] = String(profile[key]);
    }
  });
  
  // マージ: defaults < localStorage < URL
  return {
    ...defaults,
    ...profileParams,
    ...urlParams
  };
}

/**
 * 指定URLに遷移（パラメータ引き継ぎ）
 * @param {string} url - 遷移先URL
 * @param {Object} additionalParams - 追加パラメータ
 */
function navigate(url, additionalParams = {}) {
  const merged = mergeWithProfile();
  const params = { ...merged, ...additionalParams };
  
  const urlObj = new URL(url, window.location.origin);
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      urlObj.searchParams.set(key, params[key]);
    }
  });
  
  window.location.href = urlObj.toString();
}
