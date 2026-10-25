import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Drink, DrinkSubtype, Profile, Review } from '../types/domain';

export const queryKeys = {
  drinks: ['drinks'],
  subtypes: ['drink_subtypes'],
  reviews: ['reviews'],
  profiles: ['profiles'],
} as const;

/** Data is tiny (tens of users, hundreds of reviews): fetch everything once, aggregate on the client. */
export function useDrinks() {
  return useQuery({
    queryKey: queryKeys.drinks,
    queryFn: async () => {
      const { data, error } = await supabase.from('drinks').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Drink[];
    },
  });
}

export function useSubtypes() {
  return useQuery({
    queryKey: queryKeys.subtypes,
    queryFn: async () => {
      const { data, error } = await supabase.from('drink_subtypes').select('*').order('name', { ascending: true });
      if (error) throw error;
      return data as DrinkSubtype[];
    },
  });
}

export function useReviews() {
  return useQuery({
    queryKey: queryKeys.reviews,
    queryFn: async () => {
      const { data, error } = await supabase.from('reviews').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      return data as Review[];
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: queryKeys.profiles,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data as Profile[];
    },
  });
}
