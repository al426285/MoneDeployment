import React, { useState } from "react";
import LogOut from "../User/LogOut";

export const AppNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const navItems = [
    { label: "Explore", href: "/searchroute" },
    { label: "My routes", href: "/routes" },
    { label: "My places", href: "/places" },
  ];

  const profileItems = [
    { label: "Manage Mobility Methods", href: "/mobilitymethods" },
    { label: "Settings", href: "/settings" },
  ];

  return (
    <nav className="font-semibold" style={{ color: "#CCD5B9", backgroundColor: "#585233", position: "relative", zIndex: 9999 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <img src="../../../resources/logoMone.png" alt="Logo" className="h-8 w-8 mr-2" />
            <span className="text-xl font-bold">MONE</span>
          </div>

          {/* Menu  */}
          <div className="hidden md:flex space-x-6 items-center">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="nav-link">
                {item.label}
              </a>
            ))}
            <div className="relative">
              <button
                type="button"
                className="flex items-center justify-center w-10 h-10 rounded-full focus:outline-none focus:ring-offset-2"
                style={{ backgroundColor: "#585233", color: "#CCD5B9", border: "3px solid #CCD5B9" }}
                onClick={() => setProfileOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={profileOpen}
              >
                <span className="sr-only">Open user menu</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0" />
                </svg>
              </button>
              {profileOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-md shadow-lg"
                  style={{ backgroundColor: "#CCD5B9", color: "#585233", border: "3px solid #585233", padding: 0, zIndex: 99999 }}
                >
                  {profileItems.map((item, idx) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className="block px-4 py-2 text-sm hover:bg-[#dce6c6ff]"
                      style={{
                        borderBottom: idx < profileItems.length - 1 ? "3px solid #585233" : "none",
                        margin: 0
                      }}
                    >
                      {item.label}
                    </a>
                  ))}
                  <div style={{ borderTop: "3px solid #585233", margin: 0 }}>
                      <LogOut />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/*boton hamburguesa o X */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className=" hover:text-gray-200 " style={{ color: "#CCD5B9" }}
            >
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {/*icono de cerrar (X) */}
                {isOpen ? ( 
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /> 
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
                {/*icono hamburguesa */}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Menu desplegable, &&--> si true muestra lo siguiente */}
      {isOpen && (
       <div
  className="absolute top-16 left-0 w-full md:hidden px-2 pt-2 pb-3 space-y-1"
  style={{ backgroundColor: "#585233", zIndex: 9999 }}
>
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="nav-link block px-3 py-2 rounded-md hover:bg-olive-700"
            >
              {item.label}
            </a>
          ))}
          <div className="border-t border-gray-500 pt-3 mt-3 space-y-1">
            <div style={{ border: "1px solid #585233", borderRadius: 6, overflow: "hidden", margin: '0 8px' }}>
              {profileItems.map((item, idx) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 hover:bg-olive-700"
                  style={{
                    borderBottom: idx < profileItems.length - 1 ? "1px solid #585233" : "none",
                    backgroundColor: "transparent",
                    color: "#CCD5B9",
                  }}
                >
                  {item.label}
                </a>
              ))}
              <div style={{ padding: 0 }}>
                <div className="px-3 py-2" style={{ backgroundColor: "#4a3f24", color: "#CCD5B9" }}>
                  <LogOut />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
export default AppNav;
