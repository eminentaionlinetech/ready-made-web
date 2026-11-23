ALTER TABLE public.purchases ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.purchases ADD COLUMN currency text NOT NULL DEFAULT 'NGN';
ALTER TABLE public.purchases ADD COLUMN paystack_reference text UNIQUE;
ALTER TABLE public.purchases ADD COLUMN paystack_access_code text;
ALTER TABLE public.purchases ADD COLUMN paystack_authorization_url text;
ALTER TABLE public.purchases ADD COLUMN paystack_transaction_id bigint;
ALTER TABLE public.purchases ADD COLUMN paid_at timestamptz;
ALTER TABLE public.purchases ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.purchases SET paid_at = created_at WHERE status = 'paid' AND paid_at IS NULL;