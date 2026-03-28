/**
 * i18n.js - 경량 런타임 다국어 지원 엔진
 * 빌드 도구 없이 동작하는 순수 JS i18n 시스템
 */

const I18n = (() => {
  let currentLang = 'ko';
  let translations = {};
  let ready = false;
  const readyCallbacks = [];

  // ─── 언어 감지 ────────────────────────────────────────────
  function detectLang() {
    // 1. URL 쿼리 파라미터
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang && (urlLang === 'ko' || urlLang === 'en')) return urlLang;

    // 2. localStorage
    const saved = localStorage.getItem('lotto_lang');
    if (saved && (saved === 'ko' || saved === 'en')) return saved;

    // 3. 브라우저 언어
    const browserLang = (navigator.language || navigator.userLanguage || 'ko').toLowerCase();
    if (browserLang.startsWith('en')) return 'en';

    // 4. 기본값
    return 'ko';
  }

  // ─── 번역 파일 로드 ───────────────────────────────────────
  async function loadTranslations(lang) {
    try {
      const res = await fetch(`lang/${lang}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn(`[i18n] Failed to load lang/${lang}.json:`, e.message);
      return {};
    }
  }

  // ─── 초기화 ───────────────────────────────────────────────
  async function init() {
    currentLang = detectLang();
    translations = await loadTranslations(currentLang);
    localStorage.setItem('lotto_lang', currentLang);
    document.documentElement.lang = currentLang;
    ready = true;
    translateDOM();
    readyCallbacks.forEach(cb => cb());
    readyCallbacks.length = 0;
  }

  // ─── 번역 함수 ────────────────────────────────────────────
  function t(key, params) {
    let text = translations[key];
    if (text === undefined) return key; // fallback: 키 그대로 반환

    if (params) {
      Object.keys(params).forEach(k => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
      });
    }
    return text;
  }

  // ─── DOM 자동 번역 ────────────────────────────────────────
  function translateDOM() {
    if (!ready) return;

    // data-i18n: textContent 교체
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translated = translations[key];
      if (translated !== undefined) {
        el.textContent = translated;
      }
    });

    // data-i18n-html: innerHTML 교체
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const translated = translations[key];
      if (translated !== undefined) {
        el.innerHTML = translated;
      }
    });

    // data-i18n-placeholder: placeholder 속성 교체
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const translated = translations[key];
      if (translated !== undefined) {
        el.placeholder = translated;
      }
    });

    // data-i18n-title: title 속성 교체
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const translated = translations[key];
      if (translated !== undefined) {
        el.title = translated;
      }
    });
  }

  // ─── 언어 전환 ────────────────────────────────────────────
  async function switchLang(lang) {
    if (lang === currentLang) return;
    currentLang = lang;
    translations = await loadTranslations(lang);
    localStorage.setItem('lotto_lang', lang);
    document.documentElement.lang = lang;
    translateDOM();
  }

  // ─── Public API ───────────────────────────────────────────
  function getLang() { return currentLang; }

  function onReady(callback) {
    if (ready) callback();
    else readyCallbacks.push(callback);
  }

  return { init, t, switchLang, getLang, translateDOM, onReady };
})();
