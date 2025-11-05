// js/sync-service.js
/**
 * 数据同步服务 - 实现本地与云端数据同步
 * 支持离线操作、冲突解决和实时同步
 */

class SyncService {
    constructor() {
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.isSyncing = false;
        this.lastSyncTime = null;
        
        this.init();
    }

    /**
     * 初始化同步服务
     */
    init() {
        // 监听网络状态变化
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // 加载同步队列
        this.loadSyncQueue();
        
        // 启动定期同步
        this.startPeriodicSync();
        
        console.log('🔄 同步服务已初始化');
    }

    /**
     * 处理网络恢复
     */
    handleOnline() {
        this.isOnline = true;
        console.log('🌐 网络已连接，开始同步数据...');
        
        // 显示网络恢复提示
        this.showToast('网络已恢复，正在同步数据...', 'success');
        
        // 执行待处理的同步操作
        this.processSyncQueue();
    }

    /**
     * 处理网络断开
     */
    handleOffline() {
        this.isOnline = false;
        console.log('📵 网络已断开，进入离线模式');
        
        this.showToast('网络已断开，进入离线模式', 'warning');
    }

    /**
     * 启动定期同步
     */
    startPeriodicSync() {
        // 每5分钟同步一次
        setInterval(() => {
            if (this.isOnline && !this.isSyncing) {
                this.syncAllData();
            }
        }, 5 * 60 * 1000);
    }

    /**
     * 添加同步操作到队列
     */
    async addToSyncQueue(operation) {
        const syncItem = {
            id: this.generateId(),
            type: operation.type, // 'create', 'update', 'delete'
            table: operation.table,
            data: operation.data,
            timestamp: new Date().toISOString(),
            retryCount: 0
        };

        this.syncQueue.push(syncItem);
        await this.saveSyncQueue();

        // 如果在线，立即执行同步
        if (this.isOnline) {
            this.processSyncQueue();
        }
    }

    /**
     * 处理同步队列
     */
    async processSyncQueue() {
        if (this.isSyncing || this.syncQueue.length === 0) return;

        this.isSyncing = true;
        
        try {
            while (this.syncQueue.length > 0) {
                const syncItem = this.syncQueue[0];
                
                try {
                    await this.executeSyncOperation(syncItem);
                    
                    // 同步成功，从队列移除
                    this.syncQueue.shift();
                    await this.saveSyncQueue();
                    
                } catch (error) {
                    console.error(`同步操作失败:`, syncItem, error);
                    
                    // 重试逻辑
                    syncItem.retryCount++;
                    if (syncItem.retryCount >= 3) {
                        console.error(`同步操作重试次数超限，移至失败队列:`, syncItem);
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
     * 同步所有数据
     */
    async syncAllData() {
        if (!this.isOnline) {
            console.log('网络未连接，跳过全量同步');
            return;
        }

        try {
            this.showToast('正在同步数据...', 'info');
            
            // 同步任务数据
            await this.syncTasks();
            
            // 同步家庭数据
            await this.syncFamilyData();
            
            this.lastSyncTime = new Date();
            this.updateSyncStatus();
            
            this.showToast('数据同步完成', 'success');
            
        } catch (error) {
            console.error('全量同步失败:', error);
            this.showToast('同步失败，请检查网络连接', 'error');
        }
    }

    /**
     * 同步任务数据
     */
    async syncTasks() {
        const localTasks = window.dataService.getLocalTasks();
        const cloudTasks = await window.dataService.getTasks();

        // 冲突解决：以最新修改时间为准
        const mergedTasks = this.mergeData(localTasks, cloudTasks, 'tasks');
        
        // 更新到云端
        for (const task of mergedTasks) {
            if (task.id.startsWith('local-')) {
                // 本地新增的任务
                const newTask = { ...task };
                delete newTask.id;
                await window.dataService.createTask(newTask);
            } else {
                await window.dataService.updateTask(task.id, task);
            }
        }

        // 更新本地存储
        window.dataService.saveLocalTasks(mergedTasks);
    }

    /**
     * 同步家庭数据
     */
    async syncFamilyData() {
        // 家庭数据通常较小，直接使用云端版本
        const familyData = await window.dataService.getFamilyData();
        if (familyData) {
            window.dataService.saveLocalFamilyData(familyData);
        }
    }

    /**
     * 数据合并与冲突解决
     */
    mergeData(localData, cloudData, dataType) {
        const merged = [];
        const allIds = new Set([
            ...localData.map(item => item.id),
            ...cloudData.map(item => item.id)
        ]);

        for (const id of allIds) {
            const localItem = localData.find(item => item.id === id);
            const cloudItem = cloudData.find(item => item.id === id);

            if (!localItem) {
                // 只有云端有
                merged.push(cloudItem);
            } else if (!cloudItem) {
                // 只有本地有
                merged.push(localItem);
            } else {
                // 冲突解决：选择最新修改的版本
                const localTime = new Date(localItem.updated_at || localItem.created_at);
                const cloudTime = new Date(cloudItem.updated_at || cloudItem.created_at);
                
                if (localTime > cloudTime) {
                    merged.push(localItem);
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
        
        // 更新主页面状态指示器
        if (window.updateSyncIndicator) {
            window.updateSyncIndicator(status);
        }
        
        // 存储状态到 localStorage
        localStorage.setItem('syncStatus', JSON.stringify(status));
    }

    /**
     * 保存同步队列
     */
    async saveSyncQueue() {
        localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
    }

    /**
     * 加载同步队列
     */
    loadSyncQueue() {
        const queue = localStorage.getItem('syncQueue');
        this.syncQueue = queue ? JSON.parse(queue) : [];
    }

    /**
     * 移动到失败队列
     */
    moveToFailedQueue(syncItem) {
        const failedQueue = this.getFailedQueue();
        failedQueue.push(syncItem);
        localStorage.setItem('failedSyncQueue', JSON.stringify(failedQueue));
    }

    /**
     * 获取失败队列
     */
    getFailedQueue() {
        const failed = localStorage.getItem('failedSyncQueue');
        return failed ? JSON.parse(failed) : [];
    }

    /**
     * 显示Toast提示
     */
    showToast(message, type = 'info') {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    /**
     * 生成唯一ID
     */
    generateId() {
        return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// 创建全局同步服务实例
window.syncService = new SyncService();

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SyncService;
}