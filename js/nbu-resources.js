const supabaseUrl_r = "https://grgpsujmjbeuphwvxhpg.supabase.co";
const supabaseServiceKey_r = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3BzdWptamJldXBod3Z4aHBnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTIzNzExNCwiZXhwIjoyMDc0ODEzMTE0fQ.hy4_n74vuailNkPHWkt9YWINfQFsNuwLHNcg7knUlL4";
const supabaseAdmin_r = supabase.createClient(supabaseUrl_r, supabaseServiceKey_r);
// nbu-resources.js - 学术资源系统
class AcademicResourcesSystem {
    constructor() {
        this.resources = [];
        this.filteredResources = [];
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.filters = {
            search: '',
            type: '',
            major: '',
            sort: 'newest',
            officialOnly: false
        };
        this.init();
    }
    
    async init() {
        console.log('📚 初始化学术资源系统');
        await this.loadMajors();
        await this.loadResources();
        this.bindEvents();
    }
    
    // 加载专业列表
    async loadMajors() {
        try {
            // 从现有用户资料中获取所有专业
            const { data: majorsData, error } = await supabaseAdmin_r
                .from('user_profiles')
                .select('major')
                .not('major', 'is', null)
                .not('major', 'eq', '');
            
            if (error) throw error;
            
            // 去重并排序
            const uniqueMajors = [...new Set(majorsData.map(m => m.major))].sort();
            
            // 填充专业筛选器
            const majorFilter = document.getElementById('major-filter');
            if (majorFilter) {
                uniqueMajors.forEach(major => {
                    const option = document.createElement('option');
                    option.value = major;
                    option.textContent = major;
                    majorFilter.appendChild(option);
                });
            }
            
            // 填充上传表单的专业选择
            const uploadMajor = document.getElementById('resource-major');
            if (uploadMajor) {
                uniqueMajors.forEach(major => {
                    const option = document.createElement('option');
                    option.value = major;
                    option.textContent = major;
                    uploadMajor.appendChild(option);
                });
            }
            
        } catch (error) {
            console.error('❌ 加载专业列表失败:', error);
        }
    }
    
    // 加载资源数据
    async loadResources() {
        try {
            console.log('🔍 加载学术资源...');
            
            let query = supabaseAdmin_r
                .from('academic_resources')
                .select(`
                    *,
                    user_profiles!inner (
                        display_name,
                        oc_name,
                        role
                    )
                `)
                .eq('is_approved', true);
            
            // 应用排序
            switch (this.filters.sort) {
                case 'newest':
                    query = query.order('created_at', { ascending: false });
                    break;
                case 'popular':
                    query = query.order('view_count', { ascending: false });
                    break;
                case 'downloads':
                    query = query.order('download_count', { ascending: false });
                    break;
                case 'rating':
                    query = query.order('average_rating', { ascending: false });
                    break;
            }
            
            const { data: resources, error } = await query;
            
            if (error) {
                throw new Error('加载资源失败: ' + error.message);
            }
            
            this.resources = resources || [];
            this.applyFilters();
            
            console.log(`✅ 加载成功: ${this.resources.length} 个资源`);
            
        } catch (error) {
            console.error('❌ 加载资源失败:', error);
            this.showError('加载资源失败: ' + error.message);
        }
    }
    
    // 应用筛选条件
    applyFilters() {
        this.filteredResources = this.resources.filter(resource => {
            // 搜索筛选
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                const searchFields = [
                    resource.title,
                    resource.description,
                    resource.course_name,
                    resource.course_code,
                    resource.user_profiles?.display_name,
                    resource.user_profiles?.oc_name
                ].filter(Boolean).join(' ').toLowerCase();
                
                if (!searchFields.includes(searchTerm)) {
                    return false;
                }
            }
            
            // 类型筛选
            if (this.filters.type && resource.file_type !== this.filters.type) {
                return false;
            }
            
            // 专业筛选
            if (this.filters.major && resource.major !== this.filters.major) {
                return false;
            }
            
            // 官方资料筛选
            if (this.filters.officialOnly && !resource.is_official) {
                return false;
            }
            
            return true;
        });
        
