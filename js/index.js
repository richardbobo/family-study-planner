// 主页面逻辑 - 完整修复版本
console.log('index.js 已加载');

let tasks = [];
let currentWeekStart = getMonday(new Date()); // 默认从当前周的周一开始
let currentTaskId = null;

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    console.log('主页DOM已加载');
    loadTasks();
    initializeNavigation();
    initializeModal();
    renderWeekView();
    renderTaskList();
    updateStats();
});

// 获取周一的日期
function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// 初始化导航功能
function initializeNavigation() {
    const prevWeekBtn = document.getElementById('prevWeekBtn');
    const nextWeekBtn = document.getElementById('nextWeekBtn');
    const todayBtn = document.getElementById('todayBtn');
    
    if (prevWeekBtn) prevWeekBtn.addEventListener('click', () => navigateWeek(-1));
    if (nextWeekBtn) nextWeekBtn.addEventListener('click', () => navigateWeek(1));
    if (todayBtn) todayBtn.addEventListener('click', goToToday);
}

// 跳转到今天
function goToToday() {
    currentWeekStart = getMonday(new Date());
    renderWeekView();
    renderTaskList();
    updateStats();
}

// 周导航
function navigateWeek(direction) {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + (direction * 7));
    currentWeekStart = newDate;
    renderWeekView();
    renderTaskList();
    updateStats();
}

// 渲染周视图
function renderWeekView() {
    const weekDaysContainer = document.getElementById('weekDays');
    const currentDateElement = document.getElementById('currentDate');
    const weekInfoElement = document.getElementById('weekInfo');
    
    if (!weekDaysContainer) return;
    
    // 更新日期显示
    updateDateDisplay(currentDateElement, weekInfoElement);
    
    // 生成一周的日期卡片
    let weekDaysHTML = '';
    const today = new Date().toISOString().split('T')[0];
    
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(currentWeekStart);
        currentDate.setDate(currentWeekStart.getDate() + i);
        
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayTasks = tasks.filter(task => task.date === dateStr);
        const completedTasks = dayTasks.filter(task => task.completed);
        
        const isToday = dateStr === today;
        const isActive = i === 0;
        
        weekDaysHTML += createDayCardHTML(currentDate, dayTasks, completedTasks, isToday, isActive);
    }
    
    weekDaysContainer.innerHTML = weekDaysHTML;
    
    // 重新绑定日期卡片点击事件
    bindDayCardEvents();
}

// 更新日期显示
function updateDateDisplay(currentDateElement, weekInfoElement) {
    if (currentDateElement && weekInfoElement) {
        const monday = new Date(currentWeekStart);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        // 格式化日期显示
        const startYear = monday.getFullYear();
        const startMonth = monday.getMonth() + 1;
        const startDay = monday.getDate();
        const endYear = sunday.getFullYear();
        const endMonth = sunday.getMonth() + 1;
        const endDay = sunday.getDate();
        
        let dateDisplay;
        if (startYear === endYear && startMonth === endMonth) {
            // 同一年同一月：2025年10月27日-31日
            dateDisplay = `${startYear}年${startMonth}月${startDay}日-${endDay}日`;
        } else if (startYear === endYear) {
            // 同一年不同月：2025年10月27日-11月2日
            dateDisplay = `${startYear}年${startMonth}月${startDay}日-${endMonth}月${endDay}日`;
        } else {
            // 跨年：2025年12月27日-2026年1月2日
            dateDisplay = `${startYear}年${startMonth}月${startDay}日-${endYear}年${endMonth}月${endDay}日`;
        }
        
        const weekNumber = getWeekNumber(monday);
        
        currentDateElement.textContent = dateDisplay;
        weekInfoElement.textContent = `第${weekNumber}周`;
    }
}

// 计算周数（ISO 8601标准）
function getWeekNumber(date) {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
}

