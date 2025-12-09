import React, { useState } from "react";
export const NavBar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="font-semibold" style={{ color: "#CCD5B9", backgroundColor: "#585233" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <img src="../../../resources/logoMone.png" alt="Logo" className="h-8 w-8 mr-2" />
            <span className="text-xl font-bold">MONE</span>
          </div>

          {/* Menu  */}
          <div className="hidden md:flex space-x-6 items-center">
            <a href="#home" className="nav-link">Home</a>
            <a href="#aboutus" className="nav-link">About us</a>
            <a href="#services" className="nav-link">Services</a>
            <a href="#contact" className="nav-link">Contact</a>
            <div className="border-l h-8 mr-4"></div>
            <a href="/login" className="px-4 py-1 font-bold rounded-full hover:bg-gray-200" style={{backgroundColor: "#CCD5B9", color:"#585233" }}>Log in</a>
            <a href="/signup" className="px-4 py-1 border rounded-full " style={{ borderColor: "#CCD5B9" }}>Sign Up</a>
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
  className="absolute top-16 left-0 w-full md:hidden px-2 pt-2 pb-3 space-y-1 z-50"
  style={{ backgroundColor: "#585233" }}
>
          <a href="#home" className="nav-link block px-3 py-2 rounded-md hover:bg-olive-700">Home</a>
          <a href="#aboutus" className="nav-link block px-3 py-2 rounded-md hover:bg-olive-700">About us</a>
          <a href="#services" className="nav-link block px-3 py-2 rounded-md hover:bg-olive-700">Services</a>
          <a href="#contact" className="nav-link block px-3 py-2 rounded-md hover:bg-olive-700">Contact</a>
          <a href="/login" className="block px-3 py-2 mt-10 rounded-full text-center transform transition-transform duration-1000 hover:scale-95" style={{ color:"#585233", backgroundColor: "#CCD5B9" }}>Log in</a>
          <a href="#" className="block px-3 py-2 mt-2 border border-white rounded-full text-center transform transition-transform duration-1000 hover:scale-95">Sign Up</a>
        </div>
      )}
    </nav>
  );
}
export default NavBar;
