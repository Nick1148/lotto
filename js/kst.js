/**
 * kst.js - 한국 표준시(KST, UTC+9) 날짜 유틸
 * 사용자 기기 시간대와 무관하게 "한국 날짜" 기준으로 출석·미션·운세가 바뀌도록 한다.
 * (한국은 서머타임이 없으므로 고정 +9시간 오프셋으로 충분)
 */

const KST = (() => {
  const OFFSET_MS = 9 * 60 * 60 * 1000;
  const DAY_MS = 24 * 60 * 60 * 1000;

  // KST 벽시계 값을 UTC 필드로 갖는 Date (getUTC* 로만 읽을 것)
  function _shifted(date) {
    return new Date((date ? date.getTime() : Date.now()) + OFFSET_MS);
  }

  function _pad(n) { return String(n).padStart(2, '0'); }

  /**
   * KST 기준 날짜/시간 구성요소
   * @returns {{year, month, day, hours, minutes, seconds, dayOfWeek}}
   */
  function parts(date) {
    const d = _shifted(date);
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hours: d.getUTCHours(),
      minutes: d.getUTCMinutes(),
      seconds: d.getUTCSeconds(),
      dayOfWeek: d.getUTCDay()
    };
  }

  /** KST 기준 'YYYY-MM-DD' */
  function today(date) {
    const p = parts(date);
    return `${p.year}-${_pad(p.month)}-${_pad(p.day)}`;
  }

  /** 'YYYY-MM-DD' 문자열에 n일을 더한 'YYYY-MM-DD' */
  function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d) + n * DAY_MS);
    return `${t.getUTCFullYear()}-${_pad(t.getUTCMonth() + 1)}-${_pad(t.getUTCDate())}`;
  }

  /** 'YYYY-MM-DD' 의 요일 (0=일) */
  function dayOfWeek(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  }

  /** YYYYMMDD 정수 (날짜 시드용) */
  function dateSeed(date) {
    const p = parts(date);
    return p.year * 10000 + p.month * 100 + p.day;
  }

  /** 오늘 KST hour:00:00 까지 남은 밀리초 (지났으면 음수) */
  function msUntilHour(hour, date) {
    const now = date ? date.getTime() : Date.now();
    const p = parts(date);
    const target = Date.UTC(p.year, p.month - 1, p.day, hour, 0, 0) - OFFSET_MS;
    return target - now;
  }

  /**
   * 'YYYY-MM-DD' 가 실제 존재하는 날짜인지 검사
   */
  function isValidDateStr(dateStr) {
    if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d));
    return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
  }

  return { parts, today, addDays, dayOfWeek, dateSeed, msUntilHour, isValidDateStr };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = KST;
