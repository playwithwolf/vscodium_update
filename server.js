// 加载环境变量
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const semver = require('semver');
const helmet = require('helmet');
const multer = require('multer');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'", "https:", "data:", "https://cdnjs.cloudflare.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"]
    }
  },
  crossOriginOpenerPolicy: false // 禁用 COOP 以避免 WSL2 环境下的问题
}));
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const platform = req.params.platform;
    const uploadPath = path.join(__dirname, 'releases', platform);
    fs.ensureDirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // 从请求体中获取版本号
    const version = req.body.version;
    if (version && file.originalname) {
      const ext = path.extname(file.originalname);
      const nameWithoutExt = path.basename(file.originalname, ext);
      // 生成带版本号的文件名
      const versionedFilename = `${nameWithoutExt}-${version}${ext}`;
      cb(null, versionedFilename);
    } else {
      cb(null, file.originalname);
    }
  }
});

// 活动日志功能
const activityLogFile = path.join(__dirname, 'activity.log');
const activityJsonFile = path.join(__dirname, 'activity.json');

// 记录活动日志
function logActivity(type, message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
  
  // 写入文本日志
  fs.appendFileSync(activityLogFile, logEntry);
  
  // 写入 JSON 格式的活动记录
  let activities = [];
  if (fs.existsSync(activityJsonFile)) {
    try {
      activities = fs.readJsonSync(activityJsonFile);
    } catch (e) {
      activities = [];
    }
  }
  
  activities.unshift({
    type,
    title: message,
    timestamp: Date.now()
  });
  
  // 只保留最近 100 条记录
  if (activities.length > 100) {
    activities = activities.slice(0, 100);
  }
  
  fs.writeJsonSync(activityJsonFile, activities);
}

// 下载日志记录
function logDownload(platform, filename, version, ipAddress, status = 'success') {
  const timestamp = new Date().toISOString();
  const logEntry = {
    id: Date.now().toString(),
    timestamp,
    platform,
    filename,
    version,
    ipAddress,
    status,
    downloadTime: timestamp
  };
  
  // 记录到下载日志文件
  let downloadLogs = [];
  const downloadLogPath = path.join(__dirname, 'download-logs.json');
  
  if (fs.existsSync(downloadLogPath)) {
    try {
      const content = fs.readFileSync(downloadLogPath, 'utf8');
      downloadLogs = JSON.parse(content);
    } catch (error) {
      console.error('读取下载日志失败:', error);
    }
  }
  
  downloadLogs.push(logEntry);
  
  // 只保留最近500条记录
  if (downloadLogs.length > 500) {
    downloadLogs = downloadLogs.slice(-500);
  }
  
  fs.writeFileSync(downloadLogPath, JSON.stringify(downloadLogs, null, 2));
}

// 版本历史记录
function saveVersionHistory(platform, version, files) {
  const timestamp = new Date().toISOString();
  const historyEntry = {
    id: Date.now().toString(),
    platform,
    version,
    files: files.map(file => ({
      filename: file.name,
      size: file.size,
      checksum: file.checksum
    })),
    fileCount: files.length,
    releaseDate: timestamp
  };
  
  // 记录到版本历史文件
  let versionHistory = [];
  const historyPath = path.join(__dirname, 'version-history.json');
  
  if (fs.existsSync(historyPath)) {
    try {
      const content = fs.readFileSync(historyPath, 'utf8');
      versionHistory = JSON.parse(content);
    } catch (error) {
      console.error('读取版本历史失败:', error);
    }
  }
  
  versionHistory.push(historyEntry);
  
  // 只保留最近200条记录
  if (versionHistory.length > 200) {
    versionHistory = versionHistory.slice(-200);
  }
  
  fs.writeFileSync(historyPath, JSON.stringify(versionHistory, null, 2));
}

// 获取活动记录 API
app.get('/api/activity', (req, res) => {
  let activities = [];
  if (fs.existsSync(activityJsonFile)) {
    try {
      activities = fs.readJsonSync(activityJsonFile);
    } catch (e) {
      activities = [];
    }
  }
  res.json(activities);
});

