const config = require("./config");

App({
  onLaunch() {
    if (!wx.cloud) {
      wx.showModal({
        title: "基础库版本过低",
        content: "请升级微信后再使用本小程序。",
        showCancel: false
      });
      return;
    }

    wx.cloud.init({
      env: config.cloudEnv || undefined,
      traceUser: true
    });

    this.globalData.profilePromise = wx.cloud
      .callFunction({
        name: "behaviorApi",
        data: { action: "profile" }
      })
      .then(({ result }) => {
        if (!result || !result.ok) throw new Error(result && result.error);
        this.globalData.openid = result.data.openid;
        return result.data;
      });
  },

  globalData: {
    openid: "",
    profilePromise: null,
    defaultChildAlias: config.defaultChildAlias
  }
});
