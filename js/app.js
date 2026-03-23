/**
 * app.js - UI 이벤트 핸들러, 캐릭터 상태, confetti, localStorage
 */

// 생성 기록 (최대 20개)
let generationHistory = [];

// 후원 nudge 카운터 (2회 이상 생성 시 표시)
let generateCount = parseInt(sessionStorage.getItem('genCount') || '0');

// 캐릭터 응원 메시지
const CHEER_MESSAGES = [
  '행운을 빌어요! 🍀',
  '이번엔 대박이에요! ✨',
  '좋은 느낌이에요~! 💕',
  '오늘의 행운 번호! 🌟',
  '두근두근~! 💗',
  '대박 나세요! 🎉',
  '느낌이 좋아요! 🌈',
  '행운이 가득~! 🍀✨',
  '이 번호 믿어봐요! 💫',
  '오늘은 럭키데이! 🎊'
];

const IDLE_MESSAGES = [
  '번호를 뽑아볼까요? 🎱',
  '오늘의 운세는~? ✨',
  '행운을 찾아봐요! 🍀',
  '어떤 번호가 나올까? 💭'
];

// ─── localStorage 키 ──────────────────────────────────────
const STORAGE_KEY = 'lotto_history';

// ─── 초기화 ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await initData();
  initTabs();
  initButtons();
  initMbtiSelector();
  loadHistoryFromStorage();
  renderHistory();
  updateSajuDisplay();
  initHistoryToggle();

  // 오늘의 운세 번호 초기화
  initDailyFortune();

  // 후원 QR 토글
  const supportBtn = document.getElementById('supportBtn');
  const supportQr = document.getElementById('supportQr');
  const supportQrClose = document.getElementById('supportQrClose');
  if (supportBtn && supportQr) {
    supportBtn.addEventListener('click', () => {
      supportQr.style.display = supportQr.style.display === 'none' ? 'block' : 'none';
    });
    supportQrClose.addEventListener('click', () => {
      supportQr.style.display = 'none';
    });
  }

  // 캐릭터 초기 상태
  setCharacterState('idle');
  setTimeout(() => showSpeechBubble(pickRandom(IDLE_MESSAGES)), 500);
});

/**
 * 데이터 로드 및 헤더 업데이트
 */
async function initData() {
  await DataManager.loadHistory();

  const status = DataManager.getStatus();
  const latest = DataManager.getLatest();

  const roundEl = document.getElementById('latestRound');
  const numbersEl = document.getElementById('latestNumbers');

  if (status.isUsingFallback || latest.numbers.length === 0) {
    roundEl.textContent = '데이터 없음';
    numbersEl.innerHTML = `
      <div class="data-status fallback">
        ⚠️ 데이터 없음 — 폴백 통계 사용 중
      </div>`;
  } else {
    roundEl.textContent = `제 ${latest.drwNo}회 (${latest.drwNoDate})`;
    numbersEl.innerHTML = '';
    for (const n of latest.numbers) {
      numbersEl.appendChild(createBall(n, true));
    }
    if (latest.bonusNo) {
      const sep = document.createElement('span');
      sep.textContent = '+';
      sep.style.cssText = 'color:var(--color-primary);font-weight:700;font-size:1rem;margin:0 2px;';
      numbersEl.appendChild(sep);
      const bonus = createBall(latest.bonusNo, true);
      bonus.style.opacity = '0.65';
      bonus.style.border = '2px dashed rgba(255,126,179,0.4)';
      numbersEl.appendChild(bonus);
    }

    const statusBanner = document.createElement('div');
    statusBanner.className = 'data-status loaded';
    statusBanner.innerHTML = `✅ ${status.totalDraws}회차 데이터 로드 (최근 ${status.recentDraws}회 분석)`;
    numbersEl.after(statusBanner);
  }

  renderTopBottomBalls();
}

/**
 * 상위/하위 15개 번호 표시
 */
function renderTopBottomBalls() {
  const top15 = DataManager.getTopNumbers(15);
  const bottom15 = DataManager.getBottomNumbers(15);

  const top15Container = document.getElementById('top15-balls');
  const bottom15Container = document.getElementById('bottom15-balls');

  top15Container.innerHTML = '';
  bottom15Container.innerHTML = '';

  top15.forEach(n => top15Container.appendChild(createBall(n, true)));
  bottom15.forEach(n => bottom15Container.appendChild(createBall(n, true)));
}

