// 主页面逻辑 - 完整修复版本

let tasks = [];
let currentWeekStart = getMonday(new Date());
let currentTaskId = null;
let currentQuickCompleteTaskId = null;
let isSubmittingCompletion = false;
let currentDeleteTask = null;
// 在主应用中初始化纯云端成就系统
let achievementSystem = null;

// 初始化计时管理器
let timerManager;

// 初始化页面-1
document.addEventListener('DOMContentLoaded', function () {
    console.log('主页DOM已加载');

    initializeNavigation();
    initializeModal();
    initializeQuickCompleteModal();
    initializeFilterAndSort(); // 这个现在会动态更新科目选项
    initializeConfirmDeleteModal(); // 新增：初始化确认删除模态框  


    renderWeekView();
    // 🔄 修改：使用新的任务加载方式
    loadTasksFromCloud();

    renderTaskList();
    // 确保统计信息初始化
    setTimeout(() => {
        updateStats();
    }, 2000);
    initializeFamilyFeatures();
    setupFamilyEventListeners();
    setupRefreshButton();
    timerManager = new TimerManager();
    console.log('页面初始化完成');
    // 初始化成就系统
    setTimeout(() => {
        initializeAchievementSystem();
    // 成就系统初始化后再次更新统计
        setTimeout(() => {
            updateStats();
        }, 3000);
    }, 2000); // 延迟2秒确保其他服务已初始化

});

// 计时管理器类
// 增强的计时管理器类
// 简化版计时管理器类
class TimerManager {
    constructor() {
        this.currentTimer = null;
        this.startTime = null;
        this.elapsedTime = 0;
        this.isRunning = false;
        this.currentTaskId = null;
        this.timerInterval = null;
        this.lastUpdateTime = null;
        this.pauseStartTime = null; // 新增：记录暂停开始时间

        this.init();
    }

    init() {
        this.restoreTimerState();
        this.startRealTimeUpdate();
    }

    // 开始实时更新显示（每秒更新）
    startRealTimeUpdate() {
        setInterval(() => {
            if (this.isRunning && this.startTime) {
                const now = new Date();
                const elapsedSeconds = Math.floor((now - this.startTime) / 1000);
                const elapsedMinutes = Math.floor(elapsedSeconds / 60);

                if (elapsedMinutes !== this.elapsedTime) {
                    this.elapsedTime = elapsedMinutes;
                    this.saveTimerState();
                }

                this.updateTimerDisplay(elapsedSeconds);
            }
        }, 1000);
    }

    // 开始计时 - 简化版本
    startTimer(taskId) {
        const task = tasks.find(t => t.id == taskId);
        if (!task) {
            showNotification('任务不存在', 'error');
            return;
        }

        // 如果已经在计时同一个任务，则忽略
        if (this.isRunning && this.currentTaskId === taskId) {
            return;
        }

        // 如果已经在计时其他任务，先暂停
        if (this.isRunning && this.currentTaskId !== taskId) {
            this.pauseTimer();
        }

        this.currentTaskId = taskId;
        this.startTime = new Date();
        this.isRunning = true;
        this.lastUpdateTime = new Date();
        this.pauseStartTime = null; // 重置暂停开始时间

        this.saveTimerState();
        this.updateTimerDisplay(0);

        showNotification(`⏰ 开始计时: ${task.name}`, 'info');
    }

    // 继续计时
    continueTimer() {
        if (!this.currentTaskId || this.isRunning) return;

        const task = tasks.find(t => t.id == this.currentTaskId);
        if (!task) {
            this.resetTimer();
            return;
        }

        this.isRunning = true;

        // 修复：计算暂停的时间并调整开始时间
        if (this.pauseStartTime) {
            const pauseDuration = new Date() - this.pauseStartTime;
            this.startTime = new Date(this.startTime.getTime() + pauseDuration);
        } else {
            // 如果没有记录暂停开始时间，使用保守估计
            this.startTime = new Date(Date.now() - this.elapsedTime * 60 * 1000);
        }

        this.pauseStartTime = null;
        this.lastUpdateTime = new Date();

        this.saveTimerState();

        // 计算当前的总秒数用于显示
        const currentTotalSeconds = Math.floor((new Date() - this.startTime) / 1000);
        this.updateTimerDisplay(currentTotalSeconds);

        showNotification(`▶️ 继续计时: ${task.name}`, 'info');
    }

    // 暂停计时
    pauseTimer() {
        if (!this.isRunning) return;

        this.isRunning = false;
        this.pauseStartTime = new Date(); // 记录暂停开始时间
        this.lastUpdateTime = new Date();

        // 更新经过的时间
        if (this.startTime) {
            const currentElapsed = Math.floor((this.pauseStartTime - this.startTime) / 1000);
            this.elapsedTime = Math.floor(currentElapsed / 60);
        }

        this.saveTimerState();

        const task = tasks.find(t => t.id == this.currentTaskId);
        if (task) {
            showNotification(`⏸️ 已暂停: ${task.name} (${this.getFormattedTime()})`, 'warning');
        }

        const currentTotalSeconds = this.elapsedTime * 60;
        this.updateTimerDisplay(currentTotalSeconds);
    }

