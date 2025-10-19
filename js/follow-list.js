const supabaseUrl_g = "https://grgpsujmjbeuphwvxhpg.supabase.co";
const supabaseServiceKey_g = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3BzdWptamJldXBod3Z4aHBnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTIzNzExNCwiZXhwIjoyMDc0ODEzMTE0fQ.hy4_n74vuailNkPHWkt9YWINfQFsNuwLHNcg7knUlL4";
const supabaseAdmin_g = supabase.createClient(supabaseUrl_g, supabaseServiceKey_g);

// follow-list.js - 关注列表功能
class FollowListManager {
    constructor(followType) {
        this.followType = followType;
        this.currentUserId = null;
        this.init();
    }
    
        async init() {
            console.log(`🚀 初始化关注列表: ${this.followType}`);
            try {
                // 添加延迟，确保其他脚本已加载
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // 检查必要的全局变量
                if (typeof supabaseClient === 'undefined') {
                    throw new Error('Supabase客户端未加载');
                }
                
                if (typeof nbuAuthClient === 'undefined' && typeof initializeNBUAuth === 'function') {
                    console.log('🔄 初始化Auth客户端...');
                    await initializeNBUAuth();
                }
                
                if (typeof nbuAuthClient === 'undefined') {
                    throw new Error('Auth客户端未初始化');
                }
                
                // 检查登录状态
                const isAuthenticated = await nbuAuthClient.isAuthenticated();
                if (!isAuthenticated) {
                    this.showError('请先登录查看关注列表');
                    return;
                }
                
                // 获取当前用户
                const user = await nbuAuthClient.getUser();
                if (window.currentUserProfile) {
                    this.currentUserId = window.currentUserProfile.auth0_user_id;
                } else if (window.handleUserProfile && typeof window.handleUserProfile === 'function') {
                    const userProfile = await window.handleUserProfile(user);
                    this.currentUserId = userProfile.auth0_user_id;
                } else {
                    // 备用方案：直接从Supabase查询
                    const { data: userProfile } = await supabaseClient
                        .from('user_profiles')
                        .select('auth0_user_id')
                        .eq('auth0_user_id', user.sub)
                        .single();
                    
                    if (userProfile) {
                        this.currentUserId = userProfile.auth0_user_id;
                    } else {
                        throw new Error('无法获取用户ID');
                    }
                }
                
                if (typeof socialManager !== 'undefined') {
                    socialManager.setCurrentUser(this.currentUserId);
                }
                
                console.log('✅ 初始化完成，用户ID:', this.currentUserId);
                
                this.updateUI();
                await this.loadFollowList();
                this.bindEvents();
                
            } catch (error) {
                console.error('❌ 初始化失败:', error);
                this.showError('初始化失败: ' + error.message);
            }
        }
        
    
    async initializeAuth() {
        try {
            console.log("🔐 初始化认证...");
            
            // 等待必要的库加载
            if (typeof auth0 === 'undefined') {
                console.log("⏳ 等待Auth0库加载...");
                await new Promise(resolve => {
                    const checkAuth0 = setInterval(() => {
                        if (typeof auth0 !== 'undefined') {
                            clearInterval(checkAuth0);
                            resolve();
                        }
                    }, 100);
                });
            }
            
            if (typeof nbuAuthClient === 'undefined') {
                console.log("🔄 初始化Auth客户端...");
                if (typeof initializeNBUAuth !== 'undefined') {
                    await initializeNBUAuth();
                }
            }
            
            if (nbuAuthClient) {
                const isAuthenticated = await nbuAuthClient.isAuthenticated();
                if (isAuthenticated) {
                    const user = await nbuAuthClient.getUser();
                    if (typeof handleUserProfile !== 'undefined') {
                        const userProfile = await handleUserProfile(user);
                        this.currentUserId = userProfile.auth0_user_id;
                    } else {
                        // 备用方案：直接使用Auth0用户ID
                        this.currentUserId = user.sub;
                    }
                    
                    if (typeof socialManager !== 'undefined') {
                        socialManager.setCurrentUser(this.currentUserId);
                    }
                    
                    console.log("✅ 认证成功，用户ID:", this.currentUserId);
                }
            }
        } catch (error) {
            console.error('❌ 认证初始化失败:', error);
        }
    }
    
