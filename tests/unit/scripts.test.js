const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDraw } = require('../../scripts/fetch-lotto');
const { generateContent } = require('../../scripts/daily-content');

test('fetch-lotto: 회차 검증', () => {
  const ok = { drwNo: 1218, drwNoDate: '2026-04-04', numbers: [1, 2, 3, 4, 5, 6], bonusNo: 7 };
  assert.equal(validateDraw(ok, 1218), null);
  assert.match(validateDraw({ ...ok, drwNo: 1217 }, 1218), /drwNo/);
  assert.match(validateDraw({ ...ok, numbers: [1, 1, 3, 4, 5, 6] }, 1218), /duplicate/);
  assert.match(validateDraw({ ...ok, bonusNo: 6 }, 1218), /bonus/);
  assert.match(validateDraw({ ...ok, numbers: [1, 2, 3, 4, 5, 46] }, 1218), /range/);
});

test('daily-content: UTC 23:00 실행 시 KST 다음 날 날짜/요일 사용', () => {
  // 2026-10-30(금) 23:00 UTC = 2026-10-31(토) 08:00 KST
  const c = generateContent(new Date(Date.UTC(2026, 9, 30, 23, 0)));
  assert.equal(c.dateStr, '2026-10-31');
  assert.equal(c.dayName, '토');
  assert.equal(c.isSaturday, true);
  assert.equal(c.month, 10);
  assert.equal(c.date, 31);
  assert.equal(c.numbers.length, 6);
});
