// 全局变量
let currentPlatform = 'win32';
let currentVersions = {};
let uploadProgress = 0;
let currentWizardStep = 1;
let wizardData = {};

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 添加页面加载动画
    showLoadingState();
    
    // 延迟加载内容以显示动画效果
    setTimeout(() => {
        initializeApp();
        hideLoadingState();
    }, 500);
    
    // 添加键盘快捷键支持
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // 监听窗口大小变化，在桌面端自动关闭移动菜单
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            closeMobileMenu();
        }
    });
});

// 初始化应用
function initializeApp() {
    setupEventListeners();
    loadDashboardData();
    loadConfig();
    setupFileUpload();
    initializeTabs();
}

// 设置事件监听器
function setupEventListeners() {
    // 移动端菜单切换
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', toggleMobileMenu);
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMobileMenu);
    }
    
    // 侧边栏菜单点击
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
            // 在移动端点击菜单项后关闭侧边栏
            if (window.innerWidth <= 768) {
                closeMobileMenu();
            }
        });
    });

    // 平台标签点击
    document.querySelectorAll('.platform-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const platform = this.dataset.platform;
            switchPlatform(platform);
        });
    });

    // 表单提交
    const uploadForm = document.getElementById('upload-form');
    const configForm = document.getElementById('config-form');
    const newVersionForm = document.getElementById('new-version-form');
    
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleFileUpload);
    }
    if (configForm) {
        configForm.addEventListener('submit', handleConfigSave);
    }
    if (newVersionForm) {
        newVersionForm.addEventListener('submit', handleNewVersionSubmit);
    }
    
    // 发布新版本按钮点击
    const openVersionWizardBtn = document.getElementById('openVersionWizardBtn');
    if (openVersionWizardBtn) {
        openVersionWizardBtn.addEventListener('click', openVersionWizard);
    }
    
    // 刷新数据按钮
    const refreshDataBtn = document.getElementById('refreshDataBtn');
    if (refreshDataBtn) {
        refreshDataBtn.addEventListener('click', refreshData);
    }
    
    // 快速操作按钮
    const showCurrentVersionsBtn = document.getElementById('showCurrentVersionsBtn');
    if (showCurrentVersionsBtn) {
        showCurrentVersionsBtn.addEventListener('click', showCurrentVersions);
    }
    
    const showVersionHistoryBtn = document.getElementById('showVersionHistoryBtn');
    if (showVersionHistoryBtn) {
        showVersionHistoryBtn.addEventListener('click', showVersionHistory);
    }
    
    const showDownloadLogsBtn = document.getElementById('showDownloadLogsBtn');
    if (showDownloadLogsBtn) {
        showDownloadLogsBtn.addEventListener('click', showDownloadLogs);
    }
    
    // 配置相关按钮
    const loadConfigBtn = document.getElementById('loadConfigBtn');
    if (loadConfigBtn) {
        loadConfigBtn.addEventListener('click', loadConfig);
    }
    
    // 日志相关按钮
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', clearLogs);
    }
    
    const refreshLogsBtn = document.getElementById('refreshLogsBtn');
    if (refreshLogsBtn) {
        refreshLogsBtn.addEventListener('click', refreshLogs);
    }
    
    // 向导模态框相关按钮
    const closeWizardModalBtn = document.getElementById('closeWizardModalBtn');
    if (closeWizardModalBtn) {
        closeWizardModalBtn.addEventListener('click', () => closeModal('versionWizardModal'));
    }
    
    const wizardCancelBtn = document.getElementById('wizardCancelBtn');
    if (wizardCancelBtn) {
        wizardCancelBtn.addEventListener('click', () => closeModal('versionWizardModal'));
    }
    
    const wizardPrevBtn = document.getElementById('wizardPrevBtn');
    if (wizardPrevBtn) {
        wizardPrevBtn.addEventListener('click', previousWizardStep);
    }
    
    const wizardNextBtn = document.getElementById('wizardNextBtn');
    if (wizardNextBtn) {
        wizardNextBtn.addEventListener('click', nextWizardStep);
    }
    
    const wizardFinishBtn = document.getElementById('wizardFinishBtn');
    if (wizardFinishBtn) {
        wizardFinishBtn.addEventListener('click', finishVersionRelease);
    }
    
    // 新增的静态按钮事件监听器
    const loadVersionHistoryBtn = document.getElementById('loadVersionHistoryBtn');
    if (loadVersionHistoryBtn) {
        loadVersionHistoryBtn.addEventListener('click', loadVersionHistory);
    }
    
    const loadDownloadLogsBtn = document.getElementById('loadDownloadLogsBtn');
    if (loadDownloadLogsBtn) {
        loadDownloadLogsBtn.addEventListener('click', loadDownloadLogs);
    }
    
    const exportDownloadLogsBtn = document.getElementById('exportDownloadLogsBtn');
    if (exportDownloadLogsBtn) {
        exportDownloadLogsBtn.addEventListener('click', exportDownloadLogs);
    }
    
    // 事件委托处理动态生成的按钮
    document.addEventListener('click', function(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        
        const action = target.dataset.action;
        const platform = target.dataset.platform;
        const version = target.dataset.version;
        const filename = target.dataset.filename;
        const id = target.dataset.id;
        const index = target.dataset.index;
        const checksum = target.dataset.checksum;
        
        switch(action) {
            case 'downloadVersion':
                downloadVersion(platform);
                break;
            case 'showVersionDetail':
                showVersionDetail(platform, version);
                break;
            case 'editVersion':
                editVersion(platform);
                break;
            case 'downloadFile':
                downloadFile(platform, filename);
                break;
            case 'deleteFile':
                deleteFile(platform, filename);
                break;
            case 'rollbackVersion':
                rollbackVersion(platform, version);
                break;
            case 'deleteVersionHistory':
                deleteVersionHistory(id);
                break;
            case 'removeWizardFile':
                removeWizardFile(parseInt(index));
                break;
            case 'copyChecksum':
                copyChecksum(checksum);
                break;
        }
    });
    
    // 处理alert关闭按钮的事件委托
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('alert-close')) {
            e.target.parentElement.remove();
        }
    });

    // 移除旧的标签页事件监听器（现在使用卡片点击）

    // 版本发布向导事件
    const releaseBtn = document.getElementById('releaseVersionBtn');
    if (releaseBtn) {
        releaseBtn.addEventListener('click', () => {
            openVersionWizard();
        });
    }

    // 向导导航事件已在setupEventListeners中处理

    // 模态框关闭
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target.id);
        }
    });
}

