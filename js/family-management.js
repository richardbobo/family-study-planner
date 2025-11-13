// 家庭管理页面逻辑 - 简化版
class FamilyManagement {
    constructor() {
        this.familyService = getFamilyService();
        this.currentView = 'main';
        this.isLoading = false;

        // 页面卸载前强制保存状态
        this.bindBeforeUnload();
        
        // 延迟初始化确保DOM就绪
        setTimeout(() => {
            this.init();
        }, 100);
    }

    // 初始化页面
    async init() {
        console.log('🏠 家庭管理页面初始化');

        // 绑定事件监听器
        this.bindEvents();
        this.bindFamilyEvents();

        // 初始渲染
        await this.render();

        console.log('✅ 家庭管理页面初始化完成');
    }

    // 绑定页面卸载事件
    bindBeforeUnload() {
        window.addEventListener('beforeunload', () => {
            if (this.familyService.currentFamily && this.familyService.currentMember) {
                this.familyService.saveToSessionStorage();
            }
        });
    }

    // 绑定DOM事件
    bindEvents() {
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', this.goBack.bind(this));
        }
    }

    // 绑定家庭服务事件
    bindFamilyEvents() {
        this.familyService.on('familyCreated', () => {
            this.showSuccess('家庭创建成功！');
            this.render();
        });

        this.familyService.on('familyJoined', () => {
            this.showSuccess('成功加入家庭！');
            this.render();
        });

        this.familyService.on('familyLeft', () => {
            this.showSuccess('已退出家庭');
            this.render();
        });
    }

    // 渲染页面 - 简化版本
    async render() {
        // 直接渲染所有内容，如果元素不存在就静默跳过
        await this.renderFamilyStatus();
        await this.renderActionButtons();
        await this.renderRecentUsers();

        if (this.familyService.hasJoinedFamily()) {
            await this.renderFamilyInfo();
            await this.renderMembersList();
        }
    }

    // 渲染家庭状态 - 静默失败
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
                </div>
            `;
            statusElement.className = 'family-status status-not-joined';
        }
    }

    // 渲染操作按钮 - 静默失败
    async renderActionButtons() {
        const buttonsElement = document.getElementById('actionButtons');
        if (!buttonsElement) return;

        if (this.familyService.hasJoinedFamily()) {
            buttonsElement.innerHTML = `
                <button class="btn-family btn-members" onclick="familyManagement.showMembers()">
                    <i class="fas fa-users"></i> 家庭成员
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

    // 渲染最近使用的用户 - 静默失败
    async renderRecentUsers() {
        const recentUsersContainer = document.getElementById('recentUsers');
        if (!recentUsersContainer) return;

        const recentUsers = this.familyService.getRecentUsers();

        if (!recentUsers || recentUsers.length === 0) {
            recentUsersContainer.innerHTML = `
                <div class="no-recent-users">
                    <p>暂无历史记录</p>
                    <small>加入家庭后会自动记录在这里</small>
                </div>
            `;
        } else {
            recentUsersContainer.innerHTML = recentUsers.map(user => {
                const isActive = user.isActive !== false;
                const activeClass = isActive ? 'active-user' : 'inactive-user';
                const statusBadge = isActive ? '' : '<div class="inactive-badge">已退出</div>';
                
                return `
                    <div class="recent-user-card ${activeClass}" onclick="familyManagement.quickJoin('${user.familyCode}', '${user.userName}')">
                        <div class="user-avatar">${user.userName.charAt(0)}</div>
                        <div class="user-info">
                            <div class="user-name">${user.userName}</div>
                            <div class="family-name">${user.familyName}</div>
                            <div class="family-code">家庭码: ${user.familyCode}</div>
                            ${user.leftAt ? `
                                <div class="leave-time">退出时间: ${new Date(user.leftAt).toLocaleDateString('zh-CN')}</div>
                            ` : ''}
                        </div>
                        <div class="card-actions">
                            ${statusBadge}
                            <div class="join-arrow">→</div>
                        </div>
                    </div>
                `;
            }).join('');

            const quickAccessSection = document.getElementById('quickAccessSection');
            if (quickAccessSection) {
                quickAccessSection.style.display = 'block';
            }
        }
    }

    // 快速加入家庭
    async quickJoin(familyCode, userName) {
        try {
            const userNameInput = document.getElementById('userName');
            const familyCodeInput = document.getElementById('familyCode');

            if (userNameInput) userNameInput.value = userName;
            if (familyCodeInput) familyCodeInput.value = familyCode;

            const confirmJoin = confirm(`快速加入家庭 ${familyCode} 作为 ${userName}？`);
            if (confirmJoin) {
                await this.joinFamilyWithCredentials(familyCode, userName);
            }
        } catch (error) {
            this.showError('快速加入失败: ' + error.message);
        }
    }

    // 使用凭证加入家庭
    async joinFamilyWithCredentials(familyCode, userName, role = 'child') {
        if (this.isLoading) return;

        await this.setLoading(true);

        try {
            await this.familyService.joinFamily(familyCode, userName, role);
            this.showSuccess(`欢迎回来 ${userName}！`);
            await this.familyService.saveToSessionStorage();
            
            setTimeout(() => {
                this.showMainView();
            }, 200);

        } catch (error) {
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

    // 渲染家庭信息 - 静默失败
    async renderFamilyInfo() {
        const infoElement = document.getElementById('familyInfo');
        if (!infoElement || !this.familyService.hasJoinedFamily()) return;

        const family = this.familyService.getCurrentFamily();
        const member = this.familyService.getCurrentMember();

        const familyNameElement = document.getElementById('infoFamilyName');
        const familyCodeElement = document.getElementById('infoFamilyCode');
        const memberRoleElement = document.getElementById('infoMemberRole');
        const joinTimeElement = document.getElementById('infoJoinTime');

        if (familyNameElement) familyNameElement.textContent = family.family_name;
        if (familyCodeElement) familyCodeElement.innerHTML = `<span class="family-code">${family.family_code}</span>`;
        if (memberRoleElement) memberRoleElement.textContent = member.role === 'parent' ? '家长' : '孩子';
        
        const joinTime = member.joined_at || member.created_at;
        if (joinTimeElement) joinTimeElement.textContent = new Date(joinTime).toLocaleDateString('zh-CN');

        infoElement.style.display = 'block';
    }

    // 渲染成员列表 - 静默失败
    async renderMembersList() {
        const membersElement = document.getElementById('membersList');
        const container = document.getElementById('membersContainer');

        if (!membersElement || !container || !this.familyService.hasJoinedFamily()) return;

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
            }
        } catch (error) {
            // 静默失败
        }
    }

    // === 表单处理 ===

    showCreateForm() {
        this.hideAllForms();
        document.getElementById('createFamilyForm').style.display = 'block';
        this.currentView = 'create';

        const quickAccessSection = document.getElementById('quickAccessSection');
        if (quickAccessSection) {
            quickAccessSection.style.display = 'none';
        }

        setTimeout(() => {
            const familyNameInput = document.getElementById('familyName');
            if (familyNameInput) familyNameInput.focus();
        }, 100);
    }

    showJoinForm() {
        this.hideAllForms();
        document.getElementById('joinFamilyForm').style.display = 'block';
        this.currentView = 'join';

        const quickAccessSection = document.getElementById('quickAccessSection');
        if (quickAccessSection) {
            quickAccessSection.style.display = 'block';
        }

        setTimeout(() => {
            const familyCodeInput = document.getElementById('familyCode');
            if (familyCodeInput) familyCodeInput.focus();
        }, 100);
    }

    showMainView() {
        this.hideAllForms();
        this.currentView = 'main';
        this.render();
    }

    showMembers() {
        this.renderMembersList();
    }

    hideAllForms() {
        const forms = ['createFamilyForm', 'joinFamilyForm'];
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) form.style.display = 'none';
        });
    }

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
            this.showError('创建家庭失败: ' + error.message);
        } finally {
            await this.setLoading(false);
        }
    }

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

        await this.joinFamilyWithCredentials(familyCode, userName, userRole);
    }

    async leaveFamily() {
        if (!confirm('确定要退出当前家庭吗？退出后需要重新加入才能访问家庭数据。')) {
            return;
        }

        await this.setLoading(true);

        try {
            await this.familyService.leaveFamily();
            this.showSuccess('已成功退出家庭');
        } catch (error) {
            this.showError('退出家庭失败: ' + error.message);
        } finally {
            await this.setLoading(false);
        }
    }

    async removeMember(memberId) {
        if (!confirm('确定要移除此家庭成员吗？此操作不可撤销。')) {
            return;
        }

        await this.setLoading(true);

        try {
            await this.familyService.supabaseClient.removeFamilyMember(memberId);
            this.showSuccess('成员移除成功');
            await this.renderMembersList();
        } catch (error) {
            this.showError('移除成员失败: ' + error.message);
        } finally {
            await this.setLoading(false);
        }
    }

    // === 工具方法 ===

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

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type = 'info') {
        const existingMessage = document.querySelector('.message-container');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message-container ${type}-message`;
        messageDiv.innerHTML = `
            <i class="fas fa-${this.getMessageIcon(type)}"></i>
            <span>${message}</span>
        `;

        const container = document.querySelector('.family-container');
        if (container) {
            container.insertBefore(messageDiv, container.firstChild);
        }

        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    }

    getMessageIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    async goBack() {
        if (this.currentView !== 'main') {
            this.showMainView();
        } else {
            if (this.familyService.currentFamily && this.familyService.currentMember) {
                await this.familyService.saveToSessionStorage();
            }

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 100);
        }
    }
}

// 全局实例和函数
let familyManagement = null;

document.addEventListener('DOMContentLoaded', function () {
    familyManagement = new FamilyManagement();
});

function handleCreateFamily(event) {
    if (familyManagement) familyManagement.handleCreateFamily(event);
}

function handleJoinFamily(event) {
    if (familyManagement) familyManagement.handleJoinFamily(event);
}

function goBack() {
    if (familyManagement) familyManagement.goBack();
}

function showMainView() {
    if (familyManagement) familyManagement.showMainView();
}