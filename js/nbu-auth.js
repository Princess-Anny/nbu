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
                redirect_uri: "https://princess-anny.github.io/nbu/"
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
    console.log("🎯 登录按钮被点击");
    
    if (!nbuAuthClient) {
        console.error("❌ Auth客户端未初始化，正在尝试紧急初始化...");
        await initializeNBUAuth();
        
        if (!nbuAuthClient) {
            alert("认证系统初始化失败，请刷新页面重试");
            return;
        }
    }
    
    // 检查是否已经登录
    const isAuthenticated = await nbuAuthClient.isAuthenticated();
    if (isAuthenticated) {
        console.log("ℹ️ 用户已登录，无需重复登录");
        return;
    }
    
    console.log("🚀 跳转到Auth0登录页面...");
    await nbuAuthClient.loginWithRedirect();
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
            returnTo: "https://princess-anny.github.io/nbu/"
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