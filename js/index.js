// 主页面逻辑 - 完整修复版本
console.log('index.js 已加载');

let tasks = [];
let currentWeekStart = getMonday(new Date());
let currentTaskId = null;
let currentQuickCompleteTaskId = null;
let isSubmittingCompletion = false;

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    console.log('主页DOM已加载');
    loadTasks();
    initializeNavigation();
    initializeModal();
    initializeQuickCompleteModal();
    initializeFilterAndSort(); // 这个现在会动态更新科目选项
    renderWeekView();
    renderTaskList();
    updateStats();
    console.log('页面初始化完成');
    console.log('任务数量:', tasks.length);

    // 监听存储变化（用于跨页面同步）
    window.addEventListener('storage', function(e) {
        if (e.key === 'studyCategories') {
            updateSubjectFilterOptions();
            renderTaskList();
        }
    });
});

// 初始化筛选和排序功能
function initializeFilterAndSort() {
    const subjectFilter = document.getElementById('subjectFilter');
    const sortSelect = document.getElementById('sortSelect');
    
    if (subjectFilter) {
        subjectFilter.addEventListener('change', function() {
            console.log('科目筛选:', this.value);
            renderTaskList();
        });
    }
    
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            console.log('排序方式:', this.value);
            renderTaskList();
        });
    }
}

// 获取周一的日期
function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// 获取今天的日期
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// 按日期分组任务
function groupTasksByDate(tasks) {
    const grouped = {};
    tasks.forEach(task => {
        if (!grouped[task.date]) {
            grouped[task.date] = [];
        }
        grouped[task.date].push(task);
    });
    return grouped;
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
    
    if (!weekDaysContainer) {
        console.error('找不到周视图容器');
        return;
    }
    
    updateDateDisplay();
    
    let weekDaysHTML = '';
    const today = getTodayDate();
    
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(currentWeekStart);
        currentDate.setDate(currentWeekStart.getDate() + i);
        
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayTasks = tasks.filter(task => task.date === dateStr);
        const completedTasks = dayTasks.filter(task => task.completed);
        
        const isToday = dateStr === today;
        const isActive = isToday;
        
        weekDaysHTML += createDayCardHTML(currentDate, dayTasks, completedTasks, isToday, isActive);
    }
    
    weekDaysContainer.innerHTML = weekDaysHTML;
    bindDayCardEvents();
}

// 更新日期显示
function updateDateDisplay() {
    const currentDateElement = document.getElementById('currentDate');
    const weekInfoElement = document.getElementById('weekInfo');
    
    if (currentDateElement && weekInfoElement) {
        const monday = new Date(currentWeekStart);
        const year = monday.getFullYear();
        const month = monday.getMonth() + 1;
        const weekNumber = getWeekNumber(monday);
        
        currentDateElement.textContent = `${year}年${month}月`;
        weekInfoElement.textContent = `第${weekNumber}周`;
    }
}

// 计算周数
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
            renderTaskList();
        });
    });
}

// 初始化模态框
function initializeModal() {
    const modal = document.getElementById('taskModal');
    const closeBtn = document.getElementById('closeModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeModal();
            }
        });
    }
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
    
    [closeBtn, cancelBtn].forEach(btn => {
        if (btn) {
            btn.addEventListener('click', closeQuickCompleteModal);
        }
    });
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmQuickComplete);
    }
    
    if (hoursInput && minutesInput) {
        hoursInput.addEventListener('input', updateTotalMinutes);
        minutesInput.addEventListener('input', updateTotalMinutes);
    }
    
    timeOptions.forEach(option => {
        option.addEventListener('click', function() {
            timeOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            const minutes = parseInt(this.getAttribute('data-minutes'));
            setTimeFromMinutes(minutes);
        });
    });
    
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
    const task = tasks.find(t => t.id == taskId);
    if (!task) return;
    
    currentQuickCompleteTaskId = taskId;
    
    document.getElementById('quickCompleteTaskName').textContent = task.name;
    document.getElementById('completionNote').value = '';
    
    document.querySelectorAll('.time-option').forEach(opt => opt.classList.remove('active'));
    const defaultOption = document.querySelector('.time-option[data-minutes="30"]');
    if (defaultOption) {
        defaultOption.classList.add('active');
    }
    
    const defaultMinutes = task.time || 30;
    setTimeFromMinutes(defaultMinutes);
    
    isSubmittingCompletion = false;
    updateConfirmButton(false);
    
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
    currentQuickCompleteTaskId = null;
    isSubmittingCompletion = false;
}

