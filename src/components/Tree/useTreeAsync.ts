import { useCallback, useEffect, useRef, useState } from "react";
import type { TreeNode } from "./Tree.types";

export interface TreeAsyncState<T> {
  loadedChildren: ReadonlyMap<string, TreeNode<T>[]>;
  loadingIds: ReadonlySet<string>;
  errorById: ReadonlyMap<string, Error>;
  requestLoad: (node: TreeNode<T>) => Promise<boolean>;
}

export function useTreeAsync<T>(
  loader: ((node: TreeNode<T>) => Promise<TreeNode<T>[]>) | undefined,
): TreeAsyncState<T> {
  const [loadedChildren, setLoadedChildren] = useState<Map<string, TreeNode<T>[]>>(
    () => new Map(),
  );
  const [loadingIds, setLoadingIds] = useState<Set<string>>(() => new Set());
  const [errorById, setErrorById] = useState<Map<string, Error>>(() => new Map());

  const mountedRef = useRef(true);
  const inflightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const requestLoad = useCallback(
    async (node: TreeNode<T>): Promise<boolean> => {
      if (loader == null) return false;
      if (inflightRef.current.has(node.id)) return false;
      inflightRef.current.add(node.id);

      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.add(node.id);
        return next;
      });

      try {
        const kids = await loader(node);
        if (!mountedRef.current) return false;
        setLoadedChildren((prev) => {
          const next = new Map(prev);
          next.set(node.id, kids);
          return next;
        });
        setErrorById((prev) => {
          if (!prev.has(node.id)) return prev;
          const next = new Map(prev);
          next.delete(node.id);
          return next;
        });
        return true;
      } catch (err) {
        if (!mountedRef.current) return false;
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setErrorById((prev) => {
          const next = new Map(prev);
          next.set(node.id, errorObj);
          return next;
        });
        return false;
      } finally {
        inflightRef.current.delete(node.id);
        if (mountedRef.current) {
          setLoadingIds((prev) => {
            if (!prev.has(node.id)) return prev;
            const next = new Set(prev);
            next.delete(node.id);
            return next;
          });
        }
      }
    },
    [loader],
  );

  return { loadedChildren, loadingIds, errorById, requestLoad };
}
