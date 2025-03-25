const app = getApp();
// pages/record/record.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo:null,
    selectedOrderType: "All",
    selectedTimeType:"Default",
    TimeTypes:["Default","Booking Time","Order Time"],
    orderTypes: ["All", "Pending", "Ongoing", "Done","Cancelled","Overdue"],
    active: 'order',
    rooms:["Teaching Room","Activity Room","Meeting Room"],
    records: [],
    showRecords:null,
    isloading:false,
    pageNum:1,
    total:0,
    totalMessage: null
  },
  checkIn(e){
    let id = e.currentTarget.dataset.item.id
    wx.request({
      url: `http://${app.globalData.baseUrl}:8080/records/checkin`,
      method:'PUT',
      data: {id}, // ✅ 发送表单数据
      header: { 
              'content-type': 'application/x-www-form-urlencoded' // ✅ 确保后端能解析
      },
      success:(res)=>{
        this.setData({
          pageNum:1,
          total:0,
          records:[]
        }),
        this.getRecord()
      }
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
            showRecords:this.data.records
          })
        }else{
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
  cancel(e){
    wx.showModal({
      title: 'Cancel Confirm',
      content: `Cancelling three times will be marked`,
      success: (res) => {
        if (res.confirm) {
          let id = e.currentTarget.dataset.item.id
          console.log(id);
          wx.request({
            url: `http://${app.globalData.baseUrl}:8080/records/cancel`,
            method:'PUT',
            data: {id}, 
            header: { 
                'content-type': 'application/x-www-form-urlencoded' 
          },
            success:(res)=>{
              this.setData({
                pageNum:1,
                records:[],
                selectedOrderType:'All'
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
                    userInfo
                  })
                  wx.setStorageSync('userInfo', userInfo)
                }
              })
            }
          })
        }
      }
    });
  },
  onPullDownRefresh() {
    this.setData({
      pageNum:1,
      total:0,
      records:[]
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
  pageNum:this.data.pageNum + 1
})
this.getRecord()
  },
  getRecord(){
    if (this.data.pageNum === 1) {
      this.setData({
        records: [],
        showRecords: [],
        isloading:true
      });
    }
    wx.showLoading({
      title: 'loading...',
    })
    wx.request({
      url: `http://${app.globalData.baseUrl}:8080/records/getRecords`,
      data:{
      page:this.data.pageNum,
      size:5,
      userId: this.data.userInfo.uid
      },
      method:'GET',
      success:(res)=>{
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
    let recordTime =record.recordTime.replace("T"," ")
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
      this.setData({ records: [...this.data.records,...formattedRecords],showRecords: [...this.data.records,...formattedRecords],isloading:false,total });
      },
      fail(res){
        console.log(res);
      },
      complete:()=>{
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
      pageNum:1,
      totalMessage: app.globalData.unread
    })
    if (!userInfo) {
      wx.showModal({
        title: 'Warning',
        content: 'Please log in before using.',
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