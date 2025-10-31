// 添加学习计划页面逻辑
console.log('add-plan.js 已加载');

let customCategories = JSON.parse(localStorage.getItem('customCategories') || '[]');
let recentCategories = JSON.parse(localStorage.getItem('recentCategories') || '[]');

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    console.log('添加计划页面DOM已加载');
    initializePage();
    initializePointsSettings();
    // 初始更新一次积分预览
    setTimeout(updatePointsPreview, 100);
});

// 初始化页面
function initializePage() {
    // 设置当前日期
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    document.querySelector('.date-highlight').textContent = today;
    
    // 初始化表单事件
    initializeFormEvents();
    
    // 初始化自定义类别到下拉框
    initializeCustomCategories();
    
    // 初始化类别功能
    initializeCategoryFeatures();
}

// 初始化表单事件
function initializeFormEvents() {
    const cancelBtn = document.getElementById('cancelBtn');
    const planForm = document.getElementById('planForm');
    const planContent = document.getElementById('planContent');
    const contentCount = document.getElementById('contentCount');

    // 取消按钮
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            if (confirm('确定要取消吗？已填写的内容将不会保存。')) {
                window.location.href = 'index.html';
            }
        });
    }

    // 表单提交
    if (planForm) {
        planForm.addEventListener('submit', handleFormSubmit);
    }

    // 字数统计
    if (planContent && contentCount) {
        planContent.addEventListener('input', function() {
            contentCount.textContent = this.value.length;
        });
    }

    // 初始化重复类型选择
    initializeRecurrenceOptions();
}

// 初始化重复类型选项
function initializeRecurrenceOptions() {
    const recurrenceOptions = document.querySelectorAll('.recurrence-option');
    
    recurrenceOptions.forEach(option => {
        option.addEventListener('click', function() {
            // 移除其他选项的active状态
            recurrenceOptions.forEach(opt => opt.classList.remove('active'));
            
            // 添加当前选项的active状态
            this.classList.add('active');
            
            // 显示对应的重复详情
            const value = this.getAttribute('data-value');
            showRecurrenceDetails(value);
        });
    });
    
    // 初始化日期选择器
    initializeDatePickers();
    
    // 初始化星期选择器
    initializeWeekdaySelectors();
    
    // 默认选择"仅当天"
    recurrenceOptions[0].classList.add('active');
    showRecurrenceDetails('once');
}

// 初始化日期选择器
function initializeDatePickers() {
    const today = new Date().toISOString().split('T')[0];
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    const oneMonthLaterStr = oneMonthLater.toISOString().split('T')[0];
    
    // 设置所有开始日期为今天
    const startDateInputs = document.querySelectorAll('input[id$="StartDate"]');
    startDateInputs.forEach(input => {
        input.value = today;
        input.min = today;
    });
    
    // 设置所有结束日期为一个月后
    const endDateInputs = document.querySelectorAll('input[id$="EndDate"]');
    endDateInputs.forEach(input => {
        input.value = oneMonthLaterStr;
        input.min = today;
    });
}

// 初始化星期选择器
function initializeWeekdaySelectors() {
    const weekdaySelectors = document.querySelectorAll('.weekday-selector');
    
    weekdaySelectors.forEach(selector => {
        const options = selector.querySelectorAll('.weekday-option');
        
        options.forEach(option => {
            option.addEventListener('click', function() {
                this.classList.toggle('active');
            });
        });
        
        // 默认选择周一至周五
        options.forEach(option => {
            const day = parseInt(option.getAttribute('data-day'));
            if (day >= 1 && day <= 5) {
                option.classList.add('active');
            }
        });
    });
}

// 显示重复详情
function showRecurrenceDetails(type) {
    const details = document.getElementById('recurrenceDetails');
    const allSections = details.querySelectorAll('.detail-section');
    
    // 隐藏所有详情部分
    allSections.forEach(section => {
        section.style.display = 'none';
    });
    
    // 显示对应的详情部分
    const targetSection = details.querySelector(`.${type}-details`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
}

// 类别标签管理功能
function initializeCategoryFeatures() {
    const categorySelect = document.getElementById('categorySelect');
    const customCategoryInput = document.getElementById('customCategoryInput');
    const newCategoryName = document.getElementById('newCategoryName');

    // 类别选择变化事件
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customCategoryInput.style.display = 'block';
                newCategoryName.focus();
            } else {
                customCategoryInput.style.display = 'none';
                if (this.value) {
                    addToRecentCategories(this.value);
                }
            }
        });
    }

    // 自定义类别输入处理
    if (newCategoryName) {
        newCategoryName.addEventListener('blur', function() {
            setTimeout(() => {
                handleCustomCategoryInput();
            }, 150);
        });
        
        newCategoryName.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleCustomCategoryInput();
            }
        });
    }

    // 初始化最近使用类别
    updateRecentCategories();
}

