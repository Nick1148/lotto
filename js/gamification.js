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
    bonusMissions: [],
    bonusMissionsDone: [],
    _todayMethods: [],
    totalSharestoday: 0,
    firstVisit: true,
    freePremiumUsed: { sajuDetail: false, chemDetail: false, nameDetail: false },
    lastCloverClaim: null,
    lastCloverTier: null,
    referralCode: null,
    referredBy: null,
    referralCount: 0
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
  // 메인 미션 13개
  const MISSIONS = [
    { id: 'try_saju', text: '오늘은 사주로 번호를 뽑아보세요!', method: 'saju' },
    { id: 'try_name', text: '이름으로 행운 번호를 뽑아보세요!', method: 'name' },
    { id: 'try_mbti', text: 'MBTI로 오늘의 번호를 확인해보세요!', method: 'mbti' },
    { id: 'try_chem', text: '친구와 궁합을 확인해보세요!', method: 'chemistry' },
    { id: 'try_frequent', text: '자주 나온 번호로 뽑아보세요!', method: 'frequent' },
    { id: 'try_rare', text: '안 나온 번호로 역발상 도전!', method: 'rare' },
    { id: 'share_one', text: '오늘 번호를 친구에게 공유해보세요!', action: 'share' },
    { id: 'gen_3', text: '오늘 3번 이상 번호를 생성해보세요!', action: 'gen3' },
    { id: 'gen_5', text: '오늘 5번 번호를 생성해보세요!', action: 'gen5' },
    { id: 'try_filter', text: '번호 필터를 사용해보세요!', action: 'use_filter' },
    { id: 'try_report', text: '주간 행운 리포트를 확인해보세요!', action: 'use_report' },
    { id: 'share_chem', text: '궁합 결과를 친구에게 공유해보세요!', action: 'share_chem' },
    { id: 'try_compare', text: '당첨번호 비교 기능을 사용해보세요!', action: 'use_compare' }
  ];

  // 보너스 미션 풀 (메인과 별도로 2개/일 추가)
  const BONUS_MISSIONS = [
    { id: 'bonus_random', text: '랜덤으로 번호 1번 뽑기', method: 'random', reward: 1 },
    { id: 'bonus_share2', text: '오늘 2번 이상 공유하기', action: 'share2', reward: 2 },
    { id: 'bonus_all3', text: '3가지 다른 방법으로 번호 생성', action: 'try3methods', reward: 2 },
    { id: 'bonus_saju_name', text: '사주 + 이름 둘 다 뽑아보기', action: 'saju_and_name', reward: 2 },
    { id: 'bonus_checkin', text: '출석 체크 완료하기', action: 'checkin', reward: 1 },
    { id: 'bonus_lock', text: '마음에 드는 번호 1세트 잠금하기', action: 'lock', reward: 1 }
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
      state.totalSharestoday = 0;
      state._todayMethods = [];
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
    } else if (state.lastCheckIn !== today) {
      // 스트릭 보호권 체크
      if (state.streakShield && state.streakShield > 0 && state.streak > 0) {
        state.streakShield -= 1;
        state.streak += 1; // 보호권 사용, 스트릭 유지
      } else {
        state.streak = 1;
      }
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

    // 마일스톤 보상
    let milestoneMsg = '';
    if (state.streak === 50 && !state.milestone50) {
      reward += 10; milestoneMsg = '🎉 50일 연속 달성! +10 보너스!';
      state.milestone50 = true;
    } else if (state.streak === 100 && !state.milestone100) {
      reward += 30; milestoneMsg = '🏆 100일 연속 달성! +30 보너스!';
      state.milestone100 = true;
    }

    // 이벤트 배율 적용
    const event = getActiveEvent();
    if (event && event.multiplier) {
      reward = reward * event.multiplier;
      bonusMsg = (bonusMsg ? bonusMsg + ' ' : '') + `${event.name} ${event.multiplier}배!`;
    }
    if (event && event.bonus) {
      reward += event.bonus;
    }

    addClovers(reward, 'checkin');
    checkAchievementSilent('streak_7', state.streak >= 7);
    checkAchievementSilent('streak_30', state.streak >= 30);

    return { rewarded: true, amount: reward, streak: state.streak, bonusMsg, milestoneMsg, isFirst: state.firstVisit };
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

    // 이벤트 배율 적용
    if (reward > 0) {
      const event = getActiveEvent();
      if (event && event.multiplier) reward = reward * event.multiplier;
      if (event && event.bonus) reward += event.bonus;
      addClovers(reward, 'generation');
    }

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
      // 메인 미션 1개
      state.dailyMission = MISSIONS[seed % MISSIONS.length];
      state.dailyMissionDate = today;
      state.dailyMissionDone = false;
      // 보너스 미션 2개 (메인과 다른 것)
      const shuffled = [...BONUS_MISSIONS];
      let s = seed + 777;
      for (let i = shuffled.length - 1; i > 0; i--) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        const j = s % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      state.bonusMissions = shuffled.slice(0, 2);
      state.bonusMissionsDone = [false, false];
      save();
    }
  }

  function getDailyMission() {
    if (!state || !state.dailyMission) return null;
    return { ...state.dailyMission, done: state.dailyMissionDone };
  }

  function getBonusMissions() {
    if (!state || !state.bonusMissions || state.bonusMissions.length === 0) return [];
    return state.bonusMissions.map((m, i) => ({
      ...m,
      done: state.bonusMissionsDone ? state.bonusMissionsDone[i] : false
    }));
  }

  function checkMissionCondition(m, action) {
    if (m.method && action === m.method) return true;
    if (m.action === 'share' && action === 'share') return true;
    if (m.action === 'share_chem' && action === 'share_chem') return true;
    if (m.action === 'gen3' && (state.generatedTodayCount || 0) >= 3) return true;
    if (m.action === 'gen5' && (state.generatedTodayCount || 0) >= 5) return true;
    if (m.action === 'use_filter' && action === 'use_filter') return true;
    if (m.action === 'use_report' && action === 'use_report') return true;
    if (m.action === 'use_compare' && action === 'use_compare') return true;
    if (m.action === 'share2' && (state.totalSharestoday || 0) >= 2) return true;
    if (m.action === 'try3methods' && (state._todayMethods || []).length >= 3) return true;
    if (m.action === 'saju_and_name') {
      const tm = state._todayMethods || [];
      return tm.includes('saju') && tm.includes('name');
    }
    if (m.action === 'checkin' && state.lastCheckIn === TODAY()) return true;
    if (m.action === 'lock' && action === 'lock') return true;
    return false;
  }

  function checkDailyMission(action) {
    if (!state) return false;
    let anyCompleted = false;

    // 오늘 사용한 방법 추적
    if (action && !['share', 'share_chem', 'use_filter', 'use_report', 'use_compare', 'lock'].includes(action)) {
      if (!state._todayMethods) state._todayMethods = [];
      if (!state._todayMethods.includes(action)) state._todayMethods.push(action);
    }
    // 오늘 공유 횟수 추적
    if (action === 'share' || action === 'share_chem') {
      state.totalSharestoday = (state.totalSharestoday || 0) + 1;
    }

    // 메인 미션 체크
    if (!state.dailyMissionDone && state.dailyMission) {
      if (checkMissionCondition(state.dailyMission, action)) {
        state.dailyMissionDone = true;
        addClovers(1, 'daily_mission');
        anyCompleted = true;
      }
    }

    // 보너스 미션 체크
    if (state.bonusMissions && state.bonusMissionsDone) {
      for (let i = 0; i < state.bonusMissions.length; i++) {
        if (!state.bonusMissionsDone[i] && checkMissionCondition(state.bonusMissions[i], action)) {
          state.bonusMissionsDone[i] = true;
          const reward = state.bonusMissions[i].reward || 1;
          addClovers(reward, 'bonus_mission');
          anyCompleted = true;
        }
      }
    }

    if (anyCompleted) save();
    return anyCompleted;
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

  // ─── 스트릭 보호권 ──────────────────────────────────────
  function buyStreakShield() {
    if (!state) return false;
    if (!canAfford(5)) return false;
    spendClovers(5);
    state.streakShield = (state.streakShield || 0) + 1;
    save();
    return true;
  }

  function getStreakShieldCount() {
    return state ? (state.streakShield || 0) : 0;
  }

  // ─── 오늘의 종합 운세 ─────────────────────────────────────
  function getDailyFortune() {
    const today = TODAY();
    const seed = hashDate(today);
    let s = seed;
    function next() { s = (s * 1103515245 + 12345) & 0x7fffffff; return s; }

    // 행운 점수 (60~99, 너무 낮으면 재미 없음)
    const score = 60 + (next() % 40);

    // 행운 색상
    const colors = [
      { name: '빨간색', hex: '#ff6b6b', emoji: '🔴' },
      { name: '주황색', hex: '#ff9f43', emoji: '🟠' },
      { name: '노란색', hex: '#ffd93d', emoji: '🟡' },
      { name: '초록색', hex: '#6bcb77', emoji: '🟢' },
      { name: '파란색', hex: '#4d96ff', emoji: '🔵' },
      { name: '보라색', hex: '#9b59b6', emoji: '🟣' },
      { name: '분홍색', hex: '#ff7eb3', emoji: '💗' },
      { name: '금색', hex: '#ffd700', emoji: '✨' }
    ];
    const color = colors[next() % colors.length];

    // 행운 시간대 (2시간 단위, 12구간)
    const luckyHourStart = (next() % 12) * 2;
    const luckyHourEnd = luckyHourStart + 2;
    const luckyTimeLabel = `${String(luckyHourStart).padStart(2,'0')}:00~${String(luckyHourEnd).padStart(2,'0')}:00`;

    // 행운 방향
    const directions = ['동쪽', '서쪽', '남쪽', '북쪽', '동남쪽', '서남쪽', '동북쪽', '서북쪽'];
    const direction = directions[next() % directions.length];

    // 행운 숫자 (1~45)
    const luckyNumber = (next() % 45) + 1;

    // 오늘의 한마디
    const messages = [
      '오늘은 직감을 믿어보세요! 예상치 못한 행운이 찾아옵니다.',
      '주변 사람들과 함께하면 행운이 두 배! 함께 번호를 뽑아보세요.',
      '꾸준함이 빛을 발하는 날! 매일의 루틴이 행운을 부릅니다.',
      '새로운 시도가 행운을 가져오는 날! 평소와 다른 방법을 써보세요.',
      '차분하게 분석하면 좋은 결과가 있을 거예요. 통계를 참고해보세요.',
      '오늘의 행운은 나눔에서 옵니다. 친구에게 번호를 공유해보세요!',
      '긍정적인 마음이 행운을 끌어당기는 날! 웃으면서 뽑아보세요.',
      '오늘은 과감하게! 평소 안 쓰던 번호에 행운이 숨어있어요.',
      '작은 행운이 큰 행운으로 이어지는 날! 클로버를 아끼지 마세요.',
      '오행의 기운이 강한 날! 사주 기반 번호가 특히 좋아요.',
      '이름에 숨겨진 에너지가 활성화되는 날! 이름 번호를 뽑아보세요.',
      '우주가 당신 편인 날! 마음 가는 대로 선택하세요.'
    ];
    const message = messages[next() % messages.length];

    // 현재 럭키타임인지
    const now = new Date();
    const currentHour = now.getHours();
    const isLuckyTime = currentHour >= luckyHourStart && currentHour < luckyHourEnd;

    // 럭키타임까지 남은 시간(초)
    let luckyTimeRemaining = 0;
    if (!isLuckyTime) {
      let targetHour = luckyHourStart;
      if (currentHour >= luckyHourEnd) {
        // 이미 지남 → 내일
        luckyTimeRemaining = -1;
      } else {
        const target = new Date(now);
        target.setHours(targetHour, 0, 0, 0);
        luckyTimeRemaining = Math.max(0, Math.floor((target - now) / 1000));
      }
    } else {
      const end = new Date(now);
      end.setHours(luckyHourEnd, 0, 0, 0);
      luckyTimeRemaining = Math.max(0, Math.floor((end - now) / 1000));
    }

    return {
      score, color, luckyTimeLabel, luckyHourStart, luckyHourEnd,
      direction, luckyNumber, message, isLuckyTime, luckyTimeRemaining
    };
  }

  // ─── 이벤트 시스템 ─────────────────────────────────────────
  function getActiveEvent() {
    const now = new Date();
    const day = now.getDate();
    const dayOfWeek = now.getDay(); // 0=일, 6=토

    if (dayOfWeek === 6) {
      return { id: 'saturday', name: '🎰 추첨일 이벤트', desc: '오늘 모든 보상 2배!', multiplier: 2, color: '#ff6b6b' };
    }
    if (day === 1) {
      return { id: 'first_day', name: '🎊 월초 대박 기원', desc: '출석 보상 3배!', multiplier: 3, color: '#ffd700' };
    }
    if (day % 7 === 0) {
      return { id: 'lucky7', name: '🍀 럭키 세븐 데이', desc: '보너스 클로버 +1!', bonus: 1, color: '#51cf66' };
    }
    return null;
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
    getDailyMission, getBonusMissions, checkDailyMission,
    getMbtiRanking, getStats,
    checkFreePremium, useFreePremium,
    claimCloverPurchase, canClaimToday, CLOVER_TIERS,
    getState, loadFromCloud,
    getDailyFortune, getActiveEvent,
    buyStreakShield, getStreakShieldCount,
    ACHIEVEMENTS, LEVELS
  };
})();
