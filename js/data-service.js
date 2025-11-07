// 统一数据服务层 - 简化稳定版本
class DataService {
    constructor() {
        // 🔥 修复：确保 featureFlags 正确初始化
        this.featureFlags = window.APP_CONFIG?.FEATURE_FLAGS || {
            DATA_SOURCE: 'hybrid',
            ENABLE_FAMILY_FEATURES: true,
            ENABLE_SYNC: true,
            SHOW_SYNC_STATUS: true,
            ENABLE_CONFLICT_DETECTION: false
        };

        // this.currentDataSource = APP_CONFIG.FEATURE_FLAGS.DATA_SOURCE;
        this.currentDataSource = this.featureFlags.DATA_SOURCE;
        this.supabaseClient = getSupabaseClient();
        this.isInitialized = false;
        this.taskCreationInProgress = false;
        this.recentOperations = [];
        console.log('🔧 DataService 构造函数开始');
        console.log('📊 配置数据源:', this.featureFlags.DATA_SOURCE);
        console.log('🔌 Supabase 连接状态:', this.supabaseClient.isConnected);
        console.log('🔄 全局 syncService:', typeof window !== 'undefined' ? window.syncService : 'undefined');
        // 🔧 新增：同步服务集成
        this.syncService = null;
        this.initSyncService();
        this.init();
    }


    init() {
        console.log(`📊 数据服务初始化 - 使用数据源: ${this.currentDataSource}`);
        // 如果是localStorage模式，建议切换到hybrid
        if (this.currentDataSource === 'localStorage') {
            console.warn('⚠️ 当前为localStorage模式，建议切换到hybrid模式以启用云端同步');
        }
        this.isInitialized = true;
        console.log('✅ 数据服务初始化完成');
    }


