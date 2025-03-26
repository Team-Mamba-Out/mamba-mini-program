const app = getApp();
// pages/login/login.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    token: '',
    userInfo: null,
    email: null,
    code: '',
    url: '',
    isCounting: false,
    countdown: 0,
    showPrivacy: false,
    isAgreed: false,
  },
  emailInput(e) {
    const value = e.detail.value;
    this.setData({
      email: value
    })
  },
  passwordInput(e) {
    const value = e.detail.value;
    this.setData({
      code: value
    })
  },
  phoneLogin() {
    if (!this.data.isAgreed) {
      wx.showToast({
        title: 'Please agree to the privacy policy before logging in.',
        icon: 'none',
      });
      return;  // 阻止继续执行登录逻辑
    }
    let code = this.data.code
    let email = this.data.email
    wx.request({
      url: `http://${app.globalData.baseUrl}:8080/verify/validate?email=${email}&codeInput=${code}`,
      method: 'GET',
      success: (res) => {
        let token = res.data.data
        this.setData({
          token
        })
        wx.setStorageSync('token', token)
        wx.request({
          url: `http://${app.globalData.baseUrl}:8080/verify/getUserInfo`,
          header: {
            Authorization: this.data.token
          },
          method: 'GET',
          success: (res) => {
            if (res.data.code != 200) {
              wx.showToast({
                icon: 'error',
                title: 'Invalid Input!',
              })
              return
            }
            let userInfo = res.data.data
            this.setData({
              userInfo
            })
            wx.setStorageSync('userInfo', userInfo)
            wx.showToast({
              title: 'Login Successfully!',
              icon: "success",
              duration: 2000
            })
            let url = '/pages/' + this.data.url + '/' + this.data.url
            wx.switchTab({
              url: url,
            })
          }
        })
      }
    })
  },
  emailSend() {
    let email = this.data.email;

    // 如果没有输入有效的邮箱
    if (!email) {
      wx.showToast({
        title: 'Invalid Email',
        icon: 'error',
      });
      return;
    }

    // 如果当前正在倒计时，不能再次点击
    if (this.data.isCounting) {
      wx.showToast({
        title: 'Please wait',
        icon: 'none',
      });
      return;
    }

    // 开始倒计时
    this.setData({
      isCounting: true,  // 标记为正在倒计时
      countdown: 60,     // 设置倒计时时间为60秒
    });

    // 倒计时逻辑
    this.countdownTimer = setInterval(() => {
      if (this.data.countdown <= 0) {
        clearInterval(this.countdownTimer);  // 倒计时结束，清除定时器
        this.setData({
          isCounting: false,
          countdown: 0,
        });
      } else {
        this.setData({
          countdown: this.data.countdown - 1,
        });
      }
    }, 1000);

    // 显示loading
    wx.showLoading({
      title: 'Sending',
    });

    // 发起请求
    wx.request({
      url: `http://${app.globalData.baseUrl}:8080/verify/send?email=${email}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();
        wx.showToast({
          title: 'Done',
        });
      },
      fail: (res) => {
        wx.showToast({
          title: res.errMsg,
          icon: 'error',
        });
      },
    });
  },
  onCheckboxChange(e) {
    var agree = this.data.isAgreed;
    this.setData({
      isAgreed: !agree,
    });
  },

  showPrivacyPolicy() {
    this.setData({
      showPrivacy: true, // 显示隐私政策弹窗
    });
  },

  closePrivacyPolicy() {
    this.setData({
      showPrivacy: false, // 关闭隐私政策弹窗
    });
  },

  preventClose: function (e) {
    console.log("");
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.setData({
      url: options.url
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})