// 切换标签页
function switchTab(tabName) {
    // 更新菜单状态
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // 更新内容区域
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    // 更新页面标题
    const titles = {
        dashboard: '仪表板',
        versions: '版本管理',
        upload: '文件上传',
        config: '服务器配置',
        logs: '日志查看'
    };
    document.getElementById('page-title').textContent = titles[tabName];

    // 加载对应数据
    switch(tabName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'versions':
            loadVersionData();
            loadVersionHistory();
            loadDownloadLogs();
            break;
        case 'logs':
            loadLogs();
            break;
    }
}

// 切换平台
function switchPlatform(platform) {
    currentPlatform = platform;
    
    // 更新平台标签状态
    document.querySelectorAll('.platform-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-platform="${platform}"]`).classList.add('active');

    // 更新标题
    const platformNames = {
        win32: 'Windows',
        darwin: 'macOS',
        linux: 'Linux'
    };
    document.getElementById('current-platform-title').textContent = `${platformNames[platform]} 版本管理`;

    // 加载版本数据
    loadVersionData();
}

// 加载仪表板数据
async function loadDashboardData() {
    try {
        showLoading('dashboard');
        
        // 获取版本信息
        const response = await fetch('/api/versions');
        const versions = await response.json();
        
        // 更新版本显示
        document.getElementById('windows-version').textContent = versions.win32?.version || '未设置';
        document.getElementById('darwin-version').textContent = versions.darwin?.version || '未设置';
        document.getElementById('linux-version').textContent = versions.linux?.version || '未设置';
        
        // 加载活动记录
        await loadActivityLog();
        
        hideLoading('dashboard');
    } catch (error) {
        console.error('加载仪表板数据失败:', error);
        showAlert('加载数据失败', 'error');
        hideLoading('dashboard');
    }
}

// 加载活动记录
async function loadActivityLog() {
    try {
        const response = await fetch('/api/activity');
        const activities = await response.json();
        
        const activityList = document.getElementById('activity-list');
        
        if (activities.length === 0) {
            activityList.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">暂无活动记录</p>';
            return;
        }
        
        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="${getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <h4>${activity.title}</h4>
                    <p>${formatTime(activity.timestamp)}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载活动记录失败:', error);
        document.getElementById('activity-list').innerHTML = '<p style="text-align: center; color: #e74c3c; padding: 20px;">加载活动记录失败</p>';
    }
}

// 加载版本数据
async function loadVersionData() {
    try {
        showLoading('versions');
        
        const response = await fetch('/api/versions');
        const versions = await response.json();
        currentVersions = versions;
        
        const versionList = document.getElementById('version-list');
        const platformData = versions[currentPlatform];
        
        if (!platformData || !platformData.version) {
            versionList.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 40px;">暂无版本数据</p>';
            hideLoading('versions');
            return;
        }
        
        versionList.innerHTML = `
            <div class="version-item">
                <div class="version-info">
                    <h4>当前版本: ${platformData.version}</h4>
                    <p>文件数量: ${platformData.files.length} 个</p>
                    <p>最后更新: ${formatTime(platformData.lastUpdated || Date.now())}</p>
                </div>
                <div class="version-actions">
                    <button class="btn btn-secondary" data-action="downloadVersion" data-platform="${currentPlatform}">
                        <i class="fas fa-download"></i> 下载
                    </button>
                    <button class="btn btn-primary" data-action="showVersionDetail" data-platform="${currentPlatform}" data-version="${platformData.version}">
                        <i class="fas fa-info-circle"></i> 详细信息
                    </button>
                    <button class="btn btn-primary" data-action="editVersion" data-platform="${currentPlatform}">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                </div>
            </div>
        `;
        
        // 显示文件列表
        if (platformData.files.length > 0) {
            const filesList = platformData.files.map(file => `
                <div class="version-item">
                    <div class="version-info">
                        <h4>${file.name}</h4>
                        <p>大小: ${formatFileSize(file.size || 0)}</p>
                        <p>校验和: ${file.checksum ? file.checksum.substring(0, 16) + '...' : '未知'}</p>
                    </div>
                    <div class="version-actions">
                        <button class="btn btn-secondary" data-action="downloadFile" data-platform="${currentPlatform}" data-filename="${file.name}">
                            <i class="fas fa-download"></i> 下载
                        </button>
                        <button class="btn btn-primary" data-action="deleteFile" data-platform="${currentPlatform}" data-filename="${file.name}">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    </div>
                </div>
            `).join('');
            
            versionList.innerHTML += filesList;
        }
        
        hideLoading('versions');
    } catch (error) {
        console.error('加载版本数据失败:', error);
        showAlert('加载版本数据失败', 'error');
        hideLoading('versions');
    }
}

// 设置文件上传
function setupFileUpload() {
    const fileInput = document.getElementById('file-input');
    const uploadArea = document.getElementById('file-upload-area');
    
    // 拖拽上传
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            updateFileDisplay(files);
        }
    });
    
    // 文件选择
    fileInput.addEventListener('change', function(e) {
        updateFileDisplay(e.target.files);
    });
}

