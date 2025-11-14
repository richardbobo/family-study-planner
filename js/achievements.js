
// 📁 js/achievements.js - 完整修复版本
class CloudAchievementSystem {
    constructor() {
        // 直接使用Supabase客户端，不再依赖其他服务
        this.supabaseClient = getSupabaseClient();
        
        // 成就定义数据（本地配置）
        this.achievementDefinitions = this.initializeAchievements();
        
        // 用户数据缓存
        this.userAchievements = [];
        this.userStats = null;
        this.isInitialized = false; // 新增初始化状态
        
        console.log('🔧 成就系统初始化 - 直接访问模式');
    }
    
    /**
     * 初始化成就系统（异步）
     */
// 在 CloudAchievementSystem 类中修改 initialize 方法
async initialize(familyId, userId) {
    try {
        console.log('🔄 初始化成就系统...', { 
            familyId: familyId, 
            userId: userId,
            familyIdType: typeof familyId,
            userIdType: typeof userId
        });
        
        // 更严格的参数检查
        if (!familyId || familyId === 'undefined' || familyId === 'null') {
            console.error('❌ 家庭ID无效:', familyId);
            return false;
        }
        
        if (!userId || userId === 'undefined' || userId === 'null') {
            console.error('❌ 用户ID无效:', userId);
            return false;
        }
        
        // 检查Supabase客户端
        if (!this.supabaseClient) {
            console.error('❌ Supabase客户端未初始化');
            return false;
        }
        
        console.log('✅ 参数验证通过，开始加载数据...');
        
        // 并行加载用户成就和统计
        const [achievements, stats] = await Promise.all([
            this.loadUserAchievements(familyId, userId),
            this.loadUserStats(familyId, userId)
        ]);
        
        this.userAchievements = achievements;
        this.userStats = stats;
        this.isInitialized = true;
        
        console.log('✅ 成就系统初始化完成', {
            成就数量: this.userAchievements.length,
            学习时长: this.userStats.totalStudyTime,
            完成任务: this.userStats.totalTasksCompleted,
            连续打卡: this.userStats.currentStreak
        });
        
        return true;
        
    } catch (error) {
        console.error('❌ 成就系统初始化失败:', error);
        this.isInitialized = false;
        return false;
    }
}
    
    /**
     * 初始化成就定义数据
     */
    initializeAchievements() {
        return {
            // 学习时长成就
            'study_time_1h': {
                id: 'study_time_1h',
                name: '学习新星',
                description: '累计学习1小时',
                type: 'study_time',
                requirement: 60, // 分钟
                reward_points: 10,
                icon: '⭐',
                category: '学习时长'
            },
            'study_time_10h': {
                id: 'study_time_10h', 
                name: '学习达人',
                description: '累计学习10小时',
                type: 'study_time',
                requirement: 600,
                reward_points: 50,
                icon: '🏆',
                category: '学习时长'
            },
            'study_time_50h': {
                id: 'study_time_50h',
                name: '学习大师',
                description: '累计学习50小时',
                type: 'study_time',
                requirement: 3000,
                reward_points: 200,
                icon: '👑',
                category: '学习时长'
            },
            
            // 连续打卡成就
            'streak_3': {
                id: 'streak_3',
                name: '习惯养成',
                description: '连续学习3天',
                type: 'streak', 
                requirement: 3,
                reward_points: 20,
                icon: '🔥',
                category: '连续打卡'
            },
            'streak_7': {
                id: 'streak_7',
                name: '坚持之星',
                description: '连续学习7天',
                type: 'streak',
                requirement: 7,
                reward_points: 100,
                icon: '💎',
                category: '连续打卡'
            },
            'streak_30': {
                id: 'streak_30',
                name: '学习狂人',
                description: '连续学习30天',
                type: 'streak',
                requirement: 30,
                reward_points: 500,
                icon: '🚀',
                category: '连续打卡'
            },
            
            // 任务完成成就
            'tasks_10': {
                id: 'tasks_10',
                name: '任务达人',
                description: '完成10个学习任务',
                type: 'total_tasks',
                requirement: 10,
                reward_points: 30,
                icon: '✅',
                category: '任务完成'
            },
            'tasks_50': {
                id: 'tasks_50',
                name: '任务大师',
                description: '完成50个学习任务',
                type: 'total_tasks',
                requirement: 50,
                reward_points: 150,
                icon: '🎯',
                category: '任务完成'
            },
            'tasks_100': {
                id: 'tasks_100',
                name: '任务王者',
                description: '完成100个学习任务',
                type: 'total_tasks',
                requirement: 100,
                reward_points: 300,
                icon: '🏅',
                category: '任务完成'
            },
            
            // 科目专项成就
            'math_expert': {
                id: 'math_expert',
                name: '数学专家',
                description: '完成20个数学任务',
                type: 'subject_tasks',
                requirement: 20,
                subject: '数学',
                reward_points: 80,
                icon: '📐',
                category: '科目专项'
            },
            'language_master': {
                id: 'language_master',
                name: '语言大师',
                description: '完成20个语言任务',
                type: 'subject_tasks',
                requirement: 20,
                subject: '语言',
                reward_points: 80,
                icon: '📚',
                category: '科目专项'
            },
            'science_pro': {
                id: 'science_pro',
                name: '科学专家',
                description: '完成20个科学任务',
                type: 'subject_tasks',
                requirement: 20,
                subject: '科学',
                reward_points: 80,
                icon: '🔬',
                category: '科目专项'
            }
        };
    }
    
