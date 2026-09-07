-- Runs automatically, once, the first time this container initializes a
-- brand-new (empty) pgdata volume — see docker-compose.yml's bind mount of
-- this directory to /docker-entrypoint-initdb.d, and apps/diet-helper's
-- CLAUDE.md for why these two specific extensions are here.

-- Case-insensitive text type, used for the users table's email column so
-- signup/login don't care about letter case (avoids duplicate accounts and
-- login failures from a case mismatch).
CREATE EXTENSION IF NOT EXISTS citext;

-- Trigram-based fuzzy text matching, used for product/recipe search so a
-- typo or partial match still finds results, and so those searches can use
-- a proper index instead of a slow full-table LIKE scan.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
