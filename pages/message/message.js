const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    activeTab: 'announcements',
    active: "message",
    userInfo: null,
    color: [],
    messages: [],
    unread: {
      announcements: 0,
      messages: 0
    },
    totalMessage: null,
    startX: 0 // 记录滑动起点
  },

  updateUnreadCount() {
    const unreadAnnouncementCount = this.data.messages.filter(msg => !msg.read && msg.receiver === this.data.userInfo.uid).length;
    const unreadMessageCount = this.data.messages.filter(msg => !msg.read && msg.senderId == this.data.userInfo.uid).length;
    this.setData({
      'unread.announcements': unreadAnnouncementCount,
      'unread.messages': unreadMessageCount,
      totalMessage: unreadAnnouncementCount + unreadMessageCount,
    });
    app.globalData.unread = this.data.totalMessage;
  },
  navigateToContent(e) {
    let id = e.currentTarget.dataset.id
    if (this.data.messages.some(item => item.id === id && item.read === false)) {
      wx.request({
        url: `http://${app.globalData.baseUrl}:8080/messages/read`,
        method: 'POST',
        data: {
          id
        },
        fail: (err) => {
          console.log(err);
        }
      })
    }
    let message = this.data.messages.find(item => item.id === id)
    wx.setStorageSync('message', message)
    wx.navigateTo({
      url: '/pages/messageContent/messageContent'
    })
  },
  switchTab(e) {
    this.setData({
      activeTab: e.currentTarget.dataset.tab
    });
  },
  touchStart(e) {
    this.setData({ startX: e.touches[0].clientX });
  },
  getMessages() {
    let uid = this.data.userInfo.uid
    wx.request({
      url: `http://${app.globalData.baseUrl}:8080/messages/getMessage/${uid}`,
      method: 'GET',
      success: (res) => {
        let messages = res.data.data.messages
        messages = messages.map(item => ({
          ...item, offset: 0, shortContent: item.text.length > 85 ? item.text.substring(0, 85) + '...' : item.text, createTime: item.createTime.replace("T", " "), senderId: item.sender.split(";")[0], sender: item.sender.split(";")[0] == 1 ? "System Admin" : item.sender.split(";")[1]
        }))
        wx.request({
          url: `http://${app.globalData.baseUrl}:8080/messages/getSendMessage/${uid}`,
          method: 'GET',
          success: (res) => {
            let messages1 = res.data.data.messages
            messages1 = messages1.map(item => ({
              ...item, offset: 0, shortContent: item.text.length > 85 ? item.text.substring(0, 85) + '...' : item.text, createTime: item.createTime.replace("T", " "), senderId: item.sender.split(";")[0], sender: item.sender.split(";")[1]
            }))
            let newMessage = [...messages, ...messages1]
            console.log(newMessage);
            newMessage = newMessage.reverse()
            this.setData({
              messages: newMessage
            })
            this.updateUnreadCount()
          }
        })
      }
    })



  },
  // 触摸移动
  touchMove(e) {
    const index = e.currentTarget.dataset.index;
    const moveX = e.touches[0].clientX - this.data.startX;

    // 如果左滑且超过阈值 (-80px)，则显示删除按钮
    let newOffset = moveX < -40 ? -40 : 0;
    let expanded = newOffset < -10;
    this.setData({
      [`messages[${index}].offset`]: newOffset,
      [`messages[${index}].expanded`]: expanded
    });
  },

  // 触摸结束
  touchEnd(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.messages[index];
    let expanded = item.offset < -20;
    this.setData({
      [`messages[${index}].offset`]: this.data.messages[index].offset,
      [`messages[${index}].expanded`]: expanded
    });
  },

  onChange(event) {
    const activeTab = event.detail;
    wx.switchTab({
      url: `/pages/${activeTab}/${activeTab}`,
    });
  },

  // 删除消息
  deleteMessage(e) {
    const id = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    // 先设置 deleting 状态，触发滑出动画
    this.setData({ [`messages[${index}].deleting`]: true });

    // 延迟 300ms，等动画完成后再删除
    setTimeout(() => {
      wx.request({
        url: `http://${app.globalData.baseUrl}:8080/messages/delete/${id}`,
        method: 'DELETE',
        success: () => {
          this.getMessages()
        }
      })
    }, 500); // 300ms 对应 CSS 的 transition 时间
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

    this.setData({
      active: 'message',
    });
    /*wx.request({
      url: 'localhost:8080/rooms/getRooms',
      method:'GET',
      header: {
        'content-type': 'application/json' // 头部信息，默认 application/json
      },
      success(res){
        console.log(res.data);
      },
      fail(){
        console.log("fail");
      }
    })*/
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
    let userInfo = wx.getStorageSync('userInfo')
    this.setData({
      userInfo
    })
    if (!userInfo) {
      wx.showModal({
        title: 'Warning',
        content: 'Please log in before using.',        
        cancelText: 'Cancel',
        confirmText: 'Confirm',
        complete: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login?url=order',
            })
          }
        }
      })
      return
    }
    this.getMessages()
    app.globalData.unread = this.data.totalMessage;
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