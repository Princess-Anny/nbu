// Supabase配置
const supabaseUrl = "https://grgpsujmjbeuphwvxhpg.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3BzdWptamJldXBod3Z4aHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMzcxMTQsImV4cCI6MjA3NDgxMzExNH0.0JrMADWxkwwJiPnuJ-Ah2Xz-JlBbBhd4KcYJzlPCfI8";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3BzdWptamJldXBod3Z4aHBnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTIzNzExNCwiZXhwIjoyMDc0ODEzMTE0fQ.hy4_n74vuailNkPHWkt9YWINfQFsNuwLHNcg7knUlL4";
let supabaseClient = null;
let supabaseAdmin = null;
let nbuAuthClient = null;
let selectedRole = null;
// 资料编辑功能
let currentUserProfile = null;

// NBU用户认证逻辑 - 修复刷新问题版
console.log("🔧 nbu-auth.js 开始加载");

// 初始化Supabase客户端
function initializeSupabase() {
    if (typeof supabase === 'undefined') {
        console.error('❌ Supabase库未加载');
        return false;
    }
    supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);
    supabaseAdmin = supabase.createClient(supabaseUrl, supabaseServiceKey);
    console.log("✅ Supabase客户端已初始化");
    return true;
}

// 主要的初始化函数
async function initializeNBUAuth() {
    console.log("🚀 开始初始化Auth0客户端");
    
    try {
        // 检查Auth0库是否可用
        if (typeof auth0 === 'undefined') {
            console.error('❌ Auth0库未加载');
            return;
        }
        
        console.log("✅ Auth0库已加载，开始创建客户端实例");
        
        // 创建Auth0客户端
        nbuAuthClient = await auth0.createAuth0Client({
            domain: "dev-qajzo556g32cbm5b.us.auth0.com",
            clientId: "MCa52JMm0fAX4uAxRMOW636zkNU1wYN3",
            authorizationParams: {
                redirect_uri: "https://niubiuniversity.dpdns.org/"
            },
            cacheLocation: 'localstorage' // 明确指定使用localStorage持久化
        });

        console.log("🎉 Auth0客户端初始化成功!");
        
        // 处理认证流程（包括回调和状态检查）
        await handleAuthentication();
        
    } catch (error) {
        console.error("💥 Auth0初始化失败:", error);
    }
}

// 处理所有认证相关逻辑
async function handleAuthentication() {
    const query = window.location.search;
    console.log("🔍 当前URL参数:", query);
    
    // 情况1：有回调参数（刚从Auth0跳转回来）
    if (query.includes('state=') && query.includes('code=')) {
        console.log("🔄 检测到Auth0回调，正在处理...");
        try {
            await nbuAuthClient.handleRedirectCallback();
            // 清除URL参数，避免重复处理
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log("✅ 回调处理完成，URL已清理");
        } catch (error) {
            console.error("❌ 回调处理失败:", error);
        }
    }
    
    // 情况2：检查持久化登录状态（页面刷新或导航）
    await checkLoginStatus();
}

// 检查登录状态
async function checkLoginStatus() {
    if (!nbuAuthClient) {
        console.log("⚠️ 客户端未就绪，跳过状态检查");
        return;
    }
    
    try {
        const isAuthenticated = await nbuAuthClient.isAuthenticated();
        console.log("🔐 持久化登录状态:", isAuthenticated);
        
        await updateAuthUI();
        
    } catch (error) {
        console.error("❌ 检查登录状态时出错:", error);
    }
}

