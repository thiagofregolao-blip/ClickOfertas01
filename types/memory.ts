export interface ConversationMemory {
  lastShownProducts: string[];
  currentFocusProductId: string | null;
  lastQuery: string | null;
  conversationContext: Record<string, unknown>;
}