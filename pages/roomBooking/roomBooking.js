const app = getApp();
Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo:null,
    selectedDate: null,
    room: null,
    schedule: null,
    fullSchedule: null,
    timeSlots: [],     // 生成的所有时间段
    selectedSlots: [], // 用户选中的时间段keys
    startTime: null,   // 开始时间
    endTime: null,     // 结束时间
    activeSlot: null,  // 当前正在点击的时间段
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    let userInfo = wx.getStorageSync('userInfo')
    this.setData({
      userInfo
    })
    const bookingData = wx.getStorageSync('roomBookingData'); // 获取存储的数据

    if (bookingData) {
      const { selectedDate, room, schedule } = bookingData;

      // 存储完整的 schedule 数据
      this.setData({
        selectedDate,
        room,
        fullSchedule: schedule || 'no_schedule',  // 存储完整的 schedule 数据
      }, () => {
        // 根据选中的日期筛选出当天的 schedule 数据
        this.filterScheduleForSelectedDate(selectedDate);
        // 根据日期生成时间段
        this.generateTimeSlots();
      });
    }
  },

  /**
   * 根据选中的日期筛选出当天的 schedule 数据
   */
  filterScheduleForSelectedDate(selectedDate) {
    const { fullSchedule } = this.data;
    const selectedSchedule = fullSchedule[selectedDate] || 'no_schedule';

    this.setData({ schedule: selectedSchedule });
  },

  /**
   * 生成时间槽位
   */
  generateTimeSlots() {
    const slots = [];
    let currentMinutes = 8 * 60; // 8:00开始

    while (currentMinutes <= 21 * 60 + 30) { // 22:00结束
      const startTime = this.formatTime(currentMinutes);
      const endTime = this.formatTime(currentMinutes + 30);
      const slotKey = `${startTime}-${endTime}`;

      // 检查是否被占用
      const isDisabled = this.checkIsDisabled(startTime, endTime);

      slots.push({
        startTime,
        endTime,
        key: slotKey,
        disabled: isDisabled
      });

      currentMinutes += 30;
    }

    this.setData({ timeSlots: slots });
  },

  /**
   * 时间格式化（HH:mm）
   */
  formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  },

  /**
   * 检查时间段是否被占用
   */
  checkIsDisabled(start, end) {
    // Get today's date and compare with selected date
    const today = new Date();
    const selectedDate = new Date(this.data.selectedDate);

    // If the selected date is today, disable past times
    if (selectedDate.toDateString() === today.toDateString()) {
      const currentTimeInMinutes = today.getHours() * 60 + today.getMinutes();
      const slotStart = this.timeToMinutes(start);
      const slotEnd = this.timeToMinutes(end);

      // If the slot is already past the current time, disable it
      if (slotStart < currentTimeInMinutes) {
        return true;
      }
    }

    // If there is no schedule, all time slots are available
    if (this.data.schedule === 'no_schedule') {
      return false;
    }

    // If there are scheduled time slots, check if the slot is occupied
    return this.data.schedule.some(item => {
      const itemStart = this.timeToMinutes(item.startTime);
      const itemEnd = this.timeToMinutes(item.endTime);
      const slotStart = this.timeToMinutes(start);
      const slotEnd = this.timeToMinutes(end);

      return (slotStart >= itemStart && slotStart < itemEnd) ||
        (slotEnd > itemStart && slotEnd <= itemEnd);
    });
  },

  /**
   * 时间转分钟数
   */
  timeToMinutes(timeStr) {
    const [hours, mins] = timeStr.split(':');
    return parseInt(hours) * 60 + parseInt(mins);
  },

  /**
   * 选择时间槽
   */
  handleSelectTime(e) {
    const { key, disabled } = e.currentTarget.dataset;
    if (disabled) return; // If the slot is disabled, do nothing.

    const { startTime, endTime, selectedSlots, activeSlot } = this.data;

    if (!startTime) {
      // First click - set startTime
      const [start, end] = key.split('-'); // Split the selected key into start and end times
      this.setData({
        startTime: start, // Save only the start time
        endTime: null,     // Reset end time
        activeSlot: key,   // Highlight the selected slot
        selectedSlots: [key], // Track the selected slot
      });
    } else if (!endTime) {
      // Second click - set endTime
      const [start, end] = key.split('-'); // Split the selected key into start and end times
      this.setData({
        endTime: end, // Save only the end time
        activeSlot: null, // Clear the active slot
      }, () => {
        this.updateSelectedSlots(); // Update the selected slots after setting the end time
      });
    } else {
      // If both start and end times are set, reset the selection and choose a new start time
      const [start, end] = key.split('-'); // Split the selected key into start and end times
      this.setData({
        startTime: start,
        endTime: null,
        selectedSlots: [], // Clear previous selection
        activeSlot: key,   // Set the clicked slot as active
        selectedSlots: [key], // Track the new start slot
      });
    }
  },

  /**
   * 更新选中的时间段
   */
  updateSelectedSlots() {
    const { startTime, endTime, timeSlots } = this.data;

    // 时间转分钟数
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    // 检查时间段是否冲突
    const selectedSlots = [];
    let conflict = false;
    timeSlots.forEach(slot => {
      const slotStart = this.timeToMinutes(slot.startTime);
      const slotEnd = this.timeToMinutes(slot.endTime);

      // 如果时间段冲突，则提示并清空选择
      if ((slotStart >= startMinutes && slotStart < endMinutes) ||
        (slotEnd > startMinutes && slotEnd <= endMinutes)) {
        if (this.checkIsDisabled(slot.startTime, slot.endTime)) {
          conflict = true;
        }
        selectedSlots.push(slot.key);
      }
    });

    // 如果有冲突，则清空之前的选择并提示
    if (conflict) {
      wx.showToast({ title: '选中的时间段有冲突，请重新选择', icon: 'none' });
      this.setData({
        startTime: null,
        endTime: null,
        selectedSlots: [],
      });
    } else {
      // 否则更新选中的时间段
      this.setData({
        selectedSlots,
      });
    }
  },

  handleSubmit() {
    if (this.data.selectedSlots.length === 0) {
      wx.showToast({ title: '请选择时间段', icon: 'none' });
      return;
    }

    const startDateTime = this.convertToLocalDateTime(this.data.selectedDate, this.data.startTime);
    const endDateTime = this.convertToLocalDateTime(this.data.selectedDate, this.data.endTime);

    wx.showLoading({
      title: 'Loading...',
      mask: true
    });

    // 提交数据到后端
    wx.request({
      url: `http://${app.globalData.baseUrl}:8080/records`,
      method: 'POST',
      data: {
        roomId: this.data.room.id,
        userId: this.data.userInfo.uid,
        startTime: startDateTime,
        endTime: endDateTime,
        hasCheckedIn: false
      },
      success: (res) => {
        console.log(res);
        if (res.statusCode === 200) {
          wx.showToast({ title: 'Booking Successfully!', icon: 'success' });
          wx.navigateBack({
            delta: 1,
            success: () => {
              this.onShow(); 
            }
          });
          if (res.data.code === 500) {
            wx.showToast({ title: 'Occupied Successfully! Please wait for approval.', icon: 'success' });
          }
        } else {
          wx.showToast({ title: 'Booking Failed.', icon: 'none' });
        }
      },
      fail: (err) => {
        wx.showToast({ title: '请求失败', icon: 'none' });
        console.error('Request failed', err);
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 将时间转换为 LocalDateTime 格式的字符串
  convertToLocalDateTime(date, time) {
    const dateParts = date.split('-');  // 格式 'yyyy-mm-dd'
    const timeParts = time.split(':');  // 格式 'HH:mm'

    // 拼接为 'yyyy-MM-ddTHH:mm:ss' 格式
    const formattedDateTime = `${dateParts[0]}-${dateParts[1]}-${dateParts[2]}T${timeParts[0]}:${timeParts[1]}:00`;

    return formattedDateTime;  // 返回 LocalDateTime 格式
  }

});
