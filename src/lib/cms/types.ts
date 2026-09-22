/** CMS domain types */

export interface CaseMeta {
  id: string;
  slug: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  published: boolean;
  /** Built-in seeded corpus vs user-created */
  builtin?: boolean;
}

export interface ConversationMeta {
  id: string;
  caseId: string;
  participants: string[];
  contact: string;
  owner: string;
  date_range: { start: string; end: string };
  total_messages: number;
  media_counts?: { images: number; videos: number; documents: number };
  last_message?: { content: string; timestamp: string; sender: string };
  phone?: string;
  source?: string;
  note?: string;
  about?: string | null;
  avatar?: string | null;
}

export interface Profile {
  about?: string;
  sections?: Array<{ title: string; paragraphs: string[] }>;
  sources?: Array<string | { label: string; url: string }>;
}

export interface Message {
  id: number;
  timestamp: string;
  date: string;
  time: string;
  sender: string;
  content: string;
  type: string;
  is_edited?: boolean;
  attachment?: string | null;
  audio_src?: string | null;
  urls?: string[];
  source_page?: number;
  source_figure?: number;
}

export interface DateIndexEntry {
  date: string;
  message_count: number;
  first_message_id: number;
  last_message_id: number;
}

export interface CmsIndex {
  version: 1;
  cases: CaseMeta[];
}
