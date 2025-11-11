// 📁 js/achievements_page.js
document.addEventListener('DOMContentLoaded', async function () {
    console.log('🎯 成就页面初始化...');

    // 显示加载状态
    showLoadingState();

    try {
        // 获取家庭和用户信息
        const familyService = getFamilyService();
        // 确保家庭服务已初始化
        if (typeof familyService.initialize === 'function') {
            await familyService.initialize();
        } else {
            console.warn('⚠️ FamilyService没有initialize方法，使用现有状态');
        }

        const family = familyService.getCurrentFamily();
        const member = familyService.getCurrentMember();

        if (!family || !member) {
            showErrorState('请先选择家庭或成员');
            return;
        }

        console.log('👨‍👩‍👧‍👦 当前用户:', {
            family: family.family_name,
            member: member.user_name
        });

        // 直接使用成就系统（不再依赖dataService）
        const achievementSystem = new CloudAchievementSystem();

        // 并行加载数据
        const [achievements, stats] = await Promise.all([
            achievementSystem.loadUserAchievements(family.id, member.id),
            achievementSystem.loadUserStats(family.id, member.id)
        ]);

        // 渲染成就页面
        await renderAchievements(achievementSystem, stats);

        // 隐藏加载状态
        hideLoadingState();

        console.log('✅ 成就页面初始化完成');

    } catch (error) {
        console.error('❌ 成就页面初始化失败:', error);
        showErrorState('加载成就数据失败: ' + error.message);
    }
});

/**
 * 显示加载状态
 */
function showLoadingState() {
    const container = document.getElementById('achievementsContainer');
    if (container) {
        container.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>正在加载成就数据...</p>
            </div>
        `;
    }
}

/**
 * 隐藏加载状态
 */
function hideLoadingState() {
    const loadingState = document.querySelector('.loading-state');
    if (loadingState) {
        loadingState.remove();
    }
}

/**
 * 显示错误状态
 */
function showErrorState(message) {
    const container = document.getElementById('achievementsContainer');
    if (container) {
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>加载失败</h3>
                <p>${message}</p>
                <button class="retry-btn" onclick="window.location.reload()">重新加载</button>
            </div>
        `;
    }
}

/**
 * 渲染成就页面
 */