        this.renderResources();
        this.renderPagination();
    }
    
    // 渲染资源网格
    renderResources() {
        const grid = document.getElementById('resources-grid');
        
        if (this.filteredResources.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>📭 没有找到资源</h3>
                    <p>${this.filters.search ? '尝试调整搜索条件' : '还没有资源被分享，成为第一个分享者吧！'}</p>
                </div>
            `;
            return;
        }
        
        // 计算分页
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pagedResources = this.filteredResources.slice(startIndex, endIndex);
        
        grid.innerHTML = pagedResources.map(resource => this.createResourceCard(resource)).join('');
    }
    
    // 创建资源卡片
    createResourceCard(resource) {
        const typeIcons = {
            'slide': '📊',
            'note': '📝',
            'textbook': '📚',
            'assignment': '📋',
            'exam': '🎯',
            'other': '📁'
        };
        
        const typeNames = {
            'slide': '课件讲义',
            'note': '学习笔记', 
            'textbook': '教材资料',
            'assignment': '作业答案',
            'exam': '考试资料',
            'other': '其他资源'
        };
        
        const fileType = resource.file_type || 'other';
        const authorName = resource.user_profiles?.oc_name || resource.user_profiles?.display_name || '匿名用户';
        
        return `
            <div class="resource-card" data-resource-id="${resource.id}">
                <div class="resource-header">
                    <div class="resource-type">
                        ${typeIcons[fileType]} ${typeNames[fileType]}
                        ${resource.is_official ? '<span class="official-badge">官方</span>' : ''}
                    </div>
                    <h3 class="resource-title">${resource.title}</h3>
                    <div class="resource-meta">
                        <span>👤 ${authorName}</span>
                        <span>📅 ${this.formatDate(resource.created_at)}</span>
                    </div>
                </div>
                
                <div class="resource-details">
                    ${resource.description ? `
                        <div class="resource-description">${resource.description}</div>
                    ` : ''}
                    
                    <div class="resource-stats">
                        <div class="stat">
                            <span class="rating-stars">${this.renderStars(resource.average_rating)}</span>
                            <span>(${resource.rating_count || 0})</span>
                        </div>
                        <div class="stat">👁️ ${resource.view_count || 0}</div>
                        <div class="stat">📥 ${resource.download_count || 0}</div>
                    </div>
                    
                    ${resource.course_name || resource.major ? `
                        <div class="resource-meta" style="margin-bottom: 1rem;">
                            ${resource.course_name ? `<span>📖 ${resource.course_name}</span>` : ''}
                            ${resource.major ? `<span>🎓 ${resource.major}</span>` : ''}
                        </div>
                    ` : ''}
                    
                    <div class="resource-actions">
                        <button class="action-btn" onclick="showResourceDetail('${resource.id}')">
                            👁️ 详情
                        </button>
                        <a href="${resource.file_url}" 
                        class="action-btn download-btn" 
                        target="_blank"
                        onclick="resourcesSystem.recordDownload('${resource.id}')">
                            📥 下载
                        </a>
                    </div>
                </div>
            </div>
        `;
    }
    
    // 渲染评分星星
    renderStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        return '★'.repeat(fullStars) + (hasHalfStar ? '½' : '') + '☆'.repeat(emptyStars);
    }
    
    // 格式化日期
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    // 渲染分页
    renderPagination() {
        const totalPages = Math.ceil(this.filteredResources.length / this.itemsPerPage);
        const pagination = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }
        
        pagination.style.display = 'flex';
        
        let paginationHTML = '';
        
        // 上一页按钮
        if (this.currentPage > 1) {
            paginationHTML += `<button class="page-btn" onclick="resourcesSystem.goToPage(${this.currentPage - 1})">‹ 上一页</button>`;
        }
        
        // 页码按钮
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                paginationHTML += `
                    <button class="page-btn ${i === this.currentPage ? 'active' : ''}" 
                            onclick="resourcesSystem.goToPage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                paginationHTML += `<span class="page-btn">...</span>`;
            }
        }
        
        // 下一页按钮
        if (this.currentPage < totalPages) {
            paginationHTML += `<button class="page-btn" onclick="resourcesSystem.goToPage(${this.currentPage + 1})">下一页 ›</button>`;
        }
        
        pagination.innerHTML = paginationHTML;
    }
    
    // 跳转到指定页面
    goToPage(page) {
        this.currentPage = page;
        this.renderResources();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // 绑定事件
    bindEvents() {
        // 搜索框
        const searchInput = document.getElementById('resource-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filters.search = e.target.value;
                    this.currentPage = 1;
                    this.applyFilters();
                }, 300);
            });
        }
        
        // 筛选器
        document.getElementById('type-filter').addEventListener('change', (e) => {
            this.filters.type = e.target.value;
            this.currentPage = 1;
            this.applyFilters();
        });
        
        document.getElementById('major-filter').addEventListener('change', (e) => {
            this.filters.major = e.target.value;
            this.currentPage = 1;
            this.applyFilters();
        });
        
        document.getElementById('sort-filter').addEventListener('change', (e) => {
            this.filters.sort = e.target.value;
            this.currentPage = 1;
            this.loadResources(); // 重新加载以应用排序
        });
        
        document.getElementById('official-filter').addEventListener('change', (e) => {
            this.filters.officialOnly = e.target.checked;
            this.currentPage = 1;
            this.applyFilters();
        });
    }
    
    // 记录下载
    async recordDownload(resourceId) {
        try {
            await supabaseAdmin_r
                .from('academic_resources')
                .update({ 
                    download_count: supabaseAdmin_r.raw('download_count + 1')
                })
                .eq('id', resourceId);
                
            console.log('✅ 下载记录更新');
        } catch (error) {
            console.error('❌ 记录下载失败:', error);
        }
    }
    
    // 预览资源（占位功能）
    previewResource(resourceId) {
        alert('🔍 预览功能开发中...');
        // 未来可以集成PDF预览等功能
    }
    
    // 显示错误
    showError(message) {
        const grid = document.getElementById('resources-grid');
        grid.innerHTML = `
            <div class="empty-state">
                <h3>❌ 加载失败</h3>
                <p>${message}</p>
                <button onclick="resourcesSystem.loadResources()" class="upload-btn" style="margin-top: 1rem;">
                    重试
                </button>
            </div>
        `;
    }
}

