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
    
    // 健康检查
    async healthCheck() {
        return await this.testConnection();
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
    
    // 加入家庭
    async joinFamily(familyCode, userName, role = 'child') {
        if (!this.isConnected) {
            throw new Error('Supabase未连接');
        }
        
        try {
            // 首先验证家庭码
            const { data: family, error: familyError } = await this.client
                .from(APP_CONFIG.SUPABASE.TABLES.FAMILIES)
                .select('*')
                .eq('family_code', familyCode)
                .single();
            
            if (familyError || !family) {
                throw new Error('家庭码无效');
            }
            
            // 添加家庭成员
            const { data, error } = await this.client
                .from(APP_CONFIG.SUPABASE.TABLES.FAMILY_MEMBERS)
                .insert([
                    {
                        family_id: family.id,
                        user_name: userName,
                        role: role,
                        joined_at: new Date().toISOString()
                    }
                ])
                .select();
            
            if (error) throw error;
            
            console.log('✅ 加入家庭成功:', data[0]);
            return {
                family: family,
                member: data[0]
            };
            
        } catch (error) {
            console.error('❌ 加入家庭失败:', error);
            throw error;
        }
    }
    
    // === 任务相关操作 ===
    
    // 获取任务列表
    async getTasks(familyId, date = null) {
        if (!this.isConnected) {
            throw new Error('Supabase未连接');
        }
        
        try {
            let query = this.client
                .from(APP_CONFIG.SUPABASE.TABLES.STUDY_TASKS)
                .select('*')
                .eq('family_id', familyId);
            
            if (date) {
                query = query.eq('date', date);
            }
            
            const { data, error } = await query.order('start_time');
            
            if (error) throw error;
            
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
    
    // 删除任务
    async deleteTask(taskId) {
        if (!this.isConnected) {
            throw new Error('Supabase未连接');
        }
        
        try {
            const { error } = await this.client
                .from(APP_CONFIG.SUPABASE.TABLES.STUDY_TASKS)
                .delete()
                .eq('id', taskId);
            
            if (error) throw error;
            
            console.log('✅ 任务删除成功:', taskId);
            return true;
            
        } catch (error) {
            console.error('❌ 删除任务失败:', error);
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