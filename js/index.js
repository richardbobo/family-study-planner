// 主页面逻辑 - 完整修复版本
console.log('index.js 已加载');

let tasks = [];
let currentWeekStart = getMonday(new Date()); // 默认从当前周的周一开始
let currentTaskId = null;
let quickCompleteTaskId = null;

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
    
    if (!weekDaysContainer) return;
    
    // 更新日期显示 - 直接在这里调用
    updateDateDisplay();
    
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

// 更新日期显示 - 修改函数签名
function updateDateDisplay() {
    const currentDateElement = document.getElementById('currentDate');
    const weekInfoElement = document.getElementById('weekInfo');
    
    if (currentDateElement && weekInfoElement) {
        const monday = new Date(currentWeekStart);
        
        // 格式化日期显示：显示当前周的年份和月份
        const year = monday.getFullYear();
        const month = monday.getMonth() + 1;
        
        const dateDisplay = `${year}年${month}月`;
        const weekNumber = getWeekNumber(monday);
        
        currentDateElement.textContent = dateDisplay;
        weekInfoElement.textContent = `第${weekNumber}周`;
        
        console.log('更新日期显示:', dateDisplay, '第' + weekNumber + '周');
    } else {
        console.error('找不到日期显示元素');
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
       initializeQuickCompleteModal();
}

// 初始化快速完成模态框
function initializeQuickCompleteModal() {
    const modal = document.getElementById('quickCompleteModal');
    const closeBtn = document.getElementById('closeQuickCompleteModal');
    const cancelBtn = document.getElementById('cancelQuickComplete');
    const confirmBtn = document.getElementById('confirmQuickComplete');
    const timeOptions = document.querySelectorAll('.time-option');
    const hoursInput = document.getElementById('hoursInput');
    const minutesInput = document.getElementById('minutesInput');
    
    // 关闭模态框
    [closeBtn, cancelBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', closeQuickCompleteModal);
        }
    });
    
    // 确认完成
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmQuickComplete);
    }
    
    // 时间输入变化
    if (hoursInput && minutesInput) {
        hoursInput.addEventListener('input', updateTotalMinutes);
        minutesInput.addEventListener('input', updateTotalMinutes);
    }
    
    // 快速时间选项
    timeOptions.forEach(option => {
        option.addEventListener('click', function() {
            // 移除其他选项的active状态
            timeOptions.forEach(opt => opt.classList.remove('active'));
            // 添加当前选项的active状态
            this.classList.add('active');
            
            const minutes = parseInt(this.getAttribute('data-minutes'));
            setTimeFromMinutes(minutes);
        });
    });
    
    // 点击模态框外部关闭
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeQuickCompleteModal();
            }
        });
    }
}


