// nbu-export.js - 资料导出功能
class ProfileExporter {
    constructor() {
        this.exportFormats = {
            pdf: { name: 'PDF文档', extension: 'pdf' },
            png: { name: 'PNG图片', extension: 'png' },
            json: { name: 'JSON数据', extension: 'json' }
        };
    }

    // 主导出函数
    async exportProfile(format, userId = null) {
        try {
            console.log(`📤 开始导出 ${format} 格式资料`);
            
            // 获取用户资料
            const userProfile = await this.getUserProfile(userId);
            if (!userProfile) {
                throw new Error('无法获取用户资料');
            }
            
            // 显示导出中状态
            this.showExportProgress(format);
            
            // 根据格式调用不同的导出方法
            switch (format) {
                case 'pdf':
                    await this.exportAsPDF(userProfile);
                    break;
                case 'png':
                    await this.exportAsPNG(userProfile);
                    break;
                case 'json':
                    await this.exportAsJSON(userProfile);
                    break;
                default:
                    throw new Error('不支持的导出格式');
            }
            
            this.showExportSuccess(format);
            
        } catch (error) {
            console.error(`❌ ${format}导出失败:`, error);
            this.showExportError(format, error.message);
        }
    }

    // 获取用户资料
    async getUserProfile(userId) {
        if (userId && userId !== 'null') {
            // 获取他人资料
            const { data: userProfile, error } = await supabaseAdmin
                .from('user_profiles')
                .select('*')
                .eq('auth0_user_id', userId)
                .single();
            
            if (error) throw new Error('获取用户资料失败: ' + error.message);
            return userProfile;
        } else {
            // 获取自己的资料
            if (!currentUserProfile) {
                throw new Error('请先登录');
            }
            return currentUserProfile;
        }
    }

