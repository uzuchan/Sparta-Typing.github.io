type RomajiJudgeResult =
  | { type: "match"; completed: boolean; kanaProgress: number }
  | { type: "miss" };

const ROMAJI_MAP: Record<string, string[]> = {
  あ: ["a"],
  い: ["i"],
  う: ["u"],
  え: ["e"],
  お: ["o"],

  か: ["ka"],
  き: ["ki"],
  く: ["ku"],
  け: ["ke"],
  こ: ["ko"],

  さ: ["sa"],
  し: ["si", "shi"],
  す: ["su"],
  せ: ["se"],
  そ: ["so"],

  た: ["ta"],
  ち: ["ti", "chi"],
  つ: ["tu", "tsu"],
  て: ["te"],
  と: ["to"],

  な: ["na"],
  に: ["ni"],
  ぬ: ["nu"],
  ね: ["ne"],
  の: ["no"],

  は: ["ha"],
  ひ: ["hi"],
  ふ: ["hu", "fu"],
  へ: ["he"],
  ほ: ["ho"],

  ま: ["ma"],
  み: ["mi"],
  む: ["mu"],
  め: ["me"],
  も: ["mo"],

  や: ["ya"],
  ゆ: ["yu"],
  よ: ["yo"],

  ら: ["ra"],
  り: ["ri"],
  る: ["ru"],
  れ: ["re"],
  ろ: ["ro"],

  わ: ["wa"],
  を: ["wo", "o"],
  ん: ["n", "nn"],

  が: ["ga"],
  ぎ: ["gi"],
  ぐ: ["gu"],
  げ: ["ge"],
  ご: ["go"],

  ざ: ["za"],
  じ: ["zi", "ji"],
  ず: ["zu"],
  ぜ: ["ze"],
  ぞ: ["zo"],

  だ: ["da"],
  ぢ: ["di", "ji"],
  づ: ["du", "zu"],
  で: ["de"],
  ど: ["do"],

  ば: ["ba"],
  び: ["bi"],
  ぶ: ["bu"],
  べ: ["be"],
  ぼ: ["bo"],

  ぱ: ["pa"],
  ぴ: ["pi"],
  ぷ: ["pu"],
  ぺ: ["pe"],
  ぽ: ["po"],

  きゃ: ["kya"],
  きゅ: ["kyu"],
  きょ: ["kyo"],

  しゃ: ["sya", "sha"],
  しゅ: ["syu", "shu"],
  しょ: ["syo", "sho"],

  ちゃ: ["tya", "cha"],
  ちゅ: ["tyu", "chu"],
  ちょ: ["tyo", "cho"],

  にゃ: ["nya"],
  にゅ: ["nyu"],
  にょ: ["nyo"],

  ひゃ: ["hya"],
  ひゅ: ["hyu"],
  ひょ: ["hyo"],

  みゃ: ["mya"],
  みゅ: ["myu"],
  みょ: ["myo"],

  りゃ: ["rya"],
  りゅ: ["ryu"],
  りょ: ["ryo"],

  ぎゃ: ["gya"],
  ぎゅ: ["gyu"],
  ぎょ: ["gyo"],

  じゃ: ["zya", "ja", "jya"],
  じゅ: ["zyu", "ju", "jyu"],
  じょ: ["zyo", "jo", "jyo"],

  びゃ: ["bya"],
  びゅ: ["byu"],
  びょ: ["byo"],

  ぴゃ: ["pya"],
  ぴゅ: ["pyu"],
  ぴょ: ["pyo"],

  ぁ: ["xa", "la"],
  ぃ: ["xi", "li"],
  ぅ: ["xu", "lu"],
  ぇ: ["xe", "le"],
  ぉ: ["xo", "lo"],
  ゃ: ["xya", "lya"],
  ゅ: ["xyu", "lyu"],
  ょ: ["xyo", "lyo"],
  ー: ["-"],
};

const CONSONANT_RE = /^[bcdfghjklmnpqrstvwxyz]/;

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function firstConsonant(value: string): string {
  const first = value[0] ?? "";
  return CONSONANT_RE.test(first) ? first : "";
}

export function kanaToRomajiCandidates(kana: string): string[] {
  const normalized = kana.trim();

  function build(index: number): string[] {
    if (index >= normalized.length) return [""];

    const one = normalized.slice(index, index + 1);
    const two = normalized.slice(index, index + 2);

    if (one === "っ") {
      const rest = build(index + 1);
      return unique(
        rest.flatMap((candidate) => {
          const consonant = firstConsonant(candidate);
          return consonant ? [`${consonant}${candidate}`] : [`xtu${candidate}`, `ltu${candidate}`];
        })
      );
    }

    const tokens: Array<{ size: number; values: string[] }> = [];

    if (ROMAJI_MAP[two]) {
      tokens.push({ size: 2, values: ROMAJI_MAP[two] });
    }

    if (ROMAJI_MAP[one]) {
      tokens.push({ size: 1, values: ROMAJI_MAP[one] });
    }

    if (tokens.length === 0) {
      tokens.push({ size: 1, values: [one] });
    }

    const results: string[] = [];

    for (const token of tokens) {
      const rest = build(index + token.size);
      for (const head of token.values) {
        for (const tail of rest) {
          results.push(`${head}${tail}`);
        }
      }
    }

    return unique(results).slice(0, 5000);
  }

  return build(0);
}

export function judgeRomajiInput(kana: string, input: string): RomajiJudgeResult {
  const normalizedInput = input.toLowerCase();
  const candidates = kanaToRomajiCandidates(kana);

  const hasPrefix = candidates.some((candidate) => candidate.startsWith(normalizedInput));

  if (!hasPrefix) {
    return { type: "miss" };
  }

  const completed = candidates.some((candidate) => candidate === normalizedInput);

  return {
    type: "match",
    completed,
    kanaProgress: completed ? kana.length : 0,
  };
}

export function normalizeEnglishInput(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function judgeEnglishInput(answer: string, input: string): RomajiJudgeResult {
  const normalizedAnswer = normalizeEnglishInput(answer);
  const normalizedInput = normalizeEnglishInput(input);

  if (!normalizedAnswer.startsWith(normalizedInput)) {
    return { type: "miss" };
  }

  return {
    type: "match",
    completed: normalizedAnswer === normalizedInput,
    kanaProgress: normalizedInput.length,
  };
}