// 创建全局实例
const resourcesSystem = new AcademicResourcesSystem();

// 上传模态框控制
function showUploadModal() {
    // 检查登录状态
    if (!currentUserProfile) {
        alert('请先登录后再上传资源');
        return;
    }
    
    const modal = document.getElementById('resource-upload-modal');
    if (modal) {
        modal.style.display = 'flex';
        initFileUpload();
    }
}

function hideUploadModal() {
    const modal = document.getElementById('resource-upload-modal');
    if (modal) {
        modal.style.display = 'none';
        resetUploadForm();
    }
}

// 初始化文件上传
function initFileUpload() {
    const fileInput = document.getElementById('resource-file');
    const uploadArea = document.getElementById('file-upload-area');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const fileIcon = document.getElementById('file-icon');
    
    // 拖拽功能
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
    
    // 点击选择文件
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
    
    function handleFileSelect(file) {
        if (!file) return;
        
        // 验证文件类型
        const allowedTypes = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.zip', '.rar'];
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(fileExtension)) {
            alert('❌ 不支持的文件类型。请选择 PDF, Word, PowerPoint, TXT, ZIP 等格式的文件。');
            return;
        }
        
        // 显示文件信息
        fileName.textContent = file.name;
        fileSize.textContent = this.formatFileSize(file.size);
        fileIcon.textContent = this.getFileIcon(fileExtension);
        
        uploadArea.querySelector('.upload-placeholder').style.display = 'none';
        fileInfo.style.display = 'flex';
        
        // 存储文件对象供上传使用
        window.selectedFile = file;
    }
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 获取文件图标
function getFileIcon(extension) {
    const icons = {
        '.pdf': '📕',
        '.doc': '📄',
        '.docx': '📄',
        '.ppt': '📊',
        '.pptx': '📊',
        '.txt': '📝',
        '.zip': '📦',
        '.rar': '📦'
    };
    return icons[extension] || '📁';
}

// 清除文件选择
function clearFileSelection() {
    const fileInput = document.getElementById('resource-file');
    const uploadArea = document.getElementById('file-upload-area');
    const fileInfo = document.getElementById('file-info');
    
    fileInput.value = '';
    uploadArea.querySelector('.upload-placeholder').style.display = 'block';
    fileInfo.style.display = 'none';
    window.selectedFile = null;
}

