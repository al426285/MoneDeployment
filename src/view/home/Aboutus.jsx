import React from 'react'
export const Aboutus = () => {
    return (
        <div className='aboutus'>
            <div>
                <h2 className='enunciado font-bold text-6xl'>ABOUT US</h2>
            </div>
            <div className="englobado ml-20 mr-20 mb-20">
                <div className="imagengrupo w-2/5 ">
                    <img src="/imagen_grupal.png" alt="imagen del grupo"
                        className="w-full h-auto rounded-2xl shadow-lg"

                    />
                </div>

                <div className="nosotros w-3/5">
                    <p className='textonosotros text-base sm:text-lg
                    md:text-xl lg:text-1xl
                    text-[#CCD5B9]
                    '>We are a team of three students — Teresa, Ernesto, and Haytame — who designed this map-based application as part of our Software Paradigms and Software Design course.
                        <br />
                        Our goal was to create a simple, user-friendly tool that allows people to explore maps, save their favorite places, and calculate routes with ease. This project reflects not only our technical skills but also our teamwork, creativity, and passion for building useful digital solutions.</p>
                </div>


            </div>



        </div >
    )
}

export default Aboutus;
