import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, Eraser, EyeOff, SlidersHorizontal } from "lucide-react";
import type { ProfilePermissions } from "../api";
import { api } from "../api";
import { useI18n } from "../i18n";
import { parseVideoCardSize, persistVideoCardSize } from "../videoCardSize";
import NotificationCenter from "../components/NotificationCenter";
import { FloatingPopover, IconButton, Menu, MenuItem, MenuSeparator, SegmentedControl, SettingRow, SteppedSlider, Switch } from "../components/ui";
import SessionPlayQueueMenu from "./SessionPlayQueueMenu";
import "../components/ProfileMenu.css";
import "./ChromeTools.css";

type ChromeToolsProps = {
  isChildProfile: boolean;
  profilePermissions: ProfilePermissions;
  feedSort: "published" | "arrival";
  onFeedSortChange: (next: "published" | "arrival") => void;
  incognito: boolean;
  onIncognitoChange: (next: boolean) => void;
  isAdmin: boolean;
};

export default function ChromeTools({
  isChildProfile,
  profilePermissions,
  feedSort,
  onFeedSortChange,
  incognito,
  onIncognitoChange,
  isAdmin,
}: ChromeToolsProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [cardSizeOpen, setCardSizeOpen] = useState(false);
  const [cardSize, setCardSize] = useState(248);
  const canManageAppearance = isAdmin || !profilePermissions.admin_only_areas.includes("appearance");

  const load = useCallback(() => {
    api.settings().then((r) => setCardSize(parseVideoCardSize(r.settings.grid_size))).catch(() => {});
  }, []);
  useEffect(load, [load]);

  return (
    <div className="chrome-tools">
      <SessionPlayQueueMenu />
      <div className="profile-card-size-wrap">
        <FloatingPopover
          open={cardSizeOpen}
          onOpenChange={setCardSizeOpen}
          align="end"
          className="profile-card-size-popover"
          trigger={<IconButton variant="ghost" size="sm" className="profile-card-size-trigger" label={t("videoCardSize")} icon={<SlidersHorizontal />} />}
        >
          <div className="ui-popover__title">{t("videoCardSize")}</div>
          {canManageAppearance && <SteppedSlider value={cardSize} steps={[180, 220, 260, 300, 372, 480]} ariaLabel={t("videoCardSize")} onChange={(next) => {
            setCardSize(next);
            persistVideoCardSize(next);
          }} />}
          {location.pathname === "/" && (
            <>
              {canManageAppearance && <MenuSeparator />}
              <SettingRow label={t("feedSortLabel")} className="profile-feed-sort-row">
                <SegmentedControl
                  className="profile-feed-sort-control"
                  value={feedSort}
                  onChange={onFeedSortChange}
                  label={t("feedSortLabel")}
                  options={[
                    { value: "published", label: t("feedSortUploaded") },
                    { value: "arrival", label: t("feedSortFound") },
                  ]}
                />
              </SettingRow>
            </>
          )}
          {!isChildProfile && (
            <>
              <MenuSeparator />
              <SettingRow
                label={t("incognitoMode")}
                description={t("incognitoModeHint")}
                className={`profile-incognito-row${incognito ? " profile-incognito-row--active" : ""}`}
              >
                <span className="profile-incognito-control">
                  <EyeOff size={17} aria-hidden="true" />
                  <Switch checked={incognito} ariaLabel={t("incognitoMode")} onCheckedChange={onIncognitoChange} />
                </span>
              </SettingRow>
            </>
          )}
          <MenuSeparator />
          <Menu>
            <MenuItem icon={<Eraser size={16} />} suffix={<ChevronRight size={15} className="cleanup-menu-item-chevron" />} onClick={() => { setCardSizeOpen(false); navigate("/cleanup"); }}>{t("cleanupFeed")}</MenuItem>
          </Menu>
        </FloatingPopover>
      </div>
      <NotificationCenter />
    </div>
  );
}
