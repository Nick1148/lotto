/**
 * gamification.js - 클로버(🍀) 포인트 시스템, 출석, 스트릭, 업적, 레벨
 * localStorage 기반 클라이언트 전용 게이미피케이션 엔진
 */

const GameSystem = (() => {
  const STORAGE_KEY = 'lotto_game';
  const TODAY = () => new Date().toISOString().slice(0, 10);

  // ─── 기본 상태 ──────────────────────────────────────────
  const DEFAULT_STATE = {
    balance: 5,
    xp: 0,
    lastCheckIn: null,
    streak: 0,
    longestStreak: 0,
    totalEarned: 5,
    totalSpent: 0,
    shareCountToday: { kakao: 0, image: 0, copy: 0, native: 0 },
    shareCountDate: null,
    totalShares: 0,
    generatedToday: false,
    generatedDate: null,
    generatedTodayCount: 0,
    totalGenerated: 0,
    triedMethods: [],
    lockedNumbers: [],
    historyExpanded: false,
    achievements: {},
    dailyMission: null,
    dailyMissionDate: null,
    dailyMissionDone: false,
    firstVisit: true,
    freePremiumUsed: { sajuDetail: false, chemDetail: false, nameDetail: false },
    lastCloverClaim: null,
    lastCloverTier: null
  };

  let state = null;

  // ─── 레벨 정의 ──────────────────────────────────────────
  const LEVELS = [
    { name: '행운 새싹', minXp: 0, emoji: '🌱' },
    { name: '행운 탐험가', minXp: 50, emoji: '🧭' },
    { name: '행운 수집가', minXp: 150, emoji: '📦' },
    { name: '행운 전문가', minXp: 300, emoji: '⭐' },
    { name: '행운 마스터', minXp: 500, emoji: '👑' },
    { name: '행운 대왕', minXp: 800, emoji: '💎' },
    { name: '전설의 클로버', minXp: 1200, emoji: '🍀' }
  ];

  // ─── 업적 정의 ──────────────────────────────────────────
  const ACHIEVEMENTS = {
    first_gen: { name: '첫 번호!', desc: '첫 번째 번호를 생성했어요', reward: 1, icon: '🎱' },
    explorer: { name: '탐험가', desc: '7가지 방법 모두 체험', reward: 5, icon: '🧭' },
    chem_master: { name: '궁합 마스터', desc: '궁합을 5번 확인했어요', reward: 3, icon: '💕' },
    share_king: { name: '공유왕', desc: '총 10번 공유했어요', reward: 5, icon: '📢' },
    streak_7: { name: '일주일 연속', desc: '7일 연속 출석!', reward: 5, icon: '🔥' },
    streak_30: { name: '한 달 연속', desc: '30일 연속 출석!!', reward: 15, icon: '🏆' },
    gen_100: { name: '100번째 생성', desc: '번호를 100번 생성했어요', reward: 10, icon: '💯' },
    lock_5: { name: '행운 수집가', desc: '5세트 번호를 잠금했어요', reward: 3, icon: '🔒' },
    mbti_all: { name: 'MBTI 박사', desc: '16가지 MBTI 모두 확인', reward: 10, icon: '🧠' },
    gen_10: { name: '열정맨', desc: '번호를 10번 생성했어요', reward: 3, icon: '🔥' }
  };

  // ─── 오늘의 미션 풀 ─────────────────────────────────────
  const MISSIONS = [
    { id: 'try_saju', text: '오늘은 사주로 번호를 뽑아보세요!', method: 'saju' },
    { id: 'try_name', text: '이름으로 행운 번호를 뽑아보세요!', method: 'name' },
    { id: 'try_mbti', text: 'MBTI로 오늘의 번호를 확인해보세요!', method: 'mbti' },
    { id: 'try_chem', text: '친구와 궁합을 확인해보세요!', method: 'chemistry' },
    { id: 'try_frequent', text: '자주 나온 번호로 뽑아보세요!', method: 'frequent' },
    { id: 'try_rare', text: '안 나온 번호로 역발상 도전!', method: 'rare' },
    { id: 'share_one', text: '오늘 번호를 친구에게 공유해보세요!', action: 'share' },
    { id: 'gen_3', text: '오늘 3번 이상 번호를 생성해보세요!', action: 'gen3' }
  ];

  // ─── 로드/저장 ──────────────────────────────────────────
  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        state = { ...DEFAULT_STATE, ...JSON.parse(saved) };
      } else {
        state = { ...DEFAULT_STATE };
      }
    } catch (e) {
      state = { ...DEFAULT_STATE };
    }
    resetDailyIfNeeded();
    initDailyMission();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* ignore */ }
    // 로그인 상태면 클라우드 동기화 (디바운스)
    if (typeof AuthSystem !== 'undefined' && AuthSystem.isLoggedIn()) {
      clearTimeout(save._cloudTimer);
      save._cloudTimer = setTimeout(() => AuthSystem.syncToCloud(), 2000);
    }
  }
  save._cloudTimer = null;

  // ─── 클라우드 연동 ────────────────────────────────────
  function getState() {
    return state ? { ...state } : { ...DEFAULT_STATE };
  }

  function loadFromCloud(cloudData) {
    if (!cloudData) return;
    state = { ...DEFAULT_STATE, ...cloudData };
    // localStorage에만 반영 (클라우드 재싱크 방지)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* ignore */ }
  }

  function resetDailyIfNeeded() {
    const today = TODAY();
    if (state.shareCountDate !== today) {
      state.shareCountToday = { kakao: 0, image: 0, copy: 0, native: 0 };
      state.shareCountDate = today;
    }
    if (state.generatedDate !== today) {
      state.generatedToday = false;
      state.generatedDate = today;
      state.generatedTodayCount = 0;
    }
  }

  // ─── 클로버 관리 ────────────────────────────────────────
  function getBalance() { return state ? state.balance : 0; }

  function addClovers(amount, reason) {
    if (!state) return 0;
    state.balance += amount;
    state.xp += amount;
    state.totalEarned += amount;
    save();
    return amount;
  }

  function spendClovers(amount, feature) {
    if (!state || state.balance < amount) return false;
    state.balance -= amount;
    state.totalSpent += amount;
    save();
    if (typeof trackEvent === 'function') {
      trackEvent('클로버_사용', { feature, amount });
    }
    return true;
  }

  function canAfford(amount) {
    return state && state.balance >= amount;
  }

  // ─── 출석 체크 ──────────────────────────────────────────
  function checkIn() {
    if (!state) return { rewarded: false };
    const today = TODAY();
    if (state.lastCheckIn === today) return { rewarded: false, alreadyDone: true, streak: state.streak };

    // 스트릭 계산
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (state.lastCheckIn === yesterdayStr) {
      state.streak += 1;
    } else {
      state.streak = 1;
    }
    if (state.streak > state.longestStreak) state.longestStreak = state.streak;

    state.lastCheckIn = today;

    // 보상 계산
    let reward = 1;
    let bonusMsg = '';
    if (state.streak >= 30) { reward += 5; bonusMsg = '30일 연속! +5 보너스!'; }
    else if (state.streak >= 14) { reward += 3; bonusMsg = '14일 연속! +3 보너스!'; }
    else if (state.streak >= 7) { reward += 2; bonusMsg = '7일 연속! +2 보너스!'; }
    else if (state.streak >= 3) { reward += 1; bonusMsg = '3일 연속! +1 보너스!'; }

    addClovers(reward, 'checkin');
    checkAchievementSilent('streak_7', state.streak >= 7);
    checkAchievementSilent('streak_30', state.streak >= 30);

    return { rewarded: true, amount: reward, streak: state.streak, bonusMsg, isFirst: state.firstVisit };
  }

  function markNotFirstVisit() {
    if (state) { state.firstVisit = false; save(); }
  }

  // ─── 공유 보상 ──────────────────────────────────────────
  function recordShare(channel) {
    if (!state) return { rewarded: false };
    resetDailyIfNeeded();
    const ch = channel || 'copy';
    const limit = 3;
    if ((state.shareCountToday[ch] || 0) >= limit) return { rewarded: false, maxed: true };

    state.shareCountToday[ch] = (state.shareCountToday[ch] || 0) + 1;
    state.totalShares = (state.totalShares || 0) + 1;

    const amount = ch === 'kakao' ? 2 : 1;
    addClovers(amount, 'share_' + ch);

    checkAchievementSilent('share_king', state.totalShares >= 10);
    checkDailyMission('share');

    return { rewarded: true, amount };
  }

  function canShareForReward(channel) {
    if (!state) return false;
    resetDailyIfNeeded();
    return (state.shareCountToday[channel] || 0) < 3;
  }

  // ─── 번호 생성 보상 ────────────────────────────────────
  function recordGeneration(method) {
    if (!state) return { rewarded: false };
    resetDailyIfNeeded();

    state.totalGenerated = (state.totalGenerated || 0) + 1;
    state.generatedTodayCount = (state.generatedTodayCount || 0) + 1;
    let reward = 0;

    // 오늘 첫 생성 보상
    if (!state.generatedToday) {
      state.generatedToday = true;
      reward += 1;
    }

    // 새 방법 처음 시도 보상
    if (method && !state.triedMethods.includes(method)) {
      state.triedMethods.push(method);
      reward += 1;
    }

    if (reward > 0) addClovers(reward, 'generation');

    // 업적 체크
    checkAchievementSilent('first_gen', state.totalGenerated >= 1);
    checkAchievementSilent('gen_10', state.totalGenerated >= 10);
    checkAchievementSilent('gen_100', state.totalGenerated >= 100);
    checkAchievementSilent('explorer', state.triedMethods.length >= 7);

    // 궁합 횟수
    if (method === 'chemistry') {
      state._chemCount = (state._chemCount || 0) + 1;
      checkAchievementSilent('chem_master', state._chemCount >= 5);
    }

    // 데일리 미션
    checkDailyMission(method);

    save();
    return { rewarded: reward > 0, amount: reward };
  }

  // ─── MBTI 추적 ──────────────────────────────────────────
  function recordMbtiType(type) {
    if (!state) return;
    if (!state._mbtiTypes) state._mbtiTypes = [];
    if (!state._mbtiTypes.includes(type)) {
      state._mbtiTypes.push(type);
      checkAchievementSilent('mbti_all', state._mbtiTypes.length >= 16);
      save();
    }
  }

  // ─── 번호 잠금 (즐겨찾기) ──────────────────────────────
  function lockNumbers(numbers) {
    if (!state) return false;
    if (state.lockedNumbers.length >= 5) return false;
    if (!spendClovers(1, 'lock_numbers')) return false;
    state.lockedNumbers.push({
      numbers: [...numbers],
      date: TODAY(),
      id: Date.now()
    });
    checkAchievementSilent('lock_5', state.lockedNumbers.length >= 5);
    save();
    return true;
  }

  function unlockNumbers(id) {
    if (!state) return;
    state.lockedNumbers = state.lockedNumbers.filter(item => item.id !== id);
    save();
  }

  function getLockedNumbers() {
    return state ? state.lockedNumbers : [];
  }

  function isHistoryExpanded() { return state ? state.historyExpanded : false; }
  function expandHistory() {
    if (!state) return false;
    if (state.historyExpanded) return true;
    if (!spendClovers(3, 'history_expand')) return false;
    state.historyExpanded = true;
    save();
    return true;
  }
  function getHistoryLimit() { return state && state.historyExpanded ? 100 : 20; }

  // ─── 업적 ──────────────────────────────────────────────
  function checkAchievementSilent(id, condition) {
    if (!state || !condition) return null;
    if (state.achievements[id]) return null;
    state.achievements[id] = { date: TODAY() };
    save();
    return ACHIEVEMENTS[id];
  }

  function getAchievements() {
    if (!state) return [];
    return Object.keys(ACHIEVEMENTS).map(id => ({
      id,
      ...ACHIEVEMENTS[id],
      unlocked: !!state.achievements[id],
      date: state.achievements[id]?.date
    }));
  }

  function getUnlockedCount() {
    if (!state) return 0;
    return Object.keys(state.achievements).length;
  }

  // ─── 레벨 ──────────────────────────────────────────────
  function getLevel() {
    if (!state) return LEVELS[0];
    let level = LEVELS[0];
    for (const l of LEVELS) {
      if (state.xp >= l.minXp) level = l;
    }
    const idx = LEVELS.indexOf(level);
    const next = LEVELS[idx + 1];
    return {
      ...level,
      index: idx,
      xp: state.xp,
      nextLevel: next || null,
      progress: next ? (state.xp - level.minXp) / (next.minXp - level.minXp) : 1
    };
  }

  // ─── 스트릭 ─────────────────────────────────────────────
  function getStreak() {
    if (!state) return { current: 0, longest: 0, lastCheckIn: null };
    return {
      current: state.streak,
      longest: state.longestStreak,
      lastCheckIn: state.lastCheckIn
    };
  }

  function getCheckInCalendar() {
    // 최근 7일 출석 여부 (간단 근사: streak 기반)
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      const checkedIn = state && state.lastCheckIn && i < state.streak;
      days.push({
        date: dateStr,
        day: dayNames[d.getDay()],
        dateNum: d.getDate(),
        checkedIn: i === 0 ? (state && state.lastCheckIn === TODAY()) : checkedIn
      });
    }
    return days;
  }

  // ─── 오늘의 미션 ────────────────────────────────────────
  function initDailyMission() {
    if (!state) return;
    const today = TODAY();
    if (state.dailyMissionDate !== today) {
      const seed = hashDate(today);
      state.dailyMission = MISSIONS[seed % MISSIONS.length];
      state.dailyMissionDate = today;
      state.dailyMissionDone = false;
      save();
    }
  }

  function getDailyMission() {
    if (!state || !state.dailyMission) return null;
    return { ...state.dailyMission, done: state.dailyMissionDone };
  }

  function checkDailyMission(action) {
    if (!state || state.dailyMissionDone || !state.dailyMission) return false;
    const m = state.dailyMission;
    let completed = false;

    if (m.method && action === m.method) completed = true;
    if (m.action === 'share' && action === 'share') completed = true;
    if (m.action === 'gen3' && (state.generatedTodayCount || 0) >= 3) completed = true;

    if (completed) {
      state.dailyMissionDone = true;
      addClovers(1, 'daily_mission');
      save();
      return true;
    }
    return false;
  }

  function hashDate(dateStr) {
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // ─── MBTI 랭킹 ─────────────────────────────────────────
  function getMbtiRanking() {
    const types = [
      'ISTJ','ISFJ','INFJ','INTJ','ISTP','ISFP','INFP','INTP',
      'ESTP','ESFP','ENFP','ENTP','ESTJ','ESFJ','ENFJ','ENTJ'
    ];
    const today = TODAY();
    const seed = hashDate(today);

    // 시드 기반 셔플
    const shuffled = [...types];
    let s = seed;
    for (let i = shuffled.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const j = s % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.map((type, idx) => ({ type, rank: idx + 1 }));
  }

  // ─── 통계 ──────────────────────────────────────────────
  function getStats() {
    if (!state) return {};
    return {
      balance: state.balance,
      xp: state.xp,
      totalEarned: state.totalEarned,
      totalSpent: state.totalSpent,
      totalGenerated: state.totalGenerated || 0,
      totalShares: state.totalShares || 0,
      streak: state.streak,
      longestStreak: state.longestStreak,
      triedMethods: state.triedMethods?.length || 0
    };
  }

  function isFirstVisit() { return state ? state.firstVisit : true; }

  // ─── 클로버 구매 (honor system) ───────────────────────────
  const CLOVER_TIERS = {
    starter: { amount: 15, priceKRW: '777원', priceUSD: '$0.99' },
    popular: { amount: 50, priceKRW: '2,000원', priceUSD: '$1.99' },
    vip:     { amount: 200, priceKRW: '7,777원', priceUSD: '$5.99' }
  };

  function claimCloverPurchase(tier) {
    if (!state) return { success: false, reason: 'no_state' };
    const today = TODAY();
    // 1일 1회 제한
    if (state.lastCloverClaim === today) {
      return { success: false, reason: 'already_claimed' };
    }
    const tierData = CLOVER_TIERS[tier];
    if (!tierData) return { success: false, reason: 'invalid_tier' };

    state.lastCloverClaim = today;
    state.lastCloverTier = tier;
    addClovers(tierData.amount, 'purchase_' + tier);
    save();

    if (typeof trackEvent === 'function') {
      trackEvent('클로버_구매', { tier, amount: tierData.amount });
    }
    return { success: true, amount: tierData.amount };
  }

  function canClaimToday() {
    if (!state) return false;
    return state.lastCloverClaim !== TODAY();
  }

  // ─── 프리미엄 첫 무료 체험 ────────────────────────────────
  function checkFreePremium(feature) {
    if (!state) return false;
    if (!state.freePremiumUsed) state.freePremiumUsed = { sajuDetail: false, chemDetail: false, nameDetail: false };
    return !state.freePremiumUsed[feature];
  }

  function useFreePremium(feature) {
    if (!state) return;
    if (!state.freePremiumUsed) state.freePremiumUsed = { sajuDetail: false, chemDetail: false, nameDetail: false };
    state.freePremiumUsed[feature] = true;
    save();
  }

  // ─── Public API ─────────────────────────────────────────
  return {
    load, getBalance, addClovers, spendClovers, canAfford,
    checkIn, markNotFirstVisit, isFirstVisit,
    recordShare, canShareForReward,
    recordGeneration, recordMbtiType,
    lockNumbers, unlockNumbers, getLockedNumbers,
    isHistoryExpanded, expandHistory, getHistoryLimit,
    checkAchievementSilent, getAchievements, getUnlockedCount,
    getLevel, getStreak, getCheckInCalendar,
    getDailyMission, checkDailyMission,
    getMbtiRanking, getStats,
    checkFreePremium, useFreePremium,
    claimCloverPurchase, canClaimToday, CLOVER_TIERS,
    getState, loadFromCloud,
    ACHIEVEMENTS, LEVELS
  };
})();