    // 停止计时并完成任务
    async stopAndComplete() {
        if (!this.currentTaskId) return;

        const task = tasks.find(t => t.id == this.currentTaskId);
        if (!task) return;

        this.isRunning = false;
        this.lastUpdateTime = new Date();
        // 确保最终时间准确
        if (this.startTime) {
            const finalElapsed = Math.floor((this.lastUpdateTime - this.startTime) / 1000);
            this.elapsedTime = Math.floor(finalElapsed / 60);
        }

        const totalMinutes = this.elapsedTime;
        const completionNote = this.getCompletionNote();

        // 显示确认完成模态框
        this.showCompletionModal(task, totalMinutes, completionNote);
    }

    // 重置计时器
    resetTimer() {
        this.isRunning = false;
        this.currentTaskId = null;
        this.startTime = null;
        this.elapsedTime = 0;
        this.lastUpdateTime = null;
        this.pauseStartTime = null;
        localStorage.removeItem('currentTimer');
        this.updateTimerDisplay(0);
    }

    // 更新计时器显示 - 只保留一个显示区域
    // 更新计时器显示
    updateTimerDisplay(totalSeconds = 0) {
        const timerBadge = document.getElementById('timerBadge');

        if (timerBadge) {
            if (this.currentTaskId) {
                const task = tasks.find(t => t.id == this.currentTaskId);
                const timeText = this.getFormattedTimeWithSeconds(totalSeconds);

                timerBadge.innerHTML = `
                    <div class="timer-container ${this.isRunning ? 'timer-running' : 'timer-paused'}">
                        <div class="timer-header">
                            <div class="timer-icon">
                                <i class="fas fa-clock ${this.isRunning ? 'pulse' : ''}"></i>
                            </div>
                            <div class="timer-text">
                                <div class="timer-task">${task?.name || '任务'}</div>
                                <div class="timer-time">${timeText}</div>
                            </div>
                        </div>
                        <div class="timer-controls">
                            ${this.isRunning ? `
                                <button class="btn-timer-control btn-pause" onclick="timerManager.pauseTimer()" title="暂停">
                                    <i class="fas fa-pause"></i>
                                </button>
                                <button class="btn-timer-control btn-complete" onclick="timerManager.stopAndComplete()" title="完成">
                                    <i class="fas fa-check"></i>
                                </button>
                            ` : `
                                <button class="btn-timer-control btn-continue" onclick="timerManager.continueTimer()" title="继续">
                                    <i class="fas fa-play"></i>
                                </button>
                                <button class="btn-timer-control btn-reset" onclick="timerManager.resetTimer()" title="重置">
                                    <i class="fas fa-redo"></i>
                                </button>
                            `}
                        </div>
                    </div>
                `;
                timerBadge.style.display = 'block';
            } else {
                timerBadge.style.display = 'none';
            }
        }

        // 更新任务列表中的计时按钮状态
        this.updateTaskTimerButtons();
    }

    // 获取带秒数的时间格式
    getFormattedTimeWithSeconds(totalSeconds) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    // 更新任务列表中的计时按钮
    updateTaskTimerButtons() {
        const timerButtons = document.querySelectorAll('.btn-start-timer');
        timerButtons.forEach(button => {
            const taskItem = button.closest('.task-item');
            const taskId = taskItem?.getAttribute('data-task-id');

            if (taskId == this.currentTaskId) {
                if (this.isRunning) {
                    button.innerHTML = '<i class="fas fa-pause"></i> 计时中';
                    button.className = 'btn btn-start-timer timer-active';
                    button.onclick = (e) => {
                        e.stopPropagation();
                        this.pauseTimer();
                    };
                    taskItem.classList.add('task-timing');
                } else {
                    button.innerHTML = '<i class="fas fa-play"></i> 继续';
                    button.className = 'btn btn-start-timer timer-paused';
                    button.onclick = (e) => {
                        e.stopPropagation();
                        this.continueTimer();
                    };
                    taskItem.classList.remove('task-timing');
                    taskItem.classList.add('task-paused');
                }
            } else {
                button.innerHTML = '<i class="fas fa-play"></i> 开始计时';
                button.className = 'btn btn-start-timer';
                button.onclick = (e) => {
                    e.stopPropagation();
                    this.startTimer(taskId);
                };
                taskItem?.classList.remove('task-timing', 'task-paused');
            }
        });
    }

