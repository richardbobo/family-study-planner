// Supabase 客户端封装
class SupabaseClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxRetryAttempts = APP_CONFIG.CONSTANTS.MAX_RETRY_ATTEMPTS;

        this.init();
    }

    // 初始化客户端
    init() {
        try {
            // 检查配置是否完成
            if (APP_CONFIG.SUPABASE.URL.includes('your-project') ||
                APP_CONFIG.SUPABASE.ANON_KEY.includes('your-anon-key')) {
                console.warn('⚠️ Supabase配置未完成，客户端未初始化');
                return;
            }

            // 创建 Supabase 客户端
            this.client = supabase.createClient(
                APP_CONFIG.SUPABASE.URL,
                APP_CONFIG.SUPABASE.ANON_KEY,
                {
                    auth: {
                        autoRefreshToken: true,
                        persistSession: true,
                        detectSessionInUrl: false
                    },
                    realtime: {
                        params: {
                            eventsPerSecond: 10
                        }
                    }
                }
            );

            this.isConnected = true;
            console.log('✅ Supabase客户端初始化成功');

            // 测试连接
            this.testConnection();

        } catch (error) {
            console.error('❌ Supabase客户端初始化失败:', error);
            this.isConnected = false;
        }
    }

    // 测试连接
    async testConnection() {
        if (!this.client) {
            console.warn('Supabase客户端未初始化');
            return false;
        }

        try {
            const { data, error } = await this.client.from('study_tasks').select('count').limit(1);

            if (error) {
                console.error('❌ Supabase连接测试失败:', error);
                this.isConnected = false;
                return false;
            }

            console.log('✅ Supabase连接测试成功');
            this.isConnected = true;
            return true;

        } catch (error) {
            console.error('❌ Supabase连接测试异常:', error);
            this.isConnected = false;
            return false;
        }
    }