// 更新UI显示
async function updateAuthUI() {
    if (!nbuAuthClient) {
        console.log("⚠️ 客户端未就绪，跳过UI更新");
        return;
    }
    
    try {
        const isAuthenticated = await nbuAuthClient.isAuthenticated();
        console.log("🎨 更新UI，登录状态:", isAuthenticated);
        
        const loginSection = document.getElementById('nbu-login-section');
        const userSection = document.getElementById('nbu-user-section');
        
        if (!loginSection || !userSection) {
            console.error("❌ 找不到登录组件元素");
            return;
        }

        if (isAuthenticated) {
            // 用户已登录 - 获取用户信息和资料
            const user = await nbuAuthClient.getUser();
            console.log("👤 Auth0用户信息:", user);
            
            // 处理用户资料（创建或读取）
            const userProfile = await handleUserProfile(user);
            console.log("📊 用户资料:", userProfile);
            currentUserProfile = userProfile;
            
            // 更新UI显示
            loginSection.style.display = 'none';
            userSection.style.display = 'block';
            
            // 显示用户信息（优先显示OC名，没有则显示邮箱）
            const displayName = userProfile?.oc_name || userProfile?.display_name || user.name || user.nickname || user.email || 'NBU用户';
            document.getElementById('nbu-user-name').textContent = displayName;
            document.getElementById('nbu-user-avatar').src = userProfile?.avatar_url || user.picture;
            
            console.log("👤 显示用户信息:", displayName);
            
        } else {
            // 用户未登录
            loginSection.style.display = 'block';
            userSection.style.display = 'none';
            console.log("🔓 显示登录按钮");
        }
        
    } catch (error) {
        console.error("❌ 更新UI时出错:", error);
    }
    // 更新导航栏头像显示
    function updateNavbarAvatar(avatarUrl) {
        const navbarAvatar = document.getElementById('nbu-user-avatar');
        if (navbarAvatar) {
            const optimizedUrl = getOptimizedNavbarAvatarUrl(avatarUrl);
            navbarAvatar.src = optimizedUrl;
            // 确保CSS强制尺寸
            navbarAvatar.style.width = '28px';
            navbarAvatar.style.height = '28px';
            navbarAvatar.style.objectFit = 'cover';
        }
    }

    // 导航栏头像优化（更小的尺寸）
    function getOptimizedNavbarAvatarUrl(originalUrl) {
        if (!originalUrl) return getDefaultAvatar();
        
        if (originalUrl.includes('supabase.co/storage/v1/object/public/avatars/')) {
            const baseUrl = originalUrl.split('?')[0];
            return baseUrl + '?width=56&height=56&quality=80&fit=cover';
        }
        
        return originalUrl;
    }
}

// 修改所有使用supabase的函数，添加检查
async function handleUserProfile(auth0User) {
    // 检查Supabase是否初始化
    if (!supabaseClient) {
        console.error('❌ Supabase客户端未初始化');
        return null;
    }
    try {
        const auth0UserId = auth0User.sub;
        const userEmail = auth0User.email;
        
        console.log("🔄 处理用户资料，Auth0 ID:", auth0UserId);
        
        // 1. 尝试读取现有资料
        const { data: existingProfile, error: readError } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('auth0_user_id', auth0UserId)
            .single();
        
        if (readError && readError.code !== 'PGRST116') { // PGRST116是"未找到记录"
            console.error("❌ 读取用户资料失败:", readError);
            return null;
        }
        
        // 2. 如果资料不存在，创建新资料
        if (!existingProfile) {
            console.log("📝 创建新用户资料");
            
            // 从sessionStorage获取选择的身份，然后清除
            const savedRole = sessionStorage.getItem('nbu_selected_role');
            if (savedRole) {
                sessionStorage.removeItem('nbu_selected_role');
            }
            const userRole = savedRole || selectedRole || 'visitor';
            
            const newProfile = {
                auth0_user_id: auth0UserId,
                role: userRole,
                display_name: auth0User.name || auth0User.nickname,
                avatar_url: auth0User.picture,
                bio: '',
                // OC字段根据身份决定是否初始化
                oc_name: userRole !== 'visitor' ? auth0User.name || '' : null,
                oc_age: userRole !== 'visitor' ? null : null,
                oc_nationality: userRole !== 'visitor' ? '' : null,
                oc_gender: userRole !== 'visitor' ? '' : null,
                oc_title: userRole !== 'visitor' ? '' : null
            };
            
            const { data: createdProfile, error: createError } = await supabaseAdmin
                .from('user_profiles')
                .insert([newProfile])
                .select()
                .single();
            
            if (createError) {
                console.error("❌ 创建用户资料失败:", createError);
                return null;
            }
            
            console.log("✅ 用户资料创建成功:", createdProfile);
            return createdProfile;
        }
        
        // 3. 资料已存在，直接返回
        console.log("✅ 读取现有用户资料:", existingProfile);
        return existingProfile;
        
    } catch (error) {
        console.error("❌ 处理用户资料时出错:", error);
        return null;
    }
}