// 重置上传表单
function resetUploadForm() {
    document.getElementById('resource-upload-form').reset();
    clearFileSelection();
}

// 绑定上传表单提交事件
document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('resource-upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleResourceUpload();
        });
    }
});

// 处理资源上传
async function handleResourceUpload() {
    if (!currentUserProfile) {
        alert('❌ 请先登录');
        return;
    }
    
    if (!window.selectedFile) {
        alert('❌ 请选择要上传的文件');
        return;
    }
    
    const formData = {
        title: document.getElementById('resource-title').value,
        description: document.getElementById('resource-description').value,
        fileType: document.getElementById('resource-type').value,
        major: document.getElementById('resource-major').value,
        courseCode: document.getElementById('course-code').value,
        courseName: document.getElementById('course-name').value,
        isOfficial: document.getElementById('is-official').checked && currentUserProfile.role === 'faculty'
    };
    
    // 验证表单
    if (!formData.title.trim()) {
        alert('❌ 请输入资源标题');
        return;
    }
    
    if (!formData.fileType) {
        alert('❌ 请选择资源类型');
        return;
    }
    
    try {
        console.log('📤 开始上传资源...');
        
        // 1. 上传文件到Supabase存储
        const fileUrl = await uploadFileToStorage(window.selectedFile);
        
        // 2. 创建资源记录
        await createResourceRecord(formData, fileUrl);
        
        // 3. 成功处理
        alert('✅ 资源上传成功！');
        hideUploadModal();
        
        // 4. 重新加载资源列表
        await resourcesSystem.loadResources();
        
    } catch (error) {
        console.error('❌ 资源上传失败:', error);
        alert('❌ 上传失败: ' + error.message);
    }
}

// 上传文件到Supabase存储
async function uploadFileToStorage(file) {
    const userId = currentUserProfile.auth0_user_id;
    const cleanUserId = userId.replace(/^auth0\|/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileExt = file.name.split('.').pop();
    const fileName = `resource-${Date.now()}.${fileExt}`;
    const filePath = `${cleanUserId}/${fileName}`;
    
    console.log('📁 上传文件:', { fileName, filePath, size: file.size });
    
    const { data, error } = await supabaseAdmin_r.storage
        .from('resources')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
        });
    
    if (error) {
        throw new Error('文件上传失败: ' + error.message);
    }
    
    // 获取公开URL
    const { data: { publicUrl } } = supabaseAdmin_r.storage
        .from('resources')
        .getPublicUrl(filePath);
    
    console.log('✅ 文件上传成功:', publicUrl);
    return publicUrl;
}

// 创建资源记录
async function createResourceRecord(formData, fileUrl) {
    const resourceData = {
        title: formData.title,
        description: formData.description,
        file_url: fileUrl,
        file_name: window.selectedFile.name,
        file_size: window.selectedFile.size,
        file_type: formData.fileType,
        course_code: formData.courseCode || null,
        course_name: formData.courseName || null,
        major: formData.major || null,
        author_id: currentUserProfile.auth0_user_id,
        is_official: formData.isOfficial,
        tags: [] // 可以未来扩展标签功能
    };
    
    console.log('💾 创建资源记录:', resourceData);
    
    const { data, error } = await supabaseAdmin_r
        .from('academic_resources')
        .insert([resourceData])
        .select()
        .single();
    
    if (error) {
        throw new Error('创建资源记录失败: ' + error.message);
    }
    
    console.log('✅ 资源记录创建成功:', data);
    return data;
}

// 评分系统
class RatingSystem {
    constructor() {
        this.userRatings = new Map(); // 缓存用户评分
    }
    
