-- ── Seed: Case Breaker products ─────────────────────────────────────────────
-- Run this once in Supabase SQL editor to populate the shop.
-- Safe to re-run (ON CONFLICT DO NOTHING).

INSERT INTO public.products (slug, title, description, price_usd, is_active)
VALUES
  (
    'der-die-das-mastery-guide',
    'Der Die Das Mastery Guide',
    'The complete PDF guide to German articles — nominative, accusative, dative and genitive cases with 200+ practice sentences, mnemonics and quick-reference tables. Pairs perfectly with the Case Breaker game.',
    9.99,
    true
  ),
  (
    'case-breaker-pro-flashcards',
    'Case Breaker Pro Flashcard Deck',
    '300 printable and digital flashcards covering all 6 tiers of the Case Breaker game. Spaced-repetition ready (Anki deck included).',
    7.99,
    true
  )
ON CONFLICT (slug) DO NOTHING;
