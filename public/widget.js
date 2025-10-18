
(function() {
    // Check if the script is already running
    if (window.zhiliaotongScriptLoaded) {
        return;
    }
    window.zhiliaotongScriptLoaded = true;

    // Get the appId from the global settings object
    const appId = window.zhiliaotongSettings?.appId;
    if (!appId) {
        console.error('智聊通: App ID (appId) 未在 window.zhiliaotongSettings 中设置。');
        return;
    }

    // Create a container for the widget
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'zhiliaotong-widget-container';
    widgetContainer.style.position = 'fixed';
    widgetContainer.style.bottom = '0';
    widgetContainer.style.right = '0';
    widgetContainer.style.width = '420px'; // Max width of widget
    widgetContainer.style.height = '80vh'; // Max height of widget
    widgetContainer.style.maxWidth = '100vw';
    widgetContainer.style.maxHeight = '100vh';
    widgetContainer.style.border = 'none';
    widgetContainer.style.zIndex = '999999';

    // Create the iframe
    const iframe = document.createElement('iframe');
    const iframeSrc = new URL(window.location.origin);
    iframeSrc.pathname = '/widget';
    iframeSrc.searchParams.append('appId', appId);
    
    iframe.src = iframeSrc.toString();
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.title = '智聊通客服';

    // Append iframe to container and container to body
    widgetContainer.appendChild(iframe);
    document.body.appendChild(widgetContainer);

})();