    /**
     * 加载用户成就数据 - 修复版本
     */
    async loadUserAchievements(familyId, userId) {
        try {
            console.log('📥 加载用户成就数据...', { familyId, userId });
            
            const { data, error } = await this.supabaseClient
                .from('user_achievements')
                .select('*')
                .eq('family_id', familyId)
                .eq('user_id', userId);
            
            if (error) {
                console.error('❌ 查询用户成就失败:', error);
                throw error;
            }
            
            const achievements = (data || []).map(dbAchievement => {
                const definition = this.achievementDefinitions[dbAchievement.achievement_id];
                if (!definition) {
                    console.warn(`❌ 找不到成就定义: ${dbAchievement.achievement_id}`);
                    return null;
                }
                
                return {
                    ...definition, // 先展开定义（包含图标等基础信息）
                    ...dbAchievement, // 再展开数据库记录（覆盖相同字段）
                    unlocked: true, // 数据库中有记录就是已解锁
                    progress: 100, // 已解锁的成就进度为100%
                    unlocked_at: dbAchievement.unlocked_at // 使用数据库中的解锁时间
                };
            }).filter(achievement => achievement !== null); // 过滤掉找不到定义的成就
            
            console.log(`✅ 加载了 ${achievements.length} 个用户成就`);
            return achievements;
            
        } catch (error) {
            console.error('加载用户成就失败:', error);
            return [];
        }
    }
    
    /**
     * 加载用户学习统计 - 修复版本
     */
    async loadUserStats(familyId, userId) {
        try {
            console.log('📊 加载用户统计...', { familyId, userId });
            
            // 使用 Promise.all 并行查询
            const [timeResult, taskResult] = await Promise.all([
                // 获取总学习时长
                this.supabaseClient
                    .from('completion_records')
                    .select('actual_duration')
                    .eq('completed_by', userId),
                
                // 获取完成任务数量
                this.supabaseClient
                    .from('study_tasks')
                    .select('id, subject, date')
                    .eq('assigned_to', userId)
                    .eq('completed', true)
                    .eq('family_id', familyId)
            ]);
            
            if (timeResult.error) console.error('学习时长统计错误:', timeResult.error);
            if (taskResult.error) console.error('任务统计错误:', taskResult.error);
            
            // 计算连续打卡
            const currentStreak = await this.calculateCurrentStreak(familyId, userId);
            
            // 计算科目分布
            const subjectDistribution = this.calculateSubjectDistribution(taskResult.data || []);
            
            const totalStudyTime = timeResult.data?.reduce((sum, record) => 
                sum + (record.actual_duration || 0), 0) || 0;
            
            const stats = {
                totalStudyTime: totalStudyTime,
                totalTasksCompleted: taskResult.data?.length || 0,
                currentStreak: currentStreak,
                subjectDistribution: subjectDistribution
            };
            
            console.log('✅ 用户统计加载完成:', stats);
            return stats;
            
        } catch (error) {
            console.error('❌ 用户统计加载失败:', error);
            return {
                totalStudyTime: 0,
                totalTasksCompleted: 0,
                currentStreak: 0,
                subjectDistribution: {}
            };
        }
    }
    
