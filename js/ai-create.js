// AI智能对话创建计划功能
console.log('ai-create.js 已加载');

let chatHistory = [];
let currentAITasks = [];
let isAIThinking = false;

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    console.log('AI对话页面初始化');
    initializeChat();
});

// 初始化聊天功能
function initializeChat() {
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');
    
    // 输入框自动调整高度
    if (chatInput) {
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            updateSendButton();
        });
        
        // 支持按Enter发送，Ctrl+Enter换行
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
}

// 更新发送按钮状态
function updateSendButton() {
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');
    
    if (chatInput && sendButton) {
        const hasText = chatInput.value.trim().length > 0;
        sendButton.disabled = !hasText || isAIThinking;
    }
}

// 发送消息
function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message || isAIThinking) return;
    
    // 添加用户消息
    addMessage('user', message);
    chatInput.value = '';
    chatInput.style.height = 'auto';
    updateSendButton();
    
    // 显示AI思考状态
    showTypingIndicator();
    
    // 模拟AI处理
    setTimeout(() => {
        processAIMessage(message);
    }, 1500);
}

// 添加消息到聊天界面
function addMessage(role, content) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    // 移除打字指示器
    removeTypingIndicator();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatarIcon = role === 'user' ? 'fa-user' : 'fa-robot';
    const avatarClass = role === 'user' ? 'user' : 'assistant';
    
    messageDiv.innerHTML = `
        <div class="message-avatar ${avatarClass}">
            <i class="fas ${avatarIcon}"></i>
        </div>
        <div class="message-content">
            <div class="message-text">${content}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // 保存到历史
    chatHistory.push({ role, content });
}

// 显示打字指示器
function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.id = 'typingIndicator';
    
    typingDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    isAIThinking = true;
    updateSendButton();
}

// 移除打字指示器
function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
    isAIThinking = false;
    updateSendButton();
}

// 处理AI消息
function processAIMessage(userMessage) {
    try {
        // 解析用户需求
        const userRequirements = parseUserRequirements(userMessage);
        
        // 生成学习计划
        const generatedTasks = generateLearningPlan(userRequirements);
        currentAITasks = generatedTasks;
        
        // 构建AI回复
        const aiResponse = buildAIResponse(generatedTasks, userRequirements);
        
        // 添加AI回复
        addMessage('assistant', aiResponse);
        
        // 显示操作按钮
        showActionButtons(generatedTasks.length);
        
    } catch (error) {
        console.error('AI处理失败:', error);
        addMessage('assistant', '抱歉，我遇到了一些问题。请重新描述你的学习需求，我会再试一次。');
    }
}

// 解析用户需求
function parseUserRequirements(message) {
    const requirements = {
        grade: '通用',
        subjects: [],
        timeRange: '晚上',
        duration: 120, // 默认2小时
        specialRequirements: []
    };
    
    // 年级检测
    if (message.includes('一年级')) requirements.grade = '一年级';
    else if (message.includes('二年级')) requirements.grade = '二年级';
    else if (message.includes('三年级')) requirements.grade = '三年级';
    else if (message.includes('四年级')) requirements.grade = '四年级';
    else if (message.includes('五年级')) requirements.grade = '五年级';
    else if (message.includes('六年级')) requirements.grade = '六年级';
    
    // 科目检测
    if (message.includes('数学') || message.includes('算术')) requirements.subjects.push('数学');
    if (message.includes('语文') || message.includes('中文')) requirements.subjects.push('语文');
    if (message.includes('英语') || message.includes('英文')) requirements.subjects.push('英语');
    if (message.includes('科学')) requirements.subjects.push('科学');
    if (message.includes('阅读') || message.includes('读书')) requirements.subjects.push('阅读');
    if (message.includes('美术') || message.includes('画画')) requirements.subjects.push('美术');
    if (message.includes('音乐')) requirements.subjects.push('音乐');
    if (message.includes('体育') || message.includes('运动')) requirements.subjects.push('体育');
    
    // 如果没有指定科目，使用默认科目
    if (requirements.subjects.length === 0) {
        requirements.subjects = ['数学', '语文', '英语', '阅读'];
    }
    
    // 时间检测
    if (message.includes('早上') || message.includes('早晨')) requirements.timeRange = '早上';
    else if (message.includes('下午')) requirements.timeRange = '下午';
    else if (message.includes('晚上') || message.includes('晚间')) requirements.timeRange = '晚上';
    
    // 时间段检测
    if (message.includes('7点') && message.includes('9点')) {
        requirements.timeRange = '晚上7点-9点';
        requirements.duration = 120;
    } else if (message.includes('1小时')) {
        requirements.duration = 60;
    }
    
    // 特殊要求
    if (message.includes('周末')) requirements.specialRequirements.push('周末');
    if (message.includes('工作日') || message.includes('周一至周五')) {
        requirements.specialRequirements.push('工作日');
    }
    if (message.includes('重点') || message.includes('加强')) {
        requirements.specialRequirements.push('重点学习');
    }
    
    return requirements;
}

// 生成学习计划
function generateLearningPlan(requirements) {
    const tasks = [];
    const totalDuration = requirements.duration;
    const subjectCount = requirements.subjects.length;
    const baseDuration = Math.floor(totalDuration / subjectCount);
    
    requirements.subjects.forEach((subject, index) => {
        // 为每个科目分配时间（最后一个科目可能时间稍长）
        const duration = index === subjectCount - 1 ? 
            totalDuration - (baseDuration * (subjectCount - 1)) : baseDuration;
        
        const task = createTaskForSubject(subject, duration, requirements);
        tasks.push(task);
    });
    
    return tasks;
}

// 为科目创建任务
function createTaskForSubject(subject, duration, requirements) {
    const taskTemplates = {
        '数学': [
            `完成${requirements.grade}数学练习册`,
            `数学应用题训练`,
            `口算和心算练习`,
            `几何图形学习`
        ],
        '语文': [
            `${requirements.grade}语文课文预习`,
            `生字词学习和默写`,
            `阅读理解练习`,
            `作文写作训练`
        ],
        '英语': [
            `英语单词记忆和拼写`,
            `英语听力练习`,
            `口语对话训练`,
            `英语阅读理解`
        ],
        '阅读': [
            `课外阅读时间`,
            `名著阅读和分享`,
            `阅读理解训练`,
            `读书笔记撰写`
        ],
        '科学': [
            `科学实验观察`,
            `自然科学知识学习`,
            `科学小制作`,
            `科学探索活动`
        ],
        '美术': [
            `绘画技巧练习`,
            `手工制作活动`,
            `艺术欣赏学习`,
            `创意美术作品`
        ],
        '音乐': [
            `音乐基础知识学习`,
            `乐器练习`,
            `歌曲演唱练习`,
            `音乐欣赏`
        ],
        '体育': [
            `基础体能训练`,
            `运动技能练习`,
            `体育游戏活动`,
            `健康知识学习`
        ]
    };
    
    const descriptions = {
        '数学': '巩固数学基础，提高计算能力',
        '语文': '提升阅读理解能力和写作水平',
        '英语': '加强英语听说读写综合能力',
        '阅读': '培养阅读习惯，扩展知识面',
        '科学': '探索科学世界，培养科学思维',
        '美术': '发展艺术创造力，提高审美能力',
        '音乐': '培养音乐素养，享受艺术之美',
        '体育': '增强体质，培养运动习惯'
    };
    
    const templates = taskTemplates[subject] || [`${subject}学习任务`];
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    return {
        id: Date.now() + Math.random(),
        name: randomTemplate,
        subject: subject,
        description: descriptions[subject] || `${subject}科目学习`,
        duration: duration,
        time: `${requirements.timeRange}`,
        grade: requirements.grade
    };
}

// 构建AI回复
function buildAIResponse(tasks, requirements) {
    let response = `太棒了！我根据你的需求为你生成了 ${tasks.length} 个学习计划：\n\n`;
    
    tasks.forEach((task, index) => {
        response += `${index + 1}. **${task.subject}** - ${task.name}\n`;
        response += `   ${task.description}\n\n`;
    });
    
    response += `📚 **安排说明**：\n`;
    response += `• 适合${requirements.grade}学生\n`;
    response += `• 学习时段：${requirements.timeRange}\n`;
    response += `• 总时长：${requirements.duration}分钟\n`;
    
    if (requirements.specialRequirements.length > 0) {
        response += `• 特别安排：${requirements.specialRequirements.join('、')}\n`;
    }
    
    response += `\n你可以点击"确认创建"来保存这些计划，或者"重新生成"来调整安排。`;
    
    return response;
}

// 显示操作按钮
function showActionButtons(taskCount) {
    const actionsBottom = document.getElementById('aiActionsBottom');
    const planCount = document.getElementById('planCount');
    
    if (actionsBottom && planCount) {
        planCount.textContent = taskCount;
        actionsBottom.style.display = 'flex';
    }
}

// 重新生成计划
function regeneratePlan() {
    const lastUserMessage = chatHistory.filter(msg => msg.role === 'user').pop();
    if (lastUserMessage) {
        // 显示重新生成提示
        addMessage('user', '请重新生成学习计划');
        showTypingIndicator();
        
        setTimeout(() => {
            processAIMessage(lastUserMessage.content);
        }, 1500);
    }
}

// 确认创建AI计划
function confirmAIPlan() {
    if (currentAITasks.length === 0) {
        showNotification('没有可保存的学习计划', 'warning');
        return;
    }
    
    try {
        // 获取现有任务
        const existingTasks = JSON.parse(localStorage.getItem('studyTasks') || '[]');
        let maxId = existingTasks.length > 0 ? Math.max(...existingTasks.map(t => t.id)) : 0;
        
        // 转换AI任务为标准格式
        const newTasks = currentAITasks.map(task => {
            maxId++;
            
            // 解析时间安排
            const timeSlots = allocateTimeSlots(currentAITasks);
            const taskTime = timeSlots.find(slot => slot.subject === task.subject);
            
            return {
                id: maxId,
                name: task.name,
                subject: task.subject,
                description: task.description,
                date: getDefaultStartDate(),
                startTime: taskTime ? taskTime.startTime : '19:00',
                endTime: taskTime ? taskTime.endTime : '20:00',
                time: task.duration,
                points: calculatePoints(task.duration),
                completed: false,
                repeatType: 'daily',
                useCustomPoints: false,
                customPoints: 0,
                pointsBreakdown: {
                    basePoints: 10,
                    timeBonus: Math.floor(task.duration / 10),
                    earlyBonus: 0,
                    weekendBonus: 0
                }
            };
        });
        
        // 合并任务并保存
        const allTasks = [...existingTasks, ...newTasks];
        localStorage.setItem('studyTasks', JSON.stringify(allTasks));
        
        // 显示成功消息
        showSuccessMessage();
        
    } catch (error) {
        console.error('保存AI任务失败:', error);
        showNotification('保存失败，请重试', 'error');
    }
}

// 分配时间段
function allocateTimeSlots(tasks) {
    const slots = [];
    let currentTime = '19:00';
    
    tasks.forEach(task => {
        const startTime = currentTime;
        const endTime = addMinutesToTime(currentTime, task.duration);
        
        slots.push({
            subject: task.subject,
            startTime: startTime,
            endTime: endTime
        });
        
        currentTime = endTime;
    });
    
    return slots;
}

// 时间计算辅助函数
function addMinutesToTime(time, minutes) {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMinutes = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
}

// 显示成功消息
function showSuccessMessage() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        成功创建了 ${currentAITasks.length} 个学习计划！已保存到你的学习计划中。
    `;
    
    chatMessages.appendChild(successDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // 隐藏操作按钮
    const actionsBottom = document.getElementById('aiActionsBottom');
    if (actionsBottom) {
        actionsBottom.style.display = 'none';
    }
    
    // 延迟返回主页
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 2000);
}

// 填充示例
function fillExample(index) {
    const examples = [
        "请生成一份晚上7点到9点之间，包含英语、语文、数学及阅读的学习计划，小学5年级",
        "帮我制定周一至周五晚上7-9点的学习安排，重点英语和科学，小学三年级",
        "需要每天1小时的阅读计划，适合四年级学生，包含语文和英语阅读"
    ];
    
    if (index >= 0 && index < examples.length) {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.value = examples[index];
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
            updateSendButton();
        }
    }
}

// 辅助函数
function getDefaultStartDate() {
    return new Date().toISOString().split('T')[0];
}

function calculatePoints(duration) {
    const basePoints = 10;
    const timeBonus = Math.floor(duration / 10);
    return basePoints + timeBonus;
}

// 返回主页
function goBack() {
    window.location.href = 'index.html';
}

// 显示通知
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