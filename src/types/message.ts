/** Shared message / conversation types for PublicWhats */

export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'sticker'
  | 'document'
  | 'deleted'
  | 'call'
  | 'system';

export interface Message {
  id: number;
  timestamp: string;
  date: string;
  time: string;
  sender: string;
  content: string;
  type: MessageType;
  is_edited?: boolean;
  attachment?: string | null;
  /** Public URL for playable audio, e.g. /assets/audio-nikolas-ferreira.mp3 */
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

export interface LastMessage {
  content: string;
  timestamp: string;
  sender: string;
}

export interface SourceDocument {
  file?: string;
  url?: string;
  download?: string;
  sha256?: string;
  pages?: number;
}

export interface Conversation {
  id: string;
  participants: string[];
  contact: string;
  owner: string;
  date_range: { start: string; end: string };
  total_messages: number;
  media_counts?: { images: number; videos: number; documents: number };
  last_message?: LastMessage;
  phone?: string;
  saved_as?: string;
  source?: string;
  note?: string;
  source_document?: SourceDocument;
  avatar?: string;
}

export interface ProfileSection {
  title: string;
  paragraphs: string[];
}

export interface Profile {
  about?: string;
  sections?: ProfileSection[];
  sources?: Array<string | { label: string; url: string }>;
}

export interface SearchHit {
  id: number;
  date: string;
  sender: string;
  content: string;
}
