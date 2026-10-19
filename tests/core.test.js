const assert = require("node:assert/strict");
const test = require("node:test");
const {
  buildWeeklyStats,
  fallbackABC,
  isOwnedVoiceFile,
  normalizeABC,
  parseAIJson,
  startOfWeek
} = require("../cloudfunctions/behaviorApi/lib/core");

test("normalizeABC constrains category, text and intensity", () => {
  assert.deepEqual(
    normalizeABC({
      antecedent: "  被要求收玩具 ",
      behavior: "大哭",
      consequence: "家长等待",
      category: "未知类别",
      intensity: 99
    }),
    {
      antecedent: "被要求收玩具",
      behavior: "大哭",
      consequence: "家长等待",
      category: "其他",
      intensity: 5
    }
  );
});

test("parseAIJson accepts fenced JSON and normalizes it", () => {
  const result = parseAIJson(
    '```json\n{"antecedent":"放学后","behavior":"主动整理书包","consequence":"获得表扬","category":"积极行为","intensity":2}\n```'
  );
  assert.equal(result.category, "积极行为");
  assert.equal(result.intensity, 2);
});

test("fallback ABC preserves transcript without inventing context", () => {
  const abc = fallbackABC("孩子把积木扔到了地上");
  assert.equal(abc.behavior, "孩子把积木扔到了地上");
  assert.match(abc.antecedent, /人工补充/);
  assert.match(abc.consequence, /人工补充/);
});

test("startOfWeek uses Monday in China Standard Time", () => {
  const wednesday = Date.parse("2026-10-21T04:00:00Z");
  assert.equal(startOfWeek(wednesday), Date.parse("2026-10-18T16:00:00Z"));
});

test("weekly stats aggregate daily and category counts", () => {
  const now = Date.parse("2026-10-21T04:00:00Z");
  const stats = buildWeeklyStats(
    [
      {
        occurredAt: Date.parse("2026-10-19T02:00:00Z"),
        abc: { category: "情绪爆发", intensity: 4 }
      },
      {
        occurredAt: Date.parse("2026-10-20T02:00:00Z"),
        abc: { category: "积极行为", intensity: 2 }
      }
    ],
    now
  );
  assert.equal(stats.summary.total, 2);
  assert.equal(stats.summary.averageIntensity, 3);
  assert.deepEqual(
    stats.daily.slice(0, 3).map((item) => item.count),
    [1, 1, 0]
  );
  assert.equal(stats.categories[0].count, 1);
});

test("voice file ownership rejects another user's path and non-mp3 files", () => {
  const owned = "cloud://env.bucket/voice/user-a/123-random.mp3";
  assert.equal(isOwnedVoiceFile(owned, "user-a"), true);
  assert.equal(isOwnedVoiceFile(owned, "user-b"), false);
  assert.equal(isOwnedVoiceFile("cloud://env.bucket/voice/user-a/file.wav", "user-a"), false);
});
