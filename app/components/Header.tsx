"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { useCart } from "../lib/cart";
import { CART_DRAWER_ID, openCartDrawer } from "../lib/cart-drawer";
import { BRAND_NAME, collectionHref, type NavGroup } from "../lib/navigation";
import { shopifyImageUrl } from "../lib/image";
import { MobileNav, MobileNavTrigger } from "./MobileNav";
import { SearchAutocomplete } from "./SearchAutocomplete";
import { Icon, ICON_PATHS, WalnutMark, WalnutWordmark } from "./WalnutMark";

function cartLabel(count: number) {
  return count === 1 ? "Cart (1 item)" : `Cart (${count} items)`;
}

function countLabel(count: number) {
  return count === 1 ? "1 item in cart" : `${count} items in cart`;
}

function displayCount(count: number) {
  if (count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}

// `armed` gates the CSS transition. On a fresh load — or a client navigation
// that restores scroll — the first measurement can differ from the server's
// docked default, and transitioning into it reads as a jitter. So the first
// measurement is applied without animation and only later changes animate.
// Separate thresholds so the header cannot flutter when you park on the
// boundary: it lifts at `enter` and only settles back once you return to
// `exit`, well above it.
function useScrolledPast(enter: number, exit: number) {
  const [scrolled, setScrolled] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    let frame = 0;

    const apply = () =>
      setScrolled((was) => (was ? window.scrollY > exit : window.scrollY > enter));

    apply();
    const arm = requestAnimationFrame(() => setArmed(true));

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        apply();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(arm);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [enter, exit]);

  return { scrolled, armed };
}

