// 批量添加学习计划功能
console.log('batch-add.js 已加载');

let parsedTasks = [];
let currentSettings = {
    startDate: '',
    repeatType: 'once',
    defaultDuration: 25
};

// 初始化页面
document.addEventListener('DOMContentLoaded', function () {
    console.log('批量添加页面初始化');
    initializePage();
    bindEvents();
});

// 初始化页面
function initializePage() {
    // 设置默认日期为今天
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    currentSettings.startDate = today;

    updateRepeatTypeHint();
    updateSaveButton();
    updateFamilyInfoDisplay(); // 新增：显示家庭信息
}

// 绑定事件
function bindEvents() {
    // 输入框变化事件
    const batchInput = document.getElementById('batchInput');
    if (batchInput) {
        batchInput.addEventListener('input', handleInputChange);
    }

    // 设置变化事件
    const startDate = document.getElementById('startDate');
    const repeatType = document.getElementById('repeatType');
    const defaultDuration = document.getElementById('defaultDuration');

    if (startDate) {
        startDate.addEventListener('change', function () {
            currentSettings.startDate = this.value;
            updatePreview();
        });
    }

    if (repeatType) {
        repeatType.addEventListener('change', function () {
            currentSettings.repeatType = this.value;
            updateRepeatTypeHint();
            updatePreview();
        });
    }

    if (defaultDuration) {
        defaultDuration.addEventListener('change', function () {
            currentSettings.defaultDuration = parseInt(this.value) || 25;
            updatePreview();
        });
    }
}

// 处理输入变化
function handleInputChange() {
    const input = document.getElementById('batchInput').value;
    parseInputText(input);
    updatePreview();
    updateSaveButton();
}

// 解析输入文本
function parseInputText(text) {
    parsedTasks = [];

    if (!text.trim()) {
        return;
    }

    const lines = text.split('\n').filter(line => line.trim());
    let currentSubject = '';
    let taskNumber = 1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // 检查是否是科目行（不包含数字和标点）
        if (!containsNumberAndPunctuation(line)) {
            currentSubject = line;
            continue;
        }

        // 如果是任务行
        if (currentSubject && containsNumberAndPunctuation(line)) {
            const taskName = extractTaskName(line);
            if (taskName) {
                parsedTasks.push({
                    id: taskNumber++,
                    subject: currentSubject,
                    name: taskName,
                    originalLine: line
                });
            }
        }
    }

    console.log('解析出的任务:', parsedTasks);
}

// 检查是否包含数字和标点
function containsNumberAndPunctuation(text) {
    return /^\d+[\.．，,]\s*/.test(text);
}

// 提取任务名称
function extractTaskName(line) {
    // 移除数字和标点，获取纯任务名称
    return line.replace(/^\d+[\.．，,]\s*/, '').trim();
}

// 更新预览
function updatePreview() {
    const previewContent = document.getElementById('previewContent');
    const previewCount = document.getElementById('previewCount');
    const totalTasksCount = document.getElementById('totalTasksCount');

    if (!previewContent) return;

    if (parsedTasks.length === 0) {
        previewContent.innerHTML = `
            <div class="preview-placeholder">
                <i class="fas fa-list-alt"></i>
                <p>输入内容后会在这里显示预览</p>
            </div>
        `;
        previewCount.textContent = '0';
        totalTasksCount.textContent = '0';
        return;
    }

    // 检查家庭状态
    const familyService = getFamilyService();
    const hasFamily = familyService && familyService.hasJoinedFamily && familyService.hasJoinedFamily();
    const family = hasFamily ? familyService.getCurrentFamily() : null;

    let previewHTML = '<div class="preview-list">';

    // 添加家庭信息提示
    if (hasFamily && family) {
        previewHTML += `
            <div class="family-notice">
                <i class="fas fa-users"></i>
                <span>这些任务将添加到家庭: <strong>${family.family_name}</strong></span>
            </div>
        `;
    } else {
        previewHTML += `
            <div class="family-notice personal">
                <i class="fas fa-user"></i>
                <span>这些任务将保存为个人任务</span>
            </div>
        `;
    }

    parsedTasks.forEach(task => {
        const subjectClass = getSubjectClass(task.subject);
        const subjectIcon = getSubjectIcon(task.subject);

        previewHTML += `
            <div class="preview-task ${hasFamily ? 'family-task' : 'personal-task'}">
                <div class="preview-task-icon ${subjectClass}">
                    <i class="fas ${subjectIcon}"></i>
                </div>
                <div class="preview-task-content">
                    <div class="preview-task-name">${task.name}</div>
                    <div class="preview-task-meta">
                        <span class="preview-subject">${task.subject}</span>
                        <span class="preview-duration">${currentSettings.defaultDuration}分钟</span>
                        <span class="preview-repeat">${getRepeatTypeText(currentSettings.repeatType)}</span>
                        <span class="preview-date">${currentSettings.startDate}</span>
                        ${hasFamily ? '<span class="family-badge">👨‍👩‍👧‍👦 家庭任务</span>' : '<span class="personal-badge">👤 个人任务</span>'}
                    </div>
                </div>
            </div>
        `;
    });

    previewHTML += '</div>';
    previewContent.innerHTML = previewHTML;
    previewCount.textContent = parsedTasks.length;
    totalTasksCount.textContent = parsedTasks.length;
}

