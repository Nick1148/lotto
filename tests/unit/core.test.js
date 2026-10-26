const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { load } = require('./load');

const ALL = ['kst.js', 'data.js', 'analysis.js', 'saju.js', 'name.js', 'chemistry.js', 'mbti.js', 'lotto.js', 'gamification.js'];

// vm 컨텍스트에서 온 배열/객체는 프로토타입이 달라 deepStrictEqual 이 실패하므로 평범한 값으로 변환
const plain = (x) => JSON.parse(JSON.stringify(x));

function assertValidSet(nums) {
  nums = plain(nums);
  assert.equal(nums.length, 6);
  assert.equal(new Set(nums).size, 6, '중복 없음');
  nums.forEach(n => assert.ok(Number.isInteger(n) && n >= 1 && n <= 45, `범위: ${n}`));
  assert.deepEqual([...nums].sort((a, b) => a - b), nums, '오름차순');
}

// ─── KST ───
test('KST: UTC 저녁은 한국 날짜로 다음 날', () => {
  const { KST } = load(['kst.js']);
  const d = new Date(Date.UTC(2026, 9, 26, 20, 0)); // KST 10-27 05:00
  assert.equal(KST.today(d), '2026-10-27');
  assert.equal(KST.parts(d).hours, 5);
  assert.equal(KST.today(new Date(Date.UTC(2026, 9, 26, 14, 59))), '2026-10-26');
  assert.equal(KST.today(new Date(Date.UTC(2026, 9, 26, 15, 0))), '2026-10-27');
});

