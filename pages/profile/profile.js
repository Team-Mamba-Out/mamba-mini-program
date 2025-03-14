Page({
  data: {
    userInfo:null,
    active: 'profile',
    avatarText: ''  // 头像首字母
  },

  onChange(event) {
    const activeTab = event.detail;
    wx.switchTab({
      url: `/pages/${activeTab}/${activeTab}`,
    });
  },
  onShow(){
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) {
      wx.showModal({
        title: 'Warning',
        content: 'Please log in before using.',
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
      avatarText
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
    });
  },


  // 获取头像的首字母
  getAvatarText: function(name) {
    const nameParts = name.split(' ');
    let avatarText = '';
    nameParts.forEach(part => {
      avatarText += part.charAt(0).toUpperCase();  // 提取每个单词的首字母并转换为大写
    });
    return avatarText;
  }
})
