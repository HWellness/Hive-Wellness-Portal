/**
 * Hive Wellness Chatbot JavaScript
 * Version: 1.0.0
 */

(function($) {
    'use strict';

    // Chatbot class
    class HiveWellnessChatbot {
        constructor(container, options = {}) {
            this.container = container;
            this.options = {
                position: 'bottom-right',
                compact: false,
                showBranding: true,
                primaryColor: '#9306B1',
                ...options
            };
            
            this.isOpen = false;
            this.isMinimized = false;
            this.messages = [];
            this.conversationId = '';
            this.isLoading = false;
            
            this.init();
        }
        
        init() {
            this.render();
            this.bindEvents();
            this.showWelcomeMessage();
        }
        
        render() {
            const widgetClass = `hive-chatbot-widget position-${this.options.position}`;
            const compactClass = this.options.compact ? ' compact' : '';
            
            this.container.innerHTML = `
                <div class="${widgetClass}${compactClass}">
                    <div class="hive-chatbot-closed">
                        <button class="hive-chatbot-button" aria-label="${hiveChatbotAjax.strings.initialMessage}">
                            ${this.getIcon('message-circle')}
                        </button>
                        ${this.options.showBranding ? `<div class="hive-chatbot-branding">${hiveChatbotAjax.strings.poweredBy}</div>` : ''}
                    </div>
                    <div class="hive-chatbot-window" style="display: none;">
                        <div class="hive-chatbot-header">
                            <h3 class="hive-chatbot-title">Hive Wellness Assistant</h3>
                            <div class="hive-chatbot-controls">
                                <button class="hive-chatbot-control-btn minimize" title="${hiveChatbotAjax.strings.minimize}">
                                    ${this.getIcon('minimize')}
                                </button>
                                <button class="hive-chatbot-control-btn close" title="${hiveChatbotAjax.strings.close}">
                                    ${this.getIcon('x')}
                                </button>
                            </div>
                        </div>
                        <div class="hive-chatbot-messages"></div>
                        <div class="hive-chatbot-input-area">
                            <div class="hive-chatbot-disclaimer">${hiveChatbotAjax.strings.disclaimer}</div>
                            <div class="hive-chatbot-input-container">
                                <textarea class="hive-chatbot-input" placeholder="${hiveChatbotAjax.strings.placeholder}" rows="1"></textarea>
                                <button class="hive-chatbot-send-btn" title="${hiveChatbotAjax.strings.send}">
                                    ${this.getIcon('send')}
                                </button>
                            </div>
                            ${this.options.showBranding ? `<div class="hive-chatbot-input-branding">${hiveChatbotAjax.strings.poweredBy}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
            
            // Apply primary color
            this.applyPrimaryColor();
        }
        
        applyPrimaryColor() {
            const color = this.options.primaryColor;
            const style = document.createElement('style');
            style.textContent = `
                .hive-chatbot-widget .hive-chatbot-button { background-color: ${color}; }
                .hive-chatbot-widget .hive-chatbot-header { background-color: ${color}; }
                .hive-chatbot-widget .hive-chatbot-message-bubble.user { background-color: ${color}; }
                .hive-chatbot-widget .hive-chatbot-quick-action { background-color: ${color}; }
                .hive-chatbot-widget .hive-chatbot-send-btn { background-color: ${color}; }
                .hive-chatbot-widget .hive-chatbot-input:focus { border-color: ${color}; }
                .hive-chatbot-widget .hive-chatbot-spinner { border-top-color: ${color}; }
            `;
            document.head.appendChild(style);
        }
        
        bindEvents() {
            const widget = this.container.querySelector('.hive-chatbot-widget');
            
            // Open chatbot
            widget.querySelector('.hive-chatbot-button').addEventListener('click', () => {
                this.open();
            });
            
            // Close chatbot
            widget.querySelector('.close').addEventListener('click', () => {
                this.close();
            });
            
            // Minimize/maximize chatbot
            widget.querySelector('.minimize').addEventListener('click', () => {
                this.toggleMinimize();
            });
            
            // Send message
            const sendBtn = widget.querySelector('.hive-chatbot-send-btn');
            const input = widget.querySelector('.hive-chatbot-input');
            
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
            
            // Handle input events
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            
            input.addEventListener('input', () => {
                this.autoResizeInput();
            });
            
            // Handle escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });
        }
        
        open() {
            this.isOpen = true;
            const widget = this.container.querySelector('.hive-chatbot-widget');
            widget.querySelector('.hive-chatbot-closed').style.display = 'none';
            widget.querySelector('.hive-chatbot-window').style.display = 'flex';
            
            // Focus input
            setTimeout(() => {
                widget.querySelector('.hive-chatbot-input').focus();
            }, 100);
        }
        
        close() {
            this.isOpen = false;
            this.isMinimized = false;
            const widget = this.container.querySelector('.hive-chatbot-widget');
            widget.querySelector('.hive-chatbot-closed').style.display = 'block';
            widget.querySelector('.hive-chatbot-window').style.display = 'none';
            widget.querySelector('.hive-chatbot-window').classList.remove('minimized');
        }
        
        toggleMinimize() {
            this.isMinimized = !this.isMinimized;
            const window = this.container.querySelector('.hive-chatbot-window');
            const minimizeBtn = this.container.querySelector('.minimize');
            
            if (this.isMinimized) {
                window.classList.add('minimized');
                minimizeBtn.innerHTML = this.getIcon('maximize');
                minimizeBtn.title = hiveChatbotAjax.strings.maximize;
            } else {
                window.classList.remove('minimized');
                minimizeBtn.innerHTML = this.getIcon('minimize');
                minimizeBtn.title = hiveChatbotAjax.strings.minimize;
            }
        }
        
        showWelcomeMessage() {
            this.addMessage('', hiveChatbotAjax.strings.initialMessage, 'bot', true);
        }
        
        async sendMessage() {
            const input = this.container.querySelector('.hive-chatbot-input');
            const message = input.value.trim();
            
            if (!message || this.isLoading) return;
            
            // Clear input and reset height
            input.value = '';
            input.style.height = '40px';
            
            // Add user message
            const messageId = this.addMessage(message, '', 'user');
            
            // Show loading
            this.showLoading();
            
            try {
                const response = await this.callChatAPI(message);
                this.hideLoading();
                
                if (response.success) {
                    const data = response.data;
                    this.addMessage('', data.response, 'bot', false, messageId);
                    
                    if (data.conversationId && !this.conversationId) {
                        this.conversationId = data.conversationId;
                    }
                } else {
                    this.addMessage('', hiveChatbotAjax.strings.error, 'bot');
                }
            } catch (error) {
                console.error('Chatbot error:', error);
                this.hideLoading();
                this.addMessage('', hiveChatbotAjax.strings.error, 'bot');
            }
        }
        
        async callChatAPI(message) {
            const formData = new FormData();
            formData.append('action', 'hive_chatbot_chat');
            formData.append('nonce', hiveChatbotAjax.nonce);
            formData.append('message', message);
            
            if (this.conversationId) {
                formData.append('conversationId', this.conversationId);
            }
            
            const response = await fetch(hiveChatbotAjax.ajaxUrl, {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            });
            
            return await response.json();
        }
        
        async sendFeedback(messageId, feedback) {
            try {
                const formData = new FormData();
                formData.append('action', 'hive_chatbot_feedback');
                formData.append('nonce', hiveChatbotAjax.nonce);
                formData.append('messageId', messageId);
                formData.append('feedback', feedback);
                
                if (this.conversationId) {
                    formData.append('conversationId', this.conversationId);
                }
                
                const response = await fetch(hiveChatbotAjax.ajaxUrl, {
                    method: 'POST',
                    body: formData,
                    credentials: 'same-origin'
                });
                
                const result = await response.json();
                return result.success;
            } catch (error) {
                console.error('Feedback error:', error);
                return false;
            }
        }
        
        addMessage(userMessage, botResponse, type, showQuickActions = false, relatedMessageId = null) {
            const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const messagesContainer = this.container.querySelector('.hive-chatbot-messages');
            
            const messageEl = document.createElement('div');
            messageEl.className = 'hive-chatbot-message';
            messageEl.dataset.messageId = messageId;
            
            let messageHTML = '';
            
            if (userMessage) {
                messageHTML += `
                    <div class="hive-chatbot-message-user">
                        <div class="hive-chatbot-message-bubble user">${this.escapeHtml(userMessage)}</div>
                    </div>
                `;
            }
            
            if (botResponse) {
                messageHTML += `
                    <div class="hive-chatbot-message-bot">
                        <div class="hive-chatbot-message-bubble bot">${this.escapeHtml(botResponse)}</div>
                `;
                
                // Add quick actions for welcome message
                if (showQuickActions) {
                    messageHTML += `
                        <div class="hive-chatbot-quick-actions">
                            ${hiveChatbotAjax.quickActions.map(action => 
                                `<button class="hive-chatbot-quick-action" data-message="${this.escapeHtml(action.message)}">${this.escapeHtml(action.label)}</button>`
                            ).join('')}
                        </div>
                    `;
                }
                
                // Add feedback for non-welcome messages
                if (userMessage) {
                    messageHTML += `
                        <div class="hive-chatbot-feedback">
                            <span>${hiveChatbotAjax.strings.feedback}</span>
                            <button class="hive-chatbot-feedback-btn" data-feedback="positive" data-message-id="${messageId}">
                                ${this.getIcon('thumbs-up')}
                            </button>
                            <button class="hive-chatbot-feedback-btn" data-feedback="negative" data-message-id="${messageId}">
                                ${this.getIcon('thumbs-down')}
                            </button>
                        </div>
                    `;
                }
                
                messageHTML += '</div>';
            }
            
            messageEl.innerHTML = messageHTML;
            messagesContainer.appendChild(messageEl);
            
            // Bind quick action events
            messageEl.querySelectorAll('.hive-chatbot-quick-action').forEach(btn => {
                btn.addEventListener('click', () => {
                    const message = btn.dataset.message;
                    this.container.querySelector('.hive-chatbot-input').value = message;
                    this.sendMessage();
                });
            });
            
            // Bind feedback events
            messageEl.querySelectorAll('.hive-chatbot-feedback-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const feedback = btn.dataset.feedback;
                    const msgId = btn.dataset.messageId;
                    
                    const success = await this.sendFeedback(msgId, feedback);
                    
                    if (success) {
                        // Update button state
                        const feedbackContainer = btn.parentElement;
                        feedbackContainer.querySelectorAll('.hive-chatbot-feedback-btn').forEach(b => {
                            b.classList.remove('positive', 'negative');
                        });
                        btn.classList.add(feedback);
                    }
                });
            });
            
            // Scroll to bottom
            this.scrollToBottom();
            
            this.messages.push({
                id: messageId,
                userMessage,
                botResponse,
                timestamp: new Date(),
                relatedMessageId
            });
            
            return messageId;
        }
        
        showLoading() {
            this.isLoading = true;
            const messagesContainer = this.container.querySelector('.hive-chatbot-messages');
            
            const loadingEl = document.createElement('div');
            loadingEl.className = 'hive-chatbot-message hive-chatbot-loading-message';
            loadingEl.innerHTML = `
                <div class="hive-chatbot-message-bot">
                    <div class="hive-chatbot-message-bubble bot">
                        <div class="hive-chatbot-loading">
                            <div class="hive-chatbot-spinner"></div>
                            <span>${hiveChatbotAjax.strings.thinking}</span>
                        </div>
                    </div>
                </div>
            `;
            
            messagesContainer.appendChild(loadingEl);
            this.scrollToBottom();
        }
        
        hideLoading() {
            this.isLoading = false;
            const loadingMessage = this.container.querySelector('.hive-chatbot-loading-message');
            if (loadingMessage) {
                loadingMessage.remove();
            }
        }
        
        autoResizeInput() {
            const input = this.container.querySelector('.hive-chatbot-input');
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        }
        
        scrollToBottom() {
            const messagesContainer = this.container.querySelector('.hive-chatbot-messages');
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        
        getIcon(name) {
            const icons = {
                'message-circle': '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
                'x': '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
                'minimize': '<svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
                'maximize': '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>',
                'send': '<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9 22,2"/></svg>',
                'thumbs-up': '<svg viewBox="0 0 24 24"><path d="M7 10v12M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>',
                'thumbs-down': '<svg viewBox="0 0 24 24"><path d="M17 14V2M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/></svg>'
            };
            
            return icons[name] || '';
        }
    }

    // Initialize chatbot on DOM ready
    $(document).ready(function() {
        // Initialize main widget
        const mainWidget = document.getElementById('hive-chatbot-widget');
        if (mainWidget) {
            new HiveWellnessChatbot(mainWidget, hiveChatbotAjax.settings);
        }
        
        // Initialize shortcode widgets
        $('.hive-chatbot-shortcode').each(function() {
            const $this = $(this);
            const options = {
                position: $this.data('position') || 'bottom-right',
                compact: $this.data('compact') === true,
                showBranding: $this.data('branding') !== false,
                ...hiveChatbotAjax.settings
            };
            
            new HiveWellnessChatbot(this, options);
        });
    });

})(jQuery);