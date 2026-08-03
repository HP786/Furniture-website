"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CART_DRAWER_ID, openCartDrawer } from "../lib/cart-drawer";
import { useCart } from "../lib/cart";
import { collectionHref } from "../lib/navigation";
import { Icon, ICON_PATHS } from "./WalnutMark";

// Each icon has to read as the page it opens: a house for home, a grid of
// tiles for browsing everything, a bag for the cart (matching the header's).
const TABS = [
  { label: "Home", href: "/", d: ICON_PATHS.home },
  { label: "Shop", href: collectionHref("shop-all"), d: ICON_PATHS.grid },
  { label: "Search", href: "/search", d: ICON_PATHS.search },
  { label: "Saved", href: collectionHref("long-afternoons"), d: ICON_PATHS.heart },
] as const;

/**
 * Mobile bottom tab bar. The safe-area padding keeps it clear of the iOS home
 * indicator; the last slot opens the cart drawer rather than navigating.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const totalQuantity = useCart((state) => state.data.totalQuantity);

  return (
    <nav
      aria-label="Quick navigation"
      className="border-border fixed inset-x-0 bottom-0 z-30 border-t bg-[color:rgb(253_251_248/0.96)] backdrop-blur-sm md:hidden"
    >
      <ul
        role="list"
        className="flex justify-between px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.label}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`min-w-touch-target flex flex-col items-center gap-1.5 text-[10.5px] no-underline ${
                  active ? "text-walnut-700" : "text-sand-500"
                }`}
              >
                <Icon d={tab.d} size={21} />
                {tab.label}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            commandfor={CART_DRAWER_ID}
            command="show-modal"
            onClick={openCartDrawer}
            aria-controls={CART_DRAWER_ID}
            aria-haspopup="dialog"
            className="text-sand-500 min-w-touch-target relative flex cursor-pointer flex-col items-center gap-1.5 bg-transparent text-[10.5px]"
          >
            <span className="relative">
              <Icon d={ICON_PATHS.bag} size={21} />
              {totalQuantity > 0 ? (
                <span className="bg-interactive text-interactive-text absolute -top-1.5 -end-2 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-semibold">
                  {totalQuantity > 99 ? "99+" : totalQuantity}
                </span>
              ) : null}
            </span>
            Cart
          </button>
        </li>
      </ul>
    </nav>
  );
}
