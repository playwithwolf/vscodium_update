# VSCodium 自动更新集成详细教程

## 📋 目录
1. [VSCodium 版本号设置](#vscodium-版本号设置)
2. [VSCodium 主进程代码位置](#vscodium-主进程代码位置)
3. [修改 VSCodium 代码](#修改-vscodium-代码)
4. [部署更新服务器](#部署更新服务器)
5. [CDN 和自定义下载地址配置](#cdn-和自定义下载地址配置)
6. [上传版本文件](#上传版本文件)
7. [测试更新功能](#测试更新功能)
8. [常见问题解答](#常见问题解答)

---

## 1. VSCodium 版本号设置

### 版本号在哪里定义？

VSCodium 的版本号定义在项目根目录的 `package.json` 文件中：

```json
{
  "name": "vscodium",
  "version": "1.85.0",  // ← 这里就是版本号
  "description": "VSCodium",
  // ... 其他配置
}
```

### 如何修改起始版本号？

**步骤 1：** 找到 VSCodium 源码目录下的 `package.json`
```bash
# VSCodium 源码根目录
cd /path/to/vscodium
ls -la package.json
```

**步骤 2：** 编辑 `package.json`，修改 version 字段
```json
{
  "version": "1.0.0"  // 改成你想要的起始版本号
}
```

**步骤 3：** 重新构建 VSCodium
```bash
npm run compile
npm run package
```

---

## 2. VSCodium 主进程代码位置

### 主进程入口文件

VSCodium 的主进程代码位于：
```
vscodium/src/main.js              // 主入口文件
vscodium/src/vs/code/electron-main/main.ts  // 实际主进程逻辑
```

### 关键文件说明

| 文件路径 | 作用 |
|---------|------|
| `src/main.js` | Electron 应用的入口点 |
| `src/vs/code/electron-main/main.ts` | 主进程核心逻辑 |
| `src/vs/code/electron-main/app.ts` | 应用程序管理 |
| `src/vs/platform/update/` | 更新相关代码目录 |

---

## 3. 修改 VSCodium 代码

### 步骤 1：找到更新配置文件

在 VSCodium 源码中找到：
```
vscodium/product.json
```

### 步骤 2：修改更新服务器地址

编辑 `product.json`，添加或修改更新配置：

```json
{
  "updateUrl": "http://your-server.com:3000",
  "quality": "stable",
  "commit": "your-commit-hash",
  // ... 其他配置
}
```

### 步骤 3：在主进程中集成 electron-updater

**3.1 安装依赖**
```bash
cd /path/to/vscodium
npm install electron-updater electron-log
```

**3.2 修改主进程文件**

在 `src/vs/code/electron-main/main.ts` 中添加更新逻辑：

```typescript
// 在文件顶部添加导入
import { autoUpdater } from 'electron-updater';
import * as log from 'electron-log';

// 在主进程初始化后添加更新逻辑
class VSCodeMain {
  private setupAutoUpdater(): void {
    // 配置日志
    autoUpdater.logger = log;
    (autoUpdater.logger as any).transports.file.level = 'info';
    
    // 设置更新服务器地址
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: 'http://your-server.com:3000'
    });
    
    // 监听更新事件
    autoUpdater.on('checking-for-update', () => {
      log.info('正在检查更新...');
    });
    
    autoUpdater.on('update-available', (info) => {
      log.info('发现新版本:', info.version);
    });
    
    autoUpdater.on('update-not-available', (info) => {
      log.info('当前已是最新版本');
    });
    
    autoUpdater.on('error', (err) => {
      log.error('更新错误:', err);
    });
    
    autoUpdater.on('download-progress', (progressObj) => {
      let log_message = "下载速度: " + progressObj.bytesPerSecond;
      log_message = log_message + ' - 已下载 ' + progressObj.percent + '%';
      log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
      log.info(log_message);
    });
    
    autoUpdater.on('update-downloaded', (info) => {
      log.info('更新下载完成');
      // 5秒后自动安装更新
      setTimeout(() => {
        autoUpdater.quitAndInstall();
      }, 5000);
    });
    
    // 应用启动后检查更新
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 3000);
  }
  
  // 在现有的 startup() 方法中调用
  private async startup(): Promise<void> {
    // ... 现有代码
    
    // 添加这一行
    this.setupAutoUpdater();
    
    // ... 现有代码
  }
}
```

### 步骤 4：修改 package.json 构建配置

在 VSCodium 的 `package.json` 中添加构建配置：

```json
{
  "build": {
    "appId": "com.vscodium.vscodium",
    "productName": "VSCodium",
    "directories": {
      "output": "dist"
    },
    "files": [
      "out/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "publish": {
      "provider": "generic",
      "url": "http://your-server.com:3000"
    },
    "win": {
      "target": "nsis"
    },
    "mac": {
      "target": "dmg"
    },
    "linux": {
      "target": "AppImage"
    }
  }
}
```

---

## 4. 部署更新服务器

### 步骤 1：准备服务器环境

```bash
# 在服务器上安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2（进程管理器）
npm install -g pm2
```

### 步骤 2：上传项目文件

```bash
# 将整个 vscodium_update 目录上传到服务器
scp -r ./vscodium_update user@your-server:/home/user/
```

### 步骤 3：在服务器上安装依赖

```bash
# 登录服务器
ssh user@your-server

# 进入项目目录
cd /home/user/vscodium_update

# 安装依赖
npm install
```

### 步骤 4：配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

在 `.env` 文件中设置：
```env
PORT=3000
NODE_ENV=production
HOST=0.0.0.0
# 如果使用自定义下载地址
CUSTOM_DOWNLOAD_URL=https://your-cdn.com/releases
```

### 步骤 5：启动服务

```bash
# 使用 PM2 启动服务
pm2 start ecosystem.config.js

# 查看服务状态
pm2 status

# 查看日志
pm2 logs vscodium-update-server
```

### 步骤 6：设置防火墙

```bash
# 开放 3000 端口
sudo ufw allow 3000

# 如果使用 nginx 反向代理，开放 80/443 端口
sudo ufw allow 80
sudo ufw allow 443
```

---

## 5. CDN 和自定义下载地址配置

### 🌐 为什么使用 CDN？

使用 CDN（内容分发网络）可以显著提升用户的下载体验：

- **🚀 加速下载**：就近分发，减少延迟
- **🌍 全球覆盖**：支持全球用户快速访问
- **💪 减轻服务器压力**：分散下载流量
- **📈 提高可用性**：多节点冗余，提升稳定性

### 📁 平台路径自动处理机制

**重要概念**：系统会自动在您的基础地址后添加平台路径，您无需手动处理。

**平台标识符**：
- Windows → `win32`
- macOS → `darwin`
- Linux → `linux`

**URL 生成示例**：
```
基础地址：https://cdn.example.com/releases
↓ 系统自动处理
Windows：https://cdn.example.com/releases/win32/VSCodium-Setup.exe
macOS：  https://cdn.example.com/releases/darwin/VSCodium.dmg
Linux：  https://cdn.example.com/releases/linux/VSCodium.AppImage
```

### 🏗️ CDN 部署完整流程

#### 步骤 1：准备 CDN 环境

**选择 CDN 服务商**（推荐）：
- 阿里云 CDN
- 腾讯云 CDN
- AWS CloudFront
- Cloudflare
- 自建 Nginx 服务器

**创建目录结构**：
```bash
# 在您的 CDN 源站或存储服务器上
mkdir -p /var/www/cdn/releases/{win32,darwin,linux}

# 设置权限
chmod -R 755 /var/www/cdn/releases
chown -R www-data:www-data /var/www/cdn/releases
```

#### 步骤 2：配置 CDN 域名

**示例配置**（以阿里云为例）：
```
源站类型：IP 或域名
源站地址：your-server.com
源站端口：80 或 443
回源协议：HTTP 或 HTTPS
加速域名：cdn.your-domain.com
```

#### 步骤 3：上传文件到 CDN

**方式 1：直接上传到源站**
```bash
# 上传到对应平台目录
scp VSCodium-1.0.1-Setup.exe user@cdn-server:/var/www/cdn/releases/win32/
scp VSCodium-1.0.1.dmg user@cdn-server:/var/www/cdn/releases/darwin/
scp VSCodium-1.0.1.AppImage user@cdn-server:/var/www/cdn/releases/linux/
```

**方式 2：使用对象存储**
```bash
# 以阿里云 OSS 为例
ossutil cp VSCodium-1.0.1-Setup.exe oss://your-bucket/releases/win32/
ossutil cp VSCodium-1.0.1.dmg oss://your-bucket/releases/darwin/
ossutil cp VSCodium-1.0.1.AppImage oss://your-bucket/releases/linux/
```

#### 步骤 4：配置更新服务器

**方式 1：环境变量配置（推荐）**
```bash
# 编辑 .env 文件
echo "CUSTOM_DOWNLOAD_URL=https://cdn.your-domain.com/releases" >> .env

# 重启服务器
pm2 restart vscodium-update-server
```

**方式 2：上传时指定**
```bash
# 每次上传时指定 CDN 地址
node upload-script.js win32 1.0.1 /tmp/VSCodium-Setup.exe \
  -d https://cdn.your-domain.com/releases
```

**方式 3：为特定文件指定完整 URL**
```bash
# 为单个文件指定完整下载地址
node upload-script.js win32 1.0.1 /tmp/VSCodium-Setup.exe \
  -c VSCodium-Setup.exe=https://special-cdn.com/custom-path/VSCodium-Setup.exe
```

### 🔧 配置优先级说明

系统按以下优先级处理下载地址：

1. **文件特定 URL**（最高）→ 完整自定义地址
2. **平台级基础地址**（中等）→ 基础地址 + 自动平台路径
3. **全局环境变量**（最低）→ 全局基础地址 + 自动平台路径

### 📋 CDN 配置检查清单

**部署前检查**：
- [ ] CDN 域名已配置并生效
- [ ] 源站目录结构正确（win32/darwin/linux）
- [ ] 文件上传权限正常
- [ ] 更新服务器环境变量已设置

**部署后验证**：
```bash
# 1. 检查生成的下载链接
curl "http://localhost:3000/update/win32/1.0.0"

# 2. 测试 CDN 文件访问
curl -I "https://cdn.your-domain.com/releases/win32/VSCodium-Setup.exe"

# 3. 验证文件完整性
curl "https://cdn.your-domain.com/releases/win32/VSCodium-Setup.exe" | sha256sum
```

### 🚨 常见 CDN 配置问题

**问题 1：文件 404 错误**
```bash
# 检查文件是否存在
ls -la /var/www/cdn/releases/win32/

# 检查 CDN 缓存
curl -H "Cache-Control: no-cache" "https://cdn.your-domain.com/releases/win32/VSCodium-Setup.exe"
```

**问题 2：下载速度慢**
- 检查 CDN 节点覆盖
- 验证源站带宽
- 确认缓存策略

**问题 3：版本更新不及时**
```bash
# 手动刷新 CDN 缓存
# 阿里云示例
aliyun cdn RefreshObjectCaches --ObjectPath https://cdn.your-domain.com/releases/win32/VSCodium-Setup.exe
```

### 💡 CDN 优化建议

1. **缓存策略**：设置合适的缓存时间（建议 1-7 天）
2. **压缩配置**：启用 Gzip 压缩减少传输大小
3. **HTTPS 配置**：使用 HTTPS 确保下载安全
4. **监控告警**：设置 CDN 访问监控和异常告警
5. **多地域部署**：根据用户分布选择合适的 CDN 节点

---

## 6. 上传版本文件

### ⚠️ 重要说明

**上传脚本必须在更新服务器上运行**，不能在本地运行！

**为什么必须在服务器上运行？**

1. **文件系统访问**：脚本需要直接写入服务器的 `releases/` 目录
2. **版本信息更新**：需要修改服务器上的 `versions.json` 文件
3. **SHA256 计算**：需要计算上传文件的校验和并存储
4. **API 调用**：脚本通过 `http://localhost:3000` 调用本地 API

**正确的工作流程：**
```
本地构建 → 上传文件到服务器 → 在服务器上运行上传脚本
```

**错误的做法：**
```
❌ 在本地运行 upload-script.js（会失败）
❌ 直接将文件放入 releases/ 目录（缺少版本信息）
```

### 步骤 1：准备版本文件

首先构建你的 VSCodium 应用：

```bash
# 在 VSCodium 源码目录
cd /path/to/vscodium

# 构建应用
npm run compile
npm run package

# 构建安装包
npm run build:win32    # Windows
npm run build:darwin   # macOS
npm run build:linux    # Linux
```

构建完成后，你会在 `dist/` 目录下找到安装包文件。

### 步骤 2：将文件上传到服务器

```bash
# 将构建好的文件上传到服务器
scp ./dist/VSCodium-Setup-1.0.1.exe user@your-server:/tmp/
scp ./dist/VSCodium-1.0.1.dmg user@your-server:/tmp/
scp ./dist/VSCodium-1.0.1.AppImage user@your-server:/tmp/
```

### 步骤 3：在服务器上运行上传脚本

```bash
# 登录服务器
ssh user@your-server

# 进入项目目录
cd /home/user/vscodium_update

# 上传 Windows 版本
node upload-script.js win32 1.0.1 /tmp/VSCodium-Setup-1.0.1.exe

# 上传 macOS 版本
node upload-script.js darwin 1.0.1 /tmp/VSCodium-1.0.1.dmg

# 上传 Linux 版本
node upload-script.js linux 1.0.1 /tmp/VSCodium-1.0.1.AppImage
```

### 步骤 4：使用自定义下载地址（可选）

如果你使用 CDN 或其他下载服务器：

```bash
# 上传到 CDN 后，使用自定义下载地址
node upload-script.js win32 1.0.1 /tmp/VSCodium-Setup-1.0.1.exe \
  -d https://your-cdn.com/releases

# 或者为特定文件指定完整 URL
node upload-script.js win32 1.0.1 /tmp/VSCodium-Setup-1.0.1.exe \
  -c VSCodium-Setup-1.0.1.exe=https://special-cdn.com/VSCodium-Setup-1.0.1.exe
```

### 步骤 5：验证上传结果

```bash
# 检查版本信息
curl http://localhost:3000/versions

# 检查特定平台的更新
curl "http://localhost:3000/update/win32/1.0.0"
```

---

## 7. 测试更新功能

### 步骤 1：启动测试版本的 VSCodium

确保你的 VSCodium 版本号低于服务器上的版本（比如本地是 1.0.0，服务器是 1.0.1）。

### 步骤 2：查看更新日志

更新日志通常位于：
- **Windows**: `%APPDATA%/VSCodium/logs/main.log`
- **macOS**: `~/Library/Logs/VSCodium/main.log`
- **Linux**: `~/.config/VSCodium/logs/main.log`

### 步骤 3：手动触发更新检查

在 VSCodium 中，你可以添加一个菜单项来手动检查更新：

```typescript
// 在主进程中添加
import { Menu } from 'electron';

// 创建菜单项
const template = [
  {
    label: '帮助',
    submenu: [
      {
        label: '检查更新',
        click: () => {
          autoUpdater.checkForUpdatesAndNotify();
        }
      }
    ]
  }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
```

---

## 8. 常见问题解答

### Q1: 版本号格式有什么要求？

**A:** 必须遵循语义化版本规范（SemVer），格式为 `主版本号.次版本号.修订号`，例如：
- ✅ 正确：`1.0.0`, `1.2.3`, `2.0.0-beta.1`
- ❌ 错误：`v1.0`, `1.0`, `1.0.0.0`

### Q2: 为什么更新检查失败？

**A:** 常见原因：
1. 服务器地址配置错误
2. 防火墙阻止连接
3. 版本号格式不正确
4. 服务器未正确启动

检查方法：
```bash
# 测试服务器连接
curl http://your-server.com:3000/health

# 检查更新接口
curl "http://your-server.com:3000/update/win32/1.0.0"
```

### Q3: 如何调试更新过程？

**A:** 启用详细日志：

```typescript
// 在主进程中
import * as log from 'electron-log';

// 设置日志级别
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';

// 设置 autoUpdater 日志
autoUpdater.logger = log;
```

### Q4: 上传脚本必须在服务器上运行吗？

**A:** 是的，因为：
1. 脚本需要直接写入服务器文件系统
2. 需要更新 `versions.json` 文件
3. 需要计算文件的 SHA256 校验和

如果你想从本地上传，需要：
1. 先将文件上传到服务器
2. 然后在服务器上运行上传脚本

### Q5: 如何实现增量更新？

**A:** 当前实现是全量更新。如需增量更新，需要：
1. 修改服务器逻辑，支持差分文件
2. 在客户端实现差分下载和合并
3. 这需要更复杂的实现，建议先使用全量更新

### Q6: 如何处理更新失败？

**A:** 添加错误处理：

```typescript
autoUpdater.on('error', (error) => {
  log.error('更新失败:', error);
  
  // 显示错误对话框
  dialog.showErrorBox('更新失败', 
    '无法下载更新，请检查网络连接或稍后重试。');
});
```

---

## 🎯 完整示例：从 1.0.0 更新到 1.0.1

让我们通过一个完整的例子来演示整个更新流程：

### 场景设置
- 当前 VSCodium 版本：1.0.0
- 新版本：1.0.1
- 更新服务器：`http://your-server.com:3000`

### 步骤 1：准备新版本

```bash
# 在 VSCodium 源码目录
cd /path/to/vscodium

# 修改版本号
vim package.json  # 将 version 改为 "1.0.1"

# 构建新版本
npm run compile
npm run build:win32
```

### 步骤 2：上传到服务器

```bash
# 将构建好的文件上传到服务器
scp ./dist/VSCodium-Setup-1.0.1.exe user@your-server:/tmp/
```

### 步骤 3：在服务器上注册新版本

```bash
# 登录服务器
ssh user@your-server

# 进入项目目录
cd /home/user/vscodium_update

# 运行上传脚本
node upload-script.js win32 1.0.1 /tmp/VSCodium-Setup-1.0.1.exe
```

### 步骤 4：验证更新

```bash
# 检查版本信息
curl http://localhost:3000/versions
# 输出：{"win32":["1.0.0","1.0.1"],"darwin":[],"linux":[]}

# 检查更新（模拟客户端请求）
curl "http://localhost:3000/update/win32/1.0.0"
# 输出：更新信息，包含 1.0.1 版本的下载链接
```

### 步骤 5：客户端测试

1. 启动版本为 1.0.0 的 VSCodium
2. 应用会自动检查更新
3. 发现 1.0.1 版本并开始下载
4. 下载完成后提示重启安装

### 预期结果

- ✅ 客户端检测到新版本 1.0.1
- ✅ 自动下载更新文件
- ✅ 安装完成后版本变为 1.0.1
- ✅ 下次启动不再检查更新（已是最新版本）

---

## 🎯 总结

按照这个教程，你需要：

1. **修改 VSCodium 源码**：设置版本号、配置更新服务器地址、集成 electron-updater
2. **部署更新服务器**：在服务器上运行我们提供的更新服务
3. **上传版本文件**：构建新版本后，在服务器上运行上传脚本
4. **测试更新**：启动低版本 VSCodium，验证自动更新功能

每个步骤都有详细的命令和代码示例，按顺序执行即可完成整个更新系统的搭建。