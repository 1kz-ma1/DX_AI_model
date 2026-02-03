// intro.js - プリフロー（導入 & 基本情報入力）

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('profileForm');
  
  // フォーム送信 → 戦略ボードへ
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
    
    // 戦略ボードへ遷移
    navigate('strategy.html');
  });
});
