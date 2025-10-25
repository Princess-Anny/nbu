const supabaseUrl_g = "https://grgpsujmjbeuphwvxhpg.supabase.co";
const supabaseServiceKey_g = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3BzdWptamJldXBod3Z4aHBnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTIzNzExNCwiZXhwIjoyMDc0ODEzMTE0fQ.hy4_n74vuailNkPHWkt9YWINfQFsNuwLHNcg7knUlL4";
const supabaseAdmin_g = supabase.createClient(supabaseUrl_g, supabaseServiceKey_g);
// nbu-gallery.js - 增强版（支持查看特定用户画廊）
class GalleryManager {
    constructor() {
        this.allPosts = [];
        this.filteredPosts = [];
        this.currentFilter = 'all'; // 'all' 或 'user'
        this.targetUserId = null;
        this.targetUserProfile = null;
        this.init();
    }
    
    async init() {
        // 检查URL参数
        const urlParams = new URLSearchParams(window.location.search);
        this.targetUserId = urlParams.get('user');
        
        if (this.targetUserId) {
            // 查看特定用户画廊
            this.currentFilter = 'user';
            await this.loadTargetUserProfile();
            await this.loadUserGalleryPosts();
            this.updateUIForUserGallery();
        } else {
            // 查看全部画廊
            await this.loadGalleryPosts();
        }
        
        this.renderStats();
        this.renderGallery();
    }
    
    // 加载目标用户资料
    async loadTargetUserProfile() {
        try {
            const decodedUserId = decodeURIComponent(this.targetUserId);
            const { data: userProfile, error } = await supabaseAdmin_g
                .from('user_profiles')
                .select('*')
                .eq('auth0_user_id', decodedUserId)
                .maybeSingle();
            
            if (error || !userProfile) {
                console.warn('无法加载用户资料，显示匿名信息');
                this.targetUserProfile = { display_name: '未知用户' };
            } else {
                this.targetUserProfile = userProfile;
            }
            
        } catch (error) {
            console.error('加载用户资料失败:', error);
            this.targetUserProfile = { display_name: '未知用户' };
        }
    }
    
    // 加载用户特定的画廊作品
    async loadUserGalleryPosts() {
        try {
            console.log('🖼️ 加载用户画廊作品:', this.targetUserId);
            
            const decodedUserId = decodeURIComponent(this.targetUserId);
            
            const { data: posts, error } = await supabaseAdmin_g
                .from('gallery_posts')
                .select(`
                    *,
                    user_profiles (
                        display_name,
                        avatar_url,
                        oc_name
                    )
                `)
                .eq('user_id', decodedUserId)
                .eq('is_public', true)
                .order('created_at', { ascending: false });
            
            if (error) {
                throw new Error('加载用户作品失败: ' + error.message);
            }
            
            this.allPosts = posts || [];
            this.filteredPosts = [...this.allPosts];
            
            console.log(`✅ 加载用户作品成功: ${this.allPosts.length} 个作品`);
            
        } catch (error) {
            console.error('❌ 加载用户画廊失败:', error);
            this.showError('加载用户作品失败: ' + error.message);
        }
    }
    
    // 加载全部画廊作品（原有逻辑）
    async loadGalleryPosts() {
        try {
            console.log('🖼️ 加载全部画廊作品...');
            
            const { data: posts, error } = await supabaseAdmin_g
                .from('gallery_posts')
                .select(`
                    *,
                    user_profiles (
                        display_name,
                        avatar_url,
                        oc_name
                    )
                `)
                .eq('is_public', true)
                .order('created_at', { ascending: false });
            
            if (error) {
                throw new Error('加载作品失败: ' + error.message);
            }
            
            this.allPosts = posts || [];
            this.filteredPosts = [...this.allPosts];
            
            console.log(`✅ 加载成功: ${this.allPosts.length} 个作品`);
            
        } catch (error) {
            console.error('❌ 加载画廊失败:', error);
            this.showError('加载作品失败: ' + error.message);
        }
    }
    
    // 为用户画廊更新UI
    updateUIForUserGallery() {
        const header = document.querySelector('.gallery-header');
        const actions = document.querySelector('.gallery-actions');
        
        if (header && this.targetUserProfile) {
            const userName = this.targetUserProfile.oc_name || this.targetUserProfile.display_name || '该用户';
            header.innerHTML = `
                <h1>🎨 ${userName}的画廊</h1>
                <a href="/gallery/" class="btn btn-outline-primary btn-sm" style="margin-top: 1rem;">
                    ← 返回NBU总画廊
                </a>
            `;
        }
        
        if (actions) {
            // 隐藏上传按钮（当查看他人画廊时）
            const uploadBtn = actions.querySelector('.upload-btn');
            if (uploadBtn) {
                uploadBtn.style.display = 'none';
            }
        }
    }
    
