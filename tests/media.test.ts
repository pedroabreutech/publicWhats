import { describe, expect, it } from 'vitest';
import { parseAudioTranscript, resolveAudioSrc } from '../src/lib/media';
import type { Message } from '../src/types/message';

function msg(partial: Partial<Message>): Message {
  return {
    id: 1,
    timestamp: '2025-01-01T00:00:00',
    date: '2025-01-01',
    time: '00:00:00',
    sender: 'DV',
    content: '',
    type: 'audio',
    ...partial,
  };
}

describe('parseAudioTranscript', () => {
  it('extracts transcription prefix', () => {
    expect(parseAudioTranscript('[transcrição do áudio] Olá mundo')).toBe('Olá mundo');
  });

  it('ignores bare [áudio] label', () => {
    expect(parseAudioTranscript('[áudio]')).toBe('');
  });
});

describe('resolveAudioSrc', () => {
  it('uses audio_src when present', () => {
    expect(
      resolveAudioSrc(msg({ audio_src: '/assets/audio-nikolas-ferreira.mp3' })),
    ).toBe('/assets/audio-nikolas-ferreira.mp3');
  });

  it('maps mp3 attachment to /assets/', () => {
    expect(resolveAudioSrc(msg({ attachment: 'audio-silas-malafaia.mp3' }))).toBe(
      '/assets/audio-silas-malafaia.mp3',
    );
  });

  it('returns null for opus without mirror', () => {
    expect(resolveAudioSrc(msg({ attachment: '0001-AUDIO.opus' }))).toBeNull();
  });
});
