/**
 * app.js - UI 이벤트 핸들러 및 공 애니메이션 제어
 */

// 생성 기록 (최대 20개)
let generationHistory = [];

// ─── 초기화 ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await initData();
  initTabs();
  initButtons();
  initHistory();
  updateSajuDisplay();
});

/**
 * 데이터 로드 및 헤더 업데이트
 */
async function initData() {
  await DataManager.loadHistory();

  const status = DataManager.getStatus();
  const latest = DataManager.getLatest();

  // 최근 회차 정보 업데이트
  const roundEl = document.getElementById('latestRound');
  const numbersEl = document.getElementById('latestNumbers');

  if (status.isUsingFallback || latest.numbers.length === 0) {
    roundEl.textContent = '데이터 없음';
    numbersEl.innerHTML = `
      <div class="data-status fallback">
        ⚠️ 역사 데이터 없음 — 폴백 통계 사용 중.
        <code>scripts/fetch_data.js</code> 실행 후 새로고침하세요.
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
      sep.style.cssText = 'color:#f0c040;font-weight:700;font-size:1.2rem;';
      numbersEl.appendChild(sep);
      const bonus = createBall(latest.bonusNo, true);
      bonus.style.opacity = '0.7';
      bonus.style.border = '2px dashed rgba(255,255,255,0.4)';
      numbersEl.appendChild(bonus);
    }

    // 데이터 상태 배너
    const statusBanner = document.createElement('div');
    statusBanner.className = 'data-status loaded';
    statusBanner.innerHTML = `✅ ${status.totalDraws}회차 데이터 로드 완료 (최근 ${status.recentDraws}회 분석)`;
    document.getElementById('latestNumbers').after(statusBanner);
  }

  // 자주 나온 / 안 나온 탭 info 채우기
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
    const numbers = LottoGenerator.generateRandom();
    displayResult('random', numbers, '🎲 완전 랜덤');
  });

  document.getElementById('btn-frequent').addEventListener('click', () => {
    const numbers = LottoGenerator.generateFrequent();
    displayResult('frequent', numbers, '🔥 자주 나온');
  });

  document.getElementById('btn-rare').addEventListener('click', () => {
    const numbers = LottoGenerator.generateRare();
    displayResult('rare', numbers, '❄️ 안 나온');
  });

  document.getElementById('btn-saju').addEventListener('click', () => {
    const dateVal = document.getElementById('birthDate').value;
    const hourIdx = parseInt(document.getElementById('birthHour').value);

    if (!dateVal) {
      showToast('생년월일을 입력해주세요.');
      return;
    }

    const [year, month, day] = dateVal.split('-').map(Number);
    const result = LottoGenerator.generateSaju(year, month, day, hourIdx);

    displayResult('saju', result.numbers, '✨ 내 사주');
    showSajuInfo(result.saju);
  });

  // 생년월일 변경 시 사주 미리보기
  document.getElementById('birthDate').addEventListener('change', updateSajuDisplay);
  document.getElementById('birthHour').addEventListener('change', updateSajuDisplay);

  // 기록 지우기
  document.getElementById('clearHistory').addEventListener('click', () => {
    generationHistory = [];
    renderHistory();
    showToast('기록이 삭제되었습니다.');
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

// ─── 결과 표시 ────────────────────────────────────────────
/**
 * 번호 결과 영역에 공 애니메이션과 함께 표시
 */
function displayResult(tabId, numbers, methodName) {
  const ballsContainer = document.getElementById(`balls-${tabId}`);
  const freqContainer = document.getElementById(`freq-${tabId}`);

  // 기존 내용 지우기
  ballsContainer.innerHTML = '';
  freqContainer.innerHTML = '';

  // 공 순서대로 애니메이션
  numbers.forEach((num, idx) => {
    setTimeout(() => {
      const ball = createBall(num);
      ball.style.animationDelay = `${idx * 80}ms`;
      ballsContainer.appendChild(ball);
    }, idx * 80);
  });

  // 빈도 차트 표시 (마지막 공 후)
  setTimeout(() => {
    renderFreqChart(freqContainer, numbers);
    addToHistory(numbers, methodName);
  }, numbers.length * 80 + 200);
}

// ─── 로또 공 생성 ─────────────────────────────────────────
/**
 * 번호에 맞는 색상의 공 엘리먼트 생성
 */
function createBall(number, small = false) {
  const ball = document.createElement('div');
  ball.className = `ball ${getBallColorClass(number)} ${small ? 'ball-sm' : ''}`;
  ball.textContent = number;
  ball.setAttribute('title', `${number}번 (출현 ${DataManager.getCount(number)}회)`);
  return ball;
}

/**
 * 번호 범위에 따른 CSS 클래스 반환
 */
function getBallColorClass(n) {
  if (n <= 10) return 'ball-1-10';
  if (n <= 20) return 'ball-11-20';
  if (n <= 30) return 'ball-21-30';
  if (n <= 40) return 'ball-31-40';
  return 'ball-41-45';
}

// ─── 빈도 차트 ────────────────────────────────────────────
/**
 * 선택된 번호들의 빈도 미니 바차트 렌더링
 */
function renderFreqChart(container, numbers) {
  const maxCount = DataManager.getMaxCount();
  const ranked = DataManager.getFrequencyRanked();

  // 번호의 랭킹 계산
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

    // 바 애니메이션
    requestAnimationFrame(() => {
      setTimeout(() => {
        item.querySelector('.freq-bar').style.width = `${pct}%`;
      }, 50);
    });
  });
}

/**
 * 공 색상 클래스 → 바 색상 CSS 값
 */
function getBarColor(ballClass) {
  const colors = {
    'ball-1-10': 'rgba(251, 196, 0, 0.7)',
    'ball-11-20': 'rgba(105, 200, 242, 0.7)',
    'ball-21-30': 'rgba(255, 114, 114, 0.7)',
    'ball-31-40': 'rgba(170, 170, 170, 0.7)',
    'ball-41-45': 'rgba(176, 216, 64, 0.7)'
  };
  return colors[ballClass] || 'rgba(240, 192, 64, 0.7)';
}

// ─── 생성 기록 ────────────────────────────────────────────
function initHistory() {
  renderHistory();
}

function addToHistory(numbers, methodName) {
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  generationHistory.unshift({ numbers, methodName, time: timeStr });
  if (generationHistory.length > 20) generationHistory.pop();
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('historyList');
  const clearBtn = document.getElementById('clearHistory');

  if (generationHistory.length === 0) {
    list.innerHTML = '<p class="history-empty">아직 생성된 번호가 없습니다.</p>';
    clearBtn.style.display = 'none';
    return;
  }

  clearBtn.style.display = 'block';
  list.innerHTML = '';

  generationHistory.forEach(({ numbers, methodName, time }) => {
    const item = document.createElement('div');
    item.className = 'history-item';

    const methodClass = getMethodClass(methodName);
    const ballsHtml = numbers.map(n =>
      `<div class="ball ball-sm ${getBallColorClass(n)}">${n}</div>`
    ).join('');

    item.innerHTML = `
      <span class="history-method ${methodClass}">${methodName}</span>
      <div class="history-balls">${ballsHtml}</div>
      <span class="history-time">${time}</span>
    `;
    list.appendChild(item);
  });
}

function getMethodClass(methodName) {
  if (methodName.includes('랜덤')) return 'method-random';
  if (methodName.includes('자주')) return 'method-frequent';
  if (methodName.includes('나온')) return 'method-rare';
  if (methodName.includes('사주')) return 'method-saju';
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
