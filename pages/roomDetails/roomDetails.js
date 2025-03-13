Page({

  data: {
    room: {},
    rooms: [],
    dateList: [],      // 日期列表
    activeDate: '',    // 当前选中日期
    timeLabels: [],    // 时间刻度
    currentSchedule: [], // 当前日程数据
    room: {},          // 教室数据
    scheduleData: {},
    formattedDescription: ''
  },
  onLoad(options) {
    // 初始化日期数据
    this.generateDateList(7);
    // 生成时间刻度
    this.generateTimeLabels();
    // 加载教室数据
    this.loadRoomData(options);
    this.formatDescription();

    // 假设你已经通过 wx.request 获取了后端返回的时间段数据
    this.loadScheduleDataFromBackend(this.data.room.id);
  },

  // 从后端加载并转换日程数据
  loadScheduleDataFromBackend(roomId) {
    console.log(roomId);
    wx.request({
      url: `http://localhost:8080/rooms/getBusyTime?id=${roomId}`,
      method: 'GET',
      success: (res) => {
        if (res.data.code === 200) {
          const roomRecordPeriods = res.data.data;
          const scheduleData = this.processScheduleData(roomRecordPeriods);
          this.setData({
            scheduleData: scheduleData
          });
          this.updateSchedule();  // 重新计算并更新当前的日程
          console.log(this.data.scheduleData);
        } else {
          console.error('Failed to load room schedule data.', res);
        }
      },
      fail: (err) => {
        console.error('Request failed', err);
      }
    });
  },

  // 处理从后端返回的时间段数据
  processScheduleData(roomRecordPeriods) {
    const scheduleData = {};

    roomRecordPeriods.forEach(recordPeriod => {
      // 确保转换时间为 Date 对象
      const start = new Date(recordPeriod[0]);  // 将时间字符串转换为 Date 对象
      const end = new Date(recordPeriod[1]);

      // 如果 start 和 end 不是有效的 Date 对象，跳过
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('Invalid date:', recordPeriod);
        return;
      }

      // 格式化日期和时间
      const dateKey = start.toISOString().split('T')[0];  // 'yyyy-mm-dd'
      const startTime = this.formatTime(start);
      const endTime = this.formatTime(end);

      // 确保日期的条目存在
      if (!scheduleData[dateKey]) {
        scheduleData[dateKey] = [];
      }

      // 添加到对应日期的数据
      scheduleData[dateKey].push({
        startTime: startTime,
        endTime: endTime,
        status: 'busy',
        title: 'Occupied'
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

    // 1. 将"Key Points:"加粗
    description = description.replace('Key Points:', '<br><br><b>Key Points:</b><br>');

    // 3. 更新到 data 中
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

      dateList.push({
        fullDate: date.toISOString().split('T')[0],
        weekdayShort: weekDays[date.getDay()],
        day: date.getDate(),
        month: date.getMonth() + 1
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
    this.setData({ room });
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
})