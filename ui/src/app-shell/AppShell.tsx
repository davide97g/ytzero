import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { type Video } from "../api";
import AppRoutes from "../AppRoutes";
import ChildLockScreen from "../components/ChildLockScreen";
import ChildNowWatching from "../components/ChildNowWatching";
import SunBackdrop from "../components/SunBackdrop";
import { Toast } from "../components/ui";
import { DeArrowProvider } from "../dearrow";
import { ENHANCE_CONFIGURATION_ELEMENT_ID, serializeEnhanceConfiguration } from "../enhanceBridge";
import { isMobileMoreActive, splitMobileNavItems, splitNavItems } from "../nav";
import type { PlaybackQueueContext } from "../playbackQueue";
import { AppNameContext } from "../useDocumentTitle";
import AppBootstrap from "./AppBootstrap";
import AppSidebar from "./AppSidebar";
import AppTopBar from "./AppTopBar";
import ChromeTools from "./ChromeTools";
import MobileTabBar from "./MobileTabBar";
import { useAppPreferences } from "./useAppPreferences";
import { useAppToast } from "./useAppToast";
import { useNavigationActivity } from "./useNavigationActivity";
import { usePluginRoutes } from "./usePluginRoutes";
import { useProfileSession } from "./useProfileSession";
import { setMobileSidebarOpen, useMobileChrome, useSidebarVisibility } from "./sidebarVisibility";
import { useI18n } from "../i18n";
import { createWatchRoutePreview } from "../pages/watchRuntime";
import "../AppShell.css";

export default function AppShell({ isAdmin }: { isAdmin: boolean }) {
  const { ready: i18nReady } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const preferences = useAppPreferences();
  const plugins = usePluginRoutes();
  const profile = useProfileSession();
  const activity = useNavigationActivity();
  const { showToast, toast } = useAppToast();
  const mobile = useMobileChrome();
  const [moreOpen, setMoreOpen] = useState(false);

  useSidebarVisibility(location.pathname);
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname, mobile]);

  const closeMore = useCallback(() => {
    setMoreOpen(false);
    setMobileSidebarOpen(false);
  }, []);
  const toggleMore = useCallback(() => {
    setMoreOpen((open) => {
      const next = !open;
      setMobileSidebarOpen(next);
      return next;
    });
  }, []);

  const play = useCallback((video: Video, playbackQueue?: PlaybackQueueContext) => navigate(
    `/watch/${video.video_id}`,
    { state: { playbackQueue, watchPreview: createWatchRoutePreview(video) } },
  ), [navigate]);

  if (!i18nReady || !preferences.ready || !plugins.ready || !profile.ready) {
    return <AppBootstrap />;
  }

  const { visible: allNavItems, hidden: allHiddenNavItems } = splitNavItems(preferences.navConfig);
  const shortsEnabled = preferences.appSettings?.show_shorts !== "disabled";
  const pluginRouteVisible = (path: string) => !plugins.knownPluginRoutes.has(path) || plugins.enabledPluginRoutes?.has(path);
  const childRouteVisible = (path: string) =>
    !(profile.childStatus?.hide_shorts && path === "/shorts")
    && !(profile.childStatus?.hide_live && path === "/live")
    && !(profile.childStatus?.is_child && (path === "/downloads" || path === "/insights"));
  const shortsRouteVisible = (path: string) => shortsEnabled || path !== "/shorts";
  const navItems = allNavItems.filter((item) => pluginRouteVisible(item.to) && childRouteVisible(item.to) && shortsRouteVisible(item.to));
  const hiddenNavItems = allHiddenNavItems.filter((item) => pluginRouteVisible(item.to) && childRouteVisible(item.to) && shortsRouteVisible(item.to));
  const { tabs: mobileTabs, overflow: mobileOverflow } = splitMobileNavItems(navItems);
  const chromeTools = (
    <ChromeTools
      isAdmin={isAdmin}
      isChildProfile={profile.childStatus?.is_child === true}
      profilePermissions={preferences.profilePermissions}
      feedSort={preferences.feedSort}
      onFeedSortChange={preferences.changeFeedSort}
      incognito={profile.incognito}
      onIncognitoChange={profile.changeIncognito}
    />
  );

  return (
    <AppNameContext.Provider value={preferences.appName}>
      <DeArrowProvider
        titlesEnabled={preferences.appSettings?.dearrow_titles_enabled === "1"}
        thumbnailsEnabled={preferences.appSettings?.dearrow_thumbnails_enabled === "1"}
      >
        {preferences.appSettings && (
          <script id={ENHANCE_CONFIGURATION_ELEMENT_ID} type="application/json">
            {serializeEnhanceConfiguration(preferences.appSettings)}
          </script>
        )}
        <div className="layout">
          <SunBackdrop />
          <AppTopBar
            appName={preferences.appName}
            appIconColor={preferences.appIconColor}
            isAdmin={isAdmin}
            isChildProfile={profile.childStatus?.is_child === true}
            profilePermissions={preferences.profilePermissions}
            incognito={profile.incognito}
            showSidebarToggle={!mobile}
            tools={mobile ? null : chromeTools}
          />
          <div className="layout-body">
            <AppSidebar
              downloadSummary={activity.downloadSummary}
              hiddenNavItems={mobile ? [] : hiddenNavItems}
              liveCount={activity.liveCount}
              navItems={mobile ? [...mobileOverflow, ...hiddenNavItems] : navItems}
              newCompletedDownloads={activity.newCompletedDownloads}
              tools={mobile ? chromeTools : undefined}
              onClose={closeMore}
            />
            <main className="main">
              <div className="content">
                <AppRoutes childStatus={profile.childStatus}
                  enabledPluginRoutes={plugins.enabledPluginRoutes}
                  feedRefreshScope={preferences.feedRefreshScope}
                  feedSort={preferences.feedSort}
                  isAdmin={isAdmin}
                  onPlay={play}
                  profilePermissions={preferences.profilePermissions}
                  shortsEnabled={shortsEnabled}
                  showTopChannels={preferences.appSettings?.show_top_channels !== "0"}
                  showToast={showToast}
                />
              </div>
            </main>
          </div>
          {mobile && (
            <MobileTabBar
              tabs={mobileTabs}
              moreActive={isMobileMoreActive(mobileTabs, mobileOverflow, hiddenNavItems, location.pathname)}
              moreOpen={moreOpen}
              onMore={toggleMore}
              liveCount={activity.liveCount}
              downloadSummary={activity.downloadSummary}
              newCompletedDownloads={activity.newCompletedDownloads}
            />
          )}
          {toast && <Toast message={toast.message} variant={toast.variant} />}
          {preferences.appSettings && preferences.appSettings.child_watching_monitor_enabled !== "0" && <ChildNowWatching />}
          {profile.childStatus?.locked && <ChildLockScreen status={profile.childStatus} />}
        </div>
      </DeArrowProvider>
    </AppNameContext.Provider>
  );
}
