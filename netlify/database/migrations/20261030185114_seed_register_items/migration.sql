-- Seed the 24 items (names, units and rates) from the September 2026 housekeeping register.
INSERT INTO "items" ("name", "unit", "rate") VALUES
  ('Dental Kit', 'Nos', 12.39),
  ('Toothbrush pack - Paper Pouch Standard', 'Nos', 16.76),
  ('Shaving Kit', 'Nos', 25),
  ('Razor pack - paper pouch Standard', 'Nos', 19.47),
  ('Comb', 'Nos', 4),
  ('Comb pack - paper pouch standard', 'Nos', 4.96),
  ('Shower Cap', 'Nos', 3),
  ('Sanitary bag', 'Nos', 2),
  ('Plain Sewing kit', 'Nos', 3),
  ('Care Kit', 'Nos', 4),
  ('Business Kit', 'Nos', 3),
  ('Plain Loofah Pad', 'Nos', 14),
  ('Shoe Shiner With Sponge', 'Nos', 9.44),
  ('OT Slipper Jute', 'Nos', 34.65),
  ('Ignis bathing Bar 25g paper warp', 'Nos', 11.80),
  ('Ignis Shampoo Tube 22 ML', 'Nos', 11.80),
  ('Ignis Shower Gel Tube 22 ML', 'Nos', 11.80),
  ('Ignis Lotion Tube 22 ml', 'Nos', 11.80),
  ('Bio Morning Nectar Lotion (Orange Blossom) 35ml', 'BOT', 15.93),
  ('Bio Almond Oil Soap 30g', 'Nos', 10.62),
  ('Bio Shampoo (Orange Blossom) 35ml', 'BOT', 16),
  ('Bio Green Shampoo 25 ML', 'BOT', 11.80),
  ('Bio Apricot Gel (Orange Blossom) 35ml', 'BOT', 16),
  ('BIO Apricot Shower Gel 25 ML', 'Nos', 11.80);
--> statement-breakpoint
INSERT INTO "sync_state" ("id", "version") VALUES (1, 1);
