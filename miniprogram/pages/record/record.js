const app = getApp();
const recorder = wx.getRecorderManager();

Page({
  data: {
    childAlias: "孩子",
    manualText: "",
    recording: false,
    elapsed: 0,
    processing: false,
    status: ""
  },

  onLoad() {
    this.setData({ childAlias: app.globalData.defaultChildAlias });
    recorder.onStop((res) => this.handleRecording(res));
    recorder.onError((error) => {
      this.stopTimer();
      this.setData({ recording: false, status: "" });
      wx.showModal({
        title: "无法录音",
        content: error.errMsg || "请检查麦克风权限后重试。",
        showCancel: false
      });
    });
  },

  onUnload() {
    this.stopTimer();
  },

  onChildInput(event) {
    this.setData({ childAlias: event.detail.value });
  },

  onTextInput(event) {
    this.setData({ manualText: event.detail.value });
  },

  startRecording() {
    if (this.data.processing) return;
    recorder.start({
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 32000,
      format: "mp3"
    });
    this.setData({ recording: true, elapsed: 0, status: "正在录音（最长 60 秒）" });
    this.timer = setInterval(() => {
      this.setData({ elapsed: Math.min(this.data.elapsed + 1, 60) });
    }, 1000);
  },

  stopRecording() {
    if (this.data.recording) recorder.stop();
  },

  stopTimer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  },

  async handleRecording({ tempFilePath }) {
    this.stopTimer();
    this.setData({
      recording: false,
      processing: true,
      status: "正在转写并提取 ABC…"
    });

    let fileID = "";
    try {
      const profile = await app.globalData.profilePromise;
      const cloudPath = `voice/${profile.openid}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.mp3`;
      const uploaded = await wx.cloud.uploadFile({ cloudPath, filePath: tempFilePath });
      fileID = uploaded.fileID;
      const { result } = await wx.cloud.callFunction({
        name: "behaviorApi",
        data: { action: "processRecording", fileID }
      });
      if (!result || !result.ok) throw new Error((result && result.error) || "处理失败");
      this.openReview(result.data);
    } catch (error) {
      wx.showModal({
        title: "语音处理失败",
        content: error.message || error.errMsg || "请稍后重试，也可改用文字输入。",
        showCancel: false
      });
    } finally {
      if (fileID) {
        wx.cloud.deleteFile({ fileList: [fileID] }).catch(() => {});
      }
      this.setData({ processing: false, status: "" });
    }
  },

  async analyzeText() {
    const transcript = this.data.manualText.trim();
    if (!transcript) {
      wx.showToast({ title: "请先输入行为描述", icon: "none" });
      return;
    }
    this.setData({ processing: true, status: "正在提取 ABC…" });
    try {
      const { result } = await wx.cloud.callFunction({
        name: "behaviorApi",
        data: { action: "analyzeText", transcript }
      });
      if (!result || !result.ok) throw new Error((result && result.error) || "分析失败");
      this.openReview(result.data);
    } catch (error) {
      wx.showModal({
        title: "分析失败",
        content: error.message || error.errMsg || "请稍后重试。",
        showCancel: false
      });
    } finally {
      this.setData({ processing: false, status: "" });
    }
  },

  openReview(data) {
    wx.setStorageSync("pendingBehaviorReview", {
      ...data,
      childAlias: this.data.childAlias.trim() || "孩子"
    });
    wx.navigateTo({ url: "/pages/review/review" });
  }
});
