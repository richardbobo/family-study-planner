// js/sync-service.js
/**
 * 数据同步服务 - 基于APP_CONFIG配置
 */

class SyncService {
    constructor() {
        this.isOnline = navigator.onLine;
        this.isSyncing = false;
        this.syncQueue = [];
        this.lastSyncTime = null;
        this.retryCount = 0;

        // 从配置获取设置
        this.syncConfig = APP_CONFIG.SYNC_CONFIG;
        this.isEnabled = APP_CONFIG.FEATURE_FLAGS.ENABLE_SYNC;

        if (this.isEnabled) {
            this.init();
        }
    }

    /**
     * 初始化同步服务
     */
    init() {
        if (!this.isEnabled) {
            console.log('🔄 同步服务已禁用');
            return;
        }

        // 监听网络状态
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // 加载待同步队列
        this.loadSyncQueue();
        
        // 启动定期同步
        this.startPeriodicSync();
        
        console.log('🔄 同步服务已初始化', {
            interval: this.syncConfig.SYNC_INTERVAL,
            maxRetries: this.syncConfig.MAX_RETRY_ATTEMPTS
        });
    }

    /**
     * 处理网络恢复
     */
    handleOnline() {
        this.isOnline = true;
        console.log('🌐 网络已连接');
        
        if (typeof showToast === 'function') {
            showToast('网络已恢复，正在同步数据...', 'success');
        }
        
        // 处理待同步队列
        this.processSyncQueue();
    }

    /**
     * 处理网络断开
     */
    handleOffline() {
        this.isOnline = false;
        console.log('📵 网络已断开');
        
        if (typeof showToast === 'function') {
            showToast('网络已断开，进入离线模式', 'warning');
        }
    }

    /**
     * 启动定期同步
     */
    startPeriodicSync() {
        if (!this.syncConfig.AUTO_SYNC) return;

        setInterval(() => {
            if (this.isOnline && !this.isSyncing && this.syncQueue.length > 0) {
                this.processSyncQueue();
            }
        }, this.syncConfig.SYNC_INTERVAL);
    }

    /**
     * 添加操作到同步队列
     */
    async addToSyncQueue(operation) {
        if (!this.isEnabled) {
            console.log('同步服务已禁用，跳过队列操作');
            return;
        }

        const syncItem = {
            id: this.generateId(),
            type: operation.type, // 'create' | 'update' | 'delete'
            table: operation.table,
            data: operation.data,
            timestamp: new Date().toISOString(),
            retryCount: 0
        };

        // 检查队列大小限制
        if (this.syncQueue.length >= this.syncConfig.QUEUE_SIZE_LIMIT) {
            console.warn('同步队列已满，移除最旧的操作');
            this.syncQueue.shift();
        }

        this.syncQueue.push(syncItem);
        await this.saveSyncQueue();

        console.log(`📝 添加到同步队列: ${operation.type} ${operation.table}`, syncItem);

        // 如果在线，立即尝试同步
        if (this.isOnline) {
            this.processSyncQueue();
        }
    }

