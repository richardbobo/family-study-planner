// 📁 js/achievements_page.js
document.addEventListener('DOMContentLoaded', async function () {
    console.log('🎯 成就页面初始化...');

    // 🔧 修复：按正确顺序初始化
    // 1. 立即绑定返回按钮（最高优先级）
    bindBackButtonEvent();
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
            showFamilyRequiredState(); // 显示友好的家庭要求提示
            return;
        }

        console.log('👨‍👩‍👧‍👦 当前用户:', {
            family: family.family_name,
            member: member.user_name
        });

        // 🔧 修复：使用全局的成就系统实例，或者正确初始化新的实例
        let achievementSystem;
        
        // 检查是否已经有全局的成就系统实例
        if (window.achievementSystem && window.achievementSystem.isInitialized) {
            console.log('🔄 使用已初始化的成就系统');
            achievementSystem = window.achievementSystem;
        } else {
            console.log('🔄 创建新的成就系统实例');
            achievementSystem = new CloudAchievementSystem();
            
            // 🔧 修复：必须调用 initialize 方法
            const success = await achievementSystem.initialize(family.id, member.id);
            if (!success) {
                throw new Error('成就系统初始化失败');
            }
            
            // 保存到全局变量供其他页面使用
            window.achievementSystem = achievementSystem;
        }

        // 🔧 修复：直接使用成就系统的数据，不需要重新加载
        const stats = achievementSystem.userStats;
        const userAchievements = achievementSystem.userAchievements;

        console.log('📊 成就系统数据:', {
            用户成就数量: userAchievements.length,
            统计信息: stats,
            已解锁成就: userAchievements.map(a => a.name)
        });

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
 * 🔧 新增：独立绑定返回按钮事件
 * 在页面加载时立即执行，确保返回按钮始终可用
 */
function bindBackButtonEvent() {
    console.log('🔧 绑定返回按钮事件...');

    const backButton = document.getElementById('backButton');
    if (!backButton) {
        console.warn('⚠️ 找不到返回按钮，将在DOM就绪后重试');
        // 如果按钮还不存在，稍后重试
        setTimeout(bindBackButtonEvent, 100);
        return;
    }

    // 移除可能存在的旧事件监听器
    const newBackButton = backButton.cloneNode(true);
    backButton.parentNode.replaceChild(newBackButton, backButton);

    // 绑定点击事件
    newBackButton.addEventListener('click', function (e) {
        e.preventDefault();
        console.log('🔙 返回按钮被点击');
        goBackToHome();
    });

    // 添加键盘事件支持
    newBackButton.addEventListener('keypress', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            goBackToHome();
        }
    });

    // 添加触摸事件支持（移动端）
    newBackButton.addEventListener('touchstart', function (e) {
        e.preventDefault();
        this.style.transform = 'scale(0.95)';
    });

    newBackButton.addEventListener('touchend', function (e) {
        e.preventDefault();
        this.style.transform = 'scale(1)';
        goBackToHome();
    });

    console.log('✅ 返回按钮事件绑定成功');
}

/**
 * 显示家庭要求状态 - 友好的引导界面
 */
function showFamilyRequiredState() {
    const container = document.getElementById('achievementsContainer');
    if (container) {
        container.innerHTML = `
            <div class="family-required-state">
                <div class="family-required-icon">👨‍👩‍👧‍👦</div>
                <h2>加入家庭，解锁成就</h2>
                <p class="family-required-description">
                    成就系统需要您先创建或加入一个家庭。<br>
                    与家人一起学习，共同成长，解锁更多精彩成就！
                </p>
                <div class="family-required-actions">
                    <button class="btn-create-family" onclick="goToFamilyManagement('create')">
                        <i class="fas fa-plus-circle"></i> 创建家庭
                    </button>
                    <button class="btn-join-family" onclick="goToFamilyManagement('join')">
                        <i class="fas fa-user-plus"></i> 加入家庭
                    </button>
                    <button class="btn-back-home" onclick="goBackToHome()">
                        <i class="fas fa-home"></i> 返回首页
                    </button>
                </div>
                <div class="family-features">
                    <h3>加入家庭后，您可以：</h3>
                    <ul>
                        <li>📊 查看学习统计和进度</li>
                        <li>🎯 解锁各种学习成就</li>
                        <li>👥 与家人分享学习成果</li>
                        <li>🏆 获得积分和奖励</li>
                    </ul>
                </div>
            </div>
        `;
    }
    hideLoadingState();
    // 🔧 修复：确保返回按钮在显示家庭要求状态后仍然可用
    setTimeout(bindBackButtonEvent, 50);
}