// 新增：更新家庭信息显示
function updateFamilyInfoDisplay() {
    const familyService = getFamilyService();
    const hasFamily = familyService && familyService.hasJoinedFamily && familyService.hasJoinedFamily();
    
    if (hasFamily) {
        const family = familyService.getCurrentFamily();
        console.log('✅ 当前已加入家庭:', family.family_name);
    } else {
        console.log('ℹ️ 未加入家庭，任务将保存为个人任务');
    }
}

// 更新重复类型提示
function updateRepeatTypeHint() {
    const hintElement = document.getElementById('repeatTypeHint');
    if (!hintElement) return;

    const startDate = currentSettings.startDate || new Date().toISOString().split('T')[0];
    const dateObj = new Date(startDate + 'T00:00:00');
    const dateStr = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;

    let hintText = '';
    switch (currentSettings.repeatType) {
        case 'once':
            hintText = `该任务将只在 ${dateStr} 这一天出现`;
            break;
        case 'daily':
            hintText = `该任务将从 ${dateStr} 开始每天重复`;
            break;
        case 'weekly':
            hintText = `该任务将从 ${dateStr} 开始每周重复`;
            break;
        case 'biweekly':
            hintText = `该任务将从 ${dateStr} 开始每两周重复`;
            break;
    }

    hintElement.textContent = hintText;
}

// 更新保存按钮状态
function updateSaveButton() {
    const saveBtn = document.getElementById('saveBtn');
    const saveCount = document.getElementById('saveCount');
    const totalTasksCount = document.getElementById('totalTasksCount');

    if (saveBtn && saveCount && totalTasksCount) {
        const hasTasks = parsedTasks.length > 0;
        saveBtn.disabled = !hasTasks;
        saveCount.textContent = parsedTasks.length;
        totalTasksCount.textContent = parsedTasks.length;

        // 添加视觉反馈
        if (hasTasks) {
            saveBtn.style.opacity = '1';
        } else {
            saveBtn.style.opacity = '0.7';
        }
    }
}

// 保存批量任务 - 修改为支持家庭关联
async function saveBatchTasks() {
    if (parsedTasks.length === 0) {
        showNotification('没有可保存的任务', 'warning');
        return;
    }

    try {
        console.log('开始保存批量任务，检查家庭状态...');
        
        // 获取家庭服务
        const familyService = getFamilyService();
        let familyId = null;
        
        // 检查是否已加入家庭
        if (familyService && familyService.hasJoinedFamily && familyService.hasJoinedFamily()) {
            const family = familyService.getCurrentFamily();
            if (family && family.id) {
                familyId = family.id;
                console.log('✅ 任务将关联到家庭:', family.family_name, 'ID:', familyId);
            }
        } else {
            console.log('ℹ️ 用户未加入家庭，任务将保存为个人任务');
        }

        // 使用数据服务保存任务
        const dataService = getDataService();
        let savedCount = 0;

        // 为每个任务创建数据
        for (const task of parsedTasks) {
            try {
                const taskData = {
                    name: task.name,
                    subject: task.subject,
                    description: '',
                    date: currentSettings.startDate,
                    start_time: '19:00',
                    end_time: '20:00',
                    duration: currentSettings.defaultDuration,
                    points: calculatePoints(currentSettings.defaultDuration),
                    completed: false,
                    repeat_type: currentSettings.repeatType,
                    family_id: familyId, // 关键：设置家庭ID
                    use_custom_points: false,
                    custom_points: 0
                };

                console.log('创建任务数据:', taskData);
                
                // 保存到云端
                await dataService.createTask(taskData);
                savedCount++;
                
            } catch (taskError) {
                console.error(`保存任务失败 "${task.name}":`, taskError);
                // 继续保存其他任务，不中断整个流程
            }
        }

        // 显示成功消息
        if (savedCount > 0) {
            const message = familyId 
                ? `成功添加 ${savedCount} 个学习计划到家庭`
                : `成功添加 ${savedCount} 个个人学习计划`;
            showNotification(message, 'success');
        } else {
            showNotification('保存任务失败，请重试', 'error');
            return;
        }

        // 延迟返回主页
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);

    } catch (error) {
        console.error('保存批量任务失败:', error);
        showNotification('保存失败: ' + (error.message || '未知错误'), 'error');
    }
}

