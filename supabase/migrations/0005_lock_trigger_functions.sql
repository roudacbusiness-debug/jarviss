-- Les fonctions de trigger ne doivent pas être appelables via l'API REST (rpc).
revoke execute on function public.enforce_single_user() from public, anon, authenticated;
revoke execute on function public.seed_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
