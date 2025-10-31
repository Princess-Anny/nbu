const supabaseUrl_v = "https://grgpsujmjbeuphwvxhpg.supabase.co";
const supabaseServiceKey_v = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3BzdWptamJldXBod3Z4aHBnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTIzNzExNCwiZXhwIjoyMDc0ODEzMTE0fQ.hy4_n74vuailNkPHWkt9YWINfQFsNuwLHNcg7knUlL4";
const supabaseAdmin_v = supabase.createClient(supabaseUrl_v, supabaseServiceKey_v);
// 活动系统功能
        class EventsSystem {
            constructor() {
                this.events = [];
                this.filteredEvents = [];
                this.currentView = 'upcoming';
                this.init();
            }
            
            async init() {
                await this.loadEvents();
                this.renderEvents();
                this.bindEvents();
            }
            
            async loadEvents() {
                try {
                    console.log('🎉 加载活动数据...');
                    
                    const { data: events, error } = await supabaseAdmin_v
                        .from('campus_events')
                        .select(`
                            *,
                            organizer:user_profiles!organizer_id(display_name, oc_name, avatar_url),
                            registrations:event_registrations(count),
                            comments:event_comments(count)
                        `)
                        .order('start_time', { ascending: true });
                    
                    if (error) {
                        throw new Error('加载活动数据失败: ' + error.message);
                    }
                    
                    this.events = events || [];
                    this.applyViewFilter();
                    await this.updateStatus();
                    
                    console.log(`✅ 加载成功: ${this.events.length} 个活动`);
                    this.renderEvents();
                    
                } catch (error) {
                    console.error('❌ 加载活动失败:', error);
                    this.showError('加载活动数据失败');
                }
            }
            
            applyViewFilter() {
                const now = new Date();
                
                switch (this.currentView) {
                    case 'upcoming':
                        this.filteredEvents = this.events.filter(event => 
                            new Date(event.start_time) > now
                        );
                        break;
                    case 'ongoing':
                        this.filteredEvents = this.events.filter(event => 
                            new Date(event.start_time) <= now && 
                            new Date(event.end_time) >= now
                        );
                        break;
                    case 'my':
                        // 需要用户登录后实现
                        this.filteredEvents = this.events;
                        break;
                    default:
                        this.filteredEvents = this.events;
                }
            }
            
            async updateStatus(){
                for(let i = 0; i<this.filteredEvents.length; i++){                   
                    const { data, error } = await supabaseAdmin_v
                        .from('campus_events')
                        .update({ status: this.currentView })
                        .eq('id', this.filteredEvents[i].id)        
                    if (error) {
                        throw new Error('更新活动状态失败: ' + error.message);
                    }      
                }
            }
            
            renderEvents() {
                const grid = document.getElementById('events-grid');
                
                if (this.filteredEvents.length === 0) {
                    grid.innerHTML = `
                        <div class="empty-state">
                            <h3>暂无活动</h3>
                            <p>${this.currentView === 'upcoming' ? '暂时没有即将开始的活动' : '没有找到相关活动'}</p>
                        </div>
                    `;
                    return;
                }
                
                grid.innerHTML = this.filteredEvents.map(event => this.createEventCard(event)).join('');
            }
            
            createEventCard(event) {
                const eventTypes = {
                    'lecture': '学术讲座',
                    'workshop': '工作坊',
                    'social': '社交活动',
                    'club': '社团活动',
                    'sports': '体育赛事'
                };
                
                const startTime = new Date(event.start_time);
                const now = new Date();
                const isUpcoming = startTime > now;
                const isOngoing = startTime <= now && new Date(event.end_time) >= now;
                
                return `
                    <div class="event-card" data-event-id="${event.id}">
                        <div class="event-cover">
                            ${event.cover_image ? 
                                `<img src="${event.cover_image}" alt="${event.title}">` : 
                                '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:white;font-size:3rem;">🎉</div>'
                            }
                            <div class="event-type">${eventTypes[event.event_type] || '活动'}</div>
                            <div class="event-status ${isOngoing ? 'ongoing' : 'upcoming'}">
                                ${isOngoing ? '进行中' : '即将开始'}
                            </div>
                        </div>
                        
                        <div class="event-content">
                            <h3 class="event-title">${event.title}</h3>
                            
                            <div class="event-meta">
                                <div class="meta-item">
                                    🕐 ${startTime.toLocaleString()}
                                </div>
                                <div class="meta-item">
                                    📍 ${event.location || '线上活动'}
                                </div>
                                <div class="meta-item">
                                    👤 ${event.organizer?.oc_name || event.organizer?.display_name || 'NBU成员'}
                                </div>
                            </div>
                            
                            <div class="event-description">
                                ${event.description || '暂无描述'}
                            </div>
                            
                            <div class="event-stats">
                                <div class="participants-count">
                                    👥 ${event.registrations?.[0]?.count || 0} 人报名
                                </div>
                                <div class="comments-count">
                                    💬 ${event.comments?.[0]?.count || 0}
                                </div>
                            </div>
                            
                            <div class="event-actions">
                                <button class="event-btn primary" onclick="eventsSystem.registerForEvent('${event.id}')">
                                    ${isOngoing ? '立即参与' : '立即报名'}
                                </button>
                                <a href="/events/detail/?id=${event.id}" class="event-btn">
                                    查看详情
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            async registerForEvent(eventId) {
                // 报名逻辑 - 需要用户登录
                if (!await this.checkAuth()) {
                    alert('请先登录后再报名活动');
                    return;
                }
                
                console.log('报名活动:', eventId);
                try {
                    const user = await nbuAuthClient.getUser();
                    const userProfile = await handleUserProfile(user);
                    
                    const { data, error } = await supabaseAdmin_v
                        .from('event_registrations')
                        .insert([{
                            event_id: eventId,
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
                    await this.loadEvents();
                    
                } catch (error) {
                    console.error('❌ 报名失败:', error);
                    alert('报名失败: ' + error.message);
                }
            }
            
            async checkAuth() {
                // 检查用户是否登录
                if (typeof nbuAuthClient === 'undefined') return false;
                return await nbuAuthClient.isAuthenticated();
            }
            
            bindEvents() {
                // 视图切换
                document.querySelectorAll('.view-option').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        document.querySelectorAll('.view-option').forEach(b => b.classList.remove('active'));
                        e.target.classList.add('active');
                        
                        this.currentView = e.target.dataset.view;
                        this.applyViewFilter();
                        this.updateStatus();
                        this.renderEvents();
                    });
                });
            }
            
            showError(message) {
                const grid = document.getElementById('events-grid');
                grid.innerHTML = `
                    <div class="empty-state">
                        <h3>❌ 加载失败</h3>
                        <p>${message}</p>
                        <button onclick="eventsSystem.init()" class="create-event-btn" style="margin-top: 1rem;">
                            重试
                        </button>
                    </div>
                `;
            }
        }
        
        // 创建全局实例
        const eventsSystem = new EventsSystem();