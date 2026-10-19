const tencentcloud = require("tencentcloud-sdk-nodejs");
const { fallbackABC, parseAIJson } = require("./core");

function credentials() {
  const secretId =
    process.env.TENCENTCLOUD_SECRETID || process.env.TENCENTCLOUD_SECRET_ID;
  const secretKey =
    process.env.TENCENTCLOUD_SECRETKEY || process.env.TENCENTCLOUD_SECRET_KEY;
  if (!secretId || !secretKey) {
    throw new Error("云函数未配置腾讯云 API 密钥");
  }
  return { secretId, secretKey };
}

function clientProfile() {
  return {
    signMethod: "TC3-HMAC-SHA256",
    httpProfile: { reqMethod: "POST", reqTimeout: 30 }
  };
}

async function transcribeAudio(buffer) {
  const AsrClient = tencentcloud.asr.v20190614.Client;
  const client = new AsrClient({
    credential: credentials(),
    region: process.env.TENCENTCLOUD_REGION || "ap-shanghai",
    profile: clientProfile()
  });
  const response = await client.SentenceRecognition({
    ProjectId: 0,
    SubServiceType: 2,
    EngSerViceType: "16k_zh",
    SourceType: 1,
    VoiceFormat: "mp3",
    Data: buffer.toString("base64"),
    DataLen: buffer.length,
    FilterDirty: 1,
    FilterModal: 1
  });
  const transcript = (response.Result || "").trim();
  if (!transcript) throw new Error("没有识别到清晰语音");
  return transcript;
}

async function extractABC(transcript) {
  try {
    const HunyuanClient = tencentcloud.hunyuan.v20230901.Client;
    const client = new HunyuanClient({
      credential: credentials(),
      region: process.env.TENCENTCLOUD_REGION || "ap-guangzhou",
      profile: clientProfile()
    });
    const response = await client.ChatCompletions({
      Model: process.env.HUNYUAN_MODEL || "hunyuan-lite",
      Temperature: 0.2,
      Messages: [
        {
          Role: "system",
          Content:
            "你是儿童行为记录助手。只整理用户明确陈述的事实，不做诊断，不推测动机。输出严格 JSON，键为 antecedent、behavior、consequence、category、intensity。category 只能是：情绪爆发、拒绝/回避、攻击行为、自我刺激、积极行为、其他。intensity 为 1 到 5 的整数。缺失事实写“未明确说明，请人工补充”。"
        },
        { Role: "user", Content: transcript.slice(0, 1000) }
      ]
    });
    const content =
      response.Choices &&
      response.Choices[0] &&
      response.Choices[0].Message &&
      response.Choices[0].Message.Content;
    return { abc: parseAIJson(content), aiUsed: true };
  } catch (error) {
    console.warn("AI extraction fallback:", error.message);
    return { abc: fallbackABC(transcript), aiUsed: false };
  }
}

module.exports = { extractABC, transcribeAudio };
