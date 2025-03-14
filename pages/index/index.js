Page({
  data: {
    userInfo:null,
    active: 'index',
    deviceCategories: ['All devices', 'Multimedia', 'Projector'],
    capacityCategories: ['All capacities', 'less than 15', '15-35', '35-60'],
    selectedDevice: 'All devices',
    selectedCapacity: 'All capacities',
    minDate: new Date().getTime(),
    maxDate: new Date().setDate(new Date().getDate() + 7),
    startDateTime: null,       // 初始为null显示提示
    endDateTime: null,         // 初始为null显示提示
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

    // 初始化空数据
    rooms: [],
    teachingRooms: [],
    activitiesRooms: [],
    meetingRooms: []
  },

  // 加载房间数据
  loadRooms() {
    const params = {};

    // 只有在选择了设备类别时才传递 `multimedia` 和 `projector`
    if (this.data.selectedDevice === 'Multimedia') {
      params.multimedia = true;
    } else if (this.data.selectedDevice === 'Projector') {
      params.projector = true;
    }

    // 处理时间筛选
    if (this.data.startDateTime) {
      const localStartTime = new Date(this.data.startDateTime);

      // 获取本地时区偏差（单位：分钟）
      const timezoneOffset = localStartTime.getTimezoneOffset();

      // 加上时区差
      localStartTime.setMinutes(localStartTime.getMinutes() - timezoneOffset);

      // 将本地时间转为ISO格式并去掉毫秒部分
      const startTimeString = localStartTime.toISOString().split('.')[0];  // 去掉毫秒部分
      params.start = startTimeString;
      if (this.data.endDateTime) {
        const localEndTime = new Date(this.data.endDateTime);

        // 获取本地时区偏差（单位：分钟）
        const timezoneOffset = localEndTime.getTimezoneOffset();

        // 加上时区差
        localEndTime.setMinutes(localEndTime.getMinutes() - timezoneOffset);

        // 将本地时间转为ISO格式并去掉毫秒部分
        const endTimeString = localEndTime.toISOString().split('.')[0];  // 去掉毫秒部分
        params.end = endTimeString;
      }
      else {
        return;
      }
    }

    console.log("Params before sending:", params); // 调试输出

    wx.request({
      url: 'http://localhost:8080/rooms/getRooms',
      method: 'GET',
      data: params,
      success: (res) => {
        console.log("API Success Response:", res);
        if (res.data && res.data.code === 200) {
          let rooms = res.data.data.rooms || [];

          // 前端容量筛选
          if (this.data.selectedCapacity !== 'All capacities') {
            const capacityMap = {
              'less than 15': cap => cap < 15,
              '15-35': cap => cap >= 15 && cap <= 35,
              '35-60': cap => cap > 35 && cap <= 60
            };

            if (capacityMap[this.data.selectedCapacity]) {
              rooms = rooms.filter(room =>
                capacityMap[this.data.selectedCapacity](room.capacity)
              );
            }
          }

          // 分类房间（假设后端返回的roomType是数字）
          const teachingRooms = rooms.filter(room => room.roomType === 1);
          const activitiesRooms = rooms.filter(room => room.roomType === 3);
          const meetingRooms = rooms.filter(room => room.roomType === 2);

          this.setData({
            rooms,
            teachingRooms,
            activitiesRooms,
            meetingRooms
          });
        }
      },
      fail: (err) => {
        console.error("API Error:", err);
        this.handleDataError();
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  onShow(){
    let userInfo = wx.getStorageSync('userInfo')
    this.setData({
      userInfo
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
    // 初始化时加载房间数据
    this.loadRooms();

    const currentTime = new Date().getTime();
    const minTime = this.updateMinTime(currentTime);
    // 初始结束时间最小值为开始时间+30分钟
    const endMinDate = minTime + 1800000;

    this.setData({
      active: 'index',
      startDateTime: minTime,
      endDateTime: minTime + 1800000, // 默认结束时间比开始晚1小时
      minDate: minTime,
      endMinDate: endMinDate
    });
  },

  goToDetails: function (e) {
    const roomId = e.currentTarget.dataset.id;
    const rooms = this.data.rooms;
    const roomsString = JSON.stringify(rooms);
    const userId = this.data.userInfo.uid;
    if (!this.data.userInfo) {
        wx.showModal({
          title: 'Warning',
          content: 'Please log in before using.',
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
    // 调用后端接口判断是否有权限
    wx.request({
      url: `http://localhost:8080/records/allowReserve?roomId=${roomId}&userId=${userId}`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200 && res.data.data === 'allow') {
          wx.navigateTo({
            url: '/pages/roomDetails/roomDetails?id=' + roomId + '&rooms=' + encodeURIComponent(roomsString)
          });
        } else {
          // 如果没有权限，弹出提示
          wx.showToast({
            title: 'You do not have permission to access!',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: (err) => {
        // 请求失败时的处理
        wx.showToast({
          title: 'Request failed, please retry later.',
          icon: 'none',
          duration: 2000
        });
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
      wx.showToast({
        title: '请先选择开始时间',
        icon: 'none'
      });
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

  // 更新开始时间
  onStartDateTimeInput(event) {
    this.setData({
      startDateTime: event.detail,
    });
  },

  // 更新结束时间
  onEndDateTimeInput(event) {
    this.setData({
      endDateTime: event.detail,
    });
  },

  onStartDateTimeConfirm(e) {
    const startDateTime = e.detail;
    const endMinDate = startDateTime + 1800000;

    this.setData({
      startDateTime,
      endMinDate,
      showStartDateTimePickerVisible: false,
      endDateTime: null // 重置结束时间
    }, () => {
      this.loadRooms();
    });
  },

  onEndDateTimeConfirm(event) {
    this.setData({
      endDateTime: event.detail,
      showEndDateTimePickerVisible: false,
    }, () => {
      this.loadRooms();
    });
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
});
