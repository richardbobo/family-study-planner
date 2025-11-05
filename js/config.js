// 系统配置文件 - 完整合并版本
const APP_CONFIG = {
    // 功能开关 - 控制新功能逐步上线
    FEATURE_FLAGS: {
        // 数据源配置: 'localStorage' | 'supabase' | 'hybrid'
        DATA_SOURCE: 'localStorage',

        // 家庭功能开关
        ENABLE_FAMILY_FEATURES: false,

        // 数据同步开关
        ENABLE_SYNC: false,

        // 显示同步状态
        SHOW_SYNC_STATUS: false,

        // 启用冲突检测
        ENABLE_CONFLICT_DETECTION: false
    },

    // Supabase 配置
    SUPABASE: {
        // 这些配置需要你在Supabase创建项目后填写
        URL: 'https://wentgqfihbifkxpinqyh.supabase.co',
        ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlbnRncWZpaGJpZmt4cGlucXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNDUwMzksImV4cCI6MjA3NzcyMTAzOX0.lf-CUkvv6po8dB8tq_w0czQFCxKahxnljyiwB11T7KU',

        // 表名配置
        TABLES: {
            FAMILIES: 'families',
            FAMILY_MEMBERS: 'family_members',
            STUDY_TASKS: 'study_tasks',
            COMPLETION_RECORDS: 'completion_records'
        }
    },

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
    },
    // 功能开关 - 添加同步相关开关
    FEATURE_FLAGS: {
        DATA_SOURCE: 'localStorage',
        ENABLE_FAMILY_FEATURES: false,
        ENABLE_SYNC: false,           // 同步功能总开关
        SHOW_SYNC_STATUS: false,      // 同步状态显示
        ENABLE_CONFLICT_DETECTION: false
    },

    // 新增同步配置
    SYNC_CONFIG: {
        // 同步间隔（毫秒）
        SYNC_INTERVAL: 30000,         // 30秒
        MAX_RETRY_ATTEMPTS: 3,        // 最大重试次数
        RETRY_DELAY: 1000,            // 重试延迟
        CONFLICT_RESOLUTION: 'timestamp', // 冲突解决策略
        QUEUE_SIZE_LIMIT: 100,        // 队列大小限制
        AUTO_SYNC: true               // 自动同步
    },

    // 应用常量
    CONSTANTS: {
        // 数据版本，用于迁移
        DATA_VERSION: '1.0.0',

        // 同步间隔（毫秒）
        SYNC_INTERVAL: 30000,

        // 重试配置
        MAX_RETRY_ATTEMPTS: 3,
        RETRY_DELAY: 1000,

        // 本地存储键名
        STORAGE_KEYS: {
            TASKS: 'studyTasks',
            FAMILY_INFO: 'familyInfo',
            SYNC_STATUS: 'syncStatus',
            LAST_SYNC: 'lastSyncTime'
        }
    },

    // 默认值
    DEFAULTS: {
        TASK_DURATION: 30,
        TASK_POINTS: 10,
        START_TIME: '19:00',
        END_TIME: '20:00'
    }
};

