import type { Percakapan } from './contracts.ts';

export type PublicPercakapan = Omit<Percakapan, 'agent_history'>;
export function publicPercakapan(conversation: Percakapan): PublicPercakapan {
  const { agent_history: _history, ...publicConversation } = conversation;
  return publicConversation;
}
