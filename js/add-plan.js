// 简化调试版本 - 添加计划页面
console.log('add-plan.js 已加载');

// 全局变量
let currentRecurrenceType = 'once';

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM已加载');
    initializePage();
});

function initializePage() {
    console.log('初始化页面');
    
    // 设置默认日期
    setDefaultDates();
    
    // 绑定事件
    bindEvents();
    
    // 设置默认重复类型
    setRecurrenceType('once');
}

function setDefaultDates() {
    const today = new Date();
    const formattedDate = formatDate(today);
    
    // 设置所有日期输入框
    const dateInputs = [
        'startDate', 'dailyStartDate', 'dailyEndDate', 
        'weeklyStartDate', 'weeklyEndDate', 'monthlyStartDate', 'monthlyEndDate'
    ];
    
    dateInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.value = formattedDate;
        }
    });
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
    
    // 保存按钮
    const saveBtn = document.querySelector('.btn-save');
    if (saveBtn) {
        saveBtn.addEventListener('click', handleFormSubmit);
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
    
    console.log('开始处理表单提交');
    
    if (!validateForm()) {
        return;
    }
    
    const formData = collectFormData();
    console.log('收集的表单数据:', formData);
    
    const tasks = generateTasks(formData);
    console.log('生成的任务:', tasks);
    
    saveTasks(tasks);
    
    alert(`成功创建 ${tasks.length} 个学习计划！`);
    
    // 跳转回主页
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

function validateForm() {
    const planName = document.getElementById('planName')?.value.trim();
    const category = document.getElementById('categorySelect')?.value;
    
    if (!planName) {
        alert('请填写计划名称');
        return false;
    }
    
    if (!category) {
        alert('请选择科目');
        return false;
    }
    
    return true;
}

function collectFormData() {
    return {
        name: document.getElementById('planName').value.trim(),
        subject: document.getElementById('categorySelect').value,
        content: document.getElementById('planContent').value.trim(),
        recurrenceType: currentRecurrenceType,
        startTime: document.getElementById('startTime').value || '19:00',
        endTime: document.getElementById('endTime').value || '20:30',
        startDate: document.getElementById('startDate').value
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
    return {
        name: formData.name,
        subject: formData.subject,
        date: formData.startDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        time: 60, // 默认60分钟
        note: formData.content,
        completed: false,
        recurrence: null
    };
}

function createDailyTasks(formData) {
    // 简化版本：只创建3天的任务用于测试
    const tasks = [];
    const startDate = new Date(formData.startDate);
    
    for (let i = 0; i < 3; i++) {
        const taskDate = new Date(startDate);
        taskDate.setDate(startDate.getDate() + i);
        
        tasks.push({
            ...createSingleTask(formData),
            date: formatDate(taskDate)
        });
    }
    
    return tasks;
}

function createWeeklyTasks(formData) {
    const tasks = [];
    const startDate = new Date(formData.startDate);
    
    // 简化版本：创建2周的任务
    for (let i = 0; i < 2; i++) {
        const taskDate = new Date(startDate);
        taskDate.setDate(startDate.getDate() + (i * 7));
        
        tasks.push({
            ...createSingleTask(formData),
            date: formatDate(taskDate)
        });
    }
    
    return tasks;
}

function createMonthlyTasks(formData) {
    const tasks = [];
    const startDate = new Date(formData.startDate);
    
    // 简化版本：创建2个月的任务
    for (let i = 0; i < 2; i++) {
        const taskDate = new Date(startDate);
        taskDate.setMonth(startDate.getMonth() + i);
        
        tasks.push({
            ...createSingleTask(formData),
            date: formatDate(taskDate)
        });
    }
    
    return tasks;
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