    /**
     * 处理同步队列
     */
    async processSyncQueue() {
        if (!this.isEnabled || this.isSyncing || this.syncQueue.length === 0 || !this.isOnline) {
            return;
        }

        this.isSyncing = true;
        console.log(`🔄 开始处理同步队列，剩余 ${this.syncQueue.length} 个操作`);

        try {
            while (this.syncQueue.length > 0) {
                const syncItem = this.syncQueue[0];
                
                try {
                    await this.executeSyncOperation(syncItem);
                    
                    // 同步成功，从队列移除
                    this.syncQueue.shift();
                    await this.saveSyncQueue();
                    
                    console.log(`✅ 同步成功: ${syncItem.type} ${syncItem.table}`);
                    
                } catch (error) {
                    console.error(`❌ 同步操作失败:`, syncItem, error);
                    
                    // 重试逻辑
                    syncItem.retryCount++;
                    if (syncItem.retryCount >= this.syncConfig.MAX_RETRY_ATTEMPTS) {
                        console.error(`🔄 重试次数超限，移至失败队列:`, syncItem);
                        this.moveToFailedQueue(syncItem);
                        this.syncQueue.shift();
                    }
                    
                    await this.saveSyncQueue();
                    break; // 遇到错误暂停处理
                }
            }
            
            this.lastSyncTime = new Date();
            this.updateSyncStatus();
            
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * 执行同步操作
     */
    async executeSyncOperation(syncItem) {
        const { type, table, data } = syncItem;

        // 使用统一的数据服务
        switch (type) {
            case 'create':
                return await window.dataService.createItem(table, data);
            case 'update':
                return await window.dataService.updateItem(table, data.id, data);
            case 'delete':
                return await window.dataService.deleteItem(table, data.id);
            default:
                throw new Error(`未知的同步操作类型: ${type}`);
        }
    }

    /**
     * 手动触发全量同步
     */
    async syncAllData() {
        if (!this.isEnabled) {
            console.log('同步服务已禁用');
            return;
        }

        if (!this.isOnline) {
            console.log('网络未连接，跳过全量同步');
            if (typeof showToast === 'function') {
                showToast('网络未连接，无法同步', 'warning');
            }
            return;
        }

        try {
            console.log('🔄 开始全量数据同步');
            
            if (typeof showToast === 'function') {
                showToast('正在同步数据...', 'info');
            }

            // 同步任务数据
            await this.syncTasks();
            
            // 同步家庭数据（如果启用）
            if (APP_CONFIG.FEATURE_FLAGS.ENABLE_FAMILY_FEATURES) {
                await this.syncFamilyData();
            }

            this.lastSyncTime = new Date();
            this.updateSyncStatus();
            
            console.log('✅ 全量数据同步完成');
            
            if (typeof showToast === 'function') {
                showToast('数据同步完成', 'success');
            }
            
        } catch (error) {
            console.error('❌ 全量同步失败:', error);
            if (typeof showToast === 'function') {
                showToast('同步失败，请检查网络连接', 'error');
            }
        }
    }

    /**
     * 同步任务数据
     */
    async syncTasks() {
        try {
            const localTasks = window.dataService.getLocalTasks();
            const cloudTasks = await window.dataService.getTasks();

            // 简单的合并策略 - 在实际应用中可能需要更复杂的冲突解决
            const mergedTasks = this.mergeTasks(localTasks, cloudTasks);
            
            // 更新到云端
            for (const task of mergedTasks) {
                if (task.id && task.id.startsWith('local-')) {
                    // 本地新增的任务
                    const newTask = { ...task };
                    delete newTask.id;
                    await window.dataService.createTask(newTask);
                } else if (task._isDirty) {
                    // 标记为脏数据的任务
                    await window.dataService.updateTask(task.id, task);
                }
            }

            // 更新本地存储
            window.dataService.saveLocalTasks(mergedTasks);
            
        } catch (error) {
            console.error('任务数据同步失败:', error);
            throw error;
        }
    }

    /**
     * 同步家庭数据
     */
    async syncFamilyData() {
        try {
            const familyData = await window.dataService.getFamilyData();
            if (familyData) {
                window.dataService.saveLocalFamilyData(familyData);
            }
        } catch (error) {
            console.error('家庭数据同步失败:', error);
            // 家庭数据同步失败不影响主要功能
        }
    }

    /**
     * 合并任务数据（简化版冲突解决）
     */
    mergeTasks(localTasks, cloudTasks) {
        const merged = [];
        const allIds = new Set([
            ...localTasks.map(item => item.id),
            ...cloudTasks.map(item => item.id)
        ]);

        for (const id of allIds) {
            const localItem = localTasks.find(item => item.id === id);
            const cloudItem = cloudTasks.find(item => item.id === id);

            if (!localItem) {
                // 只有云端有
                merged.push(cloudItem);
            } else if (!cloudItem) {
                // 只有本地有
                merged.push({ ...localItem, _isDirty: true });
            } else {
                // 冲突解决：选择最新修改的版本
                const localTime = new Date(localItem.updated_at || localItem.created_at);
                const cloudTime = new Date(cloudItem.updated_at || cloudItem.created_at);
                
                if (localTime > cloudTime) {
                    merged.push({ ...localItem, _isDirty: true });
                } else {
                    merged.push(cloudItem);
                }
            }
        }

        return merged;
    }

    /**
     * 获取同步状态
     */
    getSyncStatus() {
        return {
            isEnabled: this.isEnabled,
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            queueLength: this.syncQueue.length,
            lastSyncTime: this.lastSyncTime,
            failedItems: this.getFailedQueue().length
        };
    }

    /**
     * 更新同步状态显示
     */
    updateSyncStatus() {
        const status = this.getSyncStatus();
        
        // 更新UI状态指示器
        if (window.updateSyncIndicator) {
            window.updateSyncIndicator(status);
        }
        
        // 存储状态
        localStorage.setItem(APP_CONFIG.CONSTANTS.STORAGE_KEYS.SYNC_STATUS, JSON.stringify(status));
        localStorage.setItem(APP_CONFIG.CONSTANTS.STORAGE_KEYS.LAST_SYNC, this.lastSyncTime.toISOString());
    }

    /**
     * 保存同步队列到本地存储
     */
    async saveSyncQueue() {
        localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
    }

    /**
     * 从本地存储加载同步队列
     */
    loadSyncQueue() {
        try {
            const queue = localStorage.getItem('syncQueue');
            this.syncQueue = queue ? JSON.parse(queue) : [];
            console.log(`📋 加载同步队列: ${this.syncQueue.length} 个待处理操作`);
        } catch (error) {
            console.error('加载同步队列失败:', error);
            this.syncQueue = [];
        }
    }

    /**
     * 移动到失败队列
     */
    moveToFailedQueue(syncItem) {
        try {
            const failedQueue = this.getFailedQueue();
            failedQueue.push({
                ...syncItem,
                failedAt: new Date().toISOString()
            });
            localStorage.setItem('failedSyncQueue', JSON.stringify(failedQueue));
        } catch (error) {
            console.error('移动到失败队列失败:', error);
        }
    }

    /**
     * 获取失败队列
     */
    getFailedQueue() {
        try {
            const failed = localStorage.getItem('failedSyncQueue');
            return failed ? JSON.parse(failed) : [];
        } catch (error) {
            console.error('获取失败队列失败:', error);
            return [];
        }
    }

    /**
     * 生成唯一ID
     */
    generateId() {
        return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 启用/禁用同步服务
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (enabled && !this.initialized) {
            this.init();
        }
    }
}

// 创建全局同步服务实例
window.syncService = new SyncService();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncService;
}