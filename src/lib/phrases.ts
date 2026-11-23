import { addDays } from '../shared/dates';

export interface Phrase {
  id: string;
  lang: string; // BCP-47 code, e.g. es, fr, ja
  text: string; // in the language being learned
  meaning: string; // in your language
  pronunciation: string;
  category: string;
  notes: string;
  favorite: boolean;
  box: number; // Leitner box 1–5
  due: string; // next review date
  history: { date: string; correct: boolean }[];
  demo?: boolean;
}

export const LANGS: Record<string, string> = { es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', ja: 'Japanese', nl: 'Dutch', sw: 'Swahili' };
export const CATEGORIES = ['Greetings', 'Travel', 'Food & drink', 'Shopping', 'Directions', 'Emergencies', 'Small talk', 'Other'];

/** Days until the next review for each Leitner box. */
export const INTERVALS = [0, 1, 2, 4, 8, 16];

/** Correct answers move a card up a box (max 5); a miss sends it back to box 1, due tomorrow. */
export function review(p: Phrase, correct: boolean, today: string): Phrase {
  const box = correct ? Math.min(5, p.box + 1) : 1;
  return { ...p, box, due: addDays(today, INTERVALS[box]), history: [...p.history, { date: today, correct }].slice(-50) };
}

export const isDue = (p: Phrase, today: string) => p.due <= today;

export function dueQueue(list: Phrase[], today: string): Phrase[] {
  return list.filter((p) => isDue(p, today)).sort((a, b) => a.box - b.box || a.due.localeCompare(b.due) || a.text.localeCompare(b.text));
}

export function boxCounts(list: Phrase[]): number[] {
  return [1, 2, 3, 4, 5].map((b) => list.filter((p) => p.box === b).length);
}

/** Lower-case, strip accents, punctuation (including ¿¡) and extra spaces. */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[¿¡!?.,;:'"“”‘’()«»。、！？]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

export type Verdict = 'exact' | 'accents' | 'close' | 'wrong';

/**
 * exact: identical apart from case/spacing/punctuation · accents: only accents differ ·
 * close: a small typo (1 edit per 8 characters) · wrong: anything else.
 */
export function checkAnswer(given: string, expected: string): Verdict {
  const g = given.trim().toLowerCase().replace(/[¿¡!?.,;:'"“”‘’()«»]/g, ' ').replace(/\s+/g, ' ').trim();
  const e = expected.trim().toLowerCase().replace(/[¿¡!?.,;:'"“”‘’()«»]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!g) return 'wrong';
  if (g === e) return 'exact';
  const ng = normalize(given), ne = normalize(expected);
  if (ng === ne) return 'accents';
  return levenshtein(ng, ne) <= Math.max(1, Math.floor(ne.length / 8)) ? 'close' : 'wrong';
}

export const countsAsCorrect = (v: Verdict) => v !== 'wrong';

export function accuracy(list: Phrase[], today: string, days = 14) {
  const from = addDays(today, -(days - 1));
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    const all = list.flatMap((p) => p.history.filter((h) => h.date === date));
    return { date, reviews: all.length, correct: all.filter((h) => h.correct).length };
  });
}

/** Consecutive days ending today (or yesterday) with at least one review. */
export function streak(list: Phrase[], today: string): number {
  const days = new Set(list.flatMap((p) => p.history.map((h) => h.date)));
  let d = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function validatePhrase(d: { text: string; meaning: string; lang: string }, existing: Phrase[], excludeId?: string) {
  const e: Partial<Record<'text' | 'meaning' | 'lang', string>> = {};
  if (!d.text.trim()) e.text = 'Write the phrase.';
  if (!d.meaning.trim()) e.meaning = 'Write what it means.';
  if (!LANGS[d.lang]) e.lang = 'Choose a language.';
  if (!e.text && existing.some((p) => p.id !== excludeId && p.lang === d.lang && normalize(p.text) === normalize(d.text))) e.text = 'You already have this phrase.';
  return e;
}

/** Parses "phrase = meaning" lines (also tab-separated) for bulk import. */
export function parseBulk(text: string): { pairs: [string, string][]; errors: number[] } {
  const pairs: [string, string][] = [];
  const errors: number[] = [];
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const m = line.split(/\t| = | — | - /);
    if (m.length >= 2 && m[0].trim() && m.slice(1).join(' ').trim()) pairs.push([m[0].trim(), m.slice(1).join(' ').trim()]);
    else errors.push(i + 1);
  });
  return { pairs, errors };
}
