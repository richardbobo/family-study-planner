// 添加计划页面逻辑
document.addEventListener('DOMContentLoaded', function() {
    // 初始化表单
    initializeForm();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 设置默认日期
    setDefaultDates();
});

// 初始化表单
function initializeForm() {
    // 设置字符计数
    updateCharCount();
    
    // 设置默认重复类型
    setRecurrenceType('once');
    
    // 设置默认日期范围
    setDefaultDateRanges();
}

// 设置事件监听器
function setupEventListeners() {
    // 表单提交
    document.getElementById('planForm').addEventListener('submit', handleFormSubmit);
    
    // 重复类型选择
    document.querySelectorAll('.recurrence-option').forEach(option => {
        option.addEventListener('click', handleRecurrenceSelect);
    });
    
    // 字符计数
    document.getElementById('planContent').addEventListener('input', updateCharCount);
    
    // 星期选择
    document.querySelectorAll('.weekday-option').forEach(option => {
        option.addEventListener('click', handleWeekdaySelect);
    });
    
    // 取消按钮
    document.getElementById('cancelBtn').addEventListener('click', handleCancel);
}

// 设置默认日期
function setDefaultDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 30); // 默认结束日期为30天后
    
    // 设置日期输入框的默认值
    document.getElementById('startDate').value = formatDate(today);
    document.getElementById('dailyStartDate').value = formatDate(today);
    document.getElementById('dailyEndDate').value = formatDate(tomorrow);
    document.getElementById('weeklyStartDate').value = formatDate(today);
    document.getElementById('weeklyEndDate').value = formatDate(tomorrow);
    document.getElementById('monthlyStartDate').value = formatDate(today);
    document.getElementById('monthlyEndDate').value = formatDate(tomorrow);
}

