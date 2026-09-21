import { useEffect, useLayoutEffect, useState } from "react";

const SIDEBAR_KEY = "sidebar_open";
export const MOBILE_SIDEBAR_QUERY = "(max-width: 760px)";

export const resolveSidebarHidden = (isMobile: boolean, storedPreference: string | null): boolean => isMobile || storedPreference === "0";

function isMobileViewport(): boolean {
  return window.matchMedia(MOBILE_SIDEBAR_QUERY).matches;
}

function syncSidebarVisibility(): void {
  document.body.classList.toggle("sidebar-hidden", resolveSidebarHidden(isMobileViewport(), localStorage.getItem(SIDEBAR_KEY)));
}
export function restoreSidebarVisibility(): void {
  document.body.classList.remove("cinema");
  syncSidebarVisibility();
}
export function toggleSidebar() {
  const hidden = document.body.classList.toggle("sidebar-hidden");
  if (!isMobileViewport()) localStorage.setItem(SIDEBAR_KEY, hidden ? "0" : "1");
}
export function setMobileSidebarOpen(open: boolean) {
  if (!isMobileViewport()) return;
  document.body.classList.toggle("sidebar-hidden", !open);
}
export function useMobileChrome(): boolean {
  const [mobile, setMobile] = useState(() => isMobileViewport());
  useEffect(() => {
    const media = window.matchMedia(MOBILE_SIDEBAR_QUERY);
    const onChange = () => setMobile(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);
  return mobile;
}
export function useSidebarVisibility(pathname: string) {
  useLayoutEffect(() => {
    const media = window.matchMedia(MOBILE_SIDEBAR_QUERY);
    syncSidebarVisibility();
    media.addEventListener("change", syncSidebarVisibility);
    return () => media.removeEventListener("change", syncSidebarVisibility);
  }, []);
  useEffect(() => {
    if (isMobileViewport()) document.body.classList.add("sidebar-hidden");
  }, [pathname]);
}
