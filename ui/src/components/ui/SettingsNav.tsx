import { useState, type ReactNode } from "react";
import { ChevronsUpDown, LayoutList } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "./Button";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "./Menu";
import { Popover } from "./Popover";
import { Tabs } from "./Selection";
import { cx } from "./utils";
import "./SettingsNav.css";

export type SettingsNavItem<T extends string> = {
  value: T;
  label: ReactNode;
  count?: number;
  href?: string;
  trailingIcon?: ReactNode;
};

export type SettingsNavGroup<T extends string> = {
  label: ReactNode;
  items: readonly SettingsNavItem<T>[];
};

export function SettingsNav<T extends string>({
  value,
  groups,
  onChange,
  label,
  className,
}: {
  value: T;
  groups: readonly SettingsNavGroup<T>[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const items = groups.flatMap((group) => group.items);
  const activeItem = items.find((item) => item.value === value) ?? items[0];
  const activeGroup = groups.find((group) => group.items.some((item) => item.value === value)) ?? groups[0];
  const select = (item: SettingsNavItem<T>) => {
    if (item.href) navigate(item.href);
    else onChange(item.value);
    setMobileOpen(false);
  };
  const selectValue = (next: T) => {
    const item = items.find((candidate) => candidate.value === next);
    if (item) select(item);
  };

  return <nav className={cx("ui-settings-nav", className)} aria-label={label}>
    <div className="ui-settings-nav__desktop">
      {groups.map((group) => <div className="ui-settings-nav__group" key={String(group.label)}>
        <div className="ui-settings-nav__group-label">{group.label}</div>
        <div className="ui-settings-nav__items">
          {group.items.map((item) => {
            const content = <><span>{item.label}</span><span className="ui-settings-nav__item-trailing">{item.count != null && item.count > 0 && <span className="ui-settings-nav__count">{item.count}</span>}{item.trailingIcon}</span></>;
            return item.href ? <Link className={cx("ui-settings-nav__item", item.value === value && "ui-settings-nav__item--active")} to={item.href} key={item.value}>{content}</Link> : <button
              type="button"
              className={cx("ui-settings-nav__item", item.value === value && "ui-settings-nav__item--active")}
              aria-current={item.value === value ? "page" : undefined}
              onClick={() => select(item)}
              key={item.value}
            >{content}</button>;
          })}
        </div>
      </div>)}
    </div>

    <div className="ui-settings-nav__mobile">
      <Popover
        rootClassName="ui-settings-nav__mobile-anchor"
        className="ui-settings-nav__mobile-popover"
        surface="menu"
        align="start"
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        trigger={<Button className="ui-settings-nav__mobile-trigger" leadingIcon={<LayoutList />} trailingIcon={<ChevronsUpDown />}>
          <span className="ui-settings-nav__mobile-copy">
            <span className="ui-settings-nav__mobile-group">{activeGroup?.label}</span>
            <span className="ui-settings-nav__mobile-current">{activeItem?.label}</span>
          </span>
        </Button>}
      >
        <Menu>
          {groups.map((group, index) => <div key={String(group.label)}>
            {index > 0 && <MenuSeparator />}
            <MenuLabel>{group.label}</MenuLabel>
            {group.items.map((item) => <MenuItem
              selected={item.value === value}
              suffix={<span className="ui-settings-nav__item-trailing">{item.count != null && item.count > 0 && <span className="ui-settings-nav__count">{item.count}</span>}{item.trailingIcon}</span>}
              onClick={() => select(item)}
              key={item.value}
            >{item.label}</MenuItem>)}
          </div>)}
        </Menu>
      </Popover>

      {/* The sections next door are the ones people hop between, so they stay
          one tap away instead of hiding behind the picker. */}
      {activeGroup && activeGroup.items.length > 1 && <Tabs
        className="ui-settings-nav__rail"
        value={activeItem?.value ?? activeGroup.items[0].value}
        options={activeGroup.items.map((item) => ({ value: item.value, label: item.label, icon: item.trailingIcon, count: item.count }))}
        onChange={selectValue}
        label={String(activeGroup.label)}
      />}
    </div>
  </nav>;
}
