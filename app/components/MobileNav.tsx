"use client";

import Link from "next/link";

import { closeDialog, MOBILE_NAV_DRAWER_ID, openDialog } from "../lib/cart-drawer";
import { collectionHref, type NavGroup } from "../lib/navigation";
import { Icon, ICON_PATHS, WalnutMark, WalnutWordmark } from "./WalnutMark";

export type NavCollection = {
  handle: string;
  title: string;
};

/**
 * The desktop mega menu's columns collapse into native <details> groups, so one
 * navigation model drives both breakpoints.
 */
export function MobileNav({
  navigation,
  accountUrl,
}: {
  navigation: NavGroup[];
  accountUrl: string;
}) {
  return (
    <dialog
      id={MOBILE_NAV_DRAWER_ID}
      data-testid="mobile-nav"
      className="drawer-left bg-surface text-on-surface"
      aria-labelledby="mobile-nav-title"
      closedby="any"
    >
      <div className="flex h-full flex-col">
        <div className="border-border flex shrink-0 items-center justify-between border-b px-4 py-2.5">
          <span className="text-on-surface inline-flex items-center gap-2.5" id="mobile-nav-title">
            <WalnutMark size={21} />
            <WalnutWordmark size="15px" />
          </span>
          <button
            type="button"
            command="close"
            commandfor={MOBILE_NAV_DRAWER_ID}
            className="button-icon focus-visible:outline-accent inline-flex cursor-pointer rounded-[7px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            aria-label="Close menu"
            onClick={() => closeDialog(MOBILE_NAV_DRAWER_ID)}
          >
            <Icon d={ICON_PATHS.close} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2">
          <nav aria-label="Mobile navigation">
            <ul role="list" className="flex flex-col">
              {navigation.map((group) => (
                <li key={group.label} className="border-border border-b">
                  <details className="group">
                    <summary className="marker-hidden text-on-surface flex min-h-touch-target cursor-pointer list-none items-center justify-between py-3.5 text-lg">
                      {group.label}
                      <Icon
                        d={ICON_PATHS.chevronDown}
                        size={17}
                        className="motion-safe:transition-transform group-open:rotate-180"
                      />
                    </summary>
                    <div className="pb-3">
                      <Link
                        href={collectionHref(group.handle)}
                        onClick={() => closeDialog(MOBILE_NAV_DRAWER_ID)}
                        className="text-walnut-700 type-overline flex min-h-touch-target items-center no-underline"
                      >
                        Shop all {group.label}
                      </Link>
                      {group.columns.map((column) => (
                        <div key={column.title} className="mb-2">
                          <div className="type-overline text-sand-500 mt-2 mb-1">{column.title}</div>
                          <ul role="list" className="flex flex-col">
                            {column.items.map((item) => (
                              <li key={`${column.title}-${item.handle}`}>
                                <Link
                                  href={collectionHref(item.handle)}
                                  onClick={() => closeDialog(MOBILE_NAV_DRAWER_ID)}
                                  className="text-sand-700 hover:text-on-surface flex min-h-touch-target items-center text-[15px] no-underline"
                                >
                                  {item.title}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="border-border shrink-0 border-t px-4 py-3">
          <a
            href={accountUrl}
            className="text-on-surface flex min-h-touch-target items-center gap-3 text-[15px] no-underline"
          >
            <Icon d={ICON_PATHS.user} />
            Sign in
          </a>
        </div>
      </div>
    </dialog>
  );
}

export function MobileNavTrigger() {
  return (
    <button
      type="button"
      commandfor={MOBILE_NAV_DRAWER_ID}
      command="show-modal"
      className="button-icon focus-visible:outline-accent inline-flex cursor-pointer rounded-[7px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-transform motion-safe:active:scale-[0.97]"
      aria-label="Menu"
      data-testid="nav-trigger"
      onClick={() => openDialog(MOBILE_NAV_DRAWER_ID)}
    >
      <Icon d={ICON_PATHS.menu} size={21} />
    </button>
  );
}