// 获取日志 API
app.get('/api/logs', (req, res) => {
  if (!fs.existsSync(activityLogFile)) {
    return res.send('暂无日志记录');
  }
  
  try {
    const logs = fs.readFileSync(activityLogFile, 'utf8');
    res.send(logs);
  } catch (error) {
    console.error('读取日志失败:', error);
    res.status(500).send('读取日志失败');
  }
});

// 清空日志 API
app.delete('/api/logs', (req, res) => {
  try {
    if (fs.existsSync(activityLogFile)) {
      fs.unlinkSync(activityLogFile);
    }
    if (fs.existsSync(activityJsonFile)) {
      fs.writeJsonSync(activityJsonFile, []);
    }
    
    logActivity('system', '清空日志记录');
    res.json({ message: '日志已清空' });
  } catch (error) {
    console.error('清空日志失败:', error);
    res.status(500).json({ error: '清空日志失败' });
  }
});

// 下载版本 API（管理界面用）
app.get('/api/download/:platform', (req, res) => {
  const { platform } = req.params;
  const versions = getVersions();
  
  if (!versions[platform] || !versions[platform].files || versions[platform].files.length === 0) {
    return res.status(404).json({ error: '该平台暂无可下载的文件' });
  }
  
  // 返回第一个文件的下载链接
  const firstFile = versions[platform].files[0];
  const filePath = path.join(__dirname, 'releases', platform, firstFile.name);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件不存在' });
  }
  
  logActivity('download', `下载版本: ${platform} v${versions[platform].version}`);
  res.download(filePath);
});

// 静态文件服务 - 管理界面
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

const upload = multer({ storage });

// 版本信息存储
const versionsFile = path.join(__dirname, 'versions.json');

// 初始化版本文件
if (!fs.existsSync(versionsFile)) {
  fs.writeJsonSync(versionsFile, {
    win32: { version: '1.0.0', files: [] },
    darwin: { version: '1.0.0', files: [] },
    linux: { version: '1.0.0', files: [] }
  });
}

// 获取版本信息
function getVersions() {
  return fs.readJsonSync(versionsFile);
}

// 保存版本信息
function saveVersions(versions) {
  fs.writeJsonSync(versionsFile, versions, { spaces: 2 });
}