    updateUI() {
        // 更新页面标题
        const title = this.followType === 'following' ? '我的关注' : '我的粉丝';
        const subtitle = this.followType === 'following' ? 
            '查看你关注的所有用户' : '查看所有关注你的用户';
        
        document.getElementById('page-title').textContent = title;
        document.getElementById('page-subtitle').textContent = subtitle;
        document.title = title + ' - NBU';
        
        // 更新导航按钮状态
        const followingBtn = document.getElementById('following-btn');
        const followersBtn = document.getElementById('followers-btn');
        
        if (this.followType === 'following') {
            followingBtn.classList.add('active');
            followersBtn.classList.remove('active');
        } else {
            followersBtn.classList.add('active');
            followingBtn.classList.remove('active');
        }
    }
    
    async loadFollowList() {
        try {
            console.log(`👥 加载${this.followType === 'following' ? '关注' : '粉丝'}列表`);
            
            let userList;
            
            if (this.followType === 'following') {
                userList = await this.getFollowingList();
            } else {
                userList = await this.getFollowersList();
            }
            
            this.renderFollowList(userList);
            
        } catch (error) {
            console.error('❌ 加载列表失败:', error);
            this.showError('加载失败: ' + error.message);
        }
    }
    
    // 获取关注列表 - 修复版
    async getFollowingList() {
        // 1. 先获取关注关系
        const { data: follows, error: followError } = await supabaseClient
            .from('follows')
            .select('following_id, created_at')
            .eq('follower_id', this.currentUserId)
            .order('created_at', { ascending: false });
        
        if (followError) throw followError;
        
        if (!follows || follows.length === 0) return [];
        
        // 2. 批量获取用户信息
        const followingIds = follows.map(f => f.following_id);
        
        const { data: users, error: userError } = await supabaseClient
            .from('user_profiles')
            .select('*')
            .in('auth0_user_id', followingIds);
        
        if (userError) throw userError;
        
        // 3. 合并数据并保持排序
        return follows.map(follow => {
            const user = users.find(u => u.auth0_user_id === follow.following_id);
            return user ? { ...user, follow_created_at: follow.created_at } : null;
        }).filter(Boolean);
    }

    // 获取粉丝列表 - 修复版
    async getFollowersList() {
        // 1. 先获取粉丝关系
        const { data: follows, error: followError } = await supabaseClient
            .from('follows')
            .select('follower_id, created_at')
            .eq('following_id', this.currentUserId)
            .order('created_at', { ascending: false });
        
        if (followError) throw followError;
        
        if (!follows || follows.length === 0) return [];
        
        // 2. 批量获取用户信息
        const followerIds = follows.map(f => f.follower_id);
        
        const { data: users, error: userError } = await supabaseClient
            .from('user_profiles')
            .select('*')
            .in('auth0_user_id', followerIds);
        
        if (userError) throw userError;
        
        // 3. 合并数据并保持排序
        return follows.map(follow => {
            const user = users.find(u => u.auth0_user_id === follow.follower_id);
            return user ? { ...user, follow_created_at: follow.created_at } : null;
        }).filter(Boolean);
    }
        
