/**
 * Coordonnées du projet Supabase.
 * La clé « publishable » est publique par conception (elle est envoyée au navigateur) ;
 * les variables d'environnement, si elles sont définies, ont la priorité.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://zfulqlkchlzdmlvimove.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_Wi4F5XYsqbC9O-vHrHloqg_0nVCmiMC";
