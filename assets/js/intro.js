// intro.js - プリフロー（導入 & 基本情報入力）

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('profileForm');
  const skipLink = document.getElementById('skipLink');
  
  // 既存プロファイルがあればスキップリンクを表示
  const existingProfile = loadProfile();
  if (existingProfile) {
    skipLink.style.display = 'block';
    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('home.html');
    });
  }
  
  // フォーム送信
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const profile = {
      myna: document.getElementById('myna').checked ? 1 : 0,
      online: document.getElementById('online').checked ? 1 : 0,
      consent_unify: document.getElementById('consent_unify').checked ? 1 : 0,
      persona: document.getElementById('persona').value
    };
    
    // 保存
    saveProfile(profile);
    
    // ハブページへ遷移
    navigate('home.html');
  });
});
