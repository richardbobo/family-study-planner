// 家庭管理服务
class FamilyService {
    constructor() {
        this.supabaseClient = getSupabaseClient();
        this.dataService = getDataService();
        this.currentFamily = null;
        this.currentMember = null;
        this.isInitialized = false;

        this.init();
    }

    // 初始化服务
    async init() {
        console.log('🏠 家庭服务初始化...');

        // 尝试从本地存储恢复家庭信息
        await this.restoreFromLocalStorage();

        this.isInitialized = true;
        console.log('✅ 家庭服务初始化完成');

        // 触发初始化完成事件
        this.emitFamilyEvent('serviceInitialized', {
            family: this.currentFamily,
            member: this.currentMember
        });
    }

    // === 家庭管理核心方法 ===

    // 创建新家庭
    async createFamily(familyName, creatorName = '家长') {
        try {
            if (!this.supabaseClient.isConnected) {
                throw new Error('Supabase 未连接，无法创建家庭');
            }

            console.log(`🏠 创建新家庭: ${familyName}`);

            // 在 Supabase 中创建家庭
            const family = await this.supabaseClient.createFamily(familyName);

            // 添加创建者为家庭成员（家长角色）
            const member = await this.supabaseClient.joinFamily(
                family.family_code,
                creatorName,
                'parent'
            );

            // 设置当前家庭和成员
            this.currentFamily = family;
            this.currentMember = member.member;

            // 保存到本地存储
            await this.saveToLocalStorage();

            // 触发家庭创建事件
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


   // 加入现有家庭（修复版本）
async joinFamily(familyCode, userName, role = 'child') {
    try {
        if (!this.supabaseClient.isConnected) {
            throw new Error('Supabase 未连接，无法加入家庭');
        }
        
        console.log(`🔗 加入家庭: ${familyCode}, 用户: ${userName}`);
        
        // 首先验证家庭码
        const result = await this.supabaseClient.joinFamily(familyCode, userName, role);
        
        // 设置当前家庭和成员
        this.currentFamily = result.family;
        this.currentMember = result.member;
        
        // 保存到本地存储
        await this.saveToLocalStorage();
        
        // 触发家庭加入事件
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
        
        // 如果是重复加入错误，提供更友好的错误信息
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

                // 注意：这里只是本地退出，Supabase 中的成员记录仍然保留
                // 如果需要完全删除，可以调用 Supabase 删除接口

                // 清除本地状态
                this.currentFamily = null;
                this.currentMember = null;

                // 清除本地存储
                await this.clearLocalStorage();

                // 触发退出事件
                this.emitFamilyEvent('familyLeft');

                console.log('✅ 已退出家庭');
            }

            return true;

        } catch (error) {
            console.error('❌ 退出家庭失败:', error);
            throw error;
        }
    }

    // 获取家庭成员列表
    async getFamilyMembers() {
        try {
            if (!this.currentFamily) {
                throw new Error('未加入任何家庭');
            }

            if (!this.supabaseClient.isConnected) {
                throw new Error('Supabase 未连接');
            }

            // 调用 Supabase 获取成员列表
            // 注意：需要在 supabase-client.js 中添加这个方法
            const members = await this.supabaseClient.getFamilyMembers(this.currentFamily.id);

            return members;

        } catch (error) {
            console.error('❌ 获取家庭成员失败:', error);
            throw error;
        }
    }

    // === 家庭状态管理 ===

    // 检查是否已加入家庭
    hasJoinedFamily() {
        return !!(this.currentFamily && this.currentMember);
    }

    // 获取当前家庭信息
    getCurrentFamily() {
        return this.currentFamily;
    }

    // 获取当前成员信息
    getCurrentMember() {
        return this.currentMember;
    }

    // 检查是否是家长
    isParent() {
        return this.currentMember && this.currentMember.role === 'parent';
    }

    // 检查是否是孩子
    isChild() {
        return this.currentMember && this.currentMember.role === 'child';
    }

    // === 数据迁移 ===

    // 将本地数据迁移到当前家庭
    async migrateLocalDataToFamily() {
        try {
            if (!this.hasJoinedFamily()) {
                throw new Error('未加入家庭，无法迁移数据');
            }

            console.log('🔄 开始迁移本地数据到家庭...');

            const localTasks = this.dataService.getTasksFromLocalStorage();
            console.log(`📝 找到 ${localTasks.length} 个本地任务需要迁移`);

            let migratedCount = 0;
            let errorCount = 0;

            for (const localTask of localTasks) {
                try {
                    // 转换任务格式，添加家庭信息
                    const familyTask = {
                        ...localTask,
                        family_id: this.currentFamily.id,
                        assigned_to: this.currentMember.id,
                        created_by: this.currentMember.id,
                        local_id: localTask.id // 保存原始ID用于参考
                    };

                    // 在 Supabase 中创建任务
                    await this.supabaseClient.createTask(familyTask);
                    migratedCount++;

                } catch (taskError) {
                    console.error(`❌ 迁移任务失败 (ID: ${localTask.id}):`, taskError);
                    errorCount++;
                }
            }

            console.log(`✅ 数据迁移完成: ${migratedCount} 成功, ${errorCount} 失败`);

            // 触发迁移完成事件
            this.emitFamilyEvent('dataMigrated', {
                total: localTasks.length,
                success: migratedCount,
                failed: errorCount
            });

            return {
                total: localTasks.length,
                success: migratedCount,
                failed: errorCount
            };

        } catch (error) {
            console.error('❌ 数据迁移失败:', error);
            throw error;
        }
    }

    // === 本地存储管理 ===

    // 保存家庭信息到本地存储
    async saveToLocalStorage() {
        try {
            const familyInfo = {
                family: this.currentFamily,
                member: this.currentMember,
                savedAt: new Date().toISOString()
            };

            localStorage.setItem(
                APP_CONFIG.CONSTANTS.STORAGE_KEYS.FAMILY_INFO,
                JSON.stringify(familyInfo)
            );

            console.log('💾 家庭信息已保存到本地存储');

        } catch (error) {
            console.error('❌ 保存家庭信息失败:', error);
        }
    }

    // 从本地存储恢复家庭信息
    // 在 restoreFromLocalStorage 方法中，更新字段引用
    async restoreFromLocalStorage() {
        try {
            const saved = localStorage.getItem(APP_CONFIG.CONSTANTS.STORAGE_KEYS.FAMILY_INFO);

            if (saved) {
                const familyInfo = JSON.parse(saved);
                this.currentFamily = familyInfo.family;
                this.currentMember = familyInfo.member;

                console.log('🔍 从本地存储恢复家庭信息');
                console.log(`🏠 家庭: ${this.currentFamily?.family_name} (${this.currentFamily?.family_code})`);
                console.log(`👤 成员: ${this.currentMember?.user_name} (${this.currentMember?.role})`);

                // 触发恢复事件
                this.emitFamilyEvent('familyRestored', {
                    family: this.currentFamily,
                    member: this.currentMember
                });
            } else {
                console.log('📝 本地存储中没有家庭信息');
            }

        } catch (error) {
            console.error('❌ 恢复家庭信息失败:', error);
            // 清除损坏的存储数据
            this.clearLocalStorage();
        }
    }

    // 清除本地存储的家庭信息
    async clearLocalStorage() {
        try {
            localStorage.removeItem(APP_CONFIG.CONSTANTS.STORAGE_KEYS.FAMILY_INFO);
            console.log('🧹 已清除本地家庭信息');
        } catch (error) {
            console.error('❌ 清除家庭信息失败:', error);
        }
    }

    // === 事件系统 ===

    // 触发家庭相关事件
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

    // 监听家庭事件
    on(eventType, callback) {
        if (typeof window !== 'undefined') {
            window.addEventListener(`family:${eventType}`, (event) => {
                callback(event.detail);
            });
        }
    }

    // 移除事件监听
    off(eventType, callback) {
        if (typeof window !== 'undefined') {
            window.removeEventListener(`family:${eventType}`, callback);
        }
    }
}

// // 创建全局实例
// let familyServiceInstance = null;

// // 获取家庭服务实例
// function getFamilyService() {
//     if (!familyServiceInstance) {
//         familyServiceInstance = new FamilyService();
//     }
//     return familyServiceInstance;
// }

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FamilyService, getFamilyService };
}
// 在 FamilyService 类中添加

/**
 * 获取家庭任务
 */
async getFamilyTasks() {
    try {
        if (!this.hasJoinedFamily()) {
            return [];
        }

        if (!this.supabaseClient.isConnected) {
            throw new Error('Supabase 未连接');
        }

        // 调用 Supabase 获取家庭任务
        const tasks = await this.supabaseClient.getFamilyTasks(this.currentFamily.id);
        
        return tasks || [];

    } catch (error) {
        console.error('❌ 获取家庭任务失败:', error);
        return [];
    }
}
// // 创建全局实例
let familyServiceInstance = null;

// 获取家庭服务实例
function getFamilyService() {
    if (!familyServiceInstance) {
        familyServiceInstance = new FamilyService();
    }
    return familyServiceInstance;
}

// 确保在浏览器环境中可用
if (typeof window !== 'undefined') {
    window.getFamilyService = getFamilyService;
    window.FamilyService = FamilyService; // 也导出类，以备不时之需
}