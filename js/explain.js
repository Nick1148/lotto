/**
 * explain.js - 추천 이유 설명 엔진 (사주학 고도화 버전)
 * 4파트 템플릿 조합: opening → analysis → numbers → closing
 * 사주 / 이름 / MBTI 공통
 */

const ExplainEngine = (() => {
  // ─── 사주 템플릿 (대폭 확장) ──────────────────────────────
  const SAJU = {
    opening: [
      // 일간 성격 기반
      '{ilganName}의 기운을 타고난 당신, {ilganNature}의 성질처럼 {ilganPersonality}.',
      '당신의 일간은 {ilganName} — {ilganNature}의 기운이 오늘 특별하게 빛나고 있어요.',
      '{ilganNature}처럼 {ilganPersonality} 당신에게 사주가 보내는 메시지가 있어요.',
      '사주의 중심인 일간 {ilganName}이 오늘 강한 기운을 발하고 있습니다.',
      '{ilganName}의 기운을 지닌 당신, 오늘은 {luckyColor} 계열이 행운을 부르는 날이에요.',
      '일간 {ilganName} — {ilganNature}의 본성이 행운 번호에 깊이 반영되었어요.',
      // 오행/띠 기반
      '오늘 {yearAnimal}띠에게 {yearElement}의 기운이 특별하게 작용하고 있어요.',
      '{yearAnimal}띠의 고유한 에너지가 {element} 오행과 어우러지는 날이에요.',
      '연주의 {yearAnimal}띠와 일간 {ilganName}의 조합이 독특한 에너지를 만들었어요.',
      '{element}의 기운이 당신의 운세를 강하게 이끌고 있는 시기입니다.',
      '당신의 연주 {yearAnimal}띠가 특별한 기운을 보내고 있어요.',
      '{yearElement}의 기운이 {yearAnimal}띠와 만나 행운의 파장을 만들었어요.',
      // 사주 관계 기반
      '사주 네 기둥을 살펴보니, {elementBalance}.',
      '천간과 지지의 조합이 매우 흥미로운 결과를 만들었어요.',
      '사주팔자에 따르면, 지금이 행운의 시기예요.',
      '{dayGan}{dayJi}일주의 에너지가 빛나는 날입니다.',
      '오행의 흐름이 당신에게 행운을 가져다줄 거예요.',
      '사주의 기둥들이 조화롭게 움직이고 있는 시기입니다.',
      '당신의 사주에서 특별한 패턴이 감지되었어요.',
      '{yearAnimal}띠 특유의 직감이 빛을 발하는 때예요.',
      '오늘의 천간 에너지가 당신의 운을 높여주고 있습니다.',
      '사주 명식(命式)을 펼쳐보니, 오늘의 기운이 예사롭지 않아요.',
      '네 기둥의 천간이 하나의 흐름으로 이어지는 특별한 배치예요.',
      '일간 {ilganName}과 연주 {yearAnimal}띠의 호응이 강하게 느껴집니다.'
    ],
    analysis: [
      // 기본 분석
      '{ilganName}의 {element} 기운은 특정 숫자 대역과 강한 친화력을 가져요.',
      '연주의 {yearAnimal}와 일주의 조합이 독특한 번호 패턴을 만들어냅니다.',
      '{element}의 오행은 안정과 조화를 상징하며, 균형 잡힌 번호가 유리해요.',
      '당신의 사주에서 {elementBalance}. 이것이 번호 선택의 핵심이에요.',
      '사주에서 {dayGan}{dayJi}의 조합은 특별한 수리적 의미를 담고 있어요.',
      '천간의 음양 배치가 홀짝 번호의 균형에 영향을 미쳤습니다.',
      '{element} 오행의 기운이 특정 번호 구간에 집중되어 있어요.',
      '네 기둥의 천간-지지 합이 독특한 수리 패턴을 형성하고 있어요.',
      '당신의 일간 {ilganName}이 가진 고유 에너지가 번호에 반영되었습니다.',
      '오행의 상생 순환이 이 번호들 사이에서 작동하고 있어요.',
      // 상생 분석 (조건부)
      '연주와 월주 사이에서 상생 관계가 발견되었어요. {sangSaengDesc}',
      '기둥 사이의 상생 흐름이 번호에 긍정적 에너지를 불어넣었어요. {sangSaengDesc}',
      '오행의 상생 관계가 이 조합을 더욱 길(吉)하게 만들어요. {sangSaengDesc}',
      '천간에서 상생의 흐름이 감지되었어요. {sangSaengDesc}',
      '{yearElement}과 {monthElement}의 상생 에너지가 번호 선택을 이끌고 있어요. {sangSaengDesc}',
      '사주 기둥 간 상생 관계가 강한 행운 에너지를 만들어내고 있어요. {sangSaengDesc}',
      // 상극 분석 (조건부)
      '기둥 사이에 상극이 보이지만, 이는 변화의 에너지예요. {sangGeukDesc}',
      '상극 관계가 감지되었지만, 긴장 속에서 더 큰 행운이 찾아와요. {sangGeukDesc}',
      '오행의 상극이 오히려 강렬한 행운 에너지를 만들어내고 있어요. {sangGeukDesc}',
      '상극의 기운이 번호에 독특한 긴장감을 더해주고 있어요. {sangGeukDesc}',
      // 삼합 분석 (조건부)
      '지지에서 삼합이 발견되었어요! {samhapDesc}',
      '삼합의 강력한 기운이 이 번호 조합을 특별하게 만들어요! {samhapDesc}',
      '놀라운 발견! 삼합이 형성되어 특정 오행 에너지가 극대화되었어요. {samhapDesc}',
      // 육합 분석 (조건부)
      '육합의 조화가 보여요. {yukhapDesc}',
      '지지에서 육합이 형성되어 부드러운 행운이 감돈아요. {yukhapDesc}',
      // 충 분석 (조건부)
      '충의 기운이 감지되었지만, 이는 큰 변화의 전조예요. {chungDesc}',
      '충이 있는 사주는 강렬한 에너지를 품고 있어요. {chungDesc}'
    ],
    numbers: [
      '특히 {highlight_num}번은 {element}의 핵심 에너지를 담고 있어요.',
      '번호 {num1}과 {num2}의 조합은 사주적으로 강한 시너지를 보여줘요.',
      '이 6개 번호의 합 {sum}은 사주적으로 의미 있는 숫자예요.',
      '{highlight_num}번이 이 조합의 중심 에너지를 담당하고 있어요.',
      '번호들의 홀짝 배분이 사주의 음양 균형과 잘 맞아요.',
      '{num1}번은 당신의 일간과 특별한 공명을 이루고 있습니다.',
      '이 조합에서 {highlight_num}번은 행운의 촉매 역할을 해요.',
      '번호 {num2}와 {num3}은 오행의 상생 관계에 있는 숫자예요.',
      '{element}의 기운이 가장 강하게 담긴 번호는 {highlight_num}이에요.',
      '전체 번호의 수리 합이 좋은 기운을 품고 있어요.',
      '특히 {num1}번과 {highlight_num}번의 간격이 사주적으로 길한 배치예요.',
      '이 번호들은 당신의 사주 기둥과 수리적으로 호응하고 있어요.',
      '{highlight_num}번은 {ilganName}의 본성과 가장 잘 통하는 번호예요.',
      '번호 {num1}은 {num1Element}의 기운으로, 일간과 {num1Relation}을 이뤄요.',
      '{num2}번과 {num3}번은 오행 순환의 흐름 속에 있는 번호예요.',
      '{highlight_num}번에는 {luckyDirection} 방향의 행운 에너지가 담겨 있어요.',
      '이 번호 조합의 오행 분포가 사주의 부족한 기운을 보완해줘요.',
      '번호 {num1}은 {yearAnimal}띠의 고유 에너지와 공명하는 숫자예요.',
      '전체 합 {sum}이 일간 {ilganName}에게 의미 있는 수리 에너지를 가져요.',
      '{highlight_num}번이 오늘 당신의 핵심 행운 번호라고 사주가 말하고 있어요.'
    ],
    closing: [
      '오늘의 기운을 믿고 도전해보세요!',
      '사주가 응원하고 있어요, 행운을 빌어요! 🍀',
      '좋은 에너지가 함께하길 바랍니다!',
      '당신의 사주가 미소 짓고 있어요!',
      '오행의 축복이 함께하길!',
      '이 번호와 함께 행운이 찾아올 거예요!',
      '당신의 운명이 빛나는 순간이에요!',
      '사주의 기운을 담아 행운을 전합니다!',
      '오늘, 특별한 일이 일어날 수도 있어요!',
      '천간과 지지가 당신 편이에요!',
      '{ilganNature}가 하늘을 향해 뻗듯, 당신의 운도 상승할 거예요!',
      '{luckyColor} 계열 옷이나 소품이 오늘의 행운을 더해줄 거예요.',
      '오늘은 {luckyDirection} 방향으로 가볼까요? 행운이 기다리고 있어요!',
      '{ilganName}의 기운으로 오늘 하루도 빛나세요!',
      '사주가 보내는 행운의 메시지, 꼭 받아가세요! 🍀'
    ]
  };

  // ─── 이름 템플릿 ─────────────────────────────────────────
  const NAME = {
    opening: [
      '"{name}"이라는 이름에 담긴 에너지가 특별해요.',
      '이름 속 획수가 행운의 메시지를 전하고 있어요.',
      '"{name}" — 이 이름의 오행은 {elementName}({elementKo})이에요.',
      '성명학적으로 총 {strokes}획은 의미 있는 숫자예요.',
      '당신의 이름이 품고 있는 기운이 번호에 반영되었어요.',
      '이름의 자모 조합이 독특한 에너지 패턴을 만들어요.',
      '총 {strokes}획의 이름, {elementDesc}의 기운이 느껴져요.',
      '"{name}"의 글자 하나하나에 행운이 깃들어 있어요.',
      '이름에 담긴 {elementName}({elementKo})의 기운이 강하게 작용해요.',
      '성명학에서 {strokes}획은 특별한 의미를 가지고 있답니다.',
      '당신의 이름이 가진 고유한 수리 에너지가 빛나고 있어요.',
      '"{name}" — 이름만으로도 행운의 기운이 느껴져요.'
    ],
    analysis: [
      '총 획수 {strokes}획은 {elementName}({elementKo})에 해당하며, {elementDesc}을(를) 상징해요.',
      '이름의 초성 조합이 특정 번호 패턴과 강한 연결고리를 가지고 있어요.',
      '{elementName}({elementKo}) 오행은 {elementDesc}의 특성으로 번호를 이끌어요.',
      '자음과 모음의 획수 분포가 균형 잡힌 번호 조합을 만들었어요.',
      '이름의 종성에 담긴 에너지가 번호 선택에 미묘한 영향을 주었어요.',
      '성명학적 분석에서 {strokes}획은 {elementDesc}과(와) 깊은 관계가 있어요.',
      '이름 각 글자의 획수 합이 만들어내는 수리적 조합이 흥미로워요.',
      '초성의 배치가 번호의 앞자리에, 종성이 뒷자리에 영향을 주고 있어요.',
      '{elementKo}의 기운은 특정 숫자 대역과 자연스럽게 공명해요.',
      '이름의 모음(중성)이 담고 있는 에너지가 번호 간 조화를 만들어요.',
      '성명학에서 이 획수 조합은 행운과 밀접한 관련이 있어요.',
      '자모 분해 결과, 당신의 이름은 수리적으로 매우 강한 에너지를 가져요.',
      '이름의 첫 글자와 마지막 글자의 획수 차이가 번호 범위에 영향을 줬어요.',
      '초성·중성·종성의 삼합이 독특한 번호 패턴을 형성했어요.',
      '{strokes}획의 수리 에너지가 오행 {elementName}의 영역에서 빛나고 있어요.'
    ],
    numbers: [
      '{highlight_num}번은 당신 이름의 핵심 에너지를 담고 있어요.',
      '번호 {num1}은 이름 첫 글자의 초성 에너지와 공명해요.',
      '이 조합에서 {num2}번은 종성의 안정 에너지를 반영하고 있어요.',
      '6개 번호의 합 {sum}은 이름의 총 획수와 수리적 관계가 있어요.',
      '{highlight_num}번이 {elementName}({elementKo}) 오행의 중심 번호예요.',
      '번호 {num1}과 {num3}은 이름의 모음 에너지가 이끌어낸 조합이에요.',
      '특히 {num2}번은 이름의 획수 패턴과 강하게 연결되어 있어요.',
      '이 번호들의 분포가 이름의 자모 구조와 닮아 있어요.',
      '{highlight_num}번에서 {elementDesc}의 기운이 가장 강하게 느껴져요.',
      '번호 {num1}과 {num2}의 간격이 이름의 획수 리듬과 일치해요.',
      '전체 조합이 이름의 수리적 균형을 잘 반영하고 있어요.',
      '{num3}번은 당신 이름의 숨겨진 에너지를 대표하는 번호예요.'
    ],
    closing: [
      '이름에 담긴 행운을 믿어보세요! 🍀',
      '당신의 이름이 행운을 불러올 거예요!',
      '이름의 기운과 함께 좋은 결과가 있길!',
      '성명학의 축복이 함께하길 바라요!',
      '이름 속 에너지가 빛나는 순간이에요!',
      '당신만의 특별한 이름, 특별한 행운!',
      '이름이 전하는 행운의 메시지를 받으세요!',
      '"{name}"이라는 이름에 행운을 담아 보내요!',
      '오늘, 이름의 기운이 당신 편이에요!',
      '좋은 이름, 좋은 번호, 좋은 하루! 🍀'
    ]
  };

  // ─── MBTI 템플릿 ─────────────────────────────────────────
  const MBTI = {
    opening: [
      '{mbtiType}({label}) 유형의 오늘 행운 에너지가 높아요!',
      '오늘 {mbtiType} 유형에게 특별한 기운이 감지돼요.',
      '{label}인 당신, 오늘의 행운 번호를 확인해보세요!',
      '{mbtiType}의 {trait} 특성이 번호 선택에 영향을 주고 있어요.',
      '오늘은 {mbtiType} 유형의 직감이 빛나는 날이에요.',
      '{label}의 고유한 에너지가 번호를 이끌고 있습니다.',
      '{mbtiType}({label}) — 오늘의 운세가 기대되는 유형이에요!',
      '당신의 {trait} 특성이 행운의 번호와 공명하고 있어요.',
      '{mbtiType} 유형의 행운 주기가 상승세에 있어요.',
      '오늘의 에너지가 {mbtiType} 유형에게 유리하게 흐르고 있어요.',
      '{label}의 잠재력이 번호 선택에서 빛을 발하고 있어요.',
      '{mbtiType} 유형 특유의 감각이 오늘 행운을 가져다줄 거예요.'
    ],
    analysis: [
      '{mbtiType}의 {trait} 특성은 특정 번호 패턴과 강한 친화력을 가져요.',
      '오늘 날짜의 에너지와 {mbtiType} 유형이 만나 독특한 조합이 탄생했어요.',
      '{label} 유형은 직감과 분석의 균형이 번호 선택에 유리하게 작용해요.',
      '{mbtiType}의 네 가지 축이 각각 번호의 홀짝, 범위, 패턴에 영향을 줘요.',
      '오늘의 날짜 에너지가 {mbtiType}의 장점을 극대화시키고 있어요.',
      '{trait} 성향이 특정 숫자 대역에서 강한 공명을 일으키고 있어요.',
      '{mbtiType} 유형의 의사결정 방식이 번호 조합의 균형에 반영되었어요.',
      '매일 바뀌는 날짜 에너지와 {mbtiType}의 고유 파동이 만나는 순간이에요.',
      '{label}의 핵심 특성인 {trait}이(가) 번호 선택의 방향키 역할을 해요.',
      '오늘의 우주적 에너지가 {mbtiType} 유형에게 유리한 번호를 제시하고 있어요.',
      '{mbtiType}의 4가지 축 조합이 만들어내는 수리적 패턴이 독특해요.',
      '날짜와 MBTI의 결합 에너지가 최적의 번호 조합을 찾아냈어요.',
      '{trait} 기질이 강한 유형일수록 이 조합과의 친화력이 높아요.',
      '오늘은 {mbtiType} 유형의 잠재된 행운 에너지가 활성화된 날이에요.',
      '{label}의 성격적 강점이 번호 선택에서 빛을 발하고 있어요.'
    ],
    numbers: [
      '{highlight_num}번은 {mbtiType} 유형의 오늘 핵심 행운 번호예요.',
      '번호 {num1}과 {num2}는 {trait} 특성이 이끌어낸 조합이에요.',
      '이 조합에서 {highlight_num}번은 {label}의 에너지를 가장 강하게 담고 있어요.',
      '6개 번호의 합 {sum}은 오늘 {mbtiType}에게 의미 있는 숫자예요.',
      '{num1}번은 당신의 {trait} 에너지가 가장 강하게 작용한 번호예요.',
      '번호 {num2}와 {num3}의 조합은 {mbtiType} 유형에게 특별한 의미가 있어요.',
      '오늘의 날짜 에너지가 {highlight_num}번에 집중되어 있어요.',
      '{mbtiType}의 4축 가중치가 이 번호들의 분포를 결정했어요.',
      '특히 {num1}번은 오늘 {label} 유형의 행운 번호예요.',
      '이 조합의 홀짝 비율이 {mbtiType} 유형에게 최적이에요.',
      '{highlight_num}번과 {num3}번의 간격이 행운의 리듬을 만들어요.',
      '전체 번호가 {mbtiType}의 에너지 스펙트럼에 잘 분포되어 있어요.'
    ],
    closing: [
      '오늘의 {mbtiType} 행운을 잡아보세요! 🎯',
      '{label}의 직감을 믿어보세요!',
      '내일은 또 다른 행운이 기다리고 있어요! 🍀',
      '{mbtiType} 유형의 하루가 빛나길!',
      '오늘의 행운 에너지를 놓치지 마세요!',
      '{label}답게, 자신감을 가져보세요!',
      '매일 새로운 행운, 오늘도 기대해보세요!',
      '{mbtiType}의 행운이 현실이 되길!',
      '당신만의 특별한 행운을 응원해요!',
      '오늘 하루, {label}의 기운과 함께!'
    ]
  };

  const TEMPLATES = { saju: SAJU, name: NAME, mbti: MBTI };

  // ─── 조건부 템플릿 선택 ─────────────────────────────────────
  const CONDITIONAL_KEYS = ['sangSaengDesc', 'sangGeukDesc', 'samhapDesc', 'yukhapDesc', 'chungDesc'];

  function hasConditional(template) {
    return CONDITIONAL_KEYS.some(key => template.includes(`{${key}}`));
  }

  function pickConditional(templates, ctx) {
    const available = templates.filter(t => {
      for (const key of CONDITIONAL_KEYS) {
        if (t.includes(`{${key}}`) && !ctx[key]) return false;
      }
      return true;
    });
    if (available.length > 0) return pick(available);
    return pick(templates.filter(t => !hasConditional(t)));
  }

  /**
   * 컨텍스트 변수 빌드
   */
  function buildContext(type, result) {
    const numbers = result.numbers;
    const sum = numbers.reduce((a, b) => a + b, 0);
    const highlight = numbers[Math.floor(Math.random() * numbers.length)];

    const base = {
      highlight_num: highlight,
      num1: numbers[0],
      num2: numbers[1],
      num3: numbers[2],
      sum
    };

    if (type === 'saju' && result.saju) {
      const s = result.saju;
      const analysis = SajuCalculator.analyzePillars(s);

      // 오행 분포 설명 문장 생성
      const elemEntries = Object.entries(analysis.elementCount).sort((a, b) => b[1] - a[1]);
      const strongest = elemEntries[0];
      const weakest = elemEntries[elemEntries.length - 1];
      const elementBalance = `${strongest[0]}이 ${strongest[1]}개로 가장 강하고 ${weakest[0]}이 ${weakest[1]}개로 부족합니다`;

      // 번호별 오행
      const num1Element = SajuCalculator.getNumberElement(numbers[0]);
      const dayElement = s.dayPillar.gan.element;
      const sangSaengCheck = SANG_SAENG[dayElement + num1Element] || SANG_SAENG[num1Element + dayElement];
      const num1Relation = sangSaengCheck ? '상생' : '독립적인 에너지';

      return {
        ...base,
        yearAnimal: s.yearPillar.ji.animal,
        element: s.dayPillar.gan.element,
        dayGan: s.dayPillar.gan.hanja,
        dayJi: s.dayPillar.ji.hanja,
        // 신규: 일간 정보
        ilganName: analysis.ilganTrait.name,
        ilganNature: analysis.ilganTrait.nature,
        ilganPersonality: analysis.ilganTrait.personality,
        ilganDesc: analysis.ilganTrait.desc,
        luckyDirection: analysis.ilganTrait.luckyDirection,
        luckyColor: analysis.ilganTrait.luckyColor,
        // 신규: 오행 관계
        yearElement: s.yearPillar.gan.element,
        monthElement: s.monthPillar.gan.element,
        sangSaengDesc: analysis.sangSaeng[0]?.detail || '',
        sangGeukDesc: analysis.sangGeuk[0]?.detail || '',
        samhapDesc: analysis.samhapFound[0]?.desc || '',
        yukhapDesc: analysis.yukhapFound[0]?.desc || '',
        chungDesc: analysis.chungFound[0]?.desc || '',
        elementBalance,
        num1Element,
        num1Relation
      };
    }

    if (type === 'name' && result.nameInfo) {
      const n = result.nameInfo;
      return {
        ...base,
        name: n.name,
        strokes: n.strokes,
        elementName: n.element.name,
        elementKo: n.element.ko,
        elementDesc: n.element.desc
      };
    }

    if (type === 'mbti' && result.mbtiInfo) {
      const m = result.mbtiInfo;
      return {
        ...base,
        mbtiType: m.type,
        label: m.label,
        trait: m.traits[Math.floor(Math.random() * m.traits.length)]
      };
    }

    return base;
  }

  // SANG_SAENG 참조 (saju.js에서 가져옴)
  const SANG_SAENG = typeof SajuCalculator !== 'undefined' ? SajuCalculator.SANG_SAENG : {};

  /**
   * 템플릿 변수 치환
   */
  function fill(template, ctx) {
    return template.replace(/\{(\w+)\}/g, (_, key) => ctx[key] !== undefined ? ctx[key] : `{${key}}`);
  }

  /**
   * 랜덤 선택
   */
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ─── 통계 인사이트 템플릿 ─────────────────────────────────
  const STAT_INSIGHTS = {
    sumGood: [
      '이 조합의 합 {sum}은 역대 당첨 조합에서 가장 많이 나오는 구간이에요.',
      '합계 {sum} — 통계적으로 가장 흔한 당첨 합계 범위 안에 있어요!',
      '번호 합 {sum}은 당첨 확률이 높은 구간에 딱 들어맞아요.'
    ],
    oddEvenGood: [
      '홀짝 비율이 통계적으로 가장 흔한 패턴이에요.',
      '홀짝 균형이 역대 당첨 번호와 잘 맞는 비율이에요!',
      '이 홀짝 비율은 역대 1등에서 가장 많이 나온 패턴이에요.'
    ],
    balanceGood: [
      '고저 번호의 균형이 통계적으로 이상적이에요.',
      '저번호와 고번호가 골고루 섞인 좋은 조합이에요!'
    ]
  };

  /**
   * 통계 인사이트 생성 (좋을 때만)
   */
  function buildStatInsight(numbers) {
    const insights = [];
    const sum = numbers.reduce((a, b) => a + b, 0);
    const odd = numbers.filter(n => n % 2 === 1).length;
    const low = numbers.filter(n => n <= 22).length;

    if (sum >= 100 && sum <= 175) {
      insights.push(fill(pick(STAT_INSIGHTS.sumGood), { sum }));
    }
    if (odd >= 2 && odd <= 4) {
      insights.push(pick(STAT_INSIGHTS.oddEvenGood));
    }
    if (low >= 2 && low <= 4 && insights.length < 2) {
      insights.push(pick(STAT_INSIGHTS.balanceGood));
    }

    return insights.length > 0 ? ' ' + insights.join(' ') : '';
  }

  /**
   * 설명 생성 (공개 API)
   */
  function generate(type, result) {
    const tmpl = TEMPLATES[type];
    if (!tmpl) return '';

    const ctx = buildContext(type, result);

    const opening = fill(pickConditional(tmpl.opening, ctx), ctx);
    const analysis = fill(pickConditional(tmpl.analysis, ctx), ctx);
    const numbers = fill(pickConditional(tmpl.numbers, ctx), ctx);
    const closing = fill(pickConditional(tmpl.closing, ctx), ctx);

    const statInsight = buildStatInsight(result.numbers);

    return `${opening} ${analysis} ${numbers}${statInsight} ${closing}`;
  }

  return { generate, buildContext };
})();