    // 渲染统计信息
    renderStats() {
        const totalPosts = this.allPosts.length;
        const today = new Date().toISOString().split('T')[0];
        const todayPosts = this.allPosts.filter(post => 
            post.created_at.startsWith(today)
        ).length;
        
        document.getElementById('total-posts').textContent = totalPosts;
        document.getElementById('today-posts').textContent = todayPosts;
        
        // 如果是用户画廊，更新统计标签
        if (this.currentFilter === 'user') {
            const totalStat = document.querySelector('.gallery-stat:first-child .stat-label');
            if (totalStat) {
                totalStat.textContent = '作品数量';
            }
            
            const todayStat = document.querySelector('.gallery-stat:last-child .stat-label');
            if (todayStat) {
                todayStat.textContent = '公开作品';
            }
        }
    }
    
    // 渲染画廊网格
    renderGallery() {
        const grid = document.getElementById('gallery-grid');
        
        if (this.filteredPosts.length === 0) {
            if (this.currentFilter === 'user') {
                const userName = this.targetUserProfile?.oc_name || this.targetUserProfile?.display_name || '该用户';
                grid.innerHTML = `
                    <div class="empty-state">
                        <h3>${userName}还没有发布作品</h3>
                        <a href="/gallery/" class="btn btn-outline-primary" style="margin-top: 1rem;">
                            ← 返回NBU总画廊
                        </a>
                    </div>
                `;
            } else {
                grid.innerHTML = `
                    <div class="empty-state">
                        <h3>还没有作品</h3>
                    </div>
                `;
            }
            return;
        }
        
        grid.innerHTML = this.filteredPosts.map(post => this.createGalleryItem(post)).join('');
    }
    
    // 创建画廊项 - 添加点击事件
    createGalleryItem(post) {
        const authorName = post.user_profiles?.oc_name || post.user_profiles?.display_name || '匿名用户';
        const authorAvatar = post.user_profiles?.avatar_url || this.getDefaultAvatar();
        const postDate = new Date(post.created_at).toLocaleDateString('zh-CN');
        
        return `
            <div class="gallery-item" data-post-id="${post.id}">
                <img src="${post.image_url}" 
                    alt="${post.title}" 
                    class="gallery-image"
                    onclick="showImageViewer('${post.id}')"
                    onerror="this.src='${this.getDefaultImage()}'">
                
                <div class="gallery-content">
                    <h3 class="gallery-title">${post.title}</h3>
                    
                    ${post.description ? `
                        <p class="gallery-description">${post.description}</p>
                    ` : ''}
                    
                    ${post.tags && post.tags.length > 0 ? `
                        <div class="gallery-tags">
                            ${post.tags.map(tag => `
                                <span class="gallery-tag">${tag}</span>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="gallery-meta">
                        <div class="gallery-author">
                            <img src="${authorAvatar}" 
                                alt="${authorName}" 
                                class="author-avatar"
                                onerror="this.src='${this.getDefaultAvatar()}'">
                            <span>${authorName}</span>
                        </div>
                        <div class="gallery-date">${postDate}</div>
                    </div>
                </div>
            </div>
        `;
    }
    // 获取默认头像（保持不变）
    getDefaultAvatar() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSI0MCIgZmlsbD0jQ0VDRkQxLz4KPHBhdGggZD0iTTQwIDE2MEM0MCAxMzEuMDQ2IDYzLjA0NiAxMDggOTIgMTA4SDEwOEMxMzYuOTU0IDEwOCAxNjAgMTMxLjA0NiAxNjAgMTYwVjE4MEg0MFYxNjBaIiBmaWxsPSIjQ0VDRkQxIi8+Cjwvc3ZnPg==';
    }
    
    // 获取默认图片（保持不变）
    getDefaultImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjEyMCIgcj0iNDAiIGZpbGw9I0NFQ0ZEMS8+CjxwYXRoIGQ9Ik0xMjAgMjAwQzEyMCAxNjUuNDY2IDE0Ni40NjYgMTQwIDE4MCAxNDBIMjIwQzI1My41MzQgMTQwIDI4MCAxNjUuNDY2IDI4MCAyMDBWMjQwSDEyMFYyMDBaIiBmaWxsPSIjQ0VDRkQxIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMjcwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOUE5/Q0FEIiBmb250LXNpemU9IjE0IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiPsSsysew7rXEtcS1xLXE8tK7tPPK9sDvPC90ZXh0Pgo8L3N2Zz4=';
    }
    
