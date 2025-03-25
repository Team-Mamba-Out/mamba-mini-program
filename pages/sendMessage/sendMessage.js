const app = getApp();

Page({
  data: {
    userInfo: null,
    activeType: null,
    rooms: [],
    activeRoomID: null,
    selectedRoom: null,
    showPickerModal: false,
    content: '',
    loading: false,
    typeLabels: ['Later Date Booking', 'Issue with Room', 'Other Feedback']
  },

  onLoad(options) {
    let userInfo = wx.getStorageSync('userInfo')
    this.setData({
      userInfo
    })
    // 获取通过 URL 传递的 rooms 数据
    if (options.rooms) {
      const rooms = JSON.parse(decodeURIComponent(options.rooms));  // 解析 JSON 数据
      this.setData({
        rooms: (rooms || []).map(room => ({
          id: room.id,
          roomName: `${room.roomName} (${room.capacity} seats)`
        }))
      });
    }

    if (options.activeRoomID) {
      const activeRoomID = options.activeRoomID;
      this.setData({
        activeRoomID: activeRoomID,
        selectedRoom: this.data.rooms[activeRoomID - 1]
      });
    }
  },

  selectType(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      activeType: this.data.activeType === index ? null : index
    });
  },

  showPicker() {
    this.setData({ showPickerModal: true });
  },

  closePicker() {
    this.setData({ showPickerModal: false });
  },

  selectRoom(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      selectedRoom: this.data.rooms[index],
      showPickerModal: false
    });
  },

  onContentChange(e) {
    this.setData({ content: e.detail.value });
  },

  // 提交表单
  submit() {
    const { activeType, content, selectedRoom } = this.data;

    if (activeType === null) {
      wx.showToast({ title: 'Please select message type', icon: 'none' });
      return;
    }

    if (!content.trim()) {
      wx.showToast({ title: 'Please enter content', icon: 'none' });
      return;
    }

    const userId = this.data.userInfo.uid;
    const name = this.data.userInfo.name;
    const roomId = selectedRoom?.id || null;
    const title = this.data.typeLabels[activeType];
    let messageType = 0;
    if (activeType === 1) {
      messageType = 1;
    } else if (activeType === 0) {
      messageType = 2;
    }
    const date = new Date();
    const localDateTime = this.formatLocalDateTime(date);

    const messageData = {
      receiver: 1,
      title: title,
      text: content,
      createTime: localDateTime,
      isRead: false,
      sender: `${userId}; ${name}`,
      type: messageType,
      roomId: roomId
    };

    console.log(messageData);

    this.setData({ loading: true });

    wx.request({
      url: `http://${getApp().globalData.baseUrl}:8080/messages/create`, 
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
      },
      data: messageData, 
      success: (res) => {
        if (res.data.code === 200) {
          wx.showToast({
            title: 'Submitted!',
            icon: 'success',
            complete: () => setTimeout(() => wx.navigateBack(), 1500)  
          });
        } else {
          wx.showToast({ title: 'Failed: ' + res.data.msg, icon: 'none' });
        }
      },
      fail: (err) => {
        wx.showToast({ title: 'Network error, please try again later.', icon: 'none' });
      },
      complete: () => {
        this.setData({ loading: false });  
      }
    });
  },

  // 防止触摸事件导致的滚动
  preventScroll() {
    return false;  // 阻止页面滚动
  },
  formatLocalDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); 
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
});
