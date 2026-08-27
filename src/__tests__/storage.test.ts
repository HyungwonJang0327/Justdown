import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteNote, loadNote, loadNotes, saveNote, type Note } from '../storage';

beforeEach(() => AsyncStorage.clear());

describe('saveNote / loadNotes', () => {
  test('저장한 노트를 loadNotes 가 반환한다', async () => {
    const note: Note = { id: 'a', content: '# hello', updatedAt: 1000 };
    await saveNote(note);

    const notes = await loadNotes();

    expect(notes).toEqual([note]);
  });

  test('updatedAt 내림차순(최신순)으로 반환한다', async () => {
    await saveNote({ id: 'old', content: 'old', updatedAt: 1000 });
    await saveNote({ id: 'new', content: 'new', updatedAt: 3000 });
    await saveNote({ id: 'mid', content: 'mid', updatedAt: 2000 });

    const notes = await loadNotes();

    expect(notes.map((n) => n.id)).toEqual(['new', 'mid', 'old']);
  });
});

describe('deleteNote (소프트 삭제)', () => {
  test('삭제한 노트는 loadNotes 에서 제외된다', async () => {
    await saveNote({ id: 'a', content: 'keep', updatedAt: 1000 });
    await saveNote({ id: 'b', content: 'remove', updatedAt: 2000 });

    await deleteNote('b');

    const notes = await loadNotes();
    expect(notes.map((n) => n.id)).toEqual(['a']);
  });

  test('삭제해도 저장소에는 tombstone(deletedAt, 빈 content)이 남는다', async () => {
    await saveNote({ id: 'b', content: 'remove', updatedAt: 2000 });

    await deleteNote('b');

    const raw = await AsyncStorage.getItem('justdown.note.b');
    expect(raw).not.toBeNull();
    const tombstone = JSON.parse(raw!) as Note;
    expect(tombstone.deletedAt).toEqual(expect.any(Number));
    expect(tombstone.content).toBe('');
    expect(tombstone.id).toBe('b');
  });
});

describe('loadNote', () => {
  test('저장된 노트를 id 로 조회한다', async () => {
    const note: Note = { id: 'a', content: 'hi', updatedAt: 1000 };
    await saveNote(note);

    expect(await loadNote('a')).toEqual(note);
  });

  test('없는 노트는 null 을 반환한다', async () => {
    expect(await loadNote('missing')).toBeNull();
  });

  test('삭제된 노트는 null 을 반환한다', async () => {
    await saveNote({ id: 'a', content: 'hi', updatedAt: 1000 });
    await deleteNote('a');

    expect(await loadNote('a')).toBeNull();
  });
});

describe('레거시 블롭 마이그레이션', () => {
  test('구버전 justdown.notes 블롭을 개별 키로 이전하고 블롭을 제거한다', async () => {
    const legacy: Note[] = [
      { id: 'a', content: 'first', updatedAt: 2000 },
      { id: 'b', content: 'second', updatedAt: 1000 },
    ];
    await AsyncStorage.setItem('justdown.notes', JSON.stringify(legacy));

    const notes = await loadNotes();

    expect(notes.map((n) => n.id)).toEqual(['a', 'b']);
    expect(await AsyncStorage.getItem('justdown.notes')).toBeNull();
    expect(await loadNote('a')).toEqual(legacy[0]);
    expect(await loadNote('b')).toEqual(legacy[1]);
  });

  test('손상된 블롭은 무시하고 빈 목록을 반환한다', async () => {
    await AsyncStorage.setItem('justdown.notes', 'not-json');

    expect(await loadNotes()).toEqual([]);
  });
});
