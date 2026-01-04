import React, { useState } from "react";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About us", href: "#aboutus" },
  { label: "Services", href: "#services" },
  { label: "Contact", href: "#contact" },
];

const ctaLinks = [
  { label: "Log in", href: "/login", variant: "filled" },
  { label: "Sign up", href: "/signup", variant: "outline" },
];

export const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav
      className="font-semibold"
      style={{ color: "#CCD5B9", backgroundColor: "#585233", position: "relative", zIndex: 9999 }}
    >
      <div className="w-full px-4 md:px-8" style={{ margin: "0 auto" }}>
        <div className="flex items-center justify-between h-16" style={{ gap: "1.25rem" }}>
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <img src="../../../resources/logoMone.png" alt="Logo" className="h-8 w-8 mr-2" />
            <span className="text-xl font-bold">MONE</span>
          </div>

          {/* Menu */}
          <div className="hidden md:flex items-center flex-1 justify-end space-x-6 lg:space-x-8 xl:space-x-10">
            {navLinks.map((item) => (
              <a key={item.href} href={item.href} className="nav-link">
                {item.label}
              </a>
            ))}
            <div className="border-l-2 h-8" style={{ borderColor: "#CCD5B9" }}></div>
            {ctaLinks.map((cta) => (
              <a
                key={cta.href}
                href={cta.href}
                className="px-4 py-1 rounded-full transition"
                style={
                  cta.variant === "filled"
                    ? { backgroundColor: "#CCD5B9", color: "#585233", fontWeight: 700 }
                    : { border: "2px solid #CCD5B9", color: "#CCD5B9" }
                }
              >
                {cta.label}
              </a>
            ))}
          </div>

          {/* Hamburger */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen((prev) => !prev)}
              type="button"
              className="hover:text-gray-200"
              style={{ color: "#CCD5B9" }}
            >
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div
          className="absolute top-16 left-0 w-full md:hidden px-4 pt-3 pb-4 space-y-2"
          style={{ backgroundColor: "#585233", borderTop: "3px solid #CCD5B9", zIndex: 9999 }}
        >
          {navLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="nav-link block px-3 py-2 rounded-md"
              style={{ border: "1px solid transparent" }}
            >
              {item.label}
            </a>
          ))}
          <div style={{ borderTop: "3px solid #CCD5B9" }} className="pt-3 space-y-2">
            {ctaLinks.map((cta) => (
              <a
                key={cta.href}
                href={cta.href}
                className="block px-4 py-2 rounded-full text-center"
                style={
                  cta.variant === "filled"
                    ? { backgroundColor: "#CCD5B9", color: "#585233", fontWeight: 700 }
                    : { border: "2px solid #CCD5B9", color: "#CCD5B9" }
                }
              >
                {cta.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;