// ─── 탭 초기화 ────────────────────────────────────────────
function initTabs() {
  const btns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

// ─── 버튼 초기화 ──────────────────────────────────────────
function initButtons() {
  document.getElementById('btn-random').addEventListener('click', () => {
    const filterOn = isSmartFilterOn('random');
    const numbers = LottoGenerator.smartFilter(LottoGenerator.generateRandom, [], filterOn);
    displayResult('random', numbers, '🎲 완전 랜덤', filterOn);
  });

  document.getElementById('btn-frequent').addEventListener('click', () => {
    const filterOn = isSmartFilterOn('frequent');
    const numbers = LottoGenerator.smartFilter(LottoGenerator.generateFrequent, [], filterOn);
    displayResult('frequent', numbers, '🔥 자주 나온', filterOn);
  });

  document.getElementById('btn-rare').addEventListener('click', () => {
    const filterOn = isSmartFilterOn('rare');
    const numbers = LottoGenerator.smartFilter(LottoGenerator.generateRare, [], filterOn);
    displayResult('rare', numbers, '❄️ 안 나온', filterOn);
  });

  document.getElementById('btn-saju').addEventListener('click', () => {
    const dateVal = document.getElementById('birthDate').value;
    const hourIdx = parseInt(document.getElementById('birthHour').value);

    if (!dateVal) {
      showToast('생년월일을 입력해주세요.');
      return;
    }

    const [year, month, day] = dateVal.split('-').map(Number);
    const filterOn = isSmartFilterOn('saju');
    const result = LottoGenerator.smartFilter(LottoGenerator.generateSaju, [year, month, day, hourIdx], filterOn);

    displayResult('saju', result.numbers, '✨ 내 사주', filterOn);
    showSajuInfo(result.saju);
    showExplanation('saju', result);
  });

  // 이름 버튼
  document.getElementById('btn-name').addEventListener('click', () => {
    const name = document.getElementById('userName').value.trim();
    if (!name || name.length < 2) {
      showToast('이름을 2자 이상 입력해주세요.');
      return;
    }

    // 🔥 이스터에그: 수진이
    if (name.includes('수진')) {
      triggerHellEasterEgg(name);
      return;
    }

    const filterOn = isSmartFilterOn('name');
    const result = LottoGenerator.smartFilter(LottoGenerator.generateName, [name], filterOn);
    displayResult('name', result.numbers, '📛 이름', filterOn);
    showNameInfo(result.nameInfo);
    showExplanation('name', result);
  });

  // MBTI 버튼
  document.getElementById('btn-mbti').addEventListener('click', () => {
    const mbtiType = getSelectedMbti();
    const filterOn = isSmartFilterOn('mbti');
    const result = LottoGenerator.smartFilter(LottoGenerator.generateMbti, [mbtiType], filterOn);

    displayResult('mbti', result.numbers, '🧠 MBTI', filterOn);
    showExplanation('mbti', result);
  });

  // 5세트 뽑기 버튼
  document.getElementById('btn-random-multi').addEventListener('click', () => {
    const sets = generateMultiSets('random');
    displayMultiSets('random', sets, '🎲 완전 랜덤');
  });
  document.getElementById('btn-frequent-multi').addEventListener('click', () => {
    const sets = generateMultiSets('frequent');
    displayMultiSets('frequent', sets, '🔥 자주 나온');
  });
  document.getElementById('btn-rare-multi').addEventListener('click', () => {
    const sets = generateMultiSets('rare');
    displayMultiSets('rare', sets, '❄️ 안 나온');
  });

  // 궁합 버튼
  document.getElementById('btn-chemistry').addEventListener('click', () => {
    const name1 = document.getElementById('chemName1').value.trim();
    const name2 = document.getElementById('chemName2').value.trim();
    if (!name1 || name1.length < 2) { showToast('나의 이름을 2자 이상 입력해주세요.'); return; }
    if (!name2 || name2.length < 2) { showToast('상대 이름을 2자 이상 입력해주세요.'); return; }

    const result = ChemistryGenerator.getChemistry(name1, name2);
    displayChemistryResult(result);
  });

  // 당첨 비교 버튼
  document.getElementById('compareBtn').addEventListener('click', compareWithLatest);

  document.getElementById('birthDate').addEventListener('change', updateSajuDisplay);
  document.getElementById('birthHour').addEventListener('change', updateSajuDisplay);

  document.getElementById('clearHistory').addEventListener('click', () => {
    generationHistory = [];
    saveHistoryToStorage();
    renderHistory();
    showToast('기록이 삭제되었습니다.');
  });
}

// ─── 생성 기록 접기/펼치기 ────────────────────────────────
function initHistoryToggle() {
  const toggle = document.getElementById('historyToggle');
  const body = document.getElementById('historyBody');
  const icon = document.getElementById('historyToggleIcon');

  toggle.addEventListener('click', () => {
    body.classList.toggle('collapsed');
    icon.classList.toggle('collapsed');
  });
}

/**
 * 사주 정보 미리보기 업데이트
 */
function updateSajuDisplay() {
  const dateVal = document.getElementById('birthDate').value;
  if (!dateVal) return;

  const [year, month, day] = dateVal.split('-').map(Number);
  const hourIdx = parseInt(document.getElementById('birthHour').value);
  const saju = SajuCalculator.calculate(year, month, day, hourIdx);
  showSajuInfo(saju);
}

/**
 * 사주 기둥 표시
 */
function showSajuInfo(saju) {
  const display = document.getElementById('sajuDisplay');
  const pillarsEl = document.getElementById('sajuPillars');

  const pillars = [
    { label: '연주', pillar: saju.yearPillar },
    { label: '월주', pillar: saju.monthPillar },
    { label: '일주', pillar: saju.dayPillar },
  ];
  if (saju.hourPillar) {
    pillars.push({ label: '시주', pillar: saju.hourPillar });
  }

  pillarsEl.innerHTML = pillars.map(({ label, pillar }) => `
    <div class="saju-pillar">
      <div class="pillar-label">${label}</div>
      <div class="pillar-value">${pillar.gan.hanja}${pillar.ji.hanja}</div>
      <div class="pillar-romanized">${pillar.gan.ko}${pillar.ji.ko}</div>
    </div>
  `).join('');

  display.style.display = 'block';
}

// ─── 캐릭터 상태 관리 ────────────────────────────────────
function setCharacterState(state) {
  const char = document.getElementById('character');
  char.className = 'character char-' + state;
}

function showSpeechBubble(text) {
  const bubble = document.getElementById('speechBubble');
  const textEl = document.getElementById('speechText');
  textEl.textContent = text;
  bubble.classList.add('visible');

  setTimeout(() => bubble.classList.remove('visible'), 3000);
}

// ─── 결과 표시 ────────────────────────────────────────────
function displayResult(tabId, numbers, methodName, filtered = false) {
  const ballsContainer = document.getElementById(`balls-${tabId}`);
  const freqContainer = document.getElementById(`freq-${tabId}`);

  ballsContainer.innerHTML = '';
  freqContainer.innerHTML = '';

  // 캐릭터 excited
  setCharacterState('excited');
  showSpeechBubble(pickRandom(CHEER_MESSAGES));

  // 햅틱 피드백
  if (navigator.vibrate) navigator.vibrate(50);

  // 공 순서대로 애니메이션
  numbers.forEach((num, idx) => {
    setTimeout(() => {
      const ball = createBall(num);
      ball.style.animationDelay = `${idx * 60}ms`;
      ballsContainer.appendChild(ball);
    }, idx * 100);
  });

  // 빈도 차트 + 분석 카드 + confetti + 기록 추가
  setTimeout(() => {
    renderFreqChart(freqContainer, numbers);
    renderAnalysisCard(tabId, numbers, filtered);
    createShareButtons(tabId, numbers, methodName);
    addToHistory(numbers, methodName);
    launchConfetti();
    insertSupportNudge(document.getElementById(`result-${tabId}`));

    // 결과 영역으로 스크롤
    const resultArea = document.getElementById(`result-${tabId}`);
    resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // 3초 후 idle
    setTimeout(() => {
      setCharacterState('idle');
    }, 3000);
  }, numbers.length * 100 + 300);
}

// ─── Confetti 효과 ────────────────────────────────────────
function launchConfetti() {
  const container = document.getElementById('confettiContainer');
  const pieces = ['♡', '♦', '★', '✧', '🍀', '♡', '✦', '💕'];
  const colors = ['#ff7eb3', '#7ec8c8', '#b4a7d6', '#ffd966', '#ff7272'];

  for (let i = 0; i < 15; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.textContent = pieces[Math.floor(Math.random() * pieces.length)];
    piece.style.left = Math.random() * 100 + '%';
    piece.style.animationDelay = Math.random() * 0.5 + 's';
    piece.style.animationDuration = (1.5 + Math.random()) + 's';
    piece.style.color = colors[Math.floor(Math.random() * colors.length)];
    piece.style.fontSize = (0.8 + Math.random() * 0.8) + 'rem';
    container.appendChild(piece);
  }

  setTimeout(() => {
    container.innerHTML = '';
  }, 2500);
}

// ─── 로또 공 생성 ─────────────────────────────────────────
function createBall(number, small = false) {
  const ball = document.createElement('div');
  ball.className = `ball ${getBallColorClass(number)} ${small ? 'ball-sm' : ''}`;
  ball.textContent = number;
  ball.setAttribute('title', `${number}번 (출현 ${DataManager.getCount(number)}회)`);
  return ball;
}

function getBallColorClass(n) {
  if (n <= 10) return 'ball-1-10';
  if (n <= 20) return 'ball-11-20';
  if (n <= 30) return 'ball-21-30';
  if (n <= 40) return 'ball-31-40';
  return 'ball-41-45';
}

// ─── 빈도 차트 ────────────────────────────────────────────
function renderFreqChart(container, numbers) {
  const maxCount = DataManager.getMaxCount();
  const ranked = DataManager.getFrequencyRanked();

  const rankMap = {};
  ranked.forEach((item, idx) => { rankMap[item.number] = idx + 1; });

  numbers.forEach((num, i) => {
    const count = DataManager.getCount(num);
    const rank = rankMap[num] || '?';
    const pct = maxCount > 0 ? (count / maxCount * 100).toFixed(1) : 0;

    const item = document.createElement('div');
    item.className = 'freq-item';
    item.style.animationDelay = `${i * 60}ms`;

    const ballClass = getBallColorClass(num);
    const barColor = getBarColor(ballClass);

    item.innerHTML = `
      <span class="freq-rank">#${rank}</span>
      <span class="freq-number">${num}번</span>
      <div class="freq-bar-container">
        <div class="freq-bar" style="width:0%;background:${barColor}"></div>
      </div>
      <span class="freq-count">${count}회</span>
    `;
    container.appendChild(item);

    requestAnimationFrame(() => {
      setTimeout(() => {
        item.querySelector('.freq-bar').style.width = `${pct}%`;
      }, 50);
    });
  });
}

function getBarColor(ballClass) {
  const colors = {
    'ball-1-10': 'rgba(251, 196, 0, 0.6)',
    'ball-11-20': 'rgba(105, 200, 242, 0.6)',
    'ball-21-30': 'rgba(255, 114, 114, 0.6)',
    'ball-31-40': 'rgba(170, 170, 170, 0.6)',
    'ball-41-45': 'rgba(176, 216, 64, 0.6)'
  };
  return colors[ballClass] || 'rgba(255, 126, 179, 0.6)';
}

// ─── 생성 기록 (localStorage) ─────────────────────────────
function loadHistoryFromStorage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      generationHistory = JSON.parse(saved);
    }
  } catch (e) {
    generationHistory = [];
  }
}

function saveHistoryToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(generationHistory));
  } catch (e) {
    // localStorage 용량 초과 등 무시
  }
}

function addToHistory(numbers, methodName) {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const dateStr = `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;

  generationHistory.unshift({ numbers, methodName, time: timeStr, date: dateStr });
  if (generationHistory.length > 20) generationHistory.pop();
  saveHistoryToStorage();
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('historyList');
  const clearBtn = document.getElementById('clearHistory');

  if (generationHistory.length === 0) {
    list.innerHTML = `
      <div class="history-empty">
        <div class="empty-icon">🎱</div>
        <p>아직 생성된 번호가 없어요</p>
        <p class="empty-sub">위에서 번호를 생성해보세요!</p>
      </div>`;
    clearBtn.style.display = 'none';
    return;
  }

  clearBtn.style.display = 'block';
  list.innerHTML = '';

  generationHistory.forEach(({ numbers, methodName, time, date }) => {
    const item = document.createElement('div');
    item.className = 'history-item';

    const methodClass = getMethodClass(methodName);
    const ballsHtml = numbers.map(n =>
      `<div class="ball ball-sm ${getBallColorClass(n)}">${n}</div>`
    ).join('');

    const displayTime = date ? `${date} ${time}` : time;

    item.innerHTML = `
      <span class="history-method ${methodClass}">${methodName}</span>
      <div class="history-balls">${ballsHtml}</div>
      <span class="history-time">${displayTime}</span>
    `;
    list.appendChild(item);
  });
}

function getMethodClass(methodName) {
  if (methodName.includes('랜덤')) return 'method-random';
  if (methodName.includes('자주')) return 'method-frequent';
  if (methodName.includes('나온')) return 'method-rare';
  if (methodName.includes('사주')) return 'method-saju';
  if (methodName.includes('이름')) return 'method-name';
  if (methodName.includes('MBTI')) return 'method-mbti';
  if (methodName.includes('궁합')) return 'method-chemistry';
  return 'method-random';
}

// ─── Toast 알림 ───────────────────────────────────────────
function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ─── MBTI 선택기 ────────────────────────────────────────
function initMbtiSelector() {
  const selector = document.getElementById('mbtiSelector');
  if (!selector) return;

  selector.addEventListener('click', (e) => {
    const btn = e.target.closest('.mbti-opt');
    if (!btn) return;

    const axis = btn.dataset.axis;
    // 같은 축의 다른 버튼 비활성화
    selector.querySelectorAll(`.mbti-opt[data-axis="${axis}"]`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    updateMbtiDisplay();
  });

  updateMbtiDisplay();
}

function getSelectedMbti() {
  const axes = [0, 1, 2, 3];
  let mbti = '';
  for (const axis of axes) {
    const active = document.querySelector(`.mbti-opt[data-axis="${axis}"].active`);
    mbti += active ? active.dataset.value : '';
  }
  return mbti;
}

function updateMbtiDisplay() {
  const type = getSelectedMbti();
  const typeEl = document.getElementById('mbtiTypeDisplay');
  const labelEl = document.getElementById('mbtiLabelDisplay');

  typeEl.textContent = type;
  const profile = MbtiGenerator.PROFILES[type];
  labelEl.textContent = profile ? profile.label : '';
}

// ─── 이름 분석 정보 표시 ─────────────────────────────────
function showNameInfo(nameInfo) {
  const infoEl = document.getElementById('nameInfo');
  const decomposedEl = document.getElementById('nameDecomposed');
  const summaryEl = document.getElementById('nameSummary');

  decomposedEl.innerHTML = '';
  for (const d of nameInfo.decomposed) {
    const box = document.createElement('div');
    box.className = 'name-char-box';
    box.innerHTML = `
      <span class="name-char-main">${d.char}</span>
      <span class="name-char-jamo">${d.cho}${d.jung}${d.jong}</span>
      <span class="name-char-strokes">${d.strokes}획</span>
    `;
    decomposedEl.appendChild(box);
  }

  summaryEl.innerHTML = `총 <strong>${nameInfo.strokes}획</strong> · 오행 <strong>${nameInfo.element.name}(${nameInfo.element.ko})</strong> · ${nameInfo.element.desc}`;
  infoEl.style.display = 'block';
}

// ─── 설명 표시 ──────────────────────────────────────────
function showExplanation(type, result) {
  const box = document.getElementById(`explain-${type}`);
  if (!box) return;

  const text = ExplainEngine.generate(type, result);
  box.querySelector('.explain-text').textContent = text;
  box.style.display = 'flex';
}

// ─── 분석 카드 렌더링 ─────────────────────────────────────
function renderAnalysisCard(tabId, numbers, filtered = false) {
  const container = document.getElementById(`analysis-${tabId}`);
  if (!container) return;

  const result = NumberAnalyzer.analyze(numbers);

  const starCount = Math.round(result.score.total / 20);
  const stars = '🍀'.repeat(starCount) + '☘️'.repeat(5 - starCount);

  const checkIcon = (good) => good
    ? '<span class="analysis-item-check good">✅</span>'
    : '<span class="analysis-item-check neutral">💡</span>';

  const filterBadge = filtered
    ? '<div class="analysis-filter-badge">📊 통계 필터 적용됨</div>'
    : '';

  container.innerHTML = `
    <div class="analysis-card-inner">
      <div class="analysis-title">📊 번호 분석</div>
      <div class="analysis-items">
        <div class="analysis-item">
          <span class="analysis-item-icon">➕</span>
          <span class="analysis-item-text">${result.sum.label}</span>
          ${checkIcon(result.sum.inRange)}
        </div>
        <div class="analysis-item">
          <span class="analysis-item-icon">⚖️</span>
          <span class="analysis-item-text">${result.oddEven.label}</span>
          ${checkIcon(result.oddEven.balanced)}
        </div>
        <div class="analysis-item">
          <span class="analysis-item-icon">📏</span>
          <span class="analysis-item-text">${result.highLow.label}</span>
          ${checkIcon(result.highLow.balanced)}
        </div>
        <div class="analysis-item">
          <span class="analysis-item-icon">🔗</span>
          <span class="analysis-item-text">${result.consecutive.label}</span>
          ${checkIcon(result.consecutive.good)}
        </div>
      </div>
      <div class="analysis-score">
        <div class="analysis-score-left">
          <span class="analysis-score-value">${result.score.total}점</span>
          <span class="analysis-score-label">패턴 점수</span>
        </div>
        <div class="analysis-score-stars">${stars}</div>
      </div>
      <div class="analysis-comment">"${result.score.comment} ${result.score.emoji}"</div>
      ${filterBadge}
    </div>
  `;
}

// ─── 스마트 필터 상태 확인 ─────────────────────────────────
function isSmartFilterOn(tabId) {
  const checkbox = document.querySelector(`.smart-filter-checkbox[data-tab="${tabId}"]`);
  return checkbox ? checkbox.checked : false;
}

// ─── 🔥 지옥 이스터에그 ──────────────────────────────────────
function triggerHellEasterEgg(name) {
  // 오버레이 생성
  const overlay = document.createElement('div');
  overlay.className = 'hell-overlay';
  overlay.innerHTML = `
    <div class="hell-fire-container"></div>
    <div class="hell-content">
      <div class="hell-text"></div>
      <div class="hell-sub"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  // 불꽃 파티클 생성
  const fireContainer = overlay.querySelector('.hell-fire-container');
  const fireEmojis = ['🔥', '💀', '👹', '👿', '🔥', '💀', '⛧'];
  for (let i = 0; i < 30; i++) {
    const fire = document.createElement('span');
    fire.className = 'hell-fire';
    fire.textContent = fireEmojis[i % fireEmojis.length];
    fire.style.left = Math.random() * 100 + '%';
    fire.style.animationDelay = Math.random() * 2 + 's';
    fire.style.animationDuration = (2 + Math.random() * 3) + 's';
    fireContainer.appendChild(fire);
  }

  // 화면 흔들림
  document.body.classList.add('hell-shake');

  // 오버레이 페이드인
  requestAnimationFrame(() => {
    overlay.classList.add('active');
  });

  const hellText = overlay.querySelector('.hell-text');
  const hellSub = overlay.querySelector('.hell-sub');

  // 1단계: 메인 텍스트
  setTimeout(() => {
    hellText.textContent = '🔥 주인장의 가호가 함께합니다 🔥';
    hellText.classList.add('show');
  }, 1000);

  // 2단계: 서브 텍스트
  setTimeout(() => {
    hellSub.textContent = '아직도 못믿겠니 수진아';
    hellSub.classList.add('show');
  }, 3000);

  // 3단계: 서서히 사라짐 + 번호 생성
  setTimeout(() => {
    document.body.classList.remove('hell-shake');
    overlay.classList.add('fade-out');

    setTimeout(() => {
      overlay.remove();

      // 번호 생성 진행
      const filterOn = isSmartFilterOn('name');
      const result = LottoGenerator.smartFilter(LottoGenerator.generateName, [name], filterOn);
      displayResult('name', result.numbers, '🔥 지옥의 번호', filterOn);
      showNameInfo(result.nameInfo);
      showExplanation('name', result);

      // 지옥 confetti
      if (typeof launchConfetti === 'function') {
        launchConfetti(['🔥', '💀', '👹', '⛧', '🔥', '💀', '👿']);
      }

      showToast('🔥 이 페이지는 수진이 너를 위해 만들었어 🔥');
    }, 1000);
  }, 5500);
}