// 登录函数
async function nbuHandleLogin() {
    console.log("🎯 登录按钮被点击，显示身份选择");
    
    // 先检查是否已经登录
    if (!nbuAuthClient) {
        console.log("🔄 Auth客户端未初始化，正在初始化...");
        await initializeNBUAuth();
    }
    
    if (nbuAuthClient) {
        const isAuthenticated = await nbuAuthClient.isAuthenticated();
        if (isAuthenticated) {
            console.log("ℹ️ 用户已登录，无需重复登录");
            return;
        }
    }
    
    // 显示身份选择模态框（停止后续执行）
    showNBURoleModal();
}

// 显示身份选择模态框
function showNBURoleModal() {
    console.log("🔄 显示身份选择模态框");
    const modal = document.getElementById('nbu-role-modal');
    if (modal) {
        modal.style.display = 'flex';
        resetRoleSelection();
    }
}

// 隐藏身份选择模态框
function hideNBURoleModal() {
    const modal = document.getElementById('nbu-role-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 重置选择状态
function resetRoleSelection() {
    const secretSection = document.getElementById('nbu-secret-section');
    const secretKey = document.getElementById('nbu-secret-key');
    const secretHint = document.getElementById('nbu-secret-hint');
    
    if (secretSection) secretSection.style.display = 'none';
    if (secretKey) secretKey.value = '';
    if (secretHint) secretHint.textContent = '';
    
    selectedRole = null;
}

// 选择身份
function selectNBURole(role) {
    console.log("🎯 选择身份:", role);
    selectedRole = role;
    
    const secretSection = document.getElementById('nbu-secret-section');
    const secretLabel = document.getElementById('nbu-secret-label');
    
    if (!secretSection || !secretLabel) {
        console.error("❌ 找不到密钥相关元素");
        return;
    }
    
    if (role === 'visitor') {
        // 访客直接进入Auth0登录
        secretSection.style.display = 'none';
        proceedToAuth0Login();
    } else {
        // 学生/教职需要密钥
        secretSection.style.display = 'block';
        secretLabel.textContent = role === 'student' 
            ? '请输入学生密钥：' 
            : '请输入教职密钥：';
    }
}

async function proceedToAuth0Login() {
    console.log("🚀 继续Auth0登录流程，选择的身份:", selectedRole);
    
    // 将选择的身份保存到sessionStorage，确保登录后还能访问
    if (selectedRole) {
        sessionStorage.setItem('nbu_selected_role', selectedRole);
    }
    
    // 隐藏身份选择模态框
    hideNBURoleModal();

    if (!nbuAuthClient) {
        console.error("❌ Auth客户端未初始化");
        await initializeNBUAuth();
        
        if (!nbuAuthClient) {
            alert("认证系统初始化失败，请刷新页面重试");
            return;
        }
    }
    
    // 最终检查是否已经登录
    const isAuthenticated = await nbuAuthClient.isAuthenticated();
    if (isAuthenticated) {
        console.log("ℹ️ 用户已登录，无需重复登录");
        return;
    }
    
    console.log("🔑 跳转到Auth0登录页面...");
    await nbuAuthClient.loginWithRedirect();
}

// 验证密钥函数
async function verifyNBUSecretKey() {
    const secretKeyInput = document.getElementById('nbu-secret-key');
    const hintElement = document.getElementById('nbu-secret-hint');
    
    if (!secretKeyInput || !hintElement) {
        console.error("❌ 找不到密钥输入元素");
        return;
    }
    
    const secretKey = secretKeyInput.value;
    console.log("🔐 验证密钥，身份:", selectedRole, "密钥:", secretKey);
    
    if (!secretKey) {
        hintElement.textContent = '请输入密钥';
        hintElement.style.color = '#e74c3c';
        return;
    }
    
    // 定义密钥
    const secretKeys = {
        student: "NBU_STUDENT_2010",
        faculty: "NBU_PROFESSOR_2010"
    };
    
    const expectedKey = secretKeys[selectedRole];
    
    if (secretKey === expectedKey) {
        // 密钥正确
        hintElement.textContent = '✓ 密钥验证成功！';
        hintElement.style.color = '#27ae60';
        
        // 延迟一下让用户看到成功提示
        setTimeout(() => {
            proceedToAuth0Login();
        }, 1000);
        
    } else {
        // 密钥错误
        hintElement.textContent = '✗ 密钥错误，请重新输入';
        hintElement.style.color = '#e74c3c';
        secretKeyInput.value = '';
        secretKeyInput.focus(); // 重新聚焦到输入框
    }
}

// 登出函数
async function nbuHandleLogout() {
    console.log("🎯 退出按钮被点击");
    
    if (!nbuAuthClient) {
        console.error("❌ Auth客户端未初始化");
        return;
    }
    
    console.log("🚪 执行登出...");
    await nbuAuthClient.logout({
        logoutParams: {
            returnTo: "https://niubiuniversity.dpdns.org/"
        }
    });
}

// 显示编辑模态框
async function showEditProfileModal() {
    console.log("📝 显示资料编辑模态框");
    
    if (!currentUserProfile) return;
    
    const modal = document.getElementById('nbu-edit-profile-modal');
    const ocSection = document.getElementById('nbu-oc-section');
    const studentSection = document.getElementById('nbu-student-section');
    const facultySection = document.getElementById('nbu-faculty-section');
    
    // 填充基础数据（现有代码）
    document.getElementById('edit-display-name').value = currentUserProfile.display_name || '';
    document.getElementById('edit-avatar-url').value = currentUserProfile.avatar_url || '';
    document.getElementById('edit-bio').value = currentUserProfile.bio || '';
    
    // 根据身份显示相应字段
    if (currentUserProfile.role === 'student') {
        ocSection.style.display = 'block';
        studentSection.style.display = 'block';
        facultySection.style.display = 'none';
        
        // 填充学生数据
        document.getElementById('edit-major').value = currentUserProfile.major || '';
        document.getElementById('edit-student-id').value = currentUserProfile.student_id || '';
        document.getElementById('edit-dormitory').value = currentUserProfile.dormitory || '';
        document.getElementById('edit-enrollment-year').value = currentUserProfile.enrollment_year || '';
        document.getElementById('edit-clubs').value = currentUserProfile.clubs ? currentUserProfile.clubs.join('\n') : '';
        
    } else if (currentUserProfile.role === 'faculty') {
        ocSection.style.display = 'block';
        studentSection.style.display = 'none';
        facultySection.style.display = 'block';
        
        // 填充教职数据
        document.getElementById('edit-department').value = currentUserProfile.department || '';
        document.getElementById('edit-office-location').value = currentUserProfile.office_location || '';
        document.getElementById('edit-office-hours').value = currentUserProfile.office_hours || '';
        document.getElementById('edit-faculty-rank').value = currentUserProfile.faculty_rank || '';
        document.getElementById('edit-courses').value = currentUserProfile.courses ? currentUserProfile.courses.join('\n') : '';
        document.getElementById('edit-degrees').value = currentUserProfile.degrees ? currentUserProfile.degrees.join('\n') : '';
        
    } else {
        // 访客
        ocSection.style.display = 'none';
        studentSection.style.display = 'none';
        facultySection.style.display = 'none';
    }
    
    // 填充OC数据（现有代码）
    if (currentUserProfile.role !== 'visitor') {
        document.getElementById('edit-oc-name').value = currentUserProfile.oc_name || '';
        document.getElementById('edit-oc-age').value = currentUserProfile.oc_age || '';
        document.getElementById('edit-oc-nationality').value = currentUserProfile.oc_nationality || '';
        document.getElementById('edit-oc-gender').value = currentUserProfile.oc_gender || '';
        document.getElementById('edit-oc-title').value = currentUserProfile.oc_title || '';
    }
    
    modal.style.display = 'flex';
}

// 隐藏编辑模态框
function hideEditProfileModal() {
    const modal = document.getElementById('nbu-edit-profile-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// 扩展保存资料函数
async function saveUserProfile(formData) {
    try {
        console.log("💾 保存用户资料:", formData);
        
        // 处理数组字段（将文本区域转换为数组）
        if (formData.clubs && typeof formData.clubs === 'string') {
            formData.clubs = formData.clubs.split('\n').filter(item => item.trim() !== '');
        }
        if (formData.courses && typeof formData.courses === 'string') {
            formData.courses = formData.courses.split('\n').filter(item => item.trim() !== '');
        }
        if (formData.degrees && typeof formData.degrees === 'string') {
            formData.degrees = formData.degrees.split('\n').filter(item => item.trim() !== '');
        }
        
        const { data, error } = await supabaseAdmin
            .from('user_profiles')
            .update(formData)
            .eq('auth0_user_id', currentUserProfile.auth0_user_id)
            .select()
            .single();
        
        if (error) throw error;
        
        console.log("✅ 资料保存成功:", data);
        currentUserProfile = data;
        await updateAuthUI();
        
        return data;
        
    } catch (error) {
        console.error("❌ 保存资料时出错:", error);
        throw error;
    }
}

// 专业数据配置
const MAJOR_DATA = [
    { id: 'cs', name: '计算机科学', code: 'CS', category: '工程学' },
    { id: 'ai', name: '人工智能', code: 'AI', category: '工程学' },
    { id: 'dts', name: '数据科学', code: 'DTS', category: '工程学' },
    { id: 'eee', name: '电子电气工程', code: 'EEE', category: '工程学' },
    { id: 'mce', name: '机械工程', code: 'MCE', category: '工程学' },
    { id: 'civ', name: '土木工程', code: 'CIV', category: '工程学' },
    { id: 'che', name: '化学工程', code: 'CHE', category: '工程学' },
    { id: 'ae', name: '航空航天工程', code: 'AE', category: '工程学' },
    { id: 'bme', name: '生物医学工程', code: 'BME', category: '工程学' },
    { id: 'ie', name: '工业工程', code: 'IE', category: '工程学' },
    { id: 'mse', name: '材料科学与工程', code: 'MSE', category: '工程学' },
    { id: 'app', name: '应用物理', code: 'APP', category: '工程学' },
    { id: 'swe', name: '软件工程', code: 'SWE', category: '工程学' },
    { id: 'eco', name: '经济学', code: 'ECO', category: '社会科学' },
    { id: 'pol', name: '政治学', code: 'POL', category: '社会科学' },
    { id: 'psy', name: '心理学', code: 'PSY', category: '社会科学' },
    { id: 'cmn', name: '犯罪心理学', code: 'CMN', category: '社会科学' },
    { id: 'soc', name: '社会学', code: 'SOC', category: '社会科学' },
    { id: 'com', name: '传播学', code: 'COM', category: '社会科学' },
    { id: 'jou', name: '新闻学', code: 'JOU', category: '社会科学' },
    { id: 'int', name: '国际关系', code: 'INT', category: '社会科学' },
    { id: 'eth', name: '种族与民族研究', code: 'ETH', category: '社会科学' },
    { id: 'law', name: '法律学', code: 'LAW', category: '社会科学' },
    { id: 'fma', name: '电影艺术', code: 'FMA', category: '艺术类' },
    { id: 'art', name: '美术', code: 'ART', category: '艺术类' },
    { id: 'mus', name: '音乐', code: 'MUS', category: '艺术类' },
    { id: 'thr', name: '戏剧/戏剧艺术', code: 'THR', category: '艺术类' },
    { id: 'arh', name: '艺术史', code: 'ARH', category: '艺术类' },
    { id: 'dsn', name: '设计', code: 'DSN', category: '艺术类' },
    { id: 'pht', name: '摄影', code: 'PHT', category: '艺术类' },
    { id: 'vcm', name: '声乐', code: 'VCM', category: '艺术类' },
    { id: 'gdn', name: '园艺学', code: 'GDN', category: '艺术类' },
    { id: 'dga', name: '数字艺术', code: 'DGA', category: '艺术类' },
    { id: 'bsm', name: '商业管理', code: 'BSM', category: '商科' },
    { id: 'fin', name: '金融学', code: 'FIN', category: '商科' },
    { id: 'mkt', name: '市场营销', code: 'MKT', category: '商科' },
    { id: 'acc', name: '会计学', code: 'ACC', category: '商科' },
    { id: 'ant', name: '人类学', code: 'ANT', category: '人文科学' },
    { id: 'hst', name: '历史学', code: 'HST', category: '人文科学' },
    { id: 'phl', name: '哲学', code: 'PHL', category: '人文科学' },
    { id: 'eng', name: '英语语言文学', code: 'ENG', category: '人文科学' },
    { id: 'cpl', name: '比较文学', code: 'CPL', category: '人文科学' },
    { id: 'lng', name: '语言学', code: 'LNG', category: '人文科学' },
    { id: 'rac', name: '宗教与文化研究', code: 'RAC', category: '人文科学' },
    { id: 'mys', name: '神秘学', code: 'MYS', category: '特殊学科' },
    { id: 'pe', name: '体育', code: 'PE', category: '特殊学科' },
    { id: 'env', name: '环境科学', code: 'ENV', category: '自然科学' },
    { id: 'anm', name: '动物学', code: 'ANM', category: '自然科学' },
    { id: 'mat', name: '数学', code: 'MAT', category: '自然科学' },
    { id: 'trp', name: '理论物理', code: 'TRP', category: '自然科学' },
    { id: 'chm', name: '化学', code: 'CHM', category: '自然科学' },
    { id: 'bio', name: '生物学', code: 'BIO', category: '自然科学' },
    { id: 'bch', name: '生物化学', code: 'BCH', category: '自然科学' },
    { id: 'cmb', name: '细胞与分子生物学', code: 'CMB', category: '自然科学' },
    { id: 'nsc', name: '神经科学', code: 'NSC', category: '自然科学' },
    { id: 'geo', name: '地质学', code: 'GEO', category: '自然科学' },
    { id: 'ast', name: '天文学', code: 'AST', category: '自然科学' },
    { id: 'sta', name: '统计学', code: 'STA', category: '自然科学' },
    { id: 'mrb', name: '海洋生物学', code: 'MRB', category: '自然科学' },
    { id: 'atm', name: '解剖学', code: 'ATM', category: '自然科学' },
    { id: 'frm', name: '法医学', code: 'FRM', category: '医学' },
    { id: 'orm', name: '口腔医学', code: 'ORM', category: '医学' },
    { id: 'amm', name: '动物医学', code: 'AMM', category: '医学' },
    { id: 'clp', name: '临床心理学', code: 'CLP', category: '医学' },
];

// 按类别分组专业
const MAJORS_BY_CATEGORY = MAJOR_DATA.reduce((acc, major) => {
    if (!acc[major.category]) {
        acc[major.category] = [];
    }
    acc[major.category].push(major);
    return acc;
}, {});

// 专业搜索下拉框功能
class MajorSearchSelect {
    constructor() {
        this.isOpen = false;
        this.selectedMajor = null;
        this.init();
    }
    
    init() {
        this.renderDropdown();
        this.bindEvents();
    }
    
    // 渲染下拉选项
    renderDropdown(filterText = '') {
        const dropdown = document.getElementById('major-options');
        if (!dropdown) return;
        
        const filteredMajors = this.filterMajors(filterText);
        let html = '';
        
        if (filteredMajors.length === 0) {
            html = '<div class="nbu-dropdown-empty">未找到匹配的专业</div>';
        } else {
            // 按类别分组显示
            Object.keys(filteredMajors).forEach(category => {
                html += `<div class="nbu-category-header">${category}</div>`;
                filteredMajors[category].forEach(major => {
                    html += `
                        <div class="nbu-dropdown-item" 
                             data-major-id="${major.id}"
                             data-major-name="${major.name}"
                             data-major-code="${major.code}"
                             onclick="majorSelect.selectMajor('${major.id}')">
                            <span class="nbu-major-name">${this.highlightText(major.name, filterText)}</span>
                            <span class="nbu-major-code">${major.code}</span>
                        </div>
                    `;
                });
            });
        }
        
        dropdown.innerHTML = html;
    }
    
    // 过滤专业
    filterMajors(filterText) {
        if (!filterText) {
            return MAJORS_BY_CATEGORY;
        }
        
        const filtered = {};
        const lowerFilter = filterText.toLowerCase();
        
        Object.keys(MAJORS_BY_CATEGORY).forEach(category => {
            const filteredInCategory = MAJORS_BY_CATEGORY[category].filter(major => 
                major.name.toLowerCase().includes(lowerFilter) ||
                major.code.toLowerCase().includes(lowerFilter) ||
                major.category.toLowerCase().includes(lowerFilter)
            );
            
            if (filteredInCategory.length > 0) {
                filtered[category] = filteredInCategory;
            }
        });
        
        return filtered;
    }
    
    // 高亮匹配文本
    highlightText(text, filter) {
        if (!filter) return text;
        
        const lowerText = text.toLowerCase();
        const lowerFilter = filter.toLowerCase();
        const index = lowerText.indexOf(lowerFilter);
        
        if (index === -1) return text;
        
        return text.substring(0, index) + 
               '<mark>' + text.substring(index, index + filter.length) + '</mark>' +
               text.substring(index + filter.length);
    }
    
    // 选择专业
    selectMajor(majorId) {
        const major = MAJOR_DATA.find(m => m.id === majorId);
        if (!major) return;
        
        this.selectedMajor = major;
        
        // 更新UI
        document.getElementById('major-search').value = major.name;
        document.getElementById('edit-major').value = major.name;
        
        // 隐藏下拉框
        this.hideDropdown();
        
        // 触发学号预览更新
        updateStudentIdPreview();  // 确保这行存在
        
        console.log('🎓 选择专业:', major.name);
    }
    
    // 显示下拉框
    showDropdown() {
        const dropdown = document.getElementById('major-dropdown');
        if (dropdown) {
            dropdown.style.display = 'block';
            this.isOpen = true;
        }
    }
    
    // 隐藏下拉框
    hideDropdown() {
        const dropdown = document.getElementById('major-dropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
            this.isOpen = false;
        }
    }
    
    // 绑定事件
    bindEvents() {
        // 点击页面其他区域关闭下拉框
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nbu-search-select')) {
                this.hideDropdown();
            }
        });
        
        // 输入框键盘事件
        const searchInput = document.getElementById('major-search');
        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.hideDropdown();
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    this.focusFirstItem();
                }
            });
        }
    }
    
    // 聚焦第一个选项
    focusFirstItem() {
        const firstItem = document.querySelector('.nbu-dropdown-item');
        if (firstItem) {
            firstItem.focus();
        }
    }
}

