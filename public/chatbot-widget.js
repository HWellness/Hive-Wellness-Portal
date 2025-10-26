(function() {
  const script = document.currentScript;
  const config = {
    color: script.getAttribute('data-primary-color') || '#9306B1',
    api: 'https://api.hive-wellness.co.uk'
  };
  
  let isOpen = false;
  let conversationId = '';
  let isLoading = false;

  // Enhanced CSS with improved dimensions and responsive design
  document.head.insertAdjacentHTML('beforeend', `
    <style>
      .hw {
        position: fixed !important;
        bottom: 24px !important;
        right: 24px !important;
        z-index: 999999 !important;
        font-family: system-ui, -apple-system, sans-serif !important;
      }
      
      .hw-btn {
        width: 56px !important;
        height: 56px !important;
        border-radius: 50% !important;
        background: ${config.color} !important;
        border: 0 !important;
        cursor: pointer !important;
        box-shadow: 0 4px 16px rgba(147, 6, 177, 0.4) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        color: #fff !important;
        transition: all 0.3s ease !important;
      }
      
      .hw-btn:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 24px rgba(147, 6, 177, 0.6) !important;
      }
      
      .hw-win {
        position: absolute !important;
        bottom: 70px !important;
        right: 0 !important;
        width: 450px !important;
        max-width: calc(100vw - 48px) !important;
        height: 580px !important;
        max-height: calc(100vh - 120px) !important;
        background: #fff !important;
        border-radius: 24px !important;
        box-shadow: 0 25px 50px rgba(147, 6, 177, 0.25) !important;
        display: none !important;
        flex-direction: column !important;
        overflow: hidden !important;
        border: 1px solid rgba(147, 6, 177, 0.1) !important;
      }
      
      .hw-win.open {
        display: flex !important;
        animation: slideUp 0.3s ease-out !important;
      }
      
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      .hw-hdr {
        background: ${config.color} !important;
        color: #fff !important;
        padding: 20px 24px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
      }
      
      .hw-hdr h3 {
        margin: 0 !important;
        font-size: 18px !important;
        font-weight: 600 !important;
      }
      
      .hw-cls {
        background: rgba(255, 255, 255, 0.2) !important;
        border: 0 !important;
        color: #fff !important;
        cursor: pointer !important;
        padding: 8px !important;
        border-radius: 50% !important;
        width: 32px !important;
        height: 32px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: background 0.2s ease !important;
      }
      
      .hw-cls:hover {
        background: rgba(255, 255, 255, 0.3) !important;
      }
      
      .hw-msg {
        flex: 1 !important;
        overflow-y: auto !important;
        padding: 24px !important;
        background: #fff !important;
      }
      
      .hw-wel {
        margin-bottom: 24px !important;
      }
      
      .hw-wel-txt {
        font-size: 16px !important;
        color: #374151 !important;
        margin-bottom: 20px !important;
        line-height: 1.6 !important;
        font-weight: 400 !important;
      }
      
      .hw-qbt {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 12px !important;
        margin-bottom: 20px !important;
      }
      
      .hw-qb {
        padding: 14px 16px !important;
        border: 1px solid #e5e7eb !important;
        background: #fff !important;
        color: #374151 !important;
        border-radius: 12px !important;
        font-size: 13px !important;
        font-weight: 500 !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        text-align: center !important;
        line-height: 1.3 !important;
        min-height: 48px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        word-wrap: break-word !important;
        hyphens: auto !important;
      }
      
      .hw-qb:hover {
        border-color: ${config.color} !important;
        background: #f8fafc !important;
        color: ${config.color} !important;
        transform: translateY(-1px) !important;
      }
      
      .hw-cta {
        padding: 20px !important;
        border-radius: 16px !important;
        border: 2px solid #e879f9 !important;
        background: linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%) !important;
        text-align: center !important;
      }
      
      .hw-cta-t {
        font-size: 15px !important;
        font-weight: 600 !important;
        color: #7c2d92 !important;
        margin-bottom: 12px !important;
      }
      
      .hw-cta-b {
        width: 100% !important;
        padding: 12px 20px !important;
        background: ${config.color} !important;
        color: #fff !important;
        border: 0 !important;
        border-radius: 10px !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
      }
      
      .hw-cta-b:hover {
        background: #7a0597 !important;
        transform: translateY(-1px) !important;
      }
      
      .hw-m {
        margin-bottom: 16px !important;
        display: flex !important;
        align-items: flex-start !important;
      }
      
      .hw-m.u {
        flex-direction: row-reverse !important;
      }
      
      .hw-mc {
        max-width: 85% !important;
        padding: 12px 16px !important;
        border-radius: 18px !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        word-wrap: break-word !important;
      }
      
      .hw-m.u .hw-mc {
        background: ${config.color} !important;
        color: #fff !important;
        border-bottom-right-radius: 4px !important;
      }
      
      .hw-m.b .hw-mc {
        background: #f8fafc !important;
        color: #374151 !important;
        border: 1px solid #e5e7eb !important;
        border-bottom-left-radius: 4px !important;
      }
      
      .hw-inp {
        padding: 20px 24px !important;
        background: #fff !important;
        border-top: 1px solid #e5e7eb !important;
      }
      
      .hw-ic {
        display: flex !important;
        gap: 12px !important;
        align-items: flex-end !important;
      }
      
      .hw-i {
        flex: 1 !important;
        border: 1px solid #d1d5db !important;
        border-radius: 20px !important;
        padding: 12px 16px !important;
        font-size: 14px !important;
        resize: none !important;
        outline: 0 !important;
        max-height: 120px !important;
        min-height: 44px !important;
        font-family: inherit !important;
        transition: border-color 0.2s ease !important;
      }
      
      .hw-i:focus {
        border-color: ${config.color} !important;
      }
      
      .hw-s {
        width: 44px !important;
        height: 44px !important;
        border: 0 !important;
        background: ${config.color} !important;
        color: #fff !important;
        border-radius: 50% !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: all 0.2s ease !important;
        flex-shrink: 0 !important;
      }
      
      .hw-s:hover:not(:disabled) {
        background: #7a0597 !important;
        transform: scale(1.05) !important;
      }
      
      .hw-s:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
        transform: none !important;
      }
      
      /* Enhanced Mobile Responsiveness */
      @media (max-width: 540px) {
        .hw-win {
          width: calc(100vw - 24px) !important;
          right: 12px !important;
          bottom: 80px !important;
          border-radius: 16px !important;
        }
        
        .hw-qb {
          font-size: 12px !important;
          padding: 12px 10px !important;
        }
        
        .hw-msg {
          padding: 20px !important;
        }
        
        .hw-inp {
          padding: 16px 20px !important;
        }
      }
      
      @media (max-width: 480px) {
        .hw {
          right: 12px !important;
          bottom: 12px !important;
        }
        
        .hw-win {
          width: calc(100vw - 24px) !important;
          height: calc(100vh - 100px) !important;
          border-radius: 12px !important;
        }
      }
    </style>
  `);

  // Enhanced HTML structure with improved content
  document.body.insertAdjacentHTML('beforeend', `
    <div class="hw">
      <div class="hw-win" id="hw-widget">
        <div class="hw-hdr">
          <h3>Hive Wellness</h3>
          <button class="hw-cls" onclick="HiveWidget.close()">×</button>
        </div>
        <div class="hw-msg" id="hw-messages">
          <div class="hw-wel" id="hw-welcome">
            <div class="hw-wel-txt">
              Welcome to Hive Wellness! I'm here to help you find the right therapy support for your needs.
            </div>
            <div style="font-size: 14px; color: #6b7280; margin-bottom: 16px; font-weight: 500;">
              How can I help you today?
            </div>
            <div class="hw-qbt">
              <button class="hw-qb" onclick="HiveWidget.sendQuick('What are your therapy session prices?')">
                Pricing Info
              </button>
              <button class="hw-qb" onclick="HiveWidget.sendQuick('How do I book a therapy session?')">
                Book Session
              </button>
              <button class="hw-qb" onclick="HiveWidget.sendQuick('Tell me about the free consultation')">
                Free Consultation
              </button>
              <button class="hw-qb" onclick="HiveWidget.sendQuick('How can I contact support?')">
                Contact Support
              </button>
            </div>
            <div class="hw-cta">
              <div class="hw-cta-t">Ready to get started?</div>
              <button class="hw-cta-b" onclick="HiveWidget.sendQuick('I want to book a free 20-minute consultation')">
                Book Free Consultation
              </button>
            </div>
          </div>
        </div>
        <div class="hw-inp">
          <div class="hw-ic">
            <textarea 
              class="hw-i" 
              id="hw-input" 
              placeholder="Type your message..." 
              rows="1"
            ></textarea>
            <button class="hw-s" id="hw-send" onclick="HiveWidget.send()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m22 2-7 20-4-9-9-4z"/>
                <path d="m22 2-10 10"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      <button class="hw-btn" onclick="HiveWidget.toggle()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
        </svg>
      </button>
    </div>
  `);

  // Enhanced JavaScript functionality
  window.HiveWidget = {
    toggle() {
      const widget = document.getElementById('hw-widget');
      isOpen = !isOpen;
      widget.classList.toggle('open', isOpen);
      
      if (isOpen) {
        const input = document.getElementById('hw-input');
        setTimeout(() => input.focus(), 100);
      }
    },

    close() {
      const widget = document.getElementById('hw-widget');
      widget.classList.remove('open');
      isOpen = false;
    },

    sendQuick(message) {
      this.send(message);
    },

    async send(text) {
      const input = document.getElementById('hw-input');
      const sendBtn = document.getElementById('hw-send');
      const message = text || input.value.trim();
      
      if (!message || isLoading) return;

      // Hide welcome message after first interaction
      const welcome = document.getElementById('hw-welcome');
      if (welcome) {
        welcome.style.display = 'none';
      }

      this.addMessage(message, true);
      if (!text) input.value = '';

      this.showTyping();
      isLoading = true;
      sendBtn.disabled = true;

      try {
        const response = await fetch(`${config.api}/api/chatbot/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message,
            conversationId: conversationId || undefined
          })
        });

        const data = await response.json();
        if (data.conversationId) {
          conversationId = data.conversationId;
        }

        this.removeTyping();
        this.addMessage(data.response || 'I apologize, but I encountered an issue. Please try again or contact support@hive-wellness.co.uk', false);
      } catch (error) {
        console.error('Chatbot error:', error);
        this.removeTyping();
        this.addMessage('I apologize, but I\'m experiencing technical difficulties. Please contact support@hive-wellness.co.uk for immediate assistance.', false);
      }

      isLoading = false;
      sendBtn.disabled = false;
      input.focus();
    },

    addMessage(text, isUser) {
      const messages = document.getElementById('hw-messages');
      const messageEl = document.createElement('div');
      messageEl.className = `hw-m ${isUser ? 'u' : 'b'}`;
      messageEl.innerHTML = `<div class="hw-mc">${text}</div>`;
      messages.appendChild(messageEl);
      messages.scrollTop = messages.scrollHeight;
    },

    showTyping() {
      const messages = document.getElementById('hw-messages');
      const typingEl = document.createElement('div');
      typingEl.className = 'hw-m b';
      typingEl.id = 'hw-typing';
      typingEl.innerHTML = '<div class="hw-mc">Typing...</div>';
      messages.appendChild(typingEl);
      messages.scrollTop = messages.scrollHeight;
    },

    removeTyping() {
      const typing = document.getElementById('hw-typing');
      if (typing) {
        typing.remove();
      }
    }
  };

  // Enhanced input handling
  const input = document.getElementById('hw-input');
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        HiveWidget.send();
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
  }

  console.log('✅ Hive Wellness Widget loaded - Enhanced UI');
})();