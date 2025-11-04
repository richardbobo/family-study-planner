// 家庭管理页面逻辑
class FamilyManagement {
    constructor() {
        this.familyService = getFamilyService();
        this.currentView = 'main';
        this.isLoading = false;

        this.init();
    }

    // 初始化页面
    async init() {
        console.log('🏠 家庭管理页面初始化');

        // 绑定事件监听器
        this.bindEvents();

        // 监听家庭服务事件
        this.bindFamilyEvents();

        // 初始渲染
        await this.render();

        console.log('✅ 家庭管理页面初始化完成');
    }

    // 绑定DOM事件
    bindEvents() {
        // 页面加载完成后再绑定事件
        document.addEventListener('DOMContentLoaded', () => {
            // 返回按钮
            const backBtn = document.querySelector('.back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', this.goBack.bind(this));
            }
        });
    }

    // 绑定家庭服务事件
    bindFamilyEvents() {
        // 家庭创建成功
        this.familyService.on('familyCreated', (data) => {
            console.log('🎉 家庭创建成功事件触发');
            this.showSuccess('家庭创建成功！');
            this.render();
        });

        // 家庭加入成功
        this.familyService.on('familyJoined', (data) => {
            console.log('🎉 家庭加入成功事件触发');
            this.showSuccess('成功加入家庭！');
            this.render();
        });

        // 家庭退出成功
        this.familyService.on('familyLeft', () => {
            console.log('🚪 家庭退出成功事件触发');
            this.showSuccess('已退出家庭');
            this.render();
        });

        // 数据迁移完成
        this.familyService.on('dataMigrated', (data) => {
            console.log('🔄 数据迁移完成事件触发', data);
            this.showSuccess(`数据迁移完成：${data.success} 个任务成功迁移`);
            this.render();
        });
    }

    // 渲染页面
    async render() {
        await this.renderFamilyStatus();
        await this.renderActionButtons();

        if (this.familyService.hasJoinedFamily()) {
            await this.renderFamilyInfo();
            await this.renderMembersList();
        }
    }

    // 渲染家庭状态
    // 在 renderFamilyStatus 方法中添加重新加入提示
    async renderFamilyStatus() {
        const statusElement = document.getElementById('familyStatus');
        if (!statusElement) return;

        if (this.familyService.hasJoinedFamily()) {
            const family = this.familyService.getCurrentFamily();
            const member = this.familyService.getCurrentMember();

            statusElement.innerHTML = `
            <i class="fas fa-check-circle" style="color: #2ed573;"></i>
            <div>
                <strong>已加入家庭</strong>
                <div style="font-size: 14px; color: #6c757d;">
                    ${family.family_name} • ${member.user_name} (${member.role})
                </div>
            </div>
        `;
            statusElement.className = 'family-status status-joined';
        } else {
            statusElement.innerHTML = `
            <i class="fas fa-home" style="color: #ff9f43;"></i>
            <div>
                <strong>尚未加入家庭</strong>
                <div style="font-size: 14px; color: #6c757d;">
                    创建或加入家庭以享受数据同步功能
                </div>
                ${this.getRejoinHint()}
            </div>
        `;
            statusElement.className = 'family-status status-not-joined';
        }
    }

    // 获取重新加入的提示
    getRejoinHint() {
        // 检查本地是否有之前的家庭信息
        try {
            const saved = localStorage.getItem(APP_CONFIG.CONSTANTS.STORAGE_KEYS.FAMILY_INFO);
            if (saved) {
                const familyInfo = JSON.parse(saved);
                return `<div style="font-size: 12px; color: #ff9f43; margin-top: 5px;">
                提示：你之前加入过家庭 "${familyInfo.family.family_name}"，可以使用相同信息重新加入
            </div>`;
            }
        } catch (error) {
            // 忽略错误
        }
        return '';
    }
    // 渲染操作按钮
    async renderActionButtons() {
        const buttonsElement = document.getElementById('actionButtons');
        if (!buttonsElement) return;

        if (this.familyService.hasJoinedFamily()) {
            buttonsElement.innerHTML = `
                <button class="btn-family btn-members" onclick="familyManagement.showMembers()">
                    <i class="fas fa-users"></i> 家庭成员
                </button>
                <button class="btn-family btn-migrate" onclick="familyManagement.migrateData()">
                    <i class="fas fa-sync"></i> 迁移数据
                </button>
                <button class="btn-family btn-leave" onclick="familyManagement.leaveFamily()">
                    <i class="fas fa-sign-out-alt"></i> 退出家庭
                </button>
            `;
        } else {
            buttonsElement.innerHTML = `
                <button class="btn-family btn-create" onclick="familyManagement.showCreateForm()">
                    <i class="fas fa-plus-circle"></i> 创建家庭
                </button>
                <button class="btn-family btn-join" onclick="familyManagement.showJoinForm()">
                    <i class="fas fa-user-plus"></i> 加入家庭
                </button>
            `;
        }
    }


    // 渲染家庭信息
    async renderFamilyInfo() {
        const infoElement = document.getElementById('familyInfo');
        if (!infoElement || !this.familyService.hasJoinedFamily()) return;

        const family = this.familyService.getCurrentFamily();
        const member = this.familyService.getCurrentMember();

        document.getElementById('infoFamilyName').textContent = family.family_name;
        document.getElementById('infoFamilyCode').innerHTML =
            `<span class="family-code">${family.family_code}</span>`;
        document.getElementById('infoMemberRole').textContent =
            member.role === 'parent' ? '家长' : '孩子';

        // 使用 created_at 字段，因为 joined_at 可能不存在
        const joinTime = member.joined_at || member.created_at;
        document.getElementById('infoJoinTime').textContent =
            new Date(joinTime).toLocaleDateString('zh-CN');

        infoElement.style.display = 'block';
    }

    // 渲染成员列表
    async renderMembersList() {
        const membersElement = document.getElementById('membersList');
        const container = document.getElementById('membersContainer');

        if (!membersElement || !container) return;

        try {
            const members = await this.familyService.getFamilyMembers();

            if (members && members.length > 0) {
                container.innerHTML = members.map(member => `
                    <div class="member-item">
                        <div class="member-avatar">
                            ${member.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div class="member-info">
                            <div class="member-name">
                                ${member.user_name}
                                <span class="role-badge ${member.role === 'parent' ? 'role-parent' : 'role-child'}">
                                    ${member.role === 'parent' ? '家长' : '孩子'}
                                </span>
                            </div>
                            <div class="member-role">
                                加入时间: ${new Date(member.created_at).toLocaleDateString('zh-CN')}
                            </div>
                        </div>
                        ${this.familyService.isParent() && member.role === 'child' ? `
                            <div class="member-actions">
                                <button class="btn-member-action" onclick="familyManagement.removeMember('${member.id}')">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `).join('');

                membersElement.style.display = 'block';
            } else {
                membersElement.style.display = 'none';
            }

        } catch (error) {
            console.error('❌ 渲染成员列表失败:', error);
            this.showError('获取成员列表失败: ' + error.message);
        }
    }

    // === 表单处理 ===

    // 显示创建家庭表单
    showCreateForm() {
        this.hideAllForms();
        document.getElementById('createFamilyForm').style.display = 'block';
        this.currentView = 'create';

        // 自动聚焦到家庭名称输入框
        setTimeout(() => {
            const familyNameInput = document.getElementById('familyName');
            if (familyNameInput) familyNameInput.focus();
        }, 100);
    }

    // 显示加入家庭表单
    showJoinForm() {
        this.hideAllForms();
        document.getElementById('joinFamilyForm').style.display = 'block';
        this.currentView = 'join';

        // 自动聚焦到家庭码输入框
        setTimeout(() => {
            const familyCodeInput = document.getElementById('familyCode');
            if (familyCodeInput) familyCodeInput.focus();
        }, 100);
    }

    // 显示主视图
    showMainView() {
        this.hideAllForms();
        this.currentView = 'main';
        this.render();
    }

    // 显示成员列表
    showMembers() {
        this.renderMembersList();
    }

    // 隐藏所有表单
    hideAllForms() {
        const forms = ['createFamilyForm', 'joinFamilyForm'];
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) form.style.display = 'none';
        });
    }

    // 处理创建家庭表单提交
    async handleCreateFamily(event) {
        event.preventDefault();

        if (this.isLoading) return;

        const familyName = document.getElementById('familyName').value.trim();
        const parentName = document.getElementById('parentName').value.trim();

        if (!familyName || !parentName) {
            this.showError('请填写所有必填字段');
            return;
        }

        await this.setLoading(true);

        try {
            await this.familyService.createFamily(familyName, parentName);
            this.showMainView();

        } catch (error) {
            console.error('❌ 创建家庭失败:', error);
            this.showError('创建家庭失败: ' + error.message);
        } finally {
            await this.setLoading(false);
        }
    }


    // 处理加入家庭表单提交（修复版本）
    async handleJoinFamily(event) {
        event.preventDefault();

        if (this.isLoading) return;

        const familyCode = document.getElementById('familyCode').value.trim().toUpperCase();
        const userName = document.getElementById('userName').value.trim();
        const userRole = document.getElementById('userRole').value;

        if (!familyCode || !userName) {
            this.showError('请填写所有必填字段');
            return;
        }

        if (familyCode.length !== 6) {
            this.showError('家庭码必须是6位字符');
            return;
        }

        await this.setLoading(true);

        try {
            await this.familyService.joinFamily(familyCode, userName, userRole);
            this.showMainView();

        } catch (error) {
            console.error('❌ 加入家庭失败:', error);

            // 提供更友好的错误信息
            let errorMessage = '加入家庭失败';
            if (error.message.includes('已经在这个家庭中')) {
                errorMessage = `用户 "${userName}" 已经在这个家庭中了，请使用其他姓名或联系家长`;
            } else if (error.message.includes('家庭码无效')) {
                errorMessage = '家庭码无效，请检查后重试';
            } else if (error.message.includes('未连接')) {
                errorMessage = '网络连接失败，请检查网络后重试';
            } else {
                errorMessage += ': ' + error.message;
            }

            this.showError(errorMessage);
        } finally {
            await this.setLoading(false);
        }
    }

    // 退出家庭
    async leaveFamily() {
        if (!confirm('确定要退出当前家庭吗？退出后需要重新加入才能访问家庭数据。')) {
            return;
        }

        await this.setLoading(true);

        try {
            await this.familyService.leaveFamily();
            this.showSuccess('已成功退出家庭');

        } catch (error) {
            console.error('❌ 退出家庭失败:', error);
            this.showError('退出家庭失败: ' + error.message);
        } finally {
            await this.setLoading(false);
        }
    }
    // 确认退出家庭
    async leaveFamilyConfirmed() {
        await this.setLoading(true);

        try {
            await this.familyService.leaveFamily();
            this.showSuccessToast('退出成功', '已成功退出家庭');
            await this.render();

        } catch (error) {
            console.error('❌ 退出家庭失败:', error);
            this.showErrorToast('退出失败', error.message);
        } finally {
            await this.setLoading(false);
        }
    }
    // 迁移数据到家庭
    async migrateData() {
        if (!confirm('是否将本地数据迁移到当前家庭？迁移后数据将在家庭成员间共享。')) {
            return;
        }

        await this.setLoading(true);

        try {
            const result = await this.familyService.migrateLocalDataToFamily();
            console.log('✅ 数据迁移完成:', result);

        } catch (error) {
            console.error('❌ 数据迁移失败:', error);
            this.showError('数据迁移失败: ' + error.message);
        } finally {
            await this.setLoading(false);
        }
    }

    // 移除家庭成员（家长权限）
    async removeMember(memberId) {
        if (!confirm('确定要移除此家庭成员吗？此操作不可撤销。')) {
            return;
        }

        await this.setLoading(true);

        try {
            // 注意：需要在 supabase-client.js 中实现 removeFamilyMember 方法
            await this.familyService.supabaseClient.removeFamilyMember(memberId);
            this.showSuccess('成员移除成功');
            await this.renderMembersList();

        } catch (error) {
            console.error('❌ 移除成员失败:', error);
            this.showError('移除成员失败: ' + error.message);
        } finally {
            await this.setLoading(false);
        }
    }

    // === 工具方法 ===

    // 设置加载状态
    async setLoading(loading) {
        this.isLoading = loading;

        const buttons = document.querySelectorAll('.btn-family');
        buttons.forEach(button => {
            if (loading) {
                button.disabled = true;
                button.classList.add('btn-loading');
            } else {
                button.disabled = false;
                button.classList.remove('btn-loading');
            }
        });
    }

    // 显示成功消息
    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    // 显示错误消息
    showError(message) {
        this.showMessage(message, 'error');
    }

    // 显示警告消息
    showWarning(message) {
        this.showMessage(message, 'warning');
    }

    // 显示消息
    showMessage(message, type = 'info') {
        // 移除现有的消息
        const existingMessage = document.querySelector('.message-container');
        if (existingMessage) {
            existingMessage.remove();
        }

        // 创建新消息
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-container ${type}-message`;
        messageDiv.innerHTML = `
            <i class="fas fa-${this.getMessageIcon(type)}"></i>
            <span>${message}</span>
        `;

        // 添加到页面顶部
        const container = document.querySelector('.family-container');
        if (container) {
            container.insertBefore(messageDiv, container.firstChild);
        }

        // 3秒后自动消失
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    }
    // 弹窗管理方法
    showLeaveFamilyConfirm() {
        const modal = document.getElementById('leaveFamilyModal');
        if (modal) {
            modal.classList.add('show');

            // 绑定确认按钮事件
            const confirmBtn = document.getElementById('confirmLeaveBtn');
            const cancelBtn = document.getElementById('cancelLeaveBtn');

            const confirmHandler = () => {
                this.leaveFamilyConfirmed();
                this.hideLeaveFamilyConfirm();
            };

            const cancelHandler = () => {
                this.hideLeaveFamilyConfirm();
            };

            // 移除旧的事件监听器，避免重复绑定
            confirmBtn.replaceWith(confirmBtn.cloneNode(true));
            cancelBtn.replaceWith(cancelBtn.cloneNode(true));

            // 重新获取元素并绑定事件
            document.getElementById('confirmLeaveBtn').addEventListener('click', confirmHandler);
            document.getElementById('cancelLeaveBtn').addEventListener('click', cancelHandler);

            // ESC键关闭
            const escHandler = (event) => {
                if (event.key === 'Escape') {
                    this.hideLeaveFamilyConfirm();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);
        }
    }

    hideLeaveFamilyConfirm() {
        const modal = document.getElementById('leaveFamilyModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }



    // Toast 提示方法
    showSuccessToast(title, description) {
        this.showToast('success', title, description);
    }

    showErrorToast(title, description) {
        this.showToast('error', title, description);
    }

    showWarningToast(title, description) {
        this.showToast('warning', title, description);
    }

    showToast(type, title, description) {
        const toast = document.getElementById('successToast');
        if (!toast) return;

        // 更新内容和样式
        toast.className = `toast-message toast-${type} show`;
        document.getElementById('toastTitle').textContent = title;
        document.getElementById('toastDesc').textContent = description;

        // 更新图标
        const icon = toast.querySelector('.toast-icon i');
        const icons = {
            success: 'fa-check',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle'
        };
        icon.className = `fas ${icons[type] || 'fa-info-circle'}`;

        // 自动隐藏
        setTimeout(() => {
            this.hideToast();
        }, 3000);
    }

    hideToast() {
        const toast = document.getElementById('successToast');
        if (toast) {
            toast.classList.remove('show');
        }
    }

    // 更新退出家庭方法
    async leaveFamily() {
        this.showLeaveFamilyConfirm();
    }

    // 获取消息图标
    getMessageIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    // 返回上一页
    goBack() {
        if (this.currentView !== 'main') {
            this.showMainView();
        } else {
            window.location.href = 'index.html';
        }
    }
}

// 创建全局实例
let familyManagement = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function () {
    familyManagement = new FamilyManagement();
});

// 全局函数供HTML调用
function handleCreateFamily(event) {
    if (familyManagement) {
        familyManagement.handleCreateFamily(event);
    }
}

function handleJoinFamily(event) {
    if (familyManagement) {
        familyManagement.handleJoinFamily(event);
    }
}

function goBack() {
    if (familyManagement) {
        familyManagement.goBack();
    } else {
        window.location.href = 'index.html';
    }
}