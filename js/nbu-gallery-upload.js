// nbu-gallery-upload.js - 画廊上传功能
class GalleryUploader {
    constructor() {
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        this.currentFile = null;
        this.init();
    }
    
    init() {
        this.bindEvents();
    }
    
    bindEvents() {
        // 上传区域点击事件
        const uploadArea = document.getElementById('gallery-upload-area');
        const fileInput = document.getElementById('gallery-image');
        
        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', () => fileInput.click());
            
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
                if (e.dataTransfer.files.length > 0) {
                    this.handleFileSelect(e.dataTransfer.files[0]);
                }
            });
            
            // 文件选择事件
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileSelect(e.target.files[0]);
                }
            });
        }
    }
    
    // 处理文件选择
    handleFileSelect(file) {
        if (!this.validateFile(file)) {
            return;
        }
        
        this.currentFile = file;
        this.showPreview(file);
    }
    
    // 验证文件
    validateFile(file) {
        if (!this.allowedTypes.includes(file.type)) {
            alert('❌ 请选择图片文件（JPG、PNG、GIF、WebP）');
            return false;
        }
        
        if (file.size > this.maxFileSize) {
            alert('❌ 图片大小不能超过10MB');
            return false;
        }
        
        return true;
    }
    
    // 显示图片预览
    showPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('gallery-preview');
            const previewImg = document.getElementById('gallery-preview-img');
            const uploadArea = document.getElementById('gallery-upload-area');
            
            previewImg.src = e.target.result;
            preview.style.display = 'block';
            uploadArea.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
    
    // 清除预览
    clearPreview() {
        const preview = document.getElementById('gallery-preview');
        const uploadArea = document.getElementById('gallery-upload-area');
        const fileInput = document.getElementById('gallery-image');
        
        preview.style.display = 'none';
        uploadArea.style.display = 'block';
        fileInput.value = '';
        this.currentFile = null;
    }
    
    // 上传图片到Supabase
    async uploadGalleryImage() {
        if (!this.currentFile) {
            throw new Error('请选择图片');
        }
        
        if (!currentUserProfile) {
            throw new Error('用户未登录');
        }
        
        const userId = currentUserProfile.auth0_user_id;
        const cleanUserId = this.sanitizeUserId(userId);
        const fileExt = this.currentFile.name.split('.').pop();
        const fileName = `gallery-${Date.now()}.${fileExt}`;
        const filePath = `gallery/${cleanUserId}/${fileName}`;
        
        console.log("📤 上传画廊图片:", filePath);
        
        // 使用Admin客户端上传
        const { data, error } = await supabaseAdmin.storage
            .from('avatars')  // 复用现有的存储桶，或者创建新的
            .upload(filePath, this.currentFile);
        
        if (error) {
            throw new Error(`上传失败: ${error.message}`);
        }
        
        // 获取公开URL
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('avatars')
            .getPublicUrl(filePath);
        
        return publicUrl;
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
const galleryUploader = new GalleryUploader();

// 全局函数
function showUploadGalleryModal() {
    const modal = document.getElementById('nbu-gallery-upload-modal');
    if (modal) {
        modal.style.display = 'flex';
        galleryUploader.clearPreview(); // 重置状态
    }
}

function hideGalleryUploadModal() {
    const modal = document.getElementById('nbu-gallery-upload-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function clearGalleryPreview() {
    galleryUploader.clearPreview();
}

// 表单提交处理
document.addEventListener('DOMContentLoaded', function() {
    const galleryForm = document.getElementById('nbu-gallery-form');
    if (galleryForm) {
        galleryForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            try {
                submitBtn.textContent = '发布中...';
                submitBtn.disabled = true;
                
                // 收集表单数据
                const formData = {
                    title: document.getElementById('gallery-title').value,
                    description: document.getElementById('gallery-description').value,
                    tags: document.getElementById('gallery-tags').value 
                        ? document.getElementById('gallery-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag)
                        : [],
                    is_public: document.getElementById('gallery-is-public').checked
                };
                
                console.log('📝 发布画廊作品:', formData);
                
                // 上传图片
                const imageUrl = await galleryUploader.uploadGalleryImage();
                formData.image_url = imageUrl;
                formData.user_id = currentUserProfile.auth0_user_id;
                
                // 保存到数据库
                const { data, error } = await supabaseAdmin
                    .from('gallery_posts')
                    .insert([formData])
                    .select()
                    .single();
                
                if (error) {
                    throw new Error('保存作品失败: ' + error.message);
                }
                
                console.log('✅ 作品发布成功:', data);
                
                // 成功处理
                hideGalleryUploadModal();
                alert('🎉 作品发布成功！');
                
                // 重置表单
                galleryForm.reset();
                galleryUploader.clearPreview();
                
            } catch (error) {
                console.error('❌ 发布失败:', error);
                alert('❌ 发布失败: ' + error.message);
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});