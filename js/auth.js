/**
 * auth.js - Firebase Auth + Firestore 클라우드 동기화
 * 평소 localStorage 사용, 결제 시 로그인 필수 → Firestore에 데이터 보존
 */

const AuthSystem = (() => {
  // ⚠️ Firebase 콘솔에서 프로젝트 생성 후 여기에 실제 값을 넣으세요
  const FIREBASE_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
  };

  let currentUser = null;
  let db = null;
  let initialized = false;
  let onLoginCallback = null; // 로그인 후 실행할 콜백 (결제 흐름 등)

  // ─── 초기화 ───────────────────────────────────────────
  function init() {
    if (typeof firebase === 'undefined') {
      console.warn('[Auth] Firebase SDK not loaded');
      return;
    }
    if (FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') {
      console.warn('[Auth] Firebase config not set — auth disabled');
      return;
    }

    try {
      firebase.initializeApp(FIREBASE_CONFIG);
      db = firebase.firestore();
      initialized = true;

      firebase.auth().onAuthStateChanged(async (user) => {
        currentUser = user;
        updateLoginUI();
        if (user) {
          await onLoginSuccess(user);
        }
      });
    } catch (e) {
      console.error('[Auth] Init failed:', e);
    }
  }

  // ─── Google 로그인 ────────────────────────────────────
  async function loginWithGoogle() {
    if (!initialized) {
      showToast('로그인 서비스 준비 중입니다');
      return null;
    }
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await firebase.auth().signInWithPopup(provider);
      return result.user;
    } catch (e) {
      if (e.code === 'auth/popup-closed-by-user') return null;
      console.error('[Auth] Google login error:', e);
      showToast('로그인에 실패했어요. 다시 시도해주세요.');
      return null;
    }
  }

  // ─── 로그아웃 ─────────────────────────────────────────
  async function logout() {
    if (!initialized) return;
    await firebase.auth().signOut();
    currentUser = null;
    updateLoginUI();
    showToast('로그아웃 되었어요');
  }

  // ─── 상태 확인 ────────────────────────────────────────
  function isLoggedIn() {
    return !!currentUser;
  }

  function isAvailable() {
    return initialized;
  }

  function getUser() {
    return currentUser;
  }

  function getUserDisplayName() {
    if (!currentUser) return null;
    return currentUser.displayName || currentUser.email?.split('@')[0] || '사용자';
  }

  // ─── 로그인 성공 시 처리 ──────────────────────────────
  async function onLoginSuccess(user) {
    if (!db) return;

    try {
      const docRef = db.collection('users').doc(user.uid);
      const doc = await docRef.get();

      if (!doc.exists) {
        // 첫 로그인: localStorage → Firestore 마이그레이션
        const localState = GameSystem.getState();
        await docRef.set({
          gameData: localState,
          email: user.email || null,
          displayName: user.displayName || null,
          provider: user.providerData[0]?.providerId || 'unknown',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // 기존 유저: Firestore → localStorage 동기화 (클라우드 우선)
        const cloudData = doc.data();
        if (cloudData.gameData) {
          // 클라우드 잔액이 더 많으면 클라우드 데이터 사용
          const localState = GameSystem.getState();
          if (cloudData.gameData.balance >= localState.balance) {
            GameSystem.loadFromCloud(cloudData.gameData);
          } else {
            // 로컬이 더 많으면 로컬 유지 + 클라우드 업데이트
            await syncToCloud();
          }
        }
      }

      renderCloverBalance();
      renderLevelBar();

      // 대기 중인 콜백 실행 (결제 흐름 등)
      if (onLoginCallback) {
        const cb = onLoginCallback;
        onLoginCallback = null;
        cb();
      }
    } catch (e) {
      console.error('[Auth] Sync error:', e);
    }
  }

  // ─── Firestore 동기화 ─────────────────────────────────
  async function syncToCloud() {
    if (!currentUser || !db) return;
    try {
      const gameData = GameSystem.getState();
      await db.collection('users').doc(currentUser.uid).set({
        gameData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error('[Auth] Cloud sync failed:', e);
    }
  }

  // ─── 로그인 필수 게이트 ───────────────────────────────
  // callback: 로그인 성공 후 실행할 함수
  function requireLogin(callback) {
    if (!initialized) {
      // Firebase 미설정 시 그냥 통과
      if (callback) callback();
      return;
    }

    if (currentUser) {
      // 이미 로그인됨
      if (callback) callback();
      return;
    }

    // 로그인 모달 표시
    onLoginCallback = callback;
    showLoginModal();
  }

  // ─── 로그인 모달 표시 ─────────────────────────────────
  function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'flex';
  }

  function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.style.display = 'none';
    onLoginCallback = null;
  }

  // ─── 헤더 UI 업데이트 ─────────────────────────────────
  function updateLoginUI() {
    const loginBtn = document.getElementById('loginBtn');
    const loginUserName = document.getElementById('loginUserName');
    if (!loginBtn) return;

    if (currentUser) {
      loginBtn.textContent = '👤';
      loginBtn.title = getUserDisplayName() + ' (로그아웃)';
      loginBtn.onclick = () => {
        if (confirm('로그아웃 하시겠어요?')) logout();
      };
      if (loginUserName) {
        loginUserName.textContent = getUserDisplayName();
        loginUserName.style.display = 'inline';
      }
    } else {
      loginBtn.textContent = '👤';
      loginBtn.title = '로그인';
      loginBtn.onclick = showLoginModal;
      if (loginUserName) {
        loginUserName.style.display = 'none';
      }
    }
  }

  // ─── Public API ───────────────────────────────────────
  return {
    init,
    loginWithGoogle,
    logout,
    isLoggedIn,
    isAvailable,
    getUser,
    getUserDisplayName,
    syncToCloud,
    requireLogin,
    hideLoginModal,
    showLoginModal
  };
})();
