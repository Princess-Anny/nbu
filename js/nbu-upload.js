// nbu-upload.js - 头像上传功能
class AvatarUploader {
    constructor() {
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    }

    // 处理文件选择
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 验证文件
        if (!this.validateFile(file)) {
            return;
        }

        // 显示预览
        this.showPreview(file);
        
        // 开始上传
        try {
            const avatarUrl = await this.uploadToSupabase(file);
            document.getElementById('edit-avatar-url').value = avatarUrl;
            this.showUploadSuccess();
        } catch (error) {
            this.showUploadError(error.message);
        }
    }

    // 验证文件
    validateFile(file) {
        if (!this.allowedTypes.includes(file.type)) {
            alert('❌ 请选择图片文件（JPG、PNG、GIF、WebP）');
            return false;
        }

        if (file.size > this.maxFileSize) {
            alert('❌ 图片大小不能超过5MB');
            return false;
        }

        return true;
    }

    // 显示图片预览
    showPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('avatar-preview').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // 上传到Supabase
    async uploadToSupabase(file) {
        this.showUploadProgress(0);
        // 预处理图片
        this.showUploadProgress(10);
        const processedFile = await preprocessImage(file); // 去掉 this.
        this.showUploadProgress(30);
        
        if (!currentUserProfile) {
            throw new Error('用户未登录');
        }

        const userId = currentUserProfile.auth0_user_id;
        
        // 清理用户ID，移除特殊字符
        const cleanUserId = this.sanitizeUserId(userId);
        const fileExt = file.name.split('.').pop();
        const fileName = `avatar-${Date.now()}.${fileExt}`;
        
        // 使用安全的文件路径
        const filePath = `${cleanUserId}/${fileName}`;

        console.log("📤 上传头像:", { 
            originalUserId: userId,
            cleanUserId: cleanUserId,
            fileName: fileName,
            filePath: filePath 
        });

        try {
            // 使用Admin客户端上传
            const { data, error } = await supabaseAdmin.storage
                .from('avatars')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) {
                console.error("❌ 上传失败:", error);
                throw new Error(`上传失败: ${error.message}`);
            }

            // 获取公开URL
            const { data: { publicUrl } } = supabaseAdmin.storage
                .from('avatars')
                .getPublicUrl(filePath);

            console.log("✅ 上传成功:", publicUrl);
            this.showUploadProgress(100);
            
            return publicUrl;
            
        } catch (error) {
            console.error("❌ 上传异常:", error);
            throw error;
        }
    }

    // 清理用户ID，移除不允许的字符
    sanitizeUserId(userId) {
        // 移除 'auth0|' 前缀和所有特殊字符
        return userId
            .replace(/^auth0\|/, '') // 移除auth0|前缀
            .replace(/[^a-zA-Z0-9_-]/g, '_') // 将特殊字符替换为下划线
            .substring(0, 50); // 限制长度
    }

    // 显示上传进度
    showUploadProgress(percent) {
        const progressBar = document.getElementById('upload-progress-bar');
        const progressContainer = document.getElementById('upload-progress');
        const statusText = document.getElementById('upload-status');
        
        progressContainer.style.display = 'block';
        progressBar.style.width = `${percent}%`;
        
        if (percent < 100) {
            statusText.textContent = `上传中... ${percent}%`;
            progressBar.className = 'progress-bar progress-bar-striped progress-bar-animated';
        } else {
            statusText.textContent = '上传完成！';
            progressBar.className = 'progress-bar bg-success';
        }
    }

    // 显示上传成功
    showUploadSuccess() {
        setTimeout(() => {
            document.getElementById('upload-progress').style.display = 'none';
        }, 2000);
    }

    // 显示上传错误
    showUploadError(message) {
        const statusText = document.getElementById('upload-status');
        const progressBar = document.getElementById('upload-progress-bar');
        
        statusText.textContent = `上传失败: ${message}`;
        statusText.style.color = '#e74c3c';
        progressBar.className = 'progress-bar bg-danger';
        
        setTimeout(() => {
            document.getElementById('upload-progress').style.display = 'none';
            // 重置样式
            statusText.style.color = '';
            progressBar.className = 'progress-bar';
        }, 3000);
    }
}

