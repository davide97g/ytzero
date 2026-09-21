import { NavLink } from "react-router-dom";
import { AlertTriangle, Check, Download, Ellipsis } from "lucide-react";
import type { DownloadSummary } from "../api";
import type { NavItem } from "../nav";
import { useI18n } from "../i18n";
import { Badge } from "../components/ui";
import "./MobileTabBar.css";

type MobileTabBarProps = {
  tabs: NavItem[];
  moreActive: boolean;
  moreOpen: boolean;
  onMore: () => void;
  liveCount: number;
  downloadSummary: DownloadSummary;
  newCompletedDownloads: number;
};

export default function MobileTabBar({
  tabs,
  moreActive,
  moreOpen,
  onMore,
  liveCount,
  downloadSummary,
  newCompletedDownloads,
}: MobileTabBarProps) {
  const { t } = useI18n();
  const activeDownloads = downloadSummary.queued + downloadSummary.downloading;
  const downloadIndicator = downloadSummary.errors > 0
    ? { kind: "error" as const, count: downloadSummary.errors, icon: <AlertTriangle aria-hidden="true" /> }
    : activeDownloads > 0
      ? { kind: "active" as const, count: activeDownloads, icon: <Download aria-hidden="true" /> }
      : newCompletedDownloads > 0
        ? { kind: "new" as const, count: newCompletedDownloads, icon: <Check aria-hidden="true" /> }
        : null;

  return (
    <nav className="mobile-tabbar" aria-label={t("Menu")}>
      {tabs.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `mobile-tabbar__item${isActive ? " is-active" : ""}`}
          >
            <span className="mobile-tabbar__icon">
              <Icon />
              {item.to === "/live" && liveCount > 0 && <Badge variant="danger" size="sm" className="mobile-tabbar__badge">{liveCount > 99 ? "99+" : liveCount}</Badge>}
              {item.to === "/downloads" && downloadSummary.enabled && downloadIndicator && (
                <Badge
                  variant={downloadIndicator.kind === "error" ? "danger" : "accent"}
                  size="sm"
                  className={`mobile-tabbar__badge mobile-tabbar__badge--${downloadIndicator.kind}`}
                >
                  {downloadIndicator.count > 99 ? "99+" : downloadIndicator.count}
                </Badge>
              )}
            </span>
            <span className="mobile-tabbar__label">{t(item.labelKey)}</span>
          </NavLink>
        );
      })}
      <button
        type="button"
        className={`mobile-tabbar__item${moreActive || moreOpen ? " is-active" : ""}`}
        aria-label={t("navMore")}
        aria-expanded={moreOpen}
        onClick={onMore}
      >
        <span className="mobile-tabbar__icon"><Ellipsis /></span>
        <span className="mobile-tabbar__label">{t("navMore")}</span>
      </button>
    </nav>
  );
}
