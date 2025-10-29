// 检测是否在 Capacitor 环境中
if (window.Capacitor) {
  console.log('Running in Capacitor environment');
  
  // 修复可能的路由问题
  document.addEventListener('DOMContentLoaded', function() {
    // 确保所有链接在 Capacitor 中正常工作
    const links = document.querySelectorAll('a');
    links.forEach(link => {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href && href.startsWith('/') && !href.startsWith('//')) {
          e.preventDefault();
          window.location.href = href;
        }
      });
    });
  });
}