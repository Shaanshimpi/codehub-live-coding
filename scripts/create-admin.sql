-- Create an admin user
-- Run this SQL directly in your Neon database console

-- First, check if the user exists
SELECT id, email, role FROM users WHERE email = 'admin@codehub.com';

-- If the user doesn't exist, you need to sign up first at /signup
-- Then run this to upgrade the user to admin:
UPDATE users 
SET role = 'admin' 
WHERE email = 'YOUR_EMAIL_HERE';

-- Verify the change
SELECT id, name, email, role FROM users WHERE role = 'admin';


