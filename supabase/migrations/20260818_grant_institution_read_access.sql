GRANT SELECT ON TABLE public.institutions TO authenticated;
GRANT SELECT ON TABLE public.institution_members TO authenticated;
NOTIFY pgrst, 'reload schema';
