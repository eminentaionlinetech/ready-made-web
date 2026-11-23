CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Owner allowlist: only trusted backend code can read or change it.
CREATE TABLE public.admin_invites (
  email text PRIMARY KEY CHECK (email = lower(email)),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_invites TO service_role;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

-- Grant admin only once the invited email is verified.
CREATE OR REPLACE FUNCTION public.grant_invited_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.admin_invites WHERE email = lower(NEW.email)) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.grant_invited_admin() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created_grant_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_invited_admin();

CREATE TRIGGER on_auth_user_confirmed_grant_admin
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (old.email_confirmed_at IS NULL AND new.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_invited_admin();

-- When an email is invited after the account already exists and is verified.
CREATE OR REPLACE FUNCTION public.grant_existing_invited_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  SELECT u.id, 'admin' FROM auth.users u
  WHERE lower(u.email) = NEW.email AND u.email_confirmed_at IS NOT NULL
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.grant_existing_invited_admin() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_admin_invite_added
AFTER INSERT ON public.admin_invites
FOR EACH ROW EXECUTE FUNCTION public.grant_existing_invited_admin();

-- Listings: admins manage them.
GRANT INSERT, UPDATE, DELETE ON public.websites TO authenticated;
CREATE POLICY "Admins add websites" ON public.websites
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins edit websites" ON public.websites
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins remove websites" ON public.websites
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admins can see which zip file each listing has (file_path is hidden from everyone else).
CREATE OR REPLACE FUNCTION public.admin_website_files()
RETURNS TABLE (website_id uuid, file_path text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id, w.file_path FROM public.websites w
  WHERE public.has_role(auth.uid(), 'admin')
$$;
REVOKE EXECUTE ON FUNCTION public.admin_website_files() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_website_files() TO authenticated;

-- Screenshots: viewable by anyone (via signed links), managed by admins.
CREATE POLICY "Anyone can view website screenshots" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'website-screenshots');
CREATE POLICY "Admins upload website screenshots" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'website-screenshots' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update website screenshots" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'website-screenshots' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'website-screenshots' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete website screenshots" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'website-screenshots' AND public.has_role(auth.uid(), 'admin'));

-- Website zip files: managed by admins.
CREATE POLICY "Admins read website files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'website-files' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins upload website files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'website-files' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update website files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'website-files' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'website-files' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete website files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'website-files' AND public.has_role(auth.uid(), 'admin'));