import React, { createContext, useContext, useRef, useState } from 'react';
import { createSession, type SessionMemory } from '@/services/aiConversation';
import type { Anime } from '@/types';

interface AiSessionValue {
  memory: SessionMemory;
  aiDeck: Anime[] | null;
  setAiDeck: (deck: Anime[] | null) => void;
}

const AiSessionContext = createContext<AiSessionValue | null>(null);

export function AiSessionProvider({ children }: { children: React.ReactNode }) {
  const memoryRef = useRef<SessionMemory>(createSession());
  const [aiDeck, setAiDeck] = useState<Anime[] | null>(null);

  return (
    <AiSessionContext.Provider value={{ memory: memoryRef.current, aiDeck, setAiDeck }}>
      {children}
    </AiSessionContext.Provider>
  );
}

export function useAiSession(): AiSessionValue {
  const ctx = useContext(AiSessionContext);
  if (!ctx) throw new Error('useAiSession must be used within AiSessionProvider');
  return ctx;
}
