import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

const KEY = 'phrase-pocket:store';

describe('Phrase Pocket', () => {
  it('shows due phrases and runs a recall session with accent-tolerant marking', async () => {
    window.location.hash = '/practice';
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTestId('due')).toHaveTextContent('5 Spanish phrases due today.');
    await user.click(screen.getByRole('button', { name: 'Start session' }));
    // Lowest box first: “¿Dónde está la estación de tren?” is the first box-1 card alphabetically? check meaning shown
    const meaning = screen.getByText(/Where is the train station\?|I am allergic to nuts\.|I’d like a table/);
    expect(meaning).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'I don’t know' }));
    expect(screen.getByText('Not quite.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText(/card 2 of 5/)).toBeInTheDocument();
  });

  it('accepts an answer without accents', async () => {
    localStorage.setItem(KEY, JSON.stringify({ phrases: [{ id: 'a', lang: 'es', text: '¿Cuánto cuesta?', meaning: 'How much does it cost?', pronunciation: '', category: 'Shopping', notes: '', favorite: false, box: 1, due: '2000-01-01', history: [] }] }));
    window.location.hash = '/practice';
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Start session' }));
    await user.type(screen.getByLabelText(/Type the phrase/), 'cuanto cuesta');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(screen.getByText('Correct — watch the accents.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Session complete')).toBeInTheDocument();
    expect(screen.getByText(/1 of 1 correct/)).toBeInTheDocument();
  });

  it('adds a phrase, rejects a duplicate and imports a list', async () => {
    window.location.hash = '/phrases';
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Phrase'), 'Mucho gusto');
    await user.type(screen.getByLabelText('Meaning'), 'Pleased to meet you');
    await user.click(screen.getByRole('button', { name: 'Add phrase' }));
    expect(screen.getByText('You already have this phrase.')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/One per line/), 'Gracias = Thank you\nnot valid');
    await user.click(screen.getByRole('button', { name: 'Import list' }));
    expect(screen.getByText(/Imported 1 Spanish phrase\. Couldn’t read line 2\./)).toBeInTheDocument();
  });

  it('filters by language and favourites', async () => {
    window.location.hash = '/phrases';
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByLabelText('Show language'), 'es');
    await user.click(screen.getByRole('button', { name: '★ Favourites' }));
    expect(within(screen.getByTestId('phrase-list')).getAllByRole('listitem')).toHaveLength(2);
  });

  it('shows progress charts', () => {
    window.location.hash = '/progress';
    render(<App />);
    expect(screen.getByRole('img', { name: /Phrases per box/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /of/ })).toBeInTheDocument();
  });
});