// 获取数据服务实例
function getDataService() {
    if (window.dataService) {
        return window.dataService;
    }
    
    console.warn('数据服务全局实例未找到，使用模拟服务');
    // 返回模拟的数据服务
    return {
        createTask: async (taskData) => {
            console.log('模拟保存任务:', taskData);
            // 模拟成功保存
            return { id: Date.now(), ...taskData };
        }
    };
}

// 获取家庭服务实例
function getFamilyService() {
    if (window.familyService) {
        return window.familyService;
    }
    
    console.warn('家庭服务全局实例未找到，使用模拟服务');
    // 返回模拟的家庭服务
    return {
        hasJoinedFamily: () => {
            try {
                const saved = localStorage.getItem('family_info');
                return !!saved;
            } catch (error) {
                return false;
            }
        },
        getCurrentFamily: () => {
            try {
                const saved = localStorage.getItem('family_info');
                return saved ? JSON.parse(saved).family : null;
            } catch (error) {
                return null;
            }
        }
    };
}

// 计算积分
function calculatePoints(duration) {
    const basePoints = 10;
    const timeBonus = Math.floor(duration / 10);
    return basePoints + timeBonus;
}

// 获取重复类型文本
function getRepeatTypeText(repeatType) {
    const types = {
        'once': '仅当天',
        'daily': '每天',
        'weekly': '每周',
        'biweekly': '每两周'
    };
    return types[repeatType] || '仅当天';
}

// 获取科目样式类名
function getSubjectClass(subject) {
    const subjectClasses = {
        '语文': 'subject-chinese',
        '数学': 'subject-math',
        '英语': 'subject-english',
        '科学': 'subject-science',
        '物理': 'subject-physics',
        '化学': 'subject-chemistry',
        '历史': 'subject-history',
        '地理': 'subject-geography',
        '美术': 'subject-art',
        '音乐': 'subject-music',
        '体育': 'subject-sports'
    };
    return subjectClasses[subject] || 'subject-other';
}

// 获取科目图标
function getSubjectIcon(subject) {
    const icons = {
        '语文': 'fa-book',
        '数学': 'fa-calculator',
        '英语': 'fa-language',
        '科学': 'fa-flask',
        '物理': 'fa-atom',
        '化学': 'fa-vial',
        '历史': 'fa-monument',
        '地理': 'fa-globe-asia',
        '美术': 'fa-palette',
        '音乐': 'fa-music',
        '体育': 'fa-running'
    };
    return icons[subject] || 'fa-book';
}

// 返回主页
function goBack() {
    window.location.href = 'index.html';
}

// 显示通知
function showNotification(message, type = 'info') {
    const existingNotification = document.querySelector('.custom-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `custom-notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 10000;
        transform: translateX(400px);
        opacity: 0;
        transition: all 0.3s ease;
        max-width: 300px;
        font-family: inherit;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 100);

    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    return icons[type] || 'fa-info-circle';
}

function getNotificationColor(type) {
    const colors = {
        'success': '#2ed573',
        'error': '#ff6b6b',
        'warning': '#ff9f43',
        'info': '#4a69bd'
    };
    return colors[type] || '#4a69bd';
}