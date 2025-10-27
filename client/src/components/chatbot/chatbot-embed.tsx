import React from "react";
import ChatbotWidget from "./chatbot-widget";

interface ChatbotEmbedProps {
  height?: string;
  width?: string;
  title?: string;
}

export function ChatbotEmbed({
  height = "500px",
  width = "100%",
  title = "Hive Wellness Chat Assistant",
}: ChatbotEmbedProps) {
  return (
    <div
      className="chatbot-embed-container border rounded-lg overflow-hidden shadow-lg"
      style={{ height, width }}
    >
      <ChatbotWidget isEmbedded={true} />
    </div>
  );
}

// WordPress integration component
export function WordPressChatbotEmbed() {
  return (
    <div className="hive-chatbot-wordpress">
      <ChatbotEmbed height="400px" width="100%" />
    </div>
  );
}