test('KST: 날짜 더하기/요일/유효성 경계값', () => {
  const { KST } = load(['kst.js']);
  assert.equal(KST.addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(KST.addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(KST.addDays('2026-02-28', 1), '2026-03-01');
  assert.equal(KST.dayOfWeek('2026-10-31'), 6); // 토요일
  assert.equal(KST.isValidDateStr('2026-02-30'), false);
  assert.equal(KST.isValidDateStr('2024-02-29'), true);
  assert.equal(KST.isValidDateStr('abc'), false);
  assert.equal(KST.isValidDateStr(''), false);
});

// ─── 사주 ───
test('사주: 일주 기준일이 실제 간지와 일치', () => {
  const { SajuCalculator } = load(ALL);
  const day = (y, m, d) => { const p = SajuCalculator.calculate(y, m, d).dayPillar; return p.gan.hanja + p.ji.hanja; };
  assert.equal(day(2000, 1, 1), '戊午');
  assert.equal(day(1900, 1, 1), '甲戌');
  assert.equal(day(2024, 1, 1), '甲子');
});

test('사주: 연주(1984 갑자년)와 시주(자시=0) 처리', () => {
  const { SajuCalculator } = load(ALL);
  const s = SajuCalculator.calculate(1984, 6, 15, 0);
  assert.equal(s.yearPillar.gan.hanja + s.yearPillar.ji.hanja, '甲子');
  assert.ok(s.hourPillar, '자시(0)는 시주가 있어야 함');
  assert.equal(s.hourPillar.ji.hanja, '子');
  assert.equal(SajuCalculator.calculate(1984, 6, 15, -1).hourPillar, null);
});

test('사주: 같은 입력이면 같은 번호, 항상 유효한 6개', () => {
  const { LottoGenerator } = load(ALL);
  const a = LottoGenerator.generateSaju(1990, 1, 1, -1).numbers;
  const b = LottoGenerator.generateSaju(1990, 1, 1, -1).numbers;
  assert.deepEqual(plain(a), plain(b));
  for (let y = 1930; y <= 2010; y += 7) assertValidSet(LottoGenerator.generateSaju(y, 12, 31, 11).numbers);
});

// ─── 생성기 ───
test('랜덤/빈도/희소 번호는 항상 유효한 조합', () => {
  const { LottoGenerator, DataManager } = load(ALL);
  const top = DataManager.getTopNumbers(15);
  const bottom = DataManager.getBottomNumbers(15);
  for (let i = 0; i < 200; i++) {
    assertValidSet(LottoGenerator.generateRandom());
    const f = LottoGenerator.generateFrequent();
    assertValidSet(f);
    f.forEach(n => assert.ok(top.includes(n)));
    const r = LottoGenerator.generateRare();
    assertValidSet(r);
    r.forEach(n => assert.ok(bottom.includes(n)));
  }
});

test('통계 필터: 결과가 조건을 만족', () => {
  const { LottoGenerator, NumberAnalyzer } = load(ALL);
  for (let i = 0; i < 100; i++) {
    const nums = LottoGenerator.smartFilter(LottoGenerator.generateRandom, [], true);
    assert.ok(NumberAnalyzer.passesFilter(nums));
  }
});

test('분석: 경계값 (합 100/175, 연속 3개)', () => {
  const { NumberAnalyzer } = load(ALL);
  assert.equal(NumberAnalyzer.analyze([1, 2, 3, 30, 31, 33]).sum.total, 100);
  assert.equal(NumberAnalyzer.analyze([1, 2, 3, 30, 31, 33]).sum.inRange, true);
  assert.equal(NumberAnalyzer.analyze([1, 2, 3, 30, 31, 33]).consecutive.maxRun, 3);
  assert.equal(NumberAnalyzer.passesFilter([1, 2, 3, 30, 31, 33]), false);
  assert.equal(NumberAnalyzer.passesFilter([10, 22, 30, 33, 39, 41]), true); // 합 175
  assert.equal(NumberAnalyzer.passesFilter([10, 22, 30, 33, 39, 42]), false); // 합 176
});

test('이름: 한글/영문/이모지 모두 유효한 번호', () => {
  const { LottoGenerator } = load(ALL);
  for (const name of ['김다현', 'Alex', '홍길동전', '🍀행운', 'a<b']) {
    const r = LottoGenerator.generateName(name);
    assertValidSet(r.numbers);
    assert.ok(r.nameInfo.element);
  }
});

test('MBTI: 잘못된 유형은 기본값으로, 날짜는 KST 기준', () => {
  // UTC 10-26 20:00 와 UTC 10-27 01:00 은 모두 KST 10-27 → 같은 번호
  const a = load(ALL, { now: Date.UTC(2026, 9, 26, 20, 0) });
  const b = load(ALL, { now: Date.UTC(2026, 9, 27, 1, 0) });
  const ra = a.MbtiGenerator.getMbtiNumbers('ENFP');
  assert.deepEqual(plain(ra.numbers), plain(b.MbtiGenerator.getMbtiNumbers('ENFP').numbers));
  assert.equal(ra.mbtiInfo.date, '2026.10.27');
  const bad = a.MbtiGenerator.getMbtiNumbers('');
  assert.equal(bad.mbtiInfo.type, 'ENFP');
  assertValidSet(bad.numbers);
});

test('궁합: 이름 순서와 무관, 점수 60~95', () => {
  const { ChemistryGenerator } = load(ALL);
  const a = ChemistryGenerator.getChemistry('철수', '영희');
  const b = ChemistryGenerator.getChemistry('영희', '철수');
  assert.deepEqual(plain(a.numbers), plain(b.numbers));
  assert.equal(a.score, b.score);
  assert.ok(a.score >= 60 && a.score <= 95);
  assertValidSet(a.numbers);
});

// ─── 데이터 ───
test('당첨번호 데이터 파일: 모든 회차가 유효하고 연속', () => {
  const { DataManager } = load(ALL);
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../data/lotto_history.json'), 'utf8'));
  assert.ok(data.length > 0);
  data.forEach(d => assert.ok(DataManager.isValidDraw(d), `회차 ${d.drwNo}`));
  for (let i = 1; i < data.length; i++) assert.equal(data[i].drwNo, data[i - 1].drwNo + 1);
});

test('데이터 검증: 잘못된 회차 거부', () => {
  const { DataManager } = load(ALL);
  assert.equal(DataManager.isValidDraw({ drwNo: 1, numbers: [1, 2, 3, 4, 5, 5], bonusNo: 7 }), false);
  assert.equal(DataManager.isValidDraw({ drwNo: 1, numbers: [0, 2, 3, 4, 5, 6], bonusNo: 7 }), false);
  assert.equal(DataManager.isValidDraw({ drwNo: 1, numbers: [1, 2, 3, 4, 5, 46], bonusNo: 7 }), false);
  assert.equal(DataManager.isValidDraw(null), false);
  assert.equal(DataManager.isValidDraw({ drwNo: 1, numbers: [1, 2, 3, 4, 5, 6], bonusNo: 7 }), true);
});

// ─── 게이미피케이션 ───
test('출석: KST 자정 직후(UTC 전날)에도 오늘 날짜로 기록', () => {
  const { GameSystem } = load(ALL, { now: Date.UTC(2026, 9, 26, 15, 30) }); // KST 10-27 00:30
  GameSystem.load();
  const r = GameSystem.checkIn();
  assert.equal(r.rewarded, true);
  assert.equal(GameSystem.getStreak().lastCheckIn, '2026-10-27');
  assert.equal(GameSystem.checkIn().alreadyDone, true);
});

test('출석: 어제(KST) 출석했으면 스트릭 증가, 이틀 비면 리셋', () => {
  const env = load(ALL, { now: Date.UTC(2026, 9, 27, 3, 0) }); // KST 10-27 12:00
  const save = (st) => env.ctx.localStorage.setItem('lotto_game', JSON.stringify(st));
  save({ lastCheckIn: '2026-10-26', streak: 4, longestStreak: 4, balance: 10 });
  env.GameSystem.load();
  assert.equal(env.GameSystem.checkIn().streak, 5);

  save({ lastCheckIn: '2026-10-24', streak: 4, longestStreak: 4, balance: 10 });
  env.GameSystem.load();
  assert.equal(env.GameSystem.checkIn().streak, 1);
});

test('상태: 손상된 저장 데이터를 안전하게 복구, 기본값 공유 오염 없음', () => {
  const env = load(ALL);
  env.ctx.localStorage.setItem('lotto_game', JSON.stringify({ balance: 'lots', lockedNumbers: 'x', triedMethods: null, achievements: [] }));
  env.GameSystem.load();
  assert.equal(env.GameSystem.getBalance(), 5);
  assert.deepEqual(plain(env.GameSystem.getLockedNumbers()), []);

  env.ctx.localStorage.setItem('lotto_game', '{not json');
  env.GameSystem.load();
  env.GameSystem.recordGeneration('random');
  // 새로 로드한 기본 상태에 이전 기록이 섞이면 안 됨
  env.ctx.localStorage.removeItem('lotto_game');
  env.GameSystem.load();
  assert.deepEqual(plain(env.GameSystem.getState().triedMethods), []);
});

test('클로버: 잔액 부족 시 사용 불가, 잠금 최대 5개', () => {
  const env = load(ALL);
  env.ctx.localStorage.setItem('lotto_game', JSON.stringify({ balance: 3 }));
  env.GameSystem.load();
  assert.equal(env.GameSystem.spendClovers(5, 't'), false);
  assert.equal(env.GameSystem.getBalance(), 3);
  assert.equal(env.GameSystem.buyStreakShield(), false);
  env.GameSystem.addClovers(100);
  for (let i = 0; i < 5; i++) assert.equal(env.GameSystem.lockNumbers([1, 2, 3, 4, 5, 6]), true);
  assert.equal(env.GameSystem.lockNumbers([1, 2, 3, 4, 5, 6]), false);
});

test('이벤트: 토요일 판정은 KST 기준', () => {
  // UTC 금요일 16:00 = KST 토요일 01:00
  const { GameSystem } = load(ALL, { now: Date.UTC(2026, 9, 30, 16, 0) });
  assert.equal(GameSystem.getActiveEvent().id, 'saturday');
});

test('출석 달력: 마지막 출석일 기준 streak 만큼 체크', () => {
  const env = load(ALL, { now: Date.UTC(2026, 9, 27, 3, 0) });
  env.ctx.localStorage.setItem('lotto_game', JSON.stringify({ lastCheckIn: '2026-10-26', streak: 3 }));
  env.GameSystem.load();
  const cal = env.GameSystem.getCheckInCalendar();
  assert.equal(cal.length, 7);
  assert.equal(cal[6].date, '2026-10-27');
  assert.equal(cal[6].isToday, true);
  assert.deepEqual(plain(cal.map(d => d.checkedIn)), [false, false, false, true, true, true, false]);
});