    // 显示完成确认模态框 - 保留翻页时钟效果
    // 在 showCompletionModal 方法中添加样式确保正确显示
    showCompletionModal(task, totalMinutes, defaultNote) {
        // 先移除可能存在的旧模态框
        const existingModal = document.getElementById('timerCompletionModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'modal timer-completion-modal';
        modal.id = 'timerCompletionModal';
        modal.style.display = 'flex';

        modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>🎉 学习完成！</h3>
                <button class="close-btn" onclick="timerManager.cancelCompletion()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="completion-summary">
                    <div class="flip-clock">
                        <div class="flip-card hours">
                            <div class="flip-card-inner">
                                <div class="flip-card-front">${Math.floor(totalMinutes / 60).toString().padStart(2, '0')}</div>
                                <div class="flip-card-back">${Math.floor(totalMinutes / 60).toString().padStart(2, '0')}</div>
                            </div>
                        </div>
                        <div class="flip-colon">:</div>
                        <div class="flip-card minutes">
                            <div class="flip-card-inner">
                                <div class="flip-card-front">${(totalMinutes % 60).toString().padStart(2, '0')}</div>
                                <div class="flip-card-back">${(totalMinutes % 60).toString().padStart(2, '0')}</div>
                            </div>
                        </div>
                        <div class="flip-label">学习时长</div>
                    </div>
                    
                    <div class="task-info">
                        <strong>${task.name}</strong>
                        <div class="subject-badge">${task.subject}</div>
                    </div>
                </div>
                
                <div class="completion-notes">
                    <label for="timerCompletionNote">学习心得（可选）:</label>
                    <textarea id="timerCompletionNote" placeholder="记录本次学习的收获和心得..." rows="3">${defaultNote}</textarea>
                </div>
                
                <div class="completion-actions">
                    <button class="btn btn-cancel" onclick="timerManager.cancelCompletion()">取消</button>
                    <button class="btn btn-confirm" onclick="timerManager.confirmCompletion()">
                        <i class="fas fa-check"></i> 确认完成
                    </button>
                </div>
            </div>
        </div>
    `;

        document.body.appendChild(modal);

        // 添加翻页动画
        setTimeout(() => {
            const flipCards = modal.querySelectorAll('.flip-card-inner');
            flipCards.forEach(card => {
                card.style.transform = 'rotateX(-180deg)';
            });
        }, 100);

        // 确保模态框在视口中可见
        setTimeout(() => {
            modal.scrollTop = 0;
        }, 50);
    }

    // 取消完成
    cancelCompletion() {
        const modal = document.getElementById('timerCompletionModal');
        if (modal) {
            modal.remove();
        }
    }

    // 确认完成任务
    async confirmCompletion() {
        const modal = document.getElementById('timerCompletionModal');
        const note = document.getElementById('timerCompletionNote')?.value.trim() || '';
        const task = tasks.find(t => t.id == this.currentTaskId);

        if (!task) {
            showNotification('任务不存在', 'error');
            return;
        }

        try {
            const dataService = getDataService();

            await dataService.completeTask(task.id, {
                actual_duration: this.elapsedTime,
                notes: note,
                earned_points: task.points || 5
            });

            await checkAchievementsOnTaskCompletion();
            await loadTasksFromCloud();

            if (modal) modal.remove();
            this.resetTimer();

            showNotification(`🎉 学习完成！用时 ${this.formatMinutes(this.elapsedTime)}`, 'success');

        } catch (error) {
            console.error('保存任务完成状态失败:', error);
            showNotification('保存失败，请重试', 'error');
        }
    }

    // 辅助方法
    getFormattedTime() {
        const hours = Math.floor(this.elapsedTime / 60);
        const minutes = this.elapsedTime % 60;
        return hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
    }

    formatMinutes(totalMinutes) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
    }

    getCompletionNote() {
        const hours = Math.floor(this.elapsedTime / 60);
        const minutes = this.elapsedTime % 60;

        if (this.elapsedTime >= 120) {
            return `专注学习了${hours}小时${minutes}分钟，收获满满！`;
        } else if (this.elapsedTime >= 60) {
            return `认真学习${hours}小时${minutes}分钟，继续保持！`;
        } else {
            return `学习了${minutes}分钟，完成了今日任务。`;
        }
    }

    // 保存计时状态 - 修复版本
    saveTimerState() {
        const timerState = {
            taskId: this.currentTaskId,
            startTime: this.startTime?.toISOString(),
            elapsedTime: this.elapsedTime,
            isRunning: this.isRunning,
            lastUpdate: new Date().toISOString(),
            pauseStartTime: this.pauseStartTime?.toISOString() // 保存暂停状态
        };
        localStorage.setItem('currentTimer', JSON.stringify(timerState));
    }

    // 恢复计时状态 - 修复版本
    restoreTimerState() {
        try {
            const saved = localStorage.getItem('currentTimer');
            if (saved) {
                const timerState = JSON.parse(saved);

                const lastUpdate = new Date(timerState.lastUpdate);
                const now = new Date();
                const hoursDiff = (now - lastUpdate) / (1000 * 60 * 60);

                if (hoursDiff < 24) {
                    this.currentTaskId = timerState.taskId;
                    this.startTime = new Date(timerState.startTime);
                    this.elapsedTime = timerState.elapsedTime;
                    this.isRunning = timerState.isRunning;

                    // 恢复暂停状态
                    if (timerState.pauseStartTime) {
                        this.pauseStartTime = new Date(timerState.pauseStartTime);
                    }

                    if (this.isRunning) {
                        // 重新计算经过的时间
                        const currentElapsed = Math.floor((now - this.startTime) / (1000 * 60));
                        this.elapsedTime = currentElapsed;
                        this.startTime = new Date(now - currentElapsed * 60 * 1000);
                    }

                    const currentTotalSeconds = this.elapsedTime * 60;
                    this.updateTimerDisplay(currentTotalSeconds);
                } else {
                    localStorage.removeItem('currentTimer');
                }
            }
        } catch (error) {
            console.error('恢复计时状态失败:', error);
            localStorage.removeItem('currentTimer');
        }
    }
}





// 🔄 修改：从云端加载任务
async function loadTasksFromCloud() {

    // console.group('🔍 [DEBUG] 主页任务加载前状态检查');

    // 检查1: 直接读取sessionStorage
    const sessionData = sessionStorage.getItem('family_session');
    console.log('💾 原始sessionStorage数据:', sessionData);

    if (sessionData) {
        try {
            const parsed = JSON.parse(sessionData);
            console.log('📦 解析后的家庭信息:', {
                family: parsed.family,
                member: parsed.member,
                timestamp: parsed.timestamp
            });
        } catch (e) {
            console.error('❌ sessionStorage数据解析失败:', e);
        }
    }

    // 检查2: 家庭服务状态
    const familyService = getFamilyService();
    console.log('👥 家庭服务状态:', {
        isInitialized: familyService.isInitialized,
        currentFamily: familyService.currentFamily,
        currentMember: familyService.currentMember,
        storageKey: familyService.storageKey
    });

    // 检查3: 手动尝试恢复
    if (!familyService.isInitialized) {
        console.log('🔄 手动触发家庭服务恢复...');
        await familyService.restoreFromSessionStorage();
        console.log('🔄 恢复后状态:', {
            currentFamily: familyService.currentFamily,
            currentMember: familyService.currentMember
        });
    }

    console.groupEnd();
    try {
        console.log('🔍 开始从云端加载任务...');
        showLoading(true);

        const dataService = getDataService();
        const loadedTasks = await dataService.getTasks();

        tasks = loadedTasks || [];
        console.log(`✅ 从云端加载了 ${tasks.length} 个任务`);

        renderWeekView();
        renderTaskList();
     // 🔥 修改：确保统计信息更新，包括成就数量
        await updateStats(); // 改为异步调用

    } catch (error) {
        console.error('❌ 从云端加载任务失败:', error);
        showNotification('加载任务失败，请检查网络连接', 'error');
        // 降级处理：使用空数组
        tasks = [];
        renderWeekView();
        renderTaskList();
        await updateStats(); // 错误情况下也更新统计
    } finally {
        showLoading(false);
    }
}


// 🔄 修改：显示加载状态
function showLoading(show) {
    const loadingElement = document.getElementById('loadingIndicator');
    if (loadingElement) {
        loadingElement.style.display = show ? 'block' : 'none';
    }

    const taskListContainer = document.getElementById('tasks-container');
    if (taskListContainer && show) {
        taskListContainer.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>正在从云端加载任务...</p>
                </div>
            `;
    }
}

// 🔄 修改：快速完成任务 - 适配云端
async function quickComplete(taskId) {
    event.stopPropagation();
    openQuickCompleteModal(taskId);
}

// 🔄 修改：确认快速完成 - 适配云端
async function confirmQuickComplete() {
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

    try {
        const dataService = getDataService();

        // 更新任务完成状态到云端
        // 🔧 修改：使用新的 completeTask 方法
        await dataService.completeTask(task.id, {
            actual_duration: totalMinutes,
            notes: completionNote,
            earned_points: task.points || 5
        });

        // 检查成就
        await checkAchievementsOnTaskCompletion();

        // 重新从云端加载最新数据
        await loadTasksFromCloud();
        // 确保统计信息更新
        updateStats(); // 新增：强制更新统计

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
// 监听成就解锁事件
window.addEventListener('achievement:unlocked', function(event) {
    console.log('🎉 收到成就解锁事件:', event.detail);
    
    // 显示成就解锁通知
    const achievement = event.detail.achievement;
    showNotification(
        `🎉 成就解锁！${achievement.icon} ${achievement.name}`,
        'success'
    );
    
    // 更新成就页面显示
    if (window.updateAchievementsDisplay) {
        setTimeout(() => {
            window.updateAchievementsDisplay();
        }, 1000);
    }
});

}

// 🔄 修改：确认删除任务 - 适配云端
async function confirmDeleteTask() {
    if (!currentDeleteTaskId || !currentDeleteTask) return;

    const taskId = currentDeleteTaskId;
    const task = currentDeleteTask;
    const isBatchDelete = task.repeat_type !== 'once';

    try {
        const dataService = getDataService();
        let deletedCount = 0;

        if (isBatchDelete) {
            // 批量删除模式
            const startDate = document.getElementById('deleteStartDate').value;
            const affectedTasks = getAffectedRepeatTasks(task, startDate);
            const taskIds = affectedTasks.map(t => t.id);

            if (taskIds.length > 0) {
                const result = await dataService.batchDeleteTasks(taskIds);
                deletedCount = result.deletedCount;
            }
        } else {
            // 单次删除模式
            await dataService.deleteTask(taskId);
            deletedCount = 1;
        }

        if (deletedCount === 0) {
            showNotification('没有找到要删除的任务', 'warning');
            return;
        }

        // 重新从云端加载最新数据
        await loadTasksFromCloud();

        // 确保统计信息更新
        updateStats(); // 新增：强制更新统计

        // 关闭所有模态框
        closeConfirmDeleteModal();
        closeModal();

        // 显示成功消息
        if (isBatchDelete) {
            showNotification(`已批量删除 ${deletedCount} 个重复任务`, 'success');
        } else {
            showNotification(`已删除学习计划: ${task.name}`, 'success');
        }

    } catch (error) {
        console.error('删除任务失败:', error);
        showNotification('删除失败，请重试', 'error');
    }
}

// 🔄 修改：刷新按钮功能
function setupRefreshButton() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await loadTasksFromCloud();
            showNotification('任务列表已刷新', 'success');
        });
    }
}