// 修改现有的自定义类别处理函数
function handleCustomCategory() {
    const customCategoryInput = document.getElementById('customCategoryInput');
    const categorySelect = document.getElementById('categorySelect');
    
    if (!customCategoryInput || !categorySelect) return;
    
    const customCategory = customCategoryInput.value.trim();
    if (customCategory) {
        // 添加到下拉选项
        const newOption = document.createElement('option');
        newOption.value = customCategory;
        newOption.textContent = customCategory;
        categorySelect.appendChild(newOption);
        categorySelect.value = customCategory;
        
        // 保存自定义类别
        saveCustomCategory(customCategory);
        
        // 隐藏自定义输入框
        customCategoryInput.style.display = 'none';
        customCategoryInput.value = '';
    }
}

// 添加自定义类别
function addCustomCategory(categoryName) {
    if (!customCategories.includes(categoryName)) {
        customCategories.push(categoryName);
        localStorage.setItem('customCategories', JSON.stringify(customCategories));
        
        const categorySelect = document.getElementById('categorySelect');
        const customOption = categorySelect.querySelector('option[value="custom"]');
        const option = document.createElement('option');
        option.value = categoryName;
        option.textContent = categoryName;
        categorySelect.insertBefore(option, customOption);
    }
}

// 在保存自定义类别时，同时保存到localStorage
function saveCustomCategory(category) {
    try {
        let categories = JSON.parse(localStorage.getItem('studyCategories') || '[]');
        if (!categories.includes(category)) {
            categories.push(category);
            localStorage.setItem('studyCategories', JSON.stringify(categories));
        }
        
        // 同时更新主页面的科目筛选（如果主页面已加载）
        if (window.opener && typeof window.opener.updateSubjectFilterOptions === 'function') {
            window.opener.updateSubjectFilterOptions();
        }
    } catch (e) {
        console.error('保存自定义类别失败:', e);
    }
}



// 添加到最近使用类别
function addToRecentCategories(categoryName) {
    recentCategories = recentCategories.filter(cat => cat !== categoryName);
    recentCategories.unshift(categoryName);
    recentCategories = recentCategories.slice(0, 8);
    localStorage.setItem('recentCategories', JSON.stringify(recentCategories));
    updateRecentCategories();
}

// 更新最近使用类别显示
function updateRecentCategories() {
    const categoryTags = document.getElementById('categoryTags');
    if (!categoryTags) return;

    categoryTags.innerHTML = '';
    
    recentCategories.forEach(category => {
        const tag = document.createElement('div');
        tag.className = 'category-tag';
        tag.textContent = category;
        tag.addEventListener('click', function() {
            document.querySelectorAll('.category-tag').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const categorySelect = document.getElementById('categorySelect');
            categorySelect.value = category;
            document.getElementById('customCategoryInput').style.display = 'none';
        });
        categoryTags.appendChild(tag);
    });
}

// 在页面加载时初始化自定义类别到下拉框
function initializeCustomCategories() {
    const categorySelect = document.getElementById('categorySelect');
    const customOption = categorySelect.querySelector('option[value="custom"]');
    
    customCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.insertBefore(option, customOption);
    });
}

// 表单提交处理
function handleFormSubmit(event) {
    event.preventDefault();
    
    const saveBtn = event.target.querySelector('.btn-save') || document.querySelector('.btn-save');
    
    // 显示加载状态
    showLoadingState(saveBtn, true);
    
    // 获取表单数据
    const formData = getFormData();
    
    if (validateForm(formData)) {
        // 添加延时动画
        setTimeout(() => {
            const tasks = generateTasks(formData);
            saveAllTasks(tasks);
            showLoadingState(saveBtn, false);
            showSuccessNotification(`学习计划添加成功！共创建 ${tasks.length} 个任务`);
            
            // 2秒后跳转回首页
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            
        }, 1500);
    } else {
        showLoadingState(saveBtn, false);
    }
}

