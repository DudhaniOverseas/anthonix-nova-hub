-- =========================================================
-- WordPress-style CMS extension: pages, categories, menus
-- =========================================================

-- ---------- PAGES ----------
CREATE TABLE IF NOT EXISTS public.pages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  title       text NOT NULL,
  content     text,
  status      public.post_status NOT NULL DEFAULT 'draft',
  seo_title   text,
  seo_description text,
  author_id   uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pages public read published"
  ON public.pages FOR SELECT
  USING (status = 'published' OR public.is_admin_or_editor(auth.uid()));

CREATE POLICY "pages editor insert"
  ON public.pages FOR INSERT
  WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "pages editor update"
  ON public.pages FOR UPDATE
  USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "pages admin delete"
  ON public.pages FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER pages_touch_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- CATEGORIES (nested, shared) ----------
CREATE TABLE IF NOT EXISTS public.categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  description text,
  parent_id   uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories public read"
  ON public.categories FOR SELECT USING (true);

CREATE POLICY "categories editor insert"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "categories editor update"
  ON public.categories FOR UPDATE
  USING (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "categories admin delete"
  ON public.categories FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER categories_touch_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- POST <-> CATEGORY ----------
CREATE TABLE IF NOT EXISTS public.post_categories (
  post_id     uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, category_id)
);

ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "post_categories public read"
  ON public.post_categories FOR SELECT USING (true);

CREATE POLICY "post_categories editor write"
  ON public.post_categories FOR INSERT
  WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "post_categories editor delete"
  ON public.post_categories FOR DELETE
  USING (public.is_admin_or_editor(auth.uid()));

-- ---------- COURSE <-> CATEGORY ----------
CREATE TABLE IF NOT EXISTS public.course_categories (
  course_id   uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (course_id, category_id)
);

ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_categories public read"
  ON public.course_categories FOR SELECT USING (true);

CREATE POLICY "course_categories editor write"
  ON public.course_categories FOR INSERT
  WITH CHECK (public.is_admin_or_editor(auth.uid()));

CREATE POLICY "course_categories editor delete"
  ON public.course_categories FOR DELETE
  USING (public.is_admin_or_editor(auth.uid()));

-- ---------- MENUS ----------
DO $$ BEGIN
  CREATE TYPE public.menu_location AS ENUM ('header','footer','none');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.menu_item_kind AS ENUM ('page','post','category','custom','course');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.menus (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  location   public.menu_location NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menus public read"
  ON public.menus FOR SELECT USING (true);

CREATE POLICY "menus admin insert"
  ON public.menus FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "menus admin update"
  ON public.menus FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "menus admin delete"
  ON public.menus FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER menus_touch_updated_at
  BEFORE UPDATE ON public.menus
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- MENU ITEMS ----------
CREATE TABLE IF NOT EXISTS public.menu_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id     uuid NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  kind        public.menu_item_kind NOT NULL,
  label       text NOT NULL,
  url         text,                       -- for custom links / computed
  ref_id      uuid,                       -- references pages/posts/categories/courses by id
  position    int NOT NULL DEFAULT 0,
  open_in_new boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "menu_items public read"
  ON public.menu_items FOR SELECT USING (true);

CREATE POLICY "menu_items admin insert"
  ON public.menu_items FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "menu_items admin update"
  ON public.menu_items FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "menu_items admin delete"
  ON public.menu_items FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER menu_items_touch_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_menu_items_menu ON public.menu_items(menu_id, position);

-- ---------- STUDENT SELF-ACCESS POLICIES ----------
-- Allow students to see their own student row + enrollments + progress
CREATE POLICY "students self read"
  ON public.students FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "enrollments self read"
  ON public.enrollments FOR SELECT
  USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY "progress self read"
  ON public.lesson_progress FOR SELECT
  USING (
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY "lessons enrolled read"
  ON public.lessons FOR SELECT
  USING (
    course_id IN (
      SELECT e.course_id FROM public.enrollments e
      JOIN public.students s ON s.id = e.student_id
      WHERE s.user_id = auth.uid()
    )
  );
