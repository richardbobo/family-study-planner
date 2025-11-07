// 主页面逻辑 - 完整修复版本
console.log('index.js 已加载');

let tasks = [];
let currentWeekStart = getMonday(new Date());
let currentTaskId = null;
let currentQuickCompleteTaskId = null;
let isSubmittingCompletion = false;
let currentDeleteTask = null;

// 初始化页面
document.addEventListener('DOMContentLoaded', function () {
    console.log('主页DOM已加载');
    loadTasks();
    initializeNavigation();
    initializeModal();
    initializeQuickCompleteModal();
    initializeFilterAndSort(); // 这个现在会动态更新科目选项
    initializeConfirmDeleteModal(); // 新增：初始化确认删除模态框
    renderWeekView();
    renderTaskList();
    updateStats();
    initializeFamilyFeatures();
    setupFamilyEventListeners();
    console.log('页面初始化完成');
    console.log('任务数量:', tasks.length);

    // 监听存储变化（用于跨页面同步）
    window.addEventListener('storage', function (e) {
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
        subjectFilter.addEventListener('change', function () {
            console.log('科目筛选:', this.value);
            renderTaskList();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', function () {
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
    // 导航时更新筛选选项
    updateSubjectFilterOptions();
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
        card.addEventListener('click', function () {
            dayCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            // 切换日期时更新筛选选项
            updateSubjectFilterOptions();
            renderTaskList();
        });
    });
}

// 初始化模态框 - 简化版本
function initializeModal() {
    const modal = document.getElementById('taskModal');

    if (modal) {
        modal.addEventListener('click', function (event) {
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    // 不需要再绑定关闭按钮，因为关闭按钮是动态生成的
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
        option.addEventListener('click', function () {
            timeOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            const minutes = parseInt(this.getAttribute('data-minutes'));
            setTimeFromMinutes(minutes);
        });
    });

    if (modal) {
        modal.addEventListener('click', function (event) {
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

    const defaultMinutes = task.duration || 30;
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
            task.duration = totalMinutes;
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
    setTimeout(updateFamilyStatusDisplay, 100);
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

    // 先更新筛选选项（基于当天任务）
    updateSubjectFilterOptions();

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
                const duration = task.duration ? `${task.duration}分钟` : '15分钟';

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
                                    <span class="repeat-type">${getRepeatTypeText(task.repeat_type)}</span>
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
                const timeDisplay = task.duration ? `${Math.floor(task.duration / 60)}小时${task.duration % 60}分钟` : '未设置';

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
                                    <span class="repeat-type">${getRepeatTypeText(task.repeat_type)}</span>
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
        const subjectInfo = selectedSubject !== 'all' ? `科目"${selectedSubject}"` : '该日期';
        const hasSubjects = getAllSubjects().length > 0;

        if (hasSubjects && selectedSubject !== 'all') {
            // 情况1：有科目但当前筛选条件下无任务（显示重置按钮）
            html = `
            <div class="no-tasks">
                <i class="fas fa-search no-tasks-icon"></i>
                <p class="no-tasks-message">${subjectInfo} 没有找到学习任务</p>
                <div class="no-tasks-actions">
                    <button class="no-tasks-btn no-tasks-btn-secondary" onclick="resetFilters()">
                        <i class="fas fa-refresh"></i> 重置筛选
                    </button>
                    <a href="add-plan.html" class="no-tasks-btn no-tasks-btn-primary">
                        <i class="fas fa-plus"></i> 添加学习计划
                    </a>
                </div>
            </div>
        `;
        } else if (hasSubjects && selectedSubject === 'all') {
            // 情况2：有科目但该日期没有任务（不显示重置按钮）
            html = `
            <div class="no-tasks">
                <i class="fas fa-calendar-plus no-tasks-icon"></i>
                <p class="no-tasks-message">${selectedDate} 还没有学习计划</p>
                <div class="no-tasks-actions">
                    <a href="add-plan.html" class="no-tasks-btn no-tasks-btn-primary">
                        <i class="fas fa-plus"></i> 添加学习计划
                    </a>
                </div>
            </div>
        `;
        } else {
            // 情况3：完全没有科目（全新用户）
            html = `
            <div class="no-tasks">
                <i class="fas fa-calendar-plus no-tasks-icon"></i>
                <p class="no-tasks-message">开始规划您的学习计划吧！</p>
                <div class="no-tasks-actions">
                    <a href="add-plan.html" class="no-tasks-btn no-tasks-btn-primary">
                        <i class="fas fa-plus"></i> 添加第一个学习计划
                    </a>
                </div>
            </div>
        `;
        }
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


// 打开模态框 - 修正版本
function openModal(taskId) {
    const task = tasks.find(t => t.id == taskId);
    if (!task) return;

    const modal = document.getElementById('taskModal');
    const content = document.getElementById('taskDetailContent');

    if (!modal || !content) return;

    const subjectClass = getSubjectClass(task.subject);
    const subjectIcon = getSubjectIcon(task.subject);
    const iconClass = `icon-${task.subject.toLowerCase()}`;

    let modalHTML = `
        <div class="modal-header">
            <div class="modal-header-content">
                <div class="modal-task-icon ${iconClass}">
                    <i class="fas ${subjectIcon}"></i>
                </div>
                <div class="modal-task-info">
                    <h3 class="modal-task-title">${task.name}</h3>
                    <div class="modal-task-meta">
                        <span class="modal-task-subject ${subjectClass}">
                            <i class="fas ${subjectIcon}"></i>
                            ${task.subject}
                        </span>
                        ${task.completed ? `
                        <span class="modal-task-status">
                            <i class="fas fa-check-circle" style="color: #2ed573;"></i>
                            已完成
                        </span>
                        ` : `
                        <span class="modal-task-status">
                            <i class="fas fa-clock" style="color: #ff9f43;"></i>
                            未完成
                        </span>
                        `}
                    </div>
                </div>
            </div>
            <div class="modal-header-actions">
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
        </div>
    `;

    // Body内容
    modalHTML += `
        <div class="modal-body-content">
    `;

    // 显示具体内容（如果有的话）
    if (task.detailedContent) {
        modalHTML += `
            <div class="detail-item full-width">
                <div class="detail-label">学习内容：</div>
                <div class="detail-value">
                    <div class="task-content-box">
                        <pre class="content-text">${escapeHtml(task.detailedContent)}</pre>
                    </div>
                </div>
            </div>
        `;
    }

    // 原有的任务信息
    modalHTML += `
            <div class="detail-item">
                <div class="detail-label">重复类型:</div>
                <div class="detail-value">${getRepeatTypeText(task.repeat_type)}</div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">计划时间:</div>
                <div class="detail-value">${task.startTime || '19:00'} - ${task.endTime || '20:00'}</div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">任务积分:</div>
                <div class="detail-value">${task.points || 10} 分</div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">预计时长:</div>
                <div class="detail-value">${task.duration ? `${Math.floor(task.duration / 60)}小时${task.duration % 60}分钟` : '未设置'}</div>
            </div>
    `;

    if (task.description && !task.detailedContent) {
        modalHTML += `
            <div class="detail-item">
                <div class="detail-label">任务描述:</div>
                <div class="detail-value">${task.description}</div>
            </div>
        `;
    }

    modalHTML += `</div>`;

    content.innerHTML = modalHTML;

    // 更新删除按钮文本
    updateDeleteButtonText(task);

    // 设置按钮事件
    const deleteBtn = document.getElementById('deleteTaskBtn');
    if (deleteBtn) {
        deleteBtn.onclick = function () {
            openConfirmDeleteModal(taskId);
        };
    }

    const editBtn = document.getElementById('editTaskBtn');
    if (editBtn) {
        editBtn.onclick = function () {
            editTask(taskId);
        };
    }

    modal.style.display = 'flex';
}

// HTML转义函数
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\n/g, '<br>')
        .replace(/ /g, '&nbsp;');
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
        return total + (task.completed ? (task.duration || 0) : 0);
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
// 获取当天任务中的所有科目类别 v1.1
function getAllSubjects() {
    const subjects = new Set();

    // 获取当前选中的日期
    const selectedDate = getSelectedDate();

    // 只从当天任务中提取科目
    const todayTasks = tasks.filter(task => task.date === selectedDate);
    todayTasks.forEach(task => {
        if (task.subject) {
            subjects.add(task.subject);
        }
    });

    // 如果没有任务，返回空数组而不是提示文字
    // 这样筛选器会显示"全部科目"选项，但没有任何具体科目
    // if (subjects.size === 0) {
    //     return ['暂无任务'];
    // }

    return Array.from(subjects).sort();
}

// 更新科目筛选选项
// 更新科目筛选选项（基于当天任务）
function updateSubjectFilterOptions() {
    const subjectFilter = document.getElementById('subjectFilter');
    if (!subjectFilter) return;

    // 保存当前选中的值
    const currentValue = subjectFilter.value;

    // 清空现有选项
    subjectFilter.innerHTML = '<option value="all">全部科目</option>';

    // 获取当天任务的所有科目
    const todaySubjects = getAllSubjects();

    // 添加科目选项
    todaySubjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        subjectFilter.appendChild(option);
    });

    // 恢复之前选中的值（如果还存在）
    if (currentValue && todaySubjects.includes(currentValue)) {
        subjectFilter.value = currentValue;
    } else {
        subjectFilter.value = 'all'; // 重置为全部
    }

    // 更新筛选器状态显示
    updateFilterBadge();
}

// 更新筛选器状态徽章
function updateFilterBadge() {
    const subjectFilter = document.getElementById('subjectFilter');
    const filterInfo = document.querySelector('.filter-info');

    if (!subjectFilter || !filterInfo) return;

    const todaySubjects = getAllSubjects();
    const subjectCount = todaySubjects.includes('暂无任务') ? 0 : todaySubjects.length;

    // 更新任务数量徽章
    const countBadge = filterInfo.querySelector('.task-count-badge');
    if (countBadge) {
        countBadge.textContent = `${subjectCount} 个科目`;
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
        subjectFilter.addEventListener('change', function () {
            console.log('科目筛选:', this.value);
            renderTaskList();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', function () {
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
// 删除任务
function deleteTask(taskId) {
    if (!confirm('确定要删除这个学习计划吗？此操作不可恢复。')) {
        return;
    }

    try {
        // 找到任务索引
        const taskIndex = tasks.findIndex(t => t.id == taskId);
        if (taskIndex === -1) {
            showNotification('任务不存在或已被删除', 'error');
            return;
        }

        const taskName = tasks[taskIndex].name;

        // 从数组中删除任务
        tasks.splice(taskIndex, 1);

        // 保存到localStorage
        saveTasks();

        // 关闭模态框
        closeModal();

        // 更新界面
        renderWeekView();
        renderTaskList();
        updateStats();

        showNotification(`已删除学习计划: ${taskName}`, 'success');

    } catch (error) {
        console.error('删除任务失败:', error);
        showNotification('删除失败，请重试', 'error');
    }
}

// 编辑任务（暂时跳转到添加计划页面）
function editTask(taskId) {
    // 这里可以跳转到编辑页面，或者在当前页面打开编辑表单
    // 暂时先关闭模态框
    closeModal();
    showNotification('编辑功能开发中...', 'info');
}
let currentDeleteTaskId = null;

// 初始化确认删除模态框
function initializeConfirmDeleteModal() {
    const modal = document.getElementById('confirmDeleteModal');
    const cancelBtn = document.getElementById('cancelDeleteBtn');
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeConfirmDeleteModal);
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', confirmDeleteTask);
    }

    if (modal) {
        modal.addEventListener('click', function (event) {
            if (event.target === modal) {
                closeConfirmDeleteModal();
            }
        });
    }
}

// 打开确认删除模态框 - 支持批量删除
function openConfirmDeleteModal(taskId) {
    const task = tasks.find(t => t.id == taskId);
    if (!task) {
        console.error('任务不存在:', taskId);
        return;
    }

    currentDeleteTaskId = taskId;
    currentDeleteTask = task;

    // 更新模态框内容
    document.getElementById('deleteTaskName').textContent = task.name;
    document.getElementById('deleteTaskSubject').textContent = task.subject;
    document.getElementById('deleteTaskRepeatType').textContent = getRepeatTypeText(task.repeat_type);

    // 设置模态框标题和模式
    const isBatchDelete = task.repeat_type !== 'once';
    const modalTitle = document.getElementById('deleteModalTitle');
    const modalSubtitle = document.getElementById('deleteModalSubtitle');
    const batchOptions = document.getElementById('batchDeleteOptions');
    const warningText = document.getElementById('deleteWarningText');
    const confirmBtn = document.getElementById('confirmDeleteBtn');

    if (isBatchDelete) {
        // 批量删除模式
        modalTitle.innerHTML = '确认批量删除计划 <span class="delete-mode-indicator"><i class="fas fa-layer-group"></i> 批量删除</span>';
        modalSubtitle.textContent = '此操作将删除多个重复任务';
        batchOptions.style.display = 'block';
        warningText.textContent = '删除后，从选定日期开始的所有重复任务都将被移除。';
        confirmBtn.textContent = '确认批量删除';

        // 初始化日期选择器
        initializeBatchDeleteOptions(task);
    } else {
        // 单次删除模式
        modalTitle.textContent = '确认删除计划';
        modalSubtitle.textContent = '此操作无法撤销';
        batchOptions.style.display = 'none';
        warningText.textContent = '删除后，此任务记录将被移除。';
        confirmBtn.textContent = '确认删除';
    }

    // 显示模态框
    const modal = document.getElementById('confirmDeleteModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// 初始化批量删除选项
function initializeBatchDeleteOptions(task) {
    const dateInput = document.getElementById('deleteStartDate');
    const deleteSummary = document.getElementById('deleteSummary');

    if (!dateInput || !deleteSummary) return;

    // 设置默认日期为任务开始日期
    const taskDate = new Date(task.date + 'T00:00:00');
    dateInput.value = task.date;

    // 计算删除统计
    updateDeleteSummary(task, task.date);

    // 监听日期变化
    dateInput.addEventListener('change', function () {
        updateDeleteSummary(task, this.value);
    });
}

// 更新删除统计信息
function updateDeleteSummary(task, startDate) {
    const deleteSummary = document.getElementById('deleteSummary');
    if (!deleteSummary) return;

    // 计算受影响的重复任务
    const affectedTasks = getAffectedRepeatTasks(task, startDate);
    const completedCount = affectedTasks.filter(t => t.completed).length;
    const pendingCount = affectedTasks.length - completedCount;

    deleteSummary.innerHTML = `
        <div class="delete-summary-item">
            <span>受影响任务总数：</span>
            <span>${affectedTasks.length} 个</span>
        </div>
        <div class="delete-summary-item">
            <span>已完成任务：</span>
            <span style="color: #2ed573;">${completedCount} 个</span>
        </div>
        <div class="delete-summary-item">
            <span>未完成任务：</span>
            <span style="color: #ff9f43;">${pendingCount} 个</span>
        </div>
        <div class="delete-summary-total">
            <span>总计删除：</span>
            <span>${affectedTasks.length} 个任务</span>
        </div>
    `;
}

// 获取受影响的重复任务
function getAffectedRepeatTasks(originalTask, startDate) {
    if (originalTask.repeat_type === 'once') {
        return [originalTask];
    }

    // 找到所有相关的重复任务
    const affectedTasks = tasks.filter(task =>
        task.name === originalTask.name &&
        task.subject === originalTask.subject &&
        task.repeat_type === originalTask.repeat_type &&
        task.date >= startDate
    );

    return affectedTasks;
}

// 确认删除任务 - 支持批量删除
// function confirmDeleteTask() {
//     if (!currentDeleteTaskId || !currentDeleteTask) return;

//     const taskId = currentDeleteTaskId;
//     const task = currentDeleteTask;
//     const isBatchDelete = task.repeatType !== 'once';

//     try {
//         let deletedTasks = [];

//         if (isBatchDelete) {
//             // 批量删除模式
//             const startDate = document.getElementById('deleteStartDate').value;
//             const affectedTasks = getAffectedRepeatTasks(task, startDate);

//             // 从tasks数组中删除所有受影响的任务
//             affectedTasks.forEach(affectedTask => {
//                 const taskIndex = tasks.findIndex(t => t.id === affectedTask.id);
//                 if (taskIndex !== -1) {
//                     deletedTasks.push(tasks[taskIndex]);
//                     tasks.splice(taskIndex, 1);
//                 }
//             });
//         } else {
//             // 单次删除模式
//             const taskIndex = tasks.findIndex(t => t.id == taskId);
//             if (taskIndex !== -1) {
//                 deletedTasks.push(tasks[taskIndex]);
//                 tasks.splice(taskIndex, 1);
//             }
//         }

//         if (deletedTasks.length === 0) {
//             showNotification('没有找到要删除的任务', 'warning');
//             return;
//         }

//         // 保存到localStorage
//         saveTasks();

//         // 关闭所有模态框
//         closeConfirmDeleteModal();
//         closeModal();

//         // 更新界面
//         renderWeekView();
//         renderTaskList();
//         updateStats();

//         // 显示成功消息
//         if (isBatchDelete) {
//             showNotification(`已批量删除 ${deletedTasks.length} 个重复任务`, 'success');
//         } else {
//             showNotification(`已删除学习计划: ${task.name}`, 'success');
//         }

//     } catch (error) {
//         console.error('删除任务失败:', error);
//         showNotification('删除失败，请重试', 'error');
//     }
// }
// 确认删除任务 - 支持批量删除 - 修复版本
async function confirmDeleteTask() {
    if (!currentDeleteTaskId || !currentDeleteTask) return;

    const taskId = currentDeleteTaskId;
    const task = currentDeleteTask;
    const isBatchDelete = task.repeat_type !== 'once';

    try {
        let deletedTasks = [];

        if (isBatchDelete) {
            // 批量删除模式
            const startDate = document.getElementById('deleteStartDate').value;
            const affectedTasks = getAffectedRepeatTasks(task, startDate);

            // 从tasks数组中删除所有受影响的任务
            affectedTasks.forEach(affectedTask => {
                const taskIndex = tasks.findIndex(t => t.id === affectedTask.id);
                if (taskIndex !== -1) {
                    deletedTasks.push(tasks[taskIndex]);
                    tasks.splice(taskIndex, 1);
                }
            });
        } else {
            // 单次删除模式
            const taskIndex = tasks.findIndex(t => t.id == taskId);
            if (taskIndex !== -1) {
                deletedTasks.push(tasks[taskIndex]);
                tasks.splice(taskIndex, 1);
            }
        }

        if (deletedTasks.length === 0) {
            showNotification('没有找到要删除的任务', 'warning');
            return;
        }

        // 🔥 修复关键：调用数据服务删除任务（同步到云端）
        await deleteTasksWithSync(deletedTasks);

        // 保存到localStorage
        saveTasks();

        // 关闭所有模态框
        closeConfirmDeleteModal();
        closeModal();

        // 更新界面
        renderWeekView();
        renderTaskList();
        updateStats();

        // 显示成功消息
        if (isBatchDelete) {
            showNotification(`已批量删除 ${deletedTasks.length} 个重复任务`, 'success');
        } else {
            showNotification(`已删除学习计划: ${task.name}`, 'success');
        }

    } catch (error) {
        console.error('删除任务失败:', error);
        showNotification('删除失败，请重试', 'error');
    }
}

// 🔥 新增：使用数据服务删除任务（支持同步到云端）
async function deleteTasksWithSync(tasksToDelete) {
    const dataService = getDataService();
     // 🔥 添加防御性检查
    if (!dataService) {
        console.error('❌ 数据服务不可用');
        showNotification('系统服务未就绪，请刷新页面重试', 'error');
        return;
    }

    // 逐个删除任务
    for (const task of tasksToDelete) {
        try {
            console.log(`正在删除任务: ${task.name} (ID: ${task.id})`);
            
            // 使用数据服务删除（这会同时处理本地和云端）
            const result = await dataService.deleteTask(task.id);
            
            if (result.success) {
                console.log(`✅ 任务删除成功: ${task.name}`);
            } else {
                console.warn(`⚠️ 任务删除可能未完全同步: ${task.name}`, result.error);
                // 即使云端删除失败，本地删除仍然继续
            }
        } catch (error) {
            console.error(`❌ 删除任务失败 ${task.name}:`, error);
            // 继续删除其他任务，不中断流程
        }
    }
    
    // 强制触发同步
    const syncService = getSyncService();
    if (syncService && typeof syncService.forceSync === 'function') {
        setTimeout(() => {
            syncService.forceSync().catch(console.error);
        }, 500);
    }
}

// 🔥 新增：获取数据服务实例
function getDataService() {
    if (window.dataService) {
        return window.dataService;
    }
    
    // 如果全局实例不存在，创建临时实例
    console.warn('数据服务全局实例未找到，创建临时实例');
    const { DataService } = require('./js/services/data-service');
    return new DataService();
}

// 🔥 新增：获取同步服务实例
function getSyncService() {
    if (window.syncService) {
        return window.syncService;
    }
    
    // 如果全局实例不存在，创建临时实例
    console.warn('同步服务全局实例未找到，创建临时实例');
    const { SyncService } = require('./js/services/sync-service');
    return new SyncService();
}

// 修改保存任务函数，确保数据服务可用
function saveTasks() {
    localStorage.setItem('studyTasks', JSON.stringify(tasks));
    // 保存后更新科目选项
    updateSubjectFilterOptions();
    
    // 🔥 新增：确保数据服务知道本地变更
    const dataService = getDataService();
    if (dataService && typeof dataService.notifyLocalChange === 'function') {
        dataService.notifyLocalChange();
    }
}
// 修改删除按钮文本显示
function updateDeleteButtonText(task) {
    const deleteBtn = document.getElementById('deleteTaskBtn');
    if (!deleteBtn) return;
console.log('更新删除按钮文本，任务重复类型:', task.repeat_type);
    if (task.repeat_type !== 'once') {
        deleteBtn.innerHTML = '<i class="fas fa-layer-group"></i> 批量删除';
    } else {
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> 删除计划';
    }
}

// 关闭确认删除模态框
function closeConfirmDeleteModal() {
    const modal = document.getElementById('confirmDeleteModal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentDeleteTaskId = null;
}

/**
 * 初始化家庭功能
 */
async function initializeFamilyFeatures() {
    const familyService = getFamilyService();

    // 等待家庭服务初始化完成
    setTimeout(async () => {
        await updateFamilyStatusDisplay();
        await loadFamilyTasksIfJoined();
    }, 1000);
}

/**
 * 更新家庭状态显示
 */
async function updateFamilyStatusDisplay() {
    const familyService = getFamilyService();
    const familyStatusBar = document.getElementById('familyStatusBar');

    if (!familyStatusBar) return;

    if (familyService.hasJoinedFamily()) {
        const family = familyService.getCurrentFamily();
        const member = familyService.getCurrentMember();

        // 显示家庭状态栏
        familyStatusBar.style.display = 'flex';
        document.getElementById('familyName').textContent = family.family_name;
        document.getElementById('memberRole').textContent =
            member.role === 'parent' ? '家长' : '孩子';

        // 获取成员数量
        try {
            const members = await familyService.getFamilyMembers();
            document.getElementById('memberCount').textContent =
                `${members.length}名成员`;
        } catch (error) {
            console.error('获取成员数量失败:', error);
            document.getElementById('memberCount').textContent = '成员加载中';
        }

        // 绑定按钮事件
        bindFamilyButtonEvents();

    } else {
        familyStatusBar.style.display = 'none';
    }
}

/**
 * 绑定家庭按钮事件
 */
function bindFamilyButtonEvents() {
    const viewFamilyTasksBtn = document.getElementById('viewFamilyTasks');
    const manageFamilyBtn = document.getElementById('manageFamily');

    if (viewFamilyTasksBtn) {
        viewFamilyTasksBtn.addEventListener('click', toggleFamilyTasksView);
    }

    if (manageFamilyBtn) {
        manageFamilyBtn.addEventListener('click', () => {
            window.location.href = 'family-management.html';
        });
    }
}

/**
 * 切换家庭任务视图
 */
function toggleFamilyTasksView() {
    const viewBtn = document.getElementById('viewFamilyTasks');
    const isShowingFamilyTasks = viewBtn.classList.contains('active');

    if (isShowingFamilyTasks) {
        // 显示所有任务
        showAllTasks();
        viewBtn.textContent = '只看家庭任务';
        viewBtn.classList.remove('active');
    } else {
        // 只显示家庭任务
        showFamilyTasksOnly();
        viewBtn.textContent = '显示所有任务';
        viewBtn.classList.add('active');
    }
}

/**
 * 显示所有任务
 */
function showAllTasks() {
    const allTasks = document.querySelectorAll('.task-item');
    allTasks.forEach(task => {
        task.style.display = 'flex';
    });
}

/**
 * 只显示家庭任务
 */
function showFamilyTasksOnly() {
    const allTasks = document.querySelectorAll('.task-item');
    allTasks.forEach(task => {
        if (task.classList.contains('family-task')) {
            task.style.display = 'flex';
        } else {
            task.style.display = 'none';
        }
    });
}

/**
 * 如果已加入家庭，加载家庭任务
 */
async function loadFamilyTasksIfJoined() {
    const familyService = getFamilyService();

    if (familyService.hasJoinedFamily()) {
        await markFamilyTasks();
    }
}

/**
 * 标记家庭任务
 */
async function markFamilyTasks() {
    const familyService = getFamilyService();
    
    if (!familyService.hasJoinedFamily()) {
        return;
    }

    try {
        const today = new Date().toISOString().split('T')[0];
        
        // 只获取今天的家庭任务
        const todayFamilyTasks = await familyService.supabaseClient.getTasks(
            familyService.getCurrentFamily().id, 
            today
        );
        
        console.log(`📅 今天(${today})的家庭任务:`, todayFamilyTasks.length);

        const pageTasks = document.querySelectorAll('.task-item');
        let markedCount = 0;

        // 使用名称匹配标记任务
        todayFamilyTasks.forEach(cloudTask => {
            let foundTask = null;
            
            // 在页面任务中查找匹配
            pageTasks.forEach(pageTask => {
                const taskNameElement = pageTask.querySelector('.task-name');
                const pageTaskName = taskNameElement?.textContent?.trim();
                
                if (pageTaskName === cloudTask.name) {
                    foundTask = pageTask;
                }
            });
            
            if (foundTask && !foundTask.classList.contains('family-task')) {
                foundTask.classList.add('family-task');
                
                // 添加徽章
                const taskNameElement = foundTask.querySelector('.task-name');
                if (taskNameElement && !foundTask.querySelector('.family-badge')) {
                    const familyBadge = document.createElement('span');
                    familyBadge.className = 'family-badge';
                    familyBadge.textContent = '👨‍👩‍👧‍👦 家庭任务';
                    
                    // 确保样式
                    familyBadge.style.cssText = `
                        background: #667eea;
                        color: white;
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-size: 0.7em;
                        margin-right: 8px;
                        font-weight: 500;
                        display: inline-block;
                    `;
                    
                    taskNameElement.parentNode.insertBefore(familyBadge, taskNameElement);
                    markedCount++;
                }
            }
        });

        console.log(`✅ 标记了 ${markedCount} 个家庭任务`);

    } catch (error) {
        console.error('标记家庭任务失败:', error);
    }
}

// 监听家庭状态变化
function setupFamilyEventListeners() {
    // 监听家庭创建事件
    window.addEventListener('family:familyCreated', function (event) {
        console.log('家庭创建事件触发', event.detail);
        updateFamilyStatusDisplay();
    });

    // 监听家庭加入事件
    window.addEventListener('family:familyJoined', function (event) {
        console.log('家庭加入事件触发', event.detail);
        updateFamilyStatusDisplay();
    });

    // 监听家庭退出事件
    window.addEventListener('family:familyLeft', function (event) {
        console.log('家庭退出事件触发', event.detail);
        updateFamilyStatusDisplay();

        // 移除所有家庭任务标记
        const familyTasks = document.querySelectorAll('.family-task');
        familyTasks.forEach(task => {
            task.classList.remove('family-task');
            const badge = task.querySelector('.family-badge');
            if (badge) {
                badge.remove();
            }
        });
    });

    // 监听数据迁移事件
    window.addEventListener('family:dataMigrated', function (event) {
        console.log('数据迁移事件触发', event.detail);
        // 重新加载任务以显示新的家庭任务
        loadTasks();
        setTimeout(updateFamilyStatusDisplay, 1000);
    });
}