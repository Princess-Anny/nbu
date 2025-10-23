const supabaseUrl_d = "https://grgpsujmjbeuphwvxhpg.supabase.co";
const supabaseServiceKey_d = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3BzdWptamJldXBod3Z4aHBnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTIzNzExNCwiZXhwIjoyMDc0ODEzMTE0fQ.hy4_n74vuailNkPHWkt9YWINfQFsNuwLHNcg7knUlL4";
const supabaseAdmin_d = supabase.createClient(supabaseUrl_d, supabaseServiceKey_d);

// 活动详情系统
        class EventDetailSystem {
            constructor() {
                this.eventId = this.getEventIdFromUrl();
                this.eventData = null;
                this.comments = [];
                
                console.log('活动ID:', this.eventId);
                
                if (this.eventId) {
                this.init();
                } else {
                this.showError('未找到活动ID');
                }
            }
            
            // 从URL获取活动ID
            getEventIdFromUrl() {
                // 主要从URL参数获取
                const urlParams = new URLSearchParams(window.location.search);
                let eventId = urlParams.get('id');
                
                // 如果URL参数没有，尝试从路径获取
                if (!eventId) {
                const path = window.location.pathname;
                // 匹配 /events/xxx/ 或 /events/xxx 格式
                const pathMatch = path.match(/\/events\/([a-f0-9-]+)(?:\/|$)/);
                eventId = pathMatch ? pathMatch[1] : null;
                }
                
                // 验证UUID格式
                if (eventId && this.isValidUUID(eventId)) {
                return eventId;
                }
                
                console.warn('无效的活动ID格式:', eventId);
                return null;
            }
            
            // 验证UUID格式
            isValidUUID(str) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                return uuidRegex.test(str);
            }
            
            async init() {
                if (!this.eventId) {
                    this.showError('无效的活动ID');
                    return;
                }
                
                await this.loadEventData();
            }
            
            // 加载活动数据
            async loadEventData() {
                try {
                    console.log('🔍 加载活动详情:', this.eventId);
                    
                    const { data: event, error } = await supabaseAdmin_d
                        .from('campus_events')
                        .select(`
                            *,
                            organizer:user_profiles!organizer_id(
                                auth0_user_id,
                                display_name,
                                oc_name,
                                avatar_url,
                                role,
                                major,
                                faculty_rank
                            ),
                            registrations:event_registrations(
                                user:user_profiles(
                                    auth0_user_id,
                                    display_name,
                                    oc_name,
                                    avatar_url
                                )
                            ),
                            comments:event_comments(
                                *,
                                user:user_profiles(
                                    auth0_user_id,
                                    display_name,
                                    oc_name,
                                    avatar_url
                                )
                            )
                        `)
                        .eq('id', this.eventId)
                        .single();
                    
                    if (error) {
                        throw new Error('活动不存在: ' + error.message);
                    }
                    
                    this.eventData = event;
                    this.comments = event.comments || [];
                    
                    console.log('✅ 活动详情加载成功:', this.eventData);
                    this.renderEvent();
                    
                } catch (error) {
                    console.error('❌ 加载活动详情失败:', error);
                    this.showError(error.message);
                }
            }
            
            // 渲染活动详情
            renderEvent() {
                document.getElementById('event-loading').style.display = 'none';
                document.getElementById('event-content').style.display = 'block';
                
                const eventContent = document.getElementById('event-content');
                eventContent.innerHTML = this.createEventHTML();
                
                // 绑定事件
                this.bindEvents();
            }
            
            // 创建活动详情HTML
            createEventHTML() {
                const event = this.eventData;
                const eventTypes = {
                    'lecture': '学术讲座',
                    'workshop': '工作坊',
                    'social': '社交活动',
                    'club': '社团活动',
                    'sports': '体育赛事',
                    'other': '其他活动'
                };
                
                const startTime = new Date(event.start_time);
                const endTime = event.end_time ? new Date(event.end_time) : null;
                const now = new Date();
                const isUpcoming = startTime > now;
                const isOngoing = startTime <= now && (!endTime || endTime >= now);
                
                return `
                    <!-- 活动头部 -->
                    <div class="event-header">
                        <div class="event-cover">
                            ${event.cover_image ? 
                                `<img src="${event.cover_image}" alt="${event.title}">` :
                                '<div style="width:100%;height:100%;background:linear-gradient(135deg, #106C6D 0%, #112074 100%);display:flex;align-items:center;justify-content:center;color:white;font-size:4rem;">🎉</div>'
                            }
                            <div class="event-cover-content">
                                <div class="event-type-badge">
                                    ${eventTypes[event.event_type] || '活动'}
                                </div>
                                <h1 class="event-title">${event.title}</h1>
                                <div class="event-meta-grid">
                                    <div class="meta-item">
                                        <span class="meta-icon">🕐</span>
                                        <span>${startTime.toLocaleString()}</span>
                                    </div>
                                    ${event.location ? `
                                        <div class="meta-item">
                                            <span class="meta-icon">📍</span>
                                            <span>${event.location}</span>
                                        </div>
                                    ` : ''}
                                    ${event.online_link ? `
                                        <div class="meta-item">
                                            <span class="meta-icon">🔗</span>
                                            <span>线上活动</span>
                                        </div>
                                    ` : ''}
                                    <div class="meta-item">
                                        <span class="meta-icon">👤</span>
                                        <span>${event.organizer?.oc_name || event.organizer?.display_name || '组织者'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 活动内容 -->
                    <div class="event-content">
                        <!-- 主要内容 -->
                        <div class="event-main">
                            <div class="event-description">
                                ${event.description || '<p>暂无活动描述</p>'}
                            </div>
                            
                            <!-- 评论区 -->
                            <div class="comments-section">
                                <div class="comments-header">
                                    <h3>💬 活动讨论</h3>
                                    <p>与其他参与者交流讨论</p>
                                </div>
                                
                                <div class="comment-form" id="comment-form">
                                    <textarea class="comment-input" placeholder="分享你的想法或提问..." id="comment-input"></textarea>
                                    <button class="comment-submit" onclick="eventDetailSystem.submitComment()">发表评论</button>
                                </div>
                                
                                <div class="comments-list" id="comments-list">
                                    ${this.createCommentsHTML()}
                                </div>
                            </div>
                        </div>
                        
                        <!-- 侧边栏 -->
                        <div class="event-sidebar">
                            <!-- 组织者信息 -->
                            <div class="sidebar-card">
                                <h4>👤 组织者</h4>
                                <div class="organizer-info">
                                    <img src="${event.organizer?.avatar_url || this.getDefaultAvatar()}" 
                                         alt="${event.organizer?.oc_name || event.organizer?.display_name}" 
                                         class="organizer-avatar"
                                         onerror="this.src='${this.getDefaultAvatar()}'">
                                    <div class="organizer-details">
                                        <h4>${event.organizer?.oc_name || event.organizer?.display_name || 'NBU成员'}</h4>
                                        <div class="organizer-role">
                                            ${event.organizer?.role === 'student' ? '🎓 学生' : 
                                              event.organizer?.role === 'faculty' ? '👨‍🏫 教职人员' : '👀 访客'}
                                            ${event.organizer?.major ? `· ${event.organizer.major}` : ''}
                                            ${event.organizer?.faculty_rank ? `· ${event.organizer.faculty_rank}` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 参与行动 -->
                            <div class="sidebar-card">
                                <h4>🎯 参与活动</h4>
                                <div class="action-buttons">
                                    <button class="action-btn primary" onclick="eventDetailSystem.registerForEvent()">
                                        ${isOngoing ? '立即参与' : '立即报名'}
                                    </button>
                                    ${event.online_link ? `
                                        <a href="${event.online_link}" target="_blank" class="action-btn secondary">
                                            🔗 加入会议
                                        </a>
                                    ` : ''}
                                    <a href="/events/" class="action-btn secondary">
                                        ← 返回列表
                                    </a>
                                </div>
                            </div>
                            
                            <!-- 参与者 -->
                            <div class="sidebar-card">
                                <h4>👥 参与者</h4>
                                <div class="participants-count">
                                    ${event.registrations?.length || 0} 人报名
                                    ${event.max_participants ? ` / ${event.max_participants} 人` : ''}
                                </div>
                                <div class="participants-list">
                                    ${event.registrations?.slice(0, 10).map(reg => `
                                        <img src="${reg.user?.avatar_url || this.getDefaultAvatar()}" 
                                             alt="${reg.user?.oc_name || reg.user?.display_name}" 
                                             class="participant-avatar"
                                             title="${reg.user?.oc_name || reg.user?.display_name}"
                                             onerror="this.src='${this.getDefaultAvatar()}'">
                                    `).join('') || '<div class="empty-state" style="padding:1rem;">暂无报名者</div>'}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // 创建评论HTML
            createCommentsHTML() {
                if (this.comments.length === 0) {
                    return '<div class="empty-state">暂无评论</div>';
                }
                
                return this.comments.map(comment => `
                    <div class="comment-item">
                        <img src="${comment.user?.avatar_url || this.getDefaultAvatar()}" 
                             alt="${comment.user?.oc_name || comment.user?.display_name}" 
                             class="comment-avatar"
                             onerror="this.src='${this.getDefaultAvatar()}'">
                        <div class="comment-content">
                            <div class="comment-header">
                                <span class="comment-author">${comment.user?.oc_name || comment.user?.display_name || '用户'}</span>
                                <span class="comment-time">${new Date(comment.created_at).toLocaleString()}</span>
                            </div>
                            <div class="comment-text">${comment.content}</div>
                        </div>
                    </div>
                `).join('');
            }
            
            // 绑定事件
            bindEvents() {
                // 评论表单显示/隐藏（根据登录状态）
                this.toggleCommentForm();
            }
            
            // 切换评论表单显示
            async toggleCommentForm() {
                const commentForm = document.getElementById('comment-form');
                const isAuthenticated = await this.checkAuth();
                
                if (!isAuthenticated) {
                    commentForm.innerHTML = `
                        <div class="empty-state">
                            <p>请先登录后发表评论</p>
                            <button class="comment-submit" onclick="nbuHandleLogin()">登录</button>
                        </div>
                    `;
                }
            }
            
            // 提交评论
            async submitComment() {
                if (!await this.checkAuth()) {
                    alert('请先登录后再发表评论');
                    return;
                }
                
                const commentInput = document.getElementById('comment-input');
                const content = commentInput.value.trim();
                
                if (!content) {
                    alert('请输入评论内容');
                    return;
                }
                
                try {
                    const user = await nbuAuthClient.getUser();
                    const userProfile = await handleUserProfile(user);
                    
                    const { data, error } = await supabaseAdmin
                        .from('event_comments')
                        .insert([{
                            event_id: this.eventId,
                            user_id: userProfile.auth0_user_id,
                            content: content
                        }])
                        .select(`
                            *,
                            user:user_profiles(
                                auth0_user_id,
                                display_name,
                                oc_name,
                                avatar_url
                            )
                        `)
                        .single();
                    
                    if (error) {
                        throw new Error('评论失败: ' + error.message);
                    }
                    
                    // 添加新评论到列表
                    this.comments.unshift(data);
                    document.getElementById('comments-list').innerHTML = this.createCommentsHTML();
                    
                    // 清空输入框
                    commentInput.value = '';
                    
                    console.log('✅ 评论发表成功');
                    
                } catch (error) {
                    console.error('❌ 评论发表失败:', error);
                    alert('评论失败: ' + error.message);
                }
            }
            
            // 报名活动
            async registerForEvent() {
                if (!await this.checkAuth()) {
                    alert('请先登录后再报名活动');
                    return;
                }
                
                try {
                    const user = await nbuAuthClient.getUser();
                    const userProfile = await handleUserProfile(user);
                    
                    const { data, error } = await supabaseAdmin
                        .from('event_registrations')
                        .insert([{
                            event_id: this.eventId,
                            user_id: userProfile.auth0_user_id
                        }])
                        .select()
                        .single();
                    
                    if (error) {
                        if (error.code === '23505') { // 唯一约束违反
                            alert('您已经报名过此活动');
                        } else {
                            throw new Error('报名失败: ' + error.message);
                        }
                        return;
                    }
                    
                    alert('🎉 报名成功！');
                    // 重新加载活动数据更新参与者列表
                    await this.loadEventData();
                    
                } catch (error) {
                    console.error('❌ 报名失败:', error);
                    alert('报名失败: ' + error.message);
                }
            }
            
            // 检查用户登录状态
            async checkAuth() {
                if (typeof nbuAuthClient === 'undefined') return false;
                return await nbuAuthClient.isAuthenticated();
            }
            
            // 获取默认头像
            getDefaultAvatar() {
                return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSI0MCIgZmlsbD0jQ0VDRkQxLz4KPHBhdGggZD0iTTQwIDE2MEM0MCAxMzEuMDQ2IDYzLjA0NiAxMDggOTIgMTA4SDEwOEMxMzYuOTU0IDEwOCAxNjAgMTMxLjA0NiAxNjAgMTYwVjE4MEg0MFYxNjBaIiBmaWxsPSIjQ0VDRkQxIi8+Cjwvc3ZnPg==';
            }
            
            // 显示错误
            showError(message) {
                document.getElementById('event-loading').style.display = 'none';
                document.getElementById('event-error').style.display = 'block';
                document.getElementById('error-message').textContent = message;
            }
        }
        
        // 创建全局实例
        const eventDetailSystem = new EventDetailSystem();