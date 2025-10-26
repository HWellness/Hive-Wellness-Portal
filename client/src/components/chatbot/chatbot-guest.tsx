import React, { useState, useRef, useEffect } from 'react';
import { X, MessageCircle, ThumbsUp, ThumbsDown, Send, AlertTriangle, HelpCircle, Shield, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isRedacted?: boolean;
  feedbackGiven?: boolean;
  source?: 'faq' | 'ai' | 'privacy_warning';
}

interface ChatbotGuestProps {
  isEmbedded?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'center';
}

export const ChatbotGuest = React.memo(function ChatbotGuest({ isEmbedded = false, position = 'bottom-right' }: ChatbotGuestProps) {
  // Load persisted state from localStorage
  const [isOpen, setIsOpen] = useState(() => {
    if (isEmbedded) return true;
    try {
      return localStorage.getItem('hive-chatbot-open') === 'true';
    } catch {
      return false;
    }
  });
  const [isMinimized, setIsMinimized] = useState(false);
  // Load persisted messages from localStorage
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('hive-chatbot-messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        return parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      }
    } catch {
      // Fallback to default
    }
    return [
      {
        id: '1',
        text: "Wellness therapy services. How can I assist you today?",
        isUser: false,
        timestamp: new Date(),
        source: 'faq'
      }
    ];
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Persist state changes to localStorage
  useEffect(() => {
    if (!isEmbedded) {
      try {
        localStorage.setItem('hive-chatbot-open', isOpen.toString());
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [isOpen, isEmbedded]);
  
  useEffect(() => {
    try {
      localStorage.setItem('hive-chatbot-messages', JSON.stringify(messages));
    } catch {
      // Ignore localStorage errors
    }
  }, [messages]);
  
  // Handle Escape key to close chatbot
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isEmbedded) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, isEmbedded]);
  
  // Focus management
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/chatbot/guest-chat', { message });
      return response;
    },
    onSuccess: (data) => {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        text: data.response,
        isUser: false,
        timestamp: new Date(),
        isRedacted: data.wasRedacted || false,
        source: data.source || 'ai'
      };
      setMessages(prev => [...prev, newMessage]);
      setIsTyping(false);
    },
    onError: (error) => {
      console.error('Chat error:', error);
      setIsTyping(false);
      
      // Add fallback message
      const fallbackMessage: ChatMessage = {
        id: Date.now().toString(),
        text: "I'm having trouble connecting right now. For immediate assistance, please visit our main website at hive-wellness.co.uk or call our support team. You can also try asking your question again in a moment.",
        isUser: false,
        timestamp: new Date(),
        source: 'ai'
      };
      setMessages(prev => [...prev, fallbackMessage]);
      
      toast({
        title: "Connection Issue",
        description: "I'm having trouble responding. Please try again or visit our main website.",
        variant: "destructive",
      });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ messageId, isPositive }: { messageId: string; isPositive: boolean }) => {
      return await apiRequest('POST', '/api/chatbot/guest-feedback', { messageId, isPositive });
    },
    onSuccess: (_, variables) => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === variables.messageId 
            ? { ...msg, feedbackGiven: true }
            : msg
        )
      );
    },
  });

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    chatMutation.mutate(inputMessage);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    // Allow Shift+Enter for new lines
  };
  
  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  const handleFeedback = (messageId: string, isPositive: boolean) => {
    feedbackMutation.mutate({ messageId, isPositive });
  };

  const getWidgetPositionStyles = () => {
    if (isEmbedded) return '';
    
    const baseStyles = 'fixed z-[9999]'; // Increased z-index for better visibility
    switch (position) {
      case 'bottom-right':
        return `${baseStyles} bottom-6 right-6`; // Increased spacing from edges
      case 'bottom-left':
        return `${baseStyles} bottom-6 left-6`;
      case 'center':
        return `${baseStyles} top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`;
      default:
        return `${baseStyles} bottom-6 right-6`;
    }
  };

  const getQuickQuestions = () => [
    "Pricing",
    "Book Session",
    "Consultation",
    "Contact"
  ];

  const handleQuickQuestion = (question: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: question,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    chatMutation.mutate(question);
  };

  if (!isOpen && !isEmbedded) {
    return (
      <div className={getWidgetPositionStyles()}>
        <Button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl border-2 border-background hover:scale-105 transition-all duration-300 relative"
          style={{
            boxShadow: '0 0 20px rgba(147, 6, 177, 0.3), 0 8px 32px rgba(147, 6, 177, 0.15)'
          }}
          aria-label="Open Hive Wellness Assistant"
          data-testid="chatbot-trigger"
        >
          <MessageCircle className="w-6 h-6" />
          {/* Subtle glow effect */}
          <div className="absolute inset-0 rounded-full bg-primary opacity-20 animate-pulse"></div>
        </Button>
      </div>
    );
  }

  return (
    <div 
      ref={chatContainerRef}
      className={isEmbedded ? 'w-full h-full' : getWidgetPositionStyles()}
      role="dialog"
      aria-label="Hive Wellness Assistant Chat"
      data-testid="chatbot-panel"
    >
      <Card className={`${isEmbedded ? 'w-full h-full' : 'w-96 h-[550px]'} bg-white border-0 shadow-2xl overflow-hidden`}
            style={{
              borderRadius: '1.5rem'
            }}>
        <CardHeader 
          className="p-4 rounded-t-3xl"
          style={{ backgroundColor: 'var(--hive-purple)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg font-medium text-white">Hive Wellness</CardTitle>
            </div>
            {!isEmbedded && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="text-primary-foreground hover:bg-primary-foreground/20 p-2 h-8 w-8"
                  aria-label="Minimize chat"
                  data-testid="chatbot-minimize"
                >
                  <Minimize2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-primary-foreground hover:bg-primary-foreground/20 p-2 h-8 w-8"
                  aria-label="Close chat assistant"
                  data-testid="chatbot-close"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className={`p-0 h-full flex flex-col bg-white ${isMinimized ? 'hidden' : ''}`}>
          {/* Initial welcome content */}
          {messages.length === 1 && (
            <div className="p-5 bg-white">
              <div className="text-gray-700 text-[15px] mb-4">
                Wellness therapy services. How can I assist you today?
              </div>
              
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-3">Quick questions:</div>
                <div className="grid grid-cols-2 gap-2">
                  {getQuickQuestions().map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickQuestion(question)}
                      className="text-sm px-3 py-2 h-auto rounded-lg border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 whitespace-normal"
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Ready to get started section - prominent placement */}
              <div className="p-4 rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="text-sm font-medium text-purple-800 mb-3">Ready to get started?</div>
                <a href="/portal">
                  <Button size="sm" className="w-full text-sm py-2.5 h-auto rounded-lg bg-purple-600 hover:bg-purple-700">
                    Book Free Consultation
                  </Button>
                </a>
              </div>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 px-5 bg-white">
            <div className="space-y-4 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex group ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 text-[15px] leading-[1.5] ${
                      message.isUser
                        ? 'text-white shadow-sm'
                        : 'bg-gray-50 text-gray-800 shadow-sm border border-gray-100'
                    }`}
                    style={message.isUser ? { backgroundColor: 'var(--hive-purple)' } : {}}
                  >
                    <p className="leading-relaxed">{message.text}</p>
                    
                    {/* Timestamp */}
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    
                    {message.isRedacted && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Shield className="w-3 h-3" />
                        <span>Privacy filter applied</span>
                      </div>
                    )}
                    
                    {message.source === 'faq' && (
                      <Badge variant="secondary" className="mt-2 text-xs bg-accent/10 text-accent-foreground">
                        FAQ
                      </Badge>
                    )}
                    
                    {/* Feedback buttons for assistant messages - hover reveal */}
                    {!message.isUser && !message.feedbackGiven && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback(message.id, true)}
                          className="p-1 h-6 w-6 hover:bg-green-500/10 hover:text-green-600"
                          aria-label="Helpful response"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback(message.id, false)}
                          className="p-1 h-6 w-6 hover:bg-red-500/10 hover:text-red-600"
                          aria-label="Not helpful"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-xl px-3 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input - Sticky Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-100 p-5">
            <div className="flex gap-3">
              <Textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                placeholder="Type your message here..."
                className="flex-1 text-[15px] resize-none min-h-[44px] max-h-[120px] overflow-hidden rounded-lg border-gray-200"
                style={{ 
                  '--tw-border-color': 'var(--border)',
                  '--tw-ring-color': 'var(--hive-purple)' 
                } as React.CSSProperties}
                disabled={isTyping}
                rows={1}
                data-testid="chatbot-input"
                aria-label="Type your message"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                size="sm"
                className="mb-0 shrink-0 w-11 h-11 rounded-lg focus:outline-none focus:ring-2"
                style={{ 
                  backgroundColor: 'var(--hive-purple)',
                  '--tw-ring-color': 'var(--hive-purple)',
                  '--tw-ring-opacity': '0.2' 
                } as React.CSSProperties}
                aria-label="Send message"
                data-testid="chatbot-send"
              >
                <Send className="w-4 h-4 text-white" />
              </Button>
            </div>
            
            <div className="text-xs text-gray-500 mt-3 text-center font-medium">
              Powered by Hive Wellness
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default ChatbotGuest;