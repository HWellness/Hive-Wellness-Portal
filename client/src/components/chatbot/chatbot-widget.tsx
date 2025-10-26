import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmbeddableChatbot from './embeddable-chatbot';

// Create a separate query client for the widget to avoid conflicts
const widgetQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

interface ChatbotWidgetProps {
  // WordPress customisation options
  primaryColor?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  initialMessage?: string;
  compactMode?: boolean;
  showBranding?: boolean;
  apiEndpoint?: string;
}

function ChatbotWidget(props: ChatbotWidgetProps) {
  return (
    <QueryClientProvider client={widgetQueryClient}>
      <EmbeddableChatbot {...props} />
    </QueryClientProvider>
  );
}

// Export as default and named export
export default ChatbotWidget;
export { ChatbotWidget, EmbeddableChatbot };