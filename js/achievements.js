// 📁 js/achievements.js
class CloudAchievementSystem {
    constructor() {
        // 直接使用Supabase客户端，不再依赖其他服务
        this.supabaseClient = getSupabaseClient();
        
        // 成就定义数据（本地配置）
        this.achievementDefinitions = this.initializeAchievements();
        
        // 用户数据缓存
        this.userAchievements = [];
        this.userStats = null;
        
        console.log('🔧 成就系统初始化 - 直接访问模式');
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
     * 加载用户成就数据
     */
     async loadUserAchievements(familyId, userId) {
        try {
            const { data, error } = await this.supabaseClient
                .from('user_achievements')
                .select('*')
                .eq('family_id', familyId)
                .eq('user_id', userId);
            
            if (error) throw error;
            
            this.userAchievements = data || [];
            
            // 🔧 修复：正确合并数据库记录和本地定义
            return this.userAchievements.map(dbAchievement => {
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
            
        } catch (error) {
            console.error('加载用户成就失败:', error);
            return [];
        }
    }
    
    /**
     * 加载用户学习统计
     */
    async loadUserStats(familyId, userId) {
        try {
            console.log('📊 加载用户统计...', { familyId, userId });
            
            // 获取总学习时长
            const { data: timeData, error: timeError } = await this.supabaseClient
                .from('completion_records')
                .select('actual_duration')
                .eq('completed_by', userId);
            
            if (timeError) console.error('学习时长统计错误:', timeError);
            
            // 获取完成任务数量
            const { data: taskData, error: taskError } = await this.supabaseClient
                .from('study_tasks')
                .select('id, subject, date')
                .eq('assigned_to', userId)
                .eq('completed', true)
                .eq('family_id', familyId);
            
            if (taskError) console.error('任务统计错误:', taskError);
            
            // 计算连续打卡
            const currentStreak = await this.calculateCurrentStreak(familyId, userId);
            
            // 计算科目分布
            const subjectDistribution = this.calculateSubjectDistribution(taskData || []);
            
            this.userStats = {
                totalStudyTime: timeData?.reduce((sum, record) => sum + (record.actual_duration || 0), 0) || 0,
                totalTasksCompleted: taskData?.length || 0,
                currentStreak: currentStreak,
                subjectDistribution: subjectDistribution
            };
            
            console.log('✅ 用户统计加载完成:', this.userStats);
            return this.userStats;
            
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
     * 计算当前连续打卡天数
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
            
            if (error || !data || data.length === 0) return 0;
            
            let streak = 0;
            const today = new Date();
            const oneDay = 24 * 60 * 60 * 1000;
            
            // 检查今天是否有学习
            const todayStr = today.toISOString().split('T')[0];
            const hasToday = data.some(task => task.date === todayStr);
            if (hasToday) streak = 1;
            
            // 检查连续天数
            for (let i = hasToday ? 1 : 0; i < data.length; i++) {
                const currentDate = new Date(data[i].date);
                const prevDate = new Date(data[i-1]?.date);
                
                const diffDays = Math.round((prevDate - currentDate) / oneDay);
                
                if (diffDays === 1) {
                    streak++;
                } else {
                    break;
                }
            }
            
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
     * 解锁成就
     */
    async unlockAchievement(familyId, userId, achievementId) {
        try {
            console.log(`🎉 解锁成就: ${achievementId}`);
            
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
                return true;
            }
            
            // 直接插入成就记录
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
            this.userAchievements.push(data[0]);
            
            console.log(`✅ 成就解锁成功: ${achievement.name}`);
            return true;
            
        } catch (error) {
            console.error('❌ 解锁成就异常:', error);
            return false;
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
     * 检查并解锁符合条件的成就
     */
    async checkAndUnlockAchievements(familyId, userId) {
        try {
            console.log('🔍 检查成就解锁条件...');
            
            // 重新加载最新数据
            const stats = await this.loadUserStats(familyId, userId);
            if (!stats) return [];
            
            const unlockedAchievements = [];
            
            // 检查每个成就的解锁条件
            for (const [achievementId, achievement] of Object.entries(this.achievementDefinitions)) {
                // 跳过已解锁的成就
                const alreadyUnlocked = this.userAchievements.some(
                    ua => ua.achievement_id === achievementId
                );
                if (alreadyUnlocked) continue;
                
                let shouldUnlock = false;
                
                // 根据成就类型检查条件
                switch (achievement.type) {
                    case 'study_time':
                        shouldUnlock = stats.totalStudyTime >= achievement.requirement;
                        break;
                        
                    case 'total_tasks':
                        shouldUnlock = stats.totalTasksCompleted >= achievement.requirement;
                        break;
                        
                    case 'streak':
                        shouldUnlock = stats.currentStreak >= achievement.requirement;
                        break;
                        
                    case 'subject_tasks':
                        const subjectCount = stats.subjectDistribution[achievement.subject] || 0;
                        shouldUnlock = subjectCount >= achievement.requirement;
                        break;
                }
                
                if (shouldUnlock) {
                    const success = await this.unlockAchievement(familyId, userId, achievementId);
                    if (success) {
                        unlockedAchievements.push(achievement);
                    }
                }
            }
            
            console.log(`🎯 解锁了 ${unlockedAchievements.length} 个新成就`);
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
                unlocked_at: unlocked ? unlockedAchievement.unlocked_at : null, // 🔧 添加解锁时间
                // 🔧 确保图标信息正确传递
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
}