// 设置时间从分钟数
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

// 更新确认按钮状态
function updateConfirmButton(isLoading) {
    const confirmBtn = document.getElementById('confirmQuickComplete');
    if (confirmBtn) {
        if (isLoading) {
            confirmBtn.innerHTML = '<div class="loading-spinner"></div> 保存中...';
            confirmBtn.disabled = true;
        } else {
            confirmBtn.innerHTML = '<i class="fas fa-check"></i> 确认完成';
            confirmBtn.disabled = false;
        }
    }
}

// 确认快速完成
function confirmQuickComplete() {
    if (!currentQuickCompleteTaskId || isSubmittingCompletion) return;
    
    const task = tasks.find(t => t.id == currentQuickCompleteTaskId);
    if (!task) {
        showNotification('任务不存在或已被删除', 'error');
        closeQuickCompleteModal();
        return;
    }
    
    const hours = parseInt(document.getElementById('hoursInput').value) || 0;
    const minutes = parseInt(document.getElementById('minutesInput').value) || 0;
    const totalMinutes = hours * 60 + minutes;
    const completionNote = document.getElementById('completionNote').value.trim();
    
    if (totalMinutes <= 0) {
        showNotification('请设置有效的学习时长', 'warning');
        return;
    }
    
    isSubmittingCompletion = true;
    updateConfirmButton(true);
    
    setTimeout(() => {
        try {
            task.completed = true;
            task.time = totalMinutes;
            task.completionNote = completionNote;
            task.completionTime = new Date().toISOString();
            task.actualCompletionDate = getCurrentDate();
            
            updateStreak();
            recordCompletionHistory(task, totalMinutes, completionNote);
            saveTasks();
            
            renderWeekView();
            renderTaskList();
            updateStats();
            
            closeQuickCompleteModal();
            closeModal();
            
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
    }, 1000);
}

// 加载任务
function loadTasks() {
    try {
        const saved = localStorage.getItem('studyTasks');
        if (saved) {
            tasks = JSON.parse(saved);
            console.log('加载了', tasks.length, '个任务');
        } else {
            tasks = [];
        }
    } catch (e) {
        console.error('加载任务失败:', e);
        tasks = [];
    }
}

// 渲染任务列表 - 美化版本
// 修改渲染任务列表函数，添加筛选和排序逻辑
function renderTaskList() {
    const taskListContainer = document.getElementById('tasks-container');
    if (!taskListContainer) {
        console.error('找不到任务列表容器');
        return;
    }

    // 获取当前选中的日期
    const selectedDate = getSelectedDate();
    
    // 获取筛选和排序选项
    const subjectFilter = document.getElementById('subjectFilter');
    const sortSelect = document.getElementById('sortSelect');
    
    const selectedSubject = subjectFilter ? subjectFilter.value : 'all';
    const selectedSort = sortSelect ? sortSelect.value : 'default';
    
    console.log('筛选条件 - 日期:', selectedDate, '科目:', selectedSubject, '排序:', selectedSort);
    
    // 筛选任务
    let filteredTasks = tasks.filter(task => task.date === selectedDate);
    
    // 科目筛选
    if (selectedSubject !== 'all') {
        filteredTasks = filteredTasks.filter(task => task.subject === selectedSubject);
    }
    
    // 排序任务
    const sortedTasks = sortTasks(filteredTasks, selectedSort);
    
    let html = '';
    
    if (sortedTasks.length > 0) {
        const dateObj = new Date(selectedDate + 'T00:00:00');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        let dateLabel = '';
        if (selectedDate === today.toISOString().split('T')[0]) {
            dateLabel = '今天';
        } else if (selectedDate === tomorrow.toISOString().split('T')[0]) {
            dateLabel = '明天';
        } else {
            dateLabel = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
        }
        
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekday = weekdays[dateObj.getDay()];
        
        // 显示筛选和排序信息
        html += `
            <div class="filter-info">
                <span class="task-count-badge">${sortedTasks.length} 个任务</span>
                ${selectedSubject !== 'all' ? `<span class="filter-badge">科目: ${selectedSubject}</span>` : ''}
                ${selectedSort !== 'default' ? `<span class="sort-badge">排序: ${getSortText(selectedSort)}</span>` : ''}
            </div>
        `;
        
        html += `
            <div class="date-section">
                <div class="date-header">
                    <span class="date-label">${dateLabel} 周${weekday}</span>
                    <span class="date-full">${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日</span>
                </div>
                <div class="tasks-container">
        `;
        
        sortedTasks.forEach(task => {
            // 原有的任务渲染代码保持不变
            const subjectClass = getSubjectClass(task.subject);
            const subjectIcon = getSubjectIcon(task.subject);
            
            if (task.completed) {
                // 已完成的任务
                const completionTime = task.completionTime ? new Date(task.completionTime) : new Date();
                const timeString = completionTime.toTimeString().substring(0, 5);
                const duration = task.time ? `${task.time}分钟` : '15分钟';
                
                html += `
                    <div class="task-item completed" data-task-id="${task.id}" onclick="openModal('${task.id}')">
                        <div class="task-left">
                            <div class="subject-tab ${subjectClass}">
                                <i class="fas ${subjectIcon}"></i>
                                <span>${task.subject}</span>
                            </div>
                        </div>
                        
                        <div class="task-main">
                            <div class="task-header">
                                <h3 class="task-name">${task.name}</h3>
                                <div class="task-meta-info">
                                    <span class="repeat-type">${getRepeatTypeText(task.repeatType)}</span>
                                    <span class="plan-time">${task.startTime || '19:00'} - ${task.endTime || '20:00'}</span>
                                </div>
                            </div>
                            
                            <div class="completion-details">
                                <div class="completion-time">
                                    <i class="fas fa-check-circle"></i>
                                    完成于 ${timeString}
                                </div>
                                <div class="study-duration">
                                    <i class="fas fa-clock"></i>
                                    学习时长: ${duration}
                                </div>
                            </div>
                            
                            ${task.completionNote ? `
                                <div class="completion-note">
                                    <i class="fas fa-sticky-note"></i>
                                    ${task.completionNote}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            } else {
                // 未完成的任务
                const timeDisplay = task.time ? `${Math.floor(task.time / 60)}小时${task.time % 60}分钟` : '未设置';
                
                html += `
                    <div class="task-item" data-task-id="${task.id}" onclick="openModal('${task.id}')">
                        <div class="task-left">
                            <div class="subject-tab ${subjectClass}">
                                <i class="fas ${subjectIcon}"></i>
                                <span>${task.subject}</span>
                            </div>
                        </div>
                        
                        <div class="task-main">
                            <div class="task-header">
                                <h3 class="task-name">${task.name}</h3>
                                <div class="task-meta-info">
                                    <span class="repeat-type">${getRepeatTypeText(task.repeatType)}</span>
                                    <span class="plan-time">${task.startTime || '19:00'} - ${task.endTime || '20:00'}</span>
                                </div>
                            </div>
                            
                            <div class="task-details">
                                <div class="task-desc">${task.description || ''}</div>
                                <div class="task-estimate">
                                    <span class="time-estimate">预计: ${timeDisplay}</span>
                                    <span class="points-badge">积分: ${task.points || 10}</span>
                                </div>
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
    } else {
        // 无任务时的显示
        const subjectInfo = selectedSubject !== 'all' ? `科目"${selectedSubject}"` : '该日期';
        html = `
            <div class="no-tasks">
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 15px; color: #ddd;"></i>
                    <p style="margin-bottom: 20px; font-size: 1.1rem;">${subjectInfo} 没有找到学习计划</p>
                    <a href="add-plan.html" class="btn btn-primary">
                        <i class="fas fa-plus"></i> 添加学习计划
                    </a>
                    <button class="btn btn-secondary" onclick="resetFilters()" style="margin-left: 10px;">
                        <i class="fas fa-refresh"></i> 重置筛选
                    </button>
                </div>
            </div>
        `;
    }
    
    taskListContainer.innerHTML = html;
}

// 排序任务函数
function sortTasks(tasks, sortType) {
    const sortedTasks = [...tasks]; // 创建副本避免修改原数组
    
    switch (sortType) {
        case 'time':
            // 按开始时间排序
            return sortedTasks.sort((a, b) => {
                const timeA = a.startTime || '00:00';
                const timeB = b.startTime || '00:00';
                return timeA.localeCompare(timeB);
            });
            
        case 'subject':
            // 按科目排序
            return sortedTasks.sort((a, b) => a.subject.localeCompare(b.subject));
            
        case 'status':
            // 按状态排序：未完成在前，已完成在后
            return sortedTasks.sort((a, b) => {
                if (a.completed && !b.completed) return 1;
                if (!a.completed && b.completed) return -1;
                return 0;
            });
            
        case 'default':
        default:
            // 默认排序：按创建时间或ID
            return sortedTasks.sort((a, b) => b.id - a.id);
    }
}

// 获取排序方式文本
function getSortText(sortType) {
    const sortTexts = {
        'default': '默认排序',
        'time': '按时间',
        'subject': '按科目',
        'status': '按状态'
    };
    return sortTexts[sortType] || '默认排序';
}

// 重置筛选和排序
function resetFilters() {
    const subjectFilter = document.getElementById('subjectFilter');
    const sortSelect = document.getElementById('sortSelect');
    
    if (subjectFilter) subjectFilter.value = 'all';
    if (sortSelect) sortSelect.value = 'default';
    
    renderTaskList();
    showNotification('筛选条件已重置', 'info');
}
// 获取选中日期
function getSelectedDate() {
    const activeCard = document.querySelector('.day-card.active');
    if (activeCard) {
        return activeCard.getAttribute('data-date');
    }
    return getTodayDate();
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

// 打开模态框
function openModal(taskId) {
    const task = tasks.find(t => t.id == taskId);
    if (!task) return;
    
    const modal = document.getElementById('taskModal');
    const content = document.getElementById('taskDetailContent');
    
    if (!modal || !content) return;
    
    if (task.completed) {
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
                    <span>${task.description || ''}</span>
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
        content.innerHTML = `
            <div class="modal-task-header">
                <h3>${task.name}</h3>
                <span class="task-subject large ${getSubjectClass(task.subject)}">${task.subject}</span>
            </div>
            
            <div class="modal-task-body">
                <div class="detail-row">
                    <label>学习内容:</label>
                    <span>${task.description || ''}</span>
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

// 关闭模态框
function closeModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 快速完成任务
function quickComplete(taskId) {
    event.stopPropagation();
    openQuickCompleteModal(taskId);
}

// 开始计时
function startTimer(taskId) {
    event.stopPropagation();
    const task = tasks.find(t => t.id == taskId);
    if (task) {
        showNotification(`⏰ 开始计时: ${task.name}`, 'info');
    }
}

// 获取重复类型文本
function getRepeatTypeText(repeatType) {
    const repeatTypes = {
        'once': '仅当天',
        'daily': '每天',
        'weekly': '每周',
        'biweekly': '每两周',
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
        '地理': 'subject-geography',
        '美术': 'subject-art',
        '音乐': 'subject-music',
        '体育': 'subject-sports'
    };
    return subjectClasses[subject] || 'subject-other';
}

// 获取当前日期字符串
function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

// 更新连续打卡
function updateStreak() {
    const today = getCurrentDate();
    const todayCompleted = tasks.filter(task => 
        task.actualCompletionDate === today && task.completed
    ).length;
    
    if (todayCompleted > 0) {
        let streak = parseInt(localStorage.getItem('studyStreak') || '0');
        streak++;
        localStorage.setItem('studyStreak', streak.toString());
    }
}

// 记录完成历史
function recordCompletionHistory(task, totalMinutes, completionNote) {
    console.log('记录完成历史:', task.name, totalMinutes, completionNote);
}

// 更新统计信息
function updateStats() {
    const completedTasks = tasks.filter(task => task.completed).length;
    const totalTasks = tasks.length;
    const totalStudyTime = tasks.reduce((total, task) => {
        return total + (task.completed ? (task.time || 0) : 0);
    }, 0);
    
    const streak = localStorage.getItem('studyStreak') || '0';
    const totalPoints = Math.floor(totalStudyTime / 10);
    
    updateStatElement('completedTasks', completedTasks);
    updateStatElement('totalTasks', totalTasks);
    updateStatElement('studyTime', `${Math.floor(totalStudyTime / 60)}小时${totalStudyTime % 60}分钟`);
    updateStatElement('streakDays', `${streak}天`);
    updateStatElement('totalPoints', totalPoints);
}

function updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

// 保存任务（修改版）
function saveTasks() {
    localStorage.setItem('studyTasks', JSON.stringify(tasks));
    // 保存后更新科目选项
    updateSubjectFilterOptions();
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
// 获取所有科目类别（包括自定义类别）
function getAllSubjects() {
    const subjects = new Set();
    
    // 从任务中提取所有科目
    tasks.forEach(task => {
        if (task.subject) {
            subjects.add(task.subject);
        }
    });
    
    // 从localStorage中获取已保存的自定义类别
    try {
        const savedCategories = localStorage.getItem('studyCategories');
        if (savedCategories) {
            const categories = JSON.parse(savedCategories);
            categories.forEach(category => {
                subjects.add(category);
            });
        }
    } catch (e) {
        console.error('加载自定义类别失败:', e);
    }
    
    // 添加默认科目（确保基础科目存在）
    const defaultSubjects = ['语文', '数学', '英语', '科学', '美术', '体育'];
    defaultSubjects.forEach(subject => {
        subjects.add(subject);
    });
    
    return Array.from(subjects).sort();
}

// 更新科目筛选选项
function updateSubjectFilterOptions() {
    const subjectFilter = document.getElementById('subjectFilter');
    if (!subjectFilter) return;
    
    // 保存当前选中的值
    const currentValue = subjectFilter.value;
    
    // 清空现有选项（保留"全部科目"）
    subjectFilter.innerHTML = '<option value="all">全部科目</option>';
    
    // 获取所有科目
    const allSubjects = getAllSubjects();
    
    // 添加科目选项
    allSubjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        subjectFilter.appendChild(option);
    });
    
    // 恢复之前选中的值（如果还存在）
    if (currentValue && allSubjects.includes(currentValue)) {
        subjectFilter.value = currentValue;
    }
}

// 在任务数据变化时更新科目选项
function onTasksUpdated() {
    updateSubjectFilterOptions();
    renderTaskList();
    updateStats();
}

// 初始化筛选和排序功能（修改版）
function initializeFilterAndSort() {
    const subjectFilter = document.getElementById('subjectFilter');
    const sortSelect = document.getElementById('sortSelect');
    
    // 初始化科目选项
    updateSubjectFilterOptions();
    
    if (subjectFilter) {
        subjectFilter.addEventListener('change', function() {
            console.log('科目筛选:', this.value);
            renderTaskList();
        });
    }
    
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            console.log('排序方式:', this.value);
            renderTaskList();
        });
    }
}
// 科目管理相关函数
function manageSubjects() {
    const allSubjects = getAllSubjects();
    console.log('当前所有科目:', allSubjects);
    
    // 可以在这里添加科目管理功能
    // 比如删除未使用的自定义科目等
}

// 清理未使用的自定义科目
function cleanupUnusedSubjects() {
    const allSubjects = getAllSubjects();
    const usedSubjects = new Set(tasks.map(task => task.subject));
    
    const unusedSubjects = allSubjects.filter(subject => 
        !usedSubjects.has(subject) && 
        !['语文', '数学', '英语', '科学', '美术', '体育'].includes(subject)
    );
    
    if (unusedSubjects.length > 0) {
        console.log('未使用的科目:', unusedSubjects);
        // 可以选择性地清理这些科目
    }
    
    return unusedSubjects;
}