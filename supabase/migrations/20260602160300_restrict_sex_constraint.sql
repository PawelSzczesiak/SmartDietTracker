-- Restrict sex field constraint from 4 options to 2 (male, female, null)
-- This aligns the database schema with updated TypeScript types and validation
-- that removed 'other' and 'prefer_not_to_say' options.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_sex_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_sex_check CHECK (sex IN ('male', 'female') OR sex IS NULL);
