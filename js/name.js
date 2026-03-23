/**
 * name.js - 이름 기반 로또 번호 생성 모듈
 * 한글 자모 분리 + 획수 + 오행 기반
 */

const NameGenerator = (() => {
  // 초성 획수 테이블 (성명학 기반)
  const CHO_STROKES = [1, 2, 2, 3, 3, 4, 2, 3, 4, 4, 4, 4, 2, 3, 1, 3, 3, 3, 2];
  // 중성 획수 테이블
  const JUNG_STROKES = [2, 3, 3, 2, 3, 4, 3, 2, 3, 3, 3, 4, 3, 3, 2, 3, 4, 4, 3, 3, 1];
  // 종성 획수 테이블 (0번=종성없음)
  const JONG_STROKES = [0, 2, 3, 4, 5, 2, 5, 1, 3, 4, 5, 6, 7, 3, 4, 2, 3, 4, 2, 3, 1, 3, 4, 4, 3, 5, 1, 2];

  // 초성 목록 (19개)
  const CHO_LIST = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  // 중성 목록 (21개)
  const JUNG_LIST = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  // 종성 목록 (28개, 0번은 없음)
  const JONG_LIST = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

  // 오행 이름 & 설명
  const ELEMENTS = [
    { name: '水', ko: '수', desc: '지혜와 유연함', range: [36, 45] },  // 0, 9
    { name: '木', ko: '목', desc: '성장과 생명력', range: [1, 9] },    // 1, 2
    { name: '木', ko: '목', desc: '성장과 생명력', range: [1, 9] },    // 2
    { name: '火', ko: '화', desc: '열정과 활력', range: [10, 18] },    // 3, 4
    { name: '火', ko: '화', desc: '열정과 활력', range: [10, 18] },    // 4
    { name: '土', ko: '토', desc: '안정과 중심', range: [19, 27] },    // 5, 6
    { name: '土', ko: '토', desc: '안정과 중심', range: [19, 27] },    // 6
    { name: '金', ko: '금', desc: '결단과 의지', range: [28, 36] },    // 7, 8
    { name: '金', ko: '금', desc: '결단과 의지', range: [28, 36] },    // 8
    { name: '水', ko: '수', desc: '지혜와 유연함', range: [36, 45] }   // 9
  ];

  /**
   * 한글 자모 분해
   * @param {string} char - 한글 한 글자
   * @returns {{ cho: number, jung: number, jong: number } | null}
   */
  function decompose(char) {
    const code = char.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) return null;

    const cho = Math.floor(code / 588);
    const jung = Math.floor((code % 588) / 28);
    const jong = code % 28;

    return { cho, jung, jong };
  }

  /**
   * 이름의 총 획수 계산
   */
  function calcStrokes(name) {
    let total = 0;
    const decomposed = [];

    for (const char of name) {
      const d = decompose(char);
      if (d) {
        const strokes = CHO_STROKES[d.cho] + JUNG_STROKES[d.jung] + JONG_STROKES[d.jong];
        total += strokes;
        decomposed.push({
          char,
          cho: CHO_LIST[d.cho],
          jung: JUNG_LIST[d.jung],
          jong: JONG_LIST[d.jong],
          strokes,
          choIdx: d.cho,
          jungIdx: d.jung,
          jongIdx: d.jong
        });
      } else {
        // 한글 외 문자: charCode 자체를 seed에 활용
        total += char.charCodeAt(0) % 20 + 1;
        decomposed.push({
          char,
          cho: '',
          jung: '',
          jong: '',
          strokes: char.charCodeAt(0) % 20 + 1,
          choIdx: 0,
          jungIdx: 0,
          jongIdx: 0
        });
      }
    }

    return { total, decomposed };
  }

  /**
   * 오행 결정
   */
  function getElement(totalStrokes) {
    const idx = totalStrokes % 10;
    return ELEMENTS[idx];
  }

  /**
   * seed 생성
   */
  function calcSeed(name) {
    const { total, decomposed } = calcStrokes(name);
    let seed = 0;

    for (const d of decomposed) {
      seed += d.choIdx * 100 + d.jungIdx * 10 + d.jongIdx;
    }
    seed += total * 997;

    return { seed, total, decomposed };
  }

  /**
   * 이름 기반 번호 생성 (공개 API)
   * @param {string} name - 이름 (2~10자)
   * @returns {{ numbers: number[], nameInfo: Object }}
   */
  function getNameNumbers(name) {
    const { seed, total, decomposed } = calcSeed(name);
    const element = getElement(total);
    const numbers = SajuCalculator.generateNumbers(seed);

    return {
      numbers,
      nameInfo: {
        name,
        strokes: total,
        element,
        decomposed
      }
    };
  }

  return { getNameNumbers, calcSeed, getElement };
})();
