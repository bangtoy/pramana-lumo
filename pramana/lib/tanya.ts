import type { Percakapan } from './contracts.ts';
import { sourceDetails } from './analyst-evidence.ts';
import { recommendationActions } from './recommendation-actions.ts';
import { ringkasan } from './dashboard.ts';

export type PublicPercakapan = Omit<Percakapan, 'agent_history'>;
export function publicPercakapan(conversation: Percakapan): PublicPercakapan {
  const { agent_history: _history, ...publicConversation } = conversation;
  const data = ringkasan();
  return { ...publicConversation, messages: publicConversation.messages.map(message => message.role === 'pramana' ? { ...message, source_details: sourceDetails(message.sumber || []), recommendation_actions: recommendationActions(message.rekomendasi || [], message.sumber, data) } : message) };
}
