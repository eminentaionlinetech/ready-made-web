CREATE TABLE public.websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  tagline text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  demo_url text NOT NULL,
  image_url text NOT NULL,
  features text[] NOT NULL DEFAULT '{}',
  page_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.websites TO anon, authenticated;
GRANT ALL ON public.websites TO service_role;
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can browse websites" ON public.websites FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  website_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE RESTRICT,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, website_id)
);
CREATE INDEX purchases_user_id_idx ON public.purchases(user_id);
CREATE INDEX purchases_website_id_idx ON public.purchases(website_id);

GRANT SELECT ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers see their own purchases" ON public.purchases FOR SELECT TO authenticated USING (auth.uid() = user_id);

INSERT INTO public.websites (slug, title, tagline, description, category, price_cents, demo_url, image_url, features, page_count) VALUES
('northwind', 'Northwind', 'A launch-ready landing page for SaaS products', 'Northwind is a conversion-focused landing page for software products. It ships with a bold hero, feature grid, pricing table with monthly/yearly toggle, customer logos, testimonials and an FAQ — everything you need to go from idea to sign-ups in an afternoon.', 'SaaS', 12900, 'https://example.com', '/screens/northwind.jpg', ARRAY['Pricing table with billing toggle','Feature grid and comparison','Testimonials and logo wall','Fully responsive','SEO-ready page titles'], 5),
('atelier', 'Atelier', 'A quiet, gallery-style portfolio for designers', 'Atelier puts your work front and centre. Large case-study layouts, an about page with a timeline, and a contact form — all in a calm, editorial style that lets images breathe.', 'Portfolio', 7900, 'https://example.com', '/screens/atelier.jpg', ARRAY['Case study templates','Image gallery with lightbox','About page with timeline','Contact form','Dark mode'], 4),
('harvest-table', 'Harvest Table', 'A warm, appetising site for restaurants and cafés', 'Harvest Table gives restaurants a beautiful online home: seasonal menus, opening hours, a reservations section, private dining and a photo gallery. Easy to update when the menu changes.', 'Restaurant', 9900, 'https://example.com', '/screens/harvest-table.jpg', ARRAY['Menu pages with categories','Reservations section','Opening hours and map','Photo gallery','Events page'], 6),
('forma-studio', 'Forma Studio', 'A confident site for creative and digital agencies', 'Forma Studio is built for agencies that want to look as sharp as their work. Showcase projects, list services, introduce the team and capture leads with a clean enquiry form.', 'Agency', 14900, 'https://example.com', '/screens/forma-studio.jpg', ARRAY['Project showcase grid','Services pages','Team profiles','Lead enquiry form','Smooth scroll animations'], 7),
('kiln-and-co', 'Kiln & Co.', 'A crafted storefront for small product brands', 'Kiln & Co. is a storefront template for makers and small brands. Product listings, collection pages, a product detail layout with image gallery and a brand story page — ready to connect to your shop.', 'E-commerce', 18900, 'https://example.com', '/screens/kiln-and-co.jpg', ARRAY['Product and collection pages','Product image gallery','Brand story page','Newsletter signup','Cart drawer layout'], 8),
('field-notes', 'Field Notes', 'A clean, readable blog and magazine theme', 'Field Notes is made for writers. Beautiful typography, featured stories, category pages, author bios and a newsletter signup make it a pleasure to read and to publish.', 'Blog', 5900, 'https://example.com', '/screens/field-notes.jpg', ARRAY['Featured story layout','Category and tag pages','Author bios','Newsletter signup','Reading-time estimates'], 5);