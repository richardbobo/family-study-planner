// 系统配置文件 - 根据DeepSeek官方文档更新
const APP_CONFIG = {
    // DeepSeek API 配置 - 根据官方文档调整
    DEEPSEEK: {
        API_KEY: 'sk-51abb4701e1646a8a99f13a4edc4441f', // 在这里设置你的API密钥
        BASE_URL: 'https://api.deepseek.com/v1', // 使用官方推荐的base_url
        MODEL: 'deepseek-chat', // 使用最新的模型
        TIMEOUT: 30000
    },
    
    // 应用设置
    APP: {
        NAME: '小学生学习计划管理系统',
        VERSION: '1.0.0',
        DEFAULT_DURATION: 30
    },
    
    // AI 行为配置
    AI_BEHAVIOR: {
        // 系统提示词 - 根据官方格式优化
        SYSTEM_PROMPT: `你是一个专业的小学生学习计划助手。请根据用户的需求生成合适的学习计划。

用户会描述他们的学习需求，比如：
- 年级（一年级到六年级）
- 学习时间段（早上、下午、晚上）
- 科目偏好（数学、语文、英语、科学、阅读等）
- 特殊要求（重点科目、周末安排等）

请严格按照以下JSON格式返回学习计划，不要包含其他任何文字：
{
    "tasks": [
        {
            "subject": "科目名称",
            "name": "具体任务名称", 
            "description": "任务详细描述",
            "duration": 分钟数,
            "suggestedTime": "建议时间段"
        }
    ],
    "summary": "整体安排说明",
    "totalDuration": 总分钟数
}

要求：
1. 每个任务时长20-60分钟
2. 总时长不超过3小时
3. 任务安排合理，考虑小学生注意力
4. 科目间有适当休息时间
5. 任务名称具体明确`,

        // API参数配置
        TEMPERATURE: 0.7,
        MAX_TOKENS: 2000,
        STREAM: false, // 非流式输出，更稳定
        TOP_P: 0.9
    },
    
    // 科目配置
    SUBJECTS: {
        PRIMARY: ['数学', '语文', '英语', '科学', '阅读', '美术', '音乐', '体育'],
        COLORS: {
            '数学': '#4ecdc4',
            '语文': '#ff6b6b', 
            '英语': '#45b7d1',
            '科学': '#96ceb4',
            '阅读': '#ff9f43',
            '美术': '#00d2d3',
            '音乐': '#ff9f43',
            '体育': '#10ac84'
        }
    }
};

// 配置验证
function validateConfig() {
    const errors = [];
    
    if (!APP_CONFIG.DEEPSEEK.API_KEY || APP_CONFIG.DEEPSEEK.API_KEY === '你的_DeepSeek_API_密钥') {
        console.error('❌ 请在 config.js 中配置有效的 DeepSeek API 密钥');
        errors.push('API密钥未配置');
        return {
            isValid: false,
            errors: errors
        };
    }
    
    if (!APP_CONFIG.DEEPSEEK.BASE_URL) {
        console.error('❌ API基础URL未配置');
        errors.push('API基础URL未配置');
    }
    
    if (!APP_CONFIG.AI_BEHAVIOR.SYSTEM_PROMPT) {
        console.error('❌ 系统提示词未配置');
        errors.push('系统提示词未配置');
    }
    
    if (errors.length === 0) {
        console.log('✅ 配置验证通过');
        console.log('📝 使用模型:', APP_CONFIG.DEEPSEEK.MODEL);
        console.log('🌐 API地址:', APP_CONFIG.DEEPSEEK.BASE_URL);
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// 初始化时验证配置
validateConfig();