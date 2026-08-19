import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const AI_CHAT_URL = 'https://gbufmahyxmvfovsfajpq.supabase.co/functions/v1/ai-chat';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdidWZtYWh5eG12Zm92c2ZhanBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMzA1NDcsImV4cCI6MjEwMjcwNjU0N30.lOBMiZ8W__ZAT_xKJ5NBY84lF1Xed1sApiVTXIYszvA';

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    setError(null);
    const userMessage: ChatMessage = { role: 'user', content: content.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Get the current session for the access token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token || ANON_KEY;

      const response = await fetch(AI_CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: updatedMessages,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      if (data.text) {
        const assistantMessage: ChatMessage = { role: 'assistant', content: data.text };
        setMessages([...updatedMessages, assistantMessage]);
      } else {
        throw new Error('Invalid response from assistant');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(`Oops! ${errorMessage}. Please try again.`);
      // Remove the user message if the request failed
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
  };
}