function MegaMenu({ group, onNavigate }: { group: NavGroup; onNavigate: () => void }) {
  return (
    <div
      className="border-border bg-surface mega-menu absolute inset-x-0 top-full z-30 overflow-hidden border-b shadow-2xl"
      // The panel is a sibling of the trigger row inside one hoverable region,
      // so moving the pointer down into it does not close the menu.
      data-mega-menu
    >
      <div className="max-w-page px-margin mx-auto grid gap-8 py-9 lg:grid-cols-[repeat(4,minmax(0,1fr))_280px]">
        {group.columns.map((column) => (
          <div key={column.title}>
            <div className="washed bg-walnut-100 rounded-lg mb-3.5 aspect-[5/4] w-full overflow-hidden">
              {column.image ? (
                <img
                  src={shopifyImageUrl(column.image.url, { width: 420, height: 336, crop: "center" })}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  width={420}
                  height={336}
                />
              ) : null}
            </div>
            <div className="type-overline text-walnut-700 mb-3.5">{column.title}</div>
            <ul role="list" className="flex flex-col items-start gap-2.5">
              {column.items.map((item) => (
                <li key={`${column.title}-${item.handle}`}>
                  <Link
                    href={collectionHref(item.handle)}
                    onClick={onNavigate}
                    className="text-on-surface hover:text-walnut-700 rounded-sm text-[14.5px] no-underline motion-safe:transition-[color,transform] motion-safe:hover:translate-x-1"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {group.promo ? (
          <Link
            href={collectionHref(group.promo.handle)}
            onClick={onNavigate}
            className="text-on-surface group no-underline"
          >
            <div className="washed bg-walnut-100 rounded-lg aspect-square w-full overflow-hidden">
              {group.promo.image ? (
                <img
                  src={shopifyImageUrl(group.promo.image.url, {
                    width: 560,
                    height: 560,
                    crop: "center",
                  })}
                  alt={group.promo.image.altText ?? group.promo.title}
                  className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-105"
                  loading="lazy"
                  width={560}
                  height={560}
                />
              ) : null}
            </div>
            <div className="type-heading-sm font-heading mt-3.5">{group.promo.title}</div>
            <p className="text-sand-600 mt-1 text-[13.5px]">{group.promo.body}</p>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function Header({
  navigation,
  accountUrl,
}: {
  navigation: NavGroup[];
  accountUrl: string;
}) {
  const router = useRouter();
  const totalQuantity = useCart((state) => state.data.totalQuantity);
  const badge = displayCount(totalQuantity);
  const { scrolled, armed } = useScrolledPast(140, 90);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  // A short grace period on leave keeps the menu open while the pointer
  // crosses the gap between the nav row and the panel.
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenGroup(null), 120);
  }, [cancelClose]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  // Escape closes the menu wherever focus happens to be.
  useEffect(() => {
    if (!openGroup) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenGroup(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openGroup]);

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get("q");
    const term = typeof query === "string" ? query.trim() : "";
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
  };

  const activeGroup = navigation.find((group) => group.label === openGroup) ?? null;

  return (
    <header
      // `w-full` keeps the header spanning the viewport — <body> is a column
      // flex container, where a bare `mx-auto` would shrink-to-fit instead.
      className="site-header bg-surface sticky top-0 z-40 mx-auto w-full border-b"
      data-floating={scrolled}
      data-armed={armed}
      style={{
        // 100% ↔ 1180px interpolates as a calc(), so narrowing starts at once.
        maxWidth: scrolled ? "1180px" : "100%",
        borderRadius: scrolled ? 28 : 0,
        backgroundColor: scrolled ? "rgb(255 251 245 / 0.82)" : "var(--color-surface)",
        backdropFilter: scrolled ? "saturate(140%) blur(16px)" : "none",
        WebkitBackdropFilter: scrolled ? "saturate(140%) blur(16px)" : "none",
        boxShadow: scrolled ? "0 14px 40px rgb(43 38 32 / 0.16)" : "0 0 0 rgb(43 38 32 / 0)",
        borderBottomColor: scrolled ? "transparent" : "var(--color-border)",
      }}
      onMouseLeave={scheduleClose}
    >
      {/* Announcement bar — collapses to zero height once the page scrolls. */}
      <div
        role="region"
        aria-label="Announcement"
        className="site-header-bar bg-sand-900 overflow-hidden text-center"
        style={{
          maxHeight: scrolled ? 0 : 40,
          opacity: scrolled ? 0 : 1,
          padding: scrolled ? "0 16px" : "9px 16px",
        }}
      >
        <p className="type-overline text-sand-300 text-[11px]">
          Complimentary white-glove delivery on orders over $1,500
        </p>
      </div>

      <div
        className="site-header-row max-w-page mx-auto flex items-center gap-4 md:grid md:grid-cols-[minmax(0,1fr)_minmax(300px,640px)_minmax(0,1fr)] md:gap-7"
        style={{ padding: scrolled ? "12px var(--spacing-margin)" : "16px var(--spacing-margin)" }}
        data-header-nav-group
      >
        <div className="flex items-center gap-1 md:justify-self-start">
          <div className="-ms-2 md:hidden">
            <MobileNavTrigger />
          </div>
          <Link
            href="/"
            className="text-on-surface focus-visible:outline-accent inline-flex items-center gap-3 rounded-sm no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <WalnutMark size={28} className="shrink-0" />
            <WalnutWordmark size="15px" className="md:hidden" />
            <WalnutWordmark size="22px" className="hidden md:inline" />
          </Link>
        </div>

        {/* Shopify predictive search (Search & Discovery) — same component the
            /search page uses, so suggestions, products and collections all come
            from the app's own index rather than any client-side matching. */}
        <div className="hidden min-w-0 md:block">
          <SearchAutocomplete
            id="header-search"
            variant="bar"
            placeholder="Search sofas, armchairs, oak tables…"
          />
        </div>

        <div className="ms-auto flex items-center gap-0.5 md:justify-self-end">
          <a
            href={accountUrl}
            className="button-icon focus-visible:outline-accent inline-flex rounded-[7px]"
            aria-label="Account"
          >
            <Icon d={ICON_PATHS.user} />
          </a>
          <Link
            href={collectionHref("shop-all")}
            className="button-icon focus-visible:outline-accent hidden rounded-[7px] md:inline-flex"
            aria-label="Wishlist"
          >
            <Icon d={ICON_PATHS.heart} />
          </Link>
          <button
            type="button"
            commandfor={CART_DRAWER_ID}
            command="show-modal"
            className="button-icon focus-visible:outline-accent relative inline-flex cursor-pointer rounded-[7px] motion-safe:transition motion-safe:active:scale-[0.97]"
            aria-label={cartLabel(totalQuantity)}
            aria-controls={CART_DRAWER_ID}
            aria-haspopup="dialog"
            data-testid="cart-trigger"
            onClick={openCartDrawer}
          >
            <span className="relative inline-flex size-[18px] items-center justify-center">
              <Icon d={ICON_PATHS.bag} />
              {badge ? (
                <span
                  className="bg-interactive text-interactive-text absolute -top-2 -end-2.5 inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-1 text-[10.5px] font-semibold"
                  data-testid="cart-count"
                >
                  {badge}
                </span>
              ) : null}
            </span>
          </button>
          <span aria-live="polite" aria-atomic="true" className="sr-only">
            {countLabel(totalQuantity)}
          </span>
        </div>
      </div>

      {/* Mobile search row — the design puts a full-width field under the bar
          rather than hiding search behind an icon. Collapses with the rest of
          the chrome once the page scrolls. */}
      <div
        className="site-header-row px-margin overflow-hidden md:hidden"
        style={{
          maxHeight: scrolled ? 0 : 72,
          opacity: scrolled ? 0 : 1,
          paddingBottom: scrolled ? 0 : 14,
        }}
      >
        <SearchAutocomplete id="mobile-search" variant="bar" placeholder="Search" />
      </div>

      {/* Desktop nav row. The mega panel is rendered as a sibling below so the
          whole header region shares one hover/focus scope. */}
      <nav
        aria-label="Main navigation"
        className="site-header-nav max-w-page mx-auto hidden gap-0.5 md:flex"
        style={{ padding: scrolled ? "0 16px 6px" : "0 28px" }}
      >
        {navigation.map((group) => {
          const isOpen = openGroup === group.label;
          return (
            <Link
              key={group.label}
              href={collectionHref(group.handle)}
              onMouseEnter={() => {
                cancelClose();
                setOpenGroup(group.label);
              }}
              onFocus={() => {
                cancelClose();
                setOpenGroup(group.label);
              }}
              onClick={() => setOpenGroup(null)}
              aria-expanded={isOpen}
              className="text-on-surface focus-visible:outline-accent border-b-2 px-4 py-3.5 text-[13px] font-medium tracking-[0.09em] uppercase no-underline focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 motion-safe:transition-colors"
              style={{ borderBottomColor: isOpen ? "var(--color-interactive)" : "transparent" }}
            >
              {group.label}
            </Link>
          );
        })}
      </nav>

      {activeGroup ? (
        <div onMouseEnter={cancelClose} onMouseLeave={scheduleClose} className="relative hidden md:block">
          <MegaMenu group={activeGroup} onNavigate={() => setOpenGroup(null)} />
        </div>
      ) : null}

      <MobileNav navigation={navigation} accountUrl={accountUrl} />
    </header>
  );
}
