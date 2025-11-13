// 📁 js/task-service.js - 新建任务业务服务文件

class TaskService {
    constructor() {
        this.client = getSupabaseClient(); // 基础数据库连接
        this.isConnected = !!this.client;
    }

    /**
     * 获取家庭任务 - 用于家庭任务徽章显示
     * @param {string} familyId 家庭ID
     * @param {string|null} date 日期筛选（可选）
     * @returns {Promise<Array>} 任务列表
     */
    async getTasks(familyId, date = null) {
        if (!this.isConnected) {
            throw new Error('Supabase未连接');
        }

        try {
            let query = this.client
                .from('study_tasks') // 🎯 直接使用表名，保持简单
                .select('*')
                .eq('family_id', familyId);

            // 如果提供了日期，就按日期筛选
            if (date) {
                query = query.eq('date', date);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            console.log(`✅ 获取任务成功: ${data?.length || 0} 个任务`);
            return data || [];

        } catch (error) {
            console.error('❌ 获取任务失败:', error);
            throw error;
        }
    }

    /**
     * 获取今日家庭任务 - 专用方法
     * @param {string} familyId 家庭ID
     * @returns {Promise<Array>} 今日任务列表
     */
    async getTodayTasks(familyId) {
        const today = new Date().toISOString().split('T')[0];
        return await this.getTasks(familyId, today);
    }

    /**
     * 创建新任务
     * @param {Object} taskData 任务数据
     * @returns {Promise<Object>} 创建的任务
     */
    async createTask(taskData) {
        // 业务逻辑：数据验证、积分计算等
        const enhancedData = {
            ...taskData,
            points: this.calculatePoints(taskData.duration),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await this.client
            .from('study_tasks')
            .insert([enhancedData])
            .select();

        if (error) throw error;
        return data?.[0];
    }

    /**
     * 计算任务积分 - 业务规则
     * @param {number} duration 任务时长
     * @returns {number} 积分
     */
    calculatePoints(duration) {
        // 业务规则：基础积分计算
        return Math.floor(duration * 10);
    }

    /**
     * 完成任务
     * @param {string} taskId 任务ID
     * @returns {Promise<Object>} 更新后的任务
     */
    async completeTask(taskId) {
        const { data, error } = await this.client
            .from('study_tasks')
            .update({ 
                completed: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', taskId)
            .select();

        if (error) throw error;
        return data?.[0];
    }
}

// 🎯 单例模式，确保全局使用同一个服务实例
let taskServiceInstance = null;

function getTaskService() {
    if (!taskServiceInstance) {
        taskServiceInstance = new TaskService();
    }
    return taskServiceInstance;
}

// 全局可用
window.getTaskService = getTaskService;