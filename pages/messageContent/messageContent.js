// pages/messageContent/messageContent.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
      message:{
        id: 1,
        icon: "",
        iconColor: "#5c6bc0",
        sender:"Shanshan Zhang",
        title: "Notification",
        description: "A 30-minute break will be given between two consecutive exams...",
        timestamp: "2025-03-05 11:30:00",
        isRead:false
      },
  },
  
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    let message = wx.getStorageSync('message')
    let text = message.text.replace(/T/g, ' ')
    message = {...message, sender:'System',text}
    let icon = message.sender.match(/[A-Z]/g).join('')
    this.setData({
      message,
      "message.icon":icon
    })
    wx.setStorageSync('message', null)
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