
-- ===== ENUM TYPES =====
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'user');
CREATE TYPE public.post_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.lesson_kind AS ENUM ('upload', 'embed');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===== USER ROLES =====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ===== HAS_ROLE FUNCTION =====
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_editor(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','editor'))
$$;

-- ===== AUTO-CREATE PROFILE + FIRST USER -> ADMIN =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)));

  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== TIMESTAMP TRIGGER =====
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== POSTS =====
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT,
  cover_image_url TEXT,
  status post_status NOT NULL DEFAULT 'draft',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER posts_touch BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== MEDIA =====
CREATE TABLE public.media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  bucket TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- ===== SETTINGS =====
CREATE TABLE public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  site_name TEXT NOT NULL DEFAULT 'AnthoniX Media',
  site_logo_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT one_row CHECK (id = 1)
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.site_settings (id, site_name) VALUES (1, 'AnthoniX Media');
CREATE TRIGGER settings_touch BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== STUDENTS =====
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER students_touch BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== COURSES =====
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  price NUMERIC(10,2) DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER courses_touch BEFORE UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== LESSONS =====
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL DEFAULT 0,
  kind lesson_kind NOT NULL DEFAULT 'embed',
  video_url TEXT,
  video_path TEXT,
  duration_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER lessons_touch BEFORE UPDATE ON public.lessons
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== ENROLLMENTS =====
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id)
);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- ===== LESSON PROGRESS =====
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  watched_seconds INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, lesson_id)
);
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER lesson_progress_touch BEFORE UPDATE ON public.lesson_progress
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ===== PAYMENTS =====
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  status payment_status NOT NULL DEFAULT 'pending',
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES =====

-- profiles: own row read/update; admins manage all
CREATE POLICY "profiles self select" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles admin insert" ON public.profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles admin delete" ON public.profiles FOR DELETE USING (public.has_role(auth.uid(),'admin'));

-- user_roles: only admins manage; users can read their own
CREATE POLICY "roles self read" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles admin write" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles admin update" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles admin delete" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(),'admin'));

-- posts: published readable by anyone; editors/admins manage
CREATE POLICY "posts public read published" ON public.posts FOR SELECT USING (status = 'published' OR public.is_admin_or_editor(auth.uid()));
CREATE POLICY "posts editor insert" ON public.posts FOR INSERT WITH CHECK (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "posts editor update" ON public.posts FOR UPDATE USING (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "posts admin delete" ON public.posts FOR DELETE USING (public.has_role(auth.uid(),'admin'));

-- media: editors/admins manage; readable by authenticated
CREATE POLICY "media auth read" ON public.media FOR SELECT TO authenticated USING (true);
CREATE POLICY "media editor write" ON public.media FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "media admin delete" ON public.media FOR DELETE USING (public.has_role(auth.uid(),'admin'));

-- settings: anyone read; admin update
CREATE POLICY "settings public read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "settings admin update" ON public.site_settings FOR UPDATE USING (public.has_role(auth.uid(),'admin'));

-- students/courses/lessons/enrollments/progress/payments: admin/editor manage
CREATE POLICY "students staff read" ON public.students FOR SELECT USING (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "students staff write" ON public.students FOR INSERT WITH CHECK (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "students staff update" ON public.students FOR UPDATE USING (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "students admin delete" ON public.students FOR DELETE USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "courses public read published" ON public.courses FOR SELECT USING (is_published = true OR public.is_admin_or_editor(auth.uid()));
CREATE POLICY "courses staff write" ON public.courses FOR INSERT WITH CHECK (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "courses staff update" ON public.courses FOR UPDATE USING (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "courses admin delete" ON public.courses FOR DELETE USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "lessons staff read" ON public.lessons FOR SELECT USING (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "lessons staff write" ON public.lessons FOR INSERT WITH CHECK (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "lessons staff update" ON public.lessons FOR UPDATE USING (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "lessons admin delete" ON public.lessons FOR DELETE USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "enrollments staff read" ON public.enrollments FOR SELECT USING (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "enrollments staff write" ON public.enrollments FOR INSERT WITH CHECK (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "enrollments admin delete" ON public.enrollments FOR DELETE USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "progress staff read" ON public.lesson_progress FOR SELECT USING (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "progress staff write" ON public.lesson_progress FOR INSERT WITH CHECK (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "progress staff update" ON public.lesson_progress FOR UPDATE USING (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "progress admin delete" ON public.lesson_progress FOR DELETE USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "payments staff read" ON public.payments FOR SELECT USING (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "payments staff write" ON public.payments FOR INSERT WITH CHECK (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "payments staff update" ON public.payments FOR UPDATE USING (public.is_admin_or_editor(auth.uid()));
CREATE POLICY "payments admin delete" ON public.payments FOR DELETE USING (public.has_role(auth.uid(),'admin'));

-- ===== STORAGE BUCKETS =====
INSERT INTO storage.buckets (id, name, public) VALUES
  ('media', 'media', true),
  ('videos', 'videos', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read media" ON storage.objects FOR SELECT USING (bucket_id IN ('media','videos','avatars'));
CREATE POLICY "Staff upload media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('media','videos','avatars') AND public.is_admin_or_editor(auth.uid()));
CREATE POLICY "Staff update media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('media','videos','avatars') AND public.is_admin_or_editor(auth.uid()));
CREATE POLICY "Admin delete media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('media','videos','avatars') AND public.has_role(auth.uid(),'admin'));
