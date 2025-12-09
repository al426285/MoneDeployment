import React from 'react'
import CardSwap, { Card } from '../../core/imports/CardSwap';

export const Services = () => {
    return (
        <div id="gruposervicios" className="servicios text-2xl">
            <div className='titulo_servicios'>
                <h2 className=' aboutustext font-bold text-6xl'>SERVICES</h2>
            </div>
            <div style={{ height: '600px', position: 'relative' }} className='cards_servicios' id="cards_servicios">
                <CardSwap
                    cardDistance={60}
                    verticalDistance={90}
                    delay={5000}
                    pauseOnHover={true}
                    className="cardswap_servicios"
                    id="cardswap_servicios"
                >
                    <Card style={{ backgroundColor: '#585233' }} className='cardservice'>

                        <h3
                            className=' mx-10 mt-2 font-bold 
                    text-3xl' 
                        >Exploration</h3>
                        <img
                            src="/imagen_grupal.png"
                            alt="imagen_grupal"
                            className="w-4/5 h-38 my-4 object-cover rounded-xl
                        justify-self-center self-center
                        "
                        />
                        <p
                            className='text-justify mx-10 mb-10 font-bold ' style={{ color: '#CCD5B9' }}
                        >Explore the map freely and discover nearby places or anywhere in the world with ease. Navigate through different areas, zoom in, and uncover new spots to visit.</p>
                    </Card>
                    <Card style={{ backgroundColor: '#585233' }} className='bg-white'>

                        <h3
                            className=' mx-10 mt-2 font-bold 
                    text-3xl' 
                        >Routes </h3>
                        <img
                            src="/imagen_grupal.png"
                            alt="imagen_grupal"
                            className="w-4/5 h-38 my-4 object-cover rounded-xl
                        justify-self-center self-center
                        "
                        />
                        <p
                            className='text-justify mx-10 mb-10 font-bold' style={{ color: '#CCD5B9' }}
                        >Calculate routes and distances between two or more points and choose your preferred mode of transport. You can also choose between the fastest, shortest,
                            or most economic path according to your needs.</p>
                    </Card>

                    <Card style={{ backgroundColor: '#585233' }} className='bg-white'>

                        <h3
                            className=' mx-10 mt-2 font-bold 
                    text-3xl' 
                        >Markers</h3>
                        <img
                            src="/imagen_grupal.png"
                            alt="imagen_grupal"
                            className="w-4/5 h-38 my-4 object-cover rounded-xl
                        justify-self-center self-center
                        "
                        />
                        <p
                            className='text-justify mx-10 mb-10 font-bold ' style={{ color: '#CCD5B9' }}
                        >Save your favorite places, add personal notes, and access them anytime. Create a personalized map with the spots that matter most to you</p>
                    </Card>

                    <Card style={{ backgroundColor: '#585233' }}>
                        <h3 className='mx-10 mt-2 font-bold text-3xl' >
                            Vehicle Manager
                        </h3>
                        <img
                            src='/imagen_grupal.png'
                            alt='vehicle_manager'
                            className='w-4/5 h-38 my-4 object-cover rounded-xl justify-self-center self-center'
                        />
                        <p className='text-justify mx-10 mb-10 font-bold' style={{ color: '#CCD5B9' }}>
                            Add, modify or remove your vehicles. Define consumption, fuel type, or autonomy for
                            more accurate route calculations.
                        </p>
                    </Card>

                    <Card style={{ backgroundColor: '#585233' }}>
                        <h3 className='mx-10 mt-2 font-bold text-3xl' >
                            Favorites
                        </h3>
                        <img
                            src='/imagen_grupal.png'
                            alt='favorites'
                            className='w-4/5 h-38 my-4 object-cover rounded-xl justify-self-center self-center'
                        />
                        <p className='text-justify mx-10 mb-10 font-bold' style={{ color: '#CCD5B9' }}>
                            Save your favorite routes, vehicles, or places to access them quickly. Personalize
                            your experience by setting default options.
                        </p>
                    </Card>
                </CardSwap>
            </div>
        </div>

    )

}

export default Services;