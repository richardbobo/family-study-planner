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

         this.debugFamilyState(); // 初始化前先诊断
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
    // data-service.js - 修复 getAllTasks 方法
    async getAllTasks(filters = {}) {
        return this.executeWithRetry(async () => {
            console.log('🔍 从云端获取任务列表', filters);

            // 🔧 关键修复：必须提供 family_id
            if (!filters.family_id) {
                console.warn('🚫 安全限制：未提供家庭ID，不返回任何任务');
                return [];
            }
            // 🔧 正确的关联查询：获取任务及相关的成员信息
            let query = this.supabaseClient.from('study_tasks').select(`
            *,
            creator:family_members!study_tasks_created_by_fkey(
                user_name,
                role,
                avatar
            ),
            assignee:family_members!study_tasks_assigned_to_fkey(
                user_name, 
                role,
                avatar
            )
        `);

            // 应用筛选条件
            // 🔧 现在 family_id 一定有值，可以安全应用筛选
            query = query.eq('family_id', filters.family_id);

            if (filters.subject && filters.subject !== 'all') {
                query = query.eq('subject', filters.subject);
            }
            if (filters.completed !== undefined) {
                query = query.eq('completed', filters.completed);
            }
            if (filters.date) {
                query = query.eq('date', filters.date);
            }
            // 按创建者筛选
            if (filters.created_by) {
                query = query.eq('created_by', filters.created_by);
            }
            // 按分配对象筛选  
            if (filters.assigned_to) {
                query = query.eq('assigned_to', filters.assigned_to);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) {
                console.error('❌ 获取任务失败:', error);
                throw error;
            }

            // 🔧 处理数据，添加便于前端使用的字段
            const processedData = data ? data.map(task => ({
                ...task,
                // 添加用户显示信息
                creator_name: task.creator?.user_name || '未知用户',
                assignee_name: task.assignee?.user_name || '未知用户',
                creator_role: task.creator?.role || 'unknown',
                assignee_role: task.assignee?.role || 'unknown',
                // 保持兼容性
                user_name: task.creator?.user_name || '未知用户'
            })) : [];

            console.log(`✅ 从云端获取到 ${processedData.length} 个任务`);
            return processedData;
        }, '获取任务列表');
    }

        // 兼容性方法 - 保持原有接口
// data-service.js - 修改 getTasks 方法 原来的版本先屏蔽
// async getTasks(date = null) {
//     console.group('🔍 [DEBUG] getTasks 方法调用追踪');
//     console.log('📅 传入日期参数:', date);
    
//     const filters = {};
//     if (date) {
//         filters.date = date;
//     }

//     // 自动添加家庭筛选
//     try {
//         const familyService = getFamilyService();
//         console.log('👥 FamilyService 实例:', familyService);
        
//         if (familyService && familyService.hasJoinedFamily && familyService.hasJoinedFamily()) {
//             console.log('✅ 用户已加入家庭');
//             const currentFamily = familyService.getCurrentFamily();
//             const currentMember = familyService.getCurrentMember();
            
//             console.log('🏠 当前家庭信息:', currentFamily);
//             console.log('👤 当前成员信息:', currentMember);
//             console.log('💾 sessionStorage 中的家庭数据:', sessionStorage.getItem('familyService'));
            
//             if (currentFamily && currentFamily.id) {
//                 filters.family_id = currentFamily.id;
//                 console.log('🎯 设置家庭筛选条件:', filters.family_id);
//             } else {
//                 console.warn('⚠️ 当前家庭信息不完整:', currentFamily);
//             }
//         } else {
//             console.warn('⚠️ 用户未加入家庭或家庭服务方法不可用');
//             console.log('hasJoinedFamily 方法存在:', !!familyService?.hasJoinedFamily);
//             if (familyService) {
//                 console.log('hasJoinedFamily() 结果:', familyService.hasJoinedFamily?.());
//             }
//         }
//     } catch (error) {
//         console.error('💥 获取家庭信息时发生错误:', error);
//     }
    
//     console.log('🎯 最终筛选条件:', filters);
//     console.groupEnd();
    
//     return this.getAllTasks(filters);
// }
// family-service.js - 添加状态验证
debugFamilyState() {
    console.group('🔍 [DEBUG] 家庭服务完整状态诊断');
    
    console.log('💾 SessionStorage键:', this.storageKey);
    const rawData = sessionStorage.getItem(this.storageKey);
    console.log('💾 SessionStorage原始数据:', rawData);
    
    if (rawData) {
        try {
            const parsed = JSON.parse(rawData);
            console.log('📦 解析后的数据:', parsed);
            console.log('🔑 关键字段检查:', {
                familyExists: !!parsed.family,
                familyId: parsed.family?.id,
                familyName: parsed.family?.family_name,
                memberExists: !!parsed.member,
                memberId: parsed.member?.id,
                memberName: parsed.member?.user_name
            });
        } catch (e) {
            console.error('❌ 解析失败:', e);
        }
    }
    
    console.log('🧠 内存状态:', {
        isInitialized: this.isInitialized,
        currentFamily: this.currentFamily,
        currentMember: this.currentMember
    });
    
    console.log('🔧 方法检查:', {
        hasJoinedFamily: this.hasJoinedFamily?.(),
        getCurrentFamily: this.getCurrentFamily?.(),
        getCurrentMember: this.getCurrentMember?.()
    });
    
    console.groupEnd();
}