// 创建日期卡片HTML
function createDayCardHTML(date, dayTasks, completedTasks, isToday, isActive) {
    const dateStr = date.toISOString().split('T')[0];
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dayName = dayNames[date.getDay()];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const activeClass = isActive ? 'active' : '';
    const todayClass = isToday ? 'today' : '';
    
    return `
        <div class="day-card ${activeClass} ${todayClass}" data-date="${dateStr}">
            <div class="day-name">${dayName}</div>
            <div class="day-date">${month}/${day}</div>
            ${isToday ? '<div class="today-badge">今天</div>' : ''}
            ${dayTasks.length > 0 ? `
                <div class="day-tasks">
                    <div>${completedTasks.length}/${dayTasks.length} 完成</div>
                    <div class="task-count">${dayTasks.length}个任务</div>
                </div>
            ` : '<div class="day-tasks">无任务</div>'}
        </div>
    `;
}

// 绑定日期卡片点击事件
function bindDayCardEvents() {
    const dayCards = document.querySelectorAll('.day-card');
    dayCards.forEach(card => {
        card.addEventListener('click', function() {
            dayCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            const selectedDate = this.getAttribute('data-date');
            console.log(`切换到日期: ${selectedDate}`);
            
            renderTaskList();
        });
    });
}

// 初始化模态框
function initializeModal() {
    const modal = document.getElementById('taskModal');
    const closeBtn = document.getElementById('closeModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const editTaskBtn = document.getElementById('editTaskBtn');
    const deleteTaskBtn = document.getElementById('deleteTaskBtn');
    
    // 关闭模态框
    [closeBtn, closeModalBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', closeModal);
        }
    });
    
    // 编辑任务
    if (editTaskBtn) {
        editTaskBtn.addEventListener('click', editTask);
    }
    
    // 删除任务
    if (deleteTaskBtn) {
        deleteTaskBtn.addEventListener('click', deleteTask);
    }
    
    // 点击模态框外部关闭
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeModal();
            }
        });
    }
}

// 加载任务
function loadTasks() {
    try {
        const saved = localStorage.getItem('studyTasks');
        if (saved) {
            tasks = JSON.parse(saved);
            console.log('加载了', tasks.length, '个任务');
        } else {
            console.log('没有找到保存的任务，使用空数组');
            tasks = [];
        }
    } catch (e) {
        console.error('加载任务失败:', e);
        tasks = [];
    }
}

// 渲染任务列表
function renderTaskList() {
    const container = document.getElementById('tasks-container');
    if (!container) return;
    
    // 获取选中日期的任务
    const selectedDate = getSelectedDate();
    const dateTasks = tasks.filter(task => task.date === selectedDate);
    
    if (dateTasks.length === 0) {
        container.innerHTML = createEmptyState();
        return;
    }
    
    container.innerHTML = createTasksHTML(dateTasks);
}

// 获取选中日期
function getSelectedDate() {
    const activeCard = document.querySelector('.day-card.active');
    if (activeCard) {
        return activeCard.getAttribute('data-date');
    }
    
    // 如果没有选中卡片，返回周一的日期
    const monday = new Date(currentWeekStart);
    return monday.toISOString().split('T')[0];
}

function createEmptyState() {
    return `
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-calendar-plus" style="font-size: 3rem; margin-bottom: 15px; color: #ddd;"></i>
            <p style="margin-bottom: 20px; font-size: 1.1rem;">今天还没有学习计划</p>
            <a href="add-plan.html" class="btn btn-primary">
                <i class="fas fa-plus"></i> 添加第一个计划
            </a>
        </div>
    `;
}

