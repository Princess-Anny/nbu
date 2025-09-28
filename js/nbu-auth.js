// NBU用户认证逻辑 - 修复刷新问题版
console.log("🔧 nbu-auth.js 开始加载");

let nbuAuthClient = null;

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
                redirect_uri: "https://niubiuniversity.dpdns.org"
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
            // 用户已登录
            loginSection.style.display = 'none';
            userSection.style.display = 'block';
            
            const user = await nbuAuthClient.getUser();
            const displayName = user.name || user.nickname || user.email || 'NBU用户';
            document.getElementById('nbu-user-name').textContent = displayName;
            document.getElementById('nbu-user-avatar').src = user.picture;
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

// 存储选择的身份
let selectedRole = null;

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

// 继续Auth0登录流程
async function proceedToAuth0Login() {
    console.log("🚀 继续Auth0登录流程，选择的身份:", selectedRole);
    
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
        student: "NBU_STUDENT_2024",
        faculty: "NBU_PROFESSOR_2024"
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
            returnTo: "https://niubiuniversity.dpdns.org"
        }
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log("📄 页面加载完成，启动Auth初始化");
    initializeNBUAuth();
});

// 确保函数在全局可用
window.nbuHandleLogin = nbuHandleLogin;
window.nbuHandleLogout = nbuHandleLogout;
initializeNBUAuth();
updateAuthUI();

console.log("✅ nbu-auth.js 加载完成，等待DOMContentLoaded");