(function() {
  // Ensure this runs only once.
  if (window.zhiliaotongWidget) {
    return;
  }

  // Settings from the host page.
  const settings = window.zhiliaotongSettings || {};
  const appId = settings.appId;

  if (!appId) {
    console.error("智聊通: 未找到 appId, 小部件无法加载。");
    return;
  }

  // Create the iframe element.
  const iframe = document.createElement('iframe');
  const widgetUrl = `${new URL(document.currentScript.src).origin}/widget?appId=${appId}`;
  
  // Style the iframe for a seamless, floating widget experience.
  iframe.src = widgetUrl;
  iframe.style.position = 'fixed';
  iframe.style.right = '0px';
  iframe.style.bottom = '0px';
  iframe.style.width = '100%'; 
  iframe.style.height = '100%';
  iframe.style.maxWidth = '420px';
  iframe.style.maxHeight = '75vh';
  iframe.style.border = 'none';
  iframe.style.backgroundColor = 'transparent';
  iframe.style.zIndex = '9999';

  // Add the iframe to the host page's body.
  document.body.appendChild(iframe);

  // Mark the widget as loaded.
  window.zhiliaotongWidget = {
    iframe: iframe
  };

})();
