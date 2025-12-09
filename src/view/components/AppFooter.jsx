import React from "react";

export const Footer = () => (
  <footer className="w-full bg-[#CCD5B9] text-[#585233] py-6 ">
    <div className="max-w-6xl mx-auto px-6 flex flex-col items-center justify-center gap-4 text-center">
      <p className="text-xl  font-semibold">
        © {new Date().getFullYear()} Equipo MONE. Todos los derechos reservados.
      </p>
    </div>
  </footer>
);

export default Footer;