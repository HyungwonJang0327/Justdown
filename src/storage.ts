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
const HIDE_RUBY_KEY = 'justdown.hideRuby';

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

export async function saveNote(
  note: Note,
  opts?: { resurrect?: boolean }
): Promise<void> {
  // 삭제된 노트(tombstone)는 자동 저장(unmount flush 등)으로 부활하지 않는다.
  // 단, 에디터가 내용을 비워 스스로 tombstone 을 만든 뒤 계속 타이핑한 경우는
  // resurrect 로 명시적 부활을 허용한다 (아니면 이후 입력이 전부 저장 거부됨).
  if (!opts?.resurrect) {
    const raw = await AsyncStorage.getItem(noteKey(note.id));
    if (raw) {
      try {
        if ((JSON.parse(raw) as Note).deletedAt != null) return;
      } catch {
        // 손상된 항목은 덮어쓴다
      }
    }
  }
  await AsyncStorage.setItem(noteKey(note.id), JSON.stringify(note));
}

export async function deleteNote(id: string): Promise<void> {
  const now = Date.now();
  const tombstone: Note = { id, content: '', updatedAt: now, deletedAt: now };
  await AsyncStorage.setItem(noteKey(id), JSON.stringify(tombstone));
}

/** 삭제 마커(tombstone)는 loadNotes 가 걸러내지만 저장소에는 계속 쌓인다.
 *  TTL 지난 것만 정리한다. 1.2 iCloud 동기화가 tombstone 으로 삭제를 전파하므로
 *  TTL 은 넉넉히 둔다(동기화는 초 단위라 30일이면 미전파 삭제가 지워질 위험 없음). */
const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일

export async function purgeTombstones(
  ttlMs: number = TOMBSTONE_TTL_MS,
  now: number = Date.now()
): Promise<number> {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) =>
    k.startsWith(NOTE_KEY_PREFIX)
  );
  const pairs = await AsyncStorage.multiGet(keys);
  const expired: string[] = [];
  for (const [key, raw] of pairs) {
    if (!raw) continue;
    try {
      const note = JSON.parse(raw) as Note;
      if (note.deletedAt != null && note.deletedAt < now - ttlMs) expired.push(key);
    } catch {
      // 손상된 항목은 무시
    }
  }
  if (expired.length) await AsyncStorage.multiRemove(expired);
  // 저장소에서 사라진 노트의 요미가나 설정도 함께 정리한다
  const alive = new Set(
    keys.filter((k) => !expired.includes(k)).map((k) => k.slice(NOTE_KEY_PREFIX.length))
  );
  await updateHideRubyIds((ids) => ids.filter((id) => alive.has(id)));
  return expired.length;
}

/** 요미가나를 가린 노트 ID 목록. 기기별 보기 설정이라 노트 본문·updatedAt 과 분리해 둔다
 *  (노트에 넣으면 토글이 목록 순서·자동 저장과 얽힌다). 삭제된 노트의 ID 는
 *  tombstone 이 GC 될 때 purgeTombstones 가 정리한다 — 비웠다가 재입력(resurrect)한
 *  노트의 설정이 날아가지 않도록 deleteNote 시점에는 지우지 않는다. */
async function loadHideRubyIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(HIDE_RUBY_KEY);
  if (!raw) return [];
  try {
    const ids: unknown = JSON.parse(raw);
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

// 읽고-고쳐-쓰기라서 연속 토글이 서로의 결과를 덮어쓰지 않게 직렬화한다
let hideRubyQueue: Promise<void> = Promise.resolve();

function updateHideRubyIds(fn: (ids: string[]) => string[]): Promise<void> {
  const run = hideRubyQueue.then(async () => {
    const ids = await loadHideRubyIds();
    const next = fn(ids);
    if (next.length === ids.length && next.every((id, i) => id === ids[i])) return;
    if (next.length) await AsyncStorage.setItem(HIDE_RUBY_KEY, JSON.stringify(next));
    else await AsyncStorage.removeItem(HIDE_RUBY_KEY);
  });
  hideRubyQueue = run.catch(() => {});
  return run;
}

export async function loadHideRuby(id: string): Promise<boolean> {
  return (await loadHideRubyIds()).includes(id);
}

export function saveHideRuby(id: string, hidden: boolean): Promise<void> {
  return updateHideRubyIds((ids) => {
    const rest = ids.filter((x) => x !== id);
    return hidden ? [...rest, id] : rest;
  });
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
