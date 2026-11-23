import { useMemo, useRef, useState, type ReactNode } from 'react';
import { DemoTag, EmptyState, Field, Landing, NotFound, Notice, PageHead, Shell, uid, useFlash, usePersistentState, useRoute } from './shared/ui';
import { addDays, formatDay, todayISO } from './shared/dates';
import { CATEGORIES, LANGS, accuracy, boxCounts, checkAnswer, countsAsCorrect, dueQueue, parseBulk, review, streak, validatePhrase, type Phrase, type Verdict } from './lib/phrases';

const KEY = 'phrase-pocket:store';
const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/phrases', label: 'Phrases' },
  { to: '/practice', label: 'Practise' },
  { to: '/progress', label: 'Progress' },
];

interface Store {
  phrases: Phrase[];
}

export function demoPhrases(today: string): Phrase[] {
  const mk = (lang: string, text: string, meaning: string, pronunciation: string, category: string, box: number, dueIn: number, hist: boolean[] = [], extra: Partial<Phrase> = {}): Phrase => ({
    id: uid('ph'), lang, text, meaning, pronunciation, category, notes: '', favorite: false, box, due: addDays(today, dueIn),
    history: hist.map((c, i) => ({ date: addDays(today, -hist.length + i), correct: c })), demo: true, ...extra,
  });
  return [
    mk('es', '¿Dónde está la estación de tren?', 'Where is the train station?', 'DON-deh es-TAH lah es-tah-SYON', 'Directions', 1, 0, [false, true, false]),
    mk('es', 'La cuenta, por favor.', 'The bill, please.', 'lah KWEN-tah por fah-VOR', 'Food & drink', 3, 0, [true, true, true], { favorite: true }),
    mk('es', '¿Cuánto cuesta?', 'How much does it cost?', 'KWAN-toh KWES-tah', 'Shopping', 2, 0, [true, false, true]),
    mk('es', 'Soy alérgico a los frutos secos.', 'I am allergic to nuts.', 'soy ah-LEHR-hee-koh', 'Emergencies', 1, 0, [], { notes: 'Use “alérgica” if you identify as female.', favorite: true }),
    mk('es', 'Mucho gusto.', 'Nice to meet you.', 'MOO-choh GOOS-toh', 'Greetings', 5, 9, [true, true, true, true, true]),
    mk('es', '¿Me puede ayudar, por favor?', 'Can you help me, please?', '', 'Emergencies', 4, 3, [true, true, true, true]),
    mk('es', 'Quisiera una mesa para dos personas junto a la ventana, si es posible.', 'I’d like a table for two by the window, if possible.', '', 'Food & drink', 1, 0),
    mk('fr', 'Bonjour, je voudrais un café.', 'Hello, I’d like a coffee.', '', 'Food & drink', 2, 0, [true, true]),
    mk('fr', 'Où sont les toilettes ?', 'Where are the toilets?', 'oo son lay twah-LET', 'Directions', 3, 2, [true, false, true, true]),
    mk('fr', 'Je ne comprends pas.', 'I don’t understand.', '', 'Small talk', 1, 0, [false]),
    mk('ja', 'すみません', 'Excuse me / sorry', 'sumimasen', 'Greetings', 2, 1, [true]),
    mk('ja', 'ありがとうございます', 'Thank you (polite)', 'arigatō gozaimasu', 'Greetings', 3, 0, [true, true]),
  ];
}

