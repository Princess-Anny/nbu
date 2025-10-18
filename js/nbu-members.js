
        class MembersDirectory {
            constructor() {
                this.allMembers = [];
                this.filteredMembers = [];
                this.currentFilter = 'all';
                this.searchTerm = '';
                this.init();
            }
            
            async init() {
                await this.loadMembers();
                this.renderStats();
                this.renderMembers();
                this.bindEvents();
            }
            
            // 渲染统计信息
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

        // 加载其他用户资料
        async loadMembers() {
            try {
                console.log('👥 加载成员数据...');
                    
                const { data: members, error } = await supabaseAdmin_t
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
            
            // 渲染成员网格
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

            // 获取优化后的头像URL
            getOptimizedAvatarUrl(originalUrl) {
                if (!originalUrl) return getDefaultAvatar();
                
                // 如果是Supabase存储的图片，使用图片转换功能
                if (originalUrl.includes('supabase.co/storage/v1/object/public/avatars/')) {
                    // 移除可能存在的重复参数，然后添加优化参数
                    const baseUrl = originalUrl.split('?')[0];
                    console.log("supabase图片");
                    return baseUrl + '?width=200&height=200&quality=80&fit=cover';
                }
                
                // 如果是外部图片，直接返回
                console.log("外部图片");
                return originalUrl;
            }
            
            // 获取默认头像
            getDefaultAvatar() {
                return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjgwIiByPSI0MCIgZmlsbD0jQ0VDRkQxLz4KPHBhdGggZD0iTTQwIDE2MEM0MCAxMzEuMDQ2IDYzLjA0NiAxMDggOTIgMTA4SDEwOEMxMzYuOTU0IDEwOCAxNjAgMTMxLjA0NiAxNjAgMTYwVjE4MEg0MFYxNjBaIiBmaWxsPSIjQ0VDRkQxIi8+Cjwvc3ZnPg==';
            }

            // 创建成员卡片
            createMemberCard(member) {
                console.log("🔍 成员头像调试:", {
                    display_name: member.display_name,
                    avatar_url: member.avatar_url,
                    has_avatar: !!member.avatar_url
                });
                const roleDisplay = {
                    'student': '🎓 学生',
                    'faculty': '👨‍🏫 教职人员',
                    'visitor': '👀 访客'
                };
                
                const roleIcon = {
                    'student': '🎓',
                    'faculty': '👨‍🏫', 
                    'visitor': '👀'
                };
                
                const optimizedAvatarUrl = this.getOptimizedAvatarUrl(member.avatar_url);
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
            
            // 绑定事件
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
            
            // 应用筛选和搜索
            applyFilters() {
                this.filteredMembers = this.allMembers.filter(member => {
                    // 角色筛选
                    if (this.currentFilter !== 'all' && member.role !== this.currentFilter) {
                        return false;
                    }
                    
                    // 搜索筛选
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
            

        }
        
        // 创建全局实例
        const membersDirectory = new MembersDirectory();