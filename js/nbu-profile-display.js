// nbu-profile-display.js - OC资料显示模块
function updateProfileDisplay(userProfile, isOtherUser = false) {
    console.log("🎨 更新资料显示:", { userProfile, isOtherUser });
    
    const profilePanel = document.getElementById('nbu-profile-panel');
    if (!profilePanel) {
        console.error("❌ 找不到资料展示面板");
        return;
    }
    
    if (!userProfile) {
        profilePanel.innerHTML = `
            <div class="nbu-login-prompt">
                <h3>❌ 无法加载用户资料</h3>
                <p>请刷新页面重试</p>
            </div>
        `;
        return;
    }
    
    // 构建资料卡片HTML
    profilePanel.innerHTML = createProfileCardHTML(userProfile, isOtherUser);
}

function createProfileCardHTML(userProfile, isOtherUser = false) {
    const roleDisplay = {
        'student': '🎓 学生',
        'faculty': '👨‍🏫 教职人员', 
        'visitor': '👀 访客'
    };
    
    // 处理头像URL，确保使用优化后的尺寸
    const optimizedAvatarUrl = getOptimizedAvatarUrl(userProfile.avatar_url);
    
    return `
        <div class="nbu-profile-card">
            <div class="nbu-profile-header">
                <div class="nbu-avatar-container">
                    <img src="${optimizedAvatarUrl}" 
                         alt="头像" 
                         class="nbu-profile-avatar"
                         onerror="this.src='${getDefaultAvatar()}'">
                    <div class="nbu-avatar-frame"></div>
                </div>
                <div class="nbu-profile-basic">
                    <h3>${userProfile.oc_name || userProfile.display_name || 'NBU用户'}</h3>
                    <p class="nbu-profile-role">${roleDisplay[userProfile.role] || '未知身份'}</p>
                </div>

                <!-- 社交统计区域 -->
                <div class="nbu-social-stats" id="social-stats">
                    ${isOtherUser ? `
                        <div class="nbu-stat-item">
                            <span class="nbu-stat-number" id="followers-count">0</span>
                            <span class="nbu-stat-label">粉丝</span>
                        </div>
                        <div class="nbu-stat-item">
                            <span class="nbu-stat-number" id="following-count">0</span>
                            <span class="nbu-stat-label">关注</span>
                        </div>
                    ` : ''}
                    ${!isOtherUser ? `
                        <a href="/follow/followers/" class="nbu-stat-item">
                            <span class="nbu-stat-number" id="followers-count">0</span>
                            <span class="nbu-stat-label">粉丝</span>
                        </a>
                        <a href="/follow/following/" class="nbu-stat-item">  
                            <span class="nbu-stat-number" id="following-count">0</span>
                            <span class="nbu-stat-label">关注</span>
                        </a>
                    ` : ''}
                    <div class="nbu-stat-item">
                        <span class="nbu-stat-number" id="likes-count">0</span>
                        <span class="nbu-stat-label">获赞</span>
                    </div>
                    <div class="nbu-stat-item">
                        <span class="nbu-stat-number" id="dislikes-count">0</span>
                        <span class="nbu-stat-label">被踩</span>
                    </div>
                    <!-- 关注操作按钮（仅当查看他人资料时显示） -->
                    ${isOtherUser ? `
                        <div class="nbu-social-actions">
                            <button id="follow-btn" class="nbu-follow-btn" onclick="toggleFollow('${userProfile.auth0_user_id}')">
                                <span id="follow-text">加载中...</span>
                            </button>
                        </div>
                    ` : ''}
                </div>

                <div class="nbu-profile-details">
                    ${createOCDetailsHTML(userProfile)}
                    ${createRoleSpecificHTML(userProfile)}
                    ${createBioHTML(userProfile)}
                </div>
            </div>

            <!-- 点赞点踩按钮区域（仅当查看他人资料时显示） -->
            ${isOtherUser ? `
                <div class="nbu-reaction-actions">
                    <div class="nbu-reaction-buttons">
                        <button id="like-btn" class="nbu-reaction-btn nbu-like-btn" onclick="handleReaction('like', '${userProfile.auth0_user_id}')">
                            <span class="nbu-reaction-icon">👍</span>
                            <span class="nbu-reaction-count" id="like-count">0</span>
                        </button>
                        <button id="dislike-btn" class="nbu-reaction-btn nbu-dislike-btn" onclick="handleReaction('dislike', '${userProfile.auth0_user_id}')">
                            <span class="nbu-reaction-icon">👎</span>
                            <span class="nbu-reaction-count" id="dislike-count">0</span>
                        </button>
                    </div>
                    <div class="nbu-reaction-hint">
                        <small>为ta的主页点赞/点踩</small>
                    </div>
                </div>
            ` : ''}

            <!-- 评论区域 -->
            <div class="nbu-comments-section">
                <div class="nbu-comments-header">
                    <h4>💬 评论</h4>
                    <span class="nbu-comments-count" id="comments-count">0 条评论</span>
                </div>
                    
                <!-- 评论发表框 -->
                <div class="nbu-comment-form">
                    <div class="nbu-comment-input-container">
                        <textarea 
                            id="comment-input" 
                            placeholder="写下你的评论..." 
                            rows="3"
                            maxlength="500"
                        ></textarea>
                        <div class="nbu-comment-actions">
                            <div class="nbu-comment-counter">
                                <span id="comment-chars">0</span>/500
                            </div>
                            <button id="submit-comment" class="nbu-comment-submit" onclick="submitComment('${userProfile.auth0_user_id}')">
                                发表评论
                            </button>
                        </div>
                    </div>
                </div>
                    
                <!-- 评论列表 -->
                <div class="nbu-comments-list" id="comments-list">
                    <div class="nbu-comments-loading">
                        <div class="nbu-loading-spinner"></div>
                        <span>加载评论中...</span>
                    </div>
                </div>
            </div>


            <div class="nbu-export-options">
                    <h4>💾 导出资料</h4>
                    <p class="text-muted">将资料保存为文件</p>
                    <div class="export-buttons">
                        <button onclick="exportProfile('png', '${userProfile.auth0_user_id}')" 
                                class="btn btn-outline-primary">
                            🖼️ 图片格式
                        </button>
                        <button onclick="exportProfile('json', '${userProfile.auth0_user_id}')" 
                                class="btn btn-outline-secondary">
                            ⚙️ JSON数据
                        </button>
                    </div>
                    <small class="form-text text-muted">
                        图片适合分享，JSON适合数据备份
                    </small>
            </div>
                
            ${!isOtherUser ? `
                <div class="nbu-profile-actions">
                    <hr>
                    <div class="nbu-danger-zone">
                        <h4>⚠️ 账户管理</h4>
                        <p class="text-muted">永久删除账户及其所有数据</p>
                        <button onclick="showDeleteAccountModal()" class="btn btn-danger">
                            🗑️ 注销账户
                        </button>
                        <small class="form-text text-muted">
                            注意：此操作不可撤销，所有数据将被永久删除
                        </small>
                    </div>
                </div>
            ` : `
                <div class="nbu-profile-actions">
                    <hr>
                    <a href="/members/" class="btn btn-outline-primary">
                        ← 返回成员目录
                    </a>
                </div>
            `}
        </div>
    `;
}
// 获取优化后的头像URL（使用Supabase图片转换）
function getOptimizedAvatarUrl(originalUrl) {
    if (!originalUrl) return getDefaultAvatar();
    
    // 如果是Supabase存储的图片，使用图片转换功能
    if (originalUrl.includes('supabase.co/storage/v1/object/public/avatars/')) {
        // Supabase图片转换API - 调整尺寸和质量
        return originalUrl + '?width=200&height=200&quality=80&fit=cover';
    }
    
    // 如果是外部图片，直接返回（无法优化）
    return originalUrl;
}

