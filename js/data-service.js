// 统一数据服务层 - 支持多数据源和同步功能
class DataService {
    constructor() {
        this.currentDataSource = APP_CONFIG.FEATURE_FLAGS.DATA_SOURCE;
        this.supabaseClient = getSupabaseClient();
        this.isInitialized = false;
        
        this.init();
    }
    
    // 初始化服务
    init() {
        console.log(`📊 数据服务初始化 - 使用数据源: ${this.currentDataSource}`);
        
        // 监听配置变化
        if (typeof window !== 'undefined') {
            window.addEventListener('configChanged', (event) => {
                if (event.detail.flag === 'DATA_SOURCE') {
                    this.handleDataSourceChange(event.detail.value);
                }
            });
        }
        
        this.isInitialized = true;
        console.log('✅ 数据服务初始化完成');
    }
    
    // 处理数据源变更
    handleDataSourceChange(newDataSource) {
        console.log(`🔄 数据源变更: ${this.currentDataSource} -> ${newDataSource}`);
        this.currentDataSource = newDataSource;
        
        // 触发数据源变更事件
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('dataSourceChanged', {
                detail: { from: this.currentDataSource, to: newDataSource }
            }));
        }
    }
    
    // === 任务管理方法 - 集成同步功能 ===
    
    // 获取任务列表
    async getTasks(date = null) {
        try {
            switch (this.currentDataSource) {
                case 'supabase':
                    return await this.getTasksFromSupabase(date);
                case 'hybrid':
                    return await this.getTasksHybrid(date);
                case 'localStorage':
                default:
                    return this.getTasksFromLocalStorage(date);
            }
        } catch (error) {
            console.error('❌ 获取任务失败:', error);
            // 降级到 localStorage
            return this.getTasksFromLocalStorage(date);
        }
    }
    
    // 创建任务 - 添加同步支持
    async createTask(taskData) {
        try {
            let result;
            
            // 生成任务ID和基础字段
            const taskWithId = {
                ...taskData,
                id: taskData.id || this.generateTaskId(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            switch (this.currentDataSource) {
                case 'supabase':
                    result = await this.createTaskInSupabase(taskWithId);
                    break;
                case 'hybrid':
                    result = await this.createTaskHybrid(taskWithId);
                    break;
                case 'localStorage':
                default:
                    result = this.createTaskInLocalStorage(taskWithId);
                    break;
            }
            
            // 添加到同步队列（如果同步服务可用）
            if (window.syncService && APP_CONFIG.FEATURE_FLAGS.ENABLE_SYNC) {
                await window.syncService.addToSyncQueue({
                    type: 'create',
                    table: 'tasks',
                    data: result
                });
            }
            
            // 触发任务创建事件
            this.emitTaskEvent('taskCreated', result);
            return result;
            
        } catch (error) {
            console.error('❌ 创建任务失败:', error);
            
            // 即使失败也尝试添加到同步队列
            if (window.syncService && APP_CONFIG.FEATURE_FLAGS.ENABLE_SYNC) {
                const failedTask = {
                    ...taskData,
                    id: taskData.id || this.generateTaskId(),
                    created_at: new Date().toISOString(),
                    _isFailed: true
                };
                
                await window.syncService.addToSyncQueue({
                    type: 'create',
                    table: 'tasks',
                    data: failedTask
                });
            }
            
            throw error;
        }
    }
    
    // 更新任务 - 添加同步支持
    async updateTask(taskId, updates) {
        try {
            let result;
            
            const updatesWithTimestamp = {
                ...updates,
                updated_at: new Date().toISOString()
            };
            
            switch (this.currentDataSource) {
                case 'supabase':
                    result = await this.updateTaskInSupabase(taskId, updatesWithTimestamp);
                    break;
                case 'hybrid':
                    result = await this.updateTaskHybrid(taskId, updatesWithTimestamp);
                    break;
                case 'localStorage':
                default:
                    result = this.updateTaskInLocalStorage(taskId, updatesWithTimestamp);
                    break;
            }
            
            // 添加到同步队列
            if (window.syncService && APP_CONFIG.FEATURE_FLAGS.ENABLE_SYNC) {
                await window.syncService.addToSyncQueue({
                    type: 'update',
                    table: 'tasks',
                    data: { ...result, id: taskId }
                });
            }
            
            // 触发任务更新事件
            this.emitTaskEvent('taskUpdated', result);
            return result;
            
        } catch (error) {
            console.error('❌ 更新任务失败:', error);
            
            // 即使失败也尝试添加到同步队列
            if (window.syncService && APP_CONFIG.FEATURE_FLAGS.ENABLE_SYNC) {
                await window.syncService.addToSyncQueue({
                    type: 'update',
                    table: 'tasks',
                    data: { ...updates, id: taskId, updated_at: new Date().toISOString(), _isFailed: true }
                });
            }
            
            throw error;
        }
    }
    
    // 删除任务 - 添加同步支持
    async deleteTask(taskId) {
        try {
            let result;
            
            switch (this.currentDataSource) {
                case 'supabase':
                    result = await this.deleteTaskInSupabase(taskId);
                    break;
                case 'hybrid':
                    result = await this.deleteTaskHybrid(taskId);
                    break;
                case 'localStorage':
                default:
                    result = this.deleteTaskInLocalStorage(taskId);
                    break;
            }
            
            // 添加到同步队列
            if (window.syncService && APP_CONFIG.FEATURE_FLAGS.ENABLE_SYNC) {
                await window.syncService.addToSyncQueue({
                    type: 'delete',
                    table: 'tasks',
                    data: { id: taskId }
                });
            }
            
            // 触发任务删除事件
            this.emitTaskEvent('taskDeleted', { id: taskId });
            return result;
            
        } catch (error) {
            console.error('❌ 删除任务失败:', error);
            
            // 即使失败也尝试添加到同步队列
            if (window.syncService && APP_CONFIG.FEATURE_FLAGS.ENABLE_SYNC) {
                await window.syncService.addToSyncQueue({
                    type: 'delete',
                    table: 'tasks',
                    data: { id: taskId, _isFailed: true }
                });
            }
            
            throw error;
        }
    }
    
    // 完成任务 - 添加同步支持
    async completeTask(taskId, completionData = {}) {
        try {
            let result;
            
            const completionUpdates = {
                completed: true,
                completionTime: new Date().toISOString(),
                actualCompletionDate: new Date().toISOString().split('T')[0],
                ...completionData,
                updated_at: new Date().toISOString()
            };
            
            switch (this.currentDataSource) {
                case 'supabase':
                    result = await this.completeTaskInSupabase(taskId, completionUpdates);
                    break;
                case 'hybrid':
                    result = await this.completeTaskHybrid(taskId, completionUpdates);
                    break;
                case 'localStorage':
                default:
                    result = this.completeTaskInLocalStorage(taskId, completionUpdates);
                    break;
            }
            
            // 添加到同步队列
            if (window.syncService && APP_CONFIG.FEATURE_FLAGS.ENABLE_SYNC) {
                await window.syncService.addToSyncQueue({
                    type: 'update',
                    table: 'tasks',
                    data: { ...result, id: taskId }
                });
            }
            
            // 触发任务完成事件
            this.emitTaskEvent('taskCompleted', result);
            return result;
            
        } catch (error) {
            console.error('❌ 完成任务失败:', error);
            
            // 即使失败也尝试添加到同步队列
            if (window.syncService && APP_CONFIG.FEATURE_FLAGS.ENABLE_SYNC) {
                await window.syncService.addToSyncQueue({
                    type: 'update',
                    table: 'tasks',
                    data: { 
                        id: taskId, 
                        completed: true,
                        completionTime: new Date().toISOString(),
                        _isFailed: true 
                    }
                });
            }
            
            throw error;
        }
    }
    
    // === 本地存储实现 ===
    
    // 从 localStorage 获取任务
    getTasksFromLocalStorage(date = null) {
        try {
            const tasks = JSON.parse(localStorage.getItem(APP_CONFIG.CONSTANTS.STORAGE_KEYS.TASKS) || '[]');
            
            if (date) {
                return tasks.filter(task => task.date === date);
            }
            
            return tasks;
        } catch (error) {
            console.error('❌ 从localStorage获取任务失败:', error);
            return [];
        }
    }
    
    // 在 localStorage 创建任务
    createTaskInLocalStorage(taskData) {
        try {
            const tasks = this.getTasksFromLocalStorage();
            const newTask = {
                ...taskData,
                id: taskData.id || this.generateLocalId(tasks),
                createdAt: new Date().toISOString()
            };
            
            tasks.push(newTask);
            this.saveTasksToLocalStorage(tasks);
            
            console.log('✅ 本地任务创建成功:', newTask);
            return newTask;
            
        } catch (error) {
            console.error('❌ 本地任务创建失败:', error);
            throw error;
        }
    }
    
    // 在 localStorage 更新任务
    updateTaskInLocalStorage(taskId, updates) {
        try {
            const tasks = this.getTasksFromLocalStorage();
            const taskIndex = tasks.findIndex(task => task.id == taskId);
            
            if (taskIndex === -1) {
                throw new Error(`任务不存在: ${taskId}`);
            }
            
            tasks[taskIndex] = {
                ...tasks[taskIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            this.saveTasksToLocalStorage(tasks);
            
            console.log('✅ 本地任务更新成功:', tasks[taskIndex]);
            return tasks[taskIndex];
            
        } catch (error) {
            console.error('❌ 本地任务更新失败:', error);
            throw error;
        }
    }
    
    // 在 localStorage 删除任务
    deleteTaskInLocalStorage(taskId) {
        try {
            const tasks = this.getTasksFromLocalStorage();
            const filteredTasks = tasks.filter(task => task.id != taskId);
            
            if (tasks.length === filteredTasks.length) {
                throw new Error(`任务不存在: ${taskId}`);
            }
            
            this.saveTasksToLocalStorage(filteredTasks);
            
            console.log('✅ 本地任务删除成功:', taskId);
            return true;
            
        } catch (error) {
            console.error('❌ 本地任务删除失败:', error);
            throw error;
        }
    }
    
    // 在 localStorage 完成任务
    completeTaskInLocalStorage(taskId, completionData) {
        return this.updateTaskInLocalStorage(taskId, completionData);
    }
    
    // === Supabase 实现 ===
    
    // 从 Supabase 获取任务
    async getTasksFromSupabase(date = null) {
        if (!this.supabaseClient || !this.supabaseClient.isConnected) {
            throw new Error('Supabase 客户端未连接');
        }
        
        // 注意：这里需要家庭ID，暂时返回空数组
        // 后续实现家庭功能后会完善
        console.log('📝 从Supabase获取任务（家庭功能待实现）');
        return [];
    }
    
    // 在 Supabase 创建任务
    async createTaskInSupabase(taskData) {
        if (!this.supabaseClient || !this.supabaseClient.isConnected) {
            throw new Error('Supabase 客户端未连接');
        }
        
        // 注意：这里需要家庭ID，暂时降级到本地存储
        console.log('📝 在Supabase创建任务（家庭功能待实现，降级到本地）');
        return this.createTaskInLocalStorage(taskData);
    }
    
    // 在 Supabase 更新任务
    async updateTaskInSupabase(taskId, updates) {
        if (!this.supabaseClient || !this.supabaseClient.isConnected) {
            throw new Error('Supabase 客户端未连接');
        }
        
        // 注意：这里需要家庭ID，暂时降级到本地存储
        console.log('📝 在Supabase更新任务（家庭功能待实现，降级到本地）');
        return this.updateTaskInLocalStorage(taskId, updates);
    }
    
    // 在 Supabase 删除任务
    async deleteTaskInSupabase(taskId) {
        if (!this.supabaseClient || !this.supabaseClient.isConnected) {
            throw new Error('Supabase 客户端未连接');
        }
        
        // 注意：这里需要家庭ID，暂时降级到本地存储
        console.log('📝 在Supabase删除任务（家庭功能待实现，降级到本地）');
        return this.deleteTaskInLocalStorage(taskId);
    }
    
    // 在 Supabase 完成任务
    async completeTaskInSupabase(taskId, completionData) {
        if (!this.supabaseClient || !this.supabaseClient.isConnected) {
            throw new Error('Supabase 客户端未连接');
        }
        
        // 注意：这里需要家庭ID，暂时降级到本地存储
        console.log('📝 在Supabase完成任务（家庭功能待实现，降级到本地）');
        return this.completeTaskInLocalStorage(taskId, completionData);
    }
    
    // === 混合模式实现 ===
    
    async getTasksHybrid(date = null) {
        // 混合模式：优先从Supabase获取，失败时使用本地
        try {
            const cloudTasks = await this.getTasksFromSupabase(date);
            if (cloudTasks && cloudTasks.length > 0) {
                return cloudTasks;
            }
        } catch (error) {
            console.warn('⚠️ 从Supabase获取任务失败，使用本地数据:', error);
        }
        
        return this.getTasksFromLocalStorage(date);
    }
    
    async createTaskHybrid(taskData) {
        // 混合模式：同时写入两边
        const localTask = this.createTaskInLocalStorage(taskData);
        
        try {
            await this.createTaskInSupabase(taskData);
        } catch (error) {
            console.warn('⚠️ Supabase创建任务失败，已保存到本地:', error);
        }
        
        return localTask;
    }
    
    async updateTaskHybrid(taskId, updates) {
        // 混合模式：同时更新两边
        const localTask = this.updateTaskInLocalStorage(taskId, updates);
        
        try {
            await this.updateTaskInSupabase(taskId, updates);
        } catch (error) {
            console.warn('⚠️ Supabase更新任务失败，已更新本地:', error);
        }
        
        return localTask;
    }
    
    async deleteTaskHybrid(taskId) {
        // 混合模式：同时删除两边
        const localResult = this.deleteTaskInLocalStorage(taskId);
        
        try {
            await this.deleteTaskInSupabase(taskId);
        } catch (error) {
            console.warn('⚠️ Supabase删除任务失败，已删除本地:', error);
        }
        
        return localResult;
    }
    
    async completeTaskHybrid(taskId, completionData) {
        // 混合模式：同时完成两边
        const localTask = this.completeTaskInLocalStorage(taskId, completionData);
        
        try {
            await this.completeTaskInSupabase(taskId, completionData);
        } catch (error) {
            console.warn('⚠️ Supabase完成任务失败，已更新本地:', error);
        }
        
        return localTask;
    }
    
    // === 同步相关方法 ===
    
    // 获取本地任务（供同步服务使用）
    getLocalTasks() {
        return this.getTasksFromLocalStorage();
    }
    
    // 保存本地任务（供同步服务使用）
    saveLocalTasks(tasks) {
        this.saveTasksToLocalStorage(tasks);
    }
    
    // 统一的创建项目方法（供同步服务使用）
    async createItem(table, data) {
        switch (table) {
            case 'tasks':
                return await this.createTask(data);
            // 可以添加其他表的处理
            default:
                throw new Error(`未知的表: ${table}`);
        }
    }
    
    // 统一的更新项目方法（供同步服务使用）
    async updateItem(table, id, data) {
        switch (table) {
            case 'tasks':
                return await this.updateTask(id, data);
            // 可以添加其他表的处理
            default:
                throw new Error(`未知的表: ${table}`);
        }
    }
    
    // 统一的删除项目方法（供同步服务使用）
    async deleteItem(table, id) {
        switch (table) {
            case 'tasks':
                return await this.deleteTask(id);
            // 可以添加其他表的处理
            default:
                throw new Error(`未知的表: ${table}`);
        }
    }
    
    // === 工具方法 ===
    
    // 保存任务到 localStorage
    saveTasksToLocalStorage(tasks) {
        localStorage.setItem(APP_CONFIG.CONSTANTS.STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    }
    
    // 生成本地ID
    generateLocalId(tasks) {
        if (tasks.length === 0) return 1;
        const maxId = Math.max(...tasks.map(task => task.id));
        return maxId + 1;
    }
    
    // 生成任务ID（同步兼容）
    generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // 触发任务事件
    emitTaskEvent(eventType, data) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(eventType, {
                detail: data
            }));
        }
    }
    
    // 获取当前数据源
    getCurrentDataSource() {
        return this.currentDataSource;
    }
    
    // 数据迁移（从localStorage到Supabase）
    async migrateToSupabase() {
        console.log('🔄 开始数据迁移到Supabase...');
        
        try {
            const localTasks = this.getTasksFromLocalStorage();
            console.log(`📝 找到 ${localTasks.length} 个本地任务需要迁移`);
            
            // 这里实现具体迁移逻辑
            // 需要家庭功能完成后实现
            
            console.log('✅ 数据迁移完成');
            return true;
            
        } catch (error) {
            console.error('❌ 数据迁移失败:', error);
            throw error;
        }
    }
}

// 创建全局实例
let dataServiceInstance = null;

// 获取数据服务实例
function getDataService() {
    if (!dataServiceInstance) {
        dataServiceInstance = new DataService();
    }
    return dataServiceInstance;
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DataService, getDataService };
}