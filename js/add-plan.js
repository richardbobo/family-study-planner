// 添加学习计划页面逻辑
console.log('add-plan.js 已加载');

let customCategories = JSON.parse(localStorage.getItem('customCategories') || '[]');
let recentCategories = JSON.parse(localStorage.getItem('recentCategories') || '[]');

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    console.log('添加计划页面DOM已加载');
    initializePage();
    initializeCategoryFeatures();
});

// 初始化页面
function initializePage() {
    // 设置当前日期
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    document.querySelector('.date-highlight').textContent = today;
    
    // 初始化表单事件
    initializeFormEvents();
    
    // 初始化自定义类别到下拉框
    initializeCustomCategories();
}

// 初始化表单事件
function initializeFormEvents() {
    const cancelBtn = document.getElementById('cancelBtn');
    const planForm = document.getElementById('planForm');
    const planContent = document.getElementById('planContent');
    const contentCount = document.getElementById('contentCount');

    // 取消按钮
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            if (confirm('确定要取消吗？已填写的内容将不会保存。')) {
                window.location.href = 'index.html';
            }
        });
    }

    // 表单提交
    if (planForm) {
        planForm.addEventListener('submit', handleFormSubmit);
    }

    // 字数统计
    if (planContent && contentCount) {
        planContent.addEventListener('input', function() {
            contentCount.textContent = this.value.length;
        });
    }

    // 初始化重复类型选择
    initializeRecurrenceOptions();
}

// 初始化重复类型选项
function initializeRecurrenceOptions() {
    const recurrenceOptions = document.querySelectorAll('.recurrence-option');
    const recurrenceDetails = document.getElementById('recurrenceDetails');
    
    recurrenceOptions.forEach(option => {
        option.addEventListener('click', function() {
            // 移除其他选项的active状态
            recurrenceOptions.forEach(opt => opt.classList.remove('active'));
            // 添加当前选项的active状态
            this.classList.add('active');
            
            // 显示对应的重复详情
            const value = this.getAttribute('data-value');
            showRecurrenceDetails(value);
        });
    });
    
    // 默认选择"仅当天"
    recurrenceOptions[0].classList.add('active');
    showRecurrenceDetails('once');
}

// 显示重复详情
function showRecurrenceDetails(type) {
    const details = document.getElementById('recurrenceDetails');
    const allSections = details.querySelectorAll('.detail-section');
    
    // 隐藏所有详情部分
    allSections.forEach(section => {
        section.style.display = 'none';
    });
    
    // 显示对应的详情部分
    const targetSection = details.querySelector(`.${type}-details`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
}

// 类别标签管理功能
function initializeCategoryFeatures() {
    const categorySelect = document.getElementById('categorySelect');
    const customCategoryInput = document.getElementById('customCategoryInput');
    const newCategoryName = document.getElementById('newCategoryName');

    // 类别选择变化事件
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                // 显示自定义输入框
                customCategoryInput.style.display = 'block';
                newCategoryName.focus();
            } else {
                // 隐藏自定义输入框
                customCategoryInput.style.display = 'none';
                // 添加到最近使用
                if (this.value) {
                    addToRecentCategories(this.value);
                }
            }
        });
    }

    // 自定义类别输入框失去焦点时处理
    if (newCategoryName) {
        newCategoryName.addEventListener('blur', function() {
            setTimeout(() => {
                handleCustomCategoryInput();
            }, 150);
        });
        
        // 回车键确认
        newCategoryName.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleCustomCategoryInput();
            }
        });
    }

    // 初始化最近使用类别
    updateRecentCategories();
}

// 处理自定义类别输入
function handleCustomCategoryInput() {
    const categorySelect = document.getElementById('categorySelect');
    const newCategoryName = document.getElementById('newCategoryName');
    const customCategoryInput = document.getElementById('customCategoryInput');
    
    const categoryName = newCategoryName.value.trim();
    
    if (categoryName && categoryName.length <= 10 && categoryName.length > 0) {
        addCustomCategory(categoryName);
        // 选中新添加的类别
        categorySelect.value = categoryName;
        // 隐藏输入框
        customCategoryInput.style.display = 'none';
        // 清空输入框
        newCategoryName.value = '';
        // 添加到最近使用
        addToRecentCategories(categoryName);
    } else if (categoryName === '') {
        // 如果输入为空，重置为请选择
        categorySelect.value = '';
        customCategoryInput.style.display = 'none';
    }
}