    // 为资源评分
    async rateResource(resourceId, rating, comment = '') {
        if (!currentUserProfile) {
            alert('请先登录后再进行评分');
            return;
        }
        
        if (rating < 1 || rating > 5) {
            alert('评分必须在1-5分之间');
            return;
        }
        
        try {
            const userId = currentUserProfile.auth0_user_id;
            
            // 插入或更新评分
            const { data, error } = await supabaseAdmin_r
                .from('resource_ratings')
                .upsert({
                    resource_id: resourceId,
                    user_id: userId,
                    rating: rating,
                    comment: comment
                }, {
                    onConflict: 'resource_id,user_id'
                })
                .select()
                .single();
            
            if (error) throw error;
            
            // 更新资源平均评分
            await this.updateResourceRating(resourceId);
            
            // 更新缓存
            this.userRatings.set(resourceId, rating);
            
            console.log('⭐ 评分成功:', { resourceId, rating, comment });
            return data;
            
        } catch (error) {
            console.error('❌ 评分失败:', error);
            throw error;
        }
    }
    
    // 更新资源平均评分
    async updateResourceRating(resourceId) {
        try {
            // 计算新的平均分
            const { data: ratings, error } = await supabaseAdmin_r
                .from('resource_ratings')
                .select('rating')
                .eq('resource_id', resourceId);
            
            if (error) throw error;
            
            if (ratings.length > 0) {
                const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
                
                // 更新资源表
                const { error: updateError } = await supabaseAdmin_r
                    .from('academic_resources')
                    .update({
                        average_rating: Math.round(averageRating * 100) / 100,
                        rating_count: ratings.length
                    })
                    .eq('id', resourceId);
                
                if (updateError) throw updateError;
            }
            
        } catch (error) {
            console.error('❌ 更新评分失败:', error);
            throw error;
        }
    }
    
    // 获取用户对资源的评分
    async getUserRating(resourceId) {
        if (!currentUserProfile) return null;
        
        // 检查缓存
        if (this.userRatings.has(resourceId)) {
            return this.userRatings.get(resourceId);
        }
        
        try {
            const userId = currentUserProfile.auth0_user_id;
            const { data, error } = await supabaseAdmin_r
                .from('resource_ratings')
                .select('rating')
                .eq('resource_id', resourceId)
                .eq('user_id', userId)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            
            const rating = data ? data.rating : null;
            this.userRatings.set(resourceId, rating);
            
            return rating;
            
        } catch (error) {
            console.error('❌ 获取用户评分失败:', error);
            return null;
        }
    }
    
    // 获取资源的所有评分和评论
    async getResourceRatings(resourceId) {
        try {
            const { data, error } = await supabaseAdmin_r
                .from('resource_ratings')
                .select(`
                    rating,
                    comment,
                    created_at,
                    user_profiles (
                        display_name,
                        oc_name,
                        avatar_url
                    )
                `)
                .eq('resource_id', resourceId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            return data || [];
            
        } catch (error) {
            console.error('❌ 获取评分列表失败:', error);
            return [];
        }
    }
}

// 创建全局评分系统实例
const ratingSystem = new RatingSystem();

// 资源详情和预览系统
class ResourceDetailSystem {
    constructor() {
        this.currentResource = null;
    }
    
    // 显示资源详情
    async showResourceDetail(resourceId) {
        try {
            console.log('🔍 加载资源详情:', resourceId);
            
            // 加载资源详情
            const resource = await this.loadResourceDetail(resourceId);
            if (!resource) {
                alert('资源不存在或已被删除');
                return;
            }
            
            this.currentResource = resource;
            
            // 更新视图计数
            await this.recordView(resourceId);
            
            // 渲染详情模态框
            this.renderResourceDetail(resource);
            
            // 显示模态框
            document.getElementById('resource-detail-modal').style.display = 'flex';
            
            // 加载评分和评论
            await this.loadRatings(resourceId);
            
            // 加载用户评分
            await this.loadUserRating(resourceId);
            
        } catch (error) {
            console.error('❌ 加载资源详情失败:', error);
            alert('加载资源详情失败: ' + error.message);
        }
    }
    
    // 加载资源详情
    async loadResourceDetail(resourceId) {
        const { data, error } = await supabaseAdmin_r
            .from('academic_resources')
            .select(`
                *,
                user_profiles (
                    display_name,
                    oc_name,
                    auth0_user_id,
                    role
                )
            `)
            .eq('id', resourceId)
            .single();
        
        if (error) throw error;
        return data;
    }
    
