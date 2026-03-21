/**
 * analysis.js - 번호 분석 카드 (합계/홀짝/고저/연속/종합 점수)
 */

const NumberAnalyzer = (() => {
  /**
   * 6개 번호를 분석하여 결과 객체 반환
   * @param {number[]} numbers - 정렬된 6개 번호
   * @returns {Object} 분석 결과
   */
  function analyze(numbers) {
    const sum = analyzeSum(numbers);
    const oddEven = analyzeOddEven(numbers);
    const highLow = analyzeHighLow(numbers);
    const consecutive = analyzeConsecutive(numbers);
    const score = calcScore(sum, oddEven, highLow, consecutive);

    return { sum, oddEven, highLow, consecutive, score };
  }

  // ─── 합계 분석 ───
  function analyzeSum(numbers) {
    const total = numbers.reduce((a, b) => a + b, 0);
    const inRange = total >= 100 && total <= 175;
    return {
      total,
      inRange,
      label: inRange
        ? `이 번호의 합: ${total} ✅`
        : `이 번호의 합: ${total}`,
      detail: inRange
        ? '역대 당첨 조합에서 가장 많이 나오는 합계 구간이에요!'
        : '평소와는 조금 다른 합계 구간이에요',
      points: inRange ? 25 : 10
    };
  }

  // ─── 홀짝 비율 ───
  function analyzeOddEven(numbers) {
    const odd = numbers.filter(n => n % 2 === 1).length;
    const even = 6 - odd;
    const balanced = odd >= 2 && odd <= 4;
    const perfect = odd === 3;

    let label = `홀짝 ${odd}:${even}`;
    if (perfect) label += ' — 가장 많이 나오는 비율!';
    else if (balanced) label += ' — 균형 잡힌 비율!';

    let points = 10;
    if (perfect) points = 25;
    else if (balanced) points = 20;

    return { odd, even, balanced, perfect, label, points };
  }

  // ─── 고저 밸런스 ───
  function analyzeHighLow(numbers) {
    const low = numbers.filter(n => n <= 22).length;
    const high = 6 - low;
    const balanced = low >= 2 && low <= 4;
    const perfect = low === 3;

    let label = `저번호 ${low}개 / 고번호 ${high}개`;
    if (perfect) label += ' — 완벽한 균형!';
    else if (balanced) label += ' — 좋은 균형!';

    let points = 10;
    if (perfect) points = 25;
    else if (balanced) points = 20;

    return { low, high, balanced, perfect, label, points };
  }

  // ─── 연속번호 분석 ───
  function analyzeConsecutive(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    let pairs = 0;
    let maxRun = 1;
    let currentRun = 1;

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        currentRun++;
        if (currentRun === 2) pairs++;
      } else {
        currentRun = 1;
      }
      maxRun = Math.max(maxRun, currentRun);
    }

    const good = maxRun <= 2;
    let label, points;

    if (pairs === 0) {
      label = '연속 번호 없음 ✅';
      points = 25;
    } else if (maxRun <= 2) {
      label = `연속 번호 ${pairs}쌍 포함`;
      points = 20;
    } else {
      label = `연속 ${maxRun}개 포함`;
      points = 10;
    }

    return { pairs, maxRun, good, label, points };
  }

  // ─── 종합 점수 계산 ───
  function calcScore(sum, oddEven, highLow, consecutive) {
    const total = sum.points + oddEven.points + highLow.points + consecutive.points;
    const emoji = total >= 85 ? '🍀' : total >= 65 ? '✨' : '🔥';

    let comment;
    if (total >= 85) {
      comment = '내가 분석해봤는데, 꽤 괜찮은 조합이야!';
    } else if (total >= 65) {
      comment = '나쁘지 않은 조합이야, 기대해봐!';
    } else {
      comment = '도전적인 조합이네! 역발상도 전략이야!';
    }

    return { total, emoji, comment };
  }

  /**
   * 스마트 필터 조건 충족 여부 확인
   */
  function passesFilter(numbers) {
    const sum = numbers.reduce((a, b) => a + b, 0);
    if (sum < 100 || sum > 175) return false;

    const odd = numbers.filter(n => n % 2 === 1).length;
    if (odd < 2 || odd > 4) return false;

    const low = numbers.filter(n => n <= 22).length;
    if (low < 2 || low > 4) return false;

    const sorted = [...numbers].sort((a, b) => a - b);
    let maxRun = 1, currentRun = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) {
        currentRun++;
        maxRun = Math.max(maxRun, currentRun);
      } else {
        currentRun = 1;
      }
    }
    if (maxRun > 2) return false;

    return true;
  }

  return { analyze, passesFilter };
})();
