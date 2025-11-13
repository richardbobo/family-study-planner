// 📁 js/family-service.js - 分层架构完整版本

class FamilyService {
    constructor() {
        try {
            // === 基础连接层 ===
            this.client = getSupabaseClient();
            this.isConnected = !!this.client && typeof this.client.from === 'function';

            if (!this.isConnected) {
                console.warn('⚠️ FamilyService: Supabase客户端初始化可能有问题');
            }

            // === 状态管理层 ===
            this.currentFamily = null;
            this.currentMember = null;
            this.isInitialized = false;
            this.storageKey = 'family_session';
            this.userHistory = this.getUserHistory();

        } catch (error) {
            console.error('❌ FamilyService 构造函数失败:', error);
            // 设置默认值，避免后续错误
            this.client = null;
            this.isConnected = false;
            this.currentFamily = null;
            this.currentMember = null;
            this.isInitialized = false;
            this.storageKey = 'family_session';
            this.userHistory = { recentUsers: [] };
        }
    }

    /**
 * 兼容性方法：initialize 作为 init 的别名
 */
    async initialize() {
        console.log('🔧 调用 initialize() 方法，转发到 init()');
        return this.init();
    }
    // ==================== 初始化层 ====================

    /**
     * 初始化服务
     */
    async init() {
        console.log('🏠 家庭服务初始化...');

        // 从 sessionStorage 恢复
        await this.restoreFromSessionStorage();

        this.isInitialized = true;
        console.log('✅ 家庭服务初始化完成');

        this.emitFamilyEvent('serviceInitialized', {
            family: this.currentFamily,
            member: this.currentMember
        });
    }

    // ==================== 会话管理层 ====================

