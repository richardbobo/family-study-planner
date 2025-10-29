// 简化版本 - 主页面
console.log('index.js 已加载');

let tasks = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('主页DOM已加载');
    loadTasks();
    renderTaskList();
});

function loadTasks() {
    try {
        const saved = localStorage.getItem('studyTasks');
        if (saved) {
            tasks = JSON.parse(saved);
            console.log('加载了', tasks.length, '个任务');
        }
    } catch (e) {
        console.error('加载任务失败:', e);
    }
}

function renderTaskList() {
    const container = document.getElementById('tasks-container');
    if (!container) {
        console.error('找不到任务容器');
        return;
    }
    
    // 获取今天的任务
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(task => task.date === today);
    
    console.log('今天有', todayTasks.length, '个任务');
    
    if (todayTasks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-calendar-plus" style="font-size: 3rem; margin-bottom: 15px;"></i>
                <p>今天还没有学习计划</p>
                <a href="add-plan.html" class="add-btn" style="display: inline-block; margin-top: 15px;">
                    <i class="fas fa-plus"></i> 添加第一个计划
                </a>
            </div>
        `;
        return;
    }
    
    let html = '';
    todayTasks.forEach(task => {
        html += `
            <div class="task-item" style="
                background: #f8f9fa; 
                border-radius: 10px; 
                padding: 15px; 
                margin-bottom: 10px;
                border-left: 4px solid #4a69bd;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <div class="task-info">
                    <h4 style="margin: 0 0 8px 0;">${task.name}</h4>
                    <div style="display: flex; gap: 15px; color: #666; font-size: 0.9rem;">
                        <span>${task.subject}</span>
                        <span>${task.startTime} - ${task.endTime}</span>
                        <span>${task.time}分钟</span>
                    </div>
                    ${task.note ? `<p style="margin: 8px 0 0 0; color: #888;">${task.note}</p>` : ''}
                </div>
                <div class="task-actions" style="display: flex; gap: 10px;">
                    <button onclick="toggleTask(${task.id})" style="
                        background: #2ed573; 
                        color: white; 
                        border: none; 
                        padding: 8px 15px; 
                        border-radius: 5px; 
                        cursor: pointer;
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
    
    container.innerHTML = html;
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTaskList();
        alert(task.completed ? '任务完成！🎉' : '任务已重置');
    }
}

function deleteTask(id) {
    if (confirm('确定要删除这个任务吗？')) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTaskList();
    }
}

function saveTasks() {
    localStorage.setItem('studyTasks', JSON.stringify(tasks));
}