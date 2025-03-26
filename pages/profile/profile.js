const app = getApp();
Page({
  data: {
    userInfo: null,
    active: 'profile',
    avatarText: 'T',  // 头像首字母
    isEditing: false,
    showTip:false,
    totalMessage: null,
  },
  showTips(){
    this.setData({
      showTip:!this.data.showTip
    })
    console.log(this.data.showTip);
  },
  closePreview(){
    this.setData({
      showTip:!this.data.showTip
    })
  },
  modify() {
    this.setData({
      isEditing: true
    })
  },

  save(){
    wx.showLoading({
      title: 'Saving',
    })
    wx.request({
      url: `http://${app.globalData.baseUrl}:8080/users/update`,
      method:'Put',
      
      data:{
        uid:this.data.userInfo.uid,
        phone:this.data.userInfo.phone,
        role:this.data.userInfo.role,
        name:this.data.userInfo.name
      },
      success:(res)=>{
        let token = wx.getStorageSync('token')
        wx.request({
          url: `http://${app.globalData.baseUrl}:8080/verify/getUserInfo`,
          header:{
            Authorization:token
          },
          method:'GET',
          success:(res)=>{
            let userInfo = res.data.data
            this.setData({
              userInfo
            })
            wx.setStorageSync('userInfo', userInfo)
            wx.hideLoading()
          }
        })
      }
    })
    this.setData({
      isEditing:false
    })
  },
  cancel(){
    this.setData({
      isEditing: false
    })
  },
   // 监听输入框变化
   handleInput(e) {
    const field = e.currentTarget.dataset.field; // 获取字段名
    this.setData({
      [`userInfo.${field}`]: e.detail.value // 动态更新 userInfo 数据
    });
  },
  onChange(event) {
    const activeTab = event.detail;
    wx.switchTab({
      url: `/pages/${activeTab}/${activeTab}`,
    });
  },
  logout() {
    wx.showModal({
      title: 'Warning',
      content: 'Confirm logout?',
      cancelText: 'Cancel',
      confirmText: 'Confirm',
      complete: (res) => {
        if (res.cancel) {
          return
        }
        if (res.confirm) {
          wx.setStorageSync('userInfo', null)
          this.setData({
            userInfo: null
          })
          this.setData({
            avatarText: 'T'
          })
          app.globalData.unread = 0;
          this.onLoad()
        }
      }
    })
  },
  onShow() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.showModal({
        title: 'Warning',
        content: 'Please log in before using.',
        cancelText: 'Cancel',
        confirmText: 'Confirm',
        complete: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login?url=profile',
            })
          }
        }
      })
      return
    }

    const avatarText = this.getAvatarText(userInfo.name);
    this.setData({
      userInfo,
      avatarText,
      totalMessage: app.globalData.unread
    })

  },
  onLoad(options) {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      return
    }
    // // 计算头像首字母
    const avatarText = this.getAvatarText(userInfo.name);
    this.setData({
      userInfo,
      avatarText: avatarText,
      active: 'profile',
      totalMessage: app.globalData.unread
    });
  },


  // 获取头像的首字母
  getAvatarText: function (name) {
    if (!name) {
      return
    }
    const nameParts = name.split(' ');
    let avatarText = '';
    nameParts.forEach(part => {
      avatarText += part.charAt(0).toUpperCase();  // 提取每个单词的首字母并转换为大写
    });
    return avatarText;
  }
})
