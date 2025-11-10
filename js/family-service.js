// 家庭管理服务 - 完全云端版本
class FamilyService {
    constructor() {
        this.supabaseClient = getSupabaseClient();
        this.currentFamily = null;
        this.currentMember = null;
        this.isInitialized = false;
        this.userHistory = this.getUserHistory(); // 用户使用历史

        // 🔧 使用 sessionStorage 作为临时方案
        this.storageKey = 'family_session';
        this.init();
    }

    // 初始化服务
    async init() {
        console.log('🏠 家庭服务初始化...');

        // 从 sessionStorage 恢复
        await this.restoreFromSessionStorage();

        // 家庭状态将在需要时从云端实时获取

        this.isInitialized = true;
        console.log('✅ 家庭服务初始化完成');

        this.emitFamilyEvent('serviceInitialized', {
            family: this.currentFamily,
            member: this.currentMember
        });
    }

    // 保存到 sessionStorage
    async saveToSessionStorage() {
        try {
            if (this.currentFamily && this.currentMember) {
                const sessionData = {
                    family: this.currentFamily,
                    member: this.currentMember,
                    timestamp: new Date().toISOString()
                };
                sessionStorage.setItem(this.storageKey, JSON.stringify(sessionData));
                console.log('💾 家庭信息已保存到会话存储');
            }
        } catch (error) {
            console.error('❌ 保存会话存储失败:', error);
        }
    }

    // 从 sessionStorage 恢复
    async restoreFromSessionStorage() {
        try {
            const saved = sessionStorage.getItem(this.storageKey);
            if (saved) {
                const sessionData = JSON.parse(saved);
                this.currentFamily = sessionData.family;
                this.currentMember = sessionData.member;
                console.log('🔍 从会话存储恢复家庭信息');
            }
        } catch (error) {
            console.error('❌ 恢复会话存储失败:', error);
            sessionStorage.removeItem(this.storageKey);
        }
    }

    // 清除 sessionStorage
    async clearSessionStorage() {
        try {
            sessionStorage.removeItem(this.storageKey);
            console.log('🧹 已清除会话存储');
        } catch (error) {
            console.error('❌ 清除会话存储失败:', error);
        }
    }

    // 获取用户历史记录
    getUserHistory() {
        try {
            return JSON.parse(localStorage.getItem('familyUserHistory') || '{}');
        } catch (error) {
            return {};
        }
    }

    // 保存用户历史记录
    saveUserHistory() {
        try {
            localStorage.setItem('familyUserHistory', JSON.stringify(this.userHistory));
        } catch (error) {
            console.error('保存用户历史失败:', error);
        }
    }

    // 记录用户加入家庭
    recordUserJoin(familyCode, userName, familyName) {
        if (!this.userHistory.recentUsers) {
            this.userHistory.recentUsers = [];
        }

        // 移除重复记录
        this.userHistory.recentUsers = this.userHistory.recentUsers.filter(
            user => !(user.familyCode === familyCode && user.userName === userName)
        );

        // 添加新记录到开头
        this.userHistory.recentUsers.unshift({
            familyCode,
            userName,
            familyName,
            lastJoined: new Date().toISOString()
        });

        // 只保留最近5个记录
        this.userHistory.recentUsers = this.userHistory.recentUsers.slice(0, 5);

        this.saveUserHistory();
    }

    // 获取最近使用的用户
    getRecentUsers() {
        return this.userHistory.recentUsers || [];
    }

    // === 家庭管理核心方法 ===

    // 创建新家庭
    async createFamily(familyName, creatorName = '家长') {
        try {
            console.log(`🏠 创建新家庭: ${familyName}`);

            // 在 Supabase 中创建家庭
            const family = await this.supabaseClient.createFamily(familyName);

            // 添加创建者为家庭成员
            const member = await this.supabaseClient.joinFamily(
                family.family_code,
                creatorName,
                'parent'
            );

            // 设置当前家庭和成员
            this.currentFamily = family;
            this.currentMember = member.member;

            // 🔧 保存到 sessionStorage
            await this.saveToSessionStorage();

            this.emitFamilyEvent('familyCreated', {
                family: this.currentFamily,
                member: this.currentMember
            });

            console.log('✅ 家庭创建成功:', family.family_code);
            return {
                family: this.currentFamily,
                member: this.currentMember
            };

        } catch (error) {
            console.error('❌ 创建家庭失败:', error);
            throw error;
        }
    }

    // 加入现有家庭
    async joinFamily(familyCode, userName, role = 'child') {
        try {
            console.log(`🔗 加入家庭: ${familyCode}, 用户: ${userName}`);

            const result = await this.supabaseClient.joinFamily(familyCode, userName, role);

            this.currentFamily = result.family;
            this.currentMember = result.member;

            // 记录用户加入历史
            this.recordUserJoin(familyCode, userName, result.family.family_name);
            // 🔧 保存到 sessionStorage
            await this.saveToSessionStorage();

            this.emitFamilyEvent('familyJoined', {
                family: this.currentFamily,
                member: this.currentMember
            });

            console.log('✅ 加入家庭成功');
            return {
                family: this.currentFamily,
                member: this.currentMember
            };

        } catch (error) {
            console.error('❌ 加入家庭失败:', error);

            if (error.message.includes('duplicate key') || error.message.includes('唯一约束')) {
                throw new Error(`用户 "${userName}" 已经在这个家庭中了`);
            }

            throw error;
        }
    }

    // 退出家庭
    async leaveFamily() {
        try {
            if (this.currentFamily && this.currentMember) {
                console.log('🚪 退出家庭...');

                // 清除内存状态
                this.currentFamily = null;
                this.currentMember = null;

                // 🔧 清除 sessionStorage
                await this.clearSessionStorage();

                this.emitFamilyEvent('familyLeft');
                console.log('✅ 已退出家庭');
            }

            return true;

        } catch (error) {
            console.error('❌ 退出家庭失败:', error);
            throw error;
        }
    }

    // 验证家庭状态（新增方法）
    async validateFamilyStatus() {
        try {
            if (!this.currentFamily || !this.currentMember) {
                return false;
            }

            // 从云端验证家庭和成员是否仍然有效
            const members = await this.supabaseClient.getFamilyMembers(this.currentFamily.id);
            const currentMemberExists = members.some(member =>
                member.id === this.currentMember.id
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

    // 获取家庭成员列表
    async getFamilyMembers() {
        try {
            if (!this.currentFamily) {
                throw new Error('未加入任何家庭');
            }

            const members = await this.supabaseClient.getFamilyMembers(this.currentFamily.id);
            return members;

        } catch (error) {
            console.error('❌ 获取家庭成员失败:', error);
            throw error;
        }
    }

    // 获取家庭任务
    async getFamilyTasks() {
        try {
            if (!this.hasJoinedFamily()) {
                return [];
            }

            const tasks = await this.supabaseClient.getTasks(this.currentFamily.id);
            return tasks || [];

        } catch (error) {
            console.error('❌ 获取家庭任务失败:', error);
            return [];
        }
    }

    // === 家庭状态管理 ===

    hasJoinedFamily() {
        return !!(this.currentFamily && this.currentMember);
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

    // === 完全移除本地存储相关方法 ===
    // 删除：saveToLocalStorage()
    // 删除：restoreFromLocalStorage()  
    // 删除：clearLocalStorage()

    // === 事件系统 ===

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
    window.FamilyService = FamilyService;
}

console.log('✅ family-service.js 完全云端版本加载完成');