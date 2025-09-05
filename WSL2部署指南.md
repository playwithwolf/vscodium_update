# 使用 WSL2 部署 VSCodium 更新服务器

## 🎯 概述

**是的，WSL2 完全可以模拟服务器环境！** WSL2 提供了完整的 Linux 环境，非常适合用来部署和测试 VSCodium 更新服务器。

### WSL2 的优势

- ✅ **完整的 Linux 环境**：支持所有 Linux 命令和工具
- ✅ **网络互通**：Windows 和 WSL2 可以相互访问
- ✅ **文件系统共享**：可以在 Windows 和 Linux 之间共享文件
- ✅ **性能优秀**：接近原生 Linux 性能
- ✅ **开发友好**：可以在 Windows 上编辑，在 WSL2 中运行

---

## 🚀 WSL2 环境准备

### 步骤 1：安装 WSL2

如果还没有安装 WSL2：

```powershell
# 在 PowerShell（管理员模式）中运行
wsl --install

# 或者安装特定发行版
wsl --install -d Ubuntu
```

### 步骤 2：启动 WSL2

```powershell
# 启动默认 WSL 发行版
wsl

# 或者启动特定发行版
wsl -d Ubuntu
```

### 步骤 3：更新系统

```bash
# 在 WSL2 中运行
sudo apt update && sudo apt upgrade -y
```

---

## 📦 在 WSL2 中部署更新服务器

### 步骤 1：安装 Node.js

```bash
# 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### 步骤 2：复制项目文件到 WSL2

**方法 1：直接在 WSL2 中访问 Windows 文件**

```bash
# Windows 的 D: 盘在 WSL2 中的路径是 /mnt/d/
cd /mnt/d/vscodium_update

# 复制到 WSL2 的用户目录
cp -r /mnt/d/vscodium_update ~/vscodium_update
cd ~/vscodium_update
```

**方法 2：使用 Git 克隆（如果项目在 Git 仓库中）**

```bash
# 如果项目已经推送到 Git
git clone <your-repo-url> ~/vscodium_update
cd ~/vscodium_update
```

### 步骤 3：安装依赖

```bash
cd ~/vscodium_update
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
NODE_ENV=development
HOST=0.0.0.0  # 重要：允许外部访问
```

### 步骤 5：启动服务器

```bash
# 启动开发服务器
npm start

# 或者使用 PM2（推荐）
npm install -g pm2
pm2 start ecosystem.config.js
```

---

## 🌐 网络配置和访问

### WSL2 网络访问说明

**从 Windows 访问 WSL2 服务器：**
- URL：`http://localhost:3000`
- 或者：`http://127.0.0.1:3000`

**从其他设备访问（局域网）：**
1. 获取 Windows 主机的 IP 地址
2. 使用：`http://[Windows-IP]:3000`

### 获取 IP 地址

```bash
# 在 WSL2 中查看 IP
ip addr show eth0

# 在 Windows 中查看 IP
ipconfig
```

### 防火墙配置

如果无法从外部访问，需要配置 Windows 防火墙：

```powershell
# 在 PowerShell（管理员模式）中运行
New-NetFirewallRule -DisplayName "VSCodium Update Server" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

---

## 📁 文件管理

### Windows 和 WSL2 文件互访

**从 Windows 访问 WSL2 文件：**
- 在文件资源管理器中输入：`\\wsl$\Ubuntu\home\[username]\vscodium_update`
- 或者：`\\wsl.localhost\Ubuntu\home\[username]\vscodium_update`

**从 WSL2 访问 Windows 文件：**
- Windows C: 盘：`/mnt/c/`
- Windows D: 盘：`/mnt/d/`

### 推荐的工作流程

1. **代码编辑**：在 Windows 中使用 VS Code 或其他编辑器
2. **服务器运行**：在 WSL2 中运行更新服务器
3. **文件上传**：在 WSL2 中运行上传脚本

---

## 🔧 VSCodium 客户端配置

### 配置更新服务器地址

在 VSCodium 的配置中，使用以下地址：

```json
// 如果 VSCodium 运行在同一台 Windows 机器上
{
  "updateUrl": "http://localhost:3000"
}

// 如果 VSCodium 运行在其他机器上
{
  "updateUrl": "http://[Windows-IP]:3000"
}
```

---

## 📦 版本上传流程

### 完整的上传流程示例

```bash
# 1. 在 Windows 中构建 VSCodium（假设构建输出在 D:\vscodium\dist\）

# 2. 在 WSL2 中复制文件
cp /mnt/d/vscodium/dist/VSCodium-Setup-1.0.1.exe /tmp/

# 3. 在 WSL2 中运行上传脚本
cd ~/vscodium_update
node upload-script.js win32 1.0.1 /tmp/VSCodium-Setup-1.0.1.exe

# 4. 验证上传结果
curl http://localhost:3000/versions
```

---

## 🛠️ 开发和调试

### VS Code 集成

1. **安装 WSL 扩展**：在 VS Code 中安装 "WSL" 扩展
2. **连接到 WSL2**：`Ctrl+Shift+P` → "WSL: Connect to WSL"
3. **打开项目**：在 WSL2 模式下打开 `~/vscodium_update`

### 日志查看

```bash
# 查看服务器日志
pm2 logs vscodium-update-server

