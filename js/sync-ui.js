// js/sync-ui.js
/**
 * 同步状态UI组件 - 基于APP_CONFIG配置
 */

class SyncUI {
    constructor() {
        this.syncIndicator = null;
        this.isEnabled = APP_CONFIG.FEATURE_FLAGS.SHOW_SYNC_STATUS;
        this.initializationAttempted = false;
        
        if (this.isEnabled) {
            this.delayedInit();
        }
    }

    /**
     * 延迟初始化 - 等待依赖服务就绪
     */
    delayedInit() {
        if (this.initializationAttempted) return;
        this.initializationAttempted = true;

        const maxAttempts = 10;
        let attempts = 0;

        const tryInit = () => {
            attempts++;
            
            // 检查必要的依赖服务
            const dependenciesReady = window.dataService && window.syncService;
            
            if (dependenciesReady) {
                console.log('✅ 依赖服务就绪，初始化同步UI');
                this.init();
            } else if (attempts < maxAttempts) {
                console.log(`⏳ 等待依赖服务... (${attempts}/${maxAttempts})`);
                setTimeout(tryInit, 500);
            } else {
                console.warn('❌ 同步UI初始化失败：依赖服务未就绪');
                // 即使依赖不完整也尝试初始化
                this.safeInit();
            }
        };

        tryInit();
    }

    /**
     * 安全初始化 - 即使依赖不完整也尝试创建UI
     */
    safeInit() {
        try {
            console.log('🛡️ 尝试安全初始化同步UI');
            this.createSyncIndicator();
            
            // 设置定期检查，当依赖就绪后更新状态
            this.startDependencyCheck();
            
        } catch (error) {
            console.error('❌ 同步UI安全初始化失败:', error);
        }
    }

    /**
     * 启动依赖检查
     */
    startDependencyCheck() {
        const checkInterval = setInterval(() => {
            if (window.dataService && window.syncService) {
                console.log('✅ 依赖服务后来就绪，完成同步UI初始化');
                clearInterval(checkInterval);
                this.addEventListeners();
                this.updateSyncIndicator();
            }
        }, 1000);

        // 5秒后停止检查
        setTimeout(() => clearInterval(checkInterval), 5000);
    }

