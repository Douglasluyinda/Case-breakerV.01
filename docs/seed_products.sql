-- ── Seed: Case Breaker × DeutschwithDoug — Grammar Resources ─────────────────
-- Run once in Supabase SQL editor.  Safe to re-run (ON CONFLICT DO NOTHING).
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.products (slug, title, description, price_usd, is_active, file_type)
VALUES
  (
    'der-die-das-mastery-guide',
    'Der Die Das Mastery Guide',
    'The definitive PDF reference for German articles. Covers all four cases (nominative, accusative, dative, genitive) across all three genders with 200+ example sentences, colour-coded declension tables, gender pattern mnemonics, and a quick-reference wall chart. Designed by DeutschwithDoug to pair perfectly with the Case Breaker game — use the guide to understand the rules, then drill them in the app.',
    9.99,
    true,
    'application/pdf'
  ),
  (
    'case-breaker-anki-deck',
    'Case Breaker Anki Flashcard Deck',
    '300 spaced-repetition flashcards covering every tier of the Case Breaker game. Each card shows a German sentence with a blank, the correct article on the back, plus the case name and a grammar note. Import directly into Anki (free desktop + mobile app) and let the algorithm schedule your reviews. Printable PDF version included for analogue learners.',
    7.99,
    true,
    'application/zip'
  ),
  (
    'german-case-cheat-sheet',
    'German Case Cheat Sheet — A3 Poster PDF',
    'A single, beautifully typeset A3 poster that fits every declension table you need on one page: definite articles (der/die/das), indefinite articles (ein/eine/ein), negative articles, possessive pronouns, and personal pronouns — all four cases, all three genders. Print it, laminate it, and keep it on your desk. Instant download, print-ready PDF at 300 dpi.',
    4.99,
    true,
    'application/pdf'
  ),
  (
    'german-prepositions-master-list',
    'German Prepositions Master List — PDF Guide',
    'Stop guessing which case a preposition triggers. This 28-page PDF organises every common German preposition by the case it governs (accusative-only, dative-only, two-way), with usage rules, example sentences, and memory tricks for each group. Includes a one-page quick-reference table and 50 practice sentences with answer key. A must-have companion to the Case Breaker game tiers 3–6.',
    6.99,
    true,
    'application/pdf'
  ),
  (
    'complete-german-grammar-bundle',
    'Complete Grammar Bundle — All 4 Guides + Anki Deck',
    'The full DeutschwithDoug × Case Breaker resource library in one download: Der Die Das Mastery Guide, German Case Cheat Sheet (A3), Prepositions Master List, 300-card Anki deck, and a bonus 40-page workbook with 150 fill-in-the-blank exercises (answers included). Everything you need to go from confused beginner to confident intermediate speaker. Save 40% vs buying separately.',
    24.99,
    true,
    'application/zip'
  )
ON CONFLICT (slug) DO NOTHING;
