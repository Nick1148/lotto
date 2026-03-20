/**
 * lotto.js - 4종 로또 번호 생성 알고리즘
 */

const LottoGenerator = (() => {
  /**
   * Fisher-Yates 셔플
   */
  function _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * 배열에서 n개 랜덤 선택
   */
  function _pick(pool, n) {
    return _shuffle(pool).slice(0, n).sort((a, b) => a - b);
  }

  /**
   * 1. 완전 랜덤 번호 생성
   * 1~45 중 6개 완전 무작위
   */
  function generateRandom() {
    const pool = Array.from({ length: 45 }, (_, i) => i + 1);
    return _pick(pool, 6);
  }

  /**
   * 2. 자주 나온 번호 생성
   * 빈도 상위 15개 풀에서 6개 선택
   */
  function generateFrequent() {
    const top15 = DataManager.getTopNumbers(15);
    return _pick(top15, 6);
  }

  /**
   * 3. 안 나온 번호 생성
   * 빈도 하위 15개 풀에서 6개 선택
   */
  function generateRare() {
    const bottom15 = DataManager.getBottomNumbers(15);
    return _pick(bottom15, 6);
  }

  /**
   * 4. 사주 기반 번호 생성
   * @param {number} year
   * @param {number} month
   * @param {number} day
   * @param {number} hourIdx  -1~11
   * @returns {{ numbers: number[], saju: Object }}
   */
  function generateSaju(year, month, day, hourIdx = -1) {
    return SajuCalculator.getSajuNumbers(year, month, day, hourIdx);
  }

  return { generateRandom, generateFrequent, generateRare, generateSaju };
})();
