import { useState, useEffect } from "react";

/**
 * useMediaQuery
 * 指定したメディアクエリにマッチしているかを返す汎用フック
 * @example const isDesktop = useMediaQuery('(min-width: 1024px)');
 */
export default function useMediaQuery(query: string): boolean {
  const getMatch = () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState<boolean>(getMatch);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    setMatches(mql.matches);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