function createTasksHTML(dateTasks) {
    let html = '';
    
    dateTasks.forEach(task => {
        const borderColor = getSubjectColor(task.subject);
        const completedClass = task.completed ? 'task-completed' : '';
        
        html += `
            <div class="task-item ${completedClass}" data-task-id="${task.id}" onclick="openTaskModal(${task.id})">
                <div class="task-info">
                    <div class="task-header">
                        <input type="checkbox" ${task.completed ? 'checked' : ''} 
                               onchange="toggleTask(${task.id})" 
                               class="task-checkbox">
                        <h4 class="task-name">${task.name}</h4>
                    </div>
                    <div class="task-meta">
                        <span class="task-subject">${task.subject}</span>
                        <span class="task-time">${task.startTime || '19:00'} - ${task.endTime || '20:30'}</span>
                        <span class="task-duration">${task.time || 30}分钟</span>
                    </div>
                    ${task.note ? `<p class="task-note">${task.note}</p>` : ''}
                </div>
                <div class="task-actions">
                    <button class="btn-quick" onclick="event.stopPropagation(); quickComplete(${task.id})">
                        <i class="fas fa-bolt"></i> 快速完成
                    </button>
                    <button class="btn-start" onclick="event.stopPropagation(); startTimer(${task.id})">
                        <i class="fas fa-play"></i> 开始计时
                    </button>
                </div>
            </div>
        `;
    });
    
    return html;
}

function getSubjectColor(subject) {
    const colors = {
        '语文': '#ff6b6b',
        '数学': '#4a69bd', 
        '英语': '#2ed573',
        '科学': '#ff9f43',
        '美术': '#f368e0',
        '体育': '#2bcbba'
    };
    return colors[subject] || '#4a69bd';
}

// 打开任务模态框
function openTaskModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    currentTaskId = taskId;
    
    // 更新模态框内容
    document.getElementById('modalTaskName').textContent = task.name;
    document.getElementById('modalTaskSubject').textContent = task.subject;
    document.getElementById('modalTaskDate').textContent = task.date;
    document.getElementById('modalTaskTime').textContent = `${task.startTime || '19:00'} - ${task.endTime || '20:30'}`;
    document.getElementById('modalTaskDuration').textContent = `${task.time || 30}分钟`;
    document.getElementById('modalTaskNote').textContent = task.note || '无备注信息';
    document.getElementById('modalTaskStatus').textContent = task.completed ? '已完成' : '未完成';
    
    // 显示模态框
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// 关闭模态框
function closeModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentTaskId = null;
}

// 编辑任务
function editTask() {
    if (!currentTaskId) return;
    
    // 这里可以跳转到编辑页面或打开编辑模态框
    alert(`编辑任务 ID: ${currentTaskId}`);
    closeModal();
}

// 删除任务
function deleteTask() {
    if (!currentTaskId) return;
    
    if (confirm('确定要删除这个任务吗？此操作不可撤销。')) {
        tasks = tasks.filter(t => t.id !== currentTaskId);
        saveTasks();
        renderWeekView();
        renderTaskList();
        updateStats();
        closeModal();
        showNotification('任务已删除', 'success');
    }
}

// 快速完成任务
function quickComplete(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.completed) {
        task.completed = true;
        saveTasks();
        renderWeekView();
        renderTaskList();
        updateStats();
        showNotification(`🎉 快速完成: ${task.name}`, 'success');
    }
}

// 开始计时
function startTimer(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        showNotification(`⏰ 开始计时: ${task.name}`, 'info');
        // 这里可以添加计时器逻辑
    }
}

// 切换任务完成状态
function toggleTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderWeekView();
        renderTaskList();
        updateStats();
        
        if (task.completed) {
            showNotification(`🎉 任务完成: ${task.name}`, 'success');
        }
    }
    
    // 阻止事件冒泡，避免触发任务点击事件
    event.stopPropagation();
}

function updateStats() {
    const completedTasks = tasks.filter(t => t.completed).length;
    const totalMinutes = tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.time || 0), 0);
    
    updateStatElement('completedTasks', completedTasks);
    updateStatElement('totalMinutes', totalMinutes);
    updateStatElement('streakDays', calculateStreakDays());
    updateStatElement('rewardPoints', calculateRewardPoints());
}

function updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

function calculateStreakDays() {
    const today = new Date().toISOString().split('T')[0];
    const todayCompleted = tasks.filter(t => t.date === today && t.completed).length;
    return todayCompleted > 0 ? 1 : 0;
}

function calculateRewardPoints() {
    return tasks.filter(t => t.completed).length * 10;
}

function saveTasks() {
    localStorage.setItem('studyTasks', JSON.stringify(tasks));
    console.log('保存了', tasks.length, '个任务');
}

// 通知函数
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