    // 记录浏览次数
    async recordView(resourceId) {
        try {
            await supabaseAdmin_r
                .from('academic_resources')
                .update({ 
                    view_count: supabaseAdmin_r.raw('view_count + 1')
                })
                .eq('id', resourceId);
        } catch (error) {
            console.error('❌ 记录浏览失败:', error);
        }
    }
    
    // 渲染资源详情
    renderResourceDetail(resource) {
        const typeNames = {
            'slide': '课件讲义',
            'note': '学习笔记', 
            'textbook': '教材资料',
            'assignment': '作业答案',
            'exam': '考试资料',
            'other': '其他资源'
        };
        
        const authorName = resource.user_profiles?.oc_name || resource.user_profiles?.display_name || '匿名用户';
        const isOwner = currentUserProfile && resource.author_id === currentUserProfile.auth0_user_id;
        
        // 更新基本信息
        document.getElementById('detail-title').textContent = resource.title;
        document.getElementById('detail-subtitle').textContent = `${typeNames[resource.file_type]} • ${authorName}`;
        document.getElementById('detail-type').textContent = typeNames[resource.file_type] + (resource.is_official ? ' (官方)' : '');
        document.getElementById('detail-size').textContent = this.formatFileSize(resource.file_size);
        document.getElementById('detail-date').textContent = new Date(resource.created_at).toLocaleDateString('zh-CN');
        document.getElementById('detail-author').textContent = authorName;
        document.getElementById('detail-course').textContent = resource.course_name || '未指定';
        document.getElementById('detail-major').textContent = resource.major || '未指定';
        document.getElementById('detail-description').textContent = resource.description || '暂无描述';
        
        // 更新统计信息
        document.getElementById('detail-views').textContent = resource.view_count || 0;
        document.getElementById('detail-downloads').textContent = resource.download_count || 0;
        document.getElementById('detail-rating').textContent = resource.average_rating ? resource.average_rating.toFixed(1) : '暂无';
        document.getElementById('detail-ratings-count').textContent = resource.rating_count || 0;
        
        // 更新下载链接
        const downloadLink = document.getElementById('detail-download-link');
        downloadLink.href = resource.file_url;
        downloadLink.onclick = () => resourcesSystem.recordDownload(resource.id);
        
        // 显示/隐藏删除按钮
        const deleteBtn = document.getElementById('delete-resource-btn');
        deleteBtn.style.display = isOwner ? 'block' : 'none';
        deleteBtn.onclick = () => this.deleteResource(resource.id);
    }
    
    // 加载评分和评论
    async loadRatings(resourceId) {
        const ratings = await ratingSystem.getResourceRatings(resourceId);
        const ratingsList = document.getElementById('ratings-list');
        
        if (ratings.length === 0) {
            ratingsList.innerHTML = '<p class="text-muted">暂无评分和评论</p>';
            return;
        }
        
        ratingsList.innerHTML = ratings.map(rating => `
            <div class="rating-item">
                <div class="rating-header">
                    <span class="rating-author">
                        ${rating.user_profiles?.oc_name || rating.user_profiles?.display_name || '匿名用户'}
                    </span>
                    <span class="rating-date">
                        ${new Date(rating.created_at).toLocaleDateString('zh-CN')}
                    </span>
                </div>
                <div class="star-rating static">
                    ${'★'.repeat(rating.rating)}${'☆'.repeat(5 - rating.rating)}
                </div>
                ${rating.comment ? `
                    <p class="rating-comment">${rating.comment}</p>
                ` : ''}
            </div>
        `).join('');
    }
    
    // 加载用户评分
    async loadUserRating(resourceId) {
        if (!currentUserProfile) {
            document.getElementById('star-rating').style.display = 'none';
            document.getElementById('user-rating-text').textContent = '登录后即可评分';
            return;
        }
        
        const userRating = await ratingSystem.getUserRating(resourceId);
        const starRating = document.getElementById('star-rating');
        const ratingText = document.getElementById('user-rating-text');
        const submitBtn = document.getElementById('submit-rating');
        
        // 初始化星星点击事件
        this.initStarRating(starRating, userRating);
        
        if (userRating) {
            ratingText.textContent = `你已评分: ${userRating} 星`;
            submitBtn.style.display = 'none';
        } else {
            ratingText.textContent = '点击星星评分';
            submitBtn.style.display = 'block';
            submitBtn.onclick = () => this.submitRating(resourceId);
        }
    }
    
