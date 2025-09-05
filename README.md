# VSCodium 自定义更新服务器

一个为 VSCodium 提供自动更新功能的 Node.js 服务器，支持 Windows、macOS 和 Linux 多平台更新。

## 📚 文档导航

- **[VSCodium集成详细教程.md](./VSCodium集成详细教程.md)** - 完整的小白化教程，包含具体的代码修改和部署步骤
- **[WSL2部署指南.md](./WSL2部署指南.md)** - 使用 WSL2 模拟服务器环境的完整指南
- **[快速参考.md](./快速参考.md)** - 常用命令和配置的快速查找手册
- **[README.md](./README.md)** - 本文档，API 参考和快速配置

## ✨ 功能特性

- 🚀 支持多平台更新（Windows、macOS、Linux）
- 🔄 兼容 `electron-updater` 自动更新机制
- 📦 版本管理和文件存储
- 🔐 SHA256 文件校验
- 🌐 支持自定义下载地址（CDN、第三方存储等）
- 📝 完整的 API 文档
- 🛡️ 安全的文件上传和下载

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务器

```bash
# 生产环境
npm start

# 开发环境（自动重启）
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

### 3. 环境变量配置

创建 `.env` 文件（可选）：

```env
PORT=3000
NODE_ENV=production
# 设置全局自定义下载地址（可选）
CUSTOM_DOWNLOAD_URL=https://your-cdn.com/releases
```

## API 接口文档

### 检查更新

**GET** `/update/:platform/:version`

检查指定平台和版本是否有可用更新。

**参数：**
- `platform`: 平台标识符（`win32`、`darwin`、`linux`）
- `version`: 当前版本号（遵循 semver 格式）

**响应：**
- `204 No Content`: 无可用更新
- `200 OK`: 有可用更新，返回更新信息

```json
{
  "version": "1.2.0",
  "files": [
    {
      "url": "http://localhost:3000/download/win32/VSCodium-1.2.0-Setup.exe",
      "sha256": "abc123...",
      "size": 85234567
    }
  ],
  "path": "VSCodium-1.2.0-Setup.exe",
  "sha256": "abc123...",
  "releaseDate": "2024-01-15T10:30:00.000Z"
}
```

### 下载文件

**GET** `/download/:platform/:filename`

下载指定平台的更新文件。

**参数：**
- `platform`: 平台标识符
- `filename`: 文件名

### 上传新版本

**POST** `/upload/:platform`

上传新版本的更新文件，支持自定义下载地址。

**参数：**
- `platform`: 平台标识符
- `version`: 版本号（在请求体中）
- `files`: 上传的文件（multipart/form-data）
- `downloadUrl`: 可选，自定义下载基础地址
- `customUrls`: 可选，文件特定的自定义 URL 映射（JSON 格式）

**基本上传示例：**
```bash
curl -X POST \
  -F "version=1.2.0" \
  -F "files=@VSCodium-1.2.0-Setup.exe" \
  http://localhost:3000/upload/win32
```

**使用自定义下载地址：**
```bash
curl -X POST \
  -F "version=1.2.0" \
  -F "downloadUrl=https://cdn.example.com/releases" \
  -F "files=@VSCodium-1.2.0-Setup.exe" \
  http://localhost:3000/upload/win32
```

**为特定文件设置自定义 URL：**
```bash
curl -X POST \
  -F "version=1.2.0" \
  -F 'customUrls={"VSCodium-1.2.0-Setup.exe":"https://special-cdn.com/VSCodium-Setup.exe"}' \
  -F "files=@VSCodium-1.2.0-Setup.exe" \
  http://localhost:3000/upload/win32
```

### 获取版本信息

**GET** `/versions`

获取所有平台的版本信息。

### 健康检查

**GET** `/health`

检查服务器运行状态。

## 目录结构

```
vscodium-update-server/
├── server.js              # 主服务器文件
├── package.json           # 项目配置
├── versions.json          # 版本信息存储
├── releases/              # 更新文件存储目录
│   ├── win32/            # Windows 平台文件
│   ├── darwin/           # macOS 平台文件
│   └── linux/            # Linux 平台文件
├── public/               # 静态文件目录
└── README.md             # 项目文档
```

## 🔧 VSCodium 客户端配置

详细的 VSCodium 代码修改和集成步骤请参考：**[VSCodium集成详细教程.md](./VSCodium集成详细教程.md)**

### 基本步骤概览

1. **修改版本号**：在 VSCodium 的 `package.json` 中设置版本号
2. **配置更新服务器**：在 `product.json` 中设置更新服务器地址
3. **集成 electron-updater**：在主进程中添加自动更新逻辑
4. **构建和测试**：构建新版本并测试更新功能

### 客户端示例代码

项目中包含完整的客户端集成示例：
- **[vscodium-client-example.js](./vscodium-client-example.js)** - 完整的客户端更新管理器

## 🚀 服务器部署

详细的部署步骤请参考：**[VSCodium集成详细教程.md](./VSCodium集成详细教程.md)**

### 快速启动

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 或使用 PM2 生产部署
pm2 start ecosystem.config.js
```

## 🌐 CDN 和自定义下载地址配置

