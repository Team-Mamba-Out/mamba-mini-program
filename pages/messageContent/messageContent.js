// pages/messageContent/messageContent.js
const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    message: {
      id: 1,
      icon: "",
      iconColor: "#5c6bc0",
      sender: "Shanshan Zhang",
      title: "Notification",
      description: "A 30-minute break will be given between two consecutive exams...",
      timestamp: "2025-03-05 11:30:00",
      isRead: false
    },
    userInfo:null,
    startTime: '',
    endTime: ''
  },
  reject(){
    wx.request({
      url: `http://${app.globalData.baseUrl}:8080/records/reject`,
      method:'DELETE',
      data:{
        roomId:this.data.message.roomId,
        startTime:this.data.startTime,
        endTime:this.data.endTime,
        newUserId:this.data.userInfo.uid
      },
      success:(res)=>{
        wx.showToast({
          title: 'Done',
          duration:2000
        })
        wx.navigateTo({
          url: '/pages/message/message',
        })
      }
    })
  },
  accept(){
    wx.request({
      url: `http://${app.globalData.baseUrl}:8080/records/updateUserId`,
      method:'Put',
      data:{
        roomId:this.data.message.roomId,
        startTime:this.data.startTime,
        endTime:this.data.endTime,
        newUserId:this.data.userInfo.uid
      },
      success:(res)=>{
        wx.showToast({
          title: 'Done',
          duration:2000
        })
        wx.navigateTo({
          url: '/pages/message/message',
        })
      }
    })
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    let userInfo = wx.getStorageSync('userInfo')
    let message = wx.getStorageSync('message')
    message = { ...message, sender: 'System' }
    const timeMatches = message.text.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/g);
    let startTime = null;
    let endTime = null;
    if (timeMatches && timeMatches.length >= 3) {
      startTime = timeMatches[1]; // 第二个时间
      endTime = timeMatches[2];   // 第三个时间
    }
    let icon = message.sender.match(/[A-Z]/g).join('')
    this.setData({
      startTime,
      endTime,
      message,
      "message.icon": icon,
      userInfo
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