// 生成文件校验和
function generateChecksum(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

// 检查更新 API - electron-updater 兼容
app.get('/update/:platform/:version', (req, res) => {
  const { platform, version } = req.params;
  const versions = getVersions();
  
  console.log(`检查更新请求: 平台=${platform}, 当前版本=${version}`);
  
  if (!versions[platform]) {
    return res.status(404).json({ error: '不支持的平台' });
  }
  
  const latestVersion = versions[platform].version;
  
  // 检查是否有新版本
  if (semver.lte(latestVersion, version)) {
    return res.status(204).send(); // 无更新
  }
  
  // 获取自定义下载 URL 基础地址
  const customDownloadUrl = versions[platform].downloadUrl || process.env.CUSTOM_DOWNLOAD_URL;
  
  // 返回更新信息
  const updateInfo = {
    version: latestVersion,
    files: versions[platform].files.map(file => {
      let fileUrl;
      if (customDownloadUrl) {
        // 使用自定义下载地址
        fileUrl = `${customDownloadUrl.replace(/\/$/, '')}/${platform}/${file.name}`;
      } else if (file.customUrl) {
        // 使用文件特定的自定义 URL
        fileUrl = file.customUrl;
      } else {
        // 使用默认的服务器地址
        fileUrl = `${req.protocol}://${req.get('host')}/download/${platform}/${file.name}`;
      }
      
      return {
        url: fileUrl,
        sha256: file.checksum,
        size: file.size
      };
    }),
    path: versions[platform].files[0]?.name || '',
    sha256: versions[platform].files[0]?.checksum || '',
    releaseDate: versions[platform].releaseDate || new Date().toISOString()
  };
  
  res.json(updateInfo);
});

// 下载文件 API
app.get('/download/:platform/:filename', (req, res) => {
  const { platform, filename } = req.params;
  const filePath = path.join(__dirname, 'releases', platform, filename);
  
  if (!fs.existsSync(filePath)) {
    logDownload(platform, filename, 'unknown', req.ip, 'failed');
    return res.status(404).json({ error: '文件不存在' });
  }
  
  // 获取版本信息
  const versions = getVersions();
  const version = versions[platform]?.version || 'unknown';
  
  console.log(`下载请求: ${platform}/${filename}`);
  logDownload(platform, filename, version, req.ip, 'success');
  res.download(filePath);
});

// 上传新版本 API
app.post('/upload/:platform', upload.array('files'), (req, res) => {
  const { platform } = req.params;
  const { version, downloadUrl, customUrls } = req.body;
  
  if (!version) {
    return res.status(400).json({ error: '版本号是必需的' });
  }
  
  const versions = getVersions();
  
  if (!versions[platform]) {
    versions[platform] = { version: '1.0.0', files: [] };
  }
  
  // 处理自定义 URL 列表
  let customUrlMap = {};
  if (customUrls) {
    try {
      customUrlMap = typeof customUrls === 'string' ? JSON.parse(customUrls) : customUrls;
    } catch (e) {
      console.warn('自定义 URL 解析失败:', e.message);
    }
  }
  
  // 处理上传的文件
  const files = req.files.map(file => {
    const filePath = path.join(__dirname, 'releases', platform, file.filename);
    const stats = fs.statSync(filePath);
    
    const fileInfo = {
      name: file.filename, // 使用重命名后的文件名（已包含版本号）
      size: stats.size,
      checksum: generateChecksum(filePath)
    };
    
    // 如果有为此文件指定的自定义 URL，添加到文件信息中
    // 注意：这里需要使用原始文件名作为键来查找自定义URL
    if (customUrlMap[file.originalname]) {
      fileInfo.customUrl = customUrlMap[file.originalname];
    }
    
    return fileInfo;
  });
  
  // 更新版本信息
  versions[platform] = {
    version,
    files,
    releaseDate: new Date().toISOString()
  };
  
  // 如果提供了自定义下载 URL 基础地址，保存它
  if (downloadUrl) {
    versions[platform].downloadUrl = downloadUrl;
  }
  
  saveVersions(versions);
  saveVersionHistory(platform, version, files);
  
  console.log(`新版本上传: ${platform} v${version}`);
  if (downloadUrl) {
    console.log(`自定义下载地址: ${downloadUrl}`);
  }
  
  res.json({ 
    message: '版本上传成功', 
    version, 
    files,
    downloadUrl: downloadUrl || '使用默认服务器地址'
  });
});

// 获取所有版本信息 API
app.get('/versions', (req, res) => {
  const versions = getVersions();
  res.json(versions);
});

// 生成 latest.yml 内容的函数
function generateLatestYml(platform, versions) {
  if (!versions[platform] || !versions[platform].files || versions[platform].files.length === 0) {
    return null;
  }
  
  const platformData = versions[platform];
  const mainFile = platformData.files[0]; // 主安装文件
  
  // 构建文件列表
  const files = platformData.files.map(file => {
    let fileUrl;
    const customDownloadUrl = platformData.downloadUrl || process.env.CUSTOM_DOWNLOAD_URL;
    
    if (customDownloadUrl) {
      fileUrl = `${customDownloadUrl.replace(/\/$/, '')}/${platform}/${file.name}`;
    } else if (file.customUrl) {
      fileUrl = file.customUrl;
    } else {
      // 使用相对路径，让客户端自动构建完整URL
      fileUrl = file.name;
    }
    
    return {
      url: fileUrl,
      sha512: file.checksum,
      size: file.size
    };
  });
  
  const ymlContent = {
    version: platformData.version,
    files: files,
    path: mainFile.name,
    sha512: mainFile.checksum,
    releaseDate: platformData.releaseDate || new Date().toISOString()
  };
  
  // 转换为YAML格式
  let yamlStr = `version: ${ymlContent.version}\n`;
  yamlStr += `files:\n`;
  
  ymlContent.files.forEach(file => {
    yamlStr += `  - url: ${file.url}\n`;
    yamlStr += `    sha512: ${file.sha512}\n`;
    yamlStr += `    size: ${file.size}\n`;
  });
  
  yamlStr += `path: ${ymlContent.path}\n`;
  yamlStr += `sha512: ${ymlContent.sha512}\n`;
  yamlStr += `releaseDate: '${ymlContent.releaseDate}'\n`;
  
  return yamlStr;
}

// latest.yml API - electron-updater 兼容
app.get('/latest.yml', (req, res) => {
  const versions = getVersions();
  
  // 尝试从查询参数获取平台
  let platform = req.query.platform;
  
  // 如果没有平台参数，尝试从User-Agent推断
  if (!platform) {
    const userAgent = req.get('User-Agent') || '';
    if (userAgent.includes('Windows') || userAgent.includes('win32')) {
      platform = 'win32';
    } else if (userAgent.includes('Mac') || userAgent.includes('darwin')) {
      platform = 'darwin';
    } else if (userAgent.includes('Linux') || userAgent.includes('linux')) {
      platform = 'linux';
    } else {
      // 默认使用 win32
      platform = 'win32';
    }
  }
  
  console.log(`latest.yml 请求: 平台=${platform}, User-Agent=${req.get('User-Agent')}`);
  
  const ymlContent = generateLatestYml(platform, versions);
  
  if (!ymlContent) {
    console.log(`latest.yml 404: 平台 ${platform} 没有可用版本`);
    return res.status(404).send('No releases available for this platform');
  }
  
  res.set('Content-Type', 'text/yaml; charset=utf-8');
  res.send(ymlContent);
});

// 移除了 latest-platform.yml 路由，统一使用 latest.yml?platform=xxx

// 管理界面 API 端点

// 获取版本信息 API（管理界面用）
app.get('/api/versions', (req, res) => {
  const versions = getVersions();
  res.json(versions);
});

// 创建新版本 API
app.post('/api/versions', (req, res) => {
  const { version, platform } = req.body;
  
  if (!version || !platform) {
    return res.status(400).json({ error: '版本号和平台是必需的' });
  }
  
  const versions = getVersions();
  
  if (!versions[platform]) {
    versions[platform] = { version: '1.0.0', files: [] };
  }
  
  versions[platform].version = version;
  versions[platform].lastUpdated = Date.now();
  
  saveVersions(versions);
  logActivity('version', `创建新版本: ${platform} v${version}`);
  
  res.json({ message: '版本创建成功', version, platform });
});

// 文件上传 API（管理界面用）
app.post('/api/upload/:platform', upload.array('files'), (req, res) => {
  const { platform } = req.params;
  const { version, customUrl } = req.body;
  
  if (!version) {
    return res.status(400).json({ error: '版本号是必需的' });
  }
  
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: '请选择要上传的文件' });
  }
  
  const versions = getVersions();
  
  if (!versions[platform]) {
    versions[platform] = { version: '1.0.0', files: [] };
  }
  
  // 处理上传的文件
  const files = req.files.map(file => {
    const filePath = path.join(__dirname, 'releases', platform, file.filename);
    const stats = fs.statSync(filePath);
    
    const fileInfo = {
      name: file.filename, // 使用重命名后的文件名（已包含版本号）
      size: stats.size,
      checksum: generateChecksum(filePath)
    };
    
    if (customUrl) {
      fileInfo.customUrl = customUrl;
    }
    
    return fileInfo;
  });
  
  // 更新版本信息
  versions[platform] = {
    version,
    files,
    releaseDate: new Date().toISOString(),
    lastUpdated: Date.now()
  };
  
  if (customUrl) {
    versions[platform].downloadUrl = customUrl;
  }
  
  saveVersions(versions);
  saveVersionHistory(platform, version, files);
  logActivity('upload', `上传文件: ${platform} v${version} (${files.length} 个文件)`);
  
  res.json({ 
    message: '文件上传成功', 
    version, 
    files,
    platform
  });
});

