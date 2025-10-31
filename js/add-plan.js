// 添加学习计划页面逻辑
console.log('add-plan.js 已加载');

let customCategories = JSON.parse(localStorage.getItem('customCategories') || '[]');
let recentCategories = JSON.parse(localStorage.getItem('recentCategories') || '[]');

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    console.log('添加计划页面DOM已加载');
    initializePage();
    initializeCategoryFeatures();
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

// 初始化重复类型选项 - 修复版本
function initializeRecurrenceOptions() {
    const recurrenceOptions = document.querySelectorAll('.recurrence-option');
    const recurrenceDetails = document.getElementById('recurrenceDetails');
    
    recurrenceOptions.forEach(option => {
        option.addEventListener('click', function() {
            // 移除其他选项的active状态
            recurrenceOptions.forEach(opt => {
                opt.classList.remove('active');
                opt.style.pointerEvents = 'auto'; // 确保可以再次点击
            });
            
            // 添加当前选项的active状态
            this.classList.add('active');
            
            // 显示对应的重复详情
            const value = this.getAttribute('data-value');
            showRecurrenceDetails(value);
            
            console.log('选中重复类型:', value);
        });
    });
    
    // 初始化日期选择器
    initializeDatePickers();
    
    // 初始化星期选择器
    initializeWeekdaySelectors();
    
    // 默认选择"仅当天"
    if (recurrenceOptions[0]) {
        recurrenceOptions[0].classList.add('active');
        showRecurrenceDetails('once');
    }
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
                // 显示自定义输入框
                customCategoryInput.style.display = 'block';
                newCategoryName.focus();
            } else {
                // 隐藏自定义输入框
                customCategoryInput.style.display = 'none';
                // 添加到最近使用
                if (this.value) {
                    addToRecentCategories(this.value);
                }
            }
        });
    }

    // 自定义类别输入框失去焦点时处理
    if (newCategoryName) {
        newCategoryName.addEventListener('blur', function() {
            setTimeout(() => {
                handleCustomCategoryInput();
            }, 150);
        });
        
        // 回车键确认
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

// 处理自定义类别输入
function handleCustomCategoryInput() {
    const categorySelect = document.getElementById('categorySelect');
    const newCategoryName = document.getElementById('newCategoryName');
    const customCategoryInput = document.getElementById('customCategoryInput');
    
    const categoryName = newCategoryName.value.trim();
    
    if (categoryName && categoryName.length <= 10 && categoryName.length > 0) {
        addCustomCategory(categoryName);
        // 选中新添加的类别
        categorySelect.value = categoryName;
        // 隐藏输入框
        customCategoryInput.style.display = 'none';
        // 清空输入框
        newCategoryName.value = '';
        // 添加到最近使用
        addToRecentCategories(categoryName);
    } else if (categoryName === '') {
        // 如果输入为空，重置为请选择
        categorySelect.value = '';
        customCategoryInput.style.display = 'none';
    }
}

// 添加自定义类别
function addCustomCategory(categoryName) {
    if (!customCategories.includes(categoryName)) {
        customCategories.push(categoryName);
        localStorage.setItem('customCategories', JSON.stringify(customCategories));
        
        // 添加到下拉选择框（在"自定义类别"选项之前）
        const categorySelect = document.getElementById('categorySelect');
        const customOption = categorySelect.querySelector('option[value="custom"]');
        const option = document.createElement('option');
        option.value = categoryName;
        option.textContent = categoryName;
        categorySelect.insertBefore(option, customOption);
    }
}

// 添加到最近使用类别
function addToRecentCategories(categoryName) {
    // 移除已存在的
    recentCategories = recentCategories.filter(cat => cat !== categoryName);
    // 添加到开头
    recentCategories.unshift(categoryName);
    // 只保留最近8个
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
            // 设置选中状态
            document.querySelectorAll('.category-tag').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // 设置下拉框值
            const categorySelect = document.getElementById('categorySelect');
            categorySelect.value = category;
            // 隐藏自定义输入框
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
    console.log('表单提交处理');
    
    // 获取表单数据
    const formData = getFormData();
    
    if (validateForm(formData)) {
        savePlan(formData);
        showSuccessMessage();
    }
}

// 获取表单数据
function getFormData() {
    const categorySelect = document.getElementById('categorySelect');
    let category = categorySelect.value;
    
    // 如果选择的是自定义类别且正在输入，使用输入的值
    if (category === 'custom') {
        const newCategoryName = document.getElementById('newCategoryName').value.trim();
        if (newCategoryName) {
            category = newCategoryName;
        }
    }
    
    return {
        startDate: document.getElementById('startDate').value,
        category: category,
        name: document.getElementById('planName').value.trim(),
        content: document.getElementById('planContent').value.trim(),
        recurrenceType: document.querySelector('.recurrence-option.active')?.getAttribute('data-value') || 'once',
        startTime: document.getElementById('startTime').value,
        endTime: document.getElementById('endTime').value,
        customPoints: document.getElementById('customPoints').checked
    };
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
    
    return true;
}

// 保存计划
function savePlan(data) {
    // 生成任务ID
    const taskId = Date.now();
    
    // 创建任务对象
    const task = {
        id: taskId,
        name: data.name,
        subject: data.category,
        description: data.content,
        date: data.startDate,
        startTime: data.startTime,
        endTime: data.endTime,
        repeatType: data.recurrenceType,
        time: calculateDuration(data.startTime, data.endTime),
        points: data.customPoints ? 10 : 5, // 简单示例
        completed: false
    };
    
    // 保存到localStorage
    saveTaskToStorage(task);
    
    console.log('计划保存成功:', task);
}

// 计算学习时长（分钟）
function calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return 30; // 默认30分钟
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diff = (end - start) / (1000 * 60); // 转换为分钟
    
    return Math.max(diff, 0); // 确保非负数
}

