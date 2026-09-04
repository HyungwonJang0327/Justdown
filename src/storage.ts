import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeName } from './theme';

export interface Note {
  id: string;
  content: string;
  updatedAt: number;
  /** 소프트 삭제 시각. 값이 있으면 삭제된 노트(tombstone)로, 목록에서 제외된다. */
  deletedAt?: number;
}

const NOTES_KEY = 'justdown.notes';
const THEME_KEY = 'justdown.theme';
const NOTE_KEY_PREFIX = 'justdown.note.';

function noteKey(id: string): string {
  return NOTE_KEY_PREFIX + id;
}

/** 구버전(단일 블롭) 저장 형식을 노트별 키로 이전한다. */
async function migrateLegacyBlob(): Promise<void> {
  const raw = await AsyncStorage.getItem(NOTES_KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Note[];
    if (Array.isArray(parsed)) {
      await AsyncStorage.multiSet(
        parsed.map((n) => [noteKey(n.id), JSON.stringify(n)])
      );
      await AsyncStorage.removeItem(NOTES_KEY);
    }
  } catch {
    // 손상된 블롭은 무시
  }
}

export async function loadNotes(): Promise<Note[]> {
  await migrateLegacyBlob();
  const keys = (await AsyncStorage.getAllKeys()).filter((k) =>
    k.startsWith(NOTE_KEY_PREFIX)
  );
  const pairs = await AsyncStorage.multiGet(keys);
  const notes: Note[] = [];
  for (const [, raw] of pairs) {
    if (!raw) continue;
    try {
      const note = JSON.parse(raw) as Note;
      if (note.deletedAt == null) notes.push(note);
    } catch {
      // 손상된 항목은 무시
    }
  }
  return notes.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadNote(id: string): Promise<Note | null> {
  const raw = await AsyncStorage.getItem(noteKey(id));
  if (!raw) return null;
  try {
    const note = JSON.parse(raw) as Note;
    return note.deletedAt == null ? note : null;
  } catch {
    return null;
  }
}

export async function saveNote(note: Note): Promise<void> {
  // 삭제된 노트(tombstone)는 자동 저장(unmount flush 등)으로 부활하지 않는다
  const raw = await AsyncStorage.getItem(noteKey(note.id));
  if (raw) {
    try {
      if ((JSON.parse(raw) as Note).deletedAt != null) return;
    } catch {
      // 손상된 항목은 덮어쓴다
    }
  }
  await AsyncStorage.setItem(noteKey(note.id), JSON.stringify(note));
}

export async function deleteNote(id: string): Promise<void> {
  const now = Date.now();
  const tombstone: Note = { id, content: '', updatedAt: now, deletedAt: now };
  await AsyncStorage.setItem(noteKey(id), JSON.stringify(tombstone));
}

export async function loadTheme(): Promise<ThemeName> {
  const raw = await AsyncStorage.getItem(THEME_KEY);
  return raw === 'dark' ? 'dark' : 'light';
}

export async function saveTheme(theme: ThemeName): Promise<void> {
  await AsyncStorage.setItem(THEME_KEY, theme);
}

/** content 의 첫 비어있지 않은 줄을 제목으로 사용한다. */
export function noteTitle(content: string): string {
  const line = content
    .split('\n')
    .map((l) => l.replace(/^#+\s*/, '').trim())
    .find((l) => l.length > 0);
  return line ?? '';
}
