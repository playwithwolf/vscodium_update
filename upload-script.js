#!/usr/bin/env node

/**
 * VSCodium 版本上传脚本
 * 用于将新版本的安装包上传到更新服务器
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// 配置
const CONFIG = {
  serverUrl: 'http://localhost:3000',
  apiKey: process.env.API_KEY || '', // 如果服务器需要 API 密钥
};

/**
 * 上传文件到指定平台
 * @param {string} platform - 平台标识符 (win32, darwin, linux)
 * @param {string} version - 版本号
 * @param {string[]} filePaths - 文件路径数组
 * @param {string} downloadUrl - 可选的自定义下载基础地址
 * @param {Object} customUrls - 可选的文件特定自定义 URL 映射
 */
async function uploadVersion(platform, version, filePaths, downloadUrl = null, customUrls = null) {
  try {
    console.log(`开始上传 ${platform} 平台的版本 ${version}...`);
    
    // 验证文件是否存在
    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) {
        throw new Error(`文件不存在: ${filePath}`);
      }
    }
    
    // 创建 FormData
    const formData = new FormData();
    formData.append('version', version);
    
    // 添加自定义下载地址（如果提供）
    if (downloadUrl) {
      formData.append('downloadUrl', downloadUrl);
      console.log(`使用自定义下载地址: ${downloadUrl}`);
    }
    
    // 添加文件特定的自定义 URL（如果提供）
    if (customUrls) {
      formData.append('customUrls', JSON.stringify(customUrls));
      console.log(`文件自定义 URL:`, customUrls);
    }
    
    // 添加文件
    for (const filePath of filePaths) {
      const fileName = path.basename(filePath);
      const fileStream = fs.createReadStream(filePath);
      formData.append('files', fileStream, fileName);
      console.log(`添加文件: ${fileName}`);
    }
    
    // 发送请求
    const response = await fetch(`${CONFIG.serverUrl}/upload/${platform}`, {
      method: 'POST',
      body: formData,
      headers: {
        ...(CONFIG.apiKey && { 'Authorization': `Bearer ${CONFIG.apiKey}` })
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`上传失败: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('上传成功!');
    console.log('响应:', JSON.stringify(result, null, 2));
    
    return result;
    
  } catch (error) {
    console.error('上传失败:', error.message);
    process.exit(1);
  }
}

/**
 * 获取当前版本信息
 */
async function getVersions() {
  try {
    const response = await fetch(`${CONFIG.serverUrl}/versions`);
    if (!response.ok) {
      throw new Error(`获取版本信息失败: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('获取版本信息失败:', error.message);
    return null;
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
VSCodium 版本上传脚本

用法:
  node upload-script.js <platform> <version> <file1> [file2] [...] [选项]

参数:
  platform  平台标识符 (win32, darwin, linux)
  version   版本号 (如: 1.2.0)
  file1     安装包文件路径
  file2     可选的额外文件

选项:
  -d, --download-url <url>     设置自定义下载基础地址
  -c, --custom-url <file=url>  为特定文件设置自定义下载 URL
  -h, --help                   显示帮助信息

示例:
  # 基本上传
  node upload-script.js win32 1.2.0 ./VSCodium-1.2.0-Setup.exe
  
  # 使用自定义下载基础地址
  node upload-script.js win32 1.2.0 ./VSCodium-Setup.exe -d https://cdn.example.com/releases
  
  # 为特定文件设置自定义 URL
  node upload-script.js win32 1.2.0 ./VSCodium-Setup.exe -c VSCodium-Setup.exe=https://cdn.example.com/VSCodium-Setup.exe
  
  # 组合使用
  node upload-script.js linux 1.2.0 ./VSCodium.deb ./VSCodium.rpm \
    -d https://cdn.example.com/releases \
    -c VSCodium.deb=https://special-cdn.com/VSCodium.deb

环境变量:
  API_KEY    服务器 API 密钥（如果需要）
  SERVER_URL 服务器地址（默认: http://localhost:3000）

自定义下载地址说明:
  1. 基础地址 (-d): 所有文件将使用 <基础地址>/<平台>/<文件名> 格式
  2. 文件特定 URL (-c): 为单个文件指定完整的下载 URL
  3. 优先级: 文件特定 URL > 基础地址 > 服务器默认地址
`);
}

/**
 * 解析命令行参数
 */
function parseArgs(args) {
  const result = {
    platform: null,
    version: null,
    filePaths: [],
    downloadUrl: null,
    customUrls: {}
  };
  
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    
    if (arg === '--download-url' || arg === '-d') {
      result.downloadUrl = args[++i];
    } else if (arg === '--custom-url' || arg === '-c') {
      const [fileName, url] = args[++i].split('=');
      if (fileName && url) {
        result.customUrls[fileName] = url;
      }
    } else if (!result.platform) {
      result.platform = arg;
    } else if (!result.version) {
      result.version = arg;
    } else {
      result.filePaths.push(arg);
    }
    i++;
  }
  
  return result;
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 3 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  const { platform, version, filePaths, downloadUrl, customUrls } = parseArgs(args);
  
  // 验证平台
  const supportedPlatforms = ['win32', 'darwin', 'linux'];
  if (!supportedPlatforms.includes(platform)) {
    console.error(`错误: 不支持的平台 '${platform}'`);
    console.error(`支持的平台: ${supportedPlatforms.join(', ')}`);
    process.exit(1);
  }
  
  // 验证版本号格式
  const versionRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/;
  if (!versionRegex.test(version)) {
    console.error(`错误: 版本号格式不正确 '${version}'`);
    console.error('版本号应该遵循 semver 格式，如: 1.2.0 或 1.2.0-beta.1');
    process.exit(1);
  }
  
  if (filePaths.length === 0) {
    console.error('错误: 至少需要指定一个文件');
    process.exit(1);
  }
  
  // 显示当前版本信息
  console.log('获取当前版本信息...');
  const currentVersions = await getVersions();
  if (currentVersions && currentVersions[platform]) {
    console.log(`当前 ${platform} 版本: ${currentVersions[platform].version}`);
  }
  
  // 上传新版本
  await uploadVersion(platform, version, filePaths, downloadUrl, Object.keys(customUrls).length > 0 ? customUrls : null);
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { uploadVersion, getVersions };