// 更新文件显示
function updateFileDisplay(files) {
    const uploadArea = document.getElementById('file-upload-area');
    const placeholder = uploadArea.querySelector('.upload-placeholder');
    
    if (files.length > 0) {
        const fileList = Array.from(files).map(file => 
            `<div style="margin: 5px 0; padding: 10px; background: #f8f9fa; border-radius: 4px;">
                <strong>${file.name}</strong> (${formatFileSize(file.size)})
            </div>`
        ).join('');
        
        placeholder.innerHTML = `
            <i class="fas fa-check-circle" style="color: #27ae60;"></i>
            <p>已选择 ${files.length} 个文件</p>
            ${fileList}
        `;
    }
}

// 处理文件上传
async function handleFileUpload(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const platform = document.getElementById('platform-select').value;
    const version = document.getElementById('version-input').value;
    const customUrl = document.getElementById('custom-url').value;
    const files = document.getElementById('file-input').files;
    
    if (files.length === 0) {
        showAlert('请选择要上传的文件', 'warning');
        return;
    }
    
    if (!version.trim()) {
        showAlert('请输入版本号', 'warning');
        return;
    }
    
    // 添加文件到表单数据
    for (let file of files) {
        formData.append('files', file);
    }
    formData.append('version', version);
    if (customUrl) {
        formData.append('customUrl', customUrl);
    }
    
    try {
        showUploadProgress(0);
        
        const xhr = new XMLHttpRequest();
        
        // 上传进度
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable) {
                const progress = Math.round((e.loaded / e.total) * 100);
                showUploadProgress(progress);
            }
        });
        
        // 上传完成
        xhr.addEventListener('load', function() {
            hideUploadProgress();
            
            if (xhr.status === 200) {
                showAlert('文件上传成功！', 'success');
                document.getElementById('upload-form').reset();
                resetFileDisplay();
                loadDashboardData();
                loadVersionData();
            } else {
                const error = JSON.parse(xhr.responseText);
                showAlert(`上传失败: ${error.error}`, 'error');
            }
        });
        
        // 上传错误
        xhr.addEventListener('error', function() {
            hideUploadProgress();
            showAlert('上传失败，请检查网络连接', 'error');
        });
        
        xhr.open('POST', `/api/upload/${platform}`);
        xhr.send(formData);
        
    } catch (error) {
        console.error('上传失败:', error);
        showAlert('上传失败', 'error');
        hideUploadProgress();
    }
}

// 显示上传进度
function showUploadProgress(progress) {
    const progressContainer = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    progressContainer.style.display = 'block';
    progressFill.style.width = progress + '%';
    progressText.textContent = `上传中... ${progress}%`;
}

// 隐藏上传进度
function hideUploadProgress() {
    document.getElementById('upload-progress').style.display = 'none';
}

// 重置文件显示
function resetFileDisplay() {
    const uploadArea = document.getElementById('file-upload-area');
    const placeholder = uploadArea.querySelector('.upload-placeholder');
    
    placeholder.innerHTML = `
        <i class="fas fa-cloud-upload-alt"></i>
        <p>点击选择文件或拖拽文件到此处</p>
        <small>支持 .exe, .dmg, .deb, .rpm, .tar.gz, .zip 格式</small>
    `;
}

// 加载配置
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        
        document.getElementById('server-port').value = config.PORT || 3000;
        document.getElementById('server-host').value = config.SERVER_HOST || 'localhost';
        document.getElementById('custom-download-url').value = config.CUSTOM_DOWNLOAD_URL || '';
        document.getElementById('max-file-size').value = config.MAX_FILE_SIZE || 500;
        document.getElementById('api-key').value = config.API_KEY || '';
        document.getElementById('log-level').value = config.LOG_LEVEL || 'info';
    } catch (error) {
        console.error('加载配置失败:', error);
        showAlert('加载配置失败', 'error');
    }
}

