-- Create Admin Secrets table for password recovery
CREATE TABLE IF NOT EXISTS admin_secrets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  secret_code text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Secure it: Only authenticated users can manage secrets, anon can only verify
ALTER TABLE admin_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage secrets" ON admin_secrets TO authenticated USING (true) WITH CHECK (true);

-- Create a secure RPC function so anonymous users can verify the secret without reading the whole table
CREATE OR REPLACE FUNCTION verify_admin_secret(input_secret text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER -- Run as database owner
AS $$
DECLARE
  secret_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM admin_secrets WHERE secret_code = input_secret
  ) INTO secret_exists;
  
  RETURN secret_exists;
END;
$$;
