const app = getApp();
import Toast from '@vant/weapp/toast/toast';

Page({
  data: {
    userInfo: null,
    active: 'index',
    deviceCategories: ['All devices', 'Multimedia', 'Projector'],
    capacityCategories: ['All capacities', 'less than 15', '15-35', '35-60'],
    selectedDevice: 'All devices',
    selectedCapacity: 'All capacities',
    minDate: new Date().getTime(),
    maxDate: new Date().setDate(new Date().getDate() + 7),
    startDateTime: null,       // 初始化为null
    endDateTime: null,         // 初始化为null
    endMinDate: null,
    showStartDateTimePickerVisible: false,
    showEndDateTimePickerVisible: false,
    minHour: 8,
    maxHour: 22,
    filter(type, options) {
      if (type === 'hour') {
        return options.filter(option => option >= 8 && option <= 22);
      }
      if (type === 'minute') return options.filter(option => option % 30 === 0);
      return options;
    },
    rooms: [],
    teachingRooms: [],
    activitiesRooms: [],
    meetingRooms: [],
    totalMessage: null,
  },

  loadRooms() {
    const params = {};

    // 设备筛选
    if (this.data.selectedDevice === 'Multimedia') {
      params.multimedia = true;
    } else if (this.data.selectedDevice === 'Projector') {
      params.projector = true;
    }

    // 时间筛选（仅当同时存在时传递）
    if (this.data.startDateTime && this.data.endDateTime) {
      const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        // 转换为本地时间（避免时区问题）
        const localTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        const isoString = localTime.toISOString().split('.')[0];
        return isoString.slice(0, 16);
      };

      params.start = formatTime(this.data.startDateTime);
      params.end = formatTime(this.data.endDateTime);
    }

    console.log(params);

    // 容量筛选（前端处理）
    let rooms = [];
    wx.request({
      url: `http://${app.globalData.baseUrl}:8080/rooms/getRooms`,
      method: 'GET',
      data: params,
      success: (res) => {
        if (res.data?.code === 200) {
          rooms = res.data.data.rooms || [];

          if (this.data.selectedCapacity !== 'All capacities') {
            const capacityMap = {
              'less than 15': cap => cap < 15,
              '15-35': cap => cap >= 15 && cap <= 35,
              '35-60': cap => cap > 35 && cap <= 60
            };
            rooms = rooms.filter(room =>
              capacityMap[this.data.selectedCapacity](room.capacity)
            )
          }

          this.setData({
            rooms: rooms,
          });

          app.globalData.rooms = this.data.rooms;
          this.classifyRooms(rooms);
          console.log(res.data.data.rooms);
        }
      },
      complete: () => wx.hideLoading()
    });
  },

  classifyRooms(rooms) {
    const teachingRooms = rooms.filter(room => room.roomType === 1);
    const activitiesRooms = rooms.filter(room => room.roomType === 3);
    const meetingRooms = rooms.filter(room => room.roomType === 2);

    this.setData({ teachingRooms, activitiesRooms, meetingRooms });
  },

  onShow() {
    let userInfo = wx.getStorageSync('userInfo')
    this.setData({
      userInfo,
      totalMessage: app.globalData.unread
    })
  },
  onLoad(options) {
    wx.showLoading({
      title: 'Loading...',
      mask: true
    });

    let userInfo = wx.getStorageSync('userInfo')
    this.setData({
      userInfo
    })

    const currentDate = new Date();
    const minDate = this.updateMinTime(currentDate.getTime());

    this.setData({
      active: 'index',
      minDate: minDate,
      maxDate: new Date().setDate(currentDate.getDate() + 7),
      endMinDate: minDate + 1800000,
      totalMessage: app.globalData.unread
    });
    this.loadRooms(); // 初始加载所有数据
    if (userInfo == null || userInfo.uid==null) {
      return
    } else {
      wx.request({
        url: `http://${app.globalData.baseUrl}:8080/messages/countUnreadMessages`,
        method: 'GET',
        data: {
          receiver: userInfo.uid
        },
        success: (res) => {
          if (res.statusCode === 200) {
            const unreadCount = res.data.data;
            this.setData({
              totalMessage: unreadCount
            });
            app.globalData.unread = unreadCount;
            console.log(app.globalData.unread);
          } else {
            Toast.fail('Failed to load unread messages');
          }
        },
        fail: (err) => {
          Toast.fail('Network error');
        }
      });
    }
  },

  goToDetails: function (e) {
    if (!this.data.userInfo) {
      wx.showModal({
        title: 'Warning',
        content: 'Please log in before using.',
        cancelText: 'Cancel',
        confirmText: 'Confirm',
        complete: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login?url=index',
            })
          }
        }
      })
      return
    }
    const roomId = e.currentTarget.dataset.id;
    const rooms = this.data.rooms;
    const roomsString = JSON.stringify(rooms);
    const userId = this.data.userInfo.uid;
    if (this.data.userInfo.breakTimer >= 4) {
      Toast('You have been banned this month due to misconduct!');
      return
    }
    // 调用后端接口判断是否有权限
    wx.request({
      url: `http://${app.globalData.baseUrl}:8080/records/allowReserve?roomId=${roomId}&userId=${userId}`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200 && res.data.data === 'allow') {
          wx.navigateTo({
            url: '/pages/roomDetails/roomDetails?id=' + roomId + '&rooms=' + encodeURIComponent(roomsString)
          });
        } else {
          Toast('You do not have permission to access!');
        }
      },
      fail: (err) => {
        Toast.fail('Request failed, please retry later.');
      }
    });
  },

  onChange(event) {
    const activeTab = event.detail;
    wx.switchTab({
      url: `/pages/${activeTab}/${activeTab}`,
    });
  },

  // 设备类型改变
  onCategoryChange1: function (event) {
    const selectedIndex = event.detail.value;
    this.setData({
      selectedDevice: this.data.deviceCategories[selectedIndex]
    }, () => {
      this.loadRooms();
    });
  },

  // 容量筛选改变（前端筛选）
  onCategoryChange2: function (event) {
    const selectedIndex = event.detail.value;
    this.setData({
      selectedCapacity: this.data.capacityCategories[selectedIndex]
    }, () => {
      this.loadRooms(); // 仍然需要重新加载以应用筛选
    });
  },

  // 显示开始时间选择器
  showStartDateTimePicker() {
    this.setData({
      showStartDateTimePickerVisible: true,
    });
  },

  // 显示结束时间选择器
  showEndDateTimePicker() {
    if (!this.data.startDateTime) {
      Toast('Please choose start time first!');
      return;
    }

    // 动态计算最小结束时间（开始时间+30分钟）
    const endMinDate = this.data.startDateTime + 1800000; // 30分钟 = 30*60*1000

    this.setData({
      endMinDate: Math.min(endMinDate, this.data.maxDate), // 不能超过最大日期
      showEndDateTimePickerVisible: true
    });
  },

  // 关闭开始时间选择器
  onStartDateTimeClose() {
    this.setData({
      showStartDateTimePickerVisible: false,
    });
  },

  // 关闭结束时间选择器
  onEndDateTimeClose() {
    this.setData({
      showEndDateTimePickerVisible: false,
    });
  },

  // // 更新开始时间
  // onStartDateTimeInput(event) {
  //   this.setData({
  //     startDateTime: event.detail,
  //   });
  // },

  // // 更新结束时间
  // onEndDateTimeInput(event) {
  //   this.setData({
  //     endDateTime: event.detail,
  //   });
  // },

  onStartDateTimeConfirm(e) {
    const startDateTime = e.detail;
    this.setData({
      startDateTime,
      endMinDate: startDateTime + 1800000,
      endMinDate: startDateTime + 1800000,
      showStartDateTimePickerVisible: false
    }, () => this.loadRooms()); // 每次选择后都重新加载
  },

  onEndDateTimeConfirm(e) {
    this.setData({
      endDateTime: e.detail,
      showEndDateTimePickerVisible: false
    }, () => this.loadRooms()); // 每次选择后都重新加载
  },

  // 点击取消时关闭开始时间选择器
  onStartDateTimeCancel() {
    this.setData({
      showStartDateTimePickerVisible: false,  // 关闭弹出层
    });
  },

  // 点击取消时关闭结束时间选择器
  onEndDateTimeCancel() {
    this.setData({
      showEndDateTimePickerVisible: false,  // 关闭弹出层
    });
  },

  // 动态更新日期时间选择器的最小时间
  updateMinTime(currentTime) {
    const currentDate = new Date(currentTime);
    let hour = currentDate.getHours();
    let minute = currentDate.getMinutes();

    // 如果当前时间的分钟数大于 0 并且小于 30，那么下一个可选时间应该是 30 分
    if (minute > 0 && minute < 30) {
      currentDate.setMinutes(30);
    } else {
      currentDate.setMinutes(0);
      if (minute >= 30) {
        hour += 1; // 如果当前时间分钟数大于等于30，则时间增加一个小时
        currentDate.setHours(hour, 0);
      }
    }

    // 确保最小时间在 8:00 到 22:00 之间
    if (hour < 8) {
      currentDate.setHours(8, 0); // 如果小时小于 8 点，设为 8:00
    }
    if (hour > 22) {
      currentDate.setHours(22, 0); // 如果小时大于 22 点，设为 22:00
    }

    return currentDate.getTime();
  },

  goToSendMessage() {
    if (!this.data.userInfo) {
      wx.showModal({
        title: 'Warning',
        content: 'Please log in first',
        cancelText: 'Cancel',
        confirmText: 'Confirm',
        complete: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login?url=index',
            });
          }
        }
      });
      return;
    }

    const roomsData = JSON.stringify(this.data.rooms);
    const activeRoomID = '';
    wx.navigateTo({
      url: `/pages/sendMessage/sendMessage?rooms=${encodeURIComponent(roomsData)}&activeRoomID=${activeRoomID}`
    });
  }
});
