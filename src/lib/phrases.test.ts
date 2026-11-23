import { describe, expect, it } from 'vitest';
import { accuracy, boxCounts, checkAnswer, dueQueue, levenshtein, normalize, parseBulk, review, streak, validatePhrase, type Phrase } from './phrases';

const today = '2026-11-23';
const p = (x: Partial<Phrase>): Phrase => ({ id: Math.random().toString(), lang: 'es', text: '¿Dónde está la estación?', meaning: 'Where is the station?', pronunciation: '', category: 'Travel', notes: '', favorite: false, box: 1, due: today, history: [], ...x });

describe('Leitner scheduling', () => {
  it('moves up a box on success and back to box 1 on a miss', () => {
    const a = review(p({ box: 2 }), true, today);
    expect(a).toMatchObject({ box: 3, due: '2026-11-27' });
    expect(review(p({ box: 5 }), true, today)).toMatchObject({ box: 5, due: '2026-12-09' });
    expect(review(p({ box: 4 }), false, today)).toMatchObject({ box: 1, due: '2026-11-24' });
    expect(a.history).toEqual([{ date: today, correct: true }]);
  });
  it('queues due phrases, lowest box first', () => {
    const q = dueQueue([p({ id: 'a', box: 3 }), p({ id: 'b', box: 1 }), p({ id: 'c', due: '2026-12-01' })], today);
    expect(q.map((x) => x.id)).toEqual(['b', 'a']);
    expect(boxCounts([p({ box: 1 }), p({ box: 1 }), p({ box: 5 })])).toEqual([2, 0, 0, 0, 1]);
  });
});

describe('answer checking', () => {
  it('normalises accents, punctuation and case', () => {
    expect(normalize('¿Dónde  está la estación?')).toBe('donde esta la estacion');
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });
  it('grades exact, accent-only, small typos and wrong answers', () => {
    expect(checkAnswer('dónde está la estación', '¿Dónde está la estación?')).toBe('exact');
    expect(checkAnswer('donde esta la estacion', '¿Dónde está la estación?')).toBe('accents');
    expect(checkAnswer('donde esta la estasion', '¿Dónde está la estación?')).toBe('close');
    expect(checkAnswer('donde esta el tren', '¿Dónde está la estación?')).toBe('wrong');
    expect(checkAnswer('', 'hola')).toBe('wrong');
  });
});

describe('stats, validation and import', () => {
  it('reports daily accuracy and a review streak', () => {
    const list = [p({ history: [{ date: '2026-11-22', correct: true }, { date: '2026-11-23', correct: false }, { date: '2026-11-21', correct: true }] })];
    const acc = accuracy(list, today, 3);
    expect(acc.map((d) => [d.reviews, d.correct])).toEqual([[1, 1], [1, 1], [1, 0]]);
    expect(streak(list, today)).toBe(3);
    expect(streak([p({ history: [{ date: '2026-11-20', correct: true }] })], today)).toBe(0);
  });
  it('validates new phrases and rejects duplicates ignoring accents', () => {
    expect(validatePhrase({ text: '', meaning: '', lang: 'xx' }, [])).toEqual({ text: expect.any(String), meaning: expect.any(String), lang: expect.any(String) });
    expect(validatePhrase({ text: 'donde esta la estacion', meaning: 'x', lang: 'es' }, [p({})]).text).toMatch(/already/);
    expect(validatePhrase({ text: 'donde esta la estacion', meaning: 'x', lang: 'fr' }, [p({})])).toEqual({});
  });
  it('parses bulk lines and reports bad ones', () => {
    expect(parseBulk('Merci = Thank you\nBonjour\tHello\n\nnonsense line')).toEqual({ pairs: [['Merci', 'Thank you'], ['Bonjour', 'Hello']], errors: [4] });
  });
});
