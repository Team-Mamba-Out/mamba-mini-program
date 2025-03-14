// pages/login/login.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    token:'',
    userInfo:null,
    email:'',
    code:'',
    url:''
  },
  emailInput(e){
    const value = e.detail.value;
    this.setData({
      email:value
    })
  },
  passwordInput(e){
    const value = e.detail.value;
    this.setData({
      code:value
    })
  },
  phoneLogin(){
    let code = this.data.code
    let email = this.data.email
    wx.request({
      url: `http://localhost:8080/verify/validate?email=${email}&codeInput=${code}`,
      method:'GET',
      success:(res)=>{
        let token = res.data.data
        this.setData({
          token
        })
        wx.setStorageSync('token',token)
        wx.request({
          url: 'http://localhost:8080/verify/getUserInfo',
          header:{
            Authorization:this.data.token
          },
          method:'GET',
          success:(res)=>{
            let userInfo = res.data.data
            this.setData({
              userInfo
            })
            wx.setStorageSync('userInfo', userInfo)
            let url = '/pages/' + this.data.url + '/' + this.data.url
            wx.switchTab({
              url: url,
            })
          }
        })
      }
    })
  },
  emailSend(){
    let email = this.data.email
    wx.request({
      url: `http://localhost:8080/verify/send?email=${email}`,
      method:'GET',
      success:(res)=>{
        wx.showToast({
          title: 'Send Successfully',
        })
      },
      fail:(res)=>{
        wx.showToast({
          title: res.errMsg,
          icon:'error'
        })
      }
    })
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.setData({
      url:options.url
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