// ─── 오늘의 운세 번호 ────────────────────────────────────
function initDailyFortune() {
  const now = new Date();
  const dateStr = `${now.getFullYear()}.${(now.getMonth()+1).toString().padStart(2,'0')}.${now.getDate().toString().padStart(2,'0')}`;
  const dayNames = ['일','월','화','수','목','금','토'];

  document.getElementById('fortuneDate').textContent = `${dateStr} (${dayNames[now.getDay()]}요일)`;

  // 날짜 기반 시드로 결정론적 번호 생성
  const seed = now.getFullYear() * 10000 + (now.getMonth()+1) * 100 + now.getDate();
  const numbers = generateDailyNumbers(seed);

  const ballsEl = document.getElementById('fortuneBalls');
  ballsEl.innerHTML = '';
  numbers.forEach(n => ballsEl.appendChild(createBall(n)));

  // 행운 점수 (날짜 기반)
  const score = (seed % 31) + 70; // 70~100
  document.getElementById('fortuneScore').textContent = `${score}점 ${'⭐'.repeat(Math.round(score/20))}`;

  // 행운 색상
  const colors = [
    {name: '로즈 핑크', emoji: '🩷'},
    {name: '스카이 블루', emoji: '💙'},
    {name: '선샤인 옐로', emoji: '💛'},
    {name: '라벤더 퍼플', emoji: '💜'},
    {name: '민트 그린', emoji: '💚'},
    {name: '코럴 오렌지', emoji: '🧡'},
    {name: '체리 레드', emoji: '❤️'}
  ];
  const todayColor = colors[seed % colors.length];
  document.getElementById('fortuneColor').textContent = `${todayColor.emoji} ${todayColor.name}`;

  // 행운 숫자
  const luckyNum = (seed % 9) + 1;
  document.getElementById('fortuneLucky').textContent = `${luckyNum}`;

  // 공유 버튼
  const shareBtn = document.getElementById('fortuneShareBtn');
  if (shareBtn) {
    const shareText = `🍀 ${dateStr} 오늘의 행운 번호: ${numbers.join(', ')}\n행운 점수: ${score}점 | 행운 색상: ${todayColor.name}\n나도 뽑아보기 👉 https://nick1148.site`;

    shareBtn.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({ title: '🍀 오늘의 행운 번호', text: shareText, url: 'https://nick1148.site' }).catch(() => {});
      } else {
        navigator.clipboard.writeText(shareText).then(() => {
          showToast('복사 완료! 친구에게 공유해보세요 🍀');
        }).catch(() => {
          showToast('공유 기능을 사용할 수 없습니다.');
        });
      }
    });
  }
}

