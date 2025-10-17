(function() {
    // Check if the script has already been initialized
    if (window.zhiliaotongWidget) {
        return;
    }
    
    // Default settings
    const settings = window.zhiliaotongSettings || {};
    const appId = settings.appId;
    
    if (!appId) {
        console.error("智聊通 (ZhiLiaoTong): App ID is missing. Please set window.zhiliaotongSettings.appId");
        return;
    }

    // Mark as initialized
    window.zhiliaotongWidget = true;

    // Create the iframe
    const iframe = document.createElement('iframe');
    const iframeId = 'zhiliaotong-widget-iframe';
    
    // Construct the URL for the iframe source
    // In a real production scenario, this would be your app's domain
    const origin = new URL(document.currentScript.src).origin;
    iframe.src = `${origin}/widget?appId=${appId}`;
    iframe.id = iframeId;
    
    // Style the iframe to be a transparent overlay for the widget button and card
    iframe.style.position = 'fixed';
    iframe.style.bottom = '0';
    iframe.style.right = '0';
    iframe.style.border = 'none';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.maxWidth = '420px'; // Max width of the chat card
    iframe.style.maxHeight = '80vh'; // Max height of the chat card + button
    iframe.style.zIndex = '9999';
    iframe.style.backgroundColor = 'transparent';
    iframe.style.pointerEvents = 'none'; // Initially, let clicks pass through

    // Append the iframe to the body
    document.body.appendChild(iframe);
    
    // Listen for messages from the iframe to enable pointer events when the widget is open
    window.addEventListener('message', function(event) {
        // Security check: ensure the message is from our iframe's origin
        if (event.origin !== origin) {
            return;
        }

        const iframeEl = document.getElementById(iframeId);
        if (iframeEl && event.data === 'zhiliaotong-widget-open') {
             iframeEl.style.pointerEvents = 'auto';
        } else if (iframeEl && event.data === 'zhiliaotong-widget-close') {
             iframeEl.style.pointerEvents = 'none';
        }
    });

    // To allow the widget inside the iframe to control pointer-events,
    // we need to add logic inside the ChatWidget component to post messages.
    // We will modify ChatWidget.tsx to post 'zhiliaotong-widget-open' and 'zhiliaotong-widget-close' messages.
    // This script is now complete.
    
})();
