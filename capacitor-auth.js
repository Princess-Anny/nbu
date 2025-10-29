// 检测是否在 Capacitor 环境中
if (window.Capacitor) {
  console.log('Running in Capacitor environment');
  
  // Auth0 移动端适配
  const originalRedirect = window.location.replace;
  window.location.replace = function(url) {
    if (url.includes('auth0.com') && window.Capacitor) {
      // 在 Capacitor 中使用 InAppBrowser 打开 Auth0
      window.Capacitor.Plugins.Browser.open({ url: url });
    } else {
      originalRedirect.call(window.location, url);
    }
  };
  
  // 处理 Auth0 回调
  document.addEventListener('deviceready', function() {
    if (window.Capacitor) {
      window.Capacitor.Plugins.Browser.addListener('browserFinished', (event) => {
        // 处理认证完成后的逻辑
        console.log('Auth completed', event);
      });
    }
  });
}