// 删除文件 API
app.delete('/api/files/:platform/:filename', (req, res) => {
  const { platform, filename } = req.params;
  const filePath = path.join(__dirname, 'releases', platform, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件不存在' });
  }
  
  try {
    fs.unlinkSync(filePath);
    
    // 更新版本信息
    const versions = getVersions();
    if (versions[platform] && versions[platform].files) {
      versions[platform].files = versions[platform].files.filter(file => file.name !== filename);
      versions[platform].lastUpdated = Date.now();
      saveVersions(versions);
    }
    
    logActivity('delete', `删除文件: ${platform}/${filename}`);
    res.json({ message: '文件删除成功' });
  } catch (error) {
    console.error('删除文件失败:', error);
    res.status(500).json({ error: '删除文件失败' });
  }
});

// 获取配置 API
app.get('/api/config', (req, res) => {
  const config = {
    PORT: process.env.PORT || 3000,
    SERVER_HOST: process.env.SERVER_HOST || 'localhost',
    CUSTOM_DOWNLOAD_URL: process.env.CUSTOM_DOWNLOAD_URL || '',
    MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || 500,
    API_KEY: process.env.API_KEY || '',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
  };
  res.json(config);
});

// 保存配置 API
app.post('/api/config', (req, res) => {
  const config = req.body;
  
  try {
    // 读取现有的 .env 文件
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // 更新配置项
    Object.keys(config).forEach(key => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const newLine = `${key}=${config[key]}`;
      
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, newLine);
      } else {
        envContent += `\n${newLine}`;
      }
    });
    
    fs.writeFileSync(envPath, envContent.trim());
    logActivity('config', '更新服务器配置');
    
    res.json({ message: '配置保存成功' });
  } catch (error) {
    console.error('保存配置失败:', error);
    res.status(500).json({ error: '保存配置失败' });
  }
});