// 获取默认头像
function getDefaultAvatar() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSI0MCIgZmlsbD0jQ0VDRkQxLz4KPHBhdGggZD0iTTQwIDE2MEM0MCAxMzEuMDQ2IDYzLjA0NiAxMDggOTIgMTA4SDEwOEMxMzYuOTU0IDEwOCAxNjAgMTMxLjA0NiAxNjAgMTYwVjE4MEg0MFYxNjBaIiBmaWxsPSIjQ0VDRkQxIi8+Cjwvc3ZnPg==';
}

function createOCDetailsHTML(userProfile) {
    if (userProfile.role === 'visitor') return '';
    
    return `
        <div class="nbu-detail-section">
            <h4>🎭 基础信息</h4>
            <div class="nbu-detail-grid">
                <div class="nbu-detail-item">
                    <span class="nbu-detail-label">年龄:</span>
                    <span class="nbu-detail-value">${userProfile.oc_age || '未设置'}</span>
                </div>
                <div class="nbu-detail-item">
                    <span class="nbu-detail-label">国籍:</span>
                    <span class="nbu-detail-value">${userProfile.oc_nationality || '未设置'}</span>
                </div>
                <div class="nbu-detail-item">
                    <span class="nbu-detail-label">性别:</span>
                    <span class="nbu-detail-value">${userProfile.oc_gender || '未设置'}</span>
                </div>
            </div>
        </div>
    `;
}

