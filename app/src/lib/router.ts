import { useEffect, useState } from "react";

/** Маленький hash-роутер: #/, #/new, #/demo, #/w/<адрес>. */
export function useRoute() {
  const [hash, setHash] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const on = () => {
      setHash(window.location.hash || "#/");
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  return { page: parts[0] ?? "", param: parts[1] ?? "" };
}

export function go(path: string) {
  window.location.hash = path.startsWith("#") ? path : `#${path}`;
}
