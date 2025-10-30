// 修复版本 - 主页面
console.log('index.js 已加载');

let tasks = [];
let currentWeekStart = getMonday(new Date());

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    console.log('主页DOM已加载');
    console.log('=== 开始初始化 ===');
    
    // 调试：检查容器是否存在
    const container = document.getElementById('tasks-container');
    console.log('任务容器是否存在:', !!container);
    console.log('任务容器内容:', container ? container.innerHTML : '未找到容器');
    
    loadTasks();
    initializeNavigation();
    renderWeekView();
    renderTaskList();
    updateStats();
    
    console.log('=== 初始化完成 ===');
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
    console.log('初始化导航...');
    
    const prevWeekBtn = document.getElementById('prevWeekBtn');
    const nextWeekBtn = document.getElementById('nextWeekBtn');
    const todayBtn = document.getElementById('todayBtn');
    
    if (prevWeekBtn) prevWeekBtn.addEventListener('click', () => navigateWeek(-1));
    if (nextWeekBtn) nextWeekBtn.addEventListener('click', () => navigateWeek(1));
    if (todayBtn) todayBtn.addEventListener('click', () => {
        currentWeekStart = getMonday(new Date());
        renderWeekView();
        renderTaskList();
        updateStats();
    });
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
    console.log('渲染周视图...');
    
    const weekDaysContainer = document.getElementById('weekDays');
    const weekInfoElement = document.getElementById('weekInfo');
    
    if (!weekDaysContainer) {
        console.error('❌ 找不到周日期容器 #weekDays');
        return;
    }
    
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
        const isActive = i === 0;
        
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
    
    console.log(`📅 日期卡片: ${dateStr}, 任务数: ${dayTasks.length}`);
    
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
    console.log(`🔍 找到 ${dayCards.length} 个日期卡片`);
    
    dayCards.forEach(card => {
        card.addEventListener('click', function() {
            dayCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            const selectedDate = this.getAttribute('data-date');
            console.log(`🔄 切换到日期: ${selectedDate}`);
            
            renderTaskList();
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
    console.log('📂 开始加载任务...');
    
    try {
        const saved = localStorage.getItem('studyTasks');
        console.log('localStorage数据:', saved);
        
        if (saved) {
            tasks = JSON.parse(saved);
            console.log('✅ 成功加载任务:', tasks);
        } else {
            console.log('ℹ️ 没有找到保存的任务，使用空数组');
            tasks = [];
        }
    } catch (e) {
        console.error('❌ 加载任务失败:', e);
        tasks = [];
    }
    
    console.log(`📊 最终任务数组长度: ${tasks.length}`);
}

// 渲染任务列表 - 修复版本
function renderTaskList() {
    console.log('🔄 开始渲染任务列表...');
    
    // 🔥 关键修复：直接使用正确的ID
    const container = document.getElementById('tasks-container');
    
    if (!container) {
        console.error('❌ 找不到任务容器 #tasks-container');
        console.log('尝试查找其他可能的容器...');
        
        // 调试：查看页面上所有的div
        const allDivs = document.querySelectorAll('div');
        console.log('页面上的div数量:', allDivs.length);
        allDivs.forEach(div => {
            if (div.id) {
                console.log('找到有ID的div:', div.id);
            }
        });
        return;
    }
    
    console.log('✅ 找到任务容器:', container);
    console.log('容器当前内容:', container.innerHTML);
    
    // 获取选中日期的任务
    const selectedDate = getSelectedDate();
    console.log(`📅 选中日期: ${selectedDate}`);
    
    const dateTasks = tasks.filter(task => task.date === selectedDate);
    console.log(`📋 找到 ${dateTasks.length} 个匹配的任务`);
    
    // 调试：显示所有任务的详细信息
    console.log('所有任务详情:', tasks.map(t => ({
        id: t.id,
        name: t.name,
        date: t.date,
        subject: t.subject,
        completed: t.completed
    })));
    
    if (dateTasks.length === 0) {
        console.log('ℹ️ 没有任务，显示空状态');
        container.innerHTML = createEmptyState();
        return;
    }
    
    console.log('🎨 开始生成任务HTML');
    const tasksHTML = createTasksHTML(dateTasks);
    console.log('生成的HTML:', tasksHTML);
    
    container.innerHTML = tasksHTML;
    console.log('✅ 任务列表渲染完成');
    console.log('容器新内容:', container.innerHTML);
}

// 获取选中日期
function getSelectedDate() {
    const activeCard = document.querySelector('.day-card.active');
    if (activeCard) {
        const date = activeCard.getAttribute('data-date');
        console.log(`🎯 从激活卡片获取日期: ${date}`);
        return date;
    }
    
    // 如果没有选中卡片，返回周一的日期
    const monday = new Date(currentWeekStart);
    const mondayStr = monday.toISOString().split('T')[0];
    console.log(`📌 使用默认周一日期: ${mondayStr}`);
    return mondayStr;
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
    console.log(`🎨 为 ${dateTasks.length} 个任务生成HTML`);
    
    dateTasks.forEach((task, index) => {
        console.log(`📝 生成任务 ${index + 1}:`, task);
        
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

// 其余函数保持不变...
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
        renderWeekView();
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
        renderWeekView();
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
    const today = new Date().toISOString().split('T')[0];
    const todayCompleted = tasks.filter(t => t.date === today && t.completed).length;
    return todayCompleted > 0 ? 1 : 0;
}

function calculateRewardPoints() {
    return tasks.filter(t => t.completed).length * 10;
}

function saveTasks() {
    localStorage.setItem('studyTasks', JSON.stringify(tasks));
    console.log('💾 保存了', tasks.length, '个任务');
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