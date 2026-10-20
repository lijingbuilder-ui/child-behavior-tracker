const CATEGORIES = ["情绪爆发", "拒绝/回避", "攻击行为", "自我刺激", "积极行为", "其他"];

function cleanText(value, fallback = "未明确说明") {
  if (typeof value !== "string") return fallback;
  const text = value.trim().slice(0, 500);
  return text || fallback;
}

function normalizeABC(value = {}) {
  const intensity = Math.min(5, Math.max(1, Number.parseInt(value.intensity, 10) || 3));
  return {
    antecedent: cleanText(value.antecedent),
    behavior: cleanText(value.behavior),
    consequence: cleanText(value.consequence),
    category: CATEGORIES.includes(value.category) ? value.category : "其他",
    intensity
  };
}

function parseAIJson(content) {
  if (typeof content !== "string") throw new Error("AI 未返回文本");
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced ? fenced[1] : content;
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI 返回格式无效");
  return normalizeABC(JSON.parse(source.slice(start, end + 1)));
}

function fallbackABC(transcript) {
  return normalizeABC({
    antecedent: "未明确说明，请人工补充",
    behavior: cleanText(transcript),
    consequence: "未明确说明，请人工补充",
    category: "其他",
    intensity: 3
  });
}

function startOfWeek(timestamp = Date.now(), timezoneOffsetMinutes = 480) {
  const offset = timezoneOffsetMinutes * 60 * 1000;
  const local = new Date(timestamp + offset);
  const day = local.getUTCDay() || 7;
  local.setUTCDate(local.getUTCDate() - day + 1);
  local.setUTCHours(0, 0, 0, 0);
  return local.getTime() - offset;
}

function dateKey(timestamp, timezoneOffsetMinutes = 480) {
  const local = new Date(timestamp + timezoneOffsetMinutes * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function buildWeeklyStats(records, now = Date.now()) {
  const weekStart = startOfWeek(now);
  const dayNames = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const daily = dayNames.map((label, index) => {
    const timestamp = weekStart + index * 86400000;
    return { date: dateKey(timestamp), label, count: 0 };
  });
  const categoryCounts = new Map();
  let intensityTotal = 0;

  records.forEach((record) => {
    const index = daily.findIndex((item) => item.date === dateKey(record.occurredAt));
    if (index >= 0) daily[index].count += 1;
    const category = normalizeABC(record.abc).category;
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    intensityTotal += normalizeABC(record.abc).intensity;
  });

  return {
    summary: {
      total: records.length,
      averageIntensity: records.length
        ? Number((intensityTotal / records.length).toFixed(1))
        : 0
    },
    daily,
    categories: Array.from(categoryCounts, ([name, count]) => ({ name, count })).sort(
      (a, b) => b.count - a.count
    ),
    rangeLabel: `${daily[0].date} 至 ${daily[6].date}`,
    weekStart
  };
}

function isOwnedVoiceFile(fileID, openid) {
  if (typeof fileID !== "string" || typeof openid !== "string") return false;
  return fileID.includes(`/voice/${openid}/`) && fileID.endsWith(".mp3");
}

module.exports = {
  CATEGORIES,
  buildWeeklyStats,
  fallbackABC,
  isOwnedVoiceFile,
  normalizeABC,
  parseAIJson,
  startOfWeek
};
