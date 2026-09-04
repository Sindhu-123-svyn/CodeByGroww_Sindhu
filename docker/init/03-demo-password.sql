-- SEED_DATA.sql's demo1@example.com ships with a placeholder (non-bcrypt)
-- password hash — see that file's comments. This sets a real one so the
-- dockerized stack has a working login out of the box, with zero manual
-- steps, matching the account/password documented throughout RUNBOOK.md
-- and both READMEs (demo1@example.com / demopass123).
--
-- Generated via: python -c "from app.core.security import hash_password; print(hash_password('demopass123'))"
UPDATE users
SET password_hash = '$2b$12$KWaZWOYKXXkdcxeZ3eekkOMUKPDEaOI4f.ecoFDEN5z8DEfmkkI1y'
WHERE email = 'demo1@example.com';
