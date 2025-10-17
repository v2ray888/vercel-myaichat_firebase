
(function() {
  // Wait for the DOM to be fully loaded
  document.addEventListener("DOMContentLoaded", function() {
    // Find the script tag itself to read the settings
    const scriptTag = document.currentScript;
    if (!scriptTag) {
      console.error("ZhiLiaoTong: Could not find the script tag. Please ensure the script is loaded correctly.");
      return;
    }
    
    // Get the appId from the window settings object
    const appId = window.zhiliaotongSettings?.appId;
    if (!appId) {
      console.error("ZhiLiaoTong: appId is not defined. Please set window.zhiliaotongSettings.appId.");
      return;
    }

    // Determine the origin of the widget script to construct the iframe URL
    // This makes it work in development, preview, and production
    const scriptSrc = new URL(scriptTag.src);
    const widgetHost = scriptSrc.origin;

    // Create the iframe element
    const iframe = document.createElement('iframe');
    
    // Construct the URL for the widget page
    const iframeUrl = new URL('/widget', widgetHost);
    iframeUrl.searchParams.set('appId', appId);
    iframe.src = iframeUrl.toString();

    // Style the iframe to be a transparent overlay where the widget will live
    iframe.style.position = 'fixed';
    iframe.style.bottom = '0';
    iframe.style.right = '0';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.maxWidth = '420px'; // Max width of the expanded chat card
    iframe.style.maxHeight = '800px'; // Max height to contain the widget
    iframe.style.border = 'none';
    iframe.style.backgroundColor = 'transparent';
    iframe.style.zIndex = '999999999';
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('frameborder', '0');

    // Append the iframe to the body of the host page
    document.body.appendChild(iframe);
  });
})();