    // 修复的同步服务初始化
    initSyncService() {
        try {
            // 方法1: 检查全局 syncService
            if (typeof window !== 'undefined' && window.syncService) {
                this.syncService = window.syncService;
                console.log('✅ 同步服务已集成到数据服务');
                return;
            }

            // 方法2: 尝试动态获取
            if (typeof getSyncService === 'function') {
                this.syncService = getSyncService();
                console.log('✅ 同步服务通过 getSyncService 获取');
                return;
            }

            // 方法3: 延迟初始化（等同步服务加载完成）
            setTimeout(() => {
                if (window.syncService) {
                    this.syncService = window.syncService;
                    console.log('✅ 同步服务延迟初始化成功');
                } else {
                    console.warn('⚠️ 同步服务未找到，将使用直接同步模式');
                    // 创建简单的同步服务模拟
                    this.createFallbackSyncService();
                }
            }, 1000);

        } catch (error) {
            console.warn('⚠️ 同步服务初始化失败:', error);
            this.createFallbackSyncService();
        }
    }
    // 新增：创建备用同步服务
    createFallbackSyncService() {
        this.syncService = {
            addToSyncQueue: async (operation, table, data) => {
                console.log(`🔄 [备用同步] ${operation} ${table}`, data);
                // 直接执行同步操作
                if (operation === 'CREATE' && table === 'study_tasks') {
                    try {
                        await this.createTaskInSupabase(data);
                        console.log('✅ [备用同步] 任务创建成功');
                    } catch (error) {
                        console.error('❌ [备用同步] 任务创建失败:', error);
                        throw error;
                    }
                }
            },

            triggerSync: async () => {
                console.log('🔄 [备用同步] 触发同步');
                // 这里可以实现更复杂的同步逻辑
            },

            isAvailable: false
        };
        console.log('🛠️ 备用同步服务已创建');
    }
    // sync-service.js - 修复 addToSyncQueue 方法
    addToSyncQueue(operation, table, data) {
        // 🔧 修复：确保参数正确接收
        console.log('📝 addToSyncQueue 被调用，参数:', { operation, table, data });

        // 参数验证
        if (!operation || !table || !data) {
            console.error('❌ 同步队列参数无效:', { operation, table, data });
            console.trace('参数传递堆栈'); // 添加堆栈跟踪
            return Promise.reject(new Error('同步参数无效'));
        }

        try {
            const operationItem = {
                id: this.generateUUID(),
                operation: operation,
                table: table,
                data: data,
                timestamp: new Date().toISOString(),
                status: 'pending',
                retryCount: 0
            };

            this.syncQueue.push(operationItem);
            this.saveQueueToStorage();

            console.log(`📦 加入同步队列: ${operation} ${table}`, {
                id: data.id,
                name: data.name,
                family_id: data.family_id
            });

            // 立即触发同步
            return this.triggerSync();

        } catch (error) {
            console.error('❌ 加入同步队列失败:', error);
            return Promise.reject(error);
        }
    }
    // 创建任务 - 稳定版本
    async createTask(taskData) {
        // 防止重复调用
        if (this.taskCreationInProgress) {
            console.warn('⚠️ 任务创建进行中，等待...');
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.taskCreationInProgress = true;

        try {
            // 生成任务ID
            const taskId = taskData.id || this.generateUUID();
            const finalTaskData = {
                ...taskData,
                id: taskId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // 自动关联家庭信息
            try {
                const familyService = getFamilyService();
                if (familyService && familyService.hasJoinedFamily && familyService.hasJoinedFamily()) {
                    finalTaskData.family_id = familyService.getCurrentFamily().id;
                    finalTaskData.created_by = familyService.getCurrentMember().id;
                    finalTaskData.assigned_to = familyService.getCurrentMember().id;
                    console.log('🏠 新任务关联家庭:', finalTaskData.family_id);
                }
            } catch (familyError) {
                console.warn('⚠️ 家庭服务未就绪，任务将保存为本地任务');
            }

            // 移除可能存在的错误字段
            delete finalTaskData.createdAt;
            delete finalTaskData.updatedAt;

            let result;

            // 根据数据源选择存储方式
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
            // 🔧 新增：立即触发同步（无论哪种模式）
            if (this.currentDataSource !== 'localStorage') {
                setTimeout(() => {
                    this.triggerImmediateSync();
                }, 500);
            }
            // 记录操作频率（仅用于监控）
            const now = Date.now();
            this.recentOperations = this.recentOperations.filter(time =>
                now - time < 60000
            );
            this.recentOperations.push(now);

            if (this.recentOperations.length > 20) {
                console.warn('⚠️ 操作频率较高，建议稍作休息');
            }

            return result;

        } catch (error) {
            console.error('❌ 创建任务失败:', error);
            throw error;
        } finally {
            this.taskCreationInProgress = false;
        }
    }
    // 🔧 新增：立即触发同步
    async triggerImmediateSync() {
        try {
            if (this.syncService && typeof this.syncService.triggerSync === 'function') {
                await this.syncService.triggerSync();
                console.log('🔄 立即同步已触发');
            }
        } catch (syncError) {
            console.warn('⚠️ 触发同步失败:', syncError);
        }
    }
    // 生成UUID
    generateUUID() {
        let d = new Date().getTime();
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            d += performance.now();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    // 在Supabase创建任务
    async createTaskInSupabase(taskData) {
        try {
            if (!this.supabaseClient.isConnected) {
                throw new Error('Supabase 未连接');
            }

            const cloudTaskData = {
                id: taskData.id,
                name: taskData.name,
                subject: taskData.subject,
                date: taskData.date,
                start_time: taskData.start_time,
                end_time: taskData.end_time,
                description: taskData.description || '',
                family_id: taskData.family_id,
                created_by: taskData.created_by,
                assigned_to: taskData.assigned_to,
                created_at: taskData.created_at,
                updated_at: taskData.updated_at,
                completed: taskData.completed || false,
                duration: taskData.duration || 30,
                repeat_type: taskData.repeat_type || 'once',
                points: taskData.points || 10
            };

            const result = await this.supabaseClient.createTask(cloudTaskData);
            console.log('✅ Supabase任务创建成功:', taskData.name);
            return result;

        } catch (error) {
            console.error('❌ Supabase任务创建失败:', error);
            throw error;
        }
    }

    // 混合模式创建任务 - 修复版本
    async createTaskHybrid(taskData) {
        try {
            console.log('🔧 混合模式创建任务开始...');

            // 1. 先保存到本地（确保用户体验）
            const localResult = this.createTaskInLocalStorage(taskData);
            console.log('✅ 本地保存完成');

            // 2. 尝试同步到云端
            await this.syncTaskToCloud(taskData);

            return localResult;

        } catch (error) {
            console.error('❌ 混合模式创建任务失败:', error);
            // 即使云端失败，也返回本地结果
            return this.createTaskInLocalStorage(taskData);
        }
    }

    // 🔧 新增：任务同步到云端
    // data-service.js - 修复调用方式
    async syncTaskToCloud(taskData) {
        console.log('🔄 syncTaskToCloud 开始:', taskData);

        try {
            const familyService = getFamilyService();

            // 检查同步条件
            if (!familyService || !familyService.hasJoinedFamily || !familyService.hasJoinedFamily()) {
                console.log('⏸️ 未加入家庭，跳过云端同步');
                return;
            }

            if (!this.supabaseClient.isConnected) {
                console.log('⏸️ Supabase 未连接，跳过云端同步');
                return;
            }

            console.log('🔄 开始同步任务到云端...');

            // 🔧 修复：确保同步服务可用且参数正确 修改了table名称之前是tasks
            if (this.syncService && this.syncService.addToSyncQueue) {
                try {
                    console.log('📤 准备调用同步服务...', {
                        operation: 'CREATE',
                        table: 'study_tasks',
                        data: taskData
                    });

                    // 🔧 修复：直接调用，不等待，修改表名study_tasks
                    this.syncService.addToSyncQueue('CREATE', 'study_tasks', taskData)
                        .then(() => {
                            console.log('✅ 任务已成功加入同步队列');
                        })
                        .catch(error => {
                            console.warn('⚠️ 加入同步队列失败，尝试直接同步:', error);
                            this.fallbackDirectSync(taskData);
                        });

                } catch (syncError) {
                    console.warn('⚠️ 同步服务调用异常:', syncError);
                    this.fallbackDirectSync(taskData);
                }
            } else {
                console.warn('⚠️ 同步服务不可用，使用直接同步');
                this.fallbackDirectSync(taskData);
            }

        } catch (cloudError) {
            console.warn('⚠️ 同步过程异常:', cloudError.message);
        }
    }
    // 在localStorage创建任务
    createTaskInLocalStorage(taskData) {
        try {
            const tasks = this.getTasksFromLocalStorage();
            const newTask = {
                ...taskData,
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

    // 🔧 新增：备用直接同步方法
    async fallbackDirectSync(taskData) {
        try {
            console.log('🔄 使用直接同步备用方案...');
            await this.createTaskInSupabase(taskData);
            console.log('✅ 直接同步成功');
        } catch (error) {
            console.error('❌ 直接同步也失败:', error);
        }
    }
    // 获取任务列表
    async getTasks(date = null) {
        try {
            switch (this.currentDataSource) {
                case 'supabase':
                    try {
                        const familyService = getFamilyService();
                        if (familyService && familyService.hasJoinedFamily && familyService.hasJoinedFamily()) {
                            return await this.supabaseClient.getTasks(
                                familyService.getCurrentFamily().id,
                                date
                            );
                        }
                        return [];
                    } catch (error) {
                        console.warn('⚠️ 云端获取失败，返回空数组');
                        return [];
                    }

                case 'hybrid':
                    // 优先使用云端，失败时使用本地
                    try {
                        const familyService = getFamilyService();
                        if (familyService && familyService.hasJoinedFamily && familyService.hasJoinedFamily()) {
                            const cloudTasks = await this.supabaseClient.getTasks(
                                familyService.getCurrentFamily().id,
                                date
                            );
                            return cloudTasks;
                        }
                    } catch (error) {
                        console.warn('⚠️ 云端获取失败，使用本地数据');
                    }
                    return this.getTasksFromLocalStorage(date);

                case 'localStorage':
                default:
                    return this.getTasksFromLocalStorage(date);
            }
        } catch (error) {
            console.error('❌ 获取任务失败:', error);
            return [];
        }
    }

    // 更新任务
    async updateTask(taskId, updates) {
        try {
            const finalUpdates = {
                ...updates,
                updated_at: new Date().toISOString()
            };

            let result;

            switch (this.currentDataSource) {
                case 'supabase':
                    try {
                        const familyService = getFamilyService();
                        if (familyService && familyService.hasJoinedFamily && familyService.hasJoinedFamily()) {
                            result = await this.supabaseClient.updateTask(
                                taskId,
                                familyService.getCurrentFamily().id,
                                finalUpdates
                            );
                        }
                    } catch (error) {
                        console.error('❌ 云端更新失败:', error);
                        throw error;
                    }
                    break;

                case 'hybrid':
                    // 先更新本地
                    result = this.updateTaskInLocalStorage(taskId, finalUpdates);

                    // 同时更新云端
                    try {
                        const familyService = getFamilyService();
                        if (familyService && familyService.hasJoinedFamily && familyService.hasJoinedFamily() && this.supabaseClient.isConnected) {
                            await this.supabaseClient.updateTask(
                                taskId,
                                familyService.getCurrentFamily().id,
                                finalUpdates
                            );
                        }
                    } catch (cloudError) {
                        console.warn('⚠️ 云端更新失败，但本地更新成功');
                    }
                    break;

                case 'localStorage':
                default:
                    result = this.updateTaskInLocalStorage(taskId, finalUpdates);
                    break;
            }

            return result;

        } catch (error) {
            console.error('❌ 更新任务失败:', error);
            throw error;
        }
    }

    // 删除任务
    // async deleteTask(taskId) {
    //     try {
    //         let result;

    //         switch (this.currentDataSource) {
    //             case 'supabase':
    //                 try {
    //                     const familyService = getFamilyService();
    //                     if (familyService && familyService.hasJoinedFamily && familyService.hasJoinedFamily()) {
    //                         result = await this.supabaseClient.deleteTask(
    //                             taskId,
    //                             familyService.getCurrentFamily().id
    //                         );
    //                     }
    //                 } catch (error) {
    //                     console.error('❌ 云端删除失败:', error);
    //                     throw error;
    //                 }
    //                 break;

    //             case 'hybrid':
    //                 // 先删除本地
    //                 result = this.deleteTaskInLocalStorage(taskId);

    //                 // 同时删除云端
    //                 try {
    //                     const familyService = getFamilyService();
    //                     if (familyService && familyService.hasJoinedFamily && familyService.hasJoinedFamily() && this.supabaseClient.isConnected) {
    //                         await this.supabaseClient.deleteTask(
    //                             taskId,
    //                             familyService.getCurrentFamily().id
    //                         );
    //                     }
    //                 } catch (cloudError) {
    //                     console.warn('⚠️ 云端删除失败，但本地删除成功');
    //                 }
    //                 break;

    //             case 'localStorage':
    //             default:
    //                 result = this.deleteTaskInLocalStorage(taskId);
    //                 break;
    //         }

    //         return result;

    //     } catch (error) {
    //         console.error('❌ 删除任务失败:', error);
    //         throw error;
    //     }
    // }
    async deleteTask(taskId) {
        try {
            // 🔥 新增：参数验证和日志
            if (!taskId) {
                throw new Error('任务ID不能为空');
            }
            console.log(`[DataService] 删除任务: ${taskId}, 模式: ${this.currentDataSource}`);

            let result;

            switch (this.currentDataSource) {
                case 'supabase':
                    try {
                        const familyService = getFamilyService();
                        if (familyService && familyService.hasJoinedFamily && familyService.hasJoinedFamily()) {
                            result = await this.supabaseClient.deleteTask(
                                taskId,
                                familyService.getCurrentFamily().id
                            );
                            console.log(`✅ 云端删除成功: ${taskId}`);
                        } else {
                            throw new Error('未加入家庭，无法使用云端模式');
                        }
                    } catch (error) {
                        console.error('❌ 云端删除失败:', error);
                        throw error;
                    }
                    break;

                case 'hybrid':
                    // 1. 先删除本地
                    result = this.deleteTaskInLocalStorage(taskId);

                    // 2. 🔥 修复：添加第三个参数（表名）
                    if (this.featureFlags.ENABLE_SYNC && this.syncService) {
                        // 构造完整的同步数据
                        const syncData = {
                            id: taskId,
                            // 如果有家庭信息，添加家庭ID
                            ...(this.familyService && this.familyService.hasJoinedFamily && this.familyService.hasJoinedFamily() && {
                                family_id: this.familyService.getCurrentFamily().id
                            })
                        };

                        console.log('🔄 添加到同步队列:', {
                            operation: 'delete',
                            data: syncData,
                            table: 'study_tasks'
                        });

                        try {
                            // 🔥 修复：添加第三个参数
                            await this.syncService.addToSyncQueue('delete', 'study_tasks',syncData);
                            console.log(`✅ 本地删除成功，已加入同步队列: ${taskId}`);

                            // 立即尝试同步
                            setTimeout(() => {
                                if (this.syncService && this.syncService.safeExecuteSyncOperation) {
                                    this.syncService.safeExecuteSyncOperation().catch(err => {
                                        console.warn('同步执行失败，但会在下次重试:', err);
                                    });
                                }
                            }, 100);
                        } catch (syncError) {
                            console.error('❌ 添加到同步队列失败:', syncError);
                        }
                    } else {
                        console.log(`✅ 本地删除成功: ${taskId} (同步${this.featureFlags.ENABLE_SYNC ? '服务未就绪' : '已禁用'})`);
                    }

                    // 3. 同时尝试直接删除云端
                    try {
                        const familyService = getFamilyService();
                        if (familyService && familyService.hasJoinedFamily && familyService.hasJoinedFamily() && this.supabaseClient?.isConnected) {
                            await this.supabaseClient.deleteTask(
                                taskId,
                                familyService.getCurrentFamily().id
                            );
                            console.log(`✅ 云端直接删除成功: ${taskId}`);
                        }
                    } catch (cloudError) {
                        console.warn('⚠️ 云端直接删除失败，但已加入同步队列会重试');
                    }
                    break;
                case 'localStorage':
                default:
                    result = this.deleteTaskInLocalStorage(taskId);
                    console.log(`✅ 本地删除成功: ${taskId}`);
                    break;
            }

            // 🔥 修复：确保返回统一格式
            return {
                success: true,
                taskId: taskId,
                dataSource: this.currentDataSource
            };

        } catch (error) {
            console.error('❌ 删除任务失败:', error);

            // 🔥 修复：返回统一错误格式
            return {
                success: false,
                error: error.message,
                taskId: taskId
            };
        }
    }

    // 🔥 新增：确保本地删除方法存在且正确
    deleteTaskInLocalStorage(taskId) {
        try {
            const tasks = JSON.parse(localStorage.getItem('studyTasks') || '[]');
            const updatedTasks = tasks.filter(task => task.id != taskId);
            localStorage.setItem('studyTasks', JSON.stringify(updatedTasks));

            console.log(`✅ 本地存储删除成功: ${taskId}`);
            return { success: true, taskId };

        } catch (error) {
            console.error('❌ 本地存储删除失败:', error);
            throw error;
        }
    }
    // 在localStorage更新任务
    updateTaskInLocalStorage(taskId, updates) {
        try {
            const tasks = this.getTasksFromLocalStorage();
            const taskIndex = tasks.findIndex(task => String(task.id) === String(taskId));

            if (taskIndex === -1) {
                console.warn(`⚠️ 更新任务不存在: ${taskId}`);
                return null;
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

    // 在localStorage删除任务
    deleteTaskInLocalStorage(taskId) {
        try {
            const tasks = this.getTasksFromLocalStorage();
            const filteredTasks = tasks.filter(task => String(task.id) !== String(taskId));

            if (tasks.length === filteredTasks.length) {
                console.warn(`⚠️ 任务不存在: ${taskId}`);
                return true;
            }

            this.saveTasksToLocalStorage(filteredTasks);
            console.log('✅ 本地任务删除成功:', taskId);
            return true;

        } catch (error) {
            console.error('❌ 本地任务删除失败:', error);
            return true;
        }
    }

    // 从localStorage获取任务
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

    // 保存任务到localStorage
    saveTasksToLocalStorage(tasks) {
        try {
            localStorage.setItem(APP_CONFIG.CONSTANTS.STORAGE_KEYS.TASKS, JSON.stringify(tasks));
        } catch (error) {
            console.error('❌ 保存任务到localStorage失败:', error);
        }
    }

    // 同步相关方法
    getLocalTasks() {
        return this.getTasksFromLocalStorage();
    }

    saveLocalTasks(tasks) {
        this.saveTasksToLocalStorage(tasks);
    }

    async createItem(table, data) {
        if (table === 'study_tasks') return await this.createTask(data);
        throw new Error(`未知的表: ${table}`);
    }

    async updateItem(table, id, data) {
        if (table === 'study_tasks') return await this.updateTask(id, data);
        throw new Error(`未知的表: ${table}`);
    }

    async deleteItem(table, id) {
        if (table === 'study_tasks') return await this.deleteTask(id);
        throw new Error(`未知的表: ${table}`);
    }
}

// 全局实例管理
let dataServiceInstance = null;

function getDataService() {
    if (!dataServiceInstance) {
        dataServiceInstance = new DataService();
    }
    return dataServiceInstance;
}

// 全局暴露 这里好像还有点问题
if (typeof window !== 'undefined') {
    window.DataService = DataService;
    window.getDataService = getDataService;
    window.dataService = getDataService();
}

console.log('✅ data-service.js 简化稳定版本加载完成');