// 设置默认日期范围
function setDefaultDateRanges() {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setMonth(endDate.getMonth() + 1); // 默认结束日期为1个月后
    
    document.getElementById('dailyEndDate').value = formatDate(endDate);
    document.getElementById('weeklyEndDate').value = formatDate(endDate);
    document.getElementById('monthlyEndDate').value = formatDate(endDate);
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 更新字符计数
function updateCharCount() {
    const textarea = document.getElementById('planContent');
    const count = document.getElementById('contentCount');
    count.textContent = textarea.value.length;
}

// 处理重复类型选择
function handleRecurrenceSelect(event) {
    const option = event.currentTarget;
    const type = option.getAttribute('data-value');
    
    // 更新选中状态
    document.querySelectorAll('.recurrence-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    option.classList.add('selected');
    
    // 设置重复类型
    setRecurrenceType(type);
}

// 设置重复类型
function setRecurrenceType(type) {
    // 隐藏所有详情区域
    document.querySelectorAll('.detail-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 显示对应的详情区域
    const detailSection = document.querySelector(`.${type}-details`);
    if (detailSection) {
        detailSection.classList.add('active');
    }
    
    // 更新表单数据
    document.querySelector('input[name="recurrenceType"]').value = type;
}

// 处理星期选择
function handleWeekdaySelect(event) {
    const option = event.currentTarget;
    option.classList.toggle('selected');
}

// 处理表单提交
function handleFormSubmit(event) {
    event.preventDefault();
    
    // 验证表单
    if (!validateForm()) {
        return;
    }
    
    // 收集表单数据
    const formData = collectFormData();
    
    // 生成任务
    const generatedTasks = generateTasks(formData);
    
    // 保存任务
    saveTasks(generatedTasks);
    
    // 显示成功消息
    showSuccessMessage(generatedTasks.length);
    
    // 延迟跳转回主页
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 2000);
}

// 验证表单
function validateForm() {
    const planName = document.getElementById('planName').value.trim();
    const category = document.getElementById('categorySelect').value;
    const recurrenceType = document.querySelector('.recurrence-option.selected')?.getAttribute('data-value');
    
    // 验证计划名称
    if (!planName) {
        alert('请填写计划名称');
        document.getElementById('planName').focus();
        return false;
    }
    
    if (planName.length < 1 || planName.length > 20) {
        alert('计划名称长度应在1-20字之间');
        document.getElementById('planName').focus();
        return false;
    }
    
    // 验证类别
    if (!category) {
        alert('请选择类别');
        document.getElementById('categorySelect').focus();
        return false;
    }
    
    // 验证重复类型
    if (!recurrenceType) {
        alert('请选择重复类型');
        return false;
    }
    
    // 验证日期范围
    if (!validateDateRanges(recurrenceType)) {
        return false;
    }
    
    return true;
}

// 验证日期范围
function validateDateRanges(recurrenceType) {
    let startDate, endDate;
    
    switch (recurrenceType) {
        case 'daily':
            startDate = new Date(document.getElementById('dailyStartDate').value);
            endDate = new Date(document.getElementById('dailyEndDate').value);
            break;
        case 'weekly':
            startDate = new Date(document.getElementById('weeklyStartDate').value);
            endDate = new Date(document.getElementById('weeklyEndDate').value);
            break;
        case 'monthly':
            startDate = new Date(document.getElementById('monthlyStartDate').value);
            endDate = new Date(document.getElementById('monthlyEndDate').value);
            break;
        default:
            return true;
    }
    
    if (endDate < startDate) {
        alert('结束日期不能早于开始日期');
        return false;
    }
    
    return true;
}

// 收集表单数据
function collectFormData() {
    const recurrenceType = document.querySelector('.recurrence-option.selected').getAttribute('data-value');
    
    const formData = {
        name: document.getElementById('planName').value.trim(),
        subject: document.getElementById('categorySelect').value,
        content: document.getElementById('planContent').value.trim(),
        recurrenceType: recurrenceType,
        startTime: document.getElementById('startTime').value,
        endTime: document.getElementById('endTime').value,
        customPoints: document.getElementById('customPoints').checked,
        startDate: document.getElementById('startDate').value
    };
    
    // 根据重复类型添加额外数据
    switch (recurrenceType) {
        case 'daily':
            formData.dailyStartDate = document.getElementById('dailyStartDate').value;
            formData.dailyEndDate = document.getElementById('dailyEndDate').value;
            break;
        case 'weekly':
            formData.weeklyStartDate = document.getElementById('weeklyStartDate').value;
            formData.weeklyEndDate = document.getElementById('weeklyEndDate').value;
            formData.selectedWeekdays = Array.from(document.querySelectorAll('.weekday-option.selected'))
                .map(opt => parseInt(opt.getAttribute('data-day')));
            break;
        case 'monthly':
            formData.monthlyStartDate = document.getElementById('monthlyStartDate').value;
            formData.monthlyEndDate = document.getElementById('monthlyEndDate').value;
            break;
    }
    
    return formData;
}

// 生成任务
function generateTasks(formData) {
    const tasks = [];
    
    switch (formData.recurrenceType) {
        case 'once':
            // 单次任务
            tasks.push(createTask(formData, formData.startDate));
            break;
            
        case 'daily':
            // 每日重复任务
            tasks.push(...generateDailyTasks(formData));
            break;
            
        case 'weekly':
            // 每周重复任务
            tasks.push(...generateWeeklyTasks(formData));
            break;
            
        case 'monthly':
            // 每月重复任务
            tasks.push(...generateMonthlyTasks(formData));
            break;
    }
    
    return tasks;
}

// 创建单个任务
function createTask(formData, date) {
    const startTime = formData.startTime || '19:00';
    const endTime = formData.endTime || '20:30';
    const duration = calculateDuration(startTime, endTime);
    
    return {
        name: formData.name,
        subject: formData.subject,
        date: date,
        startTime: startTime,
        endTime: endTime,
        time: duration,
        timeOfDay: getTimeOfDay(startTime),
        note: formData.content,
        recurrence: formData.recurrenceType !== 'once' ? formData.recurrenceType : null
    };
}

// 生成每日重复任务
function generateDailyTasks(formData) {
    const tasks = [];
    const startDate = new Date(formData.dailyStartDate);
    const endDate = new Date(formData.dailyEndDate);
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        tasks.push(createTask(formData, formatDate(currentDate)));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return tasks;
}

// 生成每周重复任务
function generateWeeklyTasks(formData) {
    const tasks = [];
    const startDate = new Date(formData.weeklyStartDate);
    const endDate = new Date(formData.weeklyEndDate);
    const selectedWeekdays = formData.selectedWeekdays || [];
    
    if (selectedWeekdays.length === 0) {
        alert('请选择至少一个重复日期');
        return tasks;
    }
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        
        if (selectedWeekdays.includes(dayOfWeek)) {
            tasks.push(createTask(formData, formatDate(currentDate)));
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return tasks;
}

// 生成每月重复任务
function generateMonthlyTasks(formData) {
    const tasks = [];
    const startDate = new Date(formData.monthlyStartDate);
    const endDate = new Date(formData.monthlyEndDate);
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
        tasks.push(createTask(formData, formatDate(currentDate)));
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return tasks;
}

// 计算时间持续时间（分钟）
function calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return 30;
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diff = (end - start) / (1000 * 60);
    
    return diff > 0 ? diff : 30;
}

// 根据时间获取时间段
function getTimeOfDay(time) {
    if (!time) return '未设置';
    
    const hour = parseInt(time.split(':')[0]);
    if (hour < 9) return '早上';
    if (hour < 12) return '上午';
    if (hour < 14) return '中午';
    if (hour < 18) return '下午';
    return '晚上';
}

// 保存任务到本地存储
function saveTasks(tasks) {
    // 获取现有任务
    const existingTasks = JSON.parse(localStorage.getItem('studyTasks') || '[]');
    
    // 生成新任务的ID
    const maxId = existingTasks.length > 0 ? Math.max(...existingTasks.map(t => t.id)) : 0;
    
    // 为新任务添加ID
    tasks.forEach((task, index) => {
        task.id = maxId + index + 1;
        task.completed = false;
    });
    
    // 合并任务
    const allTasks = [...existingTasks, ...tasks];
    
    // 保存到本地存储
    localStorage.setItem('studyTasks', JSON.stringify(allTasks));
}

// 显示成功消息
function showSuccessMessage(taskCount) {
    const message = document.createElement('div');
    message.className = 'success-message';
    message.innerHTML = `
        <div class="success-content">
            <i class="fas fa-check-circle"></i>
            <h3>计划添加成功！</h3>
            <p>已创建 ${taskCount} 个学习计划</p>
            <p>正在跳转回主页...</p>
        </div>
    `;
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .success-message {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .success-content {
            background: white;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            animation: successScale 0.5s;
        }
        
        .success-content i {
            font-size: 4rem;
            color: #2ed573;
            margin-bottom: 15px;
        }
        
        .success-content h3 {
            color: #333;
            margin-bottom: 10px;
        }
        
        .success-content p {
            color: #666;
            margin-bottom: 5px;
        }
        
        @keyframes successScale {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(message);
}

// 处理取消操作
function handleCancel() {
    if (confirm('确定要取消添加计划吗？所有输入的内容将会丢失。')) {
        window.location.href = 'index.html';
    }
}