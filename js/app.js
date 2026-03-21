/**
 * app.js - UI 이벤트 핸들러, 캐릭터 상태, confetti, localStorage
 */

// 생성 기록 (최대 20개)
let generationHistory = [];

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
    addToHistory(numbers, methodName);
    launchConfetti();

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

// ─── 유틸 ─────────────────────────────────────────────────
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
