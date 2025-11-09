// data-service.js - 纯云端版本
class DataService {
    constructor() {
        // 使用配置中的功能开关
        this.featureFlags = window.APP_CONFIG?.FEATURE_FLAGS || {
            DATA_SOURCE: 'supabase',
            ENABLE_FAMILY_FEATURES: true,
            ENABLE_SYNC: false,
            SHOW_SYNC_STATUS: false,
            ENABLE_CONFLICT_DETECTION: false
        };

        this.currentDataSource = this.featureFlags.DATA_SOURCE;
        this.supabaseClient = getSupabaseClient();
        this.isInitialized = false;
        this.taskCreationInProgress = false;
        
        console.log('🔧 DataService 初始化 - 纯云端模式');
        console.log('📊 配置数据源:', this.currentDataSource);
        console.log('🔌 Supabase 连接状态:', this.supabaseClient?.isConnected);
        
        this.init();
    }

    init() {
        console.log(`📊 数据服务初始化 - 使用数据源: ${this.currentDataSource}`);
        this.isInitialized = true;
        console.log('✅ 数据服务初始化完成 - 纯云端模式');
    }

    /**
     * 带重试的请求执行
     */
    async executeWithRetry(operation, context = 'operation', maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await operation();
                if (attempt > 1) {
                    console.log(`✅ ${context} 重试成功 (第${attempt}次)`);
                }
                return result;
            } catch (error) {
                if (attempt === maxRetries) {
                    console.error(`💥 ${context} 最终失败 after ${attempt} 次重试:`, error);
                    throw error;
                }
                
                console.log(`🔄 ${context} 失败，第 ${attempt} 次重试...`, error.message);
                await this.delay(1000 * attempt);
            }
        }
    }

    /**
     * 延迟函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 获取所有任务 - 直接从云端
     */
    async getAllTasks(filters = {}) {
        return this.executeWithRetry(async () => {
            console.log('🔍 从云端获取任务列表', filters);

            let query = this.supabaseClient.from('study_tasks').select('*');
            
            // 应用筛选条件
            if (filters.family_id) {
                query = query.eq('family_id', filters.family_id);
            }
            if (filters.subject && filters.subject !== 'all') {
                query = query.eq('subject', filters.subject);
            }
            if (filters.completed !== undefined) {
                query = query.eq('completed', filters.completed);
            }
            if (filters.user_name) {
                query = query.eq('user_name', filters.user_name);
            }
            if (filters.date) {
                query = query.eq('date', filters.date);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) {
                console.error('❌ 获取任务失败:', error);
                throw error;
            }

            console.log(`✅ 从云端获取到 ${data?.length || 0} 个任务`);
            return data || [];
        }, '获取任务列表');
    }

    /**
     * 创建任务 - 直接写入云端
     */
    async createTask(taskData) {
        // 防止重复调用
        if (this.taskCreationInProgress) {
            console.warn('⚠️ 任务创建进行中，等待...');
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.taskCreationInProgress = true;

        try {
            return await this.executeWithRetry(async () => {
                console.log('📝 创建新任务到云端:', taskData);

                // 数据验证
                if (!taskData.name || !taskData.subject) {
                    throw new Error('任务名称和科目不能为空');
                }

                // 生成任务ID
                const taskId = taskData.id || this.generateUUID();

                // 准备任务数据
                const finalTaskData = {
                    ...taskData,
                    id: taskId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    completed: taskData.completed || false
                };

                // 自动关联家庭信息
                try {
                    const familyService = getFamilyService();
                    if (familyService && familyService.hasJoinedFamily && familyService.hasJoinedFamily()) {
                        finalTaskData.family_id = familyService.getCurrentFamily().id;
                        finalTaskData.user_name = familyService.getCurrentMember().user_name;
                        console.log('🏠 新任务关联家庭:', finalTaskData.family_id);
                    }
                } catch (familyError) {
                    console.warn('⚠️ 家庭服务未就绪，任务将保存为个人任务');
                }

                const { data, error } = await this.supabaseClient
                    .from('study_tasks')
                    .insert([finalTaskData])
                    .select();

                if (error) {
                    console.error('❌ 创建任务失败:', error);
                    throw error;
                }

                console.log('✅ 任务创建成功:', data[0]);
                return data[0];
            }, '创建任务');

        } catch (error) {
            console.error('❌ 创建任务失败:', error);
            throw error;
        } finally {
            this.taskCreationInProgress = false;
        }
    }

    /**
     * 更新任务 - 直接更新云端
     */
    async updateTask(taskId, updates) {
        return this.executeWithRetry(async () => {
            console.log('🔄 更新云端任务:', taskId, updates);

            if (!taskId) {
                throw new Error('任务ID不能为空');
            }

            const updateData = {
                ...updates,
                updated_at: new Date().toISOString()
            };

            // 如果更新完成状态，同时更新完成时间
            if (updates.completed !== undefined) {
                updateData.completed_at = updates.completed ? new Date().toISOString() : null;
            }

            const { data, error } = await this.supabaseClient
                .from('study_tasks')
                .update(updateData)
                .eq('id', taskId)
                .select();

            if (error) {
                console.error('❌ 更新任务失败:', error);
                throw error;
            }

            if (!data || data.length === 0) {
                throw new Error('任务不存在');
            }

            console.log('✅ 任务更新成功:', data[0]);
            return data[0];
        }, '更新任务');
    }

    /**
     * 删除任务 - 直接从云端删除
     */
    async deleteTask(taskId) {
        return this.executeWithRetry(async () => {
            console.log('🗑️ 从云端删除任务:', taskId);

            if (!taskId) {
                throw new Error('任务ID不能为空');
            }

            const { error } = await this.supabaseClient
                .from('study_tasks')
                .delete()
                .eq('id', taskId);

            if (error) {
                console.error('❌ 删除任务失败:', error);
                throw error;
            }

            console.log('✅ 任务删除成功:', taskId);
            return { success: true, taskId };
        }, '删除任务');
    }

    /**
     * 标记任务完成/未完成
     */
    async toggleTaskCompletion(taskId, completed) {
        return this.updateTask(taskId, { 
            completed,
            completed_at: completed ? new Date().toISOString() : null
        });
    }

    /**
     * 批量删除任务
     */
    async batchDeleteTasks(taskIds) {
        return this.executeWithRetry(async () => {
            console.log('🗑️ 批量删除任务:', taskIds);

            if (!taskIds || taskIds.length === 0) {
                throw new Error('任务ID列表不能为空');
            }

            const { error } = await this.supabaseClient
                .from('study_tasks')
                .delete()
                .in('id', taskIds);

            if (error) {
                console.error('❌ 批量删除任务失败:', error);
                throw error;
            }

            console.log(`✅ 批量删除成功: ${taskIds.length} 个任务`);
            return { success: true, deletedCount: taskIds.length };
        }, '批量删除任务');
    }

    /**
     * 获取家庭任务统计
     */
    async getFamilyTaskStats(familyId) {
        return this.executeWithRetry(async () => {
            console.log('📊 获取家庭任务统计:', familyId);

            const { data, error } = await this.supabaseClient
                .from('study_tasks')
                .select('*')
                .eq('family_id', familyId);

            if (error) {
                console.error('❌ 获取任务统计失败:', error);
                throw error;
            }

            const stats = {
                total: data.length,
                completed: data.filter(task => task.completed).length,
                pending: data.filter(task => !task.completed).length,
                bySubject: {}
            };

            // 按科目统计
            data.forEach(task => {
                if (!stats.bySubject[task.subject]) {
                    stats.bySubject[task.subject] = { total: 0, completed: 0 };
                }
                stats.bySubject[task.subject].total++;
                if (task.completed) {
                    stats.bySubject[task.subject].completed++;
                }
            });

            console.log('✅ 任务统计获取成功:', stats);
            return stats;
        }, '获取任务统计');
    }

    /**
     * 生成UUID
     */
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

    // 兼容性方法 - 保持原有接口
    async getTasks(date = null) {
        const filters = {};
        if (date) {
            filters.date = date;
        }
        
        // 自动添加家庭筛选
        try {
            const familyService = getFamilyService();
            if (familyService && familyService.hasJoinedFamily && familyService.hasJoinedFamily()) {
                filters.family_id = familyService.getCurrentFamily().id;
            }
        } catch (error) {
            console.warn('⚠️ 获取家庭信息失败，返回所有任务');
        }

        return this.getAllTasks(filters);
    }

    // 兼容性方法
    async createItem(table, data) {
        if (table === 'study_tasks') return await this.createTask(data);
        throw new Error(`未知的表: ${table}`);
    }

    // 兼容性方法
    async updateItem(table, id, data) {
        if (table === 'study_tasks') return await this.updateTask(id, data);
        throw new Error(`未知的表: ${table}`);
    }

    // 兼容性方法
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

// 全局暴露
if (typeof window !== 'undefined') {
    window.DataService = DataService;
    window.getDataService = getDataService;
    window.dataService = getDataService();
}

console.log('✅ data-service.js 纯云端版本加载完成');