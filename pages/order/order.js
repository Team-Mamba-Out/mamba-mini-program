// pages/record/record.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    active: 'order',
    rooms:["Teaching Room","Activity Room","Meeting Room"],
    
    records: []
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
  cancel(e){
    wx.showModal({
      title: 'Cancel Confirm',
      content: `Cancelling three times will be marked`,
      success: (res) => {
        if (res.confirm) {
          const id = e.currentTarget.dataset.item.id
          const updatedRecords = this.data.records.map(record => {
            if (record.id === id) {
              return { ...record, cancelled: true }; // 
            }
            return record; // 其他数据保持不变
          });
          this.setData({ records: updatedRecords }); 
        }
      }
    });
  },
  checkIn(e){
    
  },
  onLoad(options) {
    this.setData({
      active: 'order',
    });
    wx.request({
      url: 'http://localhost:8080/records/getRecords',
      data:{
        page:1,
        size:10
      },
      method:'GET',
      success:(res)=>{
        let records = res.data.data.records
        console.log(records);
        const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // 归零时间，确保只计算天数
    const monthMap = {
      "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
      "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
      "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec"
    };
    // 遍历 records，拆分日期并转换月份
    const formattedRecords = records.map(record => {
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
    dueIn: dueInDays
   };
  });
      // 更新数据
      this.setData({ records: formattedRecords });
      },
      fail(res){
        console.log(res);
      }
    })
    
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