服务器支持灵活的下载地址配置，可以使用 CDN 加速、第三方存储或自定义服务器。系统会**自动处理平台路径**，您无需在基础地址中包含平台标识符。

### 📁 平台路径自动处理机制

**重要说明**：系统会自动在您的基础地址后添加平台路径，您只需要设置到 `/releases` 级别。

**平台标识符映射**：
- Windows: `win32`
- macOS: `darwin` 
- Linux: `linux`

**URL 生成规则**：
```
基础地址 + / + 平台标识符 + / + 文件名
```

**示例**：
- 设置：`CUSTOM_DOWNLOAD_URL=https://cdn.example.com/releases`
- Windows 文件：`https://cdn.example.com/releases/win32/VSCodium-Setup.exe`
- macOS 文件：`https://cdn.example.com/releases/darwin/VSCodium.dmg`
- Linux 文件：`https://cdn.example.com/releases/linux/VSCodium.AppImage`

### 🏗️ CDN 文件夹结构要求

在您的 CDN 或存储服务器上，需要按以下结构组织文件：

```
your-cdn.com/releases/
├── win32/
│   ├── VSCodium-1.0.0-Setup.exe
│   ├── VSCodium-1.0.1-Setup.exe
│   └── VSCodium-1.0.2-Setup.exe
├── darwin/
│   ├── VSCodium-1.0.0.dmg
│   ├── VSCodium-1.0.1.dmg
│   └── VSCodium-1.0.2.dmg
└── linux/
    ├── VSCodium-1.0.0.AppImage
    ├── VSCodium-1.0.1.AppImage
    └── VSCodium-1.0.2.AppImage
```

### ⚙️ 三种配置方式（优先级从高到低）

#### 1. 文件特定自定义 URL（最高优先级）
为单个文件指定完整的下载 URL，绕过所有自动路径处理：
```bash
node upload-script.js win32 1.2.0 ./VSCodium-Setup.exe \
  -c VSCodium-Setup.exe=https://special-cdn.com/custom-path/VSCodium-Setup.exe
```

#### 2. 平台级自定义基础地址（中等优先级）
为整个平台设置基础下载地址，系统自动添加平台路径：
```bash
node upload-script.js win32 1.2.0 ./VSCodium-Setup.exe \
  -d https://cdn.example.com/releases
```
**生成的下载 URL**: `https://cdn.example.com/releases/win32/VSCodium-Setup.exe`

#### 3. 全局环境变量（最低优先级）
在 `.env` 文件中设置全局基础地址：
```env
CUSTOM_DOWNLOAD_URL=https://your-cdn.com/releases
```
**所有平台都会使用此基础地址**，系统自动添加对应的平台路径。

### 🚀 CDN 部署工作流程

#### 步骤 1：准备 CDN 环境
```bash
# 在您的 CDN 或存储服务器上创建目录结构
mkdir -p /var/www/cdn/releases/{win32,darwin,linux}
```

#### 步骤 2：上传文件到 CDN
```bash
# 手动上传文件到对应平台目录
scp VSCodium-1.0.1-Setup.exe user@cdn-server:/var/www/cdn/releases/win32/
scp VSCodium-1.0.1.dmg user@cdn-server:/var/www/cdn/releases/darwin/
scp VSCodium-1.0.1.AppImage user@cdn-server:/var/www/cdn/releases/linux/
```

#### 步骤 3：配置更新服务器
```bash
# 方式 1：环境变量配置
echo "CUSTOM_DOWNLOAD_URL=https://your-cdn.com/releases" >> .env

# 方式 2：上传时指定
node upload-script.js win32 1.0.1 /tmp/VSCodium-Setup.exe \
  -d https://your-cdn.com/releases
```

#### 步骤 4：验证配置
```bash
# 检查生成的下载链接
curl "http://localhost:3000/update/win32/1.0.0"

# 测试实际下载
curl -I "https://your-cdn.com/releases/win32/VSCodium-Setup.exe"
```

### 使用场景

- **CDN 加速**: 将文件托管在 CDN 上，提高下载速度
- **地理分布**: 不同地区使用不同的下载服务器
- **负载均衡**: 分散下载压力到多个服务器
- **第三方存储**: 使用 AWS S3、阿里云 OSS 等云存储服务

## 安全注意事项

1. **HTTPS**: 生产环境中建议使用 HTTPS
2. **访问控制**: 考虑添加 API 密钥或其他认证机制
3. **文件验证**: 上传文件时进行病毒扫描和格式验证
4. **速率限制**: 添加请求频率限制
5. **日志记录**: 记录所有关键操作的日志
6. **下载地址验证**: 确保自定义下载地址的安全性

## 🔍 故障排除

### 常见问题

详细的问题解决方案请参考：**[VSCodium集成详细教程.md](./VSCodium集成详细教程.md)**

**快速检查清单：**

1. **服务器状态**：`curl http://your-server:3000/health`
2. **更新接口**：`curl "http://your-server:3000/update/win32/1.0.0"`
3. **版本格式**：确保使用语义化版本（如：1.0.0）
4. **文件权限**：检查 `releases/` 目录权限
5. **防火墙**：确保端口 3000 可访问

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！