# 实时查看日志
pm2 logs vscodium-update-server --lines 50 -f

# 查看系统日志
journalctl -u vscodium-update-server -f
```

### 调试命令

```bash
# 测试服务器连接
curl http://localhost:3000/health

# 测试更新接口
curl "http://localhost:3000/update/win32/1.0.0"

# 检查端口占用
sudo netstat -tlnp | grep :3000

# 检查进程状态
pm2 status
```

---

## 🌐 网络访问配置

### 从其他电脑访问 WSL2 服务器

服务器现在默认监听 `0.0.0.0:3000`，支持从局域网内的其他电脑访问。

#### 1. 获取访问地址

```bash
# 方法一：获取 WSL2 的 IP 地址
ip addr show eth0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1

# 方法二：获取 Windows 主机 IP（推荐）
ip route show | grep default | awk '{print $3}'

# 方法三：在 Windows 中查看 IP
# 打开 PowerShell 运行：ipconfig
```

#### 2. 访问方式

**本地访问（WSL2 内部）：**
```
http://localhost:3000
http://localhost:3000/admin
```

**Windows 主机访问：**
```
http://localhost:3000
http://127.0.0.1:3000
```

**局域网其他电脑访问：**
```
http://WINDOWS-HOST-IP:3000
http://WINDOWS-HOST-IP:3000/admin
```

#### 3. 防火墙配置

**Windows 防火墙设置：**
```powershell
# 在 Windows PowerShell（管理员模式）中运行
New-NetFirewallRule -DisplayName "VSCodium Update Server" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

**或者通过图形界面：**
1. 打开 Windows 防火墙设置
2. 点击「高级设置」
3. 选择「入站规则」→「新建规则」
4. 选择「端口」→「TCP」→「特定本地端口」→ 输入 `3000`
5. 选择「允许连接」

#### 4. 网络测试

```bash
# 在 WSL2 中测试服务器是否正常运行
curl http://localhost:3000

# 在其他电脑上测试网络连通性
# 替换 YOUR-WINDOWS-IP 为实际 IP 地址
curl http://YOUR-WINDOWS-IP:3000
```

---

## ⚠️ 注意事项

### 性能优化

1. **文件位置**：将项目文件放在 WSL2 文件系统中（`~/vscodium_update`）而不是 Windows 挂载点（`/mnt/d/`）
2. **内存限制**：WSL2 默认使用 50% 的系统内存，可以通过 `.wslconfig` 文件调整
3. **磁盘空间**：定期清理 `releases/` 目录中的旧版本文件

### 常见问题

**Q: 无法从其他电脑访问 WSL2 服务器**
A: 服务器现在默认监听 `0.0.0.0:3000`，支持网络访问。如果仍无法访问，请检查：
   - Windows 防火墙是否允许端口 3000
   - WSL2 网络配置是否正确
   - 使用正确的 IP 地址访问

**Q: 文件权限问题**
A: 使用 `chmod 755` 设置正确的文件权限

**Q: WSL2 重启后服务器停止**
A: 使用 PM2 或创建系统服务来自动启动

**Q: 浏览器显示 Cross-Origin-Opener-Policy 错误，admin.css 和 admin.js 加载失败**
A: 这是 WSL2 环境下的安全策略问题，有以下解决方案：

1. **推荐方案：启用 HTTPS**
   ```bash
   # 生成自签名证书
   npm run generate-ssl
   
   # 编辑 .env 文件
   echo "HTTPS_ENABLED=true" >> .env
   echo "SSL_CERT_PATH=$(pwd)/ssl/server.crt" >> .env
   echo "SSL_KEY_PATH=$(pwd)/ssl/server.key" >> .env
   
   # 重启服务器
   pm2 restart vscodium-update-server
   
   # 访问 HTTPS 地址
   # https://localhost:3000/admin
   ```

2. **临时方案：使用 WSL2 IP 地址**
   ```bash
   # 获取 WSL2 IP 地址
   ip addr show eth0 | grep inet | awk '{print $2}' | cut -d/ -f1
   
   # 使用 WSL2 IP 访问（替换为实际 IP）
   # http://172.x.x.x:3000/admin
   ```

3. **浏览器方案：禁用安全策略（仅开发环境）**
   - Chrome: 启动时添加 `--disable-web-security --disable-features=VizDisplayCompositor`
   - 注意：这会降低浏览器安全性，仅用于开发测试

### 自动启动配置

```bash
# 创建启动脚本
echo '#!/bin/bash
cd ~/vscodium_update && pm2 start ecosystem.config.js' > ~/start-server.sh
chmod +x ~/start-server.sh

# 添加到 .bashrc（WSL2 启动时自动运行）
echo '~/start-server.sh' >> ~/.bashrc
```

---

## 🎯 总结

WSL2 是一个**完美的服务器模拟环境**，具有以下优势：

✅ **开发友好**：可以在 Windows 中编辑代码，在 WSL2 中运行服务器
✅ **网络互通**：Windows 和 WSL2 之间可以无缝通信
✅ **性能优秀**：接近原生 Linux 性能
✅ **成本低廉**：无需额外的服务器资源
✅ **调试方便**：可以直接在本地进行开发和测试

使用 WSL2 部署 VSCodium 更新服务器是一个非常好的选择，特别适合开发和测试阶段！