// 创建全局实例
const majorSelect = new MajorSearchSelect();

// 全局函数供HTML调用
function showMajorDropdown() {
    majorSelect.showDropdown();
}

function filterMajors(value) {
    majorSelect.renderDropdown(value);
    majorSelect.showDropdown();
}

class StudentIdGenerator {
    async generateStudentId(majorName, enrollmentYear) {
        const major = MAJOR_DATA.find(m => m.name === majorName);
        if (!major) {
            throw new Error('未知专业: ' + majorName);
        }
        let year;
        if (enrollmentYear && enrollmentYear.trim() !== '') {
            year = parseInt(enrollmentYear);
        } else {
            year = new Date().getFullYear();
        }
        
        // 验证年份范围
        if (year < 2000 || year > 2030) {
            throw new Error('入学年份必须在2000-2030之间');
        }
        
        const deptCode = major.code;
        const sequence = await this.getNextSequence(year, deptCode);
        
        console.log(`🎓 生成学号: 专业=${majorName}, 年份=${year}, 序列=${sequence}`);
        return `${year}${deptCode}${sequence.toString().padStart(3, '0')}`;
    }
    // 获取下一个序列号
    async getNextSequence(year, deptCode) {
        try {
            // 查询该专业当年的最大序列号
            const { data: existingStudents, error } = await supabaseAdmin
                .from('user_profiles')
                .select('student_id')
                .eq('role', 'student')
                .like('student_id', `${year}${deptCode}%`);
            
            if (error) {
                console.error('❌ 查询学号失败:', error);
                return 1; // 默认从1开始
            }
            
            if (!existingStudents || existingStudents.length === 0) {
                return 1;
            }
            
            // 提取最大序列号
            const maxSequence = existingStudents.reduce((max, student) => {
                const sequence = parseInt(student.student_id.slice(6)) || 0;
                return Math.max(max, sequence);
            }, 0);
            
            return maxSequence + 1;
            
        } catch (error) {
            console.error('❌ 获取序列号失败:', error);
            return 1;
        }
    }
    