// 🔄 修改：标记家庭任务 - 适配云端
async function markFamilyTasks() {
    const familyService = getFamilyService();

    if (!familyService.hasJoinedFamily()) {
        return;
    }

    try {
        const today = new Date().toISOString().split('T')[0];

        // 使用数据服务获取今天的家庭任务
        const dataService = getDataService();
        const todayFamilyTasks = await dataService.getAllTasks({
            family_id: familyService.getCurrentFamily().id,
            date: today
        });

        console.log(`📅 今天(${today})的家庭任务:`, todayFamilyTasks.length);

        const pageTasks = document.querySelectorAll('.task-item');
        let markedCount = 0;

        // 使用ID匹配标记任务（更准确）
        todayFamilyTasks.forEach(cloudTask => {
            pageTasks.forEach(pageTask => {
                const taskId = pageTask.getAttribute('data-task-id');
                if (taskId === cloudTask.id && !pageTask.classList.contains('family-task')) {
                    pageTask.classList.add('family-task');

                    // 添加徽章
                    const taskNameElement = pageTask.querySelector('.task-name');
                    if (taskNameElement && !pageTask.querySelector('.family-badge')) {
                        const familyBadge = document.createElement('span');
                        familyBadge.className = 'family-badge';
                        familyBadge.textContent = '👨‍👩‍👧‍👦 家庭任务';

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
        });

        console.log(`✅ 标记了 ${markedCount} 个家庭任务`);

    } catch (error) {
        console.error('标记家庭任务失败:', error);
    }
}


// /**
//  * 标记家庭任务
//  */
// async function markFamilyTasks() {
//     const familyService = getFamilyService();

//     if (!familyService.hasJoinedFamily()) {
//         return;
//     }

//     try {
//         const today = new Date().toISOString().split('T')[0];

//         // 只获取今天的家庭任务
//         const taskService = getTaskService(); // 获取任务服务
//         const todayFamilyTasks = await taskService.getTasks(
//             familyService.getCurrentFamily().id,
//             today
//         );

//         console.log(`📅 今天(${today})的家庭任务:`, todayFamilyTasks.length);

//         const pageTasks = document.querySelectorAll('.task-item');
//         let markedCount = 0;

//         // 使用名称匹配标记任务
//         todayFamilyTasks.forEach(cloudTask => {
//             let foundTask = null;

//             // 在页面任务中查找匹配
//             pageTasks.forEach(pageTask => {
//                 const taskNameElement = pageTask.querySelector('.task-name');
//                 const pageTaskName = taskNameElement?.textContent?.trim();

//                 if (pageTaskName === cloudTask.name) {
//                     foundTask = pageTask;
//                 }
//             });

//             if (foundTask && !foundTask.classList.contains('family-task')) {
//                 foundTask.classList.add('family-task');

//                 // 添加徽章
//                 const taskNameElement = foundTask.querySelector('.task-name');
//                 if (taskNameElement && !foundTask.querySelector('.family-badge')) {
//                     const familyBadge = document.createElement('span');
//                     familyBadge.className = 'family-badge';
//                     familyBadge.textContent = '👨‍👩‍👧‍👦 家庭任务';

//                     // 确保样式
//                     familyBadge.style.cssText = `
//                         background: #667eea;
//                         color: white;
//                         padding: 2px 8px;
//                         border-radius: 12px;
//                         font-size: 0.7em;
//                         margin-right: 8px;
//                         font-weight: 500;
//                         display: inline-block;
//                     `;

//                     taskNameElement.parentNode.insertBefore(familyBadge, taskNameElement);
//                     markedCount++;
//                 }
//             }
//         });

//         console.log(`✅ 标记了 ${markedCount} 个家庭任务`);

//     } catch (error) {
//         console.error('标记家庭任务失败:', error);
//     }
// }

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


// 打开模态框显示任务 - 修正版本
async function openModal(taskId) {
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

    // 显示任务描述（无论是否完成都显示）
    if (task.description) {
        modalHTML += `
            <div class="detail-item full-width">
                <div class="detail-label">任务描述：</div>
                <div class="detail-value">
                    <div class="task-description-box">
                        <p class="description-text">${escapeHtml(task.description)}</p>
                    </div>
                </div>
            </div>
        `;
    }

    // 如果任务已完成，从 completion_records 表获取详细信息
    let completionRecord = null;
    if (task.completed) {
        try {
            // 从 completion_records 表获取完成记录
            completionRecord = await getCompletionRecord(taskId);
        } catch (error) {
            console.error('获取完成记录失败:', error);
        }

        // 显示学习心得（从 completion_records 表的 notes 字段）
        if (completionRecord && completionRecord.notes) {
            modalHTML += `
                <div class="detail-item full-width">
                    <div class="detail-label">
                        <i class="fas fa-sticky-note" style="color: #667eea;"></i>
                        学习心得：
                    </div>
                    <div class="detail-value">
                        <div class="completion-note-box">
                            <p class="note-text">${escapeHtml(completionRecord.notes)}</p>
                        </div>
                    </div>
                </div>
            `;
        }

        // 显示实际学习时长（优先使用 completion_records 的 actual_duration）
        const actualDuration = completionRecord ? completionRecord.actual_duration : (task.actual_duration || task.actualDuration);
        if (actualDuration) {
            const hours = Math.floor(actualDuration / 60);
            const minutes = actualDuration % 60;
            const durationText = hours > 0 ?
                `${hours}小时${minutes}分钟` :
                `${minutes}分钟`;

            modalHTML += `
                <div class="detail-item">
                    <div class="detail-label">
                        <i class="fas fa-clock" style="color: #2ed573;"></i>
                        实际耗时：
                    </div>
                    <div class="detail-value" style="color: #2ed573; font-weight: 500;">
                        ${durationText}
                    </div>
                </div>
            `;
        }

        // 显示完成时间（优先使用 completion_records 的 completed_at）
        const completionTime = completionRecord ? completionRecord.completed_at : (task.completed_at || task.completionTime);
        if (completionTime) {
            const completionDate = new Date(completionTime);
            const timeString = completionDate.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            });
            const dateString = completionDate.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            modalHTML += `
                <div class="detail-item">
                    <div class="detail-label">
                        <i class="fas fa-calendar-check" style="color: #ff9f43;"></i>
                        完成时间：
                    </div>
                    <div class="detail-value">
                        ${dateString} ${timeString}
                    </div>
                </div>
            `;
        }

        // 显示实际获得积分（优先使用 completion_records 的 earned_points）
        const earnedPoints = completionRecord ? completionRecord.earned_points : (task.earned_points || task.points);
        if (earnedPoints) {
            modalHTML += `
                <div class="detail-item">
                    <div class="detail-label">
                        <i class="fas fa-star" style="color: #ffd700;"></i>
                        获得积分：
                    </div>
                    <div class="detail-value" style="color: #ff9f43; font-weight: 500;">
                        ${earnedPoints} 分
                    </div>
                </div>
            `;
        }
    }

    // 原有的任务基本信息
    modalHTML += `
            <div class="detail-item">
                <div class="detail-label">
                    <i class="fas fa-redo" style="color: #667eea;"></i>
                    重复类型：
                </div>
                <div class="detail-value">${getRepeatTypeText(task.repeat_type)}</div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">
                    <i class="fas fa-clock" style="color: #667eea;"></i>
                    计划时间：
                </div>
                <div class="detail-value">${task.startTime || '19:00'} - ${task.endTime || '20:00'}</div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">
                    <i class="fas fa-star" style="color: #667eea;"></i>
                    计划积分：
                </div>
                <div class="detail-value">${task.points || 10} 分</div>
            </div>
            
            <div class="detail-item">
                <div class="detail-label">
                    <i class="fas fa-hourglass-half" style="color: #667eea;"></i>
                    预计时长：
                </div>
                <div class="detail-value">${task.duration ? `${Math.floor(task.duration / 60)}小时${task.duration % 60}分钟` : '未设置'}</div>
            </div>
    `;

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

// 新增：从 completion_records 表获取完成记录
async function getCompletionRecord(taskId) {
    try {
        const dataService = getDataService();

        // 假设数据服务有获取完成记录的方法
        if (dataService.getCompletionRecord) {
            return await dataService.getCompletionRecord(taskId);
        }

        // 如果没有专门的方法，可以尝试从现有数据中获取
        // 这里需要根据您的实际数据服务实现来调整
        console.log('尝试从 completion_records 表获取记录，任务ID:', taskId);

        // 临时返回 null，需要您根据实际的数据服务实现来完善
        return null;

    } catch (error) {
        console.error('获取完成记录失败:', error);
        return null;
    }
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


// 开始计时
// 替换原有的简单开始计时函数
function startTimer(taskId) {
    if (timerManager) {
        timerManager.startTimer(taskId);
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
async function updateStats() {
    console.log('📊 开始更新统计信息...');

    // 计算统计信息
    const completedTasks = tasks.filter(task => task.completed).length;

    // 计算总学习时长（只计算已完成任务的时长）
    const totalMinutes = tasks.reduce((total, task) => {
        if (task.completed) {
            // 优先使用实际学习时长，如果没有则使用计划时长
            return total + (task.actual_duration || task.duration || 0);
        }
        return total;
    }, 0);

    // 计算总积分（只计算已完成任务的积分）
    const totalPoints = tasks.reduce((total, task) => {
        if (task.completed) {
            // 优先使用实际获得积分，如果没有则使用计划积分
            return total + (task.earned_points || task.points || 0);
        }
        return total;
    }, 0);

    // 计算连续打卡天数
    const streakDays = calculateStreakDays();

        // 🔥 新增：获取成就数量
    const achievementCount = await getAchievementCount();

    console.log('统计计算结果:', {
        completedTasks,
        totalMinutes,
        totalPoints,
        streakDays,
        achievementCount
    });
    

    // 更新界面元素 - 使用正确的ID
    updateStatElement('completedTasks', completedTasks);
    updateStatElement('totalMinutes', totalMinutes); // 修正：使用正确的ID
    updateStatElement('streakDays', streakDays);
    updateStatElement('rewardPoints', totalPoints); // 修正：使用正确的ID
    // 🔥 新增：更新成就数量
    updateStatElement('achievementCount', achievementCount);
}

// 🎯 最简单的成就数量获取方案
async function getAchievementCount() {
    // 如果成就系统已初始化且有数据，直接使用
    if (achievementSystem && achievementSystem.isInitialized && achievementSystem.userAchievements) {
        const unlockedCount = achievementSystem.userAchievements.length;
        console.log(`🎯 从成就系统获取 ${unlockedCount} 个已解锁成就`);
        return unlockedCount;
    }
    
    // 如果成就系统未初始化，返回0（不会阻塞页面）
    console.log('成就系统未初始化，返回默认值 0');
    return 0;
}

// 新增：计算连续打卡天数
function calculateStreakDays() {
    try {
        // 获取所有已完成任务的日期
        const completedDates = tasks
            .filter(task => task.completed)
            .map(task => {
                // 使用完成时间或任务日期
                return task.completed_at ?
                    task.completed_at.split('T')[0] :
                    task.date;
            })
            .filter(date => date) // 过滤掉空值
            .sort(); // 排序日期

        if (completedDates.length === 0) return 0;

        // 去重并排序
        const uniqueDates = [...new Set(completedDates)].sort();

        // 计算连续天数（从最近一天往前计算）
        let streak = 1;
        let currentDate = new Date(uniqueDates[uniqueDates.length - 1]);

        for (let i = uniqueDates.length - 2; i >= 0; i--) {
            const prevDate = new Date(uniqueDates[i]);
            const diffTime = currentDate - prevDate;
            const diffDays = diffTime / (1000 * 60 * 60 * 24);

            if (diffDays === 1) {
                streak++;
                currentDate = prevDate;
            } else {
                break; // 不连续就停止
            }
        }

        return streak;
    } catch (error) {
        console.error('计算连续打卡天数失败:', error);
        return 0;
    }
}

// 修改 updateStatElement 函数，添加调试信息
function updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        // 特殊处理时长显示
        if (elementId === 'totalMinutes') {
            const hours = Math.floor(value / 60);
            const minutes = value % 60;
            element.textContent = hours > 0 ?
                `${hours}小时${minutes}分钟` :
                `${minutes}分钟`;
        } else {
            element.textContent = value;
        }
        console.log(`✅ 更新 ${elementId}: ${value}`);
    } else {
        console.error(`❌ 找不到统计元素: ${elementId}`);
    }
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
 * 更新家庭状态显示在 Header 右侧
 */
// index.js - 修改 updateFamilyStatusDisplay 函数
/**
 * 更新家庭状态显示在 Header 右侧 - 增强版本
 */
async function updateFamilyStatusDisplay() {
    const familyStatusElement = document.getElementById('familyHeaderStatus');
    if (!familyStatusElement) {
        console.error('找不到家庭状态元素');
        return;
    }

    const familyService = getFamilyService();
    const hasJoinedFamily = familyService.hasJoinedFamily && familyService.hasJoinedFamily();

    // 移除旧的事件监听器（通过重新创建元素）
    const newElement = familyStatusElement.cloneNode(false);
    familyStatusElement.parentNode.replaceChild(newElement, familyStatusElement);

    if (hasJoinedFamily) {
        const family = familyService.getCurrentFamily();
        const member = familyService.getCurrentMember();

        // 创建已加入家庭的显示 - 支持快速退出
        newElement.innerHTML = `
            <div class="family-status-icon">
                <i class="fas fa-home"></i>
            </div>
            <div class="family-status-text">
                ${family.family_name}
            </div>
            <div class="family-status-dropdown">
                <i class="fas fa-chevron-down"></i>
            </div>
        `;

        newElement.className = 'family-header-status family-status-joined';
        newElement.title = `${family.family_name} - ${member.role === 'parent' ? '👨‍👩‍👧‍👦 家长' : '👦 孩子'}\n点击查看家庭信息`;

        // 添加点击事件 - 显示下拉菜单
        newElement.addEventListener('click', function (event) {
            event.stopPropagation();
            toggleFamilyDropdown(this);
        });

    } else {
        // 创建未加入家庭的显示 - 点击跳转到家庭管理
        newElement.innerHTML = `
            <div class="family-status-icon">
                <i class="fas fa-home"></i>
            </div>
            <div class="family-status-text">
                加入家庭
            </div>
        `;

        newElement.className = 'family-header-status family-status-not-joined';
        newElement.title = '点击创建或加入家庭，与家人一起学习！';

        // 添加点击事件 - 跳转到家庭管理
        newElement.addEventListener('click', function () {
            window.location.href = 'family-management.html';
        });
    }

    console.log('✅ 家庭状态显示已更新');
}

/**
 * 切换家庭下拉菜单
 */
function toggleFamilyDropdown(element) {
    // 移除其他可能打开的下拉菜单
    const existingDropdown = document.querySelector('.family-dropdown-menu');
    if (existingDropdown) {
        existingDropdown.remove();
        return;
    }

    const familyService = getFamilyService();
    const family = familyService.getCurrentFamily();
    const member = familyService.getCurrentMember();

    // 创建下拉菜单
    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'family-dropdown-menu';
    dropdownMenu.innerHTML = `
        <div class="dropdown-header">
            <div class="family-info">
                <div class="family-name">${family.family_name}</div>
                <div class="member-info">${member.user_name} (${member.role === 'parent' ? '家长' : '孩子'})</div>
            </div>
        </div>
        <div class="dropdown-divider"></div>
        <div class="dropdown-item" onclick="goToFamilyManagement()">
            <i class="fas fa-users"></i>
            <span>家庭管理</span>
        </div>
        <div class="dropdown-item" onclick="quickLeaveFamily()">
            <i class="fas fa-sign-out-alt"></i>
            <span>退出家庭</span>
        </div>
    `;

    // 定位下拉菜单
    const rect = element.getBoundingClientRect();
    dropdownMenu.style.position = 'fixed';
    dropdownMenu.style.top = (rect.bottom + 5) + 'px';
    dropdownMenu.style.right = (window.innerWidth - rect.right) + 'px';

    document.body.appendChild(dropdownMenu);

    // 点击其他地方关闭下拉菜单
    const closeDropdown = (e) => {
        if (!dropdownMenu.contains(e.target) && !element.contains(e.target)) {
            dropdownMenu.remove();
            document.removeEventListener('click', closeDropdown);
        }
    };

    // 延迟添加事件监听，避免立即触发
    setTimeout(() => {
        document.addEventListener('click', closeDropdown);
    }, 100);
}

/**
 * 快速退出家庭
 */
async function quickLeaveFamily() {
    const familyService = getFamilyService();
    const family = familyService.getCurrentFamily();

    if (!confirm(`确定要退出 "${family.family_name}" 家庭吗？退出后需要重新加入才能访问家庭数据。`)) {
        return;
    }

    try {
        // 显示加载状态
        const familyStatusElement = document.getElementById('familyHeaderStatus');
        if (familyStatusElement) {
            familyStatusElement.classList.add('loading');
        }

        await familyService.leaveFamily();

        // 更新显示
        await updateFamilyStatusDisplay();

        // 重新加载任务（因为家庭ID变了）
        await loadTasksFromCloud();

        showNotification('已成功退出家庭', 'success');

    } catch (error) {
        console.error('❌ 退出家庭失败:', error);
        showNotification('退出家庭失败: ' + error.message, 'error');

        // 恢复显示
        await updateFamilyStatusDisplay();
    }
}

/**
 * 跳转到家庭管理页面
 */
function goToFamilyManagement() {
    window.location.href = 'family-management.html';
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



// 监听家庭状态变化
function setupFamilyEventListenersold() {
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

}
// index.js - 修改 setupFamilyEventListeners 函数
function setupFamilyEventListeners() {
    // 监听家庭创建事件
    window.addEventListener('family:familyCreated', function (event) {
        console.log('家庭创建事件触发', event.detail);
        updateFamilyStatusDisplay();
        loadTasksFromCloud(); // 重新加载任务
    });

    // 监听家庭加入事件
    window.addEventListener('family:familyJoined', function (event) {
        console.log('家庭加入事件触发', event.detail);
        updateFamilyStatusDisplay();
        loadTasksFromCloud(); // 重新加载任务
    });

    // 监听家庭退出事件
    window.addEventListener('family:familyLeft', function (event) {
        console.log('家庭退出事件触发', event.detail);
        updateFamilyStatusDisplay();
        loadTasksFromCloud(); // 重新加载任务

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
}


// 在主页面中的成就系统初始化函数 - 修复版本
async function initializeAchievementSystem() {
    try {
        achievementSystem = new CloudAchievementSystem();
        
        const familyService = getFamilyService();
        
        // 等待家庭服务完全初始化
        if (!familyService.isInitialized) {
            console.log('🔄 家庭服务未初始化，等待...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 手动尝试恢复
            await familyService.restoreFromSessionStorage();
        }
        
        if (!familyService.hasJoinedFamily()) {
            console.warn('用户未加入家庭，成就系统暂不可用');
            return;
        }

        const family = familyService.getCurrentFamily();
        const member = familyService.getCurrentMember();
        
        // 检查必要的ID是否存在
        if (!family || !family.id) {
            console.error('❌ 家庭信息不完整:', family);
            return;
        }
        
        if (!member || !member.id) {
            console.error('❌ 成员信息不完整:', member);
            return;
        }
        
        console.log('🔄 初始化成就系统...', {
            家庭: family.family_name,
            用户: member.user_name,
            家庭ID: family.id,
            用户ID: member.id
        });

        const success = await achievementSystem.initialize(family.id, member.id);
        
        if (success) {
            console.log('✅ 成就系统初始化完成');
            
            // 初始检查一次成就
            setTimeout(async () => {
                try {
                    const unlocked = await achievementSystem.checkAndUnlockAchievements(
                        family.id, 
                        member.id
                    );
                    if (unlocked.length > 0) {
                        console.log(`🎉 初始检查解锁了 ${unlocked.length} 个成就`);
                    }
                } catch (error) {
                    console.error('初始成就检查失败:', error);
                }
            }, 3000);
        } else {
            console.error('❌ 成就系统初始化失败');
        }

    } catch (error) {
        console.error('成就系统初始化失败:', error);
    }
}

// async function checkInitialAchievements() {
//     if (!achievementSystem) return;

//     try {
//         const tasks = await getDataService().getTasks();
//         await achievementSystem.checkAchievements(tasks);
//     } catch (error) {
//         console.error('初始成就检查失败:', error);
//     }
// }

// 在任务完成时检查成就
// 在 index.html 的任务完成函数中
// 在主页面逻辑中添加成就检查
async function checkAchievementsOnTaskCompletion() {
    try {
        const familyService = getFamilyService();
        if (!familyService.hasJoinedFamily()) {
            console.log('未加入家庭，跳过成就检查');
            return;
        }

        const family = familyService.getCurrentFamily();
        const member = familyService.getCurrentMember();
        
        console.log('🔍 任务完成，检查成就...', {
            家庭ID: family.id,
            用户ID: member.id
        });

        if (!achievementSystem) {
                        // 即使没有成就系统，也要更新统计
            setTimeout(updateStats, 1000);
            console.log('成就系统未初始化，跳过检查');
            return;
        }

        const unlocked = await achievementSystem.checkAndUnlockAchievements(
            family.id,
            member.id
        );

        if (unlocked.length > 0) {
            console.log(`🎉 ${member.user_name} 解锁了 ${unlocked.length} 个成就`);
              // 立即更新成就统计
            await updateStats();
            // 如果有新成就解锁，更新成就页面显示
            if (window.updateAchievementsDisplay) {
                window.updateAchievementsDisplay();
            }
        }
    } catch (error) {
        console.error('检查成就失败:', error);
         setTimeout(updateStats, 500);
    }
}