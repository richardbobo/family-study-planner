// 修复版本 - 添加计划页面
console.log('add-plan.js 已加载');

// 全局变量
let currentRecurrenceType = 'once';
let isSubmitting = false; // 防止重复提交
// 类别标签管理功能
let customCategories = JSON.parse(localStorage.getItem('customCategories') || '[]');
let recentCategories = JSON.parse(localStorage.getItem('recentCategories') || '[]');

// 修改原有的初始化函数，添加类别功能初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    initializeCustomCategories();
    initializeCategoryFeatures();
    
    // 设置当前日期
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    document.querySelector('.date-highlight').textContent = today;
});


function initializePage() {
    console.log('初始化页面');
    
    // 设置动态日期
    setDynamicDates();
    
    // 绑定事件
    bindEvents();
    
    // 设置默认重复类型
    setRecurrenceType('once');
}

function setDynamicDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    const nextWeek = new Date(today);
    const nextMonth = new Date(today);
    
    tomorrow.setDate(today.getDate() + 1);
    nextWeek.setDate(today.getDate() + 7);
    nextMonth.setMonth(today.getMonth() + 1);
    
    // 更新页面显示的日期
    updateDateDisplay(today);
    
    // 设置表单日期输入框
    const dateElements = {
        'startDate': today,
        'dailyStartDate': today,
        'dailyEndDate': nextWeek,
        'weeklyStartDate': today,
        'weeklyEndDate': nextMonth,
        'monthlyStartDate': today,
        'monthlyEndDate': nextMonth
    };
    
    Object.keys(dateElements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = formatDate(dateElements[id]);
        }
    });
}

function updateDateDisplay(today) {
    // 更新"正在为 XXXX年XX月XX日 添加计划"的显示
    const dateDisplay = document.querySelector('.current-date-info .date-highlight');
    if (dateDisplay) {
        const formattedDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
        dateDisplay.textContent = formattedDate;
    }
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function bindEvents() {
    console.log('绑定事件');
    
    // 重复类型选择
    const recurrenceOptions = document.querySelectorAll('.recurrence-option');
    recurrenceOptions.forEach(option => {
        option.addEventListener('click', function() {
            const type = this.getAttribute('data-value');
            console.log('选择了重复类型:', type);
            setRecurrenceType(type);
        });
    });
    
    // 星期选择
    const weekdayOptions = document.querySelectorAll('.weekday-option');
    weekdayOptions.forEach(option => {
        option.addEventListener('click', function() {
            this.classList.toggle('selected');
            console.log('星期选择状态变化');
        });
    });
    
    // 取消按钮
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            if (confirm('确定要取消吗？')) {
                window.location.href = 'index.html';
            }
        });
    }
    
    // 保存按钮 - 使用一次性事件
    const saveBtn = document.querySelector('.btn-save');
    if (saveBtn) {
        // 移除之前的事件监听器，避免重复绑定
        saveBtn.replaceWith(saveBtn.cloneNode(true));
        // 重新获取元素并绑定事件
        document.querySelector('.btn-save').addEventListener('click', handleFormSubmit);
    }
    
    // 字符计数
    const planContent = document.getElementById('planContent');
    if (planContent) {
        planContent.addEventListener('input', updateCharCount);
    }
}

