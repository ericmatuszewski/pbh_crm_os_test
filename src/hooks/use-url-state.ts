import { useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

/**
 * Hook that syncs state with URL search parameters for persistence.
 * Filters persist across page refreshes and enable sharing filtered views via URL.
 */
export function useUrlState(key: string, defaultValue = "") {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const value = searchParams.get(key) || defaultValue;

  const setValue = useCallback(
    (newValue: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newValue && newValue !== defaultValue) {
        params.set(key, newValue);
      } else {
        params.delete(key);
      }

      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [key, defaultValue, searchParams, router, pathname]
  );

  return [value, setValue] as const;
}

/**
 * Hook for multiple URL state values with a single update function.
 * More efficient when updating multiple filters at once.
 */
export function useUrlFilters<T extends Record<string, string>>(defaults: T) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const values = Object.keys(defaults).reduce((acc, key) => {
    acc[key as keyof T] = (searchParams.get(key) || defaults[key as keyof T]) as T[keyof T];
    return acc;
  }, {} as T);

  const setValues = useCallback(
    (updates: Partial<T>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== defaults[key as keyof T]) {
          params.set(key, value as string);
        } else {
          params.delete(key);
        }
      });

      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [defaults, searchParams, router, pathname]
  );

  const clearAll = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  return { values, setValues, clearAll };
}