    /**
     * 初始化同步UI
     */
    init() {
        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createSyncIndicator());
        } else {
            this.createSyncIndicator();
        }

        // 监听配置变化
        window.addEventListener('configChanged', (event) => {
            if (event.detail.flag === 'SHOW_SYNC_STATUS') {
                this.handleConfigChange(event.detail.value);
            }
        });

        console.log('🔄 同步UI组件已初始化');
    }

    /**
     * 创建同步状态指示器
     */
    createSyncIndicator() {
        if (!this.isEnabled) return;

        // 创建指示器元素
        this.syncIndicator = document.createElement('div');
        this.syncIndicator.className = 'sync-indicator';
        this.syncIndicator.innerHTML = `
            <div class="sync-status">
                <span class="sync-icon">🔄</span>
                <span class="sync-text">同步中...</span>
                <span class="sync-time"></span>
                <span class="sync-queue"></span>
            </div>
            <div class="sync-tooltip"></div>
            <button class="sync-manual-btn" title="手动同步">↻</button>
        `;

        // 添加到页面 - 尝试不同的位置
        this.appendToHeader();

        // 添加事件监听
        this.addEventListeners();

        // 初始更新状态
        this.updateSyncIndicator(window.syncService?.getSyncStatus());

        console.log('📍 同步状态指示器已创建');
    }

    /**
     * 将指示器添加到页面头部
     */
    appendToHeader() {
        const header = document.querySelector('header');
        if (header) {
            // 添加到header右侧
            header.style.position = 'relative';
            this.syncIndicator.style.position = 'absolute';
            this.syncIndicator.style.right = '10px';
            this.syncIndicator.style.top = '50%';
            this.syncIndicator.style.transform = 'translateY(-50%)';
            header.appendChild(this.syncIndicator);
        } else {
            // 如果没有header，添加到body顶部
            this.syncIndicator.style.position = 'fixed';
            this.syncIndicator.style.top = '10px';
            this.syncIndicator.style.right = '10px';
            this.syncIndicator.style.zIndex = '1000';
            document.body.appendChild(this.syncIndicator);
        }
    }

    /**
     * 添加事件监听
     */
    addEventListeners() {
        // 手动同步按钮
        const manualBtn = this.syncIndicator.querySelector('.sync-manual-btn');
        if (manualBtn) {
            manualBtn.addEventListener('click', () => this.manualSync());
        }

        // 点击指示器显示详细信息
        this.syncIndicator.addEventListener('click', (e) => {
            if (!e.target.classList.contains('sync-manual-btn')) {
                this.showSyncDetails();
            }
        });

        // 监听网络状态变化
        window.addEventListener('online', () => this.handleNetworkChange(true));
        window.addEventListener('offline', () => this.handleNetworkChange(false));
    }

    /**
     * 更新同步状态指示器
     */
    updateSyncIndicator(status) {
        if (!this.syncIndicator || !this.isEnabled) return;

        const icon = this.syncIndicator.querySelector('.sync-icon');
        const text = this.syncIndicator.querySelector('.sync-text');
        const time = this.syncIndicator.querySelector('.sync-time');
        const queue = this.syncIndicator.querySelector('.sync-queue');
        const tooltip = this.syncIndicator.querySelector('.sync-tooltip');
        const manualBtn = this.syncIndicator.querySelector('.sync-manual-btn');

        if (!status) {
            status = window.syncService?.getSyncStatus() || {
                isEnabled: false,
                isOnline: navigator.onLine,
                isSyncing: false,
                queueLength: 0,
                lastSyncTime: null
            };
        }

        let statusText = '';
        let iconSymbol = '🔵';
        let tooltipText = '';
        let queueText = '';

        // 状态判断逻辑
        if (!status.isEnabled) {
            statusText = '同步已关闭';
            iconSymbol = '⚪';
            tooltipText = '同步功能未启用';
        } else if (!status.isOnline) {
            statusText = '离线模式';
            iconSymbol = '📵';
            tooltipText = '网络连接已断开，操作已进入队列';
        } else if (status.isSyncing) {
            statusText = '同步中...';
            iconSymbol = '🔄';
            tooltipText = `正在同步数据，请稍候`;
        } else if (status.queueLength > 0) {
            statusText = '待同步';
            iconSymbol = '⏳';
            tooltipText = `${status.queueLength} 个操作等待同步`;
        } else {
            statusText = '已同步';
            iconSymbol = '✅';
            tooltipText = status.lastSyncTime 
                ? `最后同步: ${new Date(status.lastSyncTime).toLocaleString()}`
                : '数据已同步';
        }

        // 队列数量显示
        if (status.queueLength > 0) {
            queueText = `(${status.queueLength})`;
        }

        // 更新时间显示
        let timeText = '';
        if (status.lastSyncTime) {
            const lastSync = new Date(status.lastSyncTime);
            const now = new Date();
            const diffMinutes = Math.floor((now - lastSync) / (1000 * 60));
            
            if (diffMinutes < 1) {
                timeText = '刚刚';
            } else if (diffMinutes < 60) {
                timeText = `${diffMinutes}分钟前`;
            } else {
                timeText = lastSync.toLocaleTimeString();
            }
        }

        // 更新DOM元素
        icon.textContent = iconSymbol;
        text.textContent = statusText;
        queue.textContent = queueText;
        time.textContent = timeText;
        tooltip.textContent = tooltipText;

        // 更新样式类
        this.syncIndicator.className = `sync-indicator ${
            !status.isEnabled ? 'disabled' : 
            !status.isOnline ? 'offline' : 
            status.isSyncing ? 'syncing' : 
            status.queueLength > 0 ? 'pending' : 
            'synced'
        }`;

        // 手动同步按钮状态
        if (manualBtn) {
            manualBtn.disabled = status.isSyncing || !status.isOnline || !status.isEnabled;
        }
    }

    /**
     * 手动同步
     */
    async manualSync() {
        if (!window.syncService || !window.syncService.isEnabled) {
            this.showToast('同步服务未启用', 'warning');
            return;
        }

        if (!navigator.onLine) {
            this.showToast('网络未连接，无法同步', 'warning');
            return;
        }

        try {
            this.showToast('开始手动同步...', 'info');
            await window.syncService.syncAllData();
        } catch (error) {
            console.error('手动同步失败:', error);
            this.showToast('同步失败', 'error');
        }
    }

    /**
     * 显示同步详情
     */
    showSyncDetails() {
        const status = window.syncService?.getSyncStatus();
        if (!status) return;

        const details = [
            `网络状态: ${status.isOnline ? '🟢 在线' : '🔴 离线'}`,
            `同步状态: ${status.isSyncing ? '🔄 同步中' : '🟢 就绪'}`,
            `待同步操作: ${status.queueLength} 个`,
            `失败操作: ${status.failedItems || 0} 个`,
            `最后同步: ${status.lastSyncTime ? new Date(status.lastSyncTime).toLocaleString() : '从未同步'}`
        ];

        this.showToast(details.join('<br>'), 'info', 5000);
    }

    /**
     * 处理网络状态变化
     */
    handleNetworkChange(isOnline) {
        if (!this.isEnabled) return;

        const message = isOnline ? '网络已恢复' : '网络已断开';
        const type = isOnline ? 'success' : 'warning';
        
        this.showToast(message, type);
        this.updateSyncIndicator();
    }

    /**
     * 处理配置变化
     */
    handleConfigChange(enabled) {
        this.isEnabled = enabled;
        
        if (enabled && !this.syncIndicator) {
            this.createSyncIndicator();
        } else if (!enabled && this.syncIndicator) {
            this.syncIndicator.remove();
            this.syncIndicator = null;
        }
    }

    /**
     * 显示Toast提示
     */
    showToast(message, type = 'info', duration = 3000) {
        // 使用系统中已存在的toast功能
        if (typeof showToast === 'function') {
            showToast(message, type, duration);
        } else {
            // 备用toast实现
            this.showFallbackToast(message, type, duration);
        }
    }

    /**
     * 备用Toast实现
     */
    showFallbackToast(message, type, duration) {
        const toast = document.createElement('div');
        toast.className = `sync-toast sync-toast-${type}`;
        toast.innerHTML = `
            <div class="sync-toast-content">
                <span class="sync-toast-message">${message}</span>
                <button class="sync-toast-close">&times;</button>
            </div>
        `;

        document.body.appendChild(toast);

        // 自动消失
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, duration);

        // 点击关闭
        toast.querySelector('.sync-toast-close').addEventListener('click', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }
}

// 初始化同步UI - 修改后的初始化逻辑
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔄 开始初始化同步UI...');
    
    const initSyncUI = () => {
        // 检查配置是否加载
        if (window.CONFIG_LOADED && window.APP_CONFIG) {
            // 创建实例（内部会延迟初始化）
            window.syncUI = new SyncUI();
            
            // 提供给其他模块使用的更新函数
            window.updateSyncIndicator = (status) => {
                if (window.syncUI) {
                    window.syncUI.updateSyncIndicator(status);
                }
            };
            
            console.log('✅ 同步UI组件加载完成（延迟初始化模式）');
        } else {
            // 3秒后重试
            setTimeout(initSyncUI, 500);
            console.log('⏳ 等待配置加载...');
        }
    };
    
    // 立即开始初始化
    initSyncUI();
});

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncUI;
}