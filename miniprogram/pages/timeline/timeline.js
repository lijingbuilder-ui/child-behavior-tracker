function formatTime(value) {
  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

Page({
  data: {
    records: [],
    loading: false,
    error: ""
  },

  onShow() {
    this.loadRecords();
  },

  onPullDownRefresh() {
    this.loadRecords().finally(() => wx.stopPullDownRefresh());
  },

  async loadRecords() {
    this.setData({ loading: true, error: "" });
    try {
      const { result } = await wx.cloud.callFunction({
        name: "behaviorApi",
        data: { action: "listRecords", limit: 50 }
      });
      if (!result || !result.ok) throw new Error((result && result.error) || "加载失败");
      const records = result.data.records.map((record) => ({
        ...record,
        timeLabel: formatTime(record.occurredAt)
      }));
      this.setData({ records });
    } catch (error) {
      this.setData({ error: error.message || error.errMsg || "加载失败" });
    } finally {
      this.setData({ loading: false });
    }
  }
});
