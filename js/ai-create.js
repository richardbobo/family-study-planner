// AI智能对话创建计划功能 - 根据DeepSeek官方文档优化
console.log('ai-create.js 已加载 - 优化版');

let chatHistory = [];
let currentAITasks = [];
let isAIThinking = false;

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    console.log('AI对话页面初始化 - 优化版');
    
    const configCheck = validateConfig();
    if (configCheck.isValid) {
        console.log('✅ 使用模型:', APP_CONFIG.DEEPSEEK.MODEL);
        console.log('🌐 API端点:', APP_CONFIG.DEEPSEEK.BASE_URL + '/chat/completions');
    } else {
        console.error('❌ 配置错误:', configCheck.errors);
        showNotification('AI功能配置异常，请联系管理员', 'error');
    }
    
    initializeChat();
});

// 初始化聊天功能
function initializeChat() {
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');
    
    if (chatInput) {
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            updateSendButton();
        });
        
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
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

// 发送消息到DeepSeek - 根据官方文档优化
async function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message || isAIThinking) return;
    
    // 添加用户消息到界面
    addMessage('user', message);
    chatInput.value = '';
    chatInput.style.height = 'auto';
    updateSendButton();
    
    // 显示AI思考状态
    showTypingIndicator();
    
    try {
        // 调用DeepSeek API - 使用官方推荐的格式
        const aiResponse = await callDeepSeekAPI(message);
        
        // 处理AI回复
        processAIResponse(aiResponse);
        
    } catch (error) {
        console.error('DeepSeek API调用失败:', error);
        handleAPIError(error);
    }
}