// 处理配置保存
async function handleConfigSave(e) {
    e.preventDefault();
    
    const config = {
        PORT: document.getElementById('server-port').value,
        SERVER_HOST: document.getElementById('server-host').value,
        CUSTOM_DOWNLOAD_URL: document.getElementById('custom-download-url').value,
        MAX_FILE_SIZE: document.getElementById('max-file-size').value,
        API_KEY: document.getElementById('api-key').value,
        LOG_LEVEL: document.getElementById('log-level').value
    };
    
    try {
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });
        
        if (response.ok) {
            showAlert('配置保存成功！', 'success');
        } else {
            const error = await response.json();
            showAlert(`保存失败: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        showAlert('保存配置失败', 'error');
    }
}

// 加载日志
async function loadLogs() {
    try {
        const response = await fetch('/api/logs');
        const logs = await response.text();
        
        document.getElementById('logs-content').textContent = logs || '暂无日志记录';
    } catch (error) {
        console.error('加载日志失败:', error);
        document.getElementById('logs-content').textContent = '加载日志失败';
    }
}

// 刷新数据
function refreshData() {
    const activeTab = document.querySelector('.tab-content.active').id;
    
    switch(activeTab) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'versions':
            loadVersionData();
            break;
        case 'logs':
            loadLogs();
            break;
        case 'config':
            loadConfig();
            break;
    }
    
    showAlert('数据已刷新', 'success');
}

// 刷新日志
function refreshLogs() {
    loadLogs();
}

// 清空日志
async function clearLogs() {
    if (!confirm('确定要清空所有日志吗？')) {
        return;
    }
    
    try {
        const response = await fetch('/api/logs', {
            method: 'DELETE'
        });
        
        if (response.ok) {
            document.getElementById('logs-content').textContent = '日志已清空';
            showAlert('日志已清空', 'success');
        } else {
            showAlert('清空日志失败', 'error');
        }
    } catch (error) {
        console.error('清空日志失败:', error);
        showAlert('清空日志失败', 'error');
    }
}

// 显示新版本模态框
function showNewVersionModal() {
    document.getElementById('new-version-modal').classList.add('show');
    document.getElementById('new-version-platform').value = currentPlatform;
}

// 关闭模态框
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        // 确保模态框完全隐藏
        setTimeout(() => {
            if (!modal.classList.contains('show')) {
                modal.style.display = 'none';
            }
        }, 300);
    }
}

// 带动画的模态框关闭
function closeModalWithAnimation(modalId) {
    const modal = document.getElementById(modalId);
    const modalContent = modal.querySelector('.modal-content');
    
    if (modalContent) {
        modalContent.style.animation = 'modalSlideOut 0.3s ease-in forwards';
    }
    modal.style.animation = 'modalFadeOut 0.3s ease-in forwards';
    
    setTimeout(() => {
        modal.classList.remove('show');
        modal.style.display = 'none';
        if (modalContent) {
            modalContent.style.animation = '';
        }
        modal.style.animation = '';
    }, 300);
}

// 处理新版本创建
async function handleNewVersion(e) {
    e.preventDefault();
    
    const version = document.getElementById('new-version-number').value;
    const platform = document.getElementById('new-version-platform').value;
    
    try {
        const response = await fetch('/api/versions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ version, platform })
        });
        
        if (response.ok) {
            showAlert('版本创建成功！', 'success');
            closeModal('new-version-modal');
            loadVersionData();
            loadDashboardData();
        } else {
            const error = await response.json();
            showAlert(`创建失败: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('创建版本失败:', error);
        showAlert('创建版本失败', 'error');
    }
}

// 创建新版本
function createNewVersion() {
    document.getElementById('new-version-form').dispatchEvent(new Event('submit'));
}

// 下载版本
function downloadVersion(platform) {
    window.open(`/api/download/${platform}`, '_blank');
}

// 下载文件
function downloadFile(platform, filename) {
    window.open(`/download/${platform}/${filename}`, '_blank');
}

// 编辑版本
function editVersion(platform) {
    // 这里可以实现版本编辑功能
    showAlert('版本编辑功能开发中...', 'info');
}

