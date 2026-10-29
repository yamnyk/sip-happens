import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../data/queries';
import { findDuplicateSubtype } from '../../lib/subtype';
import { supabase } from '../../lib/supabase';
import type { DrinkSubtype } from '../../types/domain';

/** Picker value: either an existing subtype, or a not-yet-saved new name. Never both. */
export interface SubtypeValue {
  subtypeId: string | null;
  newName: string | null;
}

export const EMPTY_SUBTYPE: SubtypeValue = { subtypeId: null, newName: null };

export const hasSubtype = (v: SubtypeValue): boolean => Boolean(v.subtypeId) || Boolean(v.newName);

type EnsureSubtypeResult = { id: string } | { duplicateOf: DrinkSubtype };

/**
 * Resolves a picker value to a subtype id. Existing id passes through; a pending new name is inserted.
 * If someone else created the same name first (unique violation 23505), returns the existing one instead.
 * Any other failure throws.
 */
export function useEnsureSubtype() {
  const queryClient = useQueryClient();
  return useCallback(
    async (value: SubtypeValue): Promise<EnsureSubtypeResult> => {
      if (value.subtypeId) return { id: value.subtypeId };
      const name = value.newName;
      if (!name) throw new Error('subtype_required');
      const { data, error } = await supabase.from('drink_subtypes').insert({ name }).select('id').single();
      if (error) {
        if ((error as { code?: string }).code === '23505') {
          await queryClient.refetchQueries({ queryKey: queryKeys.subtypes });
          const list = queryClient.getQueryData<DrinkSubtype[]>(queryKeys.subtypes) ?? [];
          const duplicateOf = findDuplicateSubtype(name, list);
          if (duplicateOf) return { duplicateOf };
        }
        throw error;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.subtypes });
      return { id: (data as { id: string }).id };
    },
    [queryClient],
  );
}