function createRoleSpecificHTML(userProfile) {
    if (userProfile.role === 'student') {
        return `
            <div class="nbu-detail-section">
                <h4>🎓 学生信息</h4>
                <div class="nbu-detail-grid">
                    <div class="nbu-detail-item">
                        <span class="nbu-detail-label">专业:</span>
                        <span class="nbu-detail-value">${userProfile.major || '未设置'}</span>
                    </div>
                    <div class="nbu-detail-item">
                        <span class="nbu-detail-label">学号:</span>
                        <span class="nbu-detail-value">${userProfile.student_id || '未设置'}</span>
                    </div>
                    <div class="nbu-detail-item">
                        <span class="nbu-detail-label">宿舍:</span>
                        <span class="nbu-detail-value">${userProfile.dormitory || '未设置'}</span>
                    </div>
                    <div class="nbu-detail-item">
                        <span class="nbu-detail-label">入学年份:</span>
                        <span class="nbu-detail-value">${userProfile.enrollment_year || '未设置'}</span>
                    </div>
                </div>
                <div class="nbu-detail-item-full">
                    <span class="nbu-detail-label">社团:</span>
                    <span class="nbu-detail-value">${userProfile.clubs ? userProfile.clubs.join(', ') : '未加入'}</span>
                </div>
            </div>
        `;
    }
    
    if (userProfile.role === 'faculty') {
        return `
            <div class="nbu-detail-section">
                <h4>👨‍🏫 教职信息</h4>
                <div class="nbu-detail-grid">
                    <div class="nbu-detail-item">
                        <span class="nbu-detail-label">院系:</span>
                        <span class="nbu-detail-value">${userProfile.department || '未设置'}</span>
                    </div>
                    <div class="nbu-detail-item">
                        <span class="nbu-detail-label">职称:</span>
                        <span class="nbu-detail-value">${userProfile.faculty_rank || '未设置'}</span>
                    </div>
                    <div class="nbu-detail-item">
                        <span class="nbu-detail-label">办公室:</span>
                        <span class="nbu-detail-value">${userProfile.office_location || '未设置'}</span>
                    </div>
                </div>
                <div class="nbu-detail-item-full">
                    <span class="nbu-detail-label">办公时间:</span>
                    <span class="nbu-detail-value">${userProfile.office_hours || '未设置'}</span>
                </div>
                <div class="nbu-detail-item-full">
                    <span class="nbu-detail-label">负责科目:</span>
                    <span class="nbu-detail-value">${userProfile.courses ? userProfile.courses.join(', ') : '未设置'}</span>
                </div>
                <div class="nbu-detail-item-full">
                    <span class="nbu-detail-label">学位:</span>
                    <span class="nbu-detail-value">${userProfile.degrees ? userProfile.degrees.join('; ') : '未设置'}</span>
                </div>
            </div>
        `;
    }
    
    return '';
}

function createBioHTML(userProfile) {
    return `
        <div class="nbu-detail-section">
            <h4>📑 个人简介</h4>
            <p class="nbu-profile-bio">${userProfile.bio || '这个用户很懒，什么都没有写...'}</p>
        </div>
    `;
}

// 全局可用
window.updateProfileDisplay = updateProfileDisplay;