// 添加自定义类别
function addCustomCategory(categoryName) {
    if (!customCategories.includes(categoryName)) {
        customCategories.push(categoryName);
        localStorage.setItem('customCategories', JSON.stringify(customCategories));
        
        // 添加到下拉选择框（在"自定义类别"选项之前）
        const categorySelect = document.getElementById('categorySelect');
        const customOption = categorySelect.querySelector('option[value="custom"]');
        const option = document.createElement('option');
        option.value = categoryName;
        option.textContent = categoryName;
        categorySelect.insertBefore(option, customOption);
    }
}

// 添加到最近使用类别
function addToRecentCategories(categoryName) {
    // 移除已存在的
    recentCategories = recentCategories.filter(cat => cat !== categoryName);
    // 添加到开头
    recentCategories.unshift(categoryName);
    // 只保留最近8个
    recentCategories = recentCategories.slice(0, 8);
    localStorage.setItem('recentCategories', JSON.stringify(recentCategories));
    
    updateRecentCategories();
}

// 更新最近使用类别显示
function updateRecentCategories() {
    const categoryTags = document.getElementById('categoryTags');
    if (!categoryTags) return;

    categoryTags.innerHTML = '';
    
    recentCategories.forEach(category => {
        const tag = document.createElement('div');
        tag.className = 'category-tag';
        tag.textContent = category;
        tag.addEventListener('click', function() {
            // 设置选中状态
            document.querySelectorAll('.category-tag').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // 设置下拉框值
            const categorySelect = document.getElementById('categorySelect');
            categorySelect.value = category;
            // 隐藏自定义输入框
            document.getElementById('customCategoryInput').style.display = 'none';
        });
        categoryTags.appendChild(tag);
    });
}

// 在页面加载时初始化自定义类别到下拉框
function initializeCustomCategories() {
    const categorySelect = document.getElementById('categorySelect');
    const customOption = categorySelect.querySelector('option[value="custom"]');
    
    customCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.insertBefore(option, customOption);
    });
}

// 表单提交处理
function handleFormSubmit(event) {
    event.preventDefault();
    console.log('表单提交处理');
    
    // 获取表单数据
    const formData = getFormData();
    
    if (validateForm(formData)) {
        savePlan(formData);
        showSuccessMessage();
    }
}

// 获取表单数据
function getFormData() {
    const categorySelect = document.getElementById('categorySelect');
    let category = categorySelect.value;
    
    // 如果选择的是自定义类别且正在输入，使用输入的值
    if (category === 'custom') {
        const newCategoryName = document.getElementById('newCategoryName').value.trim();
        if (newCategoryName) {
            category = newCategoryName;
        }
    }
    
    return {
        startDate: document.getElementById('startDate').value,
        category: category,
        name: document.getElementById('planName').value.trim(),
        content: document.getElementById('planContent').value.trim(),
        recurrenceType: document.querySelector('.recurrence-option.active')?.getAttribute('data-value') || 'once',
        startTime: document.getElementById('startTime').value,
        endTime: document.getElementById('endTime').value,
        customPoints: document.getElementById('customPoints').checked
    };
}

// 验证表单
function validateForm(data) {
    if (!data.category || data.category === 'custom') {
        alert('请选择或输入有效的类别');
        return false;
    }
    
    if (!data.name) {
        alert('请输入计划名称');
        document.getElementById('planName').focus();
        return false;
    }
    
    return true;
}

// 保存计划
function savePlan(data) {
    // 生成任务ID
    const taskId = Date.now();
    
    // 创建任务对象
    const task = {
        id: taskId,
        name: data.name,
        subject: data.category,
        description: data.content,
        date: data.startDate,
        startTime: data.startTime,
        endTime: data.endTime,
        repeatType: data.recurrenceType,
        time: calculateDuration(data.startTime, data.endTime),
        points: data.customPoints ? 10 : 5, // 简单示例
        completed: false
    };
    
    // 保存到localStorage
    saveTaskToStorage(task);
    
    console.log('计划保存成功:', task);
}

// 计算学习时长（分钟）
function calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return 30; // 默认30分钟
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diff = (end - start) / (1000 * 60); // 转换为分钟
    
    return Math.max(diff, 0); // 确保非负数
}

// 保存任务到localStorage
function saveTaskToStorage(task) {
    let tasks = JSON.parse(localStorage.getItem('studyTasks') || '[]');
    tasks.push(task);
    localStorage.setItem('studyTasks', JSON.stringify(tasks));
}

// 显示成功消息
function showSuccessMessage() {
    alert('学习计划添加成功！');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}