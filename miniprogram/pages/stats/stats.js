Page({
  data: {
    summary: { total: 0, averageIntensity: 0 },
    daily: [],
    categories: [],
    rangeLabel: "",
    loading: false,
    error: ""
  },

  onShow() {
    this.loadStats();
  },

  async loadStats() {
    this.setData({ loading: true, error: "" });
    try {
      const { result } = await wx.cloud.callFunction({
        name: "behaviorApi",
        data: { action: "weeklyStats" }
      });
      if (!result || !result.ok) throw new Error((result && result.error) || "加载失败");
      const maxDaily = Math.max(...result.data.daily.map((item) => item.count), 1);
      const maxCategory = Math.max(...result.data.categories.map((item) => item.count), 1);
      this.setData({
        ...result.data,
        daily: result.data.daily.map((item) => ({
          ...item,
          percent: Math.round((item.count / maxDaily) * 100)
        })),
        categories: result.data.categories.map((item) => ({
          ...item,
          percent: Math.round((item.count / maxCategory) * 100)
        }))
      });
    } catch (error) {
      this.setData({ error: error.message || error.errMsg || "加载失败" });
    } finally {
      this.setData({ loading: false });
    }
  }
});
