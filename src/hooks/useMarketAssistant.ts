import { useState, useCallback, useRef } from 'react';
import { buildMarketContext, SYSTEM_PROMPT } from '../lib/MarketContextBuilder';
import { nowTs } from '../utils/formatters';
import type { ChatMessage, AssistantContext } from '../types';

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function useMarketAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const historyRef = useRef<OpenAIMessage[]>([]);

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const sendMessage = useCallback(
    async (userText: string, ctx: AssistantContext) => {
      if (!userText.trim() || isLoading) return;

      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        content: userText.trim(),
        ts: nowTs(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      historyRef.current = [
        ...historyRef.current,
        { role: 'user', content: userText.trim() },
      ];

      const marketContext = buildMarketContext(ctx);
      const systemWithContext = `${SYSTEM_PROMPT}\n\nLIVE MARKET DATA (as of ${nowTs()}):\n${marketContext}`;

      const streamId = uid();
      const streamMsg: ChatMessage = {
        id: streamId,
        role: 'assistant',
        content: '',
        ts: nowTs(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, streamMsg]);

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(import.meta.env.VITE_OPENAI_API_KEY && {
              Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
            }),
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            max_tokens: 1024,
            stream: true,
            messages: [
              { role: 'system', content: systemWithContext },
              ...historyRef.current,
            ],
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          throw new Error(`API error ${response.status}: ${err}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let assistantText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));
          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string }; finish_reason?: string }>;
              };
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantText += content;
                setMessages((prev) =>
                  prev.map((m) => (m.id === streamId ? { ...m, content: assistantText } : m)),
                );
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }

        historyRef.current = [
          ...historyRef.current,
          { role: 'assistant', content: assistantText },
        ];

        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamId ? { ...m, isStreaming: false } : m,
          ),
        );
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === streamId
              ? { ...m, content: `Error: ${errMsg}`, isStreaming: false }
              : m,
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [isLoading],
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
  }, []);

  return {
    messages,
    isLoading,
    isOpen,
    open,
    close,
    sendMessage,
    clearHistory,
  };
}