/**
 * 跳转到家庭管理页面
 */
function goToFamilyManagement(action = '') {
    let url = 'family-management.html';
    if (action) {
        url += `?action=${action}`;
    }
    window.location.href = url;
}

/**
 * 返回首页
 */
function goBackToHome() {
    window.location.href = 'index.html';
}

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
 * 显示错误状态 - 改进版本
 */
function showErrorState(message) {
    const container = document.getElementById('achievementsContainer');
    if (container) {
        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>加载失败</h3>
                <p>${message}</p>
                <div class="error-actions">
                    <button class="retry-btn" onclick="window.location.reload()">
                        <i class="fas fa-redo"></i> 重新加载
                    </button>
                    <button class="home-btn" onclick="goBackToHome()">
                        <i class="fas fa-home"></i> 返回首页
                    </button>
                </div>
            </div>
        `;
    }
    hideLoadingState();
}

/**
 * 渲染成就页面
 */
/**
 * 渲染成就页面 - 修复版本
 */
async function renderAchievements(achievementSystem, stats) {
    const container = document.getElementById('achievementsContainer');
    if (!container) {
        console.error('❌ 找不到成就容器');
        return;
    }

    try {
        // 🔧 修复：确保使用正确的成就数据
        const groupedAchievements = achievementSystem.getAllAchievementsWithProgress(stats);

        console.log('🎯 开始渲染成就:', {
            分组数量: Object.keys(groupedAchievements).length,
            总成就数: Object.values(groupedAchievements).flat().length,
            已解锁数: Object.values(groupedAchievements).flat().filter(a => a.unlocked).length
        });

        let html = '';

        // 渲染统计信息
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
 * 渲染单个成就卡片 - 优化版本
 */
function renderAchievementCard(achievement) {
    const unlockedClass = achievement.unlocked ? 'unlocked' : 'locked';

    // 🔧 优化：已解锁的成就只显示完成日期，不显示进度条
    const progressContent = achievement.unlocked ?
        renderUnlockedContent(achievement) :
        renderProgressContent(achievement);

    return `
        <div class="achievement-card ${unlockedClass}" data-achievement-id="${achievement.id}">
            <div class="achievement-header">
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-points">+${achievement.reward_points}</div>
            </div>
            <div class="achievement-content">
                <h3 class="achievement-title">${achievement.name}</h3>
                <p class="achievement-description">${achievement.description}</p>
                ${progressContent}
            </div>
        </div>
    `;
}
/**
 * 渲染已解锁成就的内容 - 优化版本
 */
function renderUnlockedContent(achievement) {
    const unlockedDate = achievement.unlocked_at ?
        new Date(achievement.unlocked_at).toLocaleDateString('zh-CN', {
            month: 'short',
            day: 'numeric'
        }) : '';

    return `
        <div class="achievement-date">
            <span class="date-icon">📅</span>
            <span class="date-text">${unlockedDate}</span>
        </div>
    `;
}
/**
 * 渲染未解锁成就的内容 - 优化版本
 */
function renderProgressContent(achievement) {
    return `
        <div class="progress-info">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${achievement.progress}%"></div>
            </div>
            <span class="progress-text">${achievement.progress}%</span>
        </div>
    `;
}
/**
 * 绑定事件监听器
 */
/**
 * 绑定事件监听器 - 修复版本
 */
function bindEventListeners() {
    // 成就卡片点击事件
    const achievementCards = document.querySelectorAll('.achievement-card');
    achievementCards.forEach(card => {
        card.addEventListener('click', function () {
            const achievementId = this.getAttribute('data-achievement-id');
            console.log('点击成就:', achievementId);
        });
    });
}