async function renderAchievements(achievementSystem, stats) {
    const container = document.getElementById('achievementsContainer');
    if (!container) {
        console.error('❌ 找不到成就容器');
        return;
    }
    
    try {
        // 获取分组后的成就数据
        const groupedAchievements = achievementSystem.getAllAchievementsWithProgress(stats);
        
        let html = '';
        
        // 渲染统计信息（传入achievementSystem以计算成就统计）
        html += renderStatsSection(stats, achievementSystem);
        
        // 渲染各个成就类别
        for (const [category, achievements] of Object.entries(groupedAchievements)) {
            html += renderAchievementCategory(category, achievements);
        }
        
        container.innerHTML = html;
        
        // 绑定事件监听器
        bindEventListeners();
        
        console.log('✅ 成就渲染完成');
        
    } catch (error) {
        console.error('❌ 渲染成就失败:', error);
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">❌</div>
                <h3>渲染错误</h3>
                <p>显示成就数据时发生错误</p>
                <button class="retry-btn" onclick="window.location.reload()">重新加载</button>
            </div>
        `;
    }
}


/**
 * 渲染统计信息部分
 */
function renderStatsSection(stats, achievementSystem) {
    if (!stats) return '';

    const totalAchievements = Object.keys(achievementSystem.achievementDefinitions).length;
    const unlockedAchievements = achievementSystem.userAchievements.length;
    const completionRate = totalAchievements > 0 ? Math.round((unlockedAchievements / totalAchievements) * 100) : 0;

    return `
        <div class="stats-section">
            <h2>学习统计</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">🎯</div>
                    <div class="stat-value">${unlockedAchievements}/${totalAchievements}</div>
                    <div class="stat-label">成就进度</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-value">${completionRate}%</div>
                    <div class="stat-label">完成率</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⏱️</div>
                    <div class="stat-value">${Math.round(stats.totalStudyTime / 60)}h</div>
                    <div class="stat-label">总学习时长</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">✅</div>
                    <div class="stat-value">${stats.totalTasksCompleted}</div>
                    <div class="stat-label">完成任务</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🔥</div>
                    <div class="stat-value">${stats.currentStreak}天</div>
                    <div class="stat-label">连续打卡</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🏆</div>
                    <div class="stat-value">${stats.totalPoints || 0}</div>
                    <div class="stat-label">总积分</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * 渲染成就类别
 */
function renderAchievementCategory(category, achievements) {
    return `
        <div class="achievement-category">
            <h2>${category}</h2>
            <div class="achievements-grid">
                ${achievements.map(achievement => renderAchievementCard(achievement)).join('')}
            </div>
        </div>
    `;
}

/**
 * 渲染单个成就卡片
 */
function renderAchievementCard(achievement) {
    const unlockedClass = achievement.unlocked ? 'unlocked' : 'locked';
    
    // 🔧 修复：已解锁的成就不显示进度条，显示完成日期
    const progressContent = achievement.unlocked ? 
        renderUnlockedContent(achievement) : 
        renderProgressContent(achievement);
    
    return `
        <div class="achievement-card ${unlockedClass}" data-achievement-id="${achievement.id}">
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-content">
                <h3 class="achievement-title">${achievement.name}</h3>
                <p class="achievement-description">${achievement.description}</p>
                <div class="achievement-reward">奖励: ${achievement.reward_points} 积分</div>
                ${progressContent}
            </div>
            ${achievement.unlocked ? '<div class="unlocked-badge">已解锁</div>' : ''}
        </div>
    `;
}

/**
 * 渲染已解锁成就的内容（不显示进度条，显示完成日期）
 */
function renderUnlockedContent(achievement) {
    const unlockedDate = achievement.unlocked_at ? 
        new Date(achievement.unlocked_at).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) : '未知日期';
    
    return `
        <div class="unlocked-info">
            <div class="completion-date">
                <span class="date-icon">📅</span>
                <span class="date-text">${unlockedDate}</span>
            </div>
            <div class="completion-badge">已完成</div>
        </div>
    `;
}
/**
 * 渲染未解锁成就的内容（显示进度条）
 */
function renderProgressContent(achievement) {
    return `
        <div class="progress-info">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${achievement.progress}%"></div>
            </div>
            <div class="progress-text">${achievement.progress}%</div>
        </div>
    `;
}
/**
 * 绑定事件监听器
 */
function bindEventListeners() {
    // 返回按钮
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', function () {
            window.location.href = 'index.html';
        });
    }

    // 成就卡片点击事件
    const achievementCards = document.querySelectorAll('.achievement-card');
    achievementCards.forEach(card => {
        card.addEventListener('click', function () {
            const achievementId = this.getAttribute('data-achievement-id');
            console.log('点击成就:', achievementId);
            // 这里可以添加成就详情显示逻辑
        });
    });
}

/**
 * 手动检查成就（用于调试）
 */
window.checkAchievements = async function () {
    try {
        const familyService = getFamilyService();
        const family = familyService.getCurrentFamily();
        const member = familyService.getCurrentMember();

        if (!family || !member) {
            alert('请先选择家庭和成员');
            return;
        }

        const achievementSystem = new CloudAchievementSystem();
        const unlocked = await achievementSystem.checkAndUnlockAchievements(family.id, member.id);

        if (unlocked.length > 0) {
            alert(`解锁了 ${unlocked.length} 个新成就！`);
            window.location.reload();
        } else {
            alert('暂无新成就可解锁');
        }
    } catch (error) {
        console.error('检查成就失败:', error);
        alert('检查成就失败: ' + error.message);
    }
};