    // 初始化星星评分
    initStarRating(container, currentRating) {
        const stars = container.querySelectorAll('.star');
        let selectedRating = currentRating || 0;
        
        stars.forEach((star, index) => {
            const rating = index + 1;
            
            // 设置初始状态
            if (currentRating && rating <= currentRating) {
                star.textContent = '★';
                star.classList.add('active');
            } else {
                star.textContent = '☆';
                star.classList.remove('active');
            }
            
            // 鼠标悬停效果
            star.addEventListener('mouseenter', () => {
                stars.forEach((s, i) => {
                    s.textContent = i < rating ? '★' : '☆';
                });
            });
            
            // 鼠标离开恢复
            container.addEventListener('mouseleave', () => {
                stars.forEach((s, i) => {
                    s.textContent = i < selectedRating ? '★' : '☆';
                });
            });
            
            // 点击选择
            star.addEventListener('click', () => {
                selectedRating = rating;
                stars.forEach((s, i) => {
                    s.textContent = i < rating ? '★' : '☆';
                    s.classList.toggle('active', i < rating);
                });
                
                // 更新文本和显示提交按钮
                document.getElementById('user-rating-text').textContent = `已选择: ${rating} 星`;
                document.getElementById('submit-rating').style.display = 'block';
            });
        });
    }
    
    // 提交评分
    async submitRating(resourceId) {
        const stars = document.querySelectorAll('.star');
        const selectedRating = Array.from(stars).filter(star => star.textContent === '★').length;
        
        if (selectedRating === 0) {
            alert('请选择评分');
            return;
        }
        
        try {
            await ratingSystem.rateResource(resourceId, selectedRating);
            alert('✅ 评分成功！');
            
            // 重新加载评分信息
            await this.loadRatings(resourceId);
            await this.loadUserRating(resourceId);
            
            // 重新加载资源列表以更新评分显示
            await resourcesSystem.loadResources();
            
        } catch (error) {
            alert('❌ 评分失败: ' + error.message);
        }
    }
    
    // 删除资源
    async deleteResource(resourceId) {
        if (!confirm('⚠️ 确定要删除吗？此操作不可撤销！')) {
            return;
        }
        
        try {
            // 获取资源信息以删除文件
            const resource = await this.loadResourceDetail(resourceId);
            
            // 1. 删除存储中的文件
            if (resource.file_url) {
                await this.deleteFileFromStorage(resource.file_url);
            }
            
            // 2. 删除资源记录（级联删除评分）
            const { error } = await supabaseAdmin_r
                .from('academic_resources')
                .delete()
                .eq('id', resourceId);
            
            if (error) throw error;
            
            alert('✅ 资源删除成功！');
            this.hideResourceDetail();
            
            // 重新加载资源列表
            await resourcesSystem.loadResources();
            
        } catch (error) {
            console.error('❌ 删除资源失败:', error);
            alert('❌ 删除失败: ' + error.message);
        }
    }
    
    // 从存储中删除文件
    async deleteFileFromStorage(fileUrl) {
        try {
            // 从URL中提取文件路径
            const matches = fileUrl.match(/\/storage\/v1\/object\/public\/resources\/(.+)$/);
            if (matches && matches[1]) {
                const filePath = decodeURIComponent(matches[1]);
                const { error } = await supabaseAdmin_r.storage
                    .from('resources')
                    .remove([filePath]);
                
                if (error) throw error;
                console.log('✅ 文件删除成功:', filePath);
            }
        } catch (error) {
            console.error('❌ 文件删除失败:', error);
            // 不抛出错误，继续删除数据库记录
        }
    }
    
    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // 隐藏资源详情
    hideResourceDetail() {
        document.getElementById('resource-detail-modal').style.display = 'none';
        this.currentResource = null;
    }
}

// 创建全局资源详情系统实例
const resourceDetailSystem = new ResourceDetailSystem();

// 全局函数供HTML调用
function showResourceDetail(resourceId) {
    resourceDetailSystem.showResourceDetail(resourceId);
}

function hideResourceDetail() {
    resourceDetailSystem.hideResourceDetail();
}