    /**
     * 保存到 sessionStorage
     */
    /**
     * 保存到 sessionStorage - 增强版本
     */
    async saveToSessionStorage() {
        try {
            if (this.currentFamily && this.currentMember) {
                const sessionData = {
                    family: this.currentFamily,
                    member: this.currentMember,
                    timestamp: new Date().toISOString(),
                    version: '1.0'
                };

                const jsonData = JSON.stringify(sessionData);
                sessionStorage.setItem(this.storageKey, jsonData);

                console.log('💾 家庭信息已保存到会话存储:', {
                    familyId: this.currentFamily.id,
                    memberId: this.currentMember.id,
                    dataSize: jsonData.length,
                    timestamp: sessionData.timestamp
                });

                // 🔧 增强：双重验证保存是否成功
                const saved = sessionStorage.getItem(this.storageKey);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed.family && parsed.family.id === this.currentFamily.id) {
                        console.log('✅ 保存验证成功');
                        return true;
                    } else {
                        console.error('❌ 保存验证失败: 数据不匹配');
                        return false;
                    }
                } else {
                    console.error('❌ 保存验证失败: sessionStorage 中没有数据');
                    return false;
                }
            } else {
                console.warn('⚠️ 无法保存: 当前家庭或成员信息不完整', {
                    currentFamily: this.currentFamily,
                    currentMember: this.currentMember
                });
                return false;
            }
        } catch (error) {
            console.error('❌ 保存会话存储失败:', error);
            return false;
        }
    }

    /**
     * 从 sessionStorage 恢复
     */
    async restoreFromSessionStorage() {
        try {
            const saved = sessionStorage.getItem(this.storageKey);
            console.log('🔍 恢复sessionStorage数据:', saved);

            if (saved) {
                const sessionData = JSON.parse(saved);
                console.log('📋 解析后的session数据:', sessionData);

                // 🔧 修复：确保正确设置状态
                if (sessionData.family && sessionData.member) {
                    this.currentFamily = sessionData.family;
                    this.currentMember = sessionData.member;
                    this.isInitialized = true; // ← 关键修复！

                    console.log('✅ 从会话存储恢复家庭信息成功:', {
                        family: this.currentFamily,
                        member: this.currentMember,
                        familyId: this.currentFamily?.id,
                        isInitialized: this.isInitialized // ← 确认已设置
                    });

                    // 验证恢复是否成功
                    if (!this.currentFamily.id) {
                        console.error('❌ 恢复的家庭信息缺少ID:', this.currentFamily);
                    }
                } else {
                    console.warn('⚠️ sessionStorage数据不完整:', sessionData);
                    this.isInitialized = true; // ← 即使数据不完整也标记为已初始化
                }
            } else {
                console.log('ℹ️ 会话存储中没有家庭信息');
                this.isInitialized = true; // ← 没有数据也标记为已初始化
            }
        } catch (error) {
            console.error('❌ 恢复会话存储失败:', error);
            // 清除损坏的数据
            sessionStorage.removeItem(this.storageKey);
            this.isInitialized = true; // ← 出错也标记为已初始化
        }
    }

    async init() {
        console.log('🏠 家庭服务初始化开始...');

        if (this.isInitialized) {
            console.log('✅ 家庭服务已初始化，跳过');
            return;
        }

        try {
            // 从 sessionStorage 恢复
            await this.restoreFromSessionStorage();

            console.log('初始化完成状态:', {
                currentFamily: this.currentFamily,
                currentFamilyId: this.currentFamily?.id,
                currentMember: this.currentMember,
                isInitialized: this.isInitialized, // ← 检查这个！
                hasJoinedFamily: this.hasJoinedFamily()
            });
            // 🔧 修复：确保 isInitialized 被正确设置
            if (!this.isInitialized) {
                console.warn('⚠️ restoreFromSessionStorage 没有设置 isInitialized，手动设置');
                this.isInitialized = true;
            }
            console.log('✅ 家庭服务初始化完成');

            this.emitFamilyEvent('serviceInitialized', {
                family: this.currentFamily,
                member: this.currentMember
            });

        } catch (error) {
            console.error('❌ 家庭服务初始化失败:', error);
            // 即使出错也要标记为已初始化，避免阻塞
            this.isInitialized = true;
        }
    }

    /**
     * 清除 sessionStorage
     */
    async clearSessionStorage() {
        try {
            sessionStorage.removeItem(this.storageKey);
            console.log('🧹 已清除会话存储');
        } catch (error) {
            console.error('❌ 清除会话存储失败:', error);
        }
    }

    /**
     * 保存会话状态（兼容方法）
     */
    saveSession() {
        return this.saveToSessionStorage();
    }

    // ==================== 家庭管理层 ====================

    /**
     * 创建新家庭
     */
    async createFamily(familyName, creatorName = '家长') {
        // 1. 前置验证
        await this.validateCreateFamilyInput(familyName, creatorName);

        try {
            console.log(`🏠 创建新家庭流程开始: ${familyName}`);

            // 2. 生成家庭码并创建家庭
            const family = await this.createFamilyRecord(familyName);
            console.log('✅ 家庭记录创建成功:', family.family_code);

            // 3. 添加创建者为家庭成员
            const member = await this.addNewFamilyMember(family.id, creatorName, 'parent');
            console.log('✅ 创建者成员添加成功:', member.user_name);

            // 4. 更新应用状态
            await this.updateApplicationState(family, member);

            // 5. 记录操作历史
            this.recordJoinHistory(family.family_code, creatorName, family.family_name); // 🔧 修复：使用正确的参数

            console.log('🎉 创建家庭流程完成');
            return {
                family: family,
                member: member
            };

        } catch (error) {
            console.error('❌ 创建家庭流程失败:', error);
            throw this.formatCreateFamilyError(error);
        }
    }

    /**
     * 加入现有家庭
     */
    // family-service.js - 在 joinFamily 方法的关键位置添加日志
    async joinFamily(familyCode, userName, role = 'child') {
        console.group('🔗 加入家庭流程 - 完整追踪');

        try {
            console.log('📥 输入参数:', { familyCode, userName, role });

            // 1. 前置验证
            await this.validateJoinFamilyInput(familyCode, userName);
            console.log('✅ 输入验证通过');

            // 2. 验证家庭码是否存在
            const family = await this.validateFamilyCode(familyCode);
            console.log('✅ 家庭验证成功:', family.id, family.family_name);

            // 3. 检查用户是否已经是家庭成员
            const existingMember = await this.checkExistingMember(family.id, userName);
            if (existingMember) {
                console.log('ℹ️ 用户已是家庭成员，直接返回现有成员');

                // 🔧 修复：确保这里调用历史记录
                console.log('💾 调用历史记录保存（现有成员）...');
                this.recordJoinHistory(familyCode, userName, family.family_name);

                const result = await this.handleExistingMember(family, existingMember);
                console.log('✅ 处理现有成员完成');
                console.groupEnd();
                return result;
            }

            // 4. 添加新的家庭成员
            console.log('👤 添加新成员...');
            const member = await this.addNewFamilyMember(family.id, userName, role);
            console.log('✅ 新成员添加成功:', member.user_name);

            // 5. 更新应用状态
            console.log('🔄 更新应用状态...');
            await this.updateApplicationState(family, member);

            // 6. 记录操作历史
            console.log('💾 调用历史记录保存（新成员）...');
            this.recordJoinHistory(familyCode, userName, family.family_name);

            console.log('🎉 加入家庭流程完成');
            console.groupEnd();
            return {
                family: family,
                member: member
            };

        } catch (error) {
            console.error('❌ 加入家庭流程失败:', error);
            console.groupEnd();
            throw this.formatJoinFamilyError(error);
        }
    }

    /**
     * 退出家庭
     */
    async leaveFamily() {
        try {
            if (this.currentFamily && this.currentMember) {
                console.log('🚪 退出家庭...');

                // 🔧 修复：在清除状态前保存历史记录
                this.recordLeaveHistory();

                // 清除内存状态
                this.currentFamily = null;
                this.currentMember = null;

                // 🔧 修复：只清除会话存储，不清除本地存储的历史记录
                await this.clearSessionStorageOnly(); // 新增方法

                this.emitFamilyEvent('familyLeft');
                console.log('✅ 已退出家庭');
            }

            return true;

        } catch (error) {
            console.error('❌ 退出家庭失败:', error);
            throw error;
        }
    }



    // 🔧 新增：只清除会话存储的方法
    async clearSessionStorageOnly() {
        try {
            sessionStorage.removeItem(this.storageKey);
            console.log('🧹 已清除会话存储（保留历史记录）');
        } catch (error) {
            console.error('❌ 清除会话存储失败:', error);
        }
    }
    // 🔧 新增：记录退出历史的方法
    recordLeaveHistory() {
        try {
            if (!this.currentFamily || !this.currentMember) return;

            const userHistory = this.getUserHistory();
            const familyCode = this.currentFamily.family_code;
            const userName = this.currentMember.user_name;
            const familyName = this.currentFamily.family_name;

            console.log('📝 记录退出历史:', { userHistory, familyCode, userName, familyName });

            // 更新最近使用的用户记录，标记为已退出
            userHistory.recentUsers = userHistory.recentUsers.map(user => {
                if (user.familyCode === familyCode && user.userName === userName) {
                    return {
                        ...user,
                        leftAt: new Date().toISOString(),
                        isActive: false // 标记为非活跃状态
                    };
                }
                return user;
            });

            this.saveUserHistory(userHistory);
            console.log('✅ 退出历史记录已保存');

        } catch (error) {
            console.warn('⚠️ 记录退出历史失败:', error);
        }
    }
    // ==================== 成员管理层 ====================

    /**
     * 获取家庭成员列表
     */
    async getFamilyMembers(familyId = null) {
        // 连接状态验证
        if (!this.isConnected) {
            throw new Error('Supabase未连接');
        }

        // 🔧 修复：处理字符串 "null" 和 "undefined"
        let targetFamilyId = familyId;

        if (!targetFamilyId || targetFamilyId === 'null' || targetFamilyId === 'undefined') {
            // 使用当前家庭ID
            if (this.currentFamily && this.currentFamily.id) {
                targetFamilyId = this.currentFamily.id;
                console.log('🔧 使用当前家庭ID:', targetFamilyId);
            } else {
                console.error('❌ 获取家庭成员失败: 无有效的家庭ID', {
                    providedFamilyId: familyId,
                    currentFamily: this.currentFamily
                });
                throw new Error('请先选择或加入一个家庭');
            }
        }

        // 🔧 修复：严格的 UUID 格式验证
        if (typeof targetFamilyId !== 'string') {
            console.error('❌ 获取家庭成员失败: familyId 不是字符串', targetFamilyId);
            throw new Error('家庭ID格式错误');
        }

        // UUID 格式验证（简化版）
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(targetFamilyId)) {
            console.error('❌ 获取家庭成员失败: familyId 不是有效的UUID', targetFamilyId);
            throw new Error(`家庭ID格式无效: ${targetFamilyId}`);
        }

        try {
            console.log(`🔍 获取家庭成员列表: "${targetFamilyId}"`);

            const { data, error } = await this.client
                .from('family_members')
                .select('*')
                .eq('family_id', targetFamilyId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('❌ 数据库查询失败:', error);
                throw error;
            }

            console.log(`✅ 获取家庭成员成功: ${data?.length || 0} 个成员`);
            return data || [];

        } catch (error) {
            console.error('❌ 获取家庭成员失败:', error);

            if (error.code === '22P02') {
                throw new Error(`数据库拒绝的家庭ID格式: "${targetFamilyId}"`);
            }

            throw error;
        }
    }

    /**
     * 删除家庭成员 - 支持权限检查
     */
    async removeFamilyMember(memberId, familyId = null) {
        // 连接状态验证
        if (!this.isConnected) {
            throw new Error('Supabase未连接');
        }

        // 权限验证
        if (!this.isParent()) {
            throw new Error('只有家长可以删除成员');
        }

        const targetFamilyId = familyId || (this.currentFamily && this.currentFamily.id);

        if (!targetFamilyId) {
            throw new Error('未找到当前家庭信息');
        }

        try {
            console.log(`🗑️ 删除家庭成员: ${memberId} from family: ${targetFamilyId}`);

            const { error } = await this.client
                .from('family_members')
                .delete()
                .eq('id', memberId)
                .eq('family_id', targetFamilyId);

            if (error) throw error;

            console.log('✅ 删除家庭成员成功:', memberId);
            return true;

        } catch (error) {
            console.error('❌ 删除家庭成员失败:', error);
            throw error;
        }
    }

    // ==================== 业务验证层 ====================

    /**
     * 验证创建家庭的输入参数
     */
    async validateCreateFamilyInput(familyName, creatorName) {
        if (!this.isConnected) {
            throw new Error('Supabase未连接');
        }

        if (!familyName || familyName.trim().length === 0) {
            throw new Error('家庭名称不能为空');
        }

        if (familyName.trim().length > 50) {
            throw new Error('家庭名称长度不能超过50个字符');
        }

        if (!creatorName || creatorName.trim().length === 0) {
            throw new Error('创建者名称不能为空');
        }

        console.log('✅ 创建家庭输入参数验证通过');
    }

    /**
     * 验证加入家庭的输入参数
     */
    async validateJoinFamilyInput(familyCode, userName) {
        if (!this.isConnected) {
            throw new Error('Supabase未连接');
        }

        if (!familyCode || familyCode.trim().length === 0) {
            throw new Error('家庭码不能为空');
        }

        if (!userName || userName.trim().length === 0) {
            throw new Error('用户名不能为空');
        }

        if (userName.trim().length > 50) {
            throw new Error('用户名长度不能超过50个字符');
        }

        console.log('✅ 加入家庭输入参数验证通过');
    }

    /**
     * 验证家庭码有效性
     */
    async validateFamilyCode(familyCode) {
        try {
            const { data: family, error } = await this.client
                .from('families')
                .select('*')
                .eq('family_code', familyCode)
                .single();

            if (error) {
                if (error.code === 'PGRST116') { // 没有找到记录
                    throw new Error('家庭码无效或不存在');
                }
                throw new Error(`家庭验证失败: ${error.message}`);
            }

            if (!family) {
                throw new Error('家庭码无效或不存在');
            }

            return family;
        } catch (error) {
            console.error('❌ 家庭码验证失败:', error);
            throw error;
        }
    }

    /**
     * 检查用户是否已是家庭成员
     */
    async checkExistingMember(familyId, userName) {
        try {
            const { data: existingMember, error } = await this.client
                .from('family_members')
                .select('*')
                .eq('family_id', familyId)
                .eq('user_name', userName)
                .maybeSingle(); // 🔧 使用 maybeSingle 而不是 single

            if (error && error.code !== 'PGRST116') { // PGRST116 表示没有找到记录
                console.error('❌ 检查成员存在失败:', error);
                throw new Error(`成员检查失败: ${error.message}`);
            }

            return existingMember || null;
        } catch (error) {
            console.error('❌ 成员检查失败:', error);
            throw error;
        }
    }

    // ==================== 数据操作层 ====================

    /**
     * 创建家庭记录
     */
    async createFamilyRecord(familyName) {
        try {
            // 生成唯一家庭码
            const familyCode = this.generateFamilyCode();

            const { data, error } = await this.client
                .from('families')
                .insert([
                    {
                        family_name: familyName,
                        family_code: familyCode,
                        created_at: new Date().toISOString()
                    }
                ])
                .select();

            if (error) throw error;

            if (!data || data.length === 0) {
                throw new Error('创建家庭失败：未返回家庭数据');
            }

            return data[0];
        } catch (error) {
            console.error('❌ 创建家庭记录失败:', error);
            throw error;
        }
    }

    /**
     * 添加新的家庭成员
     */
    async addNewFamilyMember(familyId, userName, role) {
        try {
            const memberData = {
                family_id: familyId,
                user_name: userName,
                role: role,
                points: 0,
                avatar: null,
                created_at: new Date().toISOString(),
                joined_at: new Date().toISOString()
            };

            const { data, error } = await this.client
                .from('family_members')
                .insert([memberData])
                .select();

            if (error) {
                // 处理数据库约束错误
                if (error.code === '23505') { // 唯一约束冲突
                    throw new Error(`用户 "${userName}" 已经在这个家庭中了`);
                }
                throw new Error(`添加成员失败: ${error.message}`);
            }

            if (!data || data.length === 0) {
                throw new Error('加入家庭失败：未返回成员数据');
            }

            return data[0];
        } catch (error) {
            console.error('❌ 添加新成员失败:', error);
            throw error;
        }
    }

    // ==================== 状态管理层 ====================

    /**
     * 处理现有成员情况
     */
    async handleExistingMember(family, existingMember) {
        // 即使成员已存在，也更新当前会话状态
        this.currentFamily = family;
        this.currentMember = existingMember;
        await this.saveToSessionStorage();

        this.emitFamilyEvent('familyRejoined', {
            family: family,
            member: existingMember
        });

        return {
            family: family,
            member: existingMember
        };
    }

    /**
     * 更新应用状态
     */
    async updateApplicationState(family, member) {
        // 更新当前会话
        this.currentFamily = family;
        this.currentMember = member;
        await this.saveToSessionStorage();

        // 触发事件通知
        this.emitFamilyEvent('familyJoined', {
            family: family,
            member: member
        });

        console.log('✅ 应用状态更新完成');
    }

    // ==================== 工具方法层 ====================

    /**
     * 生成家庭码
     */
    generateFamilyCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * 验证家庭状态
     */
    async validateFamilyStatus(familyId = null) {
        try {
            const targetFamilyId = familyId || (this.currentFamily && this.currentFamily.id);
            const targetMemberId = this.currentMember && this.currentMember.id;

            if (!targetFamilyId || !targetMemberId) {
                return false;
            }

            // 从云端验证家庭和成员是否仍然有效
            const members = await this.getFamilyMembers(targetFamilyId);
            const currentMemberExists = members.some(member =>
                member.id === targetFamilyId
            );

            if (!currentMemberExists) {
                console.warn('⚠️ 当前成员已不在家庭中，清除状态');
                this.currentFamily = null;
                this.currentMember = null;
                return false;
            }

            return true;

        } catch (error) {
            console.error('❌ 验证家庭状态失败:', error);
            // 验证失败时保守处理，不清除状态
            return true;
        }
    }

    // ==================== 历史记录层 ====================

    /**
     * 从本地存储中获取用户历史
     */
    getUserHistory() {
        try {
            const history = localStorage.getItem('family_user_history');
            return history ? JSON.parse(history) : { recentUsers: [] };
        } catch (error) {
            console.error('❌ 获取用户历史失败:', error);
            return { recentUsers: [] };
        }
    }

    /**
     * 保存用户历史到本地存储
     */
    saveUserHistory(history) {
        try {
            localStorage.setItem('family_user_history', JSON.stringify(history));
        } catch (error) {
            console.error('❌ 保存用户历史失败:', error);
        }
    }

    /**
     * 记录家庭创建历史
     */
    recordFamilyCreation(familyCode, userName, familyName) {
        try {
            const userHistory = this.getUserHistory();
            const recentUser = {
                familyCode: familyCode,
                userName: userName,
                familyName: familyName,
                joinedAt: new Date().toISOString(),
                type: 'create'
            };

            // 去重并限制数量
            userHistory.recentUsers = userHistory.recentUsers
                .filter(user =>
                    !(user.familyCode === familyCode && user.userName === userName)
                )
                .slice(0, 9);

            userHistory.recentUsers.unshift(recentUser);

            this.saveUserHistory(userHistory);

            console.log('✅ 家庭创建历史记录已保存');
        } catch (error) {
            console.warn('⚠️ 记录家庭创建历史失败:', error);
        }
    }

    /**
     * 记录加入历史
     */
    recordJoinHistory(familyCode, userName, familyName) {
        try {
            const userHistory = this.getUserHistory();

            const recentUser = {
                familyCode: familyCode,
                userName: userName,
                familyName: familyName,
                joinedAt: new Date().toISOString(),
                type: 'join',
                isActive: true, // 🔧 新增：标记为活跃状态
                leftAt: null // 🔧 新增：清除退出时间
            };

            console.log('🆕 新记录:', recentUser);

            // 去重逻辑：移除相同家庭码和用户名的记录
            const beforeFilter = userHistory.recentUsers.length;
            userHistory.recentUsers = userHistory.recentUsers.filter(user =>
                !(user.familyCode === familyCode && user.userName === userName)
            );
            const afterFilter = userHistory.recentUsers.length;
            console.log(`🔄 去重: ${beforeFilter} -> ${afterFilter} 条记录`);

            // 添加到开头
            userHistory.recentUsers.unshift(recentUser);
            console.log('📥 添加到开头后的记录:', userHistory.recentUsers);

            // 限制数量（最多保留10条）
            if (userHistory.recentUsers.length > 10) {
                userHistory.recentUsers = userHistory.recentUsers.slice(0, 10);
                console.log('✂️ 限制数量后的记录:', userHistory.recentUsers);
            }

            console.log('📦 保存前的最终数据:', userHistory);

            // 保存到本地存储
            this.saveUserHistory(userHistory);

            // 验证保存是否成功
            const savedHistory = this.getUserHistory();
            const containsNewRecord = savedHistory.recentUsers?.some(u =>
                u.familyCode === familyCode && u.userName === userName
            );

            console.log('✅ 保存验证结果:', {
                savedCount: savedHistory.recentUsers?.length || 0,
                containsNewRecord: containsNewRecord,
                success: containsNewRecord
            });

            if (!containsNewRecord) {
                console.error('❌ 保存验证失败：新记录未找到');
            }

            console.groupEnd();

        } catch (error) {
            console.error('❌ 记录加入历史失败:', error);
            console.groupEnd();
        }

    }

    /**
     * 获取最近使用的用户
     */
    // family-service.js - 修改 getRecentUsers 方法
    getRecentUsers() {
        const history = this.getUserHistory();
        const recentUsers = history.recentUsers || [];

        console.log('📋 获取历史记录:', {
            total: recentUsers.length,
            active: recentUsers.filter(user => user.isActive !== false).length,
            inactive: recentUsers.filter(user => user.isActive === false).length
        });

        // 🔧 修复：返回所有历史记录，包括已退出的
        return recentUsers;
    }

    // ==================== 错误处理层 ====================

    /**
     * 格式化创建家庭错误信息
     */
    formatCreateFamilyError(error) {
        const message = error.message.toLowerCase();

        if (message.includes('未连接') || message.includes('network')) {
            return new Error('网络连接失败，请检查网络后重试');
        }

        if (message.includes('超时') || message.includes('timeout')) {
            return new Error('请求超时，请稍后重试');
        }

        // 返回原始错误，但确保消息友好
        return new Error(`创建家庭失败: ${error.message}`);
    }

    /**
     * 格式化加入家庭错误信息
     */
    formatJoinFamilyError(error) {
        const message = error.message.toLowerCase();

        if (message.includes('家庭码无效') || message.includes('不存在')) {
            return new Error('家庭码无效或不存在，请检查后重试');
        }

        if (message.includes('已经在这个家庭中')) {
            return new Error('您已经是这个家庭的成员了');
        }

        if (message.includes('未连接') || message.includes('network')) {
            return new Error('网络连接失败，请检查网络后重试');
        }

        if (message.includes('超时') || message.includes('timeout')) {
            return new Error('请求超时，请稍后重试');
        }

        // 返回原始错误，但确保消息友好
        return new Error(`加入家庭失败: ${error.message}`);
    }

    // ==================== 状态查询层 ====================

    // family-service.js - 增强 hasJoinedFamily 方法
    hasJoinedFamily() {
        // 🔧 修复：如果未初始化但sessionStorage有数据，尝试恢复
        if (!this.isInitialized) {
            console.warn('⚠️ hasJoinedFamily调用时服务未初始化，尝试紧急恢复');
            this.restoreFromSessionStorage().then(() => {
                if (!this.isInitialized) {
                    this.isInitialized = true;
                }
            });
        }

        const result = !!(this.currentFamily && this.currentMember);
        console.log('🔍 [DEBUG] hasJoinedFamily 被调用, 返回:', result, {
            isInitialized: this.isInitialized,
            currentFamily: this.currentFamily,
            currentMember: this.currentMember
        });
        return result;
    }

    getCurrentFamily() {
        return this.currentFamily;
    }

    getCurrentMember() {
        return this.currentMember;
    }

    isParent() {
        return this.currentMember && this.currentMember.role === 'parent';
    }

    isChild() {
        return this.currentMember && this.currentMember.role === 'child';
    }

    // ==================== 事件系统层 ====================

    emitFamilyEvent(eventType, data = {}) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(`family:${eventType}`, {
                detail: {
                    ...data,
                    timestamp: new Date().toISOString()
                }
            }));
        }
    }

    on(eventType, callback) {
        if (typeof window !== 'undefined') {
            window.addEventListener(`family:${eventType}`, (event) => {
                callback(event.detail);
            });
        }
    }

    off(eventType, callback) {
        if (typeof window !== 'undefined') {
            window.removeEventListener(`family:${eventType}`, callback);
        }
    }
}

// 全局实例管理
let familyServiceInstance = null;

function getFamilyService() {
    if (!familyServiceInstance) {
        familyServiceInstance = new FamilyService();
    }
    return familyServiceInstance;
}

// 全局暴露
if (typeof window !== 'undefined') {
    window.getFamilyService = getFamilyService;
}

console.log('✅ family-service.js 分层架构版本加载完成');