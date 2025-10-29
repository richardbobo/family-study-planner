// 示例任务数据
let tasks = [
    { 
        id: 1, 
        name: "完成数学练习册第5页", 
        subject: "数学", 
        date: "2025-10-29", 
        time: 30, 
        timeOfDay: "下午", 
        note: "认真计算，仔细检查", 
        completed: true,
        startTime: "19:00",
        endTime: "19:30"
    },
    { 
        id: 2, 
        name: "背诵古诗《静夜思》", 
        subject: "语文", 
        date: "2025-10-29", 
        time: 20, 
        timeOfDay: "早上", 
        note: "理解诗意，熟读成诵", 
        completed: false,
        startTime: "08:00",
        endTime: "08:20"
    },
    { 
        id: 3, 
        name: "英语单词复习", 
        subject: "英语", 
        date: "2025-10-29", 
        time: 15, 
        timeOfDay: "晚上", 
        note: "每天进步一点点", 
        completed: false,
        startTime: "20:00",
        endTime: "20:15"
    }
];

// 初始化统计信息
let stats = {
    completedTasks: 0,
    totalMinutes: 0,
    streakDays: 3,
    weekProgress: 0,
    rewardPoints: 25
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
    
    // 设置快速完成按钮事件
    setupQuickComplete();
});

// 从本地存储加载数据
function loadFromLocalStorage() {
    const savedTasks = localStorage.getItem('studyTasks');
    const savedStats = localStorage.getItem('studyStats');
    
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
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
    const totalMinutes = tasks.filter(t => t.completed).reduce((sum, t) => sum + t.time, 0);
    
    stats.completedTasks = completedTasks;
    stats.totalMinutes = totalMinutes;
    
    completedTasksEl.textContent = completedTasks;
    totalMinutesEl.textContent = totalMinutes;
    streakDaysEl.textContent = stats.streakDays;
    rewardPointsEl.textContent = stats.rewardPoints;
    
    saveToLocalStorage();
}

// 渲染任务列表
function renderTaskList() {
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
                <a href="add-plan.html" class="btn btn-primary">
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
                <span class="task-subject" style="background: ${borderColor}20; color: ${borderColor}">${task.subject}</span>
                <span class="task-time">${task.startTime} - ${task.endTime}</span>
                <span class="task-duration">${task.time}分钟</span>
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
            stats.rewardPoints -= calculatePoints(task);
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
    
    // 早起加成
    const startHour = parseInt(task.startTime.split(':')[0]);
    if (startHour >= 6 && startHour <= 8) {
        points = Math.round(points * 1.2);
    }
    
    // 周末加成
    const taskDate = new Date(task.date);
    if (taskDate.getDay() === 0 || taskDate.getDay() === 6) {
        points = Math.round(points * 1.5);
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
            
            // 这里可以添加加载对应日期任务的逻辑
            const date = this.querySelector('.day-date').textContent;
            console.log('切换到日期:', date);
        });
    });
}

// 设置快速完成按钮事件
function setupQuickComplete() {
    const quickCompleteBtn = document.querySelector('.btn-quick');
    quickCompleteBtn.addEventListener('click', function() {
        const pendingTasks = tasks.filter(task => !task.completed && task.date === new Date().toISOString().split('T')[0]);
        
        if (pendingTasks.length === 0) {
            alert('今天没有待完成的任务！');
            return;
        }
        
        if (confirm(`确定要快速完成今天的 ${pendingTasks.length} 个任务吗？`)) {
            pendingTasks.forEach(task => {
                task.completed = true;
                stats.rewardPoints += calculatePoints(task);
            });
            
            renderTaskList();
            updateStats();
            showCompletionAnimation('所有任务');
        }
    });
}

// 显示完成动画
function showCompletionAnimation(taskName) {
    const animation = document.createElement('div');
    animation.className = 'completion-animation';
    animation.innerHTML = `
        <div class="animation-content">
            <i class="fas fa-check-circle"></i>
            <h3>任务完成！</h3>
            <p>${taskName}</p>
            <div class="confetti"></div>
        </div>
    `;
    
    document.body.appendChild(animation);
    
    setTimeout(() => {
        animation.remove();
    }, 3000);
}

// 添加新任务（从添加计划页面调用）
function addNewTask(taskData) {
    const newTask = {
        id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
        ...taskData,
        completed: false
    };
    
    tasks.push(newTask);
    renderTaskList();
    updateStats();
    
    return newTask;
}

// 获取今天的日期字符串
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// 添加CSS动画样式
const style = document.createElement('style');
style.textContent = `
    .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #666;
    }
    
    .empty-state i {
        font-size: 3rem;
        color: #ddd;
        margin-bottom: 15px;
    }
    
    .empty-state p {
        margin-bottom: 20px;
        font-size: 1.1rem;
    }
    
    .completed-header {
        margin: 20px 0 10px 0;
        padding-bottom: 10px;
        border-bottom: 1px solid #f0f0f0;
    }
    
    .completed-header h4 {
        color: #666;
        font-size: 1rem;
    }
    
    .task-item.completed {
        opacity: 0.7;
    }
    
    .task-item.completed .task-info h4 {
        text-decoration: line-through;
    }
    
    .btn-delete {
        background: #ff6b6b;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        cursor: pointer;
        transition: background 0.3s;
    }
    
    .btn-delete:hover {
        background: #ff4757;
    }
    
    .completion-animation {
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
        animation: fadeIn 0.3s;
    }
    
    .animation-content {
        background: white;
        padding: 30px;
        border-radius: 15px;
        text-align: center;
        animation: scaleIn 0.5s;
    }
    
    .animation-content i {
        font-size: 4rem;
        color: #2ed573;
        margin-bottom: 15px;
    }
    
    .animation-content h3 {
        color: #333;
        margin-bottom: 10px;
    }
    
    .animation-content p {
        color: #666;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes scaleIn {
        from { transform: scale(0.8); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
    }
    
    .day-card.active {
        border-color: #4a69bd;
        background: #e3f2fd;
        transform: translateY(-3px);
        box-shadow: 0 5px 15px rgba(74, 105, 189, 0.3);
    }
`;
document.head.appendChild(style);