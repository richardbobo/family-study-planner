// AI智能对话创建计划功能 - 家庭绑定云端版本
console.log('ai-create.js 已加载 - 家庭绑定云端版');

let chatHistory = [];
let currentAITasks = [];
let isAIThinking = false;

// 初始化页面
document.addEventListener('DOMContentLoaded', function () {
    console.log('AI对话页面初始化 - 家庭绑定云端版');

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
        chatInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            updateSendButton();
        });

        chatInput.addEventListener('keydown', function (e) {
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

    // 显示AI思考状态
    showTypingIndicator();

    try {
        // 调用DeepSeek API
        const aiResponse = await callDeepSeekAPI(message);

        // 处理AI回复
        processAIResponse(aiResponse);

    } catch (error) {
        console.error('DeepSeek API调用失败:', error);
        handleAPIError(error);
    }
}

// 调用DeepSeek API
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

// 处理AI回复
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

// 确认创建AI计划 - 修改为保存到云端并与家庭绑定
// 修改 confirmAIPlan 函数和相关服务获取方法
async function confirmAIPlan() {
    if (currentAITasks.length === 0) {
        showNotification('没有可保存的学习计划', 'warning');
        return;
    }
    
    try {
        // 获取数据服务 - 增强错误处理
        const dataService = await getDataService();
        if (!dataService) {
            throw new Error('数据服务不可用，请确保已登录并刷新页面');
        }

        console.log('🔧 数据服务状态:', dataService ? '可用' : '不可用');

        // 获取当前用户
        const user = dataService.getCurrentUser ? dataService.getCurrentUser() : null;
        if (!user) {
            throw new Error('用户未登录，请重新登录系统');
        }

        console.log('👤 当前用户:', user);

        // 获取家庭ID
        let familyId = user.family_id;
        
        // 如果没有家庭ID，尝试获取默认家庭
        if (!familyId) {
            console.log('🔍 用户未关联家庭，尝试获取家庭列表...');
            const familyService = await getFamilyService();
            if (familyService && familyService.getUserFamilies) {
                try {
                    const families = await familyService.getUserFamilies(user.id);
                    console.log('🏠 用户家庭列表:', families);
                    if (families && families.length > 0) {
                        familyId = families[0].id;
                        console.log('✅ 使用家庭ID:', familyId);
                    }
                } catch (familyError) {
                    console.warn('获取家庭列表失败:', familyError);
                    // 家庭服务失败不影响任务保存
                }
            }
        }

        console.log('📝 保存AI任务到云端，家庭ID:', familyId);

        // 转换并保存任务
        const savedTasks = [];
        let successCount = 0;
        
        for (const aiTask of currentAITasks) {
            try {
                const [startTime, endTime] = parseSuggestedTime(aiTask.suggestedTime);
                
                const taskData = {
                    name: aiTask.name,
                    subject: aiTask.subject,
                    description: aiTask.description || `${aiTask.name} - ${aiTask.subject}学习任务`,
                    date: getDefaultStartDate(),
                    start_time: startTime,
                    end_time: endTime,
                    duration: aiTask.duration,
                    points: calculatePoints(aiTask.duration),
                    completed: false,
                    repeat_type: 'daily',
                    use_custom_points: false,
                    custom_points: 0,
                    points_breakdown: {
                        base_points: 10,
                        time_bonus: Math.floor(aiTask.duration / 10),
                        early_bonus: 0,
                        weekend_bonus: 0
                    },
                    user_id: user.id,
                    family_id: familyId,
                    created_by: user.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                console.log('💾 保存任务数据:', taskData);

                // 保存到云端
                const savedTask = await dataService.createTask(taskData);
                if (savedTask) {
                    savedTasks.push(savedTask);
                    successCount++;
                    console.log('✅ 任务保存成功:', savedTask.name);
                } else {
                    console.warn('❌ 任务保存返回空结果:', aiTask.name);
                }
                
            } catch (taskError) {
                console.error(`保存任务失败 "${aiTask.name}":`, taskError);
                // 单个任务失败不影响其他任务
            }
        }

        if (successCount === 0) {
            throw new Error('所有任务保存失败，请检查网络连接');
        }

        // 显示成功消息
        showSuccessMessage(successCount, familyId);
        
    } catch (error) {
        console.error('保存AI任务失败:', error);
        
        let errorMessage = '保存失败，请重试';
        if (error.message.includes('未登录')) {
            errorMessage = '用户未登录，请重新登录系统';
        } else if (error.message.includes('数据服务不可用')) {
            errorMessage = '系统服务未就绪，请刷新页面重试';
        } else if (error.message.includes('所有任务保存失败')) {
            errorMessage = '任务保存失败，请检查网络连接';
        }
        
        showNotification(errorMessage, 'error');
        
        // 在开发模式下显示详细错误
        if (APP_CONFIG.ENV === 'development') {
            addMessage('assistant', `技术细节: ${error.message}`);
        }
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

// 显示成功消息 - 修改为显示家庭绑定信息
function showSuccessMessage(savedCount, familyId) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const familyInfo = familyId ?
        `已自动关联到您的家庭（ID: ${familyId}）` :
        '已保存为个人任务';

    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <div>
            <strong>成功创建了 ${savedCount} 个学习计划！</strong><br>
            <small>${familyInfo}，所有家庭成员都可以看到这些任务。</small>
        </div>
    `;

    chatMessages.appendChild(successDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // 隐藏操作按钮
    hideActionButtons();

    // 延迟返回主页
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 3000);
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

// 获取数据服务 - 与主应用保持一致
function getDataService() {
    if (typeof getTaskManager !== 'undefined') {
        const taskManager = getTaskManager();
        return taskManager ? taskManager.getDataService() : null;
    }
    return null;
}

// 获取家庭服务 - 与主应用保持一致
function getFamilyService() {
    if (typeof getTaskManager !== 'undefined') {
        const taskManager = getTaskManager();
        return taskManager ? taskManager.getFamilyService() : null;
    }
    return null;
}