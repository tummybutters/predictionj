import Link from "next/link";

import styles from "./logged-in-nav.module.css";

type NavItem = {
  href: string;
  label: string;
  short: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", short: "Home" },
  { href: "/journal", label: "Journal", short: "Jrnl" },
  { href: "/predictions", label: "Predictions", short: "Pred" },
];

export function LoggedInNav() {
  const items =
    process.env.NODE_ENV === "production"
      ? NAV_ITEMS
      : [...NAV_ITEMS, { href: "/dev/ui-kit", label: "UI", short: "UI" }];

  return (
    <nav className={styles.card} aria-label="Primary">
      <ul className={styles.list}>
        {items.map((item) => {
          return (
            <li key={item.href} className={`${styles.item} ${styles.isoPro}`}>
              <span />
              <span />
              <span />
              <Link href={item.href} aria-label={item.label}>
                <span className={styles.badge}>{item.short}</span>
              </Link>
              <div className={styles.text}>{item.label}</div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