    // 验证学号格式
    isValidStudentId(studentId) {
        const pattern = /^\d{4}[A-Z]{2}\d{3}$/;
        return pattern.test(studentId);
    }
}

// 创建全局实例
const studentIdGenerator = new StudentIdGenerator();

// 学号预览更新
async function updateStudentIdPreview() {
    const majorSelect = document.getElementById('major-search');
    const previewDiv = document.getElementById('student-id-preview');
    const previewText = document.getElementById('student-id-preview-text');
    
    if (!majorSelect || !previewDiv) return;
    
    const major = majorSelect.value;
    const enrollmentYear = document.getElementById('edit-enrollment-year').value;
    
    if (major) {
        previewDiv.style.display = 'block';
        
        // 显示生成中的状态
        previewText.textContent = '生成中...';
        previewText.className = 'nbu-student-id generating';
        
        try {
            // 生成学号预览 - 传递入学年份
            const studentId = await studentIdGenerator.generateStudentId(major, enrollmentYear);
            previewText.textContent = studentId;
            previewText.className = 'nbu-student-id generated';
        } catch (error) {
            previewText.textContent = '生成失败';
            previewText.className = 'nbu-student-id error';
        }
    } else {
        previewDiv.style.display = 'none';
    }
}

// 确保函数在全局可用
window.nbuHandleLogin = nbuHandleLogin;
window.nbuHandleLogout = nbuHandleLogout;
if (initializeSupabase()) {
    initializeNBUAuth();
    updateAuthUI();
}
// 表单提交处理 - 更新版（包含专属字段）
const profileForm = document.getElementById('nbu-profile-form');
if (profileForm) {
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
            
        // 基础字段
        const formData = {
            display_name: document.getElementById('edit-display-name').value,
            avatar_url: document.getElementById('edit-avatar-url').value,
            bio: document.getElementById('edit-bio').value
        };
            
        // OC字段（如果不是访客）
        if (currentUserProfile.role !== 'visitor') {
            formData.oc_name = document.getElementById('edit-oc-name').value;
            formData.oc_age = document.getElementById('edit-oc-age').value ? 
                parseInt(document.getElementById('edit-oc-age').value) : null;
            formData.oc_nationality = document.getElementById('edit-oc-nationality').value;
            formData.oc_gender = document.getElementById('edit-oc-gender').value;
            formData.oc_title = document.getElementById('edit-oc-title').value;

            // 学生专属字段
            if (currentUserProfile.role === 'student') {
                const major = document.getElementById('edit-major').value;
                formData.major = major;
                formData.student_id = document.getElementById('edit-student-id').value;
                formData.dormitory = document.getElementById('edit-dormitory').value;
                formData.enrollment_year = document.getElementById('edit-enrollment-year').value ? 
                    parseInt(document.getElementById('edit-enrollment-year').value) : null;
                formData.clubs = document.getElementById('edit-clubs').value;
                const previewText = document.getElementById('student-id-preview-text');
                if (previewText && previewText.textContent && previewText.textContent !== '生成中...' && previewText.textContent !== '生成失败') {
                    formData.student_id = previewText.textContent;
                    console.log('🎓 使用预览学号:', formData.student_id);
                } 
                // 备用方案：重新生成
                else if (!currentUserProfile.student_id) {
                    const enrollmentYear = document.getElementById('edit-enrollment-year').value;
                    try {
                        formData.student_id = await studentIdGenerator.generateStudentId(major, enrollmentYear);
                        console.log('🎓 生成新学号:', formData.student_id);
                    } catch (error) {
                        console.error('❌ 生成学号失败:', error);
                    }
                } else {
                    formData.student_id = currentUserProfile.student_id;
                }
            }
                
            // 教职专属字段
            if (currentUserProfile.role === 'faculty') {
                formData.department = document.getElementById('edit-department').value;
                formData.office_location = document.getElementById('edit-office-location').value;
                formData.office_hours = document.getElementById('edit-office-hours').value;
                formData.faculty_rank = document.getElementById('edit-faculty-rank').value;
                formData.courses = document.getElementById('edit-courses').value;
                formData.degrees = document.getElementById('edit-degrees').value;
            }
        }
            
        console.log("📤 提交的表单数据:", formData);
            
        try {
            await saveUserProfile(formData);
            hideEditProfileModal();
            alert('✅ 资料保存成功！');
        } catch (error) {
            console.error("❌ 表单提交失败:", error);
            alert('❌ 保存失败，请重试');
        }
    });
}

console.log("✅ nbu-auth.js 加载完成，等待DOMContentLoaded");