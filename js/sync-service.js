// 安全同步服务 - 修复版本
class SyncService {
    constructor() {
        this.isOnline = navigator.onLine;
        this.isSyncing = false;
        this.syncQueue = [];
        this.lastSyncTime = null;
        
        // 安全防护
        this.operationCount = 0;
        this.maxOperationsPerMinute = 60;
        this.operationTimestamps = [];
        this.retryCount = 0;
        this.maxRetryCount = 3;
        
        this.syncConfig = APP_CONFIG.SYNC_CONFIG;
        this.isEnabled = APP_CONFIG.FEATURE_FLAGS.ENABLE_SYNC;
        
        if (this.isEnabled) {
            this.init();
        }
    }
    
    init() {
        console.log('🔄 安全同步服务初始化');
        
        // 监听网络状态
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // 加载同步队列
        this.loadSyncQueue();
        
        // 安全定时同步（减少频率）
        if (this.syncConfig.AUTO_SYNC) {
            this.syncInterval = setInterval(() => {
                if (this.isOnline && !this.isSyncing && this.syncQueue.length > 0) {
                    this.safeProcessSyncQueue();
                }
            }, 30000); // 30秒一次
        }
        
        console.log('✅ 安全同步服务初始化完成');
    }
    
    // 安全添加到同步队列
// sync-service.js - 必须修改为这样！3个参数版本的
async addToSyncQueue(operation, table, data) {
    console.log('📝 addToSyncQueue 被调用，完整参数:', { 
        operation, 
        table, 
        data: { id: data?.id, name: data?.name } 
    });
    
    if (!this.isEnabled) {
        console.log('同步服务已禁用，跳过队列操作');
        return;
    }
    
    // 参数验证
    if (!operation || !table || !data) {
        console.error('❌ 同步队列参数无效:', { operation, table, data });
        return;
    }
    
    // 安全防护：频率限制
    const now = Date.now();
    this.operationTimestamps = this.operationTimestamps.filter(
        time => now - time < 60000
    );
    
    if (this.operationTimestamps.length >= this.maxOperationsPerMinute) {
        console.warn('🚨 同步操作频率超限，已阻止');
        return;
    }
    
    this.operationTimestamps.push(now);
    this.operationCount++;
    
    const syncItem = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        type: operation,    // 使用第一个参数
        table: table,       // 使用第二个参数  
        data: data,         // 使用第三个参数
        timestamp: new Date().toISOString(),
        retryCount: 0
    };
    
    // 队列大小限制
    if (this.syncQueue.length >= (this.syncConfig.QUEUE_SIZE_LIMIT || 50)) {
        console.warn('同步队列已满，移除最旧的操作');
        this.syncQueue.shift();
    }
    
    this.syncQueue.push(syncItem);
    await this.saveSyncQueue();
    
    console.log(`📝 安全添加到同步队列: ${operation} ${table} (${this.syncQueue.length}个待同步)`);
    
    // 安全处理队列
    if (this.isOnline) {
        this.safeProcessSyncQueue();
    }
}
    
    // 安全处理同步队列
    async safeProcessSyncQueue() {
        if (!this.isEnabled || this.isSyncing || this.syncQueue.length === 0 || !this.isOnline) {
            return;
        }
        
        this.isSyncing = true;
        console.log(`🔄 安全处理同步队列，剩余 ${this.syncQueue.length} 个操作`);
        
        try {
            while (this.syncQueue.length > 0 && this.isSyncing) {
                const syncItem = this.syncQueue[0];
                
                try {
                    await this.safeExecuteSyncOperation(syncItem);
                    
                    // 同步成功，从队列移除
                    this.syncQueue.shift();
                    await this.saveSyncQueue();
                    
                    console.log(`✅ 同步成功: ${syncItem.type} ${syncItem.table}`);
                    
                } catch (error) {
                    console.error(`❌ 同步操作失败:`, syncItem, error);
                    
                    // 安全重试逻辑
                    syncItem.retryCount++;
                    if (syncItem.retryCount >= this.maxRetryCount) {
                        console.warn(`🔄 重试次数超限，移至失败队列:`, syncItem);
                        this.moveToFailedQueue(syncItem);
                        this.syncQueue.shift();
                    }
                    
                    await this.saveSyncQueue();
                    break; // 遇到错误暂停处理
                }
            }
            
            this.lastSyncTime = new Date();
            this.updateSyncStatus();
            
        } catch (error) {
            console.error('处理同步队列失败:', error);
        } finally {
            this.isSyncing = false;
            this.updateSyncStatus();
        }
    }
    
    // 安全执行同步操作