// 显示/隐藏加载状态
function showLoadingState(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// 显示成功通知
function showSuccessNotification(message) {
    const existingNotification = document.querySelector('.notification-bubble');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification-bubble';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// 获取表单数据
// 获取表单数据 - 确保包含积分设置
function getFormData() {
    const pointsType = document.querySelector('input[name="pointsType"]:checked')?.value;
    const customPoints = document.getElementById('customPoints')?.value;
    
    return {
        name: document.getElementById('planName').value,
        category: document.getElementById('categorySelect').value,
        content: document.getElementById('planContent').value,
        startDate: document.getElementById('startDate').value,
        startTime: document.getElementById('startTime').value,
        endTime: document.getElementById('endTime').value,
        recurrenceType: document.getElementById('recurrenceType').value,
        recurrenceData: getRecurrenceData(),
        pointsType: pointsType,
        customPoints: customPoints ? parseInt(customPoints) : null
    };
}

// 获取重复类型数据
function getRecurrenceData(type) {
    const data = {
        startDate: document.getElementById('startDate').value
    };
    
    switch (type) {
        case 'daily':
            data.startDate = document.getElementById('dailyStartDate').value;
            data.endDate = document.getElementById('dailyEndDate').value;
            break;
            
        case 'weekly':
            data.startDate = document.getElementById('weeklyStartDate').value;
            data.endDate = document.getElementById('weeklyEndDate').value;
            data.weekdays = getSelectedWeekdays('weekly');
            break;
            
        case 'biweekly':
            data.startDate = document.getElementById('biweeklyStartDate').value;
            data.endDate = document.getElementById('biweeklyEndDate').value;
            data.weekdays = getSelectedWeekdays('biweekly');
            break;
    }
    
    return data;
}

// 获取选中的星期
function getSelectedWeekdays(type) {
    const selector = document.querySelector(`.${type}-details .weekday-selector`);
    if (!selector) return [];
    
    const selectedDays = [];
    const options = selector.querySelectorAll('.weekday-option.active');
    
    options.forEach(option => {
        selectedDays.push(parseInt(option.getAttribute('data-day')));
    });
    
    return selectedDays;
}

// 验证表单
function validateForm(data) {
    if (!data.category || data.category === 'custom') {
        alert('请选择或输入有效的类别');
        return false;
    }
    
    if (!data.name) {
        alert('请输入计划名称');
        document.getElementById('planName').focus();
        return false;
    }
    
    // 验证重复计划的日期范围
    if (data.recurrenceType !== 'once') {
        const startDate = new Date(data.recurrenceData.startDate);
        const endDate = new Date(data.recurrenceData.endDate);
        
        if (startDate > endDate) {
            alert('结束日期不能早于开始日期');
            return false;
        }
        
        // 对于每周和每两周，需要至少选择一个星期
        if ((data.recurrenceType === 'weekly' || data.recurrenceType === 'biweekly') && 
            data.recurrenceData.weekdays.length === 0) {
            alert('请至少选择一个重复日期');
            return false;
        }
    }
    
    return true;
}

// 根据重复类型生成任务
// 根据重复类型生成任务 - 集成积分系统
function generateTasks(data) {
    const tasks = [];
    const baseTaskId = Date.now();
    
    // 获取积分设置
    const pointsType = document.querySelector('input[name="pointsType"]:checked')?.value;
    const useCustomPoints = pointsType === 'custom';
    const customPoints = useCustomPoints ? parseInt(document.getElementById('customPoints').value) || 10 : null;
    
    // 计算积分
    let points;
    let pointsBreakdown;
    
    if (useCustomPoints && customPoints) {
        points = customPoints;
        pointsBreakdown = {
            total: points,
            base: points,
            timeBonus: 0,
            morningBonus: 0,
            weekendBonus: 0,
            isCustom: true
        };
    } else {
        // 系统自动计算（使用开始日期作为示例日期）
        const taskData = {
            startTime: data.startTime,
            endTime: data.endTime,
            startDate: data.startDate,
            time: calculateDuration(data.startTime, data.endTime)
        };
        pointsBreakdown = PointsSystem.calculateAutoPoints(taskData);
        points = pointsBreakdown.total;
    }
    
    const baseTask = {
        name: data.name,
        subject: data.category,
        description: data.content,
        startTime: data.startTime,
        endTime: data.endTime,
        time: calculateDuration(data.startTime, data.endTime),
        points: points,
        pointsBreakdown: pointsBreakdown, // 保存积分明细
        useCustomPoints: useCustomPoints, // 记录是否使用自定义积分
        customPoints: customPoints, // 记录自定义积分值
        completed: false,
        repeatType: data.recurrenceType,
        createdAt: new Date().toISOString()
    };
    
    switch (data.recurrenceType) {
        case 'once':
            // 仅当天：创建一个任务
            tasks.push({
                ...baseTask,
                id: baseTaskId,
                date: data.startDate
            });
            break;
            
        case 'daily':
            // 每天：从开始日期到结束日期每天创建任务
            tasks.push(...generateDailyTasks(baseTask, data.recurrenceData, baseTaskId));
            break;
            
        case 'weekly':
            // 每周：在选定的星期几创建任务
            tasks.push(...generateWeeklyTasks(baseTask, data.recurrenceData, baseTaskId));
            break;
            
        case 'biweekly':
            // 每两周：在选定的星期几创建任务，间隔两周
            tasks.push(...generateBiweeklyTasks(baseTask, data.recurrenceData, baseTaskId));
            break;
    }
    
    return tasks;
}

// 生成每日任务
function generateDailyTasks(baseTask, recurrenceData, baseTaskId) {
    const tasks = [];
    const startDate = new Date(recurrenceData.startDate);
    const endDate = new Date(recurrenceData.endDate);
    
    let currentDate = new Date(startDate);
    let taskId = baseTaskId;
    
    while (currentDate <= endDate) {
        tasks.push({
            ...baseTask,
            id: taskId++,
            date: currentDate.toISOString().split('T')[0]
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return tasks;
}

// 生成每周任务
function generateWeeklyTasks(baseTask, recurrenceData, baseTaskId) {
    const tasks = [];
    const startDate = new Date(recurrenceData.startDate);
    const endDate = new Date(recurrenceData.endDate);
    const weekdays = recurrenceData.weekdays;
    
    let currentDate = new Date(startDate);
    let taskId = baseTaskId;
    
    while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        
        if (weekdays.includes(dayOfWeek)) {
            tasks.push({
                ...baseTask,
                id: taskId++,
                date: currentDate.toISOString().split('T')[0]
            });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return tasks;
}

// 生成每两周任务
function generateBiweeklyTasks(baseTask, recurrenceData, baseTaskId) {
    const tasks = [];
    const startDate = new Date(recurrenceData.startDate);
    const endDate = new Date(recurrenceData.endDate);
    const weekdays = recurrenceData.weekdays;
    
    let currentDate = new Date(startDate);
    let taskId = baseTaskId;
    let weekCounter = 0;
    
    while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        
        // 只在偶数周（第0周、第2周、第4周...）创建任务
        if (weekdays.includes(dayOfWeek) && weekCounter % 2 === 0) {
            tasks.push({
                ...baseTask,
                id: taskId++,
                date: currentDate.toISOString().split('T')[0]
            });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
        
        // 如果是周日，增加周计数
        if (currentDate.getDay() === 0) {
            weekCounter++;
        }
    }
    
    return tasks;
}

// 计算学习时长
function calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return 30;
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diff = (end - start) / (1000 * 60);
    
    return Math.max(diff, 0);
}

// 保存所有任务到localStorage
function saveAllTasks(tasks) {
    let existingTasks = JSON.parse(localStorage.getItem('studyTasks') || '[]');
    
    // 添加新任务
    tasks.forEach(task => {
        existingTasks.push(task);
    });
    
    localStorage.setItem('studyTasks', JSON.stringify(existingTasks));
    console.log(`成功保存 ${tasks.length} 个任务`);
}
// 积分计算系统
const PointsSystem = {
    // 计算任务积分
    calculateTaskPoints: function(taskData) {
        if (taskData.useCustomPoints && taskData.customPoints) {
            // 使用自定义积分
            return {
                total: parseInt(taskData.customPoints),
                base: parseInt(taskData.customPoints),
                timeBonus: 0,
                morningBonus: 0,
                weekendBonus: 0,
                isCustom: true
            };
        } else {
            // 系统自动计算
            return this.calculateAutoPoints(taskData);
        }
    },
    
    // 系统自动计算积分
    calculateAutoPoints: function(taskData) {
        // 基础积分
        let basePoints = 1;
        
        // 时间奖励：每15分钟加1分
        const taskMinutes = taskData.time || calculateDuration(taskData.startTime, taskData.endTime);
        const timeBonus = Math.floor(taskMinutes / 15);
        
        // 早起加成：6:00-8:00 ×1.2
        let morningBonus = 0;
        const startHour = parseInt(taskData.startTime?.split(':')[0]) || 19;
        if (startHour >= 6 && startHour < 8) {
            morningBonus = 0.2;
        }
        
        // 周末加成：周六日 ×1.5
        let weekendBonus = 0;
        const taskDate = new Date(taskData.startDate + 'T00:00:00');
        const dayOfWeek = taskDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) { // 0=周日, 6=周六
            weekendBonus = 0.5;
        }
        
        // 计算总积分
        let totalPoints = basePoints + timeBonus;
        totalPoints *= (1 + morningBonus + weekendBonus);
        
        // 四舍五入到整数
        totalPoints = Math.round(totalPoints);
        
        return {
            total: totalPoints,
            base: basePoints,
            timeBonus: timeBonus,
            morningBonus: morningBonus,
            weekendBonus: weekendBonus,
            isCustom: false
        };
    },
    
    // 获取加成描述
    getBonusDescription: function(pointsBreakdown) {
        if (pointsBreakdown.isCustom) {
            return "自定义积分";
        }
        
        let description = `基础${pointsBreakdown.base}分`;
        
        if (pointsBreakdown.timeBonus > 0) {
            description += ` + 时长${pointsBreakdown.timeBonus}分`;
        }
        
        if (pointsBreakdown.morningBonus > 0) {
            description += ` + 早起×1.2`;
        }
        
        if (pointsBreakdown.weekendBonus > 0) {
            description += ` + 周末×1.5`;
        }
        
        return description;
    }
};

// 初始化积分设置
function initializePointsSettings() {
    const pointsTypeRadios = document.querySelectorAll('input[name="pointsType"]');
    const customPointsInput = document.getElementById('customPointsInput');
    const customPointsField = document.getElementById('customPoints');
    const pointsPreview = document.getElementById('pointsPreview');
    
    if (!pointsTypeRadios.length) return;
    
    pointsTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'custom') {
                customPointsInput.style.display = 'block';
                updatePointsPreview();
            } else {
                customPointsInput.style.display = 'none';
                updatePointsPreview();
            }
        });
    });
    
    // 监听自定义积分输入
    if (customPointsField) {
        customPointsField.addEventListener('input', updatePointsPreview);
    }
    
    // 监听时间变化更新积分预览
    const startTimeInput = document.getElementById('startTime');
    const endTimeInput = document.getElementById('endTime');
    const startDateInput = document.getElementById('startDate');
    
    if (startTimeInput) startTimeInput.addEventListener('change', updatePointsPreview);
    if (endTimeInput) endTimeInput.addEventListener('change', updatePointsPreview);
    if (startDateInput) startDateInput.addEventListener('change', updatePointsPreview);
}

// 更新积分预览
function updatePointsPreview() {
    const pointsPreview = document.getElementById('pointsPreview');
    const pointsType = document.querySelector('input[name="pointsType"]:checked')?.value;
    
    if (!pointsPreview) return;
    
    // 获取表单数据
    const formData = getFormData();
    
    if (pointsType === 'custom') {
        const customPoints = parseInt(document.getElementById('customPoints').value) || 10;
        pointsPreview.innerHTML = `
            <strong>积分预览: ${customPoints} 分</strong>
            <div class="points-breakdown">自定义积分</div>
        `;
    } else {
        // 使用系统自动计算
        const taskData = {
            startTime: formData.startTime,
            endTime: formData.endTime,
            startDate: formData.startDate,
            time: calculateDuration(formData.startTime, formData.endTime)
        };
        
        const pointsBreakdown = PointsSystem.calculateAutoPoints(taskData);
        pointsPreview.innerHTML = `
            <strong>积分预览: ${pointsBreakdown.total} 分</strong>
            <div class="points-breakdown">
                ${PointsSystem.getBonusDescription(pointsBreakdown)}
            </div>
        `;
    }
}

