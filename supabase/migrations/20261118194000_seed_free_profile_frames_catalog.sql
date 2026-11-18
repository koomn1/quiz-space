-- Keep the built-in free profile frames visible to administrators as catalog items.
-- They start hidden so the administrator controls which ones become store offers.
ALTER TABLE public.reward_store_items
  ADD COLUMN IF NOT EXISTS subscriber_free BOOLEAN NOT NULL DEFAULT false;

INSERT INTO public.reward_store_items (
  id, item_type, name, name_ar, description, description_ar,
  price_points, price_egp, reward_points, image_url, css_class,
  min_plan, is_active, sort_order, is_featured, subscriber_free, updated_at
) VALUES
  ('frame_aurora_neon', 'frame', 'Neon Aurora', 'الشفق النيوني', 'A free neon profile frame.', 'إطار مجاني بتوهج نيون.', 0, 0, 0, 'clean-assets-replacement/svg-avatars/frame-aurora-neon.svg', 'frame-aurora-neon', 'free', false, 10, false, false, now()),
  ('frame_royal_ember', 'frame', 'Royal Ember', 'الجمر الملكي', 'A free warm ember frame.', 'إطار مجاني بتوهج الجمر الملكي.', 0, 0, 0, 'clean-assets-replacement/svg-avatars/frame-royal-ember.svg', 'frame-royal-ember', 'free', false, 11, false, false, now()),
  ('frame_cosmic_pulse', 'frame', 'Cosmic Pulse', 'نبض الكون', 'A free cosmic pulse frame.', 'إطار مجاني بنبض كوني.', 0, 0, 0, 'clean-assets-replacement/svg-avatars/frame-cosmic-pulse.svg', 'frame-cosmic-pulse', 'free', false, 12, false, false, now()),
  ('frame_cyber_eagle', 'frame', 'Cyber Eagle', 'النسر السيبراني', 'A free cyber eagle frame.', 'إطار مجاني بالنسر السيبراني.', 0, 0, 0, 'clean-assets-replacement/frame-cyber-eagle-transparent.webp', 'frame-cyber-eagle', 'free', false, 13, false, false, now()),
  ('frame_ice_dragon', 'frame', 'Ice Dragon', 'تنين الجليد', 'A free ice dragon frame.', 'إطار مجاني بتنين جليدي.', 0, 0, 0, 'clean-assets-replacement/frame-ice-dragon-transparent.webp', 'frame-ice-dragon', 'free', false, 14, false, false, now()),
  ('frame_dual_dragon', 'frame', 'Dual Dragon', 'التنين المزدوج', 'A free dual dragon frame.', 'إطار مجاني بالتنين المزدوج.', 0, 0, 0, 'clean-assets-replacement/frame-dual-dragon-transparent.webp', 'frame-dual-dragon', 'free', false, 15, false, false, now()),
  ('frame_sea_crown', 'frame', 'Sea Crown', 'تاج البحر', 'A free sea crown frame.', 'إطار مجاني بتاج البحر.', 0, 0, 0, 'clean-assets-replacement/frame-sea-crown-transparent.webp', 'frame-sea-crown', 'free', false, 16, false, false, now()),
  ('frame_cyber_ice_ring', 'frame', 'Cyber Ice Ring', 'حلقة الجليد السيبرانية', 'A free cyber ice ring frame.', 'إطار مجاني بحلقة جليد سيبرانية.', 0, 0, 0, 'clean-assets-replacement/frame-cyber-ice-ring-transparent.webp', 'frame-cyber-ice-ring', 'free', false, 17, false, false, now()),
  ('frame_inferno_spike', 'frame', 'Inferno Spike', 'شوكة الجحيم', 'A free inferno spike frame.', 'إطار مجاني بشوكة الجحيم.', 0, 0, 0, 'clean-assets-replacement/frame-inferno-spike-transparent.webp', 'frame-inferno-spike', 'free', false, 18, false, false, now()),
  ('frame_royal_emerald', 'frame', 'Royal Emerald', 'الزمرد الملكي', 'A free royal emerald frame.', 'إطار مجاني بالزمرد الملكي.', 0, 0, 0, 'clean-assets-replacement/frame-royal-emerald-transparent.webp', 'frame-royal-emerald', 'free', false, 19, false, false, now()),
  ('frame_wolf_guardian', 'frame', 'Wolf Guardian', 'حارس الذئب', 'A free wolf guardian frame.', 'إطار مجاني بحارس الذئب.', 0, 0, 0, 'clean-assets-replacement/frame-wolf-guardian-transparent.webp', 'frame-wolf-guardian', 'free', false, 20, false, false, now()),
  ('frame_rose_thorn', 'frame', 'Rose Thorn', 'شوكة الورد', 'A free rose thorn frame.', 'إطار مجاني بشوكة الورد.', 0, 0, 0, 'clean-assets-replacement/frame-rose-thorn-transparent.webp', 'frame-rose-thorn', 'free', false, 21, false, false, now())
ON CONFLICT (id) DO UPDATE SET
  item_type = EXCLUDED.item_type,
  name = EXCLUDED.name,
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  description_ar = EXCLUDED.description_ar,
  price_points = EXCLUDED.price_points,
  price_egp = EXCLUDED.price_egp,
  image_url = EXCLUDED.image_url,
  css_class = EXCLUDED.css_class,
  min_plan = EXCLUDED.min_plan,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- The first two built-in frames already exist; keep their current visibility but
-- normalize their catalog metadata and make them editable in the admin panel.
UPDATE public.reward_store_items
SET image_url = 'clean-assets-replacement/nature-leaf-transparent.webp', price_points = 0, min_plan = 'free', sort_order = 1, updated_at = now()
WHERE id = 'frame_free_1';
UPDATE public.reward_store_items
SET image_url = 'clean-assets-replacement/aurora-glass-transparent.webp', price_points = 0, min_plan = 'free', sort_order = 2, updated_at = now()
WHERE id = 'frame_free_2';