    // 显示错误
    showError(message) {
        const grid = document.getElementById('gallery-grid');
        grid.innerHTML = `
            <div class="empty-state">
                <h3>❌ 加载失败</h3>
                <p>${message}</p>
                <button onclick="galleryManager.init()" class="upload-btn" style="margin-top: 1rem;">
                    重试
                </button>
            </div>
        `;
    }
}

// 创建全局实例
const galleryManager = new GalleryManager();

// 图片查看器功能
class ImageViewer {
    constructor() {
        this.currentIndex = 0;
        this.posts = [];
        this.isOpen = false;
    }
    
    // 打开图片查看器
    openViewer(posts, startIndex = 0) {
        this.posts = posts;
        this.currentIndex = startIndex;
        this.isOpen = true;
        
        this.showImage();
        this.showModal();
    }
    
    // 显示图片
    showImage() {
        if (this.posts.length === 0) return;
        
        const post = this.posts[this.currentIndex];
        
        // 设置图片
        document.getElementById('viewer-image').src = post.image_url;
        document.getElementById('viewer-title').textContent = post.title;
        document.getElementById('viewer-description').textContent = post.description || '暂无描述';
        
        // 设置标签
        const tagsContainer = document.getElementById('viewer-tags');
        if (post.tags && post.tags.length > 0) {
            tagsContainer.innerHTML = post.tags.map(tag => 
                `<span class="nbu-image-tag">${tag}</span>`
            ).join('');
        } else {
            tagsContainer.innerHTML = '';
        }
        
        // 设置作者信息
        const authorName = post.user_profiles?.oc_name || post.user_profiles?.display_name || '匿名用户';
        const authorAvatar = post.user_profiles?.avatar_url || this.getDefaultAvatar();
        const postDate = new Date(post.created_at).toLocaleDateString('zh-CN');
        
        document.getElementById('viewer-author-avatar').src = authorAvatar;
        document.getElementById('viewer-author-name').textContent = authorName;
        document.getElementById('viewer-date').textContent = postDate;
        
        // 更新删除按钮状态
        imageDeleter.updateDeleteButton(post);
        
        // 更新导航按钮状态
        this.updateNavButtons();
    }
    
    // 显示模态框
    showModal() {
        const modal = document.getElementById('nbu-image-viewer-modal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // 防止背景滚动
        }
    }
    
    // 隐藏模态框
    hideModal() {
        const modal = document.getElementById('nbu-image-viewer-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // 恢复滚动
            this.isOpen = false;
        }
    }
    
    // 导航图片
    navigate(direction) {
        this.currentIndex += direction;
        
        // 循环导航
        if (this.currentIndex < 0) {
            this.currentIndex = this.posts.length - 1;
        } else if (this.currentIndex >= this.posts.length) {
            this.currentIndex = 0;
        }
        
        this.showImage();
    }
    
    // 更新导航按钮状态
    updateNavButtons() {
        // 如果只有一张图片，隐藏导航按钮
        const prevBtn = document.querySelector('.nbu-prev-btn');
        const nextBtn = document.querySelector('.nbu-next-btn');
        
        if (this.posts.length <= 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'flex';
            nextBtn.style.display = 'flex';
        }
    }
    
    // 获取默认头像
    getDefaultAvatar() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSI0MCIgZmlsbD0jQ0VDRkQxLz4KPHBhdGggZD0iTTQwIDE2MEM0MCAxMzEuMD0NjggNjMuMDQ2IDEwOCA5MkgxMDhDMTM2Ljk1NCA5MiAxNjAgMTE3LjA0NiAxNjAgMTQ2VjE2OEg0MFYxNjBaIiBmaWxsPSIjQ0VDRkQxIi8+Cjwvc3ZnPg==';
    }
}

// 创建全局实例
const imageViewer = new ImageViewer();

// 全局函数
function showImageViewer(postId) {
    const posts = galleryManager.filteredPosts;
    const startIndex = posts.findIndex(post => post.id === postId);
    
    if (startIndex !== -1) {
        imageViewer.openViewer(posts, startIndex);
    }
}

function hideImageViewer() {
    imageViewer.hideModal();
}

function navigateImage(direction) {
    imageViewer.navigate(direction);
}