function setRecurrenceType(type) {
    console.log('设置重复类型:', type);
    currentRecurrenceType = type;
    
    // 更新UI选中状态
    document.querySelectorAll('.recurrence-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    const selectedOption = document.querySelector(`.recurrence-option[data-value="${type}"]`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
    
    // 显示对应的详情区域
    document.querySelectorAll('.detail-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const detailSection = document.querySelector(`.${type}-details`);
    if (detailSection) {
        detailSection.classList.add('active');
    }
}

function updateCharCount() {
    const textarea = document.getElementById('planContent');
    const count = document.getElementById('contentCount');
    if (textarea && count) {
        count.textContent = textarea.value.length;
    }
}

function handleFormSubmit(event) {
    if (event) {
        event.preventDefault();
    }
    
    // 防止重复提交
    if (isSubmitting) {
        console.log('正在提交中，请勿重复点击');
        return;
    }
    
    isSubmitting = true;
    console.log('开始处理表单提交');
    
    // 禁用保存按钮
    const saveBtn = document.querySelector('.btn-save');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
    }
    
    try {
        if (!validateForm()) {
            resetSubmitState();
            return;
        }
        
        const formData = collectFormData();
        console.log('收集的表单数据:', formData);
        
        const tasks = generateTasks(formData);
        console.log('生成的任务:', tasks);
        
        if (tasks.length === 0) {
            showNotification('请选择至少一个重复日期', 'warning');
            resetSubmitState();
            return;
        }
        
        saveTasks(tasks);
        
        // 使用漂亮的通知而不是alert
        showNotification(`🎉 成功创建 ${tasks.length} 个学习计划！`, 'success');
        
        // 3秒后跳转回主页
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 3000);
        
    } catch (error) {
        console.error('提交出错:', error);
        showNotification('❌ 保存失败，请重试', 'error');
        resetSubmitState();
    }
}

function resetSubmitState() {
    isSubmitting = false;
    const saveBtn = document.querySelector('.btn-save');
    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '保存计划';
    }
}

