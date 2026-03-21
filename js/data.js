/**
 * data.js - 로또 역대 당첨번호 데이터 로드 및 빈도 분석
 */

const DataManager = (() => {
  // 상태
  let _history = [];       // [{drwNo, drwNoDate, numbers: [n1..n6], bonusNo}]
  let _frequency = null;   // Map<number, count>
  let _isLoaded = false;
  let _isUsingFallback = false;

  // ─── 폴백 빈도 데이터 (역대 통계 근사값, ~1000회 기준) ───
  // 출처: 동행복권 공식 통계 기반 근사치
  const FALLBACK_FREQUENCY = {
    1: 152, 2: 120, 3: 138, 4: 125, 5: 143, 6: 158, 7: 155, 8: 141,
    9: 150, 10: 137, 11: 128, 12: 145, 13: 122, 14: 148, 15: 126,
    16: 140, 17: 162, 18: 144, 19: 135, 20: 129, 21: 123, 22: 139,
    23: 153, 24: 121, 25: 147, 26: 124, 27: 160, 28: 136, 29: 142,
    30: 127, 31: 133, 32: 119, 33: 146, 34: 165, 35: 155, 36: 125,
    37: 138, 38: 143, 39: 157, 40: 149, 41: 118, 42: 130, 43: 161,
    44: 116, 45: 151
  };

  // 폴백 최근 회차 정보 (실제 데이터 없을 때)
  const FALLBACK_LATEST = {
    drwNo: '(데이터 없음)',
    drwNoDate: '',
    numbers: [],
    bonusNo: null
  };

  /**
   * JSON 데이터 파일에서 로또 역사 로드
   */
  async function loadHistory() {
    try {
      const response = await fetch('data/lotto_history.json');
      if (!response.ok) throw new Error('파일 로드 실패');

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        console.warn('[DataManager] JSON 파일이 비어있음. 폴백 데이터 사용.');
        _useFallback();
        return;
      }

      _history = data;
      _buildFrequency();
      _isLoaded = true;
      _isUsingFallback = false;
      console.log(`[DataManager] ${_history.length}회차 데이터 로드 완료.`);
    } catch (err) {
      console.warn('[DataManager] 데이터 로드 실패, 폴백 사용:', err.message);
      _useFallback();
    }
  }

  /**
   * 폴백 데이터로 전환
   */
  function _useFallback() {
    _frequency = new Map(Object.entries(FALLBACK_FREQUENCY).map(([k, v]) => [Number(k), v]));
    _isUsingFallback = true;
    _isLoaded = true;
  }

  /**
   * 로드된 히스토리에서 빈도 테이블 구축
   * 최근 10년 데이터만 사용 (약 520회차)
   */
  function _buildFrequency() {
    _frequency = new Map();
    for (let i = 1; i <= 45; i++) _frequency.set(i, 0);

    // 최근 520회차만 (10년치)
    const recent = _history.slice(-520);
    for (const draw of recent) {
      for (const n of draw.numbers) {
        _frequency.set(n, (_frequency.get(n) || 0) + 1);
      }
    }
  }

  /**
   * 빈도 테이블 반환 (Map<number, count>)
   */
  function getFrequency() {
    if (!_frequency) _useFallback();
    return _frequency;
  }

  /**
   * 빈도 순서로 정렬된 배열 반환
   * @returns [{number, count}] - 빈도 높은 순
   */
  function getFrequencyRanked() {
    const freq = getFrequency();
    return Array.from(freq.entries())
      .map(([number, count]) => ({ number, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 빈도 상위 N개 번호 반환
   */
  function getTopNumbers(n = 15) {
    return getFrequencyRanked().slice(0, n).map(x => x.number);
  }

  /**
   * 빈도 하위 N개 번호 반환
   */
  function getBottomNumbers(n = 15) {
    return getFrequencyRanked().slice(-n).map(x => x.number);
  }

  /**
   * 최신 회차 정보 반환
   */
  function getLatest() {
    if (_history.length === 0) return FALLBACK_LATEST;
    return _history[_history.length - 1];
  }

  /**
   * 특정 번호의 출현 횟수 반환
   */
  function getCount(number) {
    const freq = getFrequency();
    return freq.get(number) || 0;
  }

  /**
   * 특정 번호의 전체 빈도 중 최댓값 (차트 스케일링용)
   */
  function getMaxCount() {
    const freq = getFrequency();
    return Math.max(...freq.values());
  }

  /**
   * 데이터 상태 반환
   */
  function getStatus() {
    return {
      isLoaded: _isLoaded,
      isUsingFallback: _isUsingFallback,
      totalDraws: _history.length,
      recentDraws: Math.min(_history.length, 520)
    };
  }

  /**
   * 역대 합계 분포 반환 (합계 → 출현 횟수)
   */
  function getHistoricalSumDistribution() {
    const dist = {};
    const data = _history.length > 0 ? _history : [];
    for (const draw of data) {
      const sum = draw.numbers.reduce((a, b) => a + b, 0);
      dist[sum] = (dist[sum] || 0) + 1;
    }
    return dist;
  }

  /**
   * 역대 홀짝 비율 분포 반환 (홀수개수 → 출현 횟수)
   */
  function getHistoricalOddEvenDistribution() {
    const dist = {};
    const data = _history.length > 0 ? _history : [];
    for (const draw of data) {
      const oddCount = draw.numbers.filter(n => n % 2 === 1).length;
      const key = `${oddCount}:${6 - oddCount}`;
      dist[key] = (dist[key] || 0) + 1;
    }
    return dist;
  }

  /**
   * 특정 번호의 미출현 회차 (최근 연속 미출현 수)
   */
  function getNumberGap(number) {
    if (_history.length === 0) return 0;
    let gap = 0;
    for (let i = _history.length - 1; i >= 0; i--) {
      if (_history[i].numbers.includes(number)) break;
      gap++;
    }
    return gap;
  }

  return {
    loadHistory,
    getFrequency,
    getFrequencyRanked,
    getTopNumbers,
    getBottomNumbers,
    getLatest,
    getCount,
    getMaxCount,
    getStatus,
    getHistoricalSumDistribution,
    getHistoricalOddEvenDistribution,
    getNumberGap
  };
})();
