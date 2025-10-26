import React from 'react';
import { ChatbotEmbed } from '@/components/chatbot/chatbot-embed';

export default function ChatbotEmbedPage() {
  return (
    <div className="w-full h-screen">
      <ChatbotEmbed height="100vh" width="100%" />
    </div>
  );
}