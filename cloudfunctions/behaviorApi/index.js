const cloud = require("wx-server-sdk");
const { buildWeeklyStats, isOwnedVoiceFile, normalizeABC, startOfWeek } = require("./lib/core");
const { extractABC, transcribeAudio } = require("./lib/tencent");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const records = db.collection("behavior_records");

function success(data) {
  return { ok: true, data };
}

function failure(error) {
  console.error(error);
  return { ok: false, error: error.message || "服务暂时不可用" };
}

async function analyzeText(transcript) {
  if (typeof transcript !== "string" || !transcript.trim()) {
    throw new Error("行为描述不能为空");
  }
  const cleaned = transcript.trim().slice(0, 1000);
  const extracted = await extractABC(cleaned);
  return { transcript: cleaned, ...extracted };
}

async function processRecording(fileID, openid) {
  if (!isOwnedVoiceFile(fileID, openid)) throw new Error("无权访问该录音");
  try {
    const downloaded = await cloud.downloadFile({ fileID });
    if (!downloaded.fileContent || downloaded.fileContent.length > 5 * 1024 * 1024) {
      throw new Error("录音文件无效或超过 5MB");
    }
    const transcript = await transcribeAudio(downloaded.fileContent);
    return analyzeText(transcript);
  } finally {
    if (process.env.KEEP_RECORDINGS !== "true") {
      await cloud.deleteFile({ fileList: [fileID] }).catch((error) => {
        console.error("Failed to delete recording:", error);
      });
    }
  }
}

async function saveRecord(record, openid) {
  if (!record || typeof record !== "object") throw new Error("记录格式无效");
  const occurredAt = Number(record.occurredAt);
  const now = Date.now();
  if (!Number.isFinite(occurredAt) || occurredAt > now + 300000) {
    throw new Error("发生时间无效");
  }
  const document = {
    _openid: openid,
    childAlias:
      typeof record.childAlias === "string"
        ? record.childAlias.trim().slice(0, 20) || "孩子"
        : "孩子",
    transcript:
      typeof record.transcript === "string" ? record.transcript.trim().slice(0, 1000) : "",
    abc: normalizeABC(record.abc),
    occurredAt,
    confirmedAt: now,
    createdAt: db.serverDate()
  };
  const result = await records.add({ data: document });
  return { id: result._id };
}

async function listRecords(openid, requestedLimit) {
  const limit = Math.min(100, Math.max(1, Number.parseInt(requestedLimit, 10) || 50));
  const result = await records
    .where({ _openid: openid })
    .orderBy("occurredAt", "desc")
    .limit(limit)
    .get();
  return { records: result.data };
}

async function recordsSince(openid, timestamp) {
  const command = db.command;
  const all = [];
  for (let skip = 0; skip < 1000; skip += 100) {
    const page = await records
      .where({ _openid: openid, occurredAt: command.gte(timestamp) })
      .orderBy("occurredAt", "asc")
      .skip(skip)
      .limit(100)
      .get();
    all.push(...page.data);
    if (page.data.length < 100) break;
  }
  return all;
}

exports.main = async (event = {}) => {
  const { OPENID: openid } = cloud.getWXContext();
  try {
    switch (event.action) {
      case "profile":
        return success({ openid });
      case "processRecording":
        return success(await processRecording(event.fileID, openid));
      case "analyzeText":
        return success(await analyzeText(event.transcript));
      case "saveRecord":
        return success(await saveRecord(event.record, openid));
      case "listRecords":
        return success(await listRecords(openid, event.limit));
      case "weeklyStats": {
        const now = Date.now();
        const weeklyRecords = await recordsSince(openid, startOfWeek(now));
        return success(buildWeeklyStats(weeklyRecords, now));
      }
      default:
        throw new Error("不支持的操作");
    }
  } catch (error) {
    return failure(error);
  }
};