// 删除文件
async function deleteFile(platform, filename) {
    if (!confirm(`确定要删除文件 ${filename} 吗？`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/files/${platform}/${filename}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('文件删除成功！', 'success');
            loadVersionData();
            loadDashboardData();
        } else {
            const error = await response.json();
            showAlert(`删除失败: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('删除文件失败:', error);
        showAlert('删除文件失败', 'error');
    }
}

// 工具函数
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
}

function getActivityIcon(type) {
    const icons = {
        upload: 'fas fa-upload',
        download: 'fas fa-download',
        config: 'fas fa-cog',
        version: 'fas fa-tag',
        error: 'fas fa-exclamation-triangle'
    };
    return icons[type] || 'fas fa-info-circle';
}

function showLoading(section) {
    const element = document.getElementById(section);
    if (element) {
        element.classList.add('loading');
        const loadingSpinner = document.createElement('div');
        loadingSpinner.className = 'loading-spinner';
        loadingSpinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载中...';
        element.appendChild(loadingSpinner);
    }
}

function hideLoading(section) {
    const element = document.getElementById(section);
    if (element) {
        element.classList.remove('loading');
        const spinner = element.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }
}

// 显示页面加载状态
function showLoadingState() {
    const elements = document.querySelectorAll('.stat-card, .version-item, .config-section, .tab-content');
    elements.forEach(el => {
        el.classList.add('loading-shimmer');
        el.style.opacity = '0.7';
    });
}

// 隐藏页面加载状态
function hideLoadingState() {
    const elements = document.querySelectorAll('.stat-card, .version-item, .config-section, .tab-content');
    elements.forEach((el, index) => {
        setTimeout(() => {
            el.classList.remove('loading-shimmer');
            el.style.opacity = '1';
            el.style.animation = `fadeInUp 0.6s ease-out ${index * 0.1}s both`;
        }, index * 100);
    });
}

function showAlert(message, type = 'info') {
    // 创建提示框
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${getAlertIcon(type)}"></i>
        <span>${message}</span>
        <button class="alert-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // 添加到页面
    const container = document.querySelector('.main-content');
    container.insertBefore(alert, container.firstChild);
    
    // 添加进入动画
    setTimeout(() => {
        alert.style.animation = 'slideInDown 0.3s ease-out';
    }, 10);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (alert.parentNode) {
            alert.style.animation = 'slideOutUp 0.3s ease-in';
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.parentNode.removeChild(alert);
                }
            }, 300);
        }
    }, 3000);
}

// 显示通知
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getAlertIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    // 添加到通知容器
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    container.appendChild(notification);
    
    // 添加进入动画
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease-out';
    }, 10);
    
    // 自动移除
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

function getAlertIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// 初始化标签页
function initializeTabs() {
    // 默认显示当前版本
    showCurrentVersions();
}

// 显示当前版本
function showCurrentVersions() {
    const content = document.getElementById('version-content');
    content.innerHTML = `
        <div class="content-header">
            <h3><i class="fas fa-list"></i> 当前版本</h3>
            <p>查看各平台的当前版本信息</p>
        </div>
        
        <div class="platform-tabs">
            <button class="platform-tab active" data-platform="win32">
                <i class="fab fa-windows"></i> Windows
            </button>
            <button class="platform-tab" data-platform="darwin">
                <i class="fab fa-apple"></i> macOS
            </button>
            <button class="platform-tab" data-platform="linux">
                <i class="fab fa-linux"></i> Linux
            </button>
        </div>
        
        <div id="version-list" class="version-list">
            <!-- 版本列表将在这里动态加载 -->
        </div>
    `;
    
    // 重新绑定平台标签事件
    document.querySelectorAll('.platform-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.platform-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const platform = this.dataset.platform;
            switchPlatform(platform);
        });
    });
    
    loadVersionData();
}

// 显示版本历史
function showVersionHistory() {
    const content = document.getElementById('version-content');
    content.innerHTML = `
        <div class="content-header">
            <h3><i class="fas fa-history"></i> 版本历史</h3>
            <p>查看历史版本发布记录</p>
        </div>
        
        <div class="history-filters">
            <select id="history-platform-filter">
                <option value="all">所有平台</option>
                <option value="win32">Windows</option>
                <option value="darwin">macOS</option>
                <option value="linux">Linux</option>
            </select>
            <input type="date" id="history-date-filter" placeholder="选择日期">
            <button class="btn btn-secondary" id="loadVersionHistoryBtn">
                <i class="fas fa-search"></i> 查询
            </button>
        </div>
        
        <div id="version-history-list" class="history-list">
            <!-- 历史记录将在这里动态加载 -->
        </div>
    `;
    
    loadVersionHistory();
}

// 显示下载日志
function showDownloadLogs() {
    const content = document.getElementById('version-content');
    content.innerHTML = `
        <div class="content-header">
            <h3><i class="fas fa-download"></i> 下载日志</h3>
            <p>查看文件下载统计和日志</p>
        </div>
        
        <div class="log-filters">
            <select id="log-platform-filter">
                <option value="all">所有平台</option>
                <option value="win32">Windows</option>
                <option value="darwin">macOS</option>
                <option value="linux">Linux</option>
            </select>
            <input type="date" id="log-date-filter" placeholder="选择日期">
            <button class="btn btn-secondary" id="loadDownloadLogsBtn">
                <i class="fas fa-search"></i> 查询
            </button>
        </div>
        
        <div id="download-logs-list" class="logs-list">
            <!-- 下载日志将在这里动态加载 -->
        </div>
        
        <div class="log-actions">
            <button class="btn btn-secondary" id="exportDownloadLogsBtn">
                <i class="fas fa-file-export"></i> 导出
            </button>
        </div>
    `;
    
    loadDownloadLogs();
}

// 加载版本历史
async function loadVersionHistory() {
    try {
        const response = await fetch('/api/version-history');
        const history = await response.json();
        
        const historyList = document.getElementById('version-history-list');
        if (!historyList) return;
        
        if (history.length === 0) {
            historyList.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 40px;">暂无版本历史</p>';
            return;
        }
        
        historyList.innerHTML = history.map(item => `
            <div class="history-item">
                <div class="history-info">
                    <h4>版本 ${item.version}</h4>
                    <p>平台: ${item.platform}</p>
                    <p>发布时间: ${formatTime(item.releaseDate)}</p>
                    <p>文件数量: ${item.fileCount || 0} 个</p>
                </div>
                <div class="history-actions">
                    <button class="btn btn-secondary" data-action="rollbackVersion" data-platform="${item.platform}" data-version="${item.version}">
                        <i class="fas fa-undo"></i> 回滚
                    </button>
                    <button class="btn btn-danger" data-action="deleteVersionHistory" data-id="${item.id}">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载版本历史失败:', error);
        const historyList = document.getElementById('version-history-list');
        if (historyList) {
            historyList.innerHTML = '<p style="text-align: center; color: #e74c3c; padding: 40px;">加载版本历史失败</p>';
        }
    }
}

// 加载下载日志
async function loadDownloadLogs() {
    try {
        const response = await fetch('/api/download-logs');
        const logs = await response.json();
        
        const logsList = document.getElementById('download-logs-list');
        if (!logsList) return;
        
        if (logs.length === 0) {
            logsList.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 40px;">暂无下载记录</p>';
            return;
        }
        
        logsList.innerHTML = logs.map(log => `
            <div class="log-item">
                <div class="log-info">
                    <h4>${log.filename}</h4>
                    <p>版本: ${log.version}</p>
                    <p>平台: ${log.platform}</p>
                    <p>下载时间: ${formatTime(log.downloadTime)}</p>
                    <p>IP地址: ${log.ipAddress || '未知'}</p>
                </div>
                <div class="log-status">
                    <span class="status ${log.status}">${log.status === 'success' ? '成功' : '失败'}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载下载日志失败:', error);
        const logsList = document.getElementById('download-logs-list');
        if (logsList) {
            logsList.innerHTML = '<p style="text-align: center; color: #e74c3c; padding: 40px;">加载下载日志失败</p>';
        }
    }
}

// 版本发布向导
function openVersionWizard() {
    currentWizardStep = 1;
    wizardData = { files: [] };
    
    const modal = document.getElementById('versionWizardModal');
    if (modal) {
        // 确保模态框可以显示
        modal.style.display = 'flex';
        // 强制重绘
        modal.offsetHeight;
        modal.classList.add('show');
        updateWizardStep();
        setupWizardFileUpload();
    }
}

// 设置文件上传功能
function setupWizardFileUpload() {
    const uploadArea = document.getElementById('wizard-upload-area');
    const fileInput = document.getElementById('wizard-files');
    
    if (!uploadArea || !fileInput) return;
    
    // 点击上传区域选择文件
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // 文件选择事件
    fileInput.addEventListener('change', handleWizardFiles);
    
    // 拖拽事件
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        handleWizardFiles({ target: { files } });
    });
}

// 处理向导文件选择
function handleWizardFiles(event) {
    const files = Array.from(event.target.files);
    const fileList = document.getElementById('wizard-file-list');
    
    if (!fileList) return;
    
    wizardData.files = files;
    
    fileList.innerHTML = files.map((file, index) => `
        <div class="wizard-file-item">
            <div class="file-info">
                <i class="fas fa-file"></i>
                <div class="file-details">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${formatFileSize(file.size)}</div>
                </div>
            </div>
            <button type="button" class="btn btn-sm btn-danger" data-action="removeWizardFile" data-index="${index}">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

// 移除向导文件
function removeWizardFile(index) {
    if (wizardData.files) {
        wizardData.files.splice(index, 1);
        const fileList = document.getElementById('wizard-file-list');
        if (fileList) {
            handleWizardFiles({ target: { files: wizardData.files } });
        }
    }
}

function updateWizardStep() {
    // 隐藏所有步骤内容
    document.querySelectorAll('.wizard-step-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 显示当前步骤内容
    const currentStepContent = document.querySelector(`#wizard-step-${currentWizardStep} .wizard-step-content`);
    if (currentStepContent) {
        currentStepContent.classList.add('active');
    }
    
    // 同时更新步骤指示器
    document.querySelectorAll('.wizard-step').forEach(step => {
        step.classList.remove('active');
    });
    
    const currentStep = document.getElementById(`wizard-step-${currentWizardStep}`);
    if (currentStep) {
        currentStep.classList.add('active');
    }
    
    // 更新步骤指示器
    document.querySelectorAll('.wizard-steps .step').forEach((indicator, index) => {
        indicator.classList.remove('active', 'completed');
        if (index + 1 < currentWizardStep) {
            indicator.classList.add('completed');
        } else if (index + 1 === currentWizardStep) {
            indicator.classList.add('active');
        }
    });
    
    // 更新按钮状态
    const prevBtn = document.getElementById('wizardPrevBtn');
    const nextBtn = document.getElementById('wizardNextBtn');
    const finishBtn = document.getElementById('wizardFinishBtn');
    
    if (prevBtn) prevBtn.style.display = currentWizardStep === 1 ? 'none' : 'inline-block';
    if (nextBtn) nextBtn.style.display = currentWizardStep === 4 ? 'none' : 'inline-block';
    if (finishBtn) finishBtn.style.display = currentWizardStep === 4 ? 'inline-block' : 'none';
    
    // 如果是第4步，更新预览信息
    if (currentWizardStep === 4) {
        updateWizardPreview();
    }
}

function previousWizardStep() {
    if (currentWizardStep > 1) {
        currentWizardStep--;
        updateWizardStep();
    }
}

function nextWizardStep() {
    if (validateWizardStep()) {
        if (currentWizardStep < 4) {
            currentWizardStep++;
            updateWizardStep();
        }
    }
}

function validateWizardStep() {
    switch (currentWizardStep) {
        case 1:
            const version = document.getElementById('wizard-version').value;
            const platform = document.getElementById('wizard-platform').value;
            const description = document.getElementById('wizard-description').value;
            
            if (!version.trim()) {
                showAlert('请输入版本号', 'warning');
                return false;
            }
            
            // 验证版本号格式
            if (!/^\d+\.\d+\.\d+/.test(version)) {
                showAlert('版本号格式不正确，请使用语义化版本号（如：1.2.3）', 'warning');
                return false;
            }
            
            wizardData.version = version;
            wizardData.platform = platform;
            wizardData.description = description;
            return true;
            
        case 2:
            if (!wizardData.files || wizardData.files.length === 0) {
                showAlert('请选择要上传的文件', 'warning');
                return false;
            }
            return true;
            
        case 3:
            const customUrl = document.getElementById('wizard-custom-url').value;
            const autoUpdate = document.getElementById('wizard-auto-update').checked;
            const releaseNotes = document.getElementById('wizard-release-notes').value;
            
            wizardData.customUrl = customUrl;
            wizardData.autoUpdate = autoUpdate;
            wizardData.releaseNotes = releaseNotes;
            return true;
            
        default:
            return true;
    }
}

// 更新向导预览信息
function updateWizardPreview() {
    const summaryPlatform = document.getElementById('summary-platform');
    const summaryVersion = document.getElementById('summary-version');
    const summaryFiles = document.getElementById('summary-files');
    const summaryUrl = document.getElementById('summary-url');
    
    if (summaryPlatform) {
        const platformNames = {
            'win32': 'Windows',
            'darwin': 'macOS',
            'linux': 'Linux'
        };
        summaryPlatform.textContent = platformNames[wizardData.platform] || wizardData.platform;
    }
    
    if (summaryVersion) {
        summaryVersion.textContent = wizardData.version || '未设置';
    }
    
    if (summaryFiles) {
        const fileCount = wizardData.files ? wizardData.files.length : 0;
        summaryFiles.textContent = `${fileCount} 个文件`;
    }
    
    if (summaryUrl) {
        const baseUrl = wizardData.customUrl || window.location.origin;
        summaryUrl.textContent = `${baseUrl}/download/${wizardData.platform}/`;
    }
}

// 关闭模态框
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        // 延迟隐藏，确保动画完成
        setTimeout(() => {
            if (!modal.classList.contains('show')) {
                modal.style.display = 'none';
            }
        }, 300);
        
        // 重置向导状态
        if (modalId === 'versionWizardModal') {
            currentWizardStep = 1;
            wizardData = { files: [] };
            // 延迟更新步骤，避免在动画期间更新
            setTimeout(() => {
                if (!modal.classList.contains('show')) {
                    updateWizardStep();
                }
            }, 350);
        }
    }
}

// 显示上传进度
function showUploadProgress(progress) {
    const progressDiv = document.getElementById('wizard-progress');
    const progressFill = document.getElementById('wizard-progress-fill');
    const progressText = document.getElementById('wizard-progress-text');
    
    if (progressDiv) progressDiv.style.display = 'block';
    if (progressFill) progressFill.style.width = progress + '%';
    if (progressText) progressText.textContent = `上传进度: ${progress}%`;
}

// 隐藏上传进度
function hideUploadProgress() {
    const progressDiv = document.getElementById('wizard-progress');
    if (progressDiv) progressDiv.style.display = 'none';
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 完成版本发布
async function finishVersionRelease() {
    try {
        const formData = new FormData();
        formData.append('version', wizardData.version);
        formData.append('platform', wizardData.platform);
        formData.append('description', wizardData.description || '');
        formData.append('customUrl', wizardData.customUrl || '');
        formData.append('autoUpdate', wizardData.autoUpdate || false);
        formData.append('releaseNotes', wizardData.releaseNotes || '');
        
        for (let file of wizardData.files) {
            formData.append('files', file);
        }
        
        showUploadProgress(0);
        
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable) {
                const progress = Math.round((e.loaded / e.total) * 100);
                showUploadProgress(progress);
            }
        });
        
        xhr.addEventListener('load', function() {
            hideUploadProgress();
            
            if (xhr.status === 200) {
                showAlert('版本发布成功！', 'success');
                closeModal('versionWizardModal');
                loadDashboardData();
                loadVersionData();
                loadVersionHistory();
            } else {
                const error = JSON.parse(xhr.responseText);
                showAlert(`发布失败: ${error.error}`, 'error');
            }
        });
        
        xhr.addEventListener('error', function() {
            hideUploadProgress();
            showAlert('发布失败，请检查网络连接', 'error');
        });
        
        xhr.open('POST', `/api/upload/${wizardData.platform}`);
        xhr.send(formData);
        
    } catch (error) {
        console.error('版本发布失败:', error);
        showAlert('版本发布失败', 'error');
        hideUploadProgress();
    }
}

// 版本回滚
async function rollbackVersion(platform, version) {
    if (!confirm(`确定要回滚到版本 ${version} 吗？`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/rollback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ platform, version })
        });
        
        if (response.ok) {
            showAlert('版本回滚成功！', 'success');
            loadDashboardData();
            loadVersionData();
            loadVersionHistory();
        } else {
            const error = await response.json();
            showAlert(`回滚失败: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('版本回滚失败:', error);
        showAlert('版本回滚失败', 'error');
    }
}

// 删除版本历史
async function deleteVersionHistory(historyId) {
    if (!confirm('确定要删除这个版本历史记录吗？')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/version-history/${historyId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showAlert('版本历史删除成功！', 'success');
            loadVersionHistory();
        } else {
            const error = await response.json();
            showAlert(`删除失败: ${error.error}`, 'error');
        }
    } catch (error) {
        console.error('删除版本历史失败:', error);
        showAlert('删除版本历史失败', 'error');
    }
}

// 显示版本详细信息
function showVersionDetail(platform, version) {
    const versionData = currentVersions[platform];
    if (!versionData) {
        showAlert('版本数据不存在', 'error');
        return;
    }
    
    // 设置模态框内容
    const modal = document.getElementById('versionDetailModal');
    if (!modal) {
        showAlert('版本详情模态框不存在', 'error');
        return;
    }
    
    // 设置基本信息
    const titleElement = document.getElementById('detail-version-title');
    const platformElement = document.getElementById('detail-platform');
    const releaseDateElement = document.getElementById('detail-release-date');
    const fileCountElement = document.getElementById('detail-file-count');
    
    if (titleElement) titleElement.textContent = `版本 ${version}`;
    if (platformElement) platformElement.textContent = platform;
    if (releaseDateElement) releaseDateElement.textContent = formatTime(versionData.releaseDate || versionData.lastUpdated || Date.now());
    if (fileCountElement) fileCountElement.textContent = `${versionData.files ? versionData.files.length : 0} 个`;
    
    // 设置文件列表
    const filesListElement = document.getElementById('detail-files-list');
    if (filesListElement) {
        if (versionData.files && versionData.files.length > 0) {
            filesListElement.innerHTML = versionData.files.map(file => `
                <tr>
                    <td>${file.name}</td>
                    <td>${formatFileSize(file.size || 0)}</td>
                    <td title="${file.checksum || '未知'}">${(file.checksum || '未知').substring(0, 16)}...</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn btn-small btn-secondary" data-action="downloadFile" data-platform="${platform}" data-filename="${file.name}">
                                <i class="fas fa-download"></i> 下载
                            </button>
                            <button class="btn btn-small btn-info" data-action="copyChecksum" data-checksum="${file.checksum || ''}">
                                <i class="fas fa-copy"></i> 复制校验和
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            filesListElement.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #7f8c8d; padding: 20px;">暂无文件</td></tr>';
        }
    }
    
    // 显示模态框
    modal.style.display = 'block';
}