// 打开快速完成模态框
function openQuickCompleteModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    quickCompleteTaskId = taskId;
    
    // 更新模态框内容
    document.getElementById('quickCompleteTaskName').textContent = task.name;
    document.getElementById('completionNote').value = '';
    
    // 重置时间选项
    document.querySelectorAll('.time-option').forEach(opt => opt.classList.remove('active'));
    document.querySelector('.time-option[data-minutes="30"]').classList.add('active');
    
    // 设置默认时间（使用任务原有时间或默认30分钟）
    const defaultMinutes = task.time || 30;
    setTimeFromMinutes(defaultMinutes);
    
    // 显示模态框
    const modal = document.getElementById('quickCompleteModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// 关闭快速完成模态框
function closeQuickCompleteModal() {
    const modal = document.getElementById('quickCompleteModal');
    if (modal) {
        modal.style.display = 'none';
    }
    quickCompleteTaskId = null;
}

// 根据分钟数设置时间输入
function setTimeFromMinutes(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    const hoursInput = document.getElementById('hoursInput');
    const minutesInput = document.getElementById('minutesInput');
    
    if (hoursInput && minutesInput) {
        hoursInput.value = hours;
        minutesInput.value = minutes;
        updateTotalMinutes();
    }
}

// 更新总分钟数显示
function updateTotalMinutes() {
    const hoursInput = document.getElementById('hoursInput');
    const minutesInput = document.getElementById('minutesInput');
    const totalMinutesDisplay = document.getElementById('totalMinutesDisplay');
    
    if (hoursInput && minutesInput && totalMinutesDisplay) {
        const hours = parseInt(hoursInput.value) || 0;
        const minutes = parseInt(minutesInput.value) || 0;
        const totalMinutes = hours * 60 + minutes;
        
        totalMinutesDisplay.textContent = `总计：${totalMinutes}分钟`;
    }
}

// 确认快速完成
// 在 confirmQuickComplete 函数中，修改任务更新部分：
function confirmQuickComplete() {
    if (!currentQuickCompleteTaskId || isSubmittingCompletion) return;
    
    const task = tasks.find(t => t.id === currentQuickCompleteTaskId);
    if (!task) {
        showNotification('任务不存在或已被删除', 'error');
        closeQuickCompleteModal();
        return;
    }
    
    const hours = parseInt(document.getElementById('hoursInput').value) || 0;
    const minutes = parseInt(document.getElementById('minutesInput').value) || 0;
    const totalMinutes = hours * 60 + minutes;
    const completionNote = document.getElementById('completionNote').value.trim();
    
    // 验证时间
    if (totalMinutes <= 0) {
        showNotification('请设置有效的学习时长', 'warning');
        return;
    }
    
    isSubmittingCompletion = true;
    updateConfirmButton(true);
    
    setTimeout(() => {
        try {
            // 更新任务状态
            task.completed = true;
            task.time = totalMinutes;
            task.completionNote = completionNote;
            task.completionTime = new Date().toISOString();
            task.actualCompletionDate = getCurrentDate();
            
            // 更新连续打卡
            updateStreak();
            
            // 记录完成历史
            recordCompletionHistory(task, totalMinutes, completionNote);
            
            saveTasks();
            
            // 更新界面 - 重新渲染整个任务列表
            renderWeekView();
            renderTaskList();
            updateStats();
            
            // 关闭所有打开的模态框
            closeQuickCompleteModal();
            closeModal();
            
            // 显示成功消息
            const successMessage = completionNote 
                ? `🎉 任务完成！学习时长：${totalMinutes}分钟，已记录学习心得`
                : `🎉 任务完成！学习时长：${totalMinutes}分钟`;
            showNotification(successMessage, 'success');
            
        } catch (error) {
            console.error('保存任务完成状态失败:', error);
            showNotification('保存失败，请重试', 'error');
        } finally {
            isSubmittingCompletion = false;
            updateConfirmButton(false);
        }
    }, 1500);
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
// 渲染任务列表
function renderTaskList() {
    const taskListContainer = document.getElementById('taskList');
    if (!taskListContainer) return;

    // 按日期分组任务
    const tasksByDate = groupTasksByDate(tasks);
    
    let html = '';
    
    Object.keys(tasksByDate).sort().forEach(date => {
        const dateTasks = tasksByDate[date];
        const dateObj = new Date(date + 'T00:00:00');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        let dateLabel = '';
        if (date === today.toISOString().split('T')[0]) {
            dateLabel = '今天';
        } else if (date === tomorrow.toISOString().split('T')[0]) {
            dateLabel = '明天';
        } else {
            dateLabel = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
        }
        
        // 星期几
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekday = weekdays[dateObj.getDay()];
        
        html += `
            <div class="date-section">
                <div class="date-header">
                    <span class="date-label">${dateLabel} 周${weekday}</span>
                    <span class="date-full">${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日</span>
                </div>
                <div class="tasks-container">
        `;
        
        dateTasks.forEach(task => {
            const timeDisplay = task.time ? `${Math.floor(task.time / 60)}小时${task.time % 60}分钟` : '未设置';
            const subjectClass = getSubjectClass(task.subject);
            
            if (task.completed) {
                // 已完成的任务
                const completionTime = task.completionTime ? new Date(task.completionTime) : new Date();
                const timeString = completionTime.toTimeString().substring(0, 5);
                const duration = task.time ? `${task.time}分钟` : '15分钟';
                
                html += `
                    <div class="task-item completed" data-task-id="${task.id}" onclick="openModal('${task.id}')">
                        <div class="task-header">
                            <div class="task-title">
                                <span class="task-name">${task.name}</span>
                                <span class="task-subject ${subjectClass}">${task.subject}</span>
                            </div>
                            <div class="task-meta">
                                <span class="task-time">${task.startTime || '19:00'} - ${task.endTime || '20:00'}</span>
                            </div>
                        </div>
                        
                        <div class="task-content">
                            <div class="task-desc">${task.description || '无详细描述'}</div>
                            
                            <div class="completion-info">
                                <div class="task-status">
                                    <span class="status-completed">
                                        <i class="fas fa-check-circle"></i> 已完成
                                    </span>
                                    <span class="completion-time">完成时间: ${timeString}</span>
                                    <span class="study-duration">学习时长: ${duration}</span>
                                </div>
                                ${task.completionNote ? `
                                    <div class="completion-note">
                                        <strong>学习心得:</strong> ${task.completionNote}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // 未完成的任务
                html += `
                    <div class="task-item" data-task-id="${task.id}" onclick="openModal('${task.id}')">
                        <div class="task-header">
                            <div class="task-title">
                                <span class="task-name">${task.name}</span>
                                <span class="task-subject ${subjectClass}">${task.subject}</span>
                            </div>
                            <div class="task-meta">
                                <span class="task-time">${task.startTime || '19:00'} - ${task.endTime || '20:00'}</span>
                            </div>
                        </div>
                        
                        <div class="task-content">
                            <div class="task-desc">${task.description || '无详细描述'}</div>
                            <div class="task-points">
                                <span class="points-badge">积分: ${task.points || 10}</span>
                                <span class="time-estimate">预计: ${timeDisplay}</span>
                            </div>
                        </div>
                        
                        <div class="task-actions">
                            <button class="btn btn-quick-complete" onclick="event.stopPropagation(); quickComplete('${task.id}')">
                                <i class="fas fa-check"></i> 快速完成
                            </button>
                            <button class="btn btn-start-timer" onclick="event.stopPropagation(); startTimer('${task.id}')">
                                <i class="fas fa-play"></i> 开始计时
                            </button>
                        </div>
                    </div>
                `;
            }
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    taskListContainer.innerHTML = html || '<div class="no-tasks">暂无学习计划</div>';
}
function openModal(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const modal = document.getElementById('taskDetailModal');
    const content = document.getElementById('taskDetailContent');
    
    if (task.completed) {
        // 已完成任务的详情
        const completionTime = task.completionTime ? new Date(task.completionTime) : new Date();
        const timeString = completionTime.toLocaleString();
        
        content.innerHTML = `
            <div class="modal-task-header completed">
                <h3>${task.name} <span class="status-badge completed">已完成</span></h3>
                <span class="task-subject large ${getSubjectClass(task.subject)}">${task.subject}</span>
            </div>
            
            <div class="modal-task-body">
                <div class="detail-row">
                    <label>学习内容:</label>
                    <span>${task.description || '无详细描述'}</span>
                </div>
                
                <div class="detail-row">
                    <label>计划时间:</label>
                    <span>${task.startTime || '19:00'} - ${task.endTime || '20:00'}</span>
                </div>
                
                <div class="detail-row highlight">
                    <label>完成时间:</label>
                    <span>${timeString}</span>
                </div>
                
                <div class="detail-row highlight">
                    <label>实际学习时长:</label>
                    <span>${task.time ? `${Math.floor(task.time / 60)}小时${task.time % 60}分钟` : '15分钟'}</span>
                </div>
                
                <div class="detail-row">
                    <label>获得积分:</label>
                    <span>${task.points || 10} 分</span>
                </div>
                
                ${task.completionNote ? `
                <div class="detail-row full-width">
                    <label>学习心得:</label>
                    <div class="completion-notes">${task.completionNote}</div>
                </div>
                ` : ''}
            </div>
        `;
    } else {
        // 未完成任务的详情
        content.innerHTML = `
            <div class="modal-task-header">
                <h3>${task.name}</h3>
                <span class="task-subject large ${getSubjectClass(task.subject)}">${task.subject}</span>
            </div>
            
            <div class="modal-task-body">
                <div class="detail-row">
                    <label>学习内容:</label>
                    <span>${task.description || '无详细描述'}</span>
                </div>
                
                <div class="detail-row">
                    <label>计划时间:</label>
                    <span>${task.startTime || '19:00'} - ${task.endTime || '20:00'}</span>
                </div>
                
                <div class="detail-row">
                    <label>重复类型:</label>
                    <span>${getRepeatTypeText(task.repeatType)}</span>
                </div>
                
                <div class="detail-row">
                    <label>预计时长:</label>
                    <span>${task.time ? `${Math.floor(task.time / 60)}小时${task.time % 60}分钟` : '未设置'}</span>
                </div>
                
                <div class="detail-row">
                    <label>任务积分:</label>
                    <span>${task.points || 10} 分</span>
                </div>
            </div>
            
            <div class="modal-actions">
                <button class="btn btn-success" onclick="quickComplete('${task.id}')">
                    <i class="fas fa-check"></i> 快速完成
                </button>
                <button class="btn btn-primary" onclick="startTimer('${task.id}')">
                    <i class="fas fa-play"></i> 开始计时
                </button>
            </div>
        `;
    }
    
    modal.style.display = 'flex';
}

// 获取重复类型文本
function getRepeatTypeText(repeatType) {
    const repeatTypes = {
        'once': '仅当天',
        'daily': '每天',
        'weekly': '每周',
        'monthly': '每月'
    };
    return repeatTypes[repeatType] || '仅当天';
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
        '地理': 'subject-geography'
    };
    return subjectClasses[subject] || 'subject-other';
}

// 获取当前日期字符串
function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
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
// 快速完成任务
function quickComplete(taskId) {
    event.stopPropagation(); // 阻止事件冒泡
    openQuickCompleteModal(taskId);
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