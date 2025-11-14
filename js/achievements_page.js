// 📁 js/achievements_page.js
document.addEventListener('DOMContentLoaded', async function () {
    console.log('🎯 成就页面初始化...');

    // 🔧 修复：按正确顺序初始化
    // 1. 立即绑定返回按钮（最高优先级）
    bindBackButtonEvent();
    // 显示加载状态
    showLoadingState();
    // 绑定类型选择事件
    const typeSelect = document.getElementById('achievementType');
    if (typeSelect) {
        typeSelect.addEventListener('change', function () {
            updateRequirementHelp();
            toggleSubjectField();
        });
    }

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
            await achievementSystem.loadAchievementDefinitions();
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
 * 简单的通知函数 - 用于成就页面
 */
function showNotification(message, type = 'info') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);

    // 创建简单的通知元素
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 300px;
        font-family: inherit;
        animation: slideIn 0.3s ease;
    `;

    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(notification);

    // 3秒后自动移除
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// 通知图标映射
function getNotificationIcon(type) {
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    return icons[type] || 'fa-info-circle';
}

// 通知颜色映射
function getNotificationColor(type) {
    const colors = {
        'success': '#28a745',
        'error': '#dc3545',
        'warning': '#ffc107',
        'info': '#17a2b8'
    };
    return colors[type] || '#17a2b8';
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

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
/**
 * 渲染统计信息部分 - 添加管理按钮
 */
function renderStatsSection(stats, achievementSystem) {
    if (!stats) return '';

    const totalAchievements = Object.keys(achievementSystem.achievementDefinitions).length;
    const unlockedAchievements = achievementSystem.userAchievements.length;
    const completionRate = totalAchievements > 0 ? Math.round((unlockedAchievements / totalAchievements) * 100) : 0;

    // 检查用户权限（简单版本：家长可以管理）
    const familyService = getFamilyService();
    const member = familyService.getCurrentMember();
    const isParent = member && member.role === 'parent';

    return `
        <div class="stats-section">
            <div class="stats-header">
                <h2>学习统计</h2>
                ${isParent ? `
                    <button class="btn-manage-achievements" onclick="openAchievementManager()">
                        <i class="fas fa-cog"></i> 管理成就
                    </button>
                ` : ''}
            </div>
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
            // console.log('点击成就:', achievementId);
        });
    });
}
/**
 * 成就定义管理功能
 */
const typeDescriptions = {
    'study_time': '基于总学习时长的成就',
    'total_tasks': '基于完成任务总数的成就',
    'streak': '基于连续学习天数的成就',
    'subject_tasks': '基于特定科目任务完成数的成就'
};

// 类型单位映射
const typeUnits = {
    'study_time': '分钟',
    'total_tasks': '个任务',
    'streak': '天',
    'subject_tasks': '个任务'
};

// 初始化表单交互
function initAchievementForm() {
    const typeSelect = document.getElementById('achievementType');
    const requirementHelp = document.getElementById('requirementHelp');

    if (typeSelect) {
        typeSelect.addEventListener('change', function () {
            updateRequirementHelp();
            toggleSubjectField();
        });
    }

    // 初始化图标选择器
    initIconSelector();

    // 初始化帮助文本
    updateRequirementHelp();
}

// 更新要求数值的帮助文本
function updateRequirementHelp() {
    const type = document.getElementById('achievementType').value;
    const helpElement = document.getElementById('requirementHelp');

    if (type && typeUnits[type]) {
        helpElement.textContent = `需要达到的${typeDescriptions[type]}，单位: ${typeUnits[type]}`;
        helpElement.className = 'field-help';
    } else {
        helpElement.textContent = '请先选择成就类型';
        helpElement.className = 'field-help error';
    }
}


// 初始化图标选择器
// 修复版初始化图标选择器
function initIconSelector() {
    const iconOptions = document.querySelectorAll('.icon-option');
    const iconInput = document.getElementById('achievementIcon');
    
    // 安全检查
    if (!iconOptions.length || !iconInput) {
        console.log('图标选择器元素未找到');
        return;
    }

    iconOptions.forEach(option => {
        option.onclick = function() {
            iconOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            iconInput.value = this.getAttribute('data-icon');
        };
    });

    // 安全获取当前值并设置选中状态
    const currentIcon = iconInput ? iconInput.value : '';
    if (currentIcon) {
        let found = false;
        iconOptions.forEach(option => {
            if (option.getAttribute('data-icon') === currentIcon) {
                option.classList.add('selected');
                found = true;
            }
        });
        if (!found && iconOptions.length > 0) {
            iconOptions[0].click();
        }
    } else if (iconOptions.length > 0) {
        iconOptions[0].click();
    }
}