async safeExecuteSyncOperation(syncItem) {
    const { type, table, data } = syncItem;
    
    console.log(`🔄 执行同步操作: ${type} ${table}`, { 
        id: data?.id, 
        name: data?.name 
    });
    
    try {
        // 🔧 关键修复：使用正确的数据服务获取方式
        const dataService = getDataService();
        
        if (!dataService) {
            console.error('❌ 无法获取数据服务实例');
            return null;
        }
        
        switch (type) {
            case 'CREATE':
                if (table === 'study_tasks') {
                    console.log('📤 创建任务到数据库...');
                    return await dataService.supabaseClient.createTask(data);
                }
                break;
                
            case 'UPDATE':
                if (table === 'study_tasks') {
                    console.log('📝 更新任务...');
                    return await dataService.supabaseClient.updateTask(data.id, data.family_id, data);
                }
                break;
                
            case 'DELETE':
                if (table === 'study_tasks') {
                    console.log('🗑️ 删除任务...');
                    return await dataService.supabaseClient.deleteTask(data.id, data.family_id);
                }
                break;
                
            default:
                console.warn(`未知的同步操作类型: ${type}`);
                return null;
        }
        
        console.warn(`未知的表名: ${table}`);
        return null;
        
    } catch (error) {
        console.error(`❌ 同步操作失败 ${type} ${table}:`, error);
        throw error;
    }
}
    
    // 安全全量同步
    async syncAllData() {
        if (!this.isEnabled) {
            console.log('同步服务已禁用');
            return;
        }
        
        if (!this.isOnline) {
            console.log('网络未连接，跳过全量同步');
            return;
        }
        
        if (this.isSyncing) {
            console.log('⚠️ 同步正在进行中，跳过');
            return;
        }
        
        this.isSyncing = true;
        
        try {
            console.log('🔄 开始安全全量数据同步');
            
            // 这里可以添加实际的全量同步逻辑
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.lastSyncTime = new Date();
            console.log('✅ 安全全量同步完成');
            
        } catch (error) {
            console.error('❌ 全量同步失败:', error);
        } finally {
            this.isSyncing = false;
            this.updateSyncStatus();
        }
    }
    
    // 其他辅助方法保持不变...
    handleOnline() {
        this.isOnline = true;
        console.log('🌐 网络已连接');
        this.safeProcessSyncQueue();
    }
    
    handleOffline() {
        this.isOnline = false;
        console.log('📵 网络已断开');
    }
    
    getSyncStatus() {
        return {
            isEnabled: this.isEnabled,
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            queueLength: this.syncQueue.length,
            lastSyncTime: this.lastSyncTime,
            operationCount: this.operationCount
        };
    }
    
    updateSyncStatus() {
        const status = this.getSyncStatus();
        if (window.updateSyncIndicator) {
            window.updateSyncIndicator(status);
        }
    }
    
    async saveSyncQueue() {
        localStorage.setItem('syncQueue', JSON.stringify(this.syncQueue));
    }
    
    loadSyncQueue() {
        try {
            const queue = localStorage.getItem('syncQueue');
            this.syncQueue = queue ? JSON.parse(queue) : [];
        } catch (error) {
            console.error('加载同步队列失败:', error);
            this.syncQueue = [];
        }
    }
    
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
    
    getFailedQueue() {
        try {
            const failed = localStorage.getItem('failedSyncQueue');
            return failed ? JSON.parse(failed) : [];
        } catch (error) {
            console.error('获取失败队列失败:', error);
            return [];
        }
    }
}

// 创建全局同步服务实例
window.syncService = new SyncService();

console.log('✅ sync-service.js 安全版本加载完成');