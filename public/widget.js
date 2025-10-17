// This script is responsible for embedding the chat widget into a host website.

(function() {
    //
    // --- Configuration ---
    //
    const WIDGET_ICON_SIZE = '80px'; // Includes padding for the button
    const WIDGET_CARD_WIDTH = '384px'; // max-w-sm
    const WIDGET_CARD_HEIGHT = '70vh'; // from component
    const IFRAME_ID = 'zhiliaotong-iframe';
    // -------------------

    // Function to get the appId from the global settings object
    function getAppId() {
        if (window.zhiliaotongSettings && window.zhiliaotongSettings.appId) {
            return window.zhiliaotongSettings.appId;
        }
        console.warn("智聊通: 未找到 appId, 小部件可能无法正常工作。请确保 window.zhiliaotongSettings.appId 已设置。");
        return null;
    }

    // Function to create and style the iframe
    function createWidgetIframe(appId) {
        const iframe = document.createElement('iframe');
        iframe.id = IFRAME_ID;
        iframe.src = `${window.location.origin}/widget?appId=${appId}`;
        iframe.style.border = 'none';
        iframe.style.position = 'fixed';
        iframe.style.bottom = '1rem';
        iframe.style.right = '1rem';
        iframe.style.width = WIDGET_ICON_SIZE;
        iframe.style.height = WIDGET_ICON_SIZE;
        iframe.style.transition = 'width 0.3s ease, height 0.3s ease';
        iframe.style.overflow = 'hidden';
        iframe.style.backgroundColor = 'transparent';
        iframe.style.zIndex = '9999';
        
        return iframe;
    }

    // Main script execution
    function init() {
        // Ensure the script runs only once
        if (document.getElementById(IFRAME_ID)) {
            return;
        }

        const appId = getAppId();
        if (!appId) {
            return;
        }
        
        const iframe = createWidgetIframe(appId);
        document.body.appendChild(iframe);

        // Listen for resize messages from the iframe
        window.addEventListener('message', (event) => {
             // Basic security: check the origin of the message
            if (event.origin !== window.location.origin) {
                return;
            }

            if (event.data && event.data.type === 'zhiliaotong-resize') {
                if (event.data.isOpen) {
                    iframe.style.width = WIDGET_CARD_WIDTH;
                    iframe.style.height = WIDGET_CARD_HEIGHT;
                } else {
                    iframe.style.width = WIDGET_ICON_SIZE;
                    iframe.style.height = WIDGET_ICON_SIZE;
                }
            }
        });
    }

    // Wait for the DOM to be fully loaded before initializing
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }

})();
