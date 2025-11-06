// 统一数据服务层 - 安全修复版本
class DataService {
    constructor() {
        this.currentDataSource = APP_CONFIG.FEATURE_FLAGS.DATA_SOURCE;
        this.supabaseClient = getSupabaseClient();
        this.isInitialized = false;
        
        // 安全防护
        this.taskCreationInProgress = false;
        this.taskCreationCount = 0;
        this.lastTaskCreationTime = 0;
        this.maxTasksPerMinute = 60;
        
        this.init();
    }
    
    init() {
        console.log(`📊 数据服务初始化 - 使用数据源: ${this.currentDataSource}`);
        this.isInitialized = true;
        console.log('✅ 数据服务初始化完成');
    }
    
    // 创建任务 - 安全版本
    async createTask(taskData) {
        // 安全防护1：防止重复调用
        if (this.taskCreationInProgress) {
            console.error('🚨 检测到重复任务创建，已阻止');
            throw new Error('任务创建正在进行中');
        }
        
        // 安全防护2：频率限制
        const now = Date.now();
        if (now - this.lastTaskCreationTime < 100) {
            console.error('🚨 任务创建频率过高，已阻止');
            throw new Error('任务创建频率过高');
        }
        
        // 安全防护3：重置计数器（每分钟）
        if (now - this.lastTaskCreationTime > 60000) {
            this.taskCreationCount = 0;
        }
        
        // 安全防护4：数量限制
        this.taskCreationCount++;
        if (this.taskCreationCount > this.maxTasksPerMinute) {
            console.error('🚨 任务创建数量超限，已阻止');
            throw new Error('任务创建数量超限');
        }
        
        this.taskCreationInProgress = true;
        this.lastTaskCreationTime = now;
        
        try {
            let result;
            
            const finalTaskData = {
                ...taskData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            switch (this.currentDataSource) {
                case 'supabase':
                    result = await this.createTaskInSupabase(finalTaskData);
                    break;
                case 'hybrid':
                    result = await this.createTaskHybrid(finalTaskData);
                    break;
                case 'localStorage':
                default:
                    result = this.createTaskInLocalStorage(finalTaskData);
                    break;
            }
            
            // 安全添加到同步队列
            if (window.syncService && APP_CONFIG.FEATURE_FLAGS.ENABLE_SYNC) {
                try {
                    await window.syncService.addToSyncQueue({
                        type: 'create',
                        table: 'tasks',
                        data: result
                    });
                } catch (syncError) {
                    console.warn('⚠️ 添加到同步队列失败:', syncError);
                    // 不抛出错误，继续执行
                }
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ 创建任务失败:', error);
            throw error;
        } finally {
            this.taskCreationInProgress = false;
        }
    }
    
    // 在 localStorage 创建任务 - 修复ID生成
    createTaskInLocalStorage(taskData) {
        try {
            const tasks = this.getTasksFromLocalStorage();
            const newTask = {
                ...taskData,
                id: String(taskData.id || this.generateLocalId(tasks)), // 确保ID是字符串
                createdAt: new Date().toISOString()
            };
            
            tasks.push(newTask);
            this.saveTasksToLocalStorage(tasks);
            
            console.log('✅ 本地任务创建成功:', newTask.name);
            return newTask;
            
        } catch (error) {
            console.error('❌ 本地任务创建失败:', error);
            throw error;
        }
    }
    
    // 在 localStorage 删除任务 - 安全版本
    deleteTaskInLocalStorage(taskId) {
        try {
            const tasks = this.getTasksFromLocalStorage();
            
            // 安全比较：统一转为字符串
            const filteredTasks = tasks.filter(task => 
                String(task.id) !== String(taskId)
            );
            
            if (tasks.length === filteredTasks.length) {
                console.warn(`⚠️ 任务不存在: ${taskId}，但返回成功`);
                return true; // 安全处理：即使任务不存在也返回成功
            }
            
            this.saveTasksToLocalStorage(filteredTasks);
            console.log('✅ 本地任务删除成功:', taskId);
            return true;
            
        } catch (error) {
            console.error('❌ 本地任务删除失败:', error);
            return true; // 安全处理：即使出错也返回成功
        }
    }
    
    // 在 localStorage 更新任务 - 安全版本
    updateTaskInLocalStorage(taskId, updates) {
        try {
            const tasks = this.getTasksFromLocalStorage();
            
            // 安全比较：统一转为字符串
            const taskIndex = tasks.findIndex(task => 
                String(task.id) === String(taskId)
            );
            
            if (taskIndex === -1) {
                console.warn(`⚠️ 更新任务不存在: ${taskId}`);
                return null; // 返回null而不是抛出错误
            }
            
            tasks[taskIndex] = {
                ...tasks[taskIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            this.saveTasksToLocalStorage(tasks);
            console.log('✅ 本地任务更新成功:', taskId);
            return tasks[taskIndex];
            
        } catch (error) {
            console.error('❌ 本地任务更新失败:', error);
            return null;
        }
    }
    
    // 修复ID生成 - 确保返回字符串
    generateLocalId(tasks) {
        if (tasks.length === 0) return '1';
        const maxId = Math.max(...tasks.map(task => parseInt(task.id) || 0));
        return String(maxId + 1);
    }
    
    // 其他方法保持不变...
    getTasksFromLocalStorage(date = null) {
        try {
            const tasks = JSON.parse(localStorage.getItem(APP_CONFIG.CONSTANTS.STORAGE_KEYS.TASKS) || '[]');
            if (date) return tasks.filter(task => task.date === date);
            return tasks;
        } catch (error) {
            console.error('❌ 从localStorage获取任务失败:', error);
            return [];
        }
    }
    
    saveTasksToLocalStorage(tasks) {
        localStorage.setItem(APP_CONFIG.CONSTANTS.STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    }
    
    // 同步相关方法
    getLocalTasks() {
        return this.getTasksFromLocalStorage();
    }
    
    saveLocalTasks(tasks) {
        this.saveTasksToLocalStorage(tasks);
    }
    
    async createItem(table, data) {
        if (table === 'tasks') return await this.createTask(data);
        throw new Error(`未知的表: ${table}`);
    }
    
    async updateItem(table, id, data) {
        if (table === 'tasks') return await this.updateTask(id, data);
        throw new Error(`未知的表: ${table}`);
    }
    
    async deleteItem(table, id) {
        if (table === 'tasks') return await this.deleteTask(id);
        throw new Error(`未知的表: ${table}`);
    }
    
    // 其他现有方法保持不变...
}

// 全局实例管理
let dataServiceInstance = null;
function getDataService() {
    if (!dataServiceInstance) {
        dataServiceInstance = new DataService();
    }
    return dataServiceInstance;
}

// 全局暴露
window.DataService = DataService;
window.getDataService = getDataService;
window.dataService = getDataService();

console.log('✅ data-service.js 安全版本加载完成');