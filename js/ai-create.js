// AI智能对话创建计划功能 - 集成DeepSeek API
console.log('ai-create.js 已加载 - DeepSeek集成版');

let chatHistory = [
    {
        role: 'system',
        content: `你是一个专业的小学生学习计划助手。请根据用户的需求生成合适的学习计划。

用户会描述他们的学习需求，比如：
- 年级（一年级到六年级）
- 学习时间段（早上、下午、晚上）
- 科目偏好（数学、语文、英语、科学、阅读等）
- 特殊要求（重点科目、周末安排等）

请用友好、专业的语气回复，先确认用户需求，然后提供具体的学习计划建议。学习计划要合理考虑小学生的注意力时长，每个任务20-45分钟为宜，总时长不要超过2.5小时。

在回复的最后，请用以下格式总结计划：
【生成计划】
1. 科目 - 任务名称 (时长)
2. 科目 - 任务名称 (时长)
...

总时长: X分钟`
    }
];

let currentAITasks = [];
let isAIThinking = false;

// DeepSeek API 配置
const DEEPSEEK_CONFIG = {
    // 请在这里填入你的 DeepSeek API 密钥
    API_KEY: localStorage.getItem('DEEPSEEK_API_KEY') || '你的_DeepSeek_API_密钥',
    API_URL: 'https://api.deepseek.com/v1/chat/completions',
    MODEL: 'deepseek-chat'
};

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    console.log('AI对话页面初始化 - DeepSeek版本');
    initializeChat();
    checkAPIKey();
});

// 检查API密钥
function checkAPIKey() {
    if (!DEEPSEEK_CONFIG.API_KEY || DEEPSEEK_CONFIG.API_KEY === '你的_DeepSeek_API_密钥') {
        showNotification('请先配置DeepSeek API密钥', 'warning');
        // 可以在这里添加API密钥配置界面
        setTimeout(() => {
            promptAPIKey();
        }, 1000);
    }
}

// 提示输入API密钥
function promptAPIKey() {
    const apiKey = prompt('请输入您的DeepSeek API密钥：');
    if (apiKey) {
        localStorage.setItem('DEEPSEEK_API_KEY', apiKey);
        DEEPSEEK_CONFIG.API_KEY = apiKey;
        showNotification('API密钥已保存', 'success');
    }
}

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
        
        // 支持按Enter发送，Shift+Enter换行
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // 聚焦输入框
        chatInput.focus();
    }
    
    updateSendButton();
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

// 发送消息到DeepSeek
async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message || isAIThinking) return;
    
    // 添加用户消息到界面
    addMessage('user', message);
    chatInput.value = '';
    chatInput.style.height = 'auto';
    updateSendButton();
    
    // 添加到聊天历史
    chatHistory.push({ role: 'user', content: message });
    
    // 显示AI思考状态
    showTypingIndicator();
    
    try {
        // 调用DeepSeek API
        const aiResponse = await callDeepSeekAPI(chatHistory);
        
        // 处理AI回复
        processAIResponse(aiResponse);
        
    } catch (error) {
        console.error('DeepSeek API调用失败:', error);
        handleAPIError(error);
    }
}

