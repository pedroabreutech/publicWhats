import type { Message } from '../types/message';

/** Extract transcript text from `[transcrição do áudio] …` or plain caption. */
export function parseAudioTranscript(content: string | undefined | null): string {
  const text = (content || '').trim();
  if (!text || text === '[áudio]' || /^\[áudio\]$/i.test(text)) return '';
  const m = text.match(/^\[transcrição do áudio\]\s*([\s\S]*)$/i);
  if (m) return m[1]!.trim();
  if (text.startsWith('[')) return '';
  return text;
}

/**
 * Resolve a playable URL for an audio message.
 * Prefers audio_src; falls back to /assets/{attachment} for known mp3/m4a names.
 */
export function resolveAudioSrc(msg: Message): string | null {
  if (msg.audio_src) return msg.audio_src;
  const att = msg.attachment?.trim();
  if (!att) return null;
  if (/\.(mp3|m4a|ogg|wav|webm)$/i.test(att)) {
    // Already under assets/ naming from the public export
    if (att.startsWith('/') || att.startsWith('http')) return att;
    return `/assets/${att}`;
  }
  // .opus from WhatsApp dumps — only if mirrored under /media/{conv}/…
  // (not available in the public zip by default)
  return null;
}
