
(function() {
  // Use a unique name for the settings object to avoid conflicts.
  const settings = window.zhiliaotongSettings || {};
  const appId = settings.appId;

  if (!appId) {
    console.error("智聊通 (ZhiLiaoTong): App ID is missing. Please set window.zhiliaotongSettings.appId");
    return;
  }

  // Create a container for the widget button and iframe.
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'zhiliaotong-widget-container';
  document.body.appendChild(widgetContainer);

  // --- Create the launcher button ---
  const button = document.createElement('button');
  button.id = 'zhiliaotong-launcher-button';
  button.setAttribute('aria-label', 'Open chat widget');
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `;
  widgetContainer.appendChild(button);

  // --- Create the iframe container ---
  const iframeContainer = document.createElement('div');
  iframeContainer.id = 'zhiliaotong-iframe-container';
  iframeContainer.style.display = 'none'; // Initially hidden
  widgetContainer.appendChild(iframeContainer);
  
  // --- Create the iframe ---
  const iframe = document.createElement('iframe');
  const widgetUrl = new URL(document.currentScript.src);
  // Construct the URL to the dedicated widget page
  iframe.src = `${widgetUrl.origin}/widget?appId=${appId}&embedded=true`;
  iframe.id = 'zhiliaotong-iframe';
  iframe.setAttribute('frameborder', '0');
  iframeContainer.appendChild(iframe);

  // --- State management ---
  let isOpen = false;

  function toggleWidget(forceState) {
    const shouldOpen = forceState !== undefined ? forceState : !isOpen;
    if (isOpen === shouldOpen) return;

    isOpen = shouldOpen;
    iframeContainer.style.display = isOpen ? 'block' : 'none';
    button.style.display = isOpen ? 'none' : 'flex';
  }

  // --- Event Listeners ---
  button.addEventListener('click', () => toggleWidget(true));
  
  // Listen for messages from the iframe (e.g., to close the widget)
  window.addEventListener('message', (event) => {
    // Security: always check the origin of the message
    if (event.origin !== widgetUrl.origin) {
      return;
    }
    if (event.data === 'zhiliaotong-close-widget') {
      toggleWidget(false);
    }
  });


  // --- Inject CSS for styling ---
  const style = document.createElement('style');
  style.textContent = `
    #zhiliaotong-widget-container {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      z-index: 999999;
    }

    #zhiliaotong-launcher-button {
      background-color: #3F51B5; /* Match brand color */
      color: white;
      width: 4rem;
      height: 4rem;
      border-radius: 9999px;
      border: none;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease-in-out;
    }
    
    #zhiliaotong-launcher-button:hover {
        transform: scale(1.1);
    }
    
    #zhiliaotong-launcher-button svg {
        width: 2rem;
        height: 2rem;
    }

    #zhiliaotong-iframe-container {
      width: 384px; /* w-96 */
      height: 70vh;
      max-height: 700px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      border-radius: 0.5rem; /* rounded-lg */
      overflow: hidden;
      display: none; /* Initially hidden */
    }

    #zhiliaotong-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }

    /* Responsive adjustments */
    @media (max-width: 640px) {
      #zhiliaotong-iframe-container {
        width: 100vw;
        height: 100vh;
        max-height: 100vh;
        bottom: 0;
        right: 0;
        border-radius: 0;
      }
      #zhiliaotong-widget-container {
        bottom: 0;
        right: 0;
        width: 100%;
        height: 100%;
      }
       #zhiliaotong-launcher-button {
          position: fixed;
          bottom: 1rem;
          right: 1rem;
       }
    }
  `;
  document.head.appendChild(style);

  console.log("智聊通 (ZhiLiaoTong): Widget initialized.");
})();
