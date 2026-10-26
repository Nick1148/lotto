// 브라우저용 전역 스크립트(js/*.js)를 Node vm 컨텍스트에 순서대로 로드하는 헬퍼
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    clear: () => m.clear()
  };
}

/**
 * @param {string[]} files - js/ 아래 파일명
 * @param {{ now?: number }} opts - 고정 현재 시각(ms)
 */
function load(files, opts = {}) {
  const RealDate = Date;
  const fixed = opts.now;
  class FakeDate extends RealDate {
    constructor(...args) {
      if (args.length === 0 && fixed !== undefined) super(fixed);
      else super(...args);
    }
    static now() { return fixed !== undefined ? fixed : RealDate.now(); }
  }
  const ctx = {
    console, Math, JSON, Map, Set, Array, Object, Number, String, Promise,
    Date: fixed !== undefined ? FakeDate : RealDate,
    localStorage: makeStorage(),
    sessionStorage: makeStorage(),
    setTimeout, clearTimeout
  };
  vm.createContext(ctx);
  let code = '';
  for (const f of files) code += fs.readFileSync(path.join(__dirname, '..', '..', 'js', f), 'utf8') + '\n';
  // const 전역은 컨텍스트 속성이 되지 않으므로 명시적으로 노출
  code += '\n;({ KST: typeof KST !== "undefined" ? KST : undefined,' +
    ' DataManager: typeof DataManager !== "undefined" ? DataManager : undefined,' +
    ' NumberAnalyzer: typeof NumberAnalyzer !== "undefined" ? NumberAnalyzer : undefined,' +
    ' SajuCalculator: typeof SajuCalculator !== "undefined" ? SajuCalculator : undefined,' +
    ' NameGenerator: typeof NameGenerator !== "undefined" ? NameGenerator : undefined,' +
    ' MbtiGenerator: typeof MbtiGenerator !== "undefined" ? MbtiGenerator : undefined,' +
    ' ChemistryGenerator: typeof ChemistryGenerator !== "undefined" ? ChemistryGenerator : undefined,' +
    ' LottoGenerator: typeof LottoGenerator !== "undefined" ? LottoGenerator : undefined,' +
    ' GameSystem: typeof GameSystem !== "undefined" ? GameSystem : undefined })';
  const exported = vm.runInContext(code, ctx);
  return Object.assign(exported, { ctx });
}

module.exports = { load };