// 根据图标值选中对应的图标选项 - 修复版本
function selectIconByValue(iconValue) {
    const modal = document.getElementById('achievementFormModal');
    if (!modal) return;

    const iconOptions = modal.querySelectorAll('.icon-option');
    const iconInput = modal.querySelector('#achievementIcon');

    if (!iconValue || !iconInput) return;

    console.log('🔍 查找图标:', iconValue);

    let found = false;
    iconOptions.forEach(option => {
        const icon = option.getAttribute('data-icon');
        if (icon === iconValue) {
            console.log('✅ 找到匹配图标，触发点击');
            option.click();
            found = true;
        }
    });

    if (!found && iconOptions.length > 0) {
        console.log('⚠️ 未找到匹配图标，使用第一个');
        iconOptions[0].click();
    }
}

// 打开成就管理器
function openAchievementManager() {
    const modal = document.getElementById('achievementManagerModal');
    if (!modal) return;

    renderAchievementsList();
    modal.style.display = 'flex';
}

// 关闭成就管理器
function closeAchievementManager() {
    const modal = document.getElementById('achievementManagerModal');
    if (modal) {
        modal.style.display = 'none';
    }
        // 🔄 新增：关闭后刷新成就页面
    refreshAchievementsPage();
}

// 渲染成就列表
function renderAchievementsList() {
    const container = document.getElementById('achievementsList');
    if (!container || !window.achievementSystem) return;

    const achievements = window.achievementSystem.achievementDefinitions;
    const userAchievements = window.achievementSystem.userAchievements || [];

    let html = '';

    Object.values(achievements).forEach(achievement => {
        const unlockedCount = userAchievements.filter(ua => ua.achievement_id === achievement.id).length;

        html += `
            <div class="achievement-manager-item">
                <div class="achievement-info">
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-details">
                        <h4>${achievement.name}</h4>
                        <p>${achievement.description}</p>
                        <div class="achievement-meta">
                            <span>ID: ${achievement.id}</span>
                            <span>类型: ${achievement.type}</span>
                            <span>要求: ${achievement.requirement}</span>
                            <span>积分: ${achievement.reward_points}</span>
                            <span>已解锁: ${unlockedCount} 次</span>
                        </div>
                    </div>
                </div>
                <div class="achievement-actions">
                    <button class="btn-edit" onclick="editAchievement('${achievement.id}')">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button class="btn-delete" onclick="deleteAchievement('${achievement.id}')">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html || '<div class="no-data">暂无成就定义</div>';
}

// 打开添加成就表单
// 在打开添加成就表单时调用初始化
// 简化版打开添加成就表单
function openAddAchievementForm() {
    const modal = document.getElementById('achievementFormModal');
    if (!modal) return;

    // 重置表单
    document.getElementById('achievementForm').reset();
    document.getElementById('achievementId').value = '';
    document.getElementById('achievementIdInput').value = '';
    document.getElementById('achievementIdInput').readOnly = false;

    document.getElementById('achievementFormTitle').textContent = '添加成就';
    modal.style.display = 'flex';

    // 简单延迟初始化
    setTimeout(initIconSelector, 50);
}

// 编辑成就
// 编辑成就
// 修复版编辑成就
function editAchievement(achievementId) {
    const modal = document.getElementById('achievementFormModal');
    const achievement = achievementSystem.achievementDefinitions[achievementId];
    
    if (!modal || !achievement) return;

    // 安全设置表单值
    const setValue = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.value = value;
    };

    setValue('achievementId', achievementId);
    setValue('achievementIdInput', achievementId);
    setValue('achievementName', achievement.name);
    setValue('achievementDescription', achievement.description);
    setValue('achievementType', achievement.type);
    setValue('achievementCategory', achievement.category);
    setValue('achievementRequirement', achievement.requirement);
    setValue('achievementRewardPoints', achievement.reward_points);
    setValue('achievementIcon', achievement.icon);
    
    if (achievement.subject) {
        setValue('achievementSubject', achievement.subject);
    }
    
    // 设置只读
    const achievementIdInput = document.getElementById('achievementIdInput');
    if (achievementIdInput) achievementIdInput.readOnly = true;
    
    const title = document.getElementById('achievementFormTitle');
    if (title) title.textContent = '编辑成就';
    
    modal.style.display = 'flex';
    closeAchievementManager();
    
    setTimeout(() => {
        initIconSelector();
        toggleSubjectField();
    }, 50);
}

// 保存成就
// 修复版保存成就
async function saveAchievement() {
    // 安全获取表单值
    const getValue = (id) => {
        const element = document.getElementById(id);
        return element ? element.value.trim() : '';
    };

    const formData = {
        id: getValue('achievementIdInput'),
        name: getValue('achievementName'),
        description: getValue('achievementDescription'),
        type: getValue('achievementType'),
        category: getValue('achievementCategory'),
        requirement: parseInt(getValue('achievementRequirement')) || 0,
        reward_points: parseInt(getValue('achievementRewardPoints')) || 0,
        icon: getValue('achievementIcon')
    };

    // 验证表单
    if (!formData.id || !formData.name || !formData.description) {
        showNotification('请填写完整信息', 'error');
        return;
    }

    // 如果是科目类型，添加科目字段
    if (formData.type === 'subject_tasks') {
        formData.subject = getValue('achievementSubject');
    }

    try {
        const originalId = getValue('achievementId');
        const isEdit = !!originalId;

        if (isEdit) {
            await achievementSystem.updateAchievementDefinition(originalId, formData);
            showNotification('成就更新成功', 'success');
        } else {
            await achievementSystem.addAchievementDefinition(formData);
            showNotification('成就添加成功', 'success');
        }

        closeAchievementForm();
        renderAchievementsList();

    } catch (error) {
        console.error('保存成就失败:', error);
        showNotification('保存失败: ' + error.message, 'error');
    }
}

// 添加成就定义到数据库 - 通过成就系统
async function addAchievementDefinition(achievement) {
    if (!window.achievementSystem) {
        throw new Error('成就系统未初始化');
    }

    return await window.achievementSystem.addAchievementDefinition(achievement);
}

// 更新成就定义 - 通过成就系统
async function updateAchievementDefinition(originalId, achievement) {
    if (!window.achievementSystem) {
        throw new Error('成就系统未初始化');
    }

    return await window.achievementSystem.updateAchievementDefinition(originalId, achievement);
}

// 删除成就 - 简单版本
async function deleteAchievement(achievementId) {
    if (!confirm('确定要删除这个成就定义吗？')) {
        return;
    }
    
    try {
        await achievementSystem.deleteAchievementDefinition(achievementId);
        showNotification('成就删除成功', 'success');
        renderAchievementsList();
    } catch (error) {
        console.error('删除成就失败:', error);
        showNotification('删除失败: ' + error.message, 'error');
    }
}

// 关闭成就表单
// 简化版关闭成就表单
function closeAchievementForm() {
    const modal = document.getElementById('achievementFormModal');
    if (modal) {
        modal.style.display = 'none';
    }
    // 关闭表单后重新打开管理列表
    openAchievementManager();
}

// 显示/隐藏科目字段
function toggleSubjectField() {
    const type = document.getElementById('achievementType').value;
    const subjectField = document.getElementById('subjectField');

    if (type === 'subject_tasks') {
        subjectField.style.display = 'block';
    } else {
        subjectField.style.display = 'none';
    }
}
/**
 * 🔄 新增：刷新成就页面数据
 * 保持KISS原则，只重新加载必要的数据
 */
/**
 * 🔄 修复：刷新成就页面数据
 * 确保传递正确的家庭ID和用户ID
 */
async function refreshAchievementsPage() {
    console.log('🔄 刷新成就页面数据...');
    
    try {
        // 显示加载状态
        showLoadingState();
        
        // 确保家庭服务已初始化
        const familyService = getFamilyService();
        const family = familyService.getCurrentFamily();
        const member = familyService.getCurrentMember();
        
        if (!family || !member) {
            console.error('❌ 刷新失败：未找到家庭或用户信息');
            showErrorState('无法刷新数据：请重新登录');
            return;
        }
        
        // 重新初始化成就系统数据
        if (window.achievementSystem) {
            // 🔧 修复：传递正确的家庭ID和用户ID
            await window.achievementSystem.loadAchievementDefinitions();
            const success = await window.achievementSystem.initialize(family.id, member.id);
            
            if (!success) {
                throw new Error('成就系统重新初始化失败');
            }
            
            // 重新渲染成就页面
            const stats = window.achievementSystem.userStats;
            await renderAchievements(window.achievementSystem, stats);
            
            console.log('✅ 成就页面刷新完成');
        } else {
            console.warn('⚠️ 成就系统未初始化，重新加载页面');
            window.location.reload();
        }
        
    } catch (error) {
        console.error('❌ 刷新成就页面失败:', error);
        showNotification('刷新失败: ' + error.message, 'error');
        // 如果刷新失败，回退到重新加载页面
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    } finally {
        // 隐藏加载状态
        hideLoadingState();
    }
}