// 复制校验和到剪贴板
function copyChecksum(checksum) {
    if (!checksum || checksum === '未知') {
        showAlert('无效的校验和', 'warning');
        return;
    }
    
    navigator.clipboard.writeText(checksum).then(() => {
        showNotification('校验和已复制到剪贴板', 'success');
    }).catch(err => {
        console.error('复制失败:', err);
        showAlert('复制失败', 'error');
    });
}

// 键盘快捷键处理
// 移动端菜单切换
function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar && overlay) {
        sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('active');
    }
}

function closeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar && overlay) {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
    }
}

function handleKeyboardShortcuts(e) {
    // ESC 键关闭模态框或移动端菜单
    if (e.key === 'Escape') {
        // 优先关闭移动端菜单
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('mobile-open')) {
            closeMobileMenu();
            return;
        }
        
        // 然后关闭模态框
        const openModal = document.querySelector('.modal.show');
        if (openModal) {
            closeModal(openModal.id);
        }
    }
    
    // Ctrl+R 刷新数据
    if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        refreshAllData();
    }
    
    // Ctrl+U 打开上传页面
    if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        switchTab('upload');
    }
}

// 刷新所有数据
function refreshAllData() {
    showNotification('正在刷新数据...', 'info');
    showLoadingState();
    
    setTimeout(() => {
        loadDashboardData();
        loadVersionData();
        loadConfig();
        hideLoadingState();
        showNotification('数据刷新完成', 'success');
    }, 1000);
}

// 添加按钮点击效果
function addButtonClickEffect(button) {
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = 'scale(1)';
    }, 150);
}

// 为所有按钮添加点击效果
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn') || e.target.closest('.btn')) {
        const button = e.target.classList.contains('btn') ? e.target : e.target.closest('.btn');
        addButtonClickEffect(button);
    }
});

// 导出下载日志
function exportDownloadLogs() {
    showNotification('导出功能开发中...', 'info');
}

// 模态框点击外部关闭
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeModal(e.target.id);
    }
});

// 修复版本详情模态框关闭按钮
document.addEventListener('DOMContentLoaded', function() {
    const versionDetailModal = document.getElementById('versionDetailModal');
    if (versionDetailModal) {
        const closeBtn = versionDetailModal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                closeModal('versionDetailModal');
            });
        }
    }
});