// 键盘导航支持
document.addEventListener('keydown', (e) => {
    if (!imageViewer.isOpen) return;
    
    switch(e.key) {
        case 'Escape':
            if (document.getElementById('nbu-delete-confirm-modal').style.display === 'flex') {
                hideDeleteConfirmModal();
            } else {
                hideImageViewer();
            }
            break;
        case 'ArrowLeft':
            navigateImage(-1);
            break;
        case 'ArrowRight':
            navigateImage(1);
            break;
        case 'Delete':
        case 'Backspace':
            if (imageDeleter.canDeletePost(imageViewer.posts[imageViewer.currentIndex])) {
                confirmDeleteImage();
            }
            break;
    }
});

// 图片删除功能
class ImageDeleter {
    constructor() {
        this.currentPost = null;
    }
    
    // 检查用户是否有删除权限
    canDeletePost(post) {
        if (!currentUserProfile) return false;
        return post.user_id === currentUserProfile.auth0_user_id;
    }
    
    // 显示/隐藏删除按钮
    updateDeleteButton(post) {
        const deleteBtn = document.getElementById('delete-image-btn');
        this.currentPost = post;
        
        if (this.canDeletePost(post)) {
            deleteBtn.style.display = 'block';
        } else {
            deleteBtn.style.display = 'none';
        }
    }
    
    // 确认删除
    confirmDelete() {
        if (!this.currentPost) return;
        
        const modal = document.getElementById('nbu-delete-confirm-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }
    
    // 执行删除
    async executeDelete() {
        if (!this.currentPost) return;
        
        try {
            console.log('🗑️ 开始删除作品:', this.currentPost.id);
            
            // 1. 从Supabase存储中删除图片文件
            await this.deleteImageFile(this.currentPost.image_url);
            
            // 2. 从数据库中删除记录
            const { error } = await supabaseAdmin_g
                .from('gallery_posts')
                .delete()
                .eq('id', this.currentPost.id);
            
            if (error) {
                throw new Error('删除数据库记录失败: ' + error.message);
            }
            
            console.log('✅ 作品删除成功');
            
            // 3. 更新UI
            this.handleDeleteSuccess();
            
        } catch (error) {
            console.error('❌ 删除失败:', error);
            this.handleDeleteError(error.message);
        }
    }
    
    // 删除图片文件
    async deleteImageFile(imageUrl) {
        try {
            // 从URL中提取文件路径
            const urlParts = imageUrl.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const userId = this.currentPost.user_id;
            const cleanUserId = this.sanitizeUserId(userId);
            const filePath = `gallery/${cleanUserId}/${fileName}`;
            
            console.log('🗑️ 删除图片文件:', filePath);
            
            const { error } = await supabaseAdmin_g.storage
                .from('avatars')
                .remove([filePath]);
            
            if (error) {
                console.warn('⚠️ 删除图片文件失败（可能文件不存在）:', error.message);
                // 不抛出错误，继续删除数据库记录
            }
            
        } catch (error) {
            console.warn('⚠️ 删除图片文件时出错:', error);
            // 不抛出错误，继续删除数据库记录
        }
    }
    
    // 处理删除成功
    handleDeleteSuccess() {
        // 隐藏所有模态框
        this.hideAllModals();
        
        // 从本地数据中移除已删除的作品
        const postIndex = galleryManager.allPosts.findIndex(
            post => post.id === this.currentPost.id
        );
        
        if (postIndex !== -1) {
            galleryManager.allPosts.splice(postIndex, 1);
            galleryManager.filteredPosts = [...galleryManager.allPosts];
        }
        
        // 重新渲染画廊
        galleryManager.renderStats();
        galleryManager.renderGallery();
        
        // 显示成功消息
        alert('✅ 作品已成功删除！');
        
        this.currentPost = null;
    }
    
    // 处理删除错误
    handleDeleteError(errorMessage) {
        this.hideDeleteConfirmModal();
        alert('❌ 删除失败: ' + errorMessage);
    }
    
    // 隐藏所有模态框
    hideAllModals() {
        this.hideDeleteConfirmModal();
        hideImageViewer();
    }
    
    // 隐藏删除确认模态框
    hideDeleteConfirmModal() {
        const modal = document.getElementById('nbu-delete-confirm-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    // 清理用户ID
    sanitizeUserId(userId) {
        return userId
            .replace(/^auth0\|/, '')
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .substring(0, 50);
    }
}

// 创建全局实例
const imageDeleter = new ImageDeleter();

// 全局函数
function confirmDeleteImage() {
    imageDeleter.confirmDelete();
}

function deleteCurrentImage() {
    imageDeleter.executeDelete();
}

function hideDeleteConfirmModal() {
    imageDeleter.hideDeleteConfirmModal();
}