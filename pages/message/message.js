const app = getApp();

// pages/message/message.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    active: "message",
    color:[],
    messages: [
      {
        id: 1,
        icon: "🏰",
        iconColor: "#5c6bc0",
        title: "Hogwarts",
        subtitle: "General announcement",
        description: "A 30-minute break will be given between two consecutive exams...",
        timestamp: "Scheduled: 10 Feb 2021, 11:30 am",
        offset: 0, // 记录滑动偏移量,
        isRead:true
      },
      {
        id: 2,
        icon: "🧪",
        iconColor: "#42a5f5",
        title: "Chemistry X A",
        subtitle: "General announcement",
        description: "Examination papers will be mailed to registered mail IDs...",
        timestamp: "12 Jan",
        offset: 0,
        isRead:true
      },
      {
        id: 3,
        icon: "📚",
        iconColor: "#26a69a",
        title: "Physics",
        subtitle: "Examination",
        description: "Teachers will be available in their respective classrooms...",
        timestamp: "10 Jan",
        offset: 0,
        isRead:false
      }
    ],
    startX: 0 // 记录滑动起点
  },
// 开始触摸
navigateToContent(e){
  let id = e.currentTarget.dataset.id
  wx.navigateTo({
    url: '/pages/messageContent/messageContent?id=' + id,
  })
},
touchStart(e) {
  this.setData({ startX: e.touches[0].clientX });
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
  const index = e.currentTarget.dataset.index;
  
  // 先设置 deleting 状态，触发滑出动画
  this.setData({ [`messages[${index}].deleting`]: true });

  // 延迟 300ms，等动画完成后再删除
  setTimeout(() => {
    let messages = this.data.messages;
    messages.splice(index, 1);
    this.setData({ messages });
  }, 300); // 300ms 对应 CSS 的 transition 时间
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