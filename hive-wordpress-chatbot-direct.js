/**
 * WORDPRESS DIRECT INTEGRATION - Hive Wellness Chatbot
 *
 * Copy this entire script into your WordPress site.
 * No external file dependencies - works independently.
 * Connects to real AI backend for professional responses.
 */

(function () {
  "use strict";

  // Configuration
  const CONFIG = {
    apiEndpoint: "https://api.hive-wellness.co.uk",
    primaryColor: "#9306B1",
    position: "bottom-right",
  };

  let isOpen = false;
  let conversationId = "";
  let isLoading = false;

  // Inject CSS styles
  const styles = document.createElement("style");
  styles.textContent = `
  .hive-chatbot-container {
    position: fixed !important;
    bottom: 24px !important;
    right: 24px !important;
    z-index: 2147483647 !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  }
  
  .hive-trigger {
    width: 56px !important;
    height: 56px !important;
    border-radius: 50% !important;
    background: linear-gradient(135deg, ${CONFIG.primaryColor} 0%, #b83cd3 100%) !important;
    border: none !important;
    cursor: pointer !important;
    box-shadow: 0 4px 12px rgba(147, 6, 177, 0.4) !important;
    transition: all 0.3s ease !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    color: white !important;
  }
  
  .hive-trigger:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 20px rgba(147, 6, 177, 0.6) !important;
  }
  
  .hive-window {
    position: absolute !important;
    bottom: 70px !important;
    right: 0 !important;
    width: 380px !important;
    height: 650px !important;
    background: white !important;
    border-radius: 24px !important;
    box-shadow: 0 25px 50px rgba(147, 6, 177, 0.25) !important;
    border: none !important;
    display: none !important;
    flex-direction: column !important;
    overflow: hidden !important;
  }
  
  .hive-window.open {
    display: flex !important;
  }
  
  .hive-header {
    background: linear-gradient(135deg, ${CONFIG.primaryColor} 0%, #b83cd3 100%) !important;
    color: white !important;
    padding: 16px 20px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    border-radius: 24px 24px 0 0 !important;
  }
  
  .hive-header h3 {
    margin: 0 !important;
    font-size: 16px !important;
    font-weight: 600 !important;
    color: white !important;
  }
  
  .hive-close {
    background: none !important;
    border: none !important;
    color: white !important;
    cursor: pointer !important;
    padding: 4px !important;
    border-radius: 4px !important;
  }
  
  .hive-messages {
    flex: 1 !important;
    overflow-y: auto !important;
    padding: 20px !important;
    background: white !important;
  }
  
  .hive-welcome {
    margin-bottom: 20px !important;
  }
  
  .hive-welcome-message {
    font-size: 15px !important;
    color: #374151 !important;
    margin-bottom: 16px !important;
    line-height: 1.5 !important;
  }
  
  .hive-quick-buttons {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 8px !important;
    margin-bottom: 16px !important;
  }
  
  .hive-quick-btn {
    padding: 8px 12px !important;
    border: 1px solid #d1d5db !important;
    background: white !important;
    color: #374151 !important;
    border-radius: 8px !important;
    font-size: 14px !important;
    cursor: pointer !important;
    transition: all 0.2s !important;
  }
  
  .hive-quick-btn:hover {
    border-color: ${CONFIG.primaryColor} !important;
    background: #f3e8ff !important;
    color: ${CONFIG.primaryColor} !important;
  }
  
  .hive-cta {
    padding: 16px !important;
    border-radius: 12px !important;
    border: 2px solid #e879f9 !important;
    background: linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%) !important;
  }
  
  .hive-cta-title {
    font-size: 14px !important;
    font-weight: 500 !important;
    color: #7c2d92 !important;
    margin-bottom: 12px !important;
  }
  
  .hive-cta-button {
    width: 100% !important;
    padding: 10px !important;
    background: ${CONFIG.primaryColor} !important;
    color: white !important;
    border: none !important;
    border-radius: 8px !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    cursor: pointer !important;
  }
  
  .hive-message {
    margin-bottom: 16px !important;
    display: flex !important;
    align-items: flex-start !important;
  }
  
  .hive-message.user {
    flex-direction: row-reverse !important;
  }
  
  .hive-message-content {
    max-width: 80% !important;
    padding: 12px 16px !important;
    border-radius: 18px !important;
    font-size: 14px !important;
    line-height: 1.4 !important;
  }
  
  .hive-message.user .hive-message-content {
    background: ${CONFIG.primaryColor} !important;
    color: white !important;
    border-bottom-right-radius: 4px !important;
  }
  
  .hive-message.bot .hive-message-content {
    background: white !important;
    color: #374151 !important;
    border: 1px solid #e5e7eb !important;
    border-bottom-left-radius: 4px !important;
  }
  
  .hive-input-area {
    padding: 16px 20px !important;
    background: white !important;
    border-top: 1px solid #e5e7eb !important;
  }
  
  .hive-input-container {
    display: flex !important;
    gap: 8px !important;
    align-items: flex-end !important;
  }
  
  .hive-input {
    flex: 1 !important;
    border: 1px solid #d1d5db !important;
    border-radius: 20px !important;
    padding: 10px 16px !important;
    font-size: 14px !important;
    resize: none !important;
    outline: none !important;
    max-height: 100px !important;
    min-height: 40px !important;
  }
  
  .hive-input:focus {
    border-color: ${CONFIG.primaryColor} !important;
  }
  
  .hive-send {
    width: 40px !important;
    height: 40px !important;
    border: none !important;
    background: ${CONFIG.primaryColor} !important;
    color: white !important;
    border-radius: 50% !important;
    cursor: pointer !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  
  .hive-send:disabled {
    opacity: 0.5 !important;
    cursor: not-allowed !important;
  }
  
  .hive-typing {
    display: flex !important;
    align-items: center !important;
    gap: 4px !important;
    padding: 12px 16px !important;
    background: white !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 18px !important;
    margin-bottom: 16px !important;
    max-width: 80% !important;
  }
  
  .hive-typing-dot {
    width: 8px !important;
    height: 8px !important;
    border-radius: 50% !important;
    background: #9ca3af !important;
    animation: hive-typing 1.4s infinite ease-in-out !important;
  }
  
  .hive-typing-dot:nth-child(1) { animation-delay: -0.32s !important; }
  .hive-typing-dot:nth-child(2) { animation-delay: -0.16s !important; }
  
  @keyframes hive-typing {
    0%, 80%, 100% { transform: scale(0) !important; opacity: 0.5 !important; }
    40% { transform: scale(1) !important; opacity: 1 !important; }
  }
  
  @media (max-width: 480px) {
    .hive-window {
      width: 100vw !important;
      height: 100vh !important;
      border-radius: 0 !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
    }
  }
`;
  document.head.appendChild(styles);

  // Create chatbot HTML
  const chatbotHTML = `
  <div class="hive-chatbot-container" id="hive-chatbot">
    <div class="hive-window" id="hive-window">
      <div class="hive-header">
        <h3>Hive Wellness</h3>
        <button class="hive-close" onclick="closeHiveChat()">✕</button>
      </div>
      <div class="hive-messages" id="hive-messages">
        <div class="hive-welcome" id="hive-welcome">
          <div class="hive-welcome-message">
            Wellness therapy services. How can I assist you today?
          </div>
          <div style="font-size: 14px; color: #6b7280; margin-bottom: 12px;">Quick questions:</div>
          <div class="hive-quick-buttons">
            <button class="hive-quick-btn" onclick="sendQuickHiveMessage('What are your therapy session prices?')">Pricing</button>
            <button class="hive-quick-btn" onclick="sendQuickHiveMessage('How do I book a therapy session?')">Book Session</button>
            <button class="hive-quick-btn" onclick="sendQuickHiveMessage('Tell me about the free consultation')">Consultation</button>
            <button class="hive-quick-btn" onclick="sendQuickHiveMessage('How can I contact support?')">Contact</button>
          </div>
          <div class="hive-cta">
            <div class="hive-cta-title">Ready to get started?</div>
            <button class="hive-cta-button" onclick="sendQuickHiveMessage('I want to book a free 20-minute consultation')">Book Free Consultation</button>
          </div>
        </div>
      </div>
      <div class="hive-input-area">
        <div class="hive-input-container">
          <textarea class="hive-input" id="hive-input" placeholder="Type your message..." rows="1"></textarea>
          <button class="hive-send" id="hive-send" onclick="sendHiveMessage()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m22 2-7 20-4-9-9-4z"/>
              <path d="m22 2-10 10"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    <button class="hive-trigger" onclick="toggleHiveChat()">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
      </svg>
    </button>
  </div>
`;

  // Insert chatbot into page
  document.body.insertAdjacentHTML("beforeend", chatbotHTML);

  // Functions
  function toggleHiveChat() {
    const window_elem = document.getElementById("hive-window");
    isOpen = !isOpen;
    window_elem.classList.toggle("open", isOpen);
  }

  function closeHiveChat() {
    const window_elem = document.getElementById("hive-window");
    window_elem.classList.remove("open");
    isOpen = false;
  }

  function addHiveMessage(content, isUser) {
    const messages = document.getElementById("hive-messages");
    const messageDiv = document.createElement("div");
    messageDiv.className = `hive-message ${isUser ? "user" : "bot"}`;
    messageDiv.innerHTML = `<div class="hive-message-content">${content}</div>`;
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
  }

  function showHiveTyping() {
    const messages = document.getElementById("hive-messages");
    const typingDiv = document.createElement("div");
    typingDiv.className = "hive-typing";
    typingDiv.id = "hive-typing-indicator";
    typingDiv.innerHTML =
      '<div class="hive-typing-dot"></div><div class="hive-typing-dot"></div><div class="hive-typing-dot"></div>';
    messages.appendChild(typingDiv);
    messages.scrollTop = messages.scrollHeight;
  }

  function removeHiveTyping() {
    const typing = document.getElementById("hive-typing-indicator");
    if (typing) typing.remove();
  }

  function sendQuickHiveMessage(message) {
    sendHiveMessage(message);
  }

  async function sendHiveMessage(messageText = null) {
    const input = document.getElementById("hive-input");
    const sendBtn = document.getElementById("hive-send");

    const userMessage = messageText || input.value.trim();
    if (!userMessage || isLoading) return;

    // Hide welcome section after first message
    const welcome = document.getElementById("hive-welcome");
    if (welcome) {
      welcome.style.display = "none";
    }

    // Add user message
    addHiveMessage(userMessage, true);

    if (!messageText) {
      input.value = "";
    }

    // Show typing and disable send
    showHiveTyping();
    isLoading = true;
    sendBtn.disabled = true;

    try {
      // Send to real AI API
      const response = await fetch(`${CONFIG.apiEndpoint}/api/chatbot/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId: conversationId || undefined,
        }),
      });

      const data = await response.json();

      if (data.conversationId) {
        conversationId = data.conversationId;
      }

      removeHiveTyping();
      addHiveMessage(
        data.response ||
          "I apologize, but I'm having trouble responding right now. Please try again.",
        false
      );
    } catch (error) {
      console.error("Chatbot API Error:", error);
      removeHiveTyping();
      addHiveMessage(
        "I'm experiencing some technical difficulties. Please contact our support team at support@hive-wellness.co.uk",
        false
      );
    } finally {
      isLoading = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  // Event listeners
  document.getElementById("hive-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendHiveMessage();
    }
  });

  console.log("✅ Hive Wellness Direct Chatbot loaded successfully");
})();