// 调用DeepSeek API - 根据官方文档完全重写
async function callDeepSeekAPI(userMessage) {
    const config = APP_CONFIG.DEEPSEEK;
    const behavior = APP_CONFIG.AI_BEHAVIOR;
    
    // 验证配置
    if (!config.API_KEY || config.API_KEY === '你的_DeepSeek_API_密钥') {
        throw new Error('未配置有效的API密钥');
    }
    
    if (!config.BASE_URL) {
        throw new Error('API基础URL未配置');
    }
    
    const apiUrl = `${config.BASE_URL}/chat/completions`;
    
    console.log('🚀 调用DeepSeek API:', {
        url: apiUrl,
        model: config.MODEL,
        stream: behavior.STREAM
    });
    
    const requestBody = {
        model: config.MODEL,
        messages: [
            {
                role: "system",
                content: behavior.SYSTEM_PROMPT
            },
            {
                role: "user", 
                content: userMessage
            }
        ],
        temperature: behavior.TEMPERATURE,
        max_tokens: behavior.MAX_TOKENS,
        stream: behavior.STREAM,
        top_p: behavior.TOP_P
    };
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.API_KEY}`
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.error?.message || errorMessage;
        } catch (e) {
            // 忽略JSON解析错误
        }
        throw new Error(`API请求失败: ${errorMessage}`);
    }
    
    const data = await response.json();
    
    // 验证响应格式
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('API响应格式异常');
    }
    
    return data.choices[0].message.content;
}

// 处理AI回复 - 优化JSON解析
function processAIResponse(aiResponse) {
    removeTypingIndicator();
    
    try {
        // 首先尝试直接解析JSON
        const parsedResponse = JSON.parse(aiResponse);
        
        if (parsedResponse.tasks && Array.isArray(parsedResponse.tasks)) {
            // 成功解析JSON格式
            currentAITasks = parsedResponse.tasks.map((task, index) => ({
                id: Date.now() + index,
                subject: task.subject || '通用',
                name: task.name || `${task.subject}学习任务`,
                description: task.description || '',
                duration: task.duration || 30,
                suggestedTime: task.suggestedTime || '19:00-19:30'
            }));
            
            // 构建用户友好的显示消息
            let displayMessage = `🎯 已为你生成 ${currentAITasks.length} 个学习计划：\n\n`;
            currentAITasks.forEach((task, index) => {
                displayMessage += `${index + 1}. **${task.subject}** - ${task.name} (${task.duration}分钟)\n`;
            });
            displayMessage += `\n📊 总时长: ${parsedResponse.totalDuration || currentAITasks.reduce((sum, task) => sum + task.duration, 0)}分钟`;
            if (parsedResponse.summary) {
                displayMessage += `\n\n${parsedResponse.summary}`;
            }
            
            addMessage('assistant', displayMessage);
            showActionButtons(currentAITasks.length);
            showNotification(`成功生成 ${currentAITasks.length} 个学习计划`, 'success');
            
        } else {
            throw new Error('JSON格式不符合预期');
        }
        
    } catch (jsonError) {
        console.log('JSON解析失败，使用文本回复:', jsonError);
        
        // JSON解析失败，使用原始文本回复
        addMessage('assistant', aiResponse);
        
        // 仍然尝试从文本中提取任务
        const extractedTasks = extractTasksFromResponse(aiResponse);
        if (extractedTasks.length > 0) {
            currentAITasks = extractedTasks;
            showActionButtons(extractedTasks.length);
            showNotification(`从回复中识别出 ${extractedTasks.length} 个学习计划`, 'info');
        } else {
            hideActionButtons();
            showNotification('AI已回复，但未识别出结构化计划', 'info');
        }
    }
}

// 从文本回复中提取任务信息
function extractTasksFromResponse(response) {
    const tasks = [];
    
    // 多种模式尝试匹配任务
    const patterns = [
        // 模式1: 数字. 科目 - 任务名称 (时长分钟)
        /\d+\.\s*([^—]+?)\s*[—\-]\s*([^(]+?)\s*[（(](\d+)\s*分钟[）)]/g,
        // 模式2: **科目** - 任务描述
        /\*\*([^*]+)\*\*\s*[—\-]\s*([^\n]+)/g,
        // 模式3: 科目: 任务描述 (时长)
        /([^:：]+)[:：]\s*([^(]+?)\s*[（(](\d+)\s*分钟[）)]/g
    ];
    
    for (const pattern of patterns) {
        const matches = response.matchAll(pattern);
        for (const match of matches) {
            const subject = match[1].trim();
            const name = match[2].trim();
            const duration = match[3] ? parseInt(match[3]) : 30;
            
            if (subject && name) {
                tasks.push({
                    id: Date.now() + tasks.length,
                    subject: subject,
                    name: name,
                    duration: duration,
                    description: `${name} - ${subject}学习任务`,
                    suggestedTime: '19:00-19:30'
                });
            }
        }
        
        if (tasks.length > 0) break; // 找到任务就停止
    }
    
    return tasks;
}

// 其他函数保持不变（错误处理、UI交互等）
// [handleAPIError, addMessage, showTypingIndicator, removeTypingIndicator, 
//  showActionButtons, hideActionButtons, regeneratePlan, confirmAIPlan 等函数]
// ... 保持原有代码不变

// 处理API错误
function handleAPIError(error) {
    removeTypingIndicator();
    
    let errorMessage = 'AI服务暂时不可用，请稍后重试';
    let userMessage = `抱歉，我遇到了一些技术问题：${errorMessage}`;
    
    if (error.message.includes('API密钥')) {
        errorMessage = 'API密钥配置错误，请联系管理员';
        userMessage = `配置错误：${errorMessage}`;
    } else if (error.message.includes('401')) {
        errorMessage = 'API密钥无效，请联系管理员';
        userMessage = `认证失败：${errorMessage}`;
    } else if (error.message.includes('429')) {
        errorMessage = '请求过于频繁，请稍后重试';
        userMessage = `请求限制：${errorMessage}`;
    } else if (error.message.includes('500')) {
        errorMessage = 'AI服务内部错误，请稍后重试';
        userMessage = `服务异常：${errorMessage}`;
    }
    
    addMessage('assistant', userMessage);
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
            const aiResponse = await callDeepSeekAPI('请重新生成学习计划，可以调整一下科目和时长安排');
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
            
            // 解析时间安排
            const [startTime, endTime] = parseSuggestedTime(task.suggestedTime);
            
            return {
                id: maxId,
                name: task.name,
                subject: task.subject,
                description: task.description,
                date: getDefaultStartDate(),
                startTime: startTime,
                endTime: endTime,
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

// 解析建议时间段
function parseSuggestedTime(suggestedTime) {
    if (suggestedTime && suggestedTime.includes('-')) {
        const times = suggestedTime.split('-');
        if (times.length === 2) {
            return [times[0].trim(), times[1].trim()];
        }
    }
    return ['19:00', '19:30']; // 默认时间
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