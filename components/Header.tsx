import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";

export const HeaderLogo: React.FC<{ className?: string }> = ({ className }) => (
  <Link href="/" className={className ? `${className} brand-logo` : "brand-logo"} aria-label="Home">
    <Image src="/tvr.webp" alt="Teton Valley Resort" width={96} height={96} priority />
  </Link>
);

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Kanban", href: "https://trello.com/b/uTBOEIf1/rv-park-kanban" },
  { label: "Site Report", href: "/site-conditions" },
  { label: "GitHub", href: "https://github.com/brandongroce/camp-host-handbook" },
];

export const Header: React.FC = () => {
  const router = useRouter();

  const isActive = (href: string) => {
    if (href.startsWith("http")) return false;
    if (href === "/") return router.asPath === "/";
    if (href.startsWith("#")) {
      return router.asPath.includes(href);
    }
    return router.asPath === href || router.asPath.startsWith(`${href}#`);
  };

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <div className="brand">
          <HeaderLogo />
        </div>
        <nav className="primary-nav" aria-label="Main navigation">
          <ul>
            {navLinks.map((item) => (
              <li key={item.href}>
                {item.href.startsWith("http") ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="nav-link"
                    data-active={isActive(item.href)}
                  >
                    {item.label}
                  </a>
                ) : (
                  <a href={item.href} className="nav-link" data-active={isActive(item.href)}>
                    {item.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
};
