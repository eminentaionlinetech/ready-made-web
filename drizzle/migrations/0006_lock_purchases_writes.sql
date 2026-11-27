REVOKE ALL ON public.purchases FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.purchases FROM authenticated;
GRANT SELECT ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;