#!/usr/bin/env node

/**
 * SSL 证书生成脚本
 * 用于在 WSL2 环境下生成自签名证书，解决 Cross-Origin-Opener-Policy 问题
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔐 正在生成 SSL 自签名证书...');
console.log('');

try {
  // 检查 openssl 是否可用
  try {
    execSync('openssl version', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ 错误: 未找到 openssl 命令');
    console.log('请先安装 openssl:');
    console.log('  Ubuntu/Debian: sudo apt-get install openssl');
    console.log('  CentOS/RHEL:   sudo yum install openssl');
    console.log('  Windows:       使用 WSL2 或安装 Git Bash');
    process.exit(1);
  }

  // 创建 ssl 目录
  const sslDir = path.join(__dirname, 'ssl');
  if (!fs.existsSync(sslDir)) {
    fs.mkdirSync(sslDir);
  }

  const keyPath = path.join(sslDir, 'server.key');
  const certPath = path.join(sslDir, 'server.crt');

  // 生成私钥
  console.log('📝 生成私钥...');
  execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: 'inherit' });

  // 生成证书
  console.log('📜 生成证书...');
  const certCommand = `openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -subj "/C=CN/ST=Local/L=Local/O=VSCodium Update Server/CN=localhost"`;
  execSync(certCommand, { stdio: 'inherit' });

  console.log('');
  console.log('✅ SSL 证书生成成功!');
  console.log('');
  console.log('📁 证书文件位置:');
  console.log(`   私钥: ${keyPath}`);
  console.log(`   证书: ${certPath}`);
  console.log('');
  console.log('⚙️  配置步骤:');
  console.log('1. 编辑 .env 文件，添加以下配置:');
  console.log('   HTTPS_ENABLED=true');
  console.log(`   SSL_CERT_PATH=${certPath}`);
  console.log(`   SSL_KEY_PATH=${keyPath}`);
  console.log('');
  console.log('2. 重启服务器:');
  console.log('   npm start');
  console.log('');
  console.log('3. 访问管理界面:');
  console.log('   https://localhost:3000/admin');
  console.log('');
  console.log('⚠️  浏览器安全提示:');
  console.log('   首次访问时浏览器会显示"不安全"警告');
  console.log('   点击"高级" -> "继续访问localhost"即可');
  console.log('   这是正常现象，因为使用的是自签名证书');

} catch (error) {
  console.error('❌ 生成证书失败:', error.message);
  console.log('');
  console.log('💡 解决方案:');
  console.log('1. 确保在 WSL2 或 Linux 环境下运行');
  console.log('2. 检查 openssl 是否正确安装');
  console.log('3. 确保有写入权限');
  process.exit(1);
}