    /**
     * 计算当前连续打卡天数 - 修复版本
     */
    async calculateCurrentStreak(familyId, userId) {
        try {
            const { data, error } = await this.supabaseClient
                .from('study_tasks')
                .select('date')
                .eq('assigned_to', userId)
                .eq('completed', true)
                .eq('family_id', familyId)
                .order('date', { ascending: false });
            
            if (error) {
                console.error('查询打卡记录失败:', error);
                return 0;
            }
            
            if (!data || data.length === 0) return 0;
            
            let streak = 0;
            const today = new Date();
            const oneDay = 24 * 60 * 60 * 1000;
            
            // 去重并排序日期
            const uniqueDates = [...new Set(data.map(task => task.date))].sort().reverse();
            
            // 检查今天是否有学习
            const todayStr = today.toISOString().split('T')[0];
            let currentDate = todayStr;
            
            for (let i = 0; i < uniqueDates.length; i++) {
                const taskDate = uniqueDates[i];
                
                // 如果日期连续，增加连续天数
                if (taskDate === currentDate) {
                    streak++;
                    
                    // 计算下一天
                    const nextDate = new Date(currentDate);
                    nextDate.setDate(nextDate.getDate() - 1);
                    currentDate = nextDate.toISOString().split('T')[0];
                } else {
                    break;
                }
            }
            
            console.log(`📅 连续打卡计算: ${streak} 天`);
            return streak;
            
        } catch (error) {
            console.error('计算连续打卡失败:', error);
            return 0;
        }
    }
    
    /**
     * 计算科目分布
     */
    calculateSubjectDistribution(tasks) {
        const distribution = {};
        tasks.forEach(task => {
            distribution[task.subject] = (distribution[task.subject] || 0) + 1;
        });
        return distribution;
    }
    
    /**
     * 解锁成就 - 修复版本
     */
    async unlockAchievement(familyId, userId, achievementId) {
        try {
            console.log(`🎉 尝试解锁成就: ${achievementId}`);
            
            const achievement = this.achievementDefinitions[achievementId];
            if (!achievement) {
                throw new Error(`未知的成就ID: ${achievementId}`);
            }
            
            // 检查是否已经解锁
            const alreadyUnlocked = this.userAchievements.some(
                ua => ua.achievement_id === achievementId
            );
            
            if (alreadyUnlocked) {
                console.log('ℹ️ 成就已解锁，跳过');
                return false; // 返回false表示没有新解锁
            }
            
            console.log(`🔓 解锁新成就: ${achievement.name}`);
            
            // 插入成就记录
            const { data, error } = await this.supabaseClient
                .from('user_achievements')
                .insert({
                    family_id: familyId,
                    user_id: userId,
                    achievement_id: achievementId,
                    unlocked_at: new Date().toISOString(),
                    progress: 100,
                    claimed: true
                })
                .select();
            
            if (error) {
                console.error('❌ 解锁成就失败:', error);
                return false;
            }
            
            // 奖励积分
            await this.rewardPoints(userId, achievement.reward_points);
            
            // 更新本地缓存
            this.userAchievements.push({
                ...achievement,
                ...data[0],
                unlocked: true
            });
            
            console.log(`✅ 成就解锁成功: ${achievement.name}`);
            
            // 触发成就解锁事件
            this.triggerAchievementUnlocked(achievement);
            
            return true; // 返回true表示成功解锁
            
        } catch (error) {
            console.error('❌ 解锁成就异常:', error);
            return false;
        }
    }
    
    /**
     * 触发成就解锁事件
     */
    triggerAchievementUnlocked(achievement) {
        // 创建自定义事件
        const event = new CustomEvent('achievement:unlocked', {
            detail: {
                achievement: achievement,
                timestamp: new Date().toISOString()
            }
        });
        
        // 派发事件
        window.dispatchEvent(event);
        
        // 显示通知
        if (window.showNotification) {
            window.showNotification(
                `🎉 成就解锁！${achievement.icon} ${achievement.name}`,
                'success'
            );
        }
    }
    
    /**
     * 奖励积分
     */
    async rewardPoints(userId, points) {
        try {
            // 先获取当前积分
            const { data: memberData, error: memberError } = await this.supabaseClient
                .from('family_members')
                .select('points')
                .eq('id', userId)
                .single();
            
            if (memberError) throw memberError;
            
            // 更新积分
            const newPoints = (memberData.points || 0) + points;
            const { error: updateError } = await this.supabaseClient
                .from('family_members')
                .update({ points: newPoints })
                .eq('id', userId);
            
            if (updateError) throw updateError;
            
            console.log(`💰 积分奖励: +${points} (总计: ${newPoints})`);
            return true;
            
        } catch (error) {
            console.error('❌ 积分奖励失败:', error);
            return false;
        }
    }
    