// 保存任务到localStorage
function saveTaskToStorage(task) {
    let tasks = JSON.parse(localStorage.getItem('studyTasks') || '[]');
    tasks.push(task);
    localStorage.setItem('studyTasks', JSON.stringify(tasks));
}

// 显示成功消息
function showSuccessMessage() {
    alert('学习计划添加成功！');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
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
        input.min = today; // 不能选择过去的日期
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
            if (day >= 1 && day <= 5) { // 周一到周五
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
    
    console.log('显示重复详情:', type);
}

// 表单提交处理 - 增强版本
function handleFormSubmit(event) {
    event.preventDefault();
    console.log('表单提交处理');
    
    const saveBtn = event.target.querySelector('.btn-save') || document.querySelector('.btn-save');
    
    // 显示加载状态
    showLoadingState(saveBtn, true);
    
    // 获取表单数据
    const formData = getFormData();
    
    if (validateForm(formData)) {
        // 添加延时动画
        setTimeout(() => {
            savePlan(formData);
            showLoadingState(saveBtn, false);
            showSuccessNotification('学习计划添加成功！');
            
            // 2秒后跳转回首页
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            
        }, 1500); // 1.5秒延时模拟保存过程
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
    // 移除现有的通知
    const existingNotification = document.querySelector('.notification-bubble');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 创建新通知
    const notification = document.createElement('div');
    notification.className = 'notification-bubble';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // 3秒后自动隐藏
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// 获取表单数据 - 增强版本
function getFormData() {
    const categorySelect = document.getElementById('categorySelect');
    let category = categorySelect.value;
    
    // 如果选择的是自定义类别且正在输入，使用输入的值
    if (category === 'custom') {
        const newCategoryName = document.getElementById('newCategoryName').value.trim();
        if (newCategoryName) {
            category = newCategoryName;
        }
    }
    
    // 获取重复类型详情
    const recurrenceType = document.querySelector('.recurrence-option.active')?.getAttribute('data-value') || 'once';
    const recurrenceData = getRecurrenceData(recurrenceType);
    
    return {
        startDate: document.getElementById('startDate').value,
        category: category,
        name: document.getElementById('planName').value.trim(),
        content: document.getElementById('planContent').value.trim(),
        recurrenceType: recurrenceType,
        recurrenceData: recurrenceData,
        startTime: document.getElementById('startTime').value,
        endTime: document.getElementById('endTime').value,
        customPoints: document.getElementById('customPoints').checked
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
            
        case 'monthly':
            data.startDate = document.getElementById('monthlyStartDate').value;
            data.endDate = document.getElementById('monthlyEndDate').value;
            data.monthlyType = document.querySelector('input[name="monthlyType"]:checked').value;
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

// 保存计划 - 增强版本
function savePlan(data) {
    // 根据重复类型生成多个任务
    const tasks = generateTasks(data);
    
    // 保存所有任务
    tasks.forEach(task => {
        saveTaskToStorage(task);
    });
    
    console.log(`成功创建 ${tasks.length} 个任务:`, tasks);
}

// 根据重复类型生成任务
function generateTasks(data) {
    const tasks = [];
    const baseTask = {
        id: Date.now(), // 基础ID，实际每个任务会有不同的ID
        name: data.name,
        subject: data.category,
        description: data.content,
        startTime: data.startTime,
        endTime: data.endTime,
        time: calculateDuration(data.startTime, data.endTime),
        points: data.customPoints ? 10 : 5,
        completed: false,
        repeatType: data.recurrenceType
    };
    
    switch (data.recurrenceType) {
        case 'once':
            // 仅当天：创建一个任务
            tasks.push({
                ...baseTask,
                id: baseTask.id,
                date: data.startDate
            });
            break;
            
        case 'daily':
            // 每天：从开始日期到结束日期每天创建任务
            tasks.push(...generateDailyTasks(baseTask, data.recurrenceData));
            break;
            
        case 'weekly':
            // 每周：在选定的星期几创建任务
            tasks.push(...generateWeeklyTasks(baseTask, data.recurrenceData));
            break;
            
        case 'biweekly':
            // 每两周：在选定的星期几创建任务，间隔两周
            tasks.push(...generateBiweeklyTasks(baseTask, data.recurrenceData));
            break;
            
        case 'monthly':
            // 每月：根据选择类型创建任务
            tasks.push(...generateMonthlyTasks(baseTask, data.recurrenceData));
            break;
    }
    
    return tasks;
}

// 生成每日任务
function generateDailyTasks(baseTask, recurrenceData) {
    const tasks = [];
    const startDate = new Date(recurrenceData.startDate);
    const endDate = new Date(recurrenceData.endDate);
    
    let currentDate = new Date(startDate);
    let taskId = baseTask.id;
    
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
function generateWeeklyTasks(baseTask, recurrenceData) {
    const tasks = [];
    const startDate = new Date(recurrenceData.startDate);
    const endDate = new Date(recurrenceData.endDate);
    const weekdays = recurrenceData.weekdays;
    
    let currentDate = new Date(startDate);
    let taskId = baseTask.id;
    
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
function generateBiweeklyTasks(baseTask, recurrenceData) {
    const tasks = [];
    const startDate = new Date(recurrenceData.startDate);
    const endDate = new Date(recurrenceData.endDate);
    const weekdays = recurrenceData.weekdays;
    
    let currentDate = new Date(startDate);
    let taskId = baseTask.id;
    let weekCount = 0;
    
    while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        
        if (weekdays.includes(dayOfWeek) && weekCount % 2 === 0) {
            tasks.push({
                ...baseTask,
                id: taskId++,
                date: currentDate.toISOString().split('T')[0]
            });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
        
        // 每周一重置周计数
        if (currentDate.getDay() === 1) {
            weekCount++;
        }
    }
    
    return tasks;
}

// 生成每月任务
function generateMonthlyTasks(baseTask, recurrenceData) {
    const tasks = [];
    const startDate = new Date(recurrenceData.startDate);
    const endDate = new Date(recurrenceData.endDate);
    const monthlyType = recurrenceData.monthlyType;
    
    let currentDate = new Date(startDate);
    let taskId = baseTask.id;
    
    while (currentDate <= endDate) {
        tasks.push({
            ...baseTask,
            id: taskId++,
            date: currentDate.toISOString().split('T')[0]
        });
        
        // 下个月的同一天
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return tasks;
}