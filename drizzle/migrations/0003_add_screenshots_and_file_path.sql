ALTER TABLE public.websites ADD COLUMN screenshots text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.websites ADD COLUMN file_path text;

UPDATE public.websites SET screenshots = ARRAY[image_url] WHERE cardinality(screenshots) = 0;

-- Public visitors can read every column except file_path.
REVOKE SELECT ON public.websites FROM anon, authenticated;
GRANT SELECT (id, slug, title, tagline, description, category, price_cents, demo_url, image_url, screenshots, features, page_count, created_at)
  ON public.websites TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.owns_website_file(_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.purchases p
    JOIN public.websites w ON w.id = p.website_id
    WHERE p.user_id = auth.uid()
      AND p.status = 'paid'
      AND w.file_path = _path
  )
$$;

REVOKE EXECUTE ON FUNCTION public.owns_website_file(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_website_file(text) TO authenticated;

CREATE POLICY "Buyers download files they own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'website-files' AND public.owns_website_file(name));