/**
 * Typing Animation Module
 * AI版の疑似typing効果を実装
 */

class TypingAnimation {
  constructor(element, speed = 50) {
    this.element = element;
    this.speed = speed;
    this.isRunning = false;
    this.currentIndex = 0;
    this.text = '';
  }

  /**
   * テキストをtyping風にアニメーション表示
   * @param {string} text - 表示するテキスト
   * @param {function} onComplete - 完了時のコールバック
   */
  async type(text, onComplete = null) {
    return new Promise((resolve) => {
      this.text = text;
      this.currentIndex = 0;
      this.isRunning = true;
      this.element.textContent = '';

      const typeNextCharacter = () => {
        if (this.currentIndex < this.text.length && this.isRunning) {
          this.element.textContent += this.text[this.currentIndex];
          this.currentIndex++;
          setTimeout(typeNextCharacter, this.speed);
        } else if (this.currentIndex >= this.text.length) {
          this.isRunning = false;
          if (onComplete) {
            onComplete();
          }
          resolve();
        }
      };

      typeNextCharacter();
    });
  }

  /**
   * typing中に改行を含む複数行のテキストをアニメーション
   * @param {string} text - 表示するテキスト（改行含む）
   * @param {function} onComplete - 完了時のコールバック
   */
  async typeMultiline(text, onComplete = null) {
    return this.type(text, onComplete);
  }

  /**
   * アニメーションを停止
   */
  stop() {
    this.isRunning = false;
  }

  /**
   * アニメーションをリセット
   */
  reset() {
    this.stop();
    this.element.textContent = '';
    this.currentIndex = 0;
  }

  /**
   * テキストを即座に表示（アニメーションなし）
   * @param {string} text - 表示するテキスト
   */
  setImmediate(text) {
    this.stop();
    this.element.textContent = text;
  }
}

/**
 * フェードアウトアニメーション
 * @param {HTMLElement} element - 対象要素
 * @param {number} duration - 継続時間（ミリ秒）
 */
function fadeOut(element, duration = 300) {
  return new Promise((resolve) => {
    element.style.opacity = '1';
    element.style.transition = `opacity ${duration}ms ease-out`;
    
    setTimeout(() => {
      element.style.opacity = '0';
    }, 10);

    setTimeout(() => {
      element.style.display = 'none';
      element.style.opacity = '1';
      element.style.transition = 'none';
      resolve();
    }, duration);
  });
}

/**
 * フェードインアニメーション
 * @param {HTMLElement} element - 対象要素
 * @param {number} duration - 継続時間（ミリ秒）
 */
function fadeIn(element, duration = 300) {
  return new Promise((resolve) => {
    element.style.display = 'block';
    element.style.opacity = '0';
    element.style.transition = 'none';

    setTimeout(() => {
      element.style.transition = `opacity ${duration}ms ease-in`;
      element.style.opacity = '1';
    }, 10);

    setTimeout(() => {
      element.style.transition = 'none';
      resolve();
    }, duration);
  });
}

/**
 * スライドインアニメーション（左から）
 * @param {HTMLElement} element - 対象要素
 * @param {number} duration - 継続時間（ミリ秒）
 */
function slideInLeft(element, duration = 300) {
  return new Promise((resolve) => {
    element.style.opacity = '0';
    element.style.transform = 'translateX(-20px)';
    element.style.transition = 'none';

    setTimeout(() => {
      element.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`;
      element.style.opacity = '1';
      element.style.transform = 'translateX(0)';
    }, 10);

    setTimeout(() => {
      element.style.transition = 'none';
      resolve();
    }, duration);
  });
}

/**
 * 複数要素を順番にフェードイン
 * @param {HTMLElement[]} elements - 対象要素の配列
 * @param {number} delay - 各要素間の遅延（ミリ秒）
 */
async function fadeInSequence(elements, delay = 100) {
  for (const element of elements) {
    await fadeIn(element, 200);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

/**
 * 不要な書類をフェードアウト（アニメーション付き）
 * @param {HTMLElement} container - コンテナ要素
 * @param {string[]} idsToKeep - 保持するID配列
 */
async function fadeOutUnnecessaryDocs(container, idsToKeep = []) {
  const items = container.querySelectorAll('.document-item');
  const promises = [];

  items.forEach(item => {
    const docId = item.dataset.docId;
    if (!idsToKeep.includes(docId)) {
      item.classList.add('fade-out');
      promises.push(
        new Promise(resolve => {
          setTimeout(() => {
            item.style.display = 'none';
            resolve();
          }, 400);
        })
      );
    }
  });

  await Promise.all(promises);
}

// モジュールのエクスポート（グローバル）
window.TypingAnimation = TypingAnimation;
window.fadeOut = fadeOut;
window.fadeIn = fadeIn;
window.slideInLeft = slideInLeft;
window.fadeInSequence = fadeInSequence;
window.fadeOutUnnecessaryDocs = fadeOutUnnecessaryDocs;
