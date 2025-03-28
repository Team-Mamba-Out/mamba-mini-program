const app = getApp();
import Toast from '@vant/weapp/toast/toast';

Page({

  /**
   * 页面的初始数据
   */
  data: {
    scheduleData: null,
    allowedSlots: [false, false, false, true],
    extendId: null,
    newEndTime: null,
    showExtend: false,
    extendSlot: null,
    extendSlots: ['0.5 Hour', '1 Hour', '1.5 Hours', '2 Hours'],
    cancelId: null,
    activeType: null,
    submitLoading: false,
    typeLabels: ['Plan change', 'Equipment failure', 'Operational error', 'Emergency situation', 'Other'],
    content: '',
    showCancel: false,
    userInfo: null,
    selectedOrderType: "All",
    selectedTimeType: "Default",
    TimeTypes: ["Default", "Booking Time", "Order Time"],
    orderTypes: ["All", "Not Started", "Ongoing", "Done", "Cancelled", "Overdue"],
    active: 'order',
    rooms: ["Teaching Room", "Activity Room", "Meeting Room"],
    records: [],
    showRecords: null,
    isloading: false,
    pageNum: 1,
    total: 0,
    totalMessage: null
  },
  submit1() {
    let extendTime = this.data.extendSlot
    const originalTime = new Date(this.data.newEndTime);
    const minutesToAdd = [30, 60, 90, 120][extendTime] || 0;
    originalTime.setMinutes(originalTime.getMinutes() + minutesToAdd);
    const newEndTime = new Date(originalTime.getTime() + 8 * 3600 * 1000) // UTC 转北京时间
      .toISOString()
      .slice(0, 19);
    wx.request({
      url: `http://${app.globalData.baseUrl}:8080/records/extend`,
      method: 'Post',
      data: {
        id: this.data.extendId,
        endTime: newEndTime
      },
      success: (res) => {
        this.setData({
          pageNum: 1,
          records: [],
          selectedOrderType: 'All',
          showExtend: false,
          extendId: null,
          newEndTime: null
        })
        this.getRecord()
      }
    })
  },
  submit() {
    const { activeType, content, } = this.data;
    console.log(activeType);
    if (activeType === null) {
      Toast.fail('Please select message type');
      return;
    }

    if (!content.trim()) {
      Toast.fail('Please enter content');
      return;
    }
    let reasonId = activeType + 1
    let reason = reasonId + ';' + content
    wx.request({
      url: `http://${app.globalData.baseUrl}:8080/records/cancel`,
      method: 'PUT',
      data: { id: this.data.cancelId, reason },
      header: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      success: (res) => {
        this.setData({
          pageNum: 1,
          records: [],
          selectedOrderType: 'All'
        })
        this.getRecord()
        let token = wx.getStorageSync('token')
        wx.request({
          url: `http://${app.globalData.baseUrl}:8080/verify/getUserInfo`,
          header: {
            Authorization: token
          },
          method: 'GET',
          success: (res) => {
            let userInfo = res.data.data
            this.setData({
              userInfo,
              showCancel: !this.data.showCancel,
              content: ''
            })
            wx.setStorageSync('userInfo', userInfo)
          }
        })
      }
    })
  },
  selectType1(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      extendSlot: this.data.extendSlot === index ? null : index
    });
  },
  selectType(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.setData({
      activeType: this.data.activeType === index ? null : index
    });
  },
  onContentChange(e) {
    this.setData({ content: e.detail.value });
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
            console.log(combinedScheduleData);
            for (const dateKey in maintenanceData) {
              if (!combinedScheduleData[dateKey]) {
                combinedScheduleData[dateKey] = [];
              }
              combinedScheduleData[dateKey] = this.mergeSchedules(
                combinedScheduleData[dateKey],
                maintenanceData[dateKey]
              );
            }
            console.log(combinedScheduleData);
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
        console.log(newSchedule);
      }
    });
    return mergedSchedules;
  },
  async loadData(roomId) {
    try {
      // 等待 schedule 和 maintenance 数据加载完成
      await this.loadScheduleDataFromBackend(roomId);
      await this.loadMaintenanceDataFromBackend(roomId);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  },
  formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  },
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
  async extend(e) {
    let endTime = new Date(e.currentTarget.dataset.item.endTime);
    let tenPM = new Date(endTime);
    tenPM.setHours(22, 0, 0, 0);
    const durations = [30, 60, 90, 120];
    const allowedSlots = durations.map(minute => {
      let tempTime = new Date(endTime.getTime() + minute * 60000);
      return tempTime <= tenPM;
    });

    await this.loadData(e.currentTarget.dataset.item.roomId);
    //获取今天的繁忙时间
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    const todaySchedule = this.data.scheduleData[todayStr] || []
    //重新获取endTime小于这些时间中的开始时间的
    console.log(todaySchedule);
    const filteredSchedule = todaySchedule.filter(item => {
      const yearTemp = endTime.getFullYear();
      const monthTemp = endTime.getMonth();
      const dayTemp = endTime.getDate();
      // item.startTime 是 "HH:mm" 格式
      const [hours, minutes] = item.startTime.split(':').map(Number);
      // 构造一个新的 Date 对象，表示今天的这个 startTime
      const startTime = new Date(yearTemp, monthTemp, dayTemp, hours, minutes);
      return startTime >= endTime;
    });
    console.log(filteredSchedule);
    durations.forEach((duration, index) => {
      // 当前延长后的时间
      const extendedTime = new Date(endTime.getTime() + duration * 60000);
      // 遍历 filteredSchedule，如果有任何一个排程开始时间 < extendedTime，则不允许
      for (let item of filteredSchedule) {
        const yearTemp = endTime.getFullYear();
        const monthTemp = endTime.getMonth();
        const dayTemp = endTime.getDate();
        const [hours, minutes] = item.startTime.split(':').map(Number);
        const startTime = new Date(yearTemp, monthTemp, dayTemp, hours, minutes);
        if (extendedTime > startTime) {
          allowedSlots[index] = false;
          break; // 已经冲突，没必要再看更多
        }
      }
    });

    this.setData({
      showExtend: true,
      extendId: e.currentTarget.dataset.item.id,
      newEndTime: e.currentTarget.dataset.item.endTime,
      allowedSlots
    })

  },
  checkIn(e) {
    let id = e.currentTarget.dataset.item.id
    wx.request({
      url: `http://${app.globalData.baseUrl}:8080/records/checkin`,
      method: 'PUT',
      data: { id }, // ✅ 发送表单数据
      header: {
        'content-type': 'application/x-www-form-urlencoded' // ✅ 确保后端能解析
      },
      success: (res) => {
        this.setData({
          pageNum: 1,
          total: 0,
          records: []
        }),
          this.getRecord()
      }
    })
  },
  closePreview() {
    this.setData({
      showCancel: !this.data.showCancel,
      content: ''
    })
  },
  closePreview1() {
    this.setData({
      showExtend: !this.data.showExtend
    })
  },
  // 显示排序选项
  showSortOptions() {
    wx.showActionSheet({
      itemList: this.data.TimeTypes,
      success: (res) => {
        console.log("选择的排序方式:", res.tapIndex);
        this.setData({
          selectedTimeType: this.data.TimeTypes[res.tapIndex]
        });
        this.sortRecords(res.tapIndex);
      },
      fail: (res) => {
        console.log("取消选择", res.errMsg);
      }
    });
  },

  // 执行排序
  sortRecords(type) {
    let showRecords = this.data.records
    if (type === 2) {
      // 按 `recordTime` 排序（下单时间）
      showRecords.sort((a, b) => new Date(a.recordTime) - new Date(b.recordTime));
    } else if (type === 1) {
      // 按 `startTime` 排序（预约时间）
      showRecords.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    } else {
      // 按 `id` 排序（默认）
      showRecords.sort((a, b) => a.id - b.id);
    }
    this.setData({ showRecords });
  },
  filterRecords(status) {
    const filtered = this.data.records.filter(record =>
      status === 0 ? true : record.status === status // 0 代表 "全部订单"
    );

    this.setData({ showRecords: filtered });
    console.log("筛选后的数据:", filtered);
  },
  showOrderFilter() {
    wx.showActionSheet({
      itemList: this.data.orderTypes,
      success: (res) => {
        if (this.data.orderTypes[res.tapIndex] == 'All') {
          this.setData({
            showRecords: this.data.records
          })
        } else {
          this.filterRecords(this.data.orderTypes[res.tapIndex])
        }
        this.setData({
          selectedOrderType: this.data.orderTypes[res.tapIndex]
        });
      },
      fail: (res) => {
        console.log("取消选择", res.errMsg);
      }
    });
  },
  onChange(event) {
    const activeTab = event.detail;
    wx.switchTab({
      url: `/pages/${activeTab}/${activeTab}`,
    });
  },

  /**
   * 生命周期函数--监听页面加载
   */
  cancel(e) {
    wx.showModal({
      title: 'Warning!',
      content: `Cancelling four times will be marked if you are a student`,
      cancelText: 'Cancel',
      confirmText: 'Confirm',
      success: (res) => {
        if (res.confirm) {
          let id = e.currentTarget.dataset.item.id
          console.log(id);
          this.setData({
            showCancel: true,
            cancelId: id
          })
        }
      }
    });
  },
  onPullDownRefresh() {
    this.setData({
      pageNum: 1,
      total: 0,
      records: []
    }),
      this.getRecord()
    wx.stopPullDownRefresh()
  },
  onReachBottom() {
    if (this.data.pageNum * 5 >= this.data.total) {
      return
    }
    if (this.data.isloading) {
      return
    }
    this.setData({
      pageNum: this.data.pageNum + 1
    })
    this.getRecord()
  },
  getRecord() {
    if (this.data.pageNum === 1) {
      this.setData({
        records: [],
        showRecords: [],
        isloading: true
      });
    }
    wx.showLoading({
      title: 'loading...',
    })
    wx.request({
      url: `http://${app.globalData.baseUrl}:8080/records/getRecords`,
      data: {
        page: this.data.pageNum,
        size: 5,
        userId: this.data.userInfo.uid
      },
      method: 'GET',
      success: (res) => {
        let records = res.data.data.records
        console.log(records);
        let total = res.data.data.total
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); // 归零时间，确保只计算天数
        const monthMap = {
          "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
          "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
          "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec"
        };
        // 遍历 records，拆分日期并转换月份
        const formattedRecords = records.map(record => {
          let recordTime = record.recordTime.replace("T", " ")
          const [date, time] = record.startTime.split("T"); // 拆分 `startTime` 的日期和时间
          const [year, month, day] = date.split("-"); // 拆分年月日
          const startTime = new Date(record.startTime.split("T")[0]); // 取 `2025-03-06`
          startTime.setHours(0, 0, 0, 0); // 确保时间归零
          // 计算相差的天数
          let diffTime = startTime.getTime() - currentDate.getTime();
          if (diffTime < 0) {
            diffTime = 0
          }
          const dueInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // 计算天数
          // 处理 `endTime`
          const [endDate, endTime] = record.endTime.split("T"); // 拆分 `endTime` 的日期和时间
          return {
            ...record,
            month: monthMap[month] || "", // 转换成英文简写
            day: day, // 直接赋值
            // 新增的部分 ↓↓↓
            startDate: date, // `YYYY-MM-DD`
            startTimeNoS: time.substring(0, 5), // `HH:mm`（去掉秒）
            endDate: endDate, // `YYYY-MM-DD`
            endTimeNoS: endTime.substring(0, 5), // `HH:mm`（去掉秒）
            dueIn: dueInDays,
            recordTime
          };
        });

        // 更新数据
        this.setData({ records: [...this.data.records, ...formattedRecords], showRecords: [...this.data.records, ...formattedRecords], isloading: false, total });
      },
      fail(res) {
        console.log(res);
      },
      complete: () => {
        wx.hideLoading()
      }
    })

  },

  onLoad(options) {
    let userInfo = wx.getStorageSync('userInfo')
    this.setData({
      userInfo,
      active: 'order',
      totalMessage: app.globalData.unread
    });
    if (!userInfo) {
      return
    }

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
    const userInfo = wx.getStorageSync('userInfo');
    this.setData({
      userInfo,
      pageNum: 1,
      totalMessage: app.globalData.unread
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
    this.getRecord()
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
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})