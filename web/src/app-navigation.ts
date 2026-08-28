import { useEffect, useSyncExternalStore } from "react";

const navigationEvent = "roost:navigation";

function locationSnapshot() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener(navigationEvent, listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener(navigationEvent, listener);
  };
}

function isClientRoute(url: URL) {
  return url.origin === window.location.origin && [
    "/",
    "/areas",
    "/dashboard",
    "/react-dashboard",
    "/operations",
    "/people-agents",
    "/workforce",
    "/account/settings",
    "/workspace/settings",
    "/auth/login",
    "/auth/register"
  ].includes(url.pathname);
}

export function navigateApp(href: string, options: { replace?: boolean } = {}) {
  const url = new URL(href, window.location.href);
  const nextLocation = `${url.pathname}${url.search}${url.hash}`;
  if (nextLocation === locationSnapshot()) return;
  window.history[options.replace ? "replaceState" : "pushState"](null, "", nextLocation);
  window.dispatchEvent(new Event(navigationEvent));
  window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "auto" }));
}

export function useAppLocation() {
  return useSyncExternalStore(subscribe, locationSnapshot, () => "/");
}

export function useClientNavigation() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") as HTMLAnchorElement | null : null;
      if (!target || target.download || (target.target && target.target !== "_self")) return;
      const rawHref = target.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#")) return;
      const url = new URL(target.href, window.location.href);
      if (!isClientRoute(url)) return;
      event.preventDefault();
      navigateApp(url.href);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);
}
