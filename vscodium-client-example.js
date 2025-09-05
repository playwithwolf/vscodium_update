/**
 * VSCodium 客户端更新集成示例
 * 这个文件展示了如何在 VSCodium 中集成 electron-updater
 */

const { autoUpdater } = require('electron-updater');
const { app, dialog, BrowserWindow, ipcMain } = require('electron');
const log = require('electron-log');

// 配置日志
log.transports.file.level = 'info';
autoUpdater.logger = log;

class UpdateManager {
  constructor() {
    this.mainWindow = null;
    this.updateAvailable = false;
    this.setupAutoUpdater();
  }

  /**
   * 设置 autoUpdater 配置和事件监听
   */
  setupAutoUpdater() {
    // 配置更新服务器地址
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: 'http://localhost:3000', // 替换为你的服务器地址
      channel: 'latest'
    });

    // 禁用自动下载，让用户选择
    autoUpdater.autoDownload = false;

    // 事件监听
    autoUpdater.on('checking-for-update', () => {
      this.sendStatusToWindow('正在检查更新...');
      log.info('正在检查更新...');
    });

    autoUpdater.on('update-available', (info) => {
      this.updateAvailable = true;
      this.sendStatusToWindow(`发现新版本 ${info.version}`);
      log.info('发现新版本:', info);
      
      // 询问用户是否下载更新
      this.showUpdateDialog(info);
    });

    autoUpdater.on('update-not-available', (info) => {
      this.sendStatusToWindow('当前已是最新版本');
      log.info('当前已是最新版本');
    });

    autoUpdater.on('error', (err) => {
      this.sendStatusToWindow('更新检查失败');
      log.error('更新错误:', err);
      
      // 显示错误对话框
      if (this.mainWindow) {
        dialog.showErrorBox('更新错误', `更新检查失败: ${err.message}`);
      }
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const message = `下载进度: ${Math.round(progressObj.percent)}%`;
      this.sendStatusToWindow(message);
      log.info(message);
      
      // 发送下载进度到渲染进程
      if (this.mainWindow) {
        this.mainWindow.webContents.send('download-progress', progressObj);
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.sendStatusToWindow('更新下载完成');
      log.info('更新下载完成');
      
      // 询问用户是否立即安装
      this.showInstallDialog(info);
    });
  }

  /**
   * 设置主窗口引用
   */
  setMainWindow(window) {
    this.mainWindow = window;
  }

  /**
   * 发送状态消息到渲染进程
   */
  sendStatusToWindow(message) {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('update-status', message);
    }
  }

  /**
   * 检查更新
   */
  async checkForUpdates() {
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      log.error('检查更新失败:', error);
    }
  }

  /**
   * 显示更新可用对话框
   */
  showUpdateDialog(info) {
    if (!this.mainWindow) return;

    const options = {
      type: 'info',
      title: '发现新版本',
      message: `VSCodium ${info.version} 现在可用`,
      detail: '是否要下载并安装这个更新？',
      buttons: ['现在更新', '稍后提醒', '跳过此版本'],
      defaultId: 0,
      cancelId: 1
    };

    dialog.showMessageBox(this.mainWindow, options).then((result) => {
      if (result.response === 0) {
        // 用户选择现在更新
        autoUpdater.downloadUpdate();
        this.sendStatusToWindow('开始下载更新...');
      } else if (result.response === 2) {
        // 用户选择跳过此版本
        this.sendStatusToWindow('已跳过此版本');
      }
    });
  }

  /**
   * 显示安装更新对话框
   */
  showInstallDialog(info) {
    if (!this.mainWindow) return;

    const options = {
      type: 'info',
      title: '更新已下载',
      message: '更新已下载完成',
      detail: 'VSCodium 将重启以完成更新。是否现在重启？',
      buttons: ['现在重启', '稍后重启'],
      defaultId: 0,
      cancelId: 1
    };

    dialog.showMessageBox(this.mainWindow, options).then((result) => {
      if (result.response === 0) {
        // 用户选择现在重启
        autoUpdater.quitAndInstall();
      }
    });
  }

  /**
   * 强制安装更新（无用户交互）
   */
  installUpdate() {
    autoUpdater.quitAndInstall();
  }
}

// 创建更新管理器实例
const updateManager = new UpdateManager();

// IPC 事件处理
ipcMain.handle('check-for-updates', async () => {
  await updateManager.checkForUpdates();
});

ipcMain.handle('install-update', () => {
  updateManager.installUpdate();
});

ipcMain.handle('get-update-status', () => {
  return updateManager.updateAvailable;
});

// 应用启动时的更新检查
app.whenReady().then(() => {
  // 延迟 5 秒后检查更新，避免启动时阻塞
  setTimeout(() => {
    updateManager.checkForUpdates();
  }, 5000);
});

// 导出更新管理器
module.exports = updateManager;

/**
 * 使用示例：
 * 
 * 1. 在主进程中引入此文件：
 *    const updateManager = require('./vscodium-client-example');
 * 
 * 2. 设置主窗口：
 *    updateManager.setMainWindow(mainWindow);
 * 
 * 3. 手动检查更新：
 *    updateManager.checkForUpdates();
 * 
 * 4. 在渲染进程中监听更新状态：
 *    const { ipcRenderer } = require('electron');
 *    
 *    ipcRenderer.on('update-status', (event, message) => {
 *      console.log('更新状态:', message);
 *    });
 *    
 *    ipcRenderer.on('download-progress', (event, progress) => {
 *      console.log('下载进度:', progress.percent + '%');
 *    });
 * 
 * 5. 渲染进程中的按钮事件：
 *    document.getElementById('check-update').addEventListener('click', async () => {
 *      await ipcRenderer.invoke('check-for-updates');
 *    });
 */