// 漂亮的通知函数
function showNotification(message, type = 'info') {
    // 移除现有的通知
    const existingNotification = document.querySelector('.custom-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `custom-notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // 添加样式
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
    
    // 动画显示
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 100);
    
    // 3秒后自动消失
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

function validateForm() {
    const planName = document.getElementById('planName')?.value.trim();
    const category = document.getElementById('categorySelect')?.value;
    
    if (!planName) {
        showNotification('请填写计划名称', 'warning');
        document.getElementById('planName')?.focus();
        return false;
    }
    
    if (planName.length > 20) {
        showNotification('计划名称不能超过20个字', 'warning');
        document.getElementById('planName')?.focus();
        return false;
    }
    
    if (!category) {
        showNotification('请选择科目', 'warning');
        document.getElementById('categorySelect')?.focus();
        return false;
    }
    
    return true;
}

function collectFormData() {
    // 获取选中的星期
    const selectedWeekdays = Array.from(document.querySelectorAll('.weekday-option.selected'))
        .map(opt => parseInt(opt.getAttribute('data-day')));
    
    return {
        name: document.getElementById('planName').value.trim(),
        subject: document.getElementById('categorySelect').value,
        content: document.getElementById('planContent').value.trim(),
        recurrenceType: currentRecurrenceType,
        startTime: document.getElementById('startTime').value || '19:00',
        endTime: document.getElementById('endTime').value || '20:30',
        startDate: document.getElementById('startDate').value,
        dailyStartDate: document.getElementById('dailyStartDate').value,
        dailyEndDate: document.getElementById('dailyEndDate').value,
        weeklyStartDate: document.getElementById('weeklyStartDate').value,
        weeklyEndDate: document.getElementById('weeklyEndDate').value,
        monthlyStartDate: document.getElementById('monthlyStartDate').value,
        monthlyEndDate: document.getElementById('monthlyEndDate').value,
        selectedWeekdays: selectedWeekdays
    };
}

function generateTasks(formData) {
    const tasks = [];
    
    switch (formData.recurrenceType) {
        case 'once':
            tasks.push(createSingleTask(formData));
            break;
        case 'daily':
            tasks.push(...createDailyTasks(formData));
            break;
        case 'weekly':
            tasks.push(...createWeeklyTasks(formData));
            break;
        case 'monthly':
            tasks.push(...createMonthlyTasks(formData));
            break;
    }
    
    return tasks;
}

function createSingleTask(formData) {
    const duration = calculateDuration(formData.startTime, formData.endTime);
    
    return {
        name: formData.name,
        subject: formData.subject,
        date: formData.startDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        time: duration,
        note: formData.content,
        completed: false,
        recurrence: null
    };
}

function createDailyTasks(formData) {
    const tasks = [];
    const startDate = new Date(formData.dailyStartDate);
    const endDate = new Date(formData.dailyEndDate);
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        tasks.push({
            ...createSingleTask(formData),
            date: formatDate(currentDate),
            recurrence: 'daily'
        });
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return tasks;
}

function createWeeklyTasks(formData) {
    const tasks = [];
    const startDate = new Date(formData.weeklyStartDate);
    const endDate = new Date(formData.weeklyEndDate);
    const selectedWeekdays = formData.selectedWeekdays || [];
    
    if (selectedWeekdays.length === 0) {
        showNotification('请选择至少一个重复日期', 'warning');
        return [];
    }
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        
        if (selectedWeekdays.includes(dayOfWeek)) {
            tasks.push({
                ...createSingleTask(formData),
                date: formatDate(currentDate),
                recurrence: 'weekly'
            });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return tasks;
}

function createMonthlyTasks(formData) {
    const tasks = [];
    const startDate = new Date(formData.monthlyStartDate);
    const endDate = new Date(formData.monthlyEndDate);
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        tasks.push({
            ...createSingleTask(formData),
            date: formatDate(currentDate),
            recurrence: 'monthly'
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return tasks;
}

function calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return 60;
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diff = (end - start) / (1000 * 60);
    
    return diff > 0 ? Math.round(diff) : 60;
}

function saveTasks(tasks) {
    // 获取现有任务
    let existingTasks = [];
    try {
        const saved = localStorage.getItem('studyTasks');
        if (saved) {
            existingTasks = JSON.parse(saved);
        }
    } catch (e) {
        console.error('读取本地存储失败:', e);
    }
    
    // 为新任务生成ID
    const maxId = existingTasks.length > 0 ? 
        Math.max(...existingTasks.map(t => t.id || 0)) : 0;
    
    tasks.forEach((task, index) => {
        task.id = maxId + index + 1;
    });
    
    // 合并并保存
    const allTasks = [...existingTasks, ...tasks];
    localStorage.setItem('studyTasks', JSON.stringify(allTasks));
    
    console.log('保存了', tasks.length, '个任务，总共', allTasks.length, '个任务');
}



// 初始化类别功能
function initializeCategoryFeatures() {
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const customCategoryInput = document.getElementById('customCategoryInput');
    const confirmAddCategory = document.getElementById('confirmAddCategory');
    const cancelAddCategory = document.getElementById('cancelAddCategory');
    const newCategoryName = document.getElementById('newCategoryName');
    const categorySelect = document.getElementById('categorySelect');
    const categoryTags = document.getElementById('categoryTags');

    // 显示添加类别输入框
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', function() {
            customCategoryInput.style.display = 'block';
            newCategoryName.focus();
        });
    }

    // 取消添加类别
    if (cancelAddCategory) {
        cancelAddCategory.addEventListener('click', function() {
            customCategoryInput.style.display = 'none';
            newCategoryName.value = '';
        });
    }

    // 确认添加类别
    if (confirmAddCategory) {
        confirmAddCategory.addEventListener('click', function() {
            const categoryName = newCategoryName.value.trim();
            if (categoryName && categoryName.length <= 10) {
                addCustomCategory(categoryName);
                customCategoryInput.style.display = 'none';
                newCategoryName.value = '';
            } else {
                alert('请输入有效的类别名称（1-10个字符）');
            }
        });
    }

    // 回车键确认添加
    if (newCategoryName) {
        newCategoryName.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmAddCategory.click();
            }
        });
    }

    // 初始化最近使用类别
    updateRecentCategories();
}

// 添加自定义类别
function addCustomCategory(categoryName) {
    if (!customCategories.includes(categoryName)) {
        customCategories.push(categoryName);
        localStorage.setItem('customCategories', JSON.stringify(customCategories));
        
        // 添加到下拉选择框
        const categorySelect = document.getElementById('categorySelect');
        const option = document.createElement('option');
        option.value = categoryName;
        option.textContent = categoryName;
        categorySelect.appendChild(option);
    }
    
    // 添加到最近使用
    addToRecentCategories(categoryName);
    
    // 选中新添加的类别
    categorySelect.value = categoryName;
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
        });
        categoryTags.appendChild(tag);
    });
}

// 在页面加载时初始化自定义类别到下拉框
function initializeCustomCategories() {
    const categorySelect = document.getElementById('categorySelect');
    
    customCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

