// 示例任务数据
let tasks = [];

// 初始化统计信息
let stats = {
    completedTasks: 0,
    totalMinutes: 0,
    streakDays: 0,
    rewardPoints: 0
};

// DOM元素
const completedTasksEl = document.getElementById('completedTasks');
const totalMinutesEl = document.getElementById('totalMinutes');
const streakDaysEl = document.getElementById('streakDays');
const rewardPointsEl = document.getElementById('rewardPoints');
const taskListEl = document.getElementById('taskList');

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    // 从本地存储加载数据
    loadFromLocalStorage();
    
    // 渲染统计信息
    updateStats();
    
    // 渲染任务列表
    renderTaskList();
    
    // 设置日期卡片点击事件
    setupDateCards();
});

// 从本地存储加载数据
function loadFromLocalStorage() {
    const savedTasks = localStorage.getItem('studyTasks');
    const savedStats = localStorage.getItem('studyStats');
    
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
        console.log('从本地存储加载了', tasks.length, '个任务');
    }
    
    if (savedStats) {
        stats = JSON.parse(savedStats);
    }
}

// 保存数据到本地存储
function saveToLocalStorage() {
    localStorage.setItem('studyTasks', JSON.stringify(tasks));
    localStorage.setItem('studyStats', JSON.stringify(stats));
}

// 更新统计信息
function updateStats() {
    const completedTasks = tasks.filter(t => t.completed).length;
    const totalMinutes = tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.time || 0), 0);
    
    stats.completedTasks = completedTasks;
    stats.totalMinutes = totalMinutes;
    
    if (completedTasksEl) completedTasksEl.textContent = completedTasks;
    if (totalMinutesEl) totalMinutesEl.textContent = totalMinutes;
    if (streakDaysEl) streakDaysEl.textContent = stats.streakDays;
    if (rewardPointsEl) rewardPointsEl.textContent = stats.rewardPoints;
    
    saveToLocalStorage();
}

// 渲染任务列表
function renderTaskList() {
    if (!taskListEl) return;
    
    taskListEl.innerHTML = '';
    
    // 获取今天的日期
    const today = new Date().toISOString().split('T')[0];
    
    // 过滤出今天的任务
    const todayTasks = tasks.filter(task => task.date === today);
    
    if (todayTasks.length === 0) {
        taskListEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-plus"></i>
                <p>今天还没有学习计划</p>
                <a href="add-plan.html" class="add-btn">
                    <i class="fas fa-plus"></i> 添加第一个计划
                </a>
            </div>
        `;
        return;
    }
    
    // 按完成状态分组
    const pendingTasks = todayTasks.filter(task => !task.completed);
    const completedTasks = todayTasks.filter(task => task.completed);
    
    // 渲染待完成任务
    if (pendingTasks.length > 0) {
        pendingTasks.forEach(task => {
            const taskItem = createTaskItem(task);
            taskListEl.appendChild(taskItem);
        });
    }
    
    // 渲染已完成任务
    if (completedTasks.length > 0) {
        const completedHeader = document.createElement('div');
        completedHeader.className = 'completed-header';
        completedHeader.innerHTML = '<h4>已完成</h4>';
        taskListEl.appendChild(completedHeader);
        
        completedTasks.forEach(task => {
            const taskItem = createTaskItem(task);
            taskListEl.appendChild(taskItem);
        });
    }
}

// 创建任务项元素
function createTaskItem(task) {
    const taskItem = document.createElement('div');
    taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
    taskItem.setAttribute('data-task-id', task.id);
    
    // 根据科目设置边框颜色
    const subjectColors = {
        '语文': '#ff6b6b',
        '数学': '#4a69bd',
        '英语': '#2ed573',
        '科学': '#ff9f43',
        '美术': '#f368e0',
        '体育': '#2bcbba'
    };
    
    const borderColor = subjectColors[task.subject] || '#4a69bd';
    
    taskItem.innerHTML = `
        <div class="task-info">
            <h4>${task.name}</h4>
            <div class="task-meta">
                <span class="task-subject">${task.subject}</span>
                <span class="task-time">${task.startTime || '19:00'} - ${task.endTime || '20:30'}</span>
                <span class="task-duration">${task.time || 30}分钟</span>
            </div>
            ${task.note ? `<p class="task-note">${task.note}</p>` : ''}
        </div>
        <div class="task-actions">
            <button class="btn-start" onclick="toggleTask(${task.id})">
                <i class="fas fa-${task.completed ? 'undo' : 'play'}"></i>
                ${task.completed ? '重做' : '开始计时'}
            </button>
            <button class="btn-delete" onclick="deleteTask(${task.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    // 设置边框颜色
    taskItem.style.borderLeftColor = borderColor;
    
    return taskItem;
}

// 切换任务完成状态
function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        
        // 如果完成任务，增加积分
        if (task.completed) {
            stats.rewardPoints += calculatePoints(task);
        } else {
            stats.rewardPoints = Math.max(0, stats.rewardPoints - calculatePoints(task));
        }
        
        renderTaskList();
        updateStats();
        
        // 显示完成动画
        if (task.completed) {
            showCompletionAnimation(task.name);
        }
    }
}

// 计算任务积分
function calculatePoints(task) {
    let points = 1; // 基础积分
    
    // 时间奖励
    if (task.time >= 60) {
        points += 2;
    } else if (task.time >= 30) {
        points += 1;
    }
    
    return points;
}

// 删除任务
function deleteTask(id) {
    if (confirm('确定要删除这个任务吗？')) {
        tasks = tasks.filter(t => t.id !== id);
        renderTaskList();
        updateStats();
    }
}

// 设置日期卡片点击事件
function setupDateCards() {
    const dayCards = document.querySelectorAll('.day-card');
    dayCards.forEach(card => {
        card.addEventListener('click', function() {
            // 移除其他卡片的选中状态
            dayCards.forEach(c => c.classList.remove('active'));
            // 添加当前卡片的选中状态
            this.classList.add('active');
        });
    });
}

// 显示完成动画
function showCompletionAnimation(taskName) {
    alert(`🎉 任务完成！\n${taskName}`);
}

// 获取今天的日期字符串
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}