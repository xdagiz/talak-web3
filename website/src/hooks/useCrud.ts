import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";

interface CrudConfig<T, C, U> {
  queryKey: QueryKey;
  fetcher: () => Promise<T[]>;
  createFn: (input: C) => Promise<T>;
  updateFn?: (id: string, input: U) => Promise<T>;
  removeFn?: (id: string) => Promise<void>;
  getId: (record: T) => string;
  queryOptions?: Omit<UseQueryOptions<T[], unknown, T[], QueryKey>, "queryKey" | "queryFn">;
}

/**
 * Generic list CRUD backed by TanStack Query with optimistic cache updates.
 * Fetches a list and provides create/update/remove mutations that optimistically
 * patch the cache and roll back on error.
 */
export function useCrud<T, C, U = Partial<T>>(config: CrudConfig<T, C, U>) {
  const queryClient = useQueryClient();
  const queryKey = config.queryKey;
  const getId = config.getId;

  const query = useQuery({
    queryKey,
    queryFn: config.fetcher,
    ...config.queryOptions,
  });

  const create = useMutation<T, Error, C>({
    mutationFn: (input) => config.createFn(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const update =
    config.updateFn == null
      ? null
      : useMutation<T, Error, { id: string; input: U }>({
          mutationFn: async ({ id, input }) => {
            const record = await config.updateFn!(id, input);
            const previous = queryClient.getQueryData<T[]>(queryKey) ?? [];
            queryClient.setQueryData<T[]>(queryKey, previous.map((r) => (getId(r) === id ? record : r)));
            return record;
          },
          onError: () => {
            void queryClient.invalidateQueries({ queryKey });
          },
        });

  interface RemoveContext { previous: T[] }

  const remove =
    config.removeFn == null
      ? null
      : useMutation<void, Error, string, RemoveContext>({
          mutationFn: async (id) => {
            await config.removeFn!(id);
          },
          onMutate: async (id) => {
            const previous = queryClient.getQueryData<T[]>(queryKey) ?? [];
            queryClient.setQueryData<T[]>(queryKey, previous.filter((r) => getId(r) !== id));
            return { previous };
          },
          onError: (_err, _id, ctx) => {
            if (ctx?.previous) queryClient.setQueryData<T[]>(queryKey, ctx.previous);
            void queryClient.invalidateQueries({ queryKey });
          },
          onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey });
          },
        });

  return {
    query,
    create: create.mutateAsync,
    update: update ? update.mutateAsync : undefined,
    remove: remove ? remove.mutateAsync : undefined,
    createError: create.error,
    updateError: update ? update.error : undefined,
    removeError: remove ? remove.error : undefined,
  };
}
