// 完整版本 - 主页面
console.log('index.js 已加载');

let tasks = [];
let currentWeekStart = getMonday(new Date()); // 默认从周一开始

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    console.log('主页DOM已加载');
    loadTasks();
    initializeNavigation();
    renderWeekView();
    renderTaskList();
    updateStats();
});

// 获取周一的日期
function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 周日的特殊处理
    return new Date(d.setDate(diff));
}

// 初始化导航功能
function initializeNavigation() {
    // 前一周按钮
    const prevWeekBtn = document.getElementById('prevWeekBtn');
    if (prevWeekBtn) {
        prevWeekBtn.addEventListener('click', function() {
            navigateWeek(-1);
        });
    }
    
    // 后一周按钮
    const nextWeekBtn = document.getElementById('nextWeekBtn');
    if (nextWeekBtn) {
        nextWeekBtn.addEventListener('click', function() {
            navigateWeek(1);
        });
    }
    
    // 今天按钮
    const todayBtn = document.getElementById('todayBtn');
    if (todayBtn) {
        todayBtn.addEventListener('click', function() {
            currentWeekStart = getMonday(new Date());
            renderWeekView();
            renderTaskList();
            updateStats();
        });
    }
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
    const weekInfoElement = document.getElementById('weekInfo');
    
    if (!weekDaysContainer) return;
    
    // 更新周信息显示
    if (weekInfoElement) {
        weekInfoElement.textContent = getWeekInfo(currentWeekStart);
    }
    
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
        const isActive = i === 0; // 默认选中周一
        
        weekDaysHTML += createDayCardHTML(currentDate, dayTasks, completedTasks, isToday, isActive);
    }
    
    weekDaysContainer.innerHTML = weekDaysHTML;
    
    // 重新绑定日期卡片点击事件
    bindDayCardEvents();
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
            // 移除所有卡片的选中状态
            dayCards.forEach(c => c.classList.remove('active'));
            // 添加当前卡片的选中状态
            this.classList.add('active');
            
            // 这里可以添加加载对应日期任务的逻辑
            const selectedDate = this.getAttribute('data-date');
            console.log('切换到日期:', selectedDate);
            // 如果需要可以在这里实现日期切换功能
        });
    });
}

// 获取周信息
function getWeekInfo(startDate) {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const startMonth = startDate.getMonth() + 1;
    const endMonth = endDate.getMonth() + 1;
    const year = startDate.getFullYear();
    
    // 计算周数
    const weekNumber = getWeekNumber(startDate);
    
    if (startMonth === endMonth) {
        return `${year}年${startMonth}月 第${weekNumber}周`;
    } else {
        return `${year}年${startMonth}-${endMonth}月 第${weekNumber}周`;
    }
}

// 计算周数
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
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

// 查找任务容器
function findTaskContainer() {
    const possibleIds = ['tasks-container', 'taskList', 'tasksContainer', 'task-list'];
    
    for (let id of possibleIds) {
        const container = document.getElementById(id);
        if (container) {
            console.log('找到任务容器:', id);
            return container;
        }
    }
    
    const byClass = document.querySelector('.task-list');
    if (byClass) {
        console.log('通过class找到任务容器');
        return byClass;
    }
    
    console.error('无法找到任务容器，请检查HTML结构');
    return null;
}

// 渲染任务列表
function renderTaskList() {
    const container = findTaskContainer();
    if (!container) {
        createFallbackContainer();
        return;
    }
    
    // 获取选中日期的任务（默认为周一）
    const selectedDate = getSelectedDate();
    const dateTasks = tasks.filter(task => task.date === selectedDate);
    
    console.log('选中日期', selectedDate, '有', dateTasks.length, '个任务');
    
    if (dateTasks.length === 0) {
        container.innerHTML = createEmptyState();
        return;
    }
    
    container.innerHTML = createTasksHTML(dateTasks);
}

// 获取选中日期（默认为周一）
function getSelectedDate() {
    const activeCard = document.querySelector('.day-card.active');
    if (activeCard) {
        return activeCard.getAttribute('data-date');
    }
    
    // 如果没有选中卡片，返回周一的日期
    const monday = new Date(currentWeekStart);
    return monday.toISOString().split('T')[0];
}

function createFallbackContainer() {
    console.log('创建备用任务容器');
    const container = document.createElement('div');
    container.id = 'tasks-container';
    container.style.padding = '20px';
    document.body.appendChild(container);
    renderTaskList();
}

function createEmptyState() {
    return `
        <div style="text-align: center; padding: 40px; color: #666;">
            <i class="fas fa-calendar-plus" style="font-size: 3rem; margin-bottom: 15px; color: #ddd;"></i>
            <p style="margin-bottom: 20px; font-size: 1.1rem;">今天还没有学习计划</p>
            <a href="add-plan.html" class="add-btn" style="
                display: inline-block; 
                background: #4a69bd; 
                color: white; 
                padding: 10px 20px; 
                border-radius: 5px; 
                text-decoration: none;
            ">
                <i class="fas fa-plus"></i> 添加第一个计划
            </a>
        </div>
    `;
}

function createTasksHTML(dateTasks) {
    let html = '';
    dateTasks.forEach(task => {
        const borderColor = getSubjectColor(task.subject);
        const completedClass = task.completed ? 'completed' : '';
        
        html += `
            <div class="task-item ${completedClass}" style="
                background: #f8f9fa; 
                border-radius: 10px; 
                padding: 15px; 
                margin-bottom: 15px;
                border-left: 4px solid ${borderColor};
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.3s;
            ">
                <div class="task-info" style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <input type="checkbox" ${task.completed ? 'checked' : ''} 
                               onchange="toggleTask(${task.id})"
                               style="cursor: pointer;">
                        <h4 style="margin: 0; ${task.completed ? 'text-decoration: line-through; opacity: 0.7;' : ''}">
                            ${task.name}
                        </h4>
                    </div>
                    <div style="display: flex; gap: 15px; color: #666; font-size: 0.9rem;">
                        <span class="task-subject" style="
                            background: ${borderColor}20; 
                            color: ${borderColor}; 
                            padding: 2px 8px; 
                            border-radius: 10px;
                        ">${task.subject}</span>
                        <span class="task-time">${task.startTime || '19:00'} - ${task.endTime || '20:30'}</span>
                        <span class="task-duration">${task.time || 30}分钟</span>
                    </div>
                    ${task.note ? `<p style="margin: 8px 0 0 0; color: #888;">${task.note}</p>` : ''}
                </div>
                <div class="task-actions" style="display: flex; gap: 10px;">
                    <button onclick="deleteTask(${task.id})" style="
                        background: #ff6b6b; 
                        color: white; 
                        border: none; 
                        padding: 8px 12px; 
                        border-radius: 5px; 
                        cursor: pointer;
                    ">
                        <i class="fas fa-trash"></i>
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

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderWeekView(); // 更新周视图的任务计数
        renderTaskList();
        updateStats();
        
        if (task.completed) {
            showNotification(`🎉 任务完成！\n${task.name}`, 'success');
        }
    }
}

function deleteTask(id) {
    if (confirm('确定要删除这个任务吗？')) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderWeekView(); // 更新周视图的任务计数
        renderTaskList();
        updateStats();
    }
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
    // 简化版连续天数计算
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