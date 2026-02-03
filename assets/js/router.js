/**
 * router.js - Flow Router
 * エントリーポイント判定・プロファイルチェック・ナビゲーション補助
 */

/**
 * アプリのエントリーポイント
 * 初回訪問時はintro.html、プロファイルがあればhome.htmlへ
 */
function initRouter() {
  const currentPath = window.location.pathname;
  const filename = currentPath.substring(currentPath.lastIndexOf('/') + 1);
  
  // すでにintro.html、home.html、domain.htmlにいる場合はそのまま
  if (filename === 'intro.html' || filename === 'home.html' || filename === 'domain.html') {
    return;
  }
  
  // プロファイルの存在確認
  const profile = loadProfile();
  
  if (!profile || Object.keys(profile).length === 0) {
    // プロファイルなし → intro.htmlへ
    navigate('intro.html');
  } else {
    // プロファイルあり → home.htmlへ
    navigate('home.html');
  }
}

/**
 * プロファイルリセット
 * 再度intro.htmlから開始
 */
function resetProfile() {
  clearProfile();
  navigate('intro.html');
}

/**
 * ドメイン体験ページへ
 * @param {string} domainId - 分野ID
 * @param {string} mode - 初期モード（plain/smart/ai）
 */
function navigateToDomain(domainId, mode = 'plain') {
  navigate('domain.html', { d: domainId, mode });
}

/**
 * 分野一覧ページへ戻る
 */
function navigateToHub() {
  navigate('home.html');
}

/**
 * ブラウザ戻るボタン対応
 */
window.addEventListener('popstate', (event) => {
  // 状態が変化した場合は再読み込み
  if (event.state) {
    window.location.reload();
  }
});

// 自動初期化（index.htmlなど旧ページから来た場合）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRouter);
} else {
  initRouter();
}
