//const supabaseUrl = "https://grgpsujmjbeuphwvxhpg.supabase.co";
//const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3BzdWptamJldXBod3Z4aHBnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTIzNzExNCwiZXhwIjoyMDc0ODEzMTE0fQ.hy4_n74vuailNkPHWkt9YWINfQFsNuwLHNcg7knUlL4";
//const supabaseClient = supabase.createClient(supabaseUrl, supabaseServiceKey);

// nbu-members-directory.js - 成员目录模块
class MembersDirectory {
    constructor() {
        this.allMembers = [];
        this.filteredMembers = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
    }
    
    async init() {
        console.log("🚀 初始化成员目录模块");
        await this.loadMembers();
        this.renderStats();
        this.renderMembers();
        this.bindEvents();
    }
    
    // 使用与个人主页相同的头像优化逻辑
    getOptimizedAvatarUrl(originalUrl, size = 120) {
        if (!originalUrl) return this.getDefaultAvatar();
        
        // 如果是Supabase存储的图片，使用图片转换功能
        if (originalUrl.includes('supabase.co/storage/v1/object/public/avatars/')) {
            return `${originalUrl}?width=${size}&height=${size}&quality=80&fit=cover`;
        }
        
        // 如果是外部图片，直接返回
        return originalUrl;
    }
    
    getDefaultAvatar() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSI0MCIgZmlsbD0jQ0VDRkQxLz4KPHBhdGggZD0iTTQwIDE2MEM0MCAxMzEuMDQ2IDYzLjA0NiAxMDggOTIgMTA4SDEwOEMxMzYuOTU0IDEwOCAxNjAgMTMxLjA0NiAxNjAgMTYwVjE4MEg0MFYxNjBaIiBmaWxsPSIjQ0VDRkQxIi8+Cjwvc3ZnPg==';
    }
    
    async loadMembers() {
        try {
            console.log('👥 加载成员数据...');
            
            const { data: members, error } = await supabaseAdmin
                .from('user_profiles')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                throw new Error('加载成员数据失败: ' + error.message);
            }
            
            this.allMembers = members || [];
            this.filteredMembers = [...this.allMembers];
            
            console.log(`✅ 加载成功: ${this.allMembers.length} 位成员`);
            
        } catch (error) {
            console.error('❌ 加载成员失败:', error);
            this.showError('加载成员数据失败');
        }
    }
    
    renderStats() {
        const total = this.allMembers.length;
        const students = this.allMembers.filter(m => m.role === 'student').length;
        const faculty = this.allMembers.filter(m => m.role === 'faculty').length;
        const visitors = this.allMembers.filter(m => m.role === 'visitor').length;
        
        document.getElementById('total-count').textContent = total;
        document.getElementById('students-count').textContent = students;
        document.getElementById('faculty-count').textContent = faculty;
        document.getElementById('visitors-count').textContent = visitors;
    }
    
    renderMembers() {
        const grid = document.getElementById('members-grid');
        
        if (this.filteredMembers.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>没有找到成员</h3>
                    <p>${this.searchTerm ? '尝试调整搜索条件' : '还没有成员加入'}</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = this.filteredMembers.map(member => this.createMemberCard(member)).join('');
    }
    
    createMemberCard(member) {
        const roleDisplay = {
            'student': '🎓 学生',
            'faculty': '👨‍🏫 教职人员',
            'visitor': '👀 访客'
        };
        
        // 使用与个人主页相同的头像优化逻辑
        const optimizedAvatarUrl = this.getOptimizedAvatarUrl(member.avatar_url, 120);
        
        return `
            <div class="member-card" data-role="${member.role}">
                <div class="member-header">
                    <img src="${optimizedAvatarUrl}" 
                         alt="${member.display_name}" 
                         class="member-avatar"
                         onerror="this.src='${this.getDefaultAvatar()}'">
                    <div class="member-basic">
                        <h3>${member.oc_name || member.display_name || 'NBU成员'}</h3>
                        <p class="member-role">${roleDisplay[member.role] || '未知身份'}</p>
                    </div>
                </div>
                
                <div class="member-details">
                    <div class="member-meta">
                        ${member.oc_age ? `
                            <div class="meta-item">
                                <span class="meta-label">年龄</span>
                                <span class="meta-value">${member.oc_age}</span>
                            </div>
                        ` : ''}
                        
                        ${member.oc_nationality ? `
                            <div class="meta-item">
                                <span class="meta-label">国籍</span>
                                <span class="meta-value">${member.oc_nationality}</span>
                            </div>
                        ` : ''}
                        
                        ${member.major ? `
                            <div class="meta-item">
                                <span class="meta-label">专业</span>
                                <span class="meta-value">${member.major}</span>
                            </div>
                        ` : ''}
                        
                        ${member.student_id ? `
                            <div class="meta-item">
                                <span class="meta-label">学号</span>
                                <span class="meta-value">${member.student_id}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    ${member.bio ? `
                        <div class="member-bio">${member.bio}</div>
                    ` : ''}
                </div>
                
                <div class="member-actions">
                    <a href="/profile/?user=${encodeURIComponent(member.auth0_user_id)}" class="view-profile-btn">
                        查看资料
                    </a>
                </div>
            </div>
        `;
    }
    
    bindEvents() {
        // 筛选按钮
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                this.currentFilter = e.target.dataset.filter;
                this.applyFilters();
            });
        });
        
        // 搜索框
        document.getElementById('member-search').addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.applyFilters();
        });
    }
    
    applyFilters() {
        this.filteredMembers = this.allMembers.filter(member => {
            if (this.currentFilter !== 'all' && member.role !== this.currentFilter) {
                return false;
            }
            
            if (this.searchTerm) {
                const searchFields = [
                    member.oc_name,
                    member.display_name, 
                    member.major,
                    member.oc_nationality,
                    member.bio,
                    member.student_id
                ].filter(Boolean).join(' ').toLowerCase();
                
                return searchFields.includes(this.searchTerm);
            }
            
            return true;
        });
        
        this.renderMembers();
    }
    
    showError(message) {
        const grid = document.getElementById('members-grid');
        grid.innerHTML = `
            <div class="empty-state">
                <h3>❌ 加载失败</h3>
                <p>${message}</p>
                <button onclick="window.membersDirectory.init()" class="view-profile-btn" style="margin-top: 1rem;">
                    重试
                </button>
            </div>
        `;
    }
}

// 创建全局实例
const membersDirectory = new MembersDirectory();