    /**
     * 检查并解锁符合条件的成就 - 修复版本
     */
    async checkAndUnlockAchievements(familyId, userId) {
        try {
            console.log('🔍 开始检查成就解锁条件...');
            
            if (!this.isInitialized) {
                console.log('🔄 成就系统未初始化，先初始化...');
                await this.initialize(familyId, userId);
            }
            
            // 重新加载最新统计数据
            const stats = await this.loadUserStats(familyId, userId);
            if (!stats) {
                console.error('❌ 无法加载用户统计');
                return [];
            }
            
            const unlockedAchievements = [];
            
            // 检查每个成就的解锁条件
            for (const [achievementId, achievement] of Object.entries(this.achievementDefinitions)) {
                // 跳过已解锁的成就
                const alreadyUnlocked = this.userAchievements.some(
                    ua => ua.achievement_id === achievementId
                );
                
                if (alreadyUnlocked) {
                    console.log(`ℹ️ 成就已解锁，跳过: ${achievement.name}`);
                    continue;
                }
                
                let shouldUnlock = false;
                let currentValue = 0;
                
                // 根据成就类型检查条件
                switch (achievement.type) {
                    case 'study_time':
                        currentValue = stats.totalStudyTime;
                        shouldUnlock = currentValue >= achievement.requirement;
                        break;
                        
                    case 'total_tasks':
                        currentValue = stats.totalTasksCompleted;
                        shouldUnlock = currentValue >= achievement.requirement;
                        break;
                        
                    case 'streak':
                        currentValue = stats.currentStreak;
                        shouldUnlock = currentValue >= achievement.requirement;
                        break;
                        
                    case 'subject_tasks':
                        currentValue = stats.subjectDistribution[achievement.subject] || 0;
                        shouldUnlock = currentValue >= achievement.requirement;
                        break;
                }
                
                console.log(`📊 检查成就: ${achievement.name}`, {
                    类型: achievement.type,
                    当前值: currentValue,
                    要求: achievement.requirement,
                    是否解锁: shouldUnlock
                });
                
                if (shouldUnlock) {
                    const success = await this.unlockAchievement(familyId, userId, achievementId);
                    if (success) {
                        unlockedAchievements.push(achievement);
                        console.log(`🎯 新成就解锁: ${achievement.name}`);
                    }
                }
            }
            
            console.log(`🎉 本次检查解锁了 ${unlockedAchievements.length} 个新成就`);
            return unlockedAchievements;
            
        } catch (error) {
            console.error('❌ 检查成就失败:', error);
            return [];
        }
    }
    
    /**
     * 获取成就进度信息
     */
    getAchievementProgress(achievementId, stats) {
        const achievement = this.achievementDefinitions[achievementId];
        if (!achievement || !stats) return 0;
        
        let current = 0;
        
        switch (achievement.type) {
            case 'study_time':
                current = stats.totalStudyTime;
                break;
            case 'total_tasks':
                current = stats.totalTasksCompleted;
                break;
            case 'streak':
                current = stats.currentStreak;
                break;
            case 'subject_tasks':
                current = stats.subjectDistribution[achievement.subject] || 0;
                break;
        }
        
        const progress = Math.min(100, Math.round((current / achievement.requirement) * 100));
        return progress;
    }
    
    /**
     * 获取所有成就及其进度
     */
    getAllAchievementsWithProgress(stats) {
        const achievementsWithProgress = [];
        
        for (const [achievementId, achievement] of Object.entries(this.achievementDefinitions)) {
            // 检查是否已解锁
            const unlockedAchievement = this.userAchievements.find(
                ua => ua.achievement_id === achievementId
            );
            
            const unlocked = !!unlockedAchievement;
            const progress = unlocked ? 100 : this.getAchievementProgress(achievementId, stats);
            
            achievementsWithProgress.push({
                ...achievement,
                unlocked: unlocked,
                progress: progress,
                unlocked_at: unlocked ? unlockedAchievement.unlocked_at : null,
                icon: achievement.icon,
                name: achievement.name,
                description: achievement.description,
                reward_points: achievement.reward_points
            });
        }
        
        // 按类别分组
        const grouped = {};
        achievementsWithProgress.forEach(achievement => {
            if (!grouped[achievement.category]) {
                grouped[achievement.category] = [];
            }
            grouped[achievement.category].push(achievement);
        });
        
        return grouped;
    }
    
    /**
     * 强制刷新用户数据
     */
    async refreshUserData(familyId, userId) {
        try {
            console.log('🔄 强制刷新用户数据...');
            
            const [achievements, stats] = await Promise.all([
                this.loadUserAchievements(familyId, userId),
                this.loadUserStats(familyId, userId)
            ]);
            
            this.userAchievements = achievements;
            this.userStats = stats;
            
            console.log('✅ 用户数据刷新完成');
            return true;
            
        } catch (error) {
            console.error('❌ 刷新用户数据失败:', error);
            return false;
        }
    }
}