// 🔧 新增：暴露 from 方法
    from(tableName) {
        if (!this.client) {
            throw new Error('Supabase 客户端未初始化');
        }
        return this.client.from(tableName);
    }
    // === 家庭相关操作 ===

    // 创建家庭
    async createFamily(familyName) {
        if (!this.isConnected) {
            throw new Error('Supabase未连接');
        }

        try {
            // 生成唯一家庭码
            const familyCode = this.generateFamilyCode();

            const { data, error } = await this.client
                .from(APP_CONFIG.SUPABASE.TABLES.FAMILIES)
                .insert([
                    {
                        family_name: familyName,
                        family_code: familyCode,
                        created_at: new Date().toISOString()
                    }
                ])
                .select();

            if (error) throw error;

            console.log('✅ 家庭创建成功:', data[0]);
            return data[0];

        } catch (error) {
            console.error('❌ 创建家庭失败:', error);
            throw error;
        }
    }

    // 加入家庭（修复版本）
    async joinFamily(familyCode, userName, role = 'child') {
        if (!this.isConnected) {
            throw new Error('Supabase未连接');
        }

        try {
            console.log('🔍 验证家庭码:', familyCode);

            // 首先验证家庭码
            const { data: family, error: familyError } = await this.client
                .from(APP_CONFIG.SUPABASE.TABLES.FAMILIES)
                .select('*')
                .eq('family_code', familyCode)
                .single();

            if (familyError || !family) {
                throw new Error('家庭码无效或不存在');
            }

            console.log('✅ 家庭验证成功:', family.id);

            // 检查用户是否已经是家庭成员
            const { data: existingMember, error: checkError } = await this.client
                .from(APP_CONFIG.SUPABASE.TABLES.FAMILY_MEMBERS)
                .select('*')
                .eq('family_id', family.id)
                .eq('user_name', userName)
                .single();

            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 表示没有找到记录
                console.error('❌ 检查成员存在失败:', checkError);
            }

            if (existingMember) {
                console.log('ℹ️ 用户已是家庭成员，直接返回现有成员');
                return {
                    family: family,
                    member: existingMember
                };
            }

            // 添加新的家庭成员
            console.log('📝 添加新的家庭成员:', { userName, role });
            const { data, error } = await this.client
                .from(APP_CONFIG.SUPABASE.TABLES.FAMILY_MEMBERS)
                .insert([
                    {
                        family_id: family.id,
                        user_name: userName,
                        role: role,
                        created_at: new Date().toISOString(),
                        joined_at: new Date().toISOString()
                    }
                ])
                .select();

            if (error) {
                console.error('❌ 添加成员失败:', error);
                throw new Error('加入家庭失败: ' + error.message);
            }

            if (!data || data.length === 0) {
                throw new Error('加入家庭失败：未返回成员数据');
            }

            console.log('✅ 加入家庭成功:', data[0]);
            return {
                family: family,
                member: data[0]
            };

        } catch (error) {
            console.error('❌ 加入家庭失败 - Supabase 客户端错误:', error);
            throw error;
        }
    }

    // 获取家庭成员列表
    async getFamilyMembers(familyId) {
        if (!this.isConnected) {
            throw new Error('Supabase未连接');
        }

        try {
            const { data, error } = await this.client
                .from(APP_CONFIG.SUPABASE.TABLES.FAMILY_MEMBERS)
                .select('*')
                .eq('family_id', familyId)
                .order('created_at');

            if (error) throw error;

            console.log(`✅ 获取家庭成员成功: ${data.length} 个成员`);
            return data || [];

        } catch (error) {
            console.error('❌ 获取家庭成员失败:', error);
            throw error;
        }
    }

    // 删除家庭成员（家长权限）
    async removeFamilyMember(memberId) {
        if (!this.isConnected) {
            throw new Error('Supabase未连接');
        }

        try {
            const { error } = await this.client
                .from(APP_CONFIG.SUPABASE.TABLES.FAMILY_MEMBERS)
                .delete()
                .eq('id', memberId);

            if (error) throw error;

            console.log('✅ 删除家庭成员成功:', memberId);
            return true;

        } catch (error) {
            console.error('❌ 删除家庭成员失败:', error);
            throw error;
        }
    }

    // === 任务相关操作 ===

    // 获取任务列表 - 修改为更灵活的版本
    async getTasks(familyId, date = null) {
        if (!this.isConnected) {
            throw new Error('Supabase未连接');
        }

        try {
            let query = this.client
                .from(APP_CONFIG.SUPABASE.TABLES.STUDY_TASKS)
                .select('*')
                .eq('family_id', familyId);

            // 如果提供了日期，就按日期筛选；如果不提供，就获取所有任务
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

    // 创建任务
    async createTask(taskData) {
        if (!this.isConnected) {
            throw new Error('Supabase未连接');
        }

        try {
            const { data, error } = await this.client
                .from(APP_CONFIG.SUPABASE.TABLES.STUDY_TASKS)
                .insert([taskData])
                .select();

            if (error) throw error;

            console.log('✅ 任务创建成功:', data[0]);
            return data[0];

        } catch (error) {
            console.error('❌ 创建任务失败:', error);
            throw error;
        }
    }

    // 更新任务
    async updateTask(taskId, updates) {
        if (!this.isConnected) {
            throw new Error('Supabase未连接');
        }

        try {
            const { data, error } = await this.client
                .from(APP_CONFIG.SUPABASE.TABLES.STUDY_TASKS)
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', taskId)
                .select();

            if (error) throw error;

            console.log('✅ 任务更新成功:', data[0]);
            return data[0];

        } catch (error) {
            console.error('❌ 更新任务失败:', error);
            throw error;
        }
    }


    async deleteTask(taskId, familyId = null) {
    try {
        console.log(`[Supabase] 删除任务: ${taskId}, 家庭: ${familyId}`);
        
        let query = this.client
            .from('study_tasks')
            .delete()
            .eq('id', taskId);

        // 如果有家庭ID，确保只删除该家庭的任务
        if (familyId) {
            query = query.eq('family_id', familyId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('❌ Supabase删除失败:', error);
            throw error;
        }

        console.log(`✅ Supabase删除成功: ${taskId}`);
        return { success: true, data };
        
    } catch (error) {
        console.error('❌ Supabase删除任务失败:', error);
        throw error;
    }
}

    // === 工具方法 ===

    // 生成家庭码
    generateFamilyCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // 重试机制
    async withRetry(operation, maxAttempts = this.maxRetryAttempts) {
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                console.warn(`操作失败，第${attempt}次重试:`, error);

                if (attempt < maxAttempts) {
                    await this.delay(APP_CONFIG.CONSTANTS.RETRY_DELAY * attempt);
                }
            }
        }

        throw lastError;
    }

    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 创建全局实例
let supabaseClientInstance = null;

function getSupabaseClient() {
    if (!supabaseClientInstance) {
        supabaseClientInstance = new SupabaseClient();
    }
    return supabaseClientInstance;
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SupabaseClient, getSupabaseClient };
}