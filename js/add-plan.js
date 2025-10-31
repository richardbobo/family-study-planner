// 添加学习计划页面逻辑
console.log('add-plan.js 已加载');

let customCategories = JSON.parse(localStorage.getItem('customCategories') || '[]');
let recentCategories = JSON.parse(localStorage.getItem('recentCategories') || '[]');

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    console.log('添加计划页面DOM已加载');
    initializePage();
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
    
    // 初始化类别功能
    initializeCategoryFeatures();
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
    
    // 初始化日期选择器
    initializeDatePickers();
    
    // 初始化星期选择器
    initializeWeekdaySelectors();
    
    // 默认选择"仅当天"
    recurrenceOptions[0].classList.add('active');
    showRecurrenceDetails('once');
}

// 初始化日期选择器
function initializeDatePickers() {
    const today = new Date().toISOString().split('T')[0];
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    const oneMonthLaterStr = oneMonthLater.toISOString().split('T')[0];
    
    // 设置所有开始日期为今天
    const startDateInputs = document.querySelectorAll('input[id$="StartDate"]');
    startDateInputs.forEach(input => {
        input.value = today;
        input.min = today;
    });
    
    // 设置所有结束日期为一个月后
    const endDateInputs = document.querySelectorAll('input[id$="EndDate"]');
    endDateInputs.forEach(input => {
        input.value = oneMonthLaterStr;
        input.min = today;
    });
}

// 初始化星期选择器
function initializeWeekdaySelectors() {
    const weekdaySelectors = document.querySelectorAll('.weekday-selector');
    
    weekdaySelectors.forEach(selector => {
        const options = selector.querySelectorAll('.weekday-option');
        
        options.forEach(option => {
            option.addEventListener('click', function() {
                this.classList.toggle('active');
            });
        });
        
        // 默认选择周一至周五
        options.forEach(option => {
            const day = parseInt(option.getAttribute('data-day'));
            if (day >= 1 && day <= 5) {
                option.classList.add('active');
            }
        });
    });
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
                customCategoryInput.style.display = 'block';
                newCategoryName.focus();
            } else {
                customCategoryInput.style.display = 'none';
                if (this.value) {
                    addToRecentCategories(this.value);
                }
            }
        });
    }

    // 自定义类别输入处理
    if (newCategoryName) {
        newCategoryName.addEventListener('blur', function() {
            setTimeout(() => {
                handleCustomCategoryInput();
            }, 150);
        });
        
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
        categorySelect.value = categoryName;
        customCategoryInput.style.display = 'none';
        newCategoryName.value = '';
        addToRecentCategories(categoryName);
    } else if (categoryName === '') {
        categorySelect.value = '';
        customCategoryInput.style.display = 'none';
    }
}

// 添加自定义类别
function addCustomCategory(categoryName) {
    if (!customCategories.includes(categoryName)) {
        customCategories.push(categoryName);
        localStorage.setItem('customCategories', JSON.stringify(customCategories));
        
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
    recentCategories = recentCategories.filter(cat => cat !== categoryName);
    recentCategories.unshift(categoryName);
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
            document.querySelectorAll('.category-tag').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const categorySelect = document.getElementById('categorySelect');
            categorySelect.value = category;
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
    
    const saveBtn = event.target.querySelector('.btn-save') || document.querySelector('.btn-save');
    
    // 显示加载状态
    showLoadingState(saveBtn, true);
    
    // 获取表单数据
    const formData = getFormData();
    
    if (validateForm(formData)) {
        // 添加延时动画
        setTimeout(() => {
            savePlan(formData);
            showLoadingState(saveBtn, false);
            showSuccessNotification('学习计划添加成功！');
            
            // 2秒后跳转回首页
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            
        }, 1500);
    } else {
        showLoadingState(saveBtn, false);
    }
}

// 显示/隐藏加载状态
function showLoadingState(button, isLoading) {
    if (!button) return;
    
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// 显示成功通知
function showSuccessNotification(message) {
    const existingNotification = document.querySelector('.notification-bubble');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification-bubble';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// 获取表单数据
function getFormData() {
    const categorySelect = document.getElementById('categorySelect');
    let category = categorySelect.value;
    
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
    const taskId = Date.now();
    
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
        points: data.customPoints ? 10 : 5,
        completed: false
    };
    
    saveTaskToStorage(task);
    console.log('计划保存成功:', task);
}

// 计算学习时长
function calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return 30;
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diff = (end - start) / (1000 * 60);
    
    return Math.max(diff, 0);
}

// 保存任务到localStorage
function saveTaskToStorage(task) {
    let tasks = JSON.parse(localStorage.getItem('studyTasks') || '[]');
    tasks.push(task);
    localStorage.setItem('studyTasks', JSON.stringify(tasks));
}