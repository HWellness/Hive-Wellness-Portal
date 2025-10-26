import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, X, Send, ThumbsUp, ThumbsDown, Minimize2, Maximize2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ChatMessage {
  id: string;
  message: string;
  response: string;
  timestamp: Date;
  feedback?: 'positive' | 'negative';
}

interface EmbeddableChatbotProps {
  // Configuration options for different WordPress implementations
  primaryColor?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  initialMessage?: string;
  compactMode?: boolean;
  showBranding?: boolean;
}

interface QuickReply {
  id: string;
  text: string;
  message: string;
}

export default function EmbeddableChatbot({
  primaryColor = 'var(--hive-purple)',
  position = 'bottom-right',
  initialMessage = "Hi! I'm here to help with questions about Hive Wellness therapy services. How can I assist you today?",
  compactMode = false,
  showBranding = true
}: EmbeddableChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const quickReplies: QuickReply[] = [
    { id: '1', text: 'Pricing', message: 'What are your therapy session prices?' },
    { id: '2', text: 'Book Session', message: 'How do I book a therapy session?' },
    { id: '3', text: 'Consultation', message: 'Tell me about the free consultation' },
    { id: '4', text: 'Contact', message: 'What is your support email address?' }
  ];

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add initial welcome message
      const welcomeMessage: ChatMessage = {
        id: '1',
        message: '',
        response: 'Wellness therapy services. How can I assist you today?',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, messages.length, initialMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const autoResizeTextarea = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    autoResizeTextarea();
  };

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    setInputValue('');
    setIsLoading(true);
    setShowQuickReplies(false); // Hide quick replies after first message
    
    // Reset textarea height after clearing input
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = '40px';
      }
    }, 0);

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      message: message,
      response: '',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);

    try {
      const response = await apiRequest('POST', '/api/chatbot/chat', {
        message: message,
        conversationId: conversationId || undefined
      });

      const data = await response.json();
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, response: data.response }
            : msg
        )
      );

      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, response: "I'm sorry, I'm having trouble connecting right now. Please try again or email support@hive-wellness.co.uk for assistance." }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => {
    sendMessage(inputValue.trim());
  };

  const handleQuickReply = (message: string) => {
    sendMessage(message);
  };

  const handleFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    try {
      await apiRequest('POST', '/api/chatbot/feedback', {
        messageId,
        feedback,
        conversationId
      });

      setMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, feedback }
            : msg
        )
      );
    } catch (error) {
      console.error('Feedback error:', error);
    }
  };

  const getPositionClasses = () => {
    const base = 'fixed z-50';
    switch (position) {
      case 'bottom-right':
        return `${base} bottom-4 right-4`;
      case 'bottom-left':
        return `${base} bottom-4 left-4`;
      case 'top-right':
        return `${base} top-4 right-4`;
      case 'top-left':
        return `${base} top-4 left-4`;
      default:
        return `${base} bottom-4 right-4`;
    }
  };

  if (!isOpen) {
    return (
      <div className={getPositionClasses()}>
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-lg w-16 h-16 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4"
          style={{ 
            backgroundColor: 'var(--hive-purple)',
            '--tw-ring-color': 'var(--hive-purple)', 
            '--tw-ring-opacity': '0.2'
          } as React.CSSProperties}
          data-testid="chatbot-toggle-button"
          aria-label="Open Hive Wellness chat assistant"
        >
          <MessageCircle className="w-7 h-7 text-white" />
        </Button>
        {showBranding && (
          <div className="text-xs text-gray-500 mt-2 text-center font-medium">
            Powered by Hive Wellness
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={getPositionClasses()}>
      <Card className={`w-[400px] max-w-[calc(100vw-2rem)] shadow-2xl border-0 overflow-hidden transition-all duration-300 bg-white rounded-3xl ${compactMode ? 'w-80' : ''} ${isMinimized ? 'h-14' : 'h-[550px]'}`}>
        <CardHeader className="pb-2 px-5 py-4 flex-shrink-0 rounded-t-3xl" style={{ backgroundColor: 'var(--hive-purple)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CardTitle className="text-white text-lg font-medium">
                Hive Wellness
              </CardTitle>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-white/20 p-2 h-8 w-8 rounded-md transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/50"
                data-testid={isMinimized ? "maximize-button" : "minimize-button"}
                aria-label={isMinimized ? "Maximize chat" : "Minimize chat"}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 hover:bg-red-500/20 p-2 h-8 w-8 rounded-md transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-white/50"
                data-testid="close-button"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className="p-0 flex flex-col bg-white" style={{ height: 'calc(100% - 64px)' }}>
            {/* Initial welcome content */}
            {showQuickReplies && messages.length <= 1 && (
              <div className="p-5 bg-white">
                <div className="text-gray-700 text-[15px] mb-4">
                  Wellness therapy services. How can I assist you today?
                </div>
                
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-3">Quick questions:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {quickReplies.map((reply) => (
                      <Button
                        key={reply.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickReply(reply.message)}
                        className="text-sm px-3 py-2 h-auto rounded-lg border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 whitespace-normal"
                        data-testid={`quick-reply-${reply.id}`}
                      >
                        {reply.text}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Ready to get started section - prominent placement */}
                <div className="p-4 rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
                  <div className="text-sm font-medium text-purple-800 mb-3">Ready to get started?</div>
                  <Button
                    size="sm"
                    className="w-full text-sm py-2.5 h-auto rounded-lg bg-purple-600 hover:bg-purple-700"
                    onClick={() => handleQuickReply('I want to book a free 20-minute consultation')}
                    data-testid="book-consultation-button"
                  >
                    Book Free Consultation
                  </Button>
                </div>
              </div>
            )}

            <ScrollArea className="flex-1 p-5 bg-white" aria-live="polite" aria-label="Chat messages">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div key={message.id} className="space-y-3">
                  {message.message && (
                    <div className="flex justify-end">
                      <div 
                        className="text-white px-4 py-3 rounded-lg max-w-[70%] text-[15px] leading-[1.5] shadow-sm whitespace-pre-wrap break-words"
                        style={{ backgroundColor: 'var(--hive-purple)' }}
                        data-testid={`user-message-${index}`}
                      >
                        {message.message}
                      </div>
                    </div>
                  )}
                  {message.response && (
                    <div className="flex justify-start">
                      <div 
                        className="bg-gray-50 text-gray-800 px-4 py-3 rounded-lg max-w-[70%] text-[15px] leading-[1.5] shadow-sm border border-gray-100 whitespace-pre-wrap break-words"
                        data-testid={`bot-message-${index}`}
                      >
                        {message.response}
                        {message.message && (
                          <div className="flex items-center mt-3 space-x-2">
                            <span className="text-xs text-gray-500 font-medium">Was this helpful?</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFeedback(message.id, 'positive')}
                              className={`p-1 h-auto hover:bg-green-50 rounded-md ${message.feedback === 'positive' ? 'text-green-600' : 'text-gray-400'}`}
                              data-testid={`positive-feedback-${index}`}
                              aria-label="Mark as helpful"
                            >
                              <ThumbsUp className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFeedback(message.id, 'negative')}
                              className={`p-1 h-auto hover:bg-red-50 rounded-md ${message.feedback === 'negative' ? 'text-red-600' : 'text-gray-400'}`}
                              data-testid={`negative-feedback-${index}`}
                              aria-label="Mark as not helpful"
                            >
                              <ThumbsDown className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 text-gray-800 px-4 py-3 rounded-lg max-w-[70%] text-[15px] border border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-gray-600">Typing...</span>
                    </div>
                  </div>
                </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t border-gray-100 p-5 bg-white">
              <div className="flex items-end space-x-3">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Type your message here..."
                  className="flex-1 text-[15px] resize-none min-h-[44px] max-h-[120px] overflow-hidden rounded-lg border-gray-200"
                  style={{ 
                    '--tw-border-color': 'var(--border)',
                    '--tw-ring-color': 'var(--hive-purple)' 
                  } as React.CSSProperties}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isLoading}
                  rows={1}
                  data-testid="message-input"
                  aria-label="Type your message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  size="sm"
                  className="mb-0 shrink-0 w-11 h-11 rounded-lg focus:outline-none focus:ring-2"
                  style={{ 
                    backgroundColor: 'var(--hive-purple)',
                    '--tw-ring-color': 'var(--hive-purple)',
                    '--tw-ring-opacity': '0.2' 
                  } as React.CSSProperties}
                  data-testid="send-button"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4 text-white" />
                </Button>
              </div>
              {showBranding && (
                <div className="text-xs text-gray-500 mt-3 text-center font-medium">
                  Powered by Hive Wellness
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}