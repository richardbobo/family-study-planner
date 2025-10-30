// 修复版本 - 主页面
console.log('index.js 已加载');

let tasks = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('主页DOM已加载');
    loadTasks();
    renderTaskList();
    updateStats();
});

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

function findTaskContainer() {
    // 尝试多个可能的容器ID
    const possibleIds = ['tasks-container', 'taskList', 'tasksContainer', 'task-list'];
    
    for (let id of possibleIds) {
        const container = document.getElementById(id);
        if (container) {
            console.log('找到任务容器:', id);
            return container;
        }
    }
    
    // 如果都没找到，尝试通过class查找
    const byClass = document.querySelector('.task-list');
    if (byClass) {
        console.log('通过class找到任务容器');
        return byClass;
    }
    
    console.error('无法找到任务容器，请检查HTML结构');
    return null;
}

function renderTaskList() {
    const container = findTaskContainer();
    if (!container) {
        // 如果找不到容器，在body末尾创建一个
        createFallbackContainer();
        return;
    }
    
    // 获取今天的任务
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(task => task.date === today);
    
    console.log('今天有', todayTasks.length, '个任务，日期:', today);
    
    if (todayTasks.length === 0) {
        container.innerHTML = createEmptyState();
        return;
    }
    
    container.innerHTML = createTasksHTML(todayTasks);
}

function createFallbackContainer() {
    console.log('创建备用任务容器');
    const container = document.createElement('div');
    container.id = 'tasks-container';
    container.style.padding = '20px';
    document.body.appendChild(container);
    renderTaskList(); // 重新渲染
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

function createTasksHTML(todayTasks) {
    let html = '';
    todayTasks.forEach(task => {
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
                    <h4 style="margin: 0 0 8px 0; ${task.completed ? 'text-decoration: line-through; opacity: 0.7;' : ''}">
                        ${task.name}
                    </h4>
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
                    <button onclick="toggleTask(${task.id})" style="
                        background: ${task.completed ? '#ff9f43' : '#2ed573'}; 
                        color: white; 
                        border: none; 
                        padding: 8px 15px; 
                        border-radius: 5px; 
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 5px;
                    ">
                        <i class="fas fa-${task.completed ? 'undo' : 'play'}"></i>
                        ${task.completed ? '重做' : '开始'}
                    </button>
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
        renderTaskList();
        updateStats();
        
        if (task.completed) {
            alert(`🎉 任务完成！\n${task.name}`);
        }
    }
}

function deleteTask(id) {
    if (confirm('确定要删除这个任务吗？')) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTaskList();
        updateStats();
    }
}

function updateStats() {
    const completedTasks = tasks.filter(t => t.completed).length;
    const totalMinutes = tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.time || 0), 0);
    
    // 更新统计卡片
    const stats = {
        completedTasks: completedTasks,
        totalMinutes: totalMinutes,
        streakDays: calculateStreakDays(),
        rewardPoints: calculateRewardPoints()
    };
    
    // 更新页面显示
    updateStatElement('completedTasks', completedTasks);
    updateStatElement('totalMinutes', totalMinutes);
    updateStatElement('streakDays', stats.streakDays);
    updateStatElement('rewardPoints', stats.rewardPoints);
}

function updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

function calculateStreakDays() {
    // 简化版连续天数计算
    return tasks.filter(t => t.completed).length > 0 ? 1 : 0;
}

function calculateRewardPoints() {
    return tasks.filter(t => t.completed).length * 10;
}

function saveTasks() {
    localStorage.setItem('studyTasks', JSON.stringify(tasks));
    console.log('保存了', tasks.length, '个任务');
}

// 添加计划后刷新页面
function refreshTasks() {
    loadTasks();
    renderTaskList();
    updateStats();
}