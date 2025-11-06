// sync-service-disabled.js - 禁用同步
class DisabledSyncService {
    constructor() {
        this.isEnabled = false;
        this.isSyncing = false;
        this.syncQueue = [];
        console.log('🚫 同步服务已被禁用');
    }
    
    addToSyncQueue() {
        console.log('🚫 同步队列操作已被禁用');
        return Promise.resolve();
    }
    
    syncAllData() {
        console.log('🚫 同步操作已被禁用');
        return Promise.resolve();
    }
    
    getSyncStatus() {
        return {
            isEnabled: false,
            isOnline: navigator.onLine,
            isSyncing: false,
            queueLength: 0,
            lastSyncTime: null
        };
    }
}

// 禁用同步服务
window.syncService = new DisabledSyncService();
console.log('✅ 同步服务已被禁用');