// data-service.js - 增强调试版本
async getTasks(date = null) {
    console.group('🔍 [DEBUG] DataService.getTasks 详细追踪');
    
    const filters = {};
    if (date) {
        filters.date = date;
    }

    try {
        const familyService = getFamilyService();
        console.log('👥 家庭服务实例详情:', {
            constructor: familyService.constructor.name,
            hasJoinedFamily: familyService.hasJoinedFamily?.call(familyService),
            getCurrentFamily: familyService.getCurrentFamily?.call(familyService),
            isInitialized: familyService.isInitialized,
            storageKey: familyService.storageKey
        });

        // 直接检查sessionStorage
        const sessionKey = familyService.storageKey || 'family_session';
        const rawSession = sessionStorage.getItem(sessionKey);
        console.log('💾 DataService直接读取sessionStorage:', {
            key: sessionKey,
            exists: !!rawSession,
            data: rawSession
        });

        if (familyService.hasJoinedFamily && familyService.hasJoinedFamily()) {
            const currentFamily = familyService.getCurrentFamily();
            console.log('🏠 getCurrentFamily() 返回:', currentFamily);
            
            if (currentFamily && currentFamily.id) {
                filters.family_id = currentFamily.id;
                console.log('✅ 成功设置family_id:', filters.family_id);
            } else {
                console.error('❌ getCurrentFamily() 返回无效数据:', currentFamily);
                
                // 尝试紧急恢复
                console.log('🆘 尝试紧急恢复家庭状态...');
                if (rawSession) {
                    try {
                        const emergencyData = JSON.parse(rawSession);
                        if (emergencyData.family && emergencyData.family.id) {
                            filters.family_id = emergencyData.family.id;
                            console.log('🚑 紧急恢复family_id:', filters.family_id);
                        }
                    } catch (e) {
                        console.error('❌ 紧急恢复失败:', e);
                    }
                }
            }
        } else {
            console.warn('⚠️ hasJoinedFamily() 返回false');
        }
        
    } catch (error) {
        console.error('💥 获取家庭信息时发生严重错误:', error);
    }
    
    console.log('🎯 最终筛选条件:', filters);
    console.groupEnd();
    
    return this.getAllTasks(filters);
}
    

    // data-service.js - 修复 createTask 方法
    async createTask(taskData) {
        return this.executeWithRetry(async () => {
            console.log('📝 创建新任务到云端:', taskData);

            // 数据验证
            if (!taskData.name || !taskData.subject) {
                throw new Error('任务名称和科目不能为空');
            }

            // 生成任务ID
            const taskId = taskData.id || this.generateUUID();

            // 🔧 构建符合数据库结构的数据
            const finalTaskData = {
                // 基础任务信息
                id: taskId,
                name: taskData.name,
                subject: taskData.subject,
                date: taskData.date,
                start_time: taskData.start_time,
                end_time: taskData.end_time,
                description: taskData.description,
                duration: taskData.duration || 30,
                repeat_type: taskData.repeat_type || 'once',
                points: taskData.points || 10,
                detailed_content: taskData.detailedContent || taskData.detailed_content,
                has_content: !!(taskData.detailedContent || taskData.detailed_content),

                // 系统字段
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                completed: false,

                // 家庭关联字段（初始为null，下面会设置）
                family_id: null,
                created_by: null,
                assigned_to: null
            };

            // 🔧 设置家庭和成员关联
            try {
                const familyService = getFamilyService();
                if (familyService && familyService.hasJoinedFamily && familyService.hasJoinedFamily()) {
                    const family = familyService.getCurrentFamily();
                    const member = familyService.getCurrentMember();

                    console.log('🏠 设置家庭关联:', {
                        family_id: family.id,
                        member_id: member.id,
                        member_name: member.user_name
                    });

                    // 使用正确的数据库字段
                    finalTaskData.family_id = family.id;
                    finalTaskData.created_by = member.id;
                    finalTaskData.assigned_to = member.id; // 默认分配给自己

                    // 如果有指定的分配对象
                    if (taskData.assigned_to) {
                        finalTaskData.assigned_to = taskData.assigned_to;
                    }
                }
            } catch (familyError) {
                console.warn('⚠️ 家庭服务未就绪，创建个人任务:', familyError);
                // 如果没有家庭信息，可能需要其他处理逻辑
            }

            console.log('📤 准备插入数据库的数据:', finalTaskData);

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

    // 在 data-service.js 的 DataService 类中添加
    /**
     * 标记任务完成并创建完成记录
     */
    async completeTask(taskId, completionData) {
        return this.executeWithRetry(async () => {
            console.log('✅ 标记任务完成:', taskId, completionData);

            const { actual_duration, notes, earned_points } = completionData;

            // 1. 更新任务状态
            const updateData = {
                completed: true,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            if (actual_duration) {
                updateData.duration = actual_duration;
            }

            const { data: updatedTask, error: updateError } = await this.supabaseClient
                .from('study_tasks')
                .update(updateData)
                .eq('id', taskId)
                .select();

            if (updateError) {
                console.error('❌ 更新任务状态失败:', updateError);
                throw updateError;
            }

            // 2. 创建完成记录
            try {
                const familyService = getFamilyService();
                if (familyService && familyService.hasJoinedFamily && familyService.hasJoinedFamily()) {
                    const member = familyService.getCurrentMember();

                    const completionRecord = {
                        task_id: taskId,
                        completed_by: member.id,
                        actual_duration: actual_duration,
                        notes: notes,
                        earned_points: earned_points || updatedTask[0]?.points || 10
                    };

                    const { error: recordError } = await this.supabaseClient
                        .from('completion_records')
                        .insert([completionRecord]);

                    if (recordError) {
                        console.error('❌ 创建完成记录失败:', recordError);
                        // 不抛出错误，因为任务状态已经更新
                    }
                }
            } catch (familyError) {
                console.warn('⚠️ 无法创建完成记录:', familyError);
            }

            console.log('✅ 任务完成处理成功');
            return updatedTask[0];
        }, '完成任务');
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