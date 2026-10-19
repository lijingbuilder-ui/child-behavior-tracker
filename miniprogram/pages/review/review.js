const CATEGORIES = ["情绪爆发", "拒绝/回避", "攻击行为", "自我刺激", "积极行为", "其他"];

Page({
  data: {
    childAlias: "孩子",
    transcript: "",
    antecedent: "",
    behavior: "",
    consequence: "",
    category: "其他",
    categoryIndex: 5,
    categories: CATEGORIES,
    intensity: 3,
    saving: false
  },

  onLoad() {
    const pending = wx.getStorageSync("pendingBehaviorReview");
    if (!pending || !pending.abc) {
      wx.showToast({ title: "没有待确认的记录", icon: "none" });
      wx.navigateBack();
      return;
    }
    this.setData({
      childAlias: pending.childAlias || "孩子",
      transcript: pending.transcript || "",
      antecedent: pending.abc.antecedent || "",
      behavior: pending.abc.behavior || "",
      consequence: pending.abc.consequence || "",
      category: CATEGORIES.includes(pending.abc.category) ? pending.abc.category : "其他",
      categoryIndex: Math.max(CATEGORIES.indexOf(pending.abc.category), 0),
      intensity: pending.abc.intensity || 3
    });
  },

  setField(event) {
    this.setData({ [event.currentTarget.dataset.field]: event.detail.value });
  },

  onCategoryChange(event) {
    const categoryIndex = Number(event.detail.value);
    this.setData({ categoryIndex, category: CATEGORIES[categoryIndex] });
  },

  onIntensityChange(event) {
    this.setData({ intensity: Number(event.detail.value) });
  },

  async save() {
    const abc = {
      antecedent: this.data.antecedent.trim(),
      behavior: this.data.behavior.trim(),
      consequence: this.data.consequence.trim(),
      category: this.data.category,
      intensity: this.data.intensity
    };
    if (!abc.antecedent || !abc.behavior || !abc.consequence) {
      wx.showToast({ title: "请确认并补全 ABC 三项", icon: "none" });
      return;
    }

    this.setData({ saving: true });
    try {
      const { result } = await wx.cloud.callFunction({
        name: "behaviorApi",
        data: {
          action: "saveRecord",
          record: {
            childAlias: this.data.childAlias.trim() || "孩子",
            transcript: this.data.transcript.trim(),
            abc,
            occurredAt: Date.now()
          }
        }
      });
      if (!result || !result.ok) throw new Error((result && result.error) || "保存失败");
      wx.removeStorageSync("pendingBehaviorReview");
      wx.showToast({ title: "已保存", icon: "success" });
      setTimeout(() => wx.switchTab({ url: "/pages/timeline/timeline" }), 500);
    } catch (error) {
      wx.showModal({
        title: "保存失败",
        content: error.message || error.errMsg || "请稍后重试。",
        showCancel: false
      });
    } finally {
      this.setData({ saving: false });
    }
  }
});
