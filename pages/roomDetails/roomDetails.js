const app = getApp()

Page({
  data: {
    room: {},
    rooms: [],
    dateList: [],
    activeDate: '',
    timeLabels: [],
    currentSchedule: [],
    scheduleData: {},
    maintenanceData: {},
    formattedDescription: '',
    isLoading: true, // 添加加载状态
  },

  async onLoad(options) {
    this.generateDateList(7);
    this.generateTimeLabels();
    this.loadRoomData(options);
    this.formatDescription();

    // 使用 async/await 来确保数据加载完成
    await this.loadData(options.id);
  },

  // 封装加载数据的逻辑
  async loadData(roomId) {
    try {
      this.setData({ isLoading: true }); // 设置为加载中状态

      // 等待 schedule 和 maintenance 数据加载完成
      await Promise.all([
        this.loadScheduleDataFromBackend(roomId),
        this.loadMaintenanceDataFromBackend(roomId)
      ]);

      this.updateSchedule();  // 确保两个数据都加载完后再更新日程
      this.setData({ isLoading: false }); // 数据加载完成，设置为已加载状态
    } catch (error) {
      console.error('Error loading data:', error);
      this.setData({ isLoading: false }); // 设置为加载完成状态，即使加载失败
    }
  },

  // 从后端加载并转换日程数据
  loadScheduleDataFromBackend(roomId) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `http://${app.globalData.baseUrl}:8080/rooms/getBusyTime?id=${roomId}`,
        method: 'GET',
        success: (res) => {
          if (res.data.code === 200) {
            const roomRecordPeriods = res.data.data;
            const scheduleData = this.processScheduleData(roomRecordPeriods);
            this.setData({
              scheduleData: scheduleData
            });
            resolve();  // 成功时调用 resolve
          } else {
            console.error('Failed to load room schedule data.', res);
            reject('Failed to load schedule data');  // 错误时调用 reject
          }
        },
        fail: (err) => {
          console.error('Request failed', err);
          reject(err);  // 请求失败时调用 reject
        }
      });
    });
  },

  loadMaintenanceDataFromBackend(roomId) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `http://${app.globalData.baseUrl}:8080/rooms/getMaintenance?id=${roomId}`,
        method: 'GET',
        success: (res) => {
          if (res.data.code === 200) {
            const maintenancePeriods = res.data.data;
            const maintenanceData = this.processMaintenanceData(maintenancePeriods);

            // 合并维修时间和日程数据
            const combinedScheduleData = { ...this.data.scheduleData };

            for (const dateKey in maintenanceData) {
              if (!combinedScheduleData[dateKey]) {
                combinedScheduleData[dateKey] = [];
              }

              combinedScheduleData[dateKey] = this.mergeSchedules(
                combinedScheduleData[dateKey],
                maintenanceData[dateKey]
              );
            }

            this.setData({
              scheduleData: combinedScheduleData,
              maintenanceData: maintenanceData, // 保存维修数据
            });
            resolve();  // 成功时调用 resolve
          } else {
            console.error('Failed to load maintenance schedule data.', res);
            reject('Failed to load maintenance data');  // 错误时调用 reject
          }
        },
        fail: (err) => {
          console.error('Request failed', err);
          reject(err);  // 请求失败时调用 reject
        }
      });
    });
  },

  // 合并日程数据的辅助函数
  mergeSchedules(existingSchedules, newSchedules) {
    const mergedSchedules = [...existingSchedules];

    // 将新的维修时间段添加到已有的日程中
    newSchedules.forEach(newSchedule => {
      // 检查是否已经存在相同时间段，避免重复
      const isDuplicate = mergedSchedules.some(schedule =>
        schedule.startTime === newSchedule.startTime && schedule.endTime === newSchedule.endTime
      );

      if (!isDuplicate) {
        mergedSchedules.push(newSchedule);  // 不重复的就添加进去
      }
    });
    return mergedSchedules;
  },

  async onShow() {
    const roomId = this.data.room.id;
    await this.loadData(roomId);  // 使用 roomId 来加载数据
  },

  // 处理从后端返回的维修时间段数据
  processMaintenanceData(maintenancePeriods) {
    const maintenanceData = {};

    maintenancePeriods.forEach(period => {
      const start = new Date(period.startTime);  // 将时间字符串转换为 Date 对象
      const end = new Date(period.endTime);

      // 如果 start 和 end 不是有效的 Date 对象，跳过
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('Invalid date:', period);
        return;
      }

      // 格式化日期和时间
      const dateKey = start.toISOString().split('T')[0];  // 'yyyy-mm-dd'
      const startTime = this.formatTime(start);
      const endTime = this.formatTime(end);

      // 确保日期的条目存在
      if (!maintenanceData[dateKey]) {
        maintenanceData[dateKey] = [];
      }

      // 添加维修时间到对应日期的数据，标题为 'Repair'
      maintenanceData[dateKey].push({
        startTime: startTime,
        endTime: endTime,
        status: 'busy',
        title: 'Repairing'
      });
    });

    return maintenanceData;
  },

  // 处理从后端返回的时间段数据
  processScheduleData(roomRecordPeriods) {
    const scheduleData = {};

    roomRecordPeriods.forEach(recordPeriod => {
      // 确保转换时间为 Date 对象
      const start = new Date(recordPeriod.startTime);  // 将时间字符串转换为 Date 对象
      const end = new Date(recordPeriod.endTime);

      // 如果 start 和 end 不是有效的 Date 对象，跳过
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('Invalid date:', recordPeriod);
        return;
      }

      // 格式化日期和时间
      const dateKey = start.toISOString().split('T')[0];  // 'yyyy-mm-dd'
      const startTime = this.formatTime(start);
      const endTime = this.formatTime(end);

      // 根据 uid 来判断日程标题
      let title = 'Reserved';  // 默认值为 'reserved'
      if (recordPeriod.uid === 1) {
        title = 'Class';
      }

      // 确保日期的条目存在
      if (!scheduleData[dateKey]) {
        scheduleData[dateKey] = [];
      }

      // 添加到对应日期的数据
      scheduleData[dateKey].push({
        startTime: startTime,
        endTime: endTime,
        status: 'busy',
        title: title
      });
    });

    return scheduleData;
  },

  // 格式化时间为 'HH:mm'
  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  },

  // 更新日程
  updateSchedule() {
    const schedule = this.data.scheduleData[this.data.activeDate] || [];
    const processed = schedule.map(item => {
      const start = this.timeToMinutes(item.startTime);
      const end = this.timeToMinutes(item.endTime);

      // 每小时对应的时间段：每60分钟一个单位
      const startPosition = (start - 480) * 1; // 每小时一个单位，单位为1rpx
      const blockHeight = (end - start) * 1 - 50; // 每小时一个单位

      return {
        ...item,
        position: startPosition,
        height: blockHeight,
        displayTime: `${item.startTime}-${item.endTime}`
      };
    });

    this.setData({ currentSchedule: processed });
  },

  formatDescription() {
    let description = this.data.room.description;
    description = description.replace('Key Points:', '<div style="margin: 5px; font-weight: bold; margin-left: 0px;">Key Points:</div>');

    description = `<div style="margin: 5px; margin-bottom: -5px;">${description}</div>`;

    this.setData({
      formattedDescription: description
    });
  },

  // 生成7天日期列表
  generateDateList(days) {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const dateList = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const fullDate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

      dateList.push({
        fullDate: fullDate,
        weekdayShort: weekDays[date.getDay()],
        day: day,
        month: month
      });
    }

    this.setData({
      dateList,
      activeDate: dateList[0].fullDate
    }, () => this.updateSchedule());
  },

  // 加载教室数据
  loadRoomData(options) {
    const roomId = options.id;
    const rooms = JSON.parse(decodeURIComponent(options.rooms));
    const room = rooms.find(r => r.id === parseInt(roomId));
    this.setData({
      room: room,
      rooms: rooms
    });
  },

  // 生成时间轴刻度
  generateTimeLabels() {
    const labels = [];
    // 只生成每小时的时间刻度
    for (let h = 8; h <= 22; h++) {
      labels.push(`${h.toString().padStart(2, '0')}:00`);
      // labels.push(`${h.toString().padStart(2, '0')}:30`);
    }
    this.setData({ timeLabels: labels });
  },

  // 更新日程计算逻辑
  updateSchedule() {
    const schedule = this.data.scheduleData[this.data.activeDate] || [];
    const processed = schedule.map(item => {
      const start = this.timeToMinutes(item.startTime);
      const end = this.timeToMinutes(item.endTime);

      // 每小时对应的时间段：每60分钟一个单位
      const startPosition = (start - 480) * 1; // 每小时一个单位，单位为1rpx
      const blockHeight = (end - start) * 1 - 50; // 每小时一个单位

      return {
        ...item,
        position: startPosition,
        height: blockHeight,
        displayTime: `${item.startTime}-${item.endTime}`
      };
    });

    this.setData({ currentSchedule: processed });
  },


  // 时间转换方法
  timeToMinutes(time) {
    const [h, m] = time.split(':');
    return parseInt(h) * 60 + parseInt(m);
  },

  // 切换日期
  switchDate(e) {
    const date = e.currentTarget.dataset.date;
    this.setData({ activeDate: date }, () => this.updateSchedule());
    console.log(this.data.activeDate);
  },

  // 预约处理
  handleBook: function (e) {
    const selectedDate = e.currentTarget.dataset.date;
    const room = this.data.room;
    const roomName = this.data.room.roomName;

    // 假设 scheduleData 包含了所有日期的预定数据，存储完整的 schedule 数据
    const schedule = this.data.scheduleData || {};  // 默认没有 schedule 数据时使用空对象

    // 存储数据
    wx.setStorageSync('roomBookingData', {
      selectedDate,
      room,
      schedule
    });

    wx.showModal({
      title: 'Confirm Reservation',
      content: `Confirm -- date: ${selectedDate} - room: ${roomName}`,
      cancelText: 'Cancel',
      confirmText: 'Confirm',
      success: (res) => {
        if (res.confirm) {
          // 跳转到目标页面并传递一个简单标识符
          wx.navigateTo({
            url: `/pages/roomBooking/roomBooking?id=roomBookingData`
          });
        }
      }
    });
  },
  goToSendMessage() {
    const roomsData = JSON.stringify(this.data.rooms);
    const activeRoomID = this.data.room.id;
    wx.navigateTo({
      url: `/pages/sendMessage/sendMessage?rooms=${encodeURIComponent(roomsData)}&activeRoomID=${activeRoomID}`
    });
  }
})