// 在类外部定义独立的预处理函数
function preprocessImage(file) {
    return new Promise((resolve) => {
        if (file.size < 1024 * 1024) {
            resolve(file);
            return;
        }
        
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        img.onload = () => {
            const maxWidth = 800;
            const maxHeight = 800;
            
            let { width, height } = img;
            
            if (width > maxWidth || height > maxHeight) {
                if (width > height) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                } else {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
                const processedFile = new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                });
                resolve(processedFile);
            }, 'image/jpeg', 0.8);
        };
        
        img.src = URL.createObjectURL(file);
    });
}


// 创建全局上传器实例
const avatarUploader = new AvatarUploader();

// 全局函数供HTML调用
function handleAvatarUpload(event) {
    avatarUploader.handleFileSelect(event);
}

function updateAvatarPreview(url) {
    if (url) {
        document.getElementById('avatar-preview').src = url;
    }
}

// 初始化预览
function initializeAvatarPreview() {
    const currentAvatar = document.getElementById('edit-avatar-url').value;
    if (currentAvatar) {
        updateAvatarPreview(currentAvatar);
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    // 编辑模态框显示时初始化预览
    const editButton = document.querySelector('[onclick="showEditProfileModal()"]');
    if (editButton) {
        editButton.addEventListener('click', function() {
            setTimeout(initializeAvatarPreview, 100);
        });
    }
});

// 账户注销功能
function showDeleteAccountModal() {
    const modal = document.getElementById('nbu-delete-account-modal');
    if (modal) {
        modal.style.display = 'flex';
        
        // 重置确认状态
        document.getElementById('confirm-delete').checked = false;
        document.getElementById('confirm-delete-btn').disabled = true;
        
        // 添加确认检查
        document.getElementById('confirm-delete').addEventListener('change', function() {
            document.getElementById('confirm-delete-btn').disabled = !this.checked;
        });
    }
}

function hideDeleteAccountModal() {
    const modal = document.getElementById('nbu-delete-account-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function deleteUserAccount() {
    if (!currentUserProfile) {
        alert('❌ 无法获取用户信息');
        return;
    }
    
    const userId = currentUserProfile.auth0_user_id;
    const cleanUserId = sanitizeUserId(userId);
    
    if (!confirm('⚠️ 最后确认：确定要永久删除账户吗？此操作不可撤销！')) {
        return;
    }
    
    try {
        console.log("🗑️ 开始删除用户账户:", userId);
        
        // 1. 删除Supabase存储的头像文件
        await deleteUserAvatars(cleanUserId);
        
        // 2. 删除用户资料记录
        await deleteUserProfile(userId);
        
        // 3. 退出登录
        await nbuHandleLogout();
        
        // 4. 显示成功消息
        alert('✅ 账户已成功注销！');
        
        // 5. 跳转到首页
        window.location.href = '/';
        
    } catch (error) {
        console.error('❌ 注销账户失败:', error);
        alert('❌ 注销失败: ' + error.message);
    }
}

// 删除用户头像文件
async function deleteUserAvatars(userId) {
    try {
        console.log("🗑️ 删除用户头像文件:", userId);
        
        // 列出用户的所有头像文件
        const { data: files, error } = await supabaseAdmin.storage
            .from('avatars')
            .list(userId);
            
        if (error && error.message !== 'Not Found') {
            console.error('❌ 列出文件失败:', error);
            return;
        }
        
        // 删除所有文件
        if (files && files.length > 0) {
            const filePaths = files.map(file => `${userId}/${file.name}`);
            const { error: deleteError } = await supabaseAdmin.storage
                .from('avatars')
                .remove(filePaths);
                
            if (deleteError) {
                console.error('❌ 删除文件失败:', deleteError);
            } else {
                console.log('✅ 头像文件删除成功');
            }
        }
        
    } catch (error) {
        console.error('❌ 删除头像文件时出错:', error);
        // 不抛出错误，继续执行其他删除操作
    }
}

// 删除用户资料记录
async function deleteUserProfile(userId) {
    const { error } = await supabaseAdmin
        .from('user_profiles')
        .delete()
        .eq('auth0_user_id', userId);
        
    if (error) {
        console.error('❌ 删除用户资料失败:', error);
        throw new Error('删除用户资料失败');
    }
    
    console.log('✅ 用户资料删除成功');
}

// 工具函数：清理用户ID（复用上传功能中的）
function sanitizeUserId(userId) {
    return userId
        .replace(/^auth0\|/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 50);
}

// 全局函数
window.showDeleteAccountModal = showDeleteAccountModal;
window.hideDeleteAccountModal = hideDeleteAccountModal;
window.deleteUserAccount = deleteUserAccount;