    // 渲染列表
    renderFollowList(userList) {
        const container = document.getElementById('follow-list');
        
        if (!userList || userList.length === 0) {
            const emptyText = this.followType === 'following' ? 
                '你还没有关注任何用户' : '还没有用户关注你';
            
            container.innerHTML = `
                <div class="empty-state">
                    <h3>${emptyText}</h3>
                    <p>去 <a href="/members/">成员目录</a> 发现更多用户</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = userList.map(user => this.createFollowItem(user)).join('');
        
        // 初始化关注按钮
        this.initializeFollowButtons();
    }
    
    // 创建关注项
    createFollowItem(user) {
        if (!user) return '';
        
        const roleDisplay = {
            'student': '🎓 学生',
            'faculty': '👨‍🏫 教职',
            'visitor': '👀 访客'
        };
        
        const displayName = user.oc_name || user.display_name || 'NBU用户';
        const isOwnProfile = user.auth0_user_id === this.currentUserId;
        
        // 优化头像URL
        const avatarUrl = this.getOptimizedAvatarUrl(user.avatar_url);
        
        return `
            <div class="follow-item" data-user-id="${user.auth0_user_id}">
                <img src="${avatarUrl}" 
                     alt="${displayName}"
                     class="follow-avatar"
                     onerror="this.src='${this.getDefaultAvatar()}'">
                
                <div class="follow-info">
                    <h3 class="follow-name">${displayName}</h3>
                    <p class="follow-role">${roleDisplay[user.role] || '未知身份'}</p>
                    
                    <div class="follow-meta">
                        ${user.major ? `
                            <span class="meta-item">${user.major}</span>
                        ` : ''}
                        
                        ${user.student_id ? `
                            <span class="meta-item">${user.student_id}</span>
                        ` : ''}
                    </div>
                    
                    ${user.bio ? `
                        <p style="margin-top: 0.5rem; color: #6c757d; font-size: 0.9rem; line-height: 1.4;">
                            ${user.bio.substring(0, 100)}${user.bio.length > 100 ? '...' : ''}
                        </p>
                    ` : ''}
                </div>
                
                <div class="follow-actions">
                    <a href="/profile/?user=${encodeURIComponent(user.auth0_user_id)}" 
                       class="action-btn">
                        查看资料
                    </a>
                    
                    ${!isOwnProfile ? `
                        <button class="action-btn" 
                                onclick="window.followListManager.toggleFollow('${user.auth0_user_id}')"
                                id="follow-btn-${user.auth0_user_id}">
                            加载中...
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    // 优化头像URL
    getOptimizedAvatarUrl(originalUrl) {
        if (!originalUrl) return this.getDefaultAvatar();
        
        // 如果是Supabase存储的图片，使用图片转换功能
        if (originalUrl.includes('supabase.co/storage/v1/object/public/avatars/')) {
            return originalUrl + '?width=120&height=120&quality=80&fit=cover';
        }
        
        return originalUrl;
    }
    
    // 获取默认头像
    getDefaultAvatar() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSI0MCIgZmlsbD0jQ0VDRkQxLz4KPHBhdGggZD0iTTQwIDE2MEM0MCAxMzEuMDQ2IDYzLjA0NiAxMDggOTIgMTA4SDEwOEMxMzYuOTU0IDEwOCAxNjAgMTMxLjA0NiAxNjAgMTYwVjE4MEg0MFYxNjBaIiBmaWxsPSIjQ0VDRkQxIi8+Cjwvc3ZnPg==';
    }
    
    // 绑定事件
    bindEvents() {
        console.log("🔗 绑定事件监听器");
        // 这里可以添加其他事件监听
    }
    
    // 初始化关注按钮
    async initializeFollowButtons() {
        const buttons = document.querySelectorAll('[id^="follow-btn-"]');
        console.log(`🔄 初始化 ${buttons.length} 个关注按钮`);
        
        for (const button of buttons) {
            const userId = button.id.replace('follow-btn-', '');
            await this.updateFollowButton(button, userId);
        }
    }
    
    // 更新关注按钮状态
    async updateFollowButton(button, targetUserId) {
        try {
            button.disabled = true;
            button.textContent = '...';
            button.classList.add('nbu-loading');
            
            // 检查socialManager是否可用
            if (typeof socialManager === 'undefined') {
                console.warn('❌ socialManager未定义，无法检查关注状态');
                button.textContent = '关注';
                button.disabled = false;
                return;
            }
            
            const isFollowing = await socialManager.isFollowing(targetUserId);
            
            if (isFollowing) {
                button.classList.add('primary');
                button.textContent = '已关注';
            } else {
                button.classList.remove('primary');
                button.textContent = '关注';
            }
            
            button.disabled = false;
            button.classList.remove('nbu-loading');
            
        } catch (error) {
            console.error('❌ 更新关注按钮失败:', error);
            button.textContent = '加载失败';
            button.disabled = false;
            button.classList.remove('nbu-loading');
        }
    }
    
    // 切换关注状态
    async toggleFollow(targetUserId) {
        const button = document.getElementById(`follow-btn-${targetUserId}`);
        
        if (!button || button.disabled) return;
        
        try {
            button.disabled = true;
            button.textContent = '处理中...';
            
            if (typeof socialManager === 'undefined') {
                throw new Error('社交功能未初始化');
            }
            
            const isFollowing = await socialManager.isFollowing(targetUserId);
            
            if (isFollowing) {
                await socialManager.unfollowUser(targetUserId);
                button.classList.remove('primary');
                button.textContent = '关注';
                console.log('✅ 取消关注成功');
            } else {
                await socialManager.followUser(targetUserId);
                button.classList.add('primary');
                button.textContent = '已关注';
                console.log('✅ 关注成功');
            }
            
        } catch (error) {
            console.error('❌ 关注操作失败:', error);
            alert('操作失败: ' + error.message);
            button.textContent = '操作失败';
        } finally {
            button.disabled = false;
        }
    }
    
    // 显示错误
    showError(message) {
        const container = document.getElementById('follow-list');
        container.innerHTML = `
            <div class="empty-state">
                <h3>❌ 加载失败</h3>
                <p>${message}</p>
                <button onclick="window.followListManager.init()" class="action-btn primary">
                    重试
                </button>
            </div>
        `;
    }
}