function generateDailyNumbers(seed) {
  // LCG 기반 결정론적 생성 (같은 날짜 = 같은 번호)
  let s = seed;
  function lcg() {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s;
  }

  const nums = new Set();
  while (nums.size < 6) {
    nums.add((lcg() % 45) + 1);
  }
  return [...nums].sort((a, b) => a - b);
}

// ─── 5세트 한번에 뽑기 ──────────────────────────────────
function generateMultiSets(tabId) {
  const sets = [];
  for (let i = 0; i < 5; i++) {
    const filterOn = isSmartFilterOn(tabId);
    let numbers;
    if (tabId === 'random') {
      numbers = LottoGenerator.smartFilter(LottoGenerator.generateRandom, [], filterOn);
    } else if (tabId === 'frequent') {
      numbers = LottoGenerator.smartFilter(LottoGenerator.generateFrequent, [], filterOn);
    } else if (tabId === 'rare') {
      numbers = LottoGenerator.smartFilter(LottoGenerator.generateRare, [], filterOn);
    } else {
      numbers = LottoGenerator.smartFilter(LottoGenerator.generateRandom, [], filterOn);
    }
    const nums = Array.isArray(numbers) ? numbers : numbers.numbers;
    sets.push(nums);
  }
  return sets;
}

function displayMultiSets(tabId, sets, methodName) {
  const resultArea = document.getElementById(`result-${tabId}`);
  const ballsContainer = document.getElementById(`balls-${tabId}`);
  const freqContainer = document.getElementById(`freq-${tabId}`);
  const analysisContainer = document.getElementById(`analysis-${tabId}`);

  ballsContainer.innerHTML = '';
  freqContainer.innerHTML = '';
  analysisContainer.innerHTML = '';

  // 기존 공유바/멀티 영역 제거
  const existingMulti = resultArea.querySelector('.multi-set-container');
  if (existingMulti) existingMulti.remove();
  const existingShare = resultArea.querySelector('.share-bar');
  if (existingShare) existingShare.remove();

  setCharacterState('excited');
  showSpeechBubble('5세트 한번에! 대박 나세요! 🎉');
  if (navigator.vibrate) navigator.vibrate([50, 30, 50]);

  const container = document.createElement('div');
  container.className = 'multi-set-container';

  sets.forEach((nums, idx) => {
    const row = document.createElement('div');
    row.className = 'multi-set-row';
    row.style.animationDelay = `${idx * 120}ms`;

    const label = document.createElement('span');
    label.className = 'multi-set-label';
    label.textContent = String.fromCharCode(65 + idx); // A, B, C, D, E
    row.appendChild(label);

    const ballsWrap = document.createElement('div');
    ballsWrap.className = 'multi-set-balls';
    nums.forEach(n => ballsWrap.appendChild(createBall(n, true)));
    row.appendChild(ballsWrap);

    container.appendChild(row);
    addToHistory(nums, `${methodName} ${String.fromCharCode(65 + idx)}`);
  });

  resultArea.insertBefore(container, resultArea.firstChild);

  // 공유 버튼
  const shareBar = document.createElement('div');
  shareBar.className = 'share-bar';
  const allText = sets.map((nums, i) => `${String.fromCharCode(65+i)}: ${nums.join(', ')}`).join('\n');
  const shareText = `🍀 ${methodName} 5세트\n${allText}\n나도 뽑아보기 👉 https://nick1148.site`;

  shareBar.innerHTML = `
    <button class="share-btn share-copy"><span>📋</span> 복사</button>
    <button class="share-btn share-image"><span>📸</span> 이미지 저장</button>
  `;
  shareBar.querySelector('.share-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(shareText).then(() => showToast('5세트 번호 복사 완료! 🍀')).catch(() => {});
  });
  shareBar.querySelector('.share-image').addEventListener('click', () => {
    if (typeof html2canvas === 'undefined') { showToast('잠시 후 다시 시도해주세요.'); return; }
    showToast('이미지 생성 중...');
    html2canvas(container, { backgroundColor: '#fff5f9', scale: 2 }).then(canvas => {
      const link = document.createElement('a');
      link.download = `lotto-5set-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('이미지 저장 완료! 📸');
    });
  });
  resultArea.appendChild(shareBar);
  insertSupportNudge(resultArea);

  launchConfetti();
  resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  setTimeout(() => setCharacterState('idle'), 3000);
}

// ─── 당첨 번호 비교 ────────────────────────────────────
function compareWithLatest() {
  const latest = DataManager.getLatest();
  if (!latest || latest.numbers.length === 0) {
    showToast('당첨 데이터가 없습니다.');
    return;
  }

  const compareSection = document.getElementById('compareResult');
  if (!compareSection) return;

  if (generationHistory.length === 0) {
    compareSection.innerHTML = `
      <div class="compare-empty">
        <p>비교할 번호가 없어요. 먼저 번호를 생성해보세요!</p>
      </div>`;
    compareSection.style.display = 'block';
    return;
  }

  let html = `
    <div class="compare-header">
      <h3>🎯 제 ${latest.drwNo}회 당첨번호와 비교</h3>
      <div class="compare-latest-balls">
        ${latest.numbers.map(n => `<div class="ball ball-sm ${getBallColorClass(n)}">${n}</div>`).join('')}
      </div>
    </div>
    <div class="compare-list">
  `;

  generationHistory.slice(0, 10).forEach(({ numbers, methodName, date, time }) => {
    const matched = numbers.filter(n => latest.numbers.includes(n));
    const matchCount = matched.length;
    const bonusMatch = latest.bonusNo && numbers.includes(latest.bonusNo);

    let matchClass = 'match-0';
    let matchEmoji = '';
    if (matchCount >= 6) { matchClass = 'match-6'; matchEmoji = '🏆 1등!'; }
    else if (matchCount === 5 && bonusMatch) { matchClass = 'match-5b'; matchEmoji = '🥈 2등!'; }
    else if (matchCount === 5) { matchClass = 'match-5'; matchEmoji = '🥉 3등!'; }
    else if (matchCount === 4) { matchClass = 'match-4'; matchEmoji = '🎯 4등!'; }
    else if (matchCount === 3) { matchClass = 'match-3'; matchEmoji = '✨ 5등!'; }
    else { matchEmoji = `${matchCount}개 일치`; }

    const ballsHtml = numbers.map(n => {
      const isMatch = latest.numbers.includes(n);
      return `<div class="ball ball-sm ${getBallColorClass(n)} ${isMatch ? 'ball-matched' : 'ball-dimmed'}">${n}</div>`;
    }).join('');

    html += `
      <div class="compare-item ${matchClass}">
        <div class="compare-item-top">
          <span class="compare-method">${methodName}</span>
          <span class="compare-match-badge">${matchEmoji}</span>
        </div>
        <div class="compare-balls">${ballsHtml}</div>
      </div>
    `;
  });

  html += '</div>';
  compareSection.innerHTML = html;
  compareSection.style.display = 'block';
  compareSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── 공유 버튼 ───────────────────────────────────────────
function createShareButtons(tabId, numbers, methodName) {
  const existing = document.querySelector(`#result-${tabId} .share-bar`);
  if (existing) existing.remove();

  const bar = document.createElement('div');
  bar.className = 'share-bar';

  const numbersText = numbers.join(', ');
  const shareText = `🍀 ${methodName} 추천번호: ${numbersText}\n나도 뽑아보기 👉 https://nick1148.site`;

  bar.innerHTML = `
    <button class="share-btn share-copy" title="링크 복사">
      <span>📋</span> 링크 복사
    </button>
    <button class="share-btn share-image" title="이미지 저장">
      <span>📸</span> 이미지 저장
    </button>
    <button class="share-btn share-native" title="공유하기" style="display:none">
      <span>📤</span> 공유
    </button>
  `;

  // 링크 복사
  bar.querySelector('.share-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(shareText).then(() => {
      showToast('복사 완료! 친구에게 공유해보세요 🍀');
    }).catch(() => {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = shareText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showToast('복사 완료! 친구에게 공유해보세요 🍀');
    });
  });

  // 이미지 저장
  bar.querySelector('.share-image').addEventListener('click', () => {
    const resultArea = document.getElementById(`result-${tabId}`);
    if (!resultArea || typeof html2canvas === 'undefined') {
      showToast('잠시 후 다시 시도해주세요.');
      return;
    }

    showToast('이미지 생성 중...');
    html2canvas(resultArea, {
      backgroundColor: '#fff5f9',
      scale: 2,
      useCORS: true
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = `lotto-${methodName.replace(/[^가-힣a-zA-Z0-9]/g, '')}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('이미지가 저장되었습니다! 📸');
    }).catch(() => {
      showToast('이미지 생성에 실패했습니다.');
    });
  });

  // Web Share API (모바일)
  if (navigator.share) {
    const nativeBtn = bar.querySelector('.share-native');
    nativeBtn.style.display = '';
    nativeBtn.addEventListener('click', () => {
      navigator.share({
        title: '🍀 로또 번호 예상기',
        text: shareText,
        url: 'https://nick1148.site'
      }).catch(() => {});
    });
  }

  const resultArea = document.getElementById(`result-${tabId}`);
  resultArea.appendChild(bar);
}

// ─── 궁합 결과 표시 ──────────────────────────────────────
function displayChemistryResult(result) {
  const resultArea = document.getElementById('result-chemistry');
  resultArea.innerHTML = '';

  setCharacterState('excited');
  showSpeechBubble('두 사람의 행운이 만났어요! 💕');
  if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 50]);

  // 결과 카드 (html2canvas 캡처용)
  const card = document.createElement('div');
  card.className = 'chemistry-result-card';

  const ballsHtml = result.numbers.map(n =>
    `<div class="ball ${getBallColorClass(n)}">${n}</div>`
  ).join('');

  card.innerHTML = `
    <div class="chem-card-header">💕 로또 궁합 결과</div>
    <div class="chem-names">${result.name1} <span class="chem-heart-icon">♡</span> ${result.name2}</div>
    <div class="chem-score-area">
      <div class="chem-score-label">궁합 점수</div>
      <div class="chem-score-number"><span class="chem-score-value">0</span>%</div>
      <div class="chem-score-bar"><div class="chem-score-fill" style="width:0%"></div></div>
    </div>
    <div class="chem-element-info">
      <span class="chem-elem">${result.element1.name}(${result.element1.ko})</span>
      <span class="chem-elem-x">×</span>
      <span class="chem-elem">${result.element2.name}(${result.element2.ko})</span>
    </div>
    <div class="chem-element-desc">${result.elementDesc}</div>
    <div class="chem-numbers-label">🍀 공동 행운 번호</div>
    <div class="chem-balls balls-container">${ballsHtml}</div>
    <div class="chem-comment">"${result.comment}"</div>
    <div class="chem-watermark">nick1148.site</div>
  `;

  resultArea.appendChild(card);

  // 점수 카운트업 애니메이션
  const scoreEl = card.querySelector('.chem-score-value');
  const fillEl = card.querySelector('.chem-score-fill');
  let current = 0;
  const target = result.score;
  const step = Math.ceil(target / 30);
  const counter = setInterval(() => {
    current = Math.min(current + step, target);
    scoreEl.textContent = current;
    fillEl.style.width = current + '%';
    if (current >= target) clearInterval(counter);
  }, 30);

  // 공유 버튼
  const shareText = `💕 ${result.name1} ♡ ${result.name2} 로또 궁합 ${result.score}%!\n🍀 공동 행운 번호: ${result.numbers.join(', ')}\n같이 로또 사러 가자! 👉 https://nick1148.site`;

  const shareBar = document.createElement('div');
  shareBar.className = 'share-bar';
  shareBar.innerHTML = `
    <button class="share-btn share-copy"><span>📋</span> 복사</button>
    <button class="share-btn share-image"><span>📸</span> 이미지</button>
    <button class="share-btn share-story"><span>📱</span> 스토리용</button>
    <button class="share-btn share-native" style="display:none"><span>📤</span> 공유</button>
  `;

  shareBar.querySelector('.share-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(shareText).then(() => {
      showToast('궁합 결과 복사 완료! 친구에게 공유해보세요 💕');
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = shareText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showToast('궁합 결과 복사 완료! 💕');
    });
  });

  // 일반 이미지 저장
  shareBar.querySelector('.share-image').addEventListener('click', () => {
    if (typeof html2canvas === 'undefined') { showToast('잠시 후 다시 시도해주세요.'); return; }
    showToast('이미지 생성 중...');
    html2canvas(card, { backgroundColor: '#fff5f9', scale: 2, useCORS: true }).then(canvas => {
      const link = document.createElement('a');
      link.download = `lotto-chemistry-${result.name1}-${result.name2}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('궁합 카드 저장 완료! 📸');
    });
  });

  // 인스타 스토리용 세로 이미지 (9:16 비율)
  shareBar.querySelector('.share-story').addEventListener('click', () => {
    if (typeof html2canvas === 'undefined') { showToast('잠시 후 다시 시도해주세요.'); return; }
    showToast('스토리 이미지 생성 중...');
    html2canvas(card, { backgroundColor: '#fff5f9', scale: 2, useCORS: true }).then(srcCanvas => {
      // 9:16 비율 캔버스 생성 (1080x1920)
      const storyCanvas = document.createElement('canvas');
      storyCanvas.width = 1080;
      storyCanvas.height = 1920;
      const sCtx = storyCanvas.getContext('2d');

      // 배경 그라데이션
      const grad = sCtx.createLinearGradient(0, 0, 1080, 1920);
      grad.addColorStop(0, '#fff5f9');
      grad.addColorStop(1, '#f3e8ff');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 1080, 1920);

      // 상단 장식
      sCtx.fillStyle = '#ff7eb3';
      sCtx.font = 'bold 48px sans-serif';
      sCtx.textAlign = 'center';
      sCtx.fillText('🍀 로또 번호 예상기', 540, 200);

      // 카드를 중앙에 배치
      const cardW = srcCanvas.width;
      const cardH = srcCanvas.height;
      const maxW = 960;
      const scale = Math.min(maxW / cardW, 1);
      const drawW = cardW * scale;
      const drawH = cardH * scale;
      const drawX = (1080 - drawW) / 2;
      const drawY = (1920 - drawH) / 2 - 50;
      sCtx.drawImage(srcCanvas, drawX, drawY, drawW, drawH);

      // 하단 CTA
      sCtx.fillStyle = '#8a7a9c';
      sCtx.font = '36px sans-serif';
      sCtx.fillText('같이 로또 사러 가자! 💕', 540, 1720);
      sCtx.fillStyle = '#ff7eb3';
      sCtx.font = 'bold 40px sans-serif';
      sCtx.fillText('nick1148.site', 540, 1790);

      const link = document.createElement('a');
      link.download = `lotto-story-${result.name1}-${result.name2}-${Date.now()}.png`;
      link.href = storyCanvas.toDataURL('image/png');
      link.click();
      showToast('스토리용 이미지 저장 완료! 📱');
    });
  });

  if (navigator.share) {
    const nativeBtn = shareBar.querySelector('.share-native');
    nativeBtn.style.display = '';
    nativeBtn.addEventListener('click', () => {
      navigator.share({ title: '💕 로또 궁합 결과', text: shareText, url: 'https://nick1148.site' }).catch(() => {});
    });
  }

  resultArea.appendChild(shareBar);
  insertSupportNudge(resultArea);

  addToHistory(result.numbers, `💕 궁합 (${result.name1}♡${result.name2})`);
  launchConfetti();
  resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  setTimeout(() => setCharacterState('idle'), 3000);
}

// ─── 인라인 후원 nudge ──────────────────────────────────
function insertSupportNudge(container) {
  // 기존 nudge 제거
  const existing = container.querySelector('.result-support-nudge');
  if (existing) existing.remove();

  generateCount++;
  sessionStorage.setItem('genCount', generateCount);

  // 2회 이상 생성 시부터 표시
  if (generateCount < 2) return;

  const nudge = document.createElement('div');
  nudge.className = 'result-support-nudge';
  nudge.innerHTML = `
    <span>이 번호가 마음에 드셨다면...</span>
    <a href="https://qr.kakaopay.com/FM5t5VmBF" target="_blank" rel="noopener" class="nudge-link">☕ 개발자에게 커피 한잔</a>
  `;
  container.appendChild(nudge);
}

// ─── 유틸 ─────────────────────────────────────────────────
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