const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
function speak(text: string, lang: string) {
  if (!canSpeak()) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export default function App() {
  const [route] = useRoute();
  const today = todayISO();
  const [store, setStore] = usePersistentState<Store>(KEY, () => ({ phrases: demoPhrases(today) }));
  const ctx = { store, setStore, today };
  let page: ReactNode;
  if (route === '/') page = <Home />;
  else if (route === '/phrases') page = <Phrases {...ctx} />;
  else if (route === '/practice') page = <Practice {...ctx} />;
  else if (route === '/progress') page = <Progress {...ctx} />;
  else page = <NotFound />;
  return (
    <Shell name="Phrase Pocket" wordmark={['Phrase', 'Pocket']} nav={NAV} route={route} cta={{ to: '/practice', label: 'Practise now' }} footerNote="Your phrases stay in this browser. Pronunciation uses your device’s built-in voices when available.">
      {page}
    </Shell>
  );
}

type Ctx = { store: Store; setStore: (s: Store) => void; today: string };

function SpeakBtn({ p }: { p: Pick<Phrase, 'text' | 'lang'> }) {
  if (!canSpeak()) return null;
  return <button type="button" className="icon-btn speak" aria-label={`Hear “${p.text}”`} onClick={() => speak(p.text, p.lang)}>▶</button>;
}

function Boxes({ list }: { list: Phrase[] }) {
  const c = boxCounts(list);
  const max = Math.max(1, ...c);
  return (
    <div className="boxes" role="img" aria-label={`Phrases per box: ${c.map((n, i) => `box ${i + 1}: ${n}`).join(', ')}`}>
      {c.map((n, i) => (
        <div key={i} className="box-col" style={{ ['--i' as string]: i }}>
          <span className="box-n">{n}</span>
          <span className="box-bar" style={{ height: `${(n / max) * 100}%` }} />
          <span className="box-l mono">Box {i + 1}</span>
        </div>
      ))}
    </div>
  );
}

function HeroPreview() {
  const today = todayISO();
  const list = demoPhrases(today);
  const card = list[1];
  return (
    <div className="hero-pk">
      <div className="flash">
        <span className="label-mono">{LANGS[card.lang]} · Box {card.box}</span>
        <p className="flash-text" lang={card.lang}>{card.text}</p>
        <p className="small muted">{card.pronunciation}</p>
        <p className="flash-meaning">{card.meaning}</p>
      </div>
      <div><p className="eyebrow">{dueQueue(list, today).length} due today</p><Boxes list={list} /></div>
    </div>
  );
}

function Home() {
  return (
    <Landing
      eyebrow="Phrasebook & practice"
      title={<>The phrases you’ll <em>actually need.</em></>}
      lead="Collect phrases for your next trip or class, hear them spoken, and practise them in short daily sessions. Phrase Pocket brings back the ones you miss and spaces out the ones you know."
      primary={{ href: '#/practice', label: 'Start practising' }}
      secondary={{ href: '#/phrases', label: 'Browse phrases' }}
      previewLabel="Today — demo phrasebook"
      preview={<HeroPreview />}
      steps={[
        { title: 'Collect', body: 'Add phrases one by one or paste a list of “phrase = meaning” lines.' },
        { title: 'Practise', body: 'Recognise a phrase, or recall it from its meaning and type it — accents are forgiven, typos are pointed out.' },
        { title: 'Space it out', body: 'Five Leitner boxes: right answers wait longer before coming back; misses return tomorrow.' },
      ]}
      stepsIntro="Phrase Pocket opens with twelve labelled demo phrases in Spanish, French and Japanese, some already in progress."
      features={[
        { title: 'Two directions', body: 'Reading (see the phrase, recall its meaning) and speaking (see the meaning, produce the phrase).' },
        { title: 'Fair marking', body: 'Missing accents and small typos still count, with the correct spelling shown so you learn it.' },
        { title: 'Hear it', body: 'Uses your device’s text-to-speech voices for each language when they’re installed.' },
        { title: 'Progress you can see', body: 'Due today, box distribution, 14-day accuracy and your practice streak.' },
      ]}
      note="Pronunciation hints and voices are approximations — check with native speakers and your course materials."
      closing={{ title: <>Ten minutes a day <em>beats a weekend cram.</em></>, action: { href: '#/practice', label: 'Practise now' } }}
    />
  );
}

/* ---------- Phrases ---------- */
function Phrases({ store, setStore, today }: Ctx) {
  const [lang, setLang] = useState('');
  const [cat, setCat] = useState('');
  const [q, setQ] = useState('');
  const [fav, setFav] = useState(false);
  const [flash, setFlash] = useFlash(5000);
  const [d, setD] = useState({ lang: 'es', text: '', meaning: '', pronunciation: '', category: 'Travel' });
  const [submitted, setSubmitted] = useState(false);
  const [bulk, setBulk] = useState('');
  const langs = [...new Set(store.phrases.map((p) => p.lang))];
  const errors = submitted ? validatePhrase(d, store.phrases) : {};
  const rows = useMemo(() => store.phrases.filter((p) => (!lang || p.lang === lang) && (!cat || p.category === cat) && (!fav || p.favorite) && `${p.text} ${p.meaning} ${p.notes}`.toLowerCase().includes(q.trim().toLowerCase())), [store, lang, cat, fav, q]);
  function add(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(validatePhrase(d, store.phrases)).length) return;
    setStore({ phrases: [{ id: uid('ph'), lang: d.lang, text: d.text.trim(), meaning: d.meaning.trim(), pronunciation: d.pronunciation.trim(), category: d.category, notes: '', favorite: false, box: 1, due: today, history: [] }, ...store.phrases] });
    setFlash({ kind: 'success', text: `Added “${d.text.trim()}”. It’s due for practice today.` });
    setD({ ...d, text: '', meaning: '', pronunciation: '' });
    setSubmitted(false);
  }
  function importBulk() {
    const { pairs, errors: bad } = parseBulk(bulk);
    const fresh = pairs.filter(([t]) => !Object.keys(validatePhrase({ text: t, meaning: 'x', lang: d.lang }, store.phrases)).length);
    if (!pairs.length) return setFlash({ kind: 'error', text: 'No lines in the “phrase = meaning” format were found.' });
    setStore({ phrases: [...fresh.map(([text, meaning]) => ({ id: uid('ph'), lang: d.lang, text, meaning, pronunciation: '', category: d.category, notes: '', favorite: false, box: 1, due: today, history: [] })), ...store.phrases] });
    setBulk('');
    setFlash({ kind: bad.length || fresh.length < pairs.length ? 'warn' : 'success', text: `Imported ${fresh.length} ${LANGS[d.lang]} phrase${fresh.length === 1 ? '' : 's'}.${pairs.length - fresh.length ? ` Skipped ${pairs.length - fresh.length} you already had.` : ''}${bad.length ? ` Couldn’t read line${bad.length === 1 ? '' : 's'} ${bad.join(', ')}.` : ''}` });
  }
  return (
    <div className="stack">
      <PageHead eyebrow={`${store.phrases.length} phrases`} title={<>Your <em>phrasebook.</em></>} />
      {flash && <Notice kind={flash.kind} onDismiss={() => setFlash(null)}>{flash.text}</Notice>}
      <div className="grid-2">
        <form className="card stack" onSubmit={add} noValidate aria-labelledby="add-t">
          <h2 id="add-t" className="h3">Add a phrase</h2>
          <div className="form-grid two">
            <Field label="Language" error={errors.lang}>{(p) => <select {...p} value={d.lang} onChange={(e) => setD({ ...d, lang: e.target.value })}>{Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}</Field>
            <Field label="Category">{(p) => <select {...p} value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>}</Field>
          </div>
          <Field label="Phrase" error={errors.text}>{(p) => <input {...p} lang={d.lang} value={d.text} onChange={(e) => setD({ ...d, text: e.target.value })} />}</Field>
          <Field label="Meaning" error={errors.meaning}>{(p) => <input {...p} value={d.meaning} onChange={(e) => setD({ ...d, meaning: e.target.value })} />}</Field>
          <Field label="Pronunciation hint" hint="Optional">{(p) => <input {...p} value={d.pronunciation} onChange={(e) => setD({ ...d, pronunciation: e.target.value })} />}</Field>
          <div><button className="btn btn-primary" type="submit">Add phrase</button></div>
        </form>
        <div className="card stack">
          <h2 className="h3">Paste a list</h2>
          <Field label="One per line: phrase = meaning" hint={`Goes into ${LANGS[d.lang]} · ${d.category} (set on the left)`}>{(p) => <textarea {...p} rows={7} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'Gracias = Thank you\nPor favor = Please'} />}</Field>
          <div><button type="button" className="btn" disabled={!bulk.trim()} onClick={importBulk}>Import list</button></div>
        </div>
      </div>
      <div className="card filters">
        <Field label="Search" className="grow">{(p) => <input {...p} type="search" value={q} onChange={(e) => setQ(e.target.value)} />}</Field>
        <Field label="Show language">{(p) => <select {...p} value={lang} onChange={(e) => setLang(e.target.value)}><option value="">All</option>{langs.map((l) => <option key={l} value={l}>{LANGS[l]}</option>)}</select>}</Field>
        <Field label="Category">{(p) => <select {...p} value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>}</Field>
        <button type="button" className="btn" aria-pressed={fav} onClick={() => setFav(!fav)}>★ Favourites</button>
      </div>
      {store.phrases.length === 0 ? <EmptyState title="No phrases yet" actions={<button type="button" className="btn" onClick={() => setStore({ phrases: demoPhrases(today) })}>Load demo phrases</button>}>Add one above, or paste a list.</EmptyState> : rows.length === 0 ? <EmptyState title="Nothing matches" /> : (
        <ul className="phrases" data-testid="phrase-list">
          {rows.map((p) => (
            <li key={p.id} className="card ph">
              <div className="ph-main">
                <span className="ph-text" lang={p.lang}>{p.text}</span>
                <span className="ph-meaning">{p.meaning}</span>
                {p.pronunciation && <span className="small muted">{p.pronunciation}</span>}
                {p.notes && <span className="small">{p.notes}</span>}
              </div>
              <div className="ph-side">
                <span className="small muted">{LANGS[p.lang]} · {p.category}</span>
                <span className="small">Box {p.box} · {p.due <= today ? 'due now' : `next ${formatDay(p.due, { day: 'numeric', month: 'short' })}`}</span>
                {p.demo && <DemoTag />}
                <span className="row nowrap">
                  <SpeakBtn p={p} />
                  <button type="button" className={`icon-btn star ${p.favorite ? 'on' : ''}`} aria-pressed={p.favorite} aria-label={`Favourite “${p.text}”`} onClick={() => setStore({ phrases: store.phrases.map((x) => (x.id === p.id ? { ...x, favorite: !x.favorite } : x)) })}>★</button>
                  <button type="button" className="icon-btn" aria-label={`Delete “${p.text}”`} onClick={() => setStore({ phrases: store.phrases.filter((x) => x.id !== p.id) })}>✕</button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {store.phrases.some((p) => p.demo) && <div><button type="button" className="btn btn-ghost btn-sm" onClick={() => { setStore({ phrases: store.phrases.filter((p) => !p.demo) }); setFlash({ kind: 'success', text: 'Demo phrases removed.' }); }}>Clear demo phrases</button></div>}
    </div>
  );
}

/* ---------- Practice ---------- */
type Mode = 'recognise' | 'recall';
function Practice({ store, setStore, today }: Ctx) {
  const langs = [...new Set(store.phrases.map((p) => p.lang))];
  const [lang, setLang] = useState(langs[0] ?? 'es');
  const [mode, setMode] = useState<Mode>('recall');
  const [session, setSession] = useState<string[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const due = dueQueue(store.phrases.filter((p) => p.lang === lang), today);
  const current = session ? store.phrases.find((p) => p.id === session[idx]) : undefined;

  function start(extra = false) {
    const pool = extra ? store.phrases.filter((p) => p.lang === lang).sort(() => Math.random() - 0.5) : due;
    setSession(pool.slice(0, 15).map((p) => p.id));
    setIdx(0); setResults([]); setRevealed(false); setAnswer(''); setVerdict(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }
  function grade(correct: boolean) {
    setStore({ phrases: store.phrases.map((p) => (p.id === current!.id ? review(p, correct, today) : p)) });
    setResults([...results, correct]);
    setIdx(idx + 1); setRevealed(false); setAnswer(''); setVerdict(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }
  function check(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    setVerdict(checkAnswer(answer, current!.text));
  }

  if (!store.phrases.length) return <EmptyState title="No phrases to practise" actions={<a className="btn btn-primary" href="#/phrases">Add phrases</a>} />;
  if (!session) return (
    <div className="stack">
      <PageHead eyebrow="Practise" title={<>A short <em>session.</em></>} description="Up to 15 phrases, starting with the ones you find hardest." />
      <div className="card stack">
        <div className="filters">
          <Field label="Language">{(p) => <select {...p} value={lang} onChange={(e) => setLang(e.target.value)}>{langs.map((l) => <option key={l} value={l}>{LANGS[l]}</option>)}</select>}</Field>
        </div>
        <div className="tabs" role="radiogroup" aria-label="Mode">
          <button type="button" role="radio" aria-checked={mode === 'recall'} onClick={() => setMode('recall')}>Speaking: meaning → phrase</button>
          <button type="button" role="radio" aria-checked={mode === 'recognise'} onClick={() => setMode('recognise')}>Reading: phrase → meaning</button>
        </div>
        <p data-testid="due">{due.length} {LANGS[lang]} phrase{due.length === 1 ? '' : 's'} due today.</p>
        <div className="row">
          <button type="button" className="btn btn-primary" disabled={!due.length} onClick={() => start(false)}>Start session</button>
          <button type="button" className="btn" onClick={() => start(true)}>Extra practice (doesn’t wait for due dates)</button>
        </div>
      </div>
    </div>
  );
  if (!current) {
    const right = results.filter(Boolean).length;
    return (
      <EmptyState title="Session complete" actions={<><button type="button" className="btn btn-primary" onClick={() => setSession(null)}>Back to practice</button><a className="btn" href="#/progress">See progress</a></>}>
        {right} of {results.length} correct. Missed phrases come back tomorrow; the rest wait longer.
      </EmptyState>
    );
  }
  return (
    <div className="stack practice">
      <div className="row-between"><span className="label-mono">{LANGS[current.lang]} · card {idx + 1} of {session.length} · box {current.box}</span><button type="button" className="btn btn-sm btn-ghost" onClick={() => setSession(null)}>End session</button></div>
      <div className="progress" role="progressbar" aria-label="Session progress" aria-valuemin={0} aria-valuemax={session.length} aria-valuenow={idx}><span style={{ width: `${(idx / session.length) * 100}%` }} /></div>
      <section className="card flash big" aria-live="polite">
        {mode === 'recognise' ? (
          <>
            <p className="flash-text" lang={current.lang}>{current.text} <SpeakBtn p={current} /></p>
            {current.pronunciation && <p className="small muted">{current.pronunciation}</p>}
            {revealed ? <>
              <p className="flash-meaning" data-testid="reveal">{current.meaning}</p>
              <div className="row"><button type="button" className="btn btn-primary" onClick={() => grade(true)}>I knew it</button><button type="button" className="btn" onClick={() => grade(false)}>I didn’t</button></div>
            </> : <button type="button" className="btn btn-primary" onClick={() => setRevealed(true)}>Show meaning</button>}
          </>
        ) : (
          <>
            <p className="flash-meaning">{current.meaning}</p>
            <form onSubmit={check} className="stack">
              <label className="sr-only" htmlFor="ans">Type the phrase in {LANGS[current.lang]}</label>
              <input id="ans" ref={inputRef} lang={current.lang} className="answer" value={answer} disabled={!!verdict} onChange={(e) => setAnswer(e.target.value)} placeholder={`In ${LANGS[current.lang]}…`} autoComplete="off" autoCapitalize="off" spellCheck={false} />
              {!verdict && <div className="row"><button className="btn btn-primary" type="submit" disabled={!answer.trim()}>Check</button><button type="button" className="btn btn-ghost" onClick={() => setVerdict('wrong')}>I don’t know</button></div>}
            </form>
            {verdict && (
              <div className={`verdict v-${verdict}`} role="status">
                <strong>{verdict === 'exact' ? 'Correct!' : verdict === 'accents' ? 'Correct — watch the accents.' : verdict === 'close' ? 'Nearly — a small typo.' : 'Not quite.'}</strong>
                <p lang={current.lang}>{current.text} <SpeakBtn p={current} /></p>
                <button type="button" className="btn btn-primary" autoFocus onClick={() => grade(countsAsCorrect(verdict))}>Next</button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/* ---------- Progress ---------- */
function Progress({ store, today }: Ctx) {
  const acc = accuracy(store.phrases, today, 14);
  const max = Math.max(4, ...acc.map((a) => a.reviews));
  const total = acc.reduce((s, a) => s + a.reviews, 0), right = acc.reduce((s, a) => s + a.correct, 0);
  const [tip, setTip] = useState<string | null>(null);
  if (!store.phrases.length) return <EmptyState title="No phrases yet" actions={<a className="btn btn-primary" href="#/phrases">Add phrases</a>} />;
  return (
    <div className="stack">
      <PageHead eyebrow="Progress" title={<>How it’s <em>sticking.</em></>} />
      <div className="stats">
        <div className="stat"><span className="stat-label">Due today</span><span className="stat-value">{dueQueue(store.phrases, today).length}</span></div>
        <div className="stat"><span className="stat-label">Due tomorrow</span><span className="stat-value">{store.phrases.filter((p) => p.due === addDays(today, 1)).length}</span></div>
        <div className="stat"><span className="stat-label">Accuracy, 14 days</span><span className="stat-value">{total ? `${Math.round((right / total) * 100)}%` : '—'}</span></div>
        <div className="stat"><span className="stat-label">Streak</span><span className="stat-value">{streak(store.phrases, today)} days</span></div>
      </div>
      <div className="grid-2">
        <section className="card stack" aria-labelledby="bx-t"><h2 id="bx-t" className="h3">Phrases per box</h2><Boxes list={store.phrases} /><p className="small muted">Box 1 comes back daily; box 5 every 16 days.</p></section>
        <section className="card stack" aria-labelledby="ac-t">
          <h2 id="ac-t" className="h3">Reviews per day</h2>
          <div className="bars-wrap" onMouseLeave={() => setTip(null)}>
            <div className="bars-axis" aria-hidden="true">{[max, Math.round(max / 2), 0].map((t) => <span key={t}>{t}</span>)}</div>
            <div className="bars" role="img" aria-label={acc.map((a) => `${formatDay(a.date, { day: 'numeric', month: 'short' })}: ${a.correct} of ${a.reviews}`).join(', ')}>
              {acc.map((a, i) => {
                const text = `${formatDay(a.date, { weekday: 'short', day: 'numeric', month: 'short' })}: ${a.correct} right, ${a.reviews - a.correct} missed`;
                return (
                  <div key={a.date} className="bar-col" style={{ ['--i' as string]: i }} tabIndex={0} aria-label={text} onMouseEnter={() => setTip(text)} onFocus={() => setTip(text)} onBlur={() => setTip(null)}>
                    <div className="bar-stack" style={{ height: `${(a.reviews / max) * 100}%` }}><span style={{ flexGrow: a.correct, background: 'var(--ok)' }} /><span style={{ flexGrow: a.reviews - a.correct, background: 'var(--err)' }} /></div>
                    <span className="bar-label mono">{a.date === today ? 'Today' : formatDay(a.date, { day: 'numeric' })}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="small" aria-live="polite">{tip ?? 'Hover or focus a day for the breakdown.'}</p>
          <p className="legend"><span><i style={{ background: 'var(--ok)' }} />Right</span><span><i style={{ background: 'var(--err)' }} />Missed</span></p>
        </section>
      </div>
    </div>
  );
}
