-- Add missing foreign key constraint from predictions.user_id to profiles.id
-- This is needed for Supabase to understand the relationship and allow joins

ALTER TABLE public.predictions
ADD CONSTRAINT predictions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