// 获取下载日志 API
app.get('/api/download-logs', (req, res) => {
  const downloadLogPath = path.join(__dirname, 'download-logs.json');
  let downloadLogs = [];
  
  if (fs.existsSync(downloadLogPath)) {
    try {
      const content = fs.readFileSync(downloadLogPath, 'utf8');
      downloadLogs = JSON.parse(content);
    } catch (error) {
      console.error('读取下载日志失败:', error);
    }
  }
  
  res.json(downloadLogs);
});

// 获取版本历史 API
app.get('/api/version-history', (req, res) => {
  const historyPath = path.join(__dirname, 'version-history.json');
  let versionHistory = [];
  
  if (fs.existsSync(historyPath)) {
    try {
      const content = fs.readFileSync(historyPath, 'utf8');
      versionHistory = JSON.parse(content);
    } catch (error) {
      console.error('读取版本历史失败:', error);
    }
  }
  
  res.json(versionHistory);
});

// 版本回滚 API
app.post('/api/rollback', (req, res) => {
    const { platform, version } = req.body;
    
    if (!platform || !version) {
        return res.status(400).json({ error: '缺少必要参数' });
    }
    
    // 检查历史版本是否存在
    const historyPath = path.join(__dirname, 'version-history.json');
    let versionHistory = [];
    
    if (fs.existsSync(historyPath)) {
        try {
            const content = fs.readFileSync(historyPath, 'utf8');
            versionHistory = JSON.parse(content);
        } catch (error) {
            return res.status(500).json({ error: '读取版本历史失败' });
        }
    }
    
    const targetVersion = versionHistory.find(v => v.platform === platform && v.version === version);
    if (!targetVersion) {
        return res.status(404).json({ error: '目标版本不存在' });
    }
    
    // 检查文件是否仍然存在
    const missingFiles = [];
    for (const file of targetVersion.files) {
        const filePath = path.join(__dirname, 'releases', platform, file.filename);
        if (!fs.existsSync(filePath)) {
            missingFiles.push(file.filename);
        }
    }
    
    if (missingFiles.length > 0) {
        return res.status(400).json({ 
            error: '部分文件已丢失，无法回滚', 
            missingFiles 
        });
    }
    
    // 执行回滚
    const versions = getVersions();
    const previousVersion = versions[platform]?.version;
    
    versions[platform] = {
        version: targetVersion.version,
        files: targetVersion.files,
        releaseDate: targetVersion.releaseDate,
        lastUpdated: Date.now(),
        rolledBack: true,
        rolledBackFrom: previousVersion
    };
    
    saveVersions(versions);
    logActivity('rollback', `版本回滚: ${platform} 从 ${previousVersion || 'unknown'} 回滚到 ${version}`);
    
    res.json({ 
        message: '版本回滚成功', 
        platform,
        version,
        previousVersion
    });
});