// 统一的配置验证函数
function validateConfig() {
    const errors = [];
    const warnings = [];

    // === 检查 Supabase 配置 ===
    if (APP_CONFIG.SUPABASE.URL.includes('your-project') ||
        APP_CONFIG.SUPABASE.ANON_KEY.includes('your-anon-key')) {
        warnings.push('Supabase配置未完成，家庭功能将不可用');
    }

    // 检查功能开关合理性
    if (APP_CONFIG.FEATURE_FLAGS.DATA_SOURCE === 'supabase' &&
        (APP_CONFIG.SUPABASE.URL.includes('your-project') || !APP_CONFIG.SUPABASE.URL)) {
        errors.push('配置冲突：已启用Supabase数据源但未配置Supabase连接');
    }

    if (APP_CONFIG.FEATURE_FLAGS.ENABLE_FAMILY_FEATURES &&
        (APP_CONFIG.SUPABASE.URL.includes('your-project') || !APP_CONFIG.SUPABASE.URL)) {
        errors.push('配置冲突：已启用家庭功能但未配置Supabase连接');
    }

    // === 检查 DeepSeek AI 配置 ===
    if (!APP_CONFIG.DEEPSEEK.API_KEY || APP_CONFIG.DEEPSEEK.API_KEY === '你的_DeepSeek_API_密钥') {
        warnings.push('DeepSeek API密钥未配置，AI功能可能受限');
    }

    if (!APP_CONFIG.DEEPSEEK.BASE_URL) {
        warnings.push('DeepSeek API基础URL未配置');
    }

    if (!APP_CONFIG.AI_BEHAVIOR.SYSTEM_PROMPT) {
        warnings.push('AI系统提示词未配置');
    }

    // === 检查应用基础配置 ===
    if (!APP_CONFIG.APP.NAME) {
        warnings.push('应用名称未配置');
    }

    if (!APP_CONFIG.CONSTANTS.DATA_VERSION) {
        warnings.push('数据版本未配置');
    }

    // 验证结果
    if (errors.length === 0 && warnings.length === 0) {
        console.log('✅ 配置验证通过');
        console.log('📝 当前数据源:', APP_CONFIG.FEATURE_FLAGS.DATA_SOURCE);
        console.log('🏠 家庭功能:', APP_CONFIG.FEATURE_FLAGS.ENABLE_FAMILY_FEATURES ? '启用' : '禁用');
        console.log('🤖 AI功能:', APP_CONFIG.DEEPSEEK.API_KEY ? '已配置' : '未配置');
        console.log('🌐 Supabase:', APP_CONFIG.SUPABASE.URL ? '已配置' : '未配置');
    } else {
        if (errors.length > 0) {
            console.error('❌ 配置错误:', errors);
        }
        if (warnings.length > 0) {
            console.warn('⚠️ 配置警告:', warnings);
        }
    }

    return {
        isValid: errors.length === 0,
        errors: errors,
        warnings: warnings
    };
}

// 配置更新函数
function updateFeatureFlag(flag, value) {
    if (flag in APP_CONFIG.FEATURE_FLAGS) {
        APP_CONFIG.FEATURE_FLAGS[flag] = value;
        console.log(`功能开关更新: ${flag} = ${value}`);

        // 触发配置变更事件
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('configChanged', {
                detail: { flag, value }
            }));
        }
    } else {
        console.warn(`未知的功能开关: ${flag}`);
    }
}

// 获取当前数据源
function getCurrentDataSource() {
    return APP_CONFIG.FEATURE_FLAGS.DATA_SOURCE;
}

// 添加加载状态标记
window.CONFIG_LOADED = false;

// 初始化配置检查
document.addEventListener('DOMContentLoaded', function () {
    const configCheck = validateConfig();

    if (configCheck.errors.length > 0) {
        console.error('❌ 配置错误:', configCheck.errors);
        if (typeof showNotification === 'function') {
            showNotification('系统配置异常，请联系管理员', 'error');
        }
    }

    if (configCheck.warnings.length > 0) {
        console.warn('⚠️ 配置警告:', configCheck.warnings);
        // 可以选择性地显示警告通知
        // if (typeof showNotification === 'function') {
        //     showNotification(configCheck.warnings.join('; '), 'warning');
        // }
    }

    if (configCheck.isValid && configCheck.warnings.length === 0) {
        console.log('✅ 所有配置检查通过');
    }
});

// 标记配置加载完成
window.CONFIG_LOADED = true;
console.log('✅ config.js 加载完成');

// 配置检查函数
window.checkConfigLoaded = function () {
    if (!window.CONFIG_LOADED) {
        console.error('❌ config.js 未正确加载');
        return false;
    }
    if (typeof APP_CONFIG === 'undefined') {
        console.error('❌ APP_CONFIG 未定义');
        return false;
    }
    return true;
};

// 导出配置（用于模块化）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { APP_CONFIG, validateConfig, updateFeatureFlag, getCurrentDataSource };
}