// 调用DeepSeek API
async function callDeepSeekAPI(messages) {
    if (!DEEPSEEK_CONFIG.API_KEY || DEEPSEEK_CONFIG.API_KEY === '你的_DeepSeek_API_密钥') {
        throw new Error('请先配置DeepSeek API密钥');
    }
    
    const response = await fetch(DEEPSEEK_CONFIG.API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_CONFIG.API_KEY}`
        },
        body: JSON.stringify({
            model: DEEPSEEK_CONFIG.MODEL,
            messages: messages,
            temperature: 0.7,
            max_tokens: 2000,
            stream: false
        })
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API请求失败: ${response.status} ${errorData.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
}

// 处理AI回复
function processAIResponse(aiResponse) {
    // 移除打字指示器
    removeTypingIndicator();
    
    // 添加AI回复到界面
    addMessage('assistant', aiResponse);
    
    // 添加到聊天历史
    chatHistory.push({ role: 'assistant', content: aiResponse });
    
    // 尝试从回复中提取结构化任务
    const extractedTasks = extractTasksFromResponse(aiResponse);
    
    if (extractedTasks.length > 0) {
        currentAITasks = extractedTasks;
        showActionButtons(extractedTasks.length);
        showNotification(`AI已生成 ${extractedTasks.length} 个学习计划`, 'success');
    } else {
        // 如果没有提取到任务，隐藏操作按钮
        hideActionButtons();
    }
}

// 从AI回复中提取任务信息
function extractTasksFromResponse(response) {
    const tasks = [];
    
    // 方法1: 尝试解析【生成计划】格式
    const planSection = response.match(/【生成计划】([\s\S]*?)(?=总时长:|$)/);
    if (planSection) {
        const planText = planSection[1];
        const taskLines = planText.split('\n').filter(line => 
            line.trim() && /^\d+\./.test(line.trim())
        );
        
        taskLines.forEach(line => {
            const task = parseTaskLine(line);
            if (task) {
                tasks.push(task);
            }
        });
    }
    
    // 方法2: 如果没有找到特定格式，尝试从整个回复中提取
    if (tasks.length === 0) {
        const lines = response.split('\n');
        lines.forEach(line => {
            if (line.includes('分钟') && (line.includes('数学') || line.includes('语文') || 
                line.includes('英语') || line.includes('阅读') || line.includes('科学'))) {
                const task = parseTaskLine(line);
                if (task) {
                    tasks.push(task);
                }
            }
        });
    }
    
    return tasks;
}

// 解析任务行
function parseTaskLine(line) {
    // 移除数字和标点
    const cleanLine = line.replace(/^\d+\.\s*/, '').trim();
    
    // 尝试匹配各种格式
    const patterns = [
        /(.+?)\s*[-—]\s*(.+?)\s*[（(](\d+)[分钟)）]/,
        /(.+?):\s*(.+?)\s*[（(](\d+)[分钟)）]/,
        /(.+?)\s*[-—]\s*(.+?)\s*\((\d+)\s*分钟\)/,
        /(.+?)\s*[-—]\s*(.+?)\s*(\d+)\s*分钟/
    ];
    
    for (const pattern of patterns) {
        const match = cleanLine.match(pattern);
        if (match) {
            return {
                id: Date.now() + Math.random(),
                subject: match[1].trim(),
                name: match[2].trim(),
                duration: parseInt(match[3]) || 30,
                description: `${match[2].trim()} - ${match[1].trim()}学习任务`
            };
        }
    }
    
    // 如果上面的模式都不匹配，尝试简单分割
    if (cleanLine.includes('-')) {
        const parts = cleanLine.split('-');
        if (parts.length >= 2) {
            return {
                id: Date.now() + Math.random(),
                subject: '通用',
                name: parts[1].trim(),
                duration: 30,
                description: parts[1].trim()
            };
        }
    }
    
    return null;
}

// 处理API错误
function handleAPIError(error) {
    removeTypingIndicator();
    
    let errorMessage = 'AI服务暂时不可用，请稍后重试';
    
    if (error.message.includes('API密钥')) {
        errorMessage = '请先配置DeepSeek API密钥';
        promptAPIKey();
    } else if (error.message.includes('401')) {
        errorMessage = 'API密钥无效，请重新配置';
        promptAPIKey();
    } else if (error.message.includes('429')) {
        errorMessage = '请求过于频繁，请稍后重试';
    } else if (error.message.includes('500')) {
        errorMessage = 'AI服务内部错误，请稍后重试';
    }
    
    addMessage('assistant', `抱歉，我遇到了一些问题：${errorMessage}\n\n你可以尝试重新发送消息，或者检查API密钥配置。`);
    showNotification(errorMessage, 'error');
}

// 添加消息到聊天界面
function addMessage(role, content) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatarIcon = role === 'user' ? 'fa-user' : 'fa-robot';
    const avatarClass = role === 'user' ? 'user' : 'assistant';
    
    // 处理换行和基本格式化
    const formattedContent = content.replace(/\n/g, '<br>');
    
    messageDiv.innerHTML = `
        <div class="message-avatar ${avatarClass}">
            <i class="fas ${avatarIcon}"></i>
        </div>
        <div class="message-content">
            <div class="message-text">${formattedContent}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
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

// 显示操作按钮
function showActionButtons(taskCount) {
    const actionsBottom = document.getElementById('aiActionsBottom');
    const planCount = document.getElementById('planCount');
    
    if (actionsBottom && planCount) {
        planCount.textContent = taskCount;
        actionsBottom.style.display = 'flex';
    }
}

// 隐藏操作按钮
function hideActionButtons() {
    const actionsBottom = document.getElementById('aiActionsBottom');
    if (actionsBottom) {
        actionsBottom.style.display = 'none';
    }
}

// 重新生成计划
async function regeneratePlan() {
    const lastUserMessage = chatHistory.filter(msg => msg.role === 'user').pop();
    if (lastUserMessage) {
        // 添加重新生成提示
        addMessage('user', '请重新生成学习计划，可以调整一下科目和时长安排');
        chatHistory.push({ role: 'user', content: '请重新生成学习计划，可以调整一下科目和时长安排' });
        
        showTypingIndicator();
        
        try {
            const aiResponse = await callDeepSeekAPI(chatHistory);
            processAIResponse(aiResponse);
        } catch (error) {
            handleAPIError(error);
        }
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
            
            return {
                id: maxId,
                name: task.name,
                subject: task.subject,
                description: task.description,
                date: getDefaultStartDate(),
                startTime: '19:00',
                endTime: calculateEndTime('19:00', task.duration),
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

// 计算结束时间
function calculateEndTime(startTime, duration) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
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
    hideActionButtons();
    
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