// 删除版本历史 API
app.delete('/api/version-history/:historyId', (req, res) => {
    const { historyId } = req.params;
    
    const historyPath = path.join(__dirname, 'version-history.json');
    let versionHistory = [];
    
    if (fs.existsSync(historyPath)) {
        try {
            const content = fs.readFileSync(historyPath, 'utf8');
            versionHistory = JSON.parse(content);
        } catch (error) {
            return res.status(500).json({ error: '读取版本历史失败' });
        }
    }
    
    const historyIndex = versionHistory.findIndex(v => v.id === historyId);
    if (historyIndex === -1) {
        return res.status(404).json({ error: '版本历史记录不存在' });
    }
    
    const deletedHistory = versionHistory[historyIndex];
    versionHistory.splice(historyIndex, 1);
    
    fs.writeFileSync(historyPath, JSON.stringify(versionHistory, null, 2));
    logActivity('delete_history', `删除版本历史: ${deletedHistory.platform} v${deletedHistory.version}`);
    
    res.json({ message: '版本历史删除成功' });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 根路径 - 显示 API 文档
app.get('/', (req, res) => {
  res.json({
    name: 'VSCodium Update Server',
    version: '1.0.0',
    endpoints: {
      'GET /update/:platform/:version': '检查更新',
      'GET /download/:platform/:filename': '下载文件',
      'POST /upload/:platform': '上传新版本（支持自定义下载地址）',
      'GET /versions': '获取所有版本信息',
      'GET /health': '健康检查'
    },
    supportedPlatforms: ['win32', 'darwin', 'linux'],
    customDownloadSupport: {
      description: '支持自定义下载地址',
      methods: [
        '环境变量 CUSTOM_DOWNLOAD_URL',
        '上传时指定 downloadUrl 参数',
        '为单个文件指定 customUrls'
      ]
    }
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '内部服务器错误' });
});

// 启动服务器
const HTTPS_ENABLED = process.env.HTTPS_ENABLED === 'true';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH;
const SSL_KEY_PATH = process.env.SSL_KEY_PATH;

if (HTTPS_ENABLED && SSL_CERT_PATH && SSL_KEY_PATH) {
  // HTTPS 服务器
  try {
    const options = {
      key: fs.readFileSync(SSL_KEY_PATH),
      cert: fs.readFileSync(SSL_CERT_PATH)
    };
    
    https.createServer(options, app).listen(PORT, '0.0.0.0', () => {
      console.log(`VSCodium 更新服务器 (HTTPS) 运行在 0.0.0.0:${PORT}`);
      console.log(`本地访问: https://localhost:${PORT} 查看 API 文档`);
      console.log(`本地管理界面: https://localhost:${PORT}/admin`);
      console.log(`网络访问: https://YOUR-IP:${PORT} (将 YOUR-IP 替换为实际 IP 地址)`);
      
      // 确保必要的目录存在
      ['win32', 'darwin', 'linux'].forEach(platform => {
        fs.ensureDirSync(path.join(__dirname, 'releases', platform));
      });
    });
  } catch (error) {
    console.error('HTTPS 启动失败:', error.message);
    console.log('回退到 HTTP 模式...');
    startHttpServer();
  }
} else {
  startHttpServer();
}

function startHttpServer() {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VSCodium 更新服务器 (HTTP) 运行在 0.0.0.0:${PORT}`);
    console.log(`本地访问: http://localhost:${PORT} 查看 API 文档`);
    console.log(`本地管理界面: http://localhost:${PORT}/admin`);
    console.log(`网络访问: http://YOUR-IP:${PORT} (将 YOUR-IP 替换为实际 IP 地址)`);
    console.log('');
    console.log('🌐 网络访问提示:');
    console.log('   - WSL2 环境: 使用 Windows 主机 IP 地址访问');
    console.log('   - 局域网访问: 确保防火墙允许该端口');
    console.log('   - 获取 IP: 在 WSL2 中运行 `ip route show | grep default` 查看网关 IP');
    
    // 确保必要的目录存在
    ['win32', 'darwin', 'linux'].forEach(platform => {
      fs.ensureDirSync(path.join(__dirname, 'releases', platform));
    });
  });
}

module.exports = app;