    // 导出为PDF
    async exportAsPDF(userProfile) {
        return new Promise((resolve, reject) => {
            try {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                // 设置文档属性
                doc.setProperties({
                    title: `${userProfile.oc_name || userProfile.display_name} - NBU个人档案`,
                    subject: '美国牛逼大学个人资料档案',
                    creator: 'NBU官方网站',
                    author: userProfile.oc_name || userProfile.display_name
                });
                
                // 添加标题
                doc.setFontSize(20);
                doc.setTextColor(41, 128, 185);
                doc.text('🎓 美国牛逼大学', 105, 30, { align: 'center' });
                
                doc.setFontSize(16);
                doc.setTextColor(52, 73, 94);
                doc.text('个人资料档案', 105, 45, { align: 'center' });
                
                // 添加分割线
                doc.setDrawColor(200, 200, 200);
                doc.line(20, 55, 190, 55);
                
                let yPosition = 75;
                
                // 基本信息
                yPosition = this.addPDFSection(doc, '👤 基本信息', yPosition);
                yPosition = this.addPDFField(doc, '角色名', userProfile.oc_name || '未设置', yPosition);
                yPosition = this.addPDFField(doc, '显示名称', userProfile.display_name || '未设置', yPosition);
                yPosition = this.addPDFField(doc, '身份', this.getRoleDisplay(userProfile.role), yPosition);
                yPosition = this.addPDFField(doc, '称谓', userProfile.oc_title || '未设置', yPosition);
                
                // OC信息
                if (userProfile.role !== 'visitor') {
                    yPosition = this.addPDFSection(doc, '🎭 OC角色信息', yPosition);
                    yPosition = this.addPDFField(doc, '年龄', userProfile.oc_age || '未设置', yPosition);
                    yPosition = this.addPDFField(doc, '国籍', userProfile.oc_nationality || '未设置', yPosition);
                    yPosition = this.addPDFField(doc, '性别', userProfile.oc_gender || '未设置', yPosition);
                }
                
                // 学生信息
                if (userProfile.role === 'student') {
                    yPosition = this.addPDFSection(doc, '🎓 学生信息', yPosition);
                    yPosition = this.addPDFField(doc, '专业', userProfile.major || '未设置', yPosition);
                    yPosition = this.addPDFField(doc, '学号', userProfile.student_id || '未设置', yPosition);
                    yPosition = this.addPDFField(doc, '宿舍', userProfile.dormitory || '未设置', yPosition);
                    yPosition = this.addPDFField(doc, '入学年份', userProfile.enrollment_year || '未设置', yPosition);
                    yPosition = this.addPDFField(doc, '社团', userProfile.clubs ? userProfile.clubs.join(', ') : '未加入', yPosition);
                }
                
                // 教职信息
                if (userProfile.role === 'faculty') {
                    yPosition = this.addPDFSection(doc, '👨‍🏫 教职信息', yPosition);
                    yPosition = this.addPDFField(doc, '院系', userProfile.department || '未设置', yPosition);
                    yPosition = this.addPDFField(doc, '职称', userProfile.faculty_rank || '未设置', yPosition);
                    yPosition = this.addPDFField(doc, '办公室', userProfile.office_location || '未设置', yPosition);
                    yPosition = this.addPDFField(doc, '办公时间', userProfile.office_hours || '未设置', yPosition);
                    yPosition = this.addPDFField(doc, '负责科目', userProfile.courses ? userProfile.courses.join(', ') : '未设置', yPosition);
                    yPosition = this.addPDFField(doc, '学位', userProfile.degrees ? userProfile.degrees.join('; ') : '未设置', yPosition);
                }
                
                // 个人简介
                if (userProfile.bio) {
                    yPosition = this.addPDFSection(doc, '📝 个人简介', yPosition);
                    const splitBio = doc.splitTextToSize(userProfile.bio, 170);
                    doc.setFontSize(10);
                    doc.setTextColor(80, 80, 80);
                    doc.text(splitBio, 20, yPosition);
                    yPosition += splitBio.length * 5 + 10;
                }
                
                // 页脚
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`导出时间: ${new Date().toLocaleString('zh-CN')}`, 105, 280, { align: 'center' });
                doc.text('美国牛逼大学 • 官方认证档案', 105, 285, { align: 'center' });
                
                // 保存文件
                const fileName = `NBU_${userProfile.oc_name || userProfile.display_name}_${this.getTimestamp()}.pdf`;
                doc.save(fileName);
                
                resolve();
                
            } catch (error) {
                reject(new Error('PDF生成失败: ' + error.message));
            }
        });
    }

    // 导出为PNG图片
    async exportAsPNG(userProfile) {
        return new Promise(async (resolve, reject) => {
            try {
                // 使用html2canvas将资料卡片转换为图片
                const profileCard = document.querySelector('.nbu-profile-header');
                if (!profileCard) {
                    throw new Error('找不到资料卡片元素');
                }
                
                const canvas = await html2canvas(profileCard, {
                    backgroundColor: '#252d38',
                    scale: 2, // 提高分辨率
                    useCORS: true,
                    allowTaint: true
                });
                
                // 转换为图片并下载
                const link = document.createElement('a');
                link.download = `NBU_${userProfile.oc_name || userProfile.display_name}_${this.getTimestamp()}.png`;
                link.href = canvas.toDataURL('image/png', 1.0);
                link.click();
                
                resolve();
                
            } catch (error) {
                reject(new Error('图片生成失败: ' + error.message));
            }
        });
    }

    // 导出为JSON
    async exportAsJSON(userProfile) {
        try {
            // 清理数据，移除内部字段
            const exportData = {
                metadata: {
                    exported_at: new Date().toISOString(),
                    source: '美国牛逼大学官方网站',
                    version: '1.0'
                },
                profile: {
                    // 只导出公开字段
                    display_name: userProfile.display_name,
                    avatar_url: userProfile.avatar_url,
                    bio: userProfile.bio,
                    role: userProfile.role,
                    oc_name: userProfile.oc_name,
                    oc_age: userProfile.oc_age,
                    oc_nationality: userProfile.oc_nationality,
                    oc_gender: userProfile.oc_gender,
                    oc_title: userProfile.oc_title,
                    major: userProfile.major,
                    student_id: userProfile.student_id,
                    dormitory: userProfile.dormitory,
                    enrollment_year: userProfile.enrollment_year,
                    clubs: userProfile.clubs,
                    department: userProfile.department,
                    faculty_rank: userProfile.faculty_rank,
                    office_location: userProfile.office_location,
                    office_hours: userProfile.office_hours,
                    courses: userProfile.courses,
                    degrees: userProfile.degrees
                }
            };
            
            // 创建并下载JSON文件
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.download = `NBU_${userProfile.oc_name || userProfile.display_name}_${this.getTimestamp()}.json`;
            link.href = URL.createObjectURL(dataBlob);
            link.click();
            
            // 清理URL
            setTimeout(() => URL.revokeObjectURL(link.href), 100);
            
        } catch (error) {
            throw new Error('JSON导出失败: ' + error.message);
        }
    }

    // PDF辅助方法
    addPDFSection(doc, title, yPosition) {
        if (yPosition > 250) {
            doc.addPage();
            yPosition = 30;
        }
        
        doc.setFontSize(12);
        doc.setTextColor(41, 128, 185);
        doc.setFont(undefined, 'bold');
        doc.text(title, 20, yPosition);
        
        doc.setDrawColor(41, 128, 185);
        doc.line(20, yPosition + 2, 50, yPosition + 2);
        
        return yPosition + 10;
    }

    addPDFField(doc, label, value, yPosition) {
        if (yPosition > 270) {
            doc.addPage();
            yPosition = 30;
        }
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont(undefined, 'normal');
        doc.text(label + ':', 20, yPosition);
        
        doc.setTextColor(50, 50, 50);
        doc.setFont(undefined, 'bold');
        doc.text(value.toString(), 60, yPosition);
        
        return yPosition + 6;
    }

    getRoleDisplay(role) {
        const roles = {
            student: '🎓 学生',
            faculty: '👨‍🏫 教职人员',
            visitor: '👀 访客'
        };
        return roles[role] || role;
    }

    getTimestamp() {
        return new Date().toISOString().slice(0, 10).replace(/-/g, '');
    }

    // UI状态管理
    showExportProgress(format) {
        // 可以在这里添加加载动画
        console.log(`⏳ 正在生成${this.exportFormats[format].name}...`);
    }

    showExportSuccess(format) {
        // 可以在这里添加成功提示
        console.log(`✅ ${this.exportFormats[format].name}导出成功！`);
    }

    showExportError(format, message) {
        alert(`❌ ${this.exportFormats[format].name}导出失败\n${message}`);
    }
}

// 创建全局实例
const profileExporter = new ProfileExporter();

// 全局导出函数
window.exportProfile = function(format, userId = null) {
    profileExporter.exportProfile(format, userId);
};