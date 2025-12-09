import React from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment, OrbitControls, ContactShadows } from '@react-three/drei'
import { Earth } from '../../../public/Earth'
import SplitText from '../../core/imports/SplitText'
import TextType from '../../core/imports/TextType'
import { Suspense } from 'react'
export const Portada = () => {
  return (
    <>
    
    <h1 className="titulo select-none">
        <SplitText
          text="MONE"
          tag='h1'
          className="textomone text-2xl font-bold text-center" /*esto es tailwind*/
          delay={300}
          duration={2}
          ease="power3.out"
          splitType="chars"
          from={{ opacity: 0, y: 40 }}
          to={{ opacity: 1, y: 0 }}
          threshold={0.1}
          rootMargin="-200px"
          textAlign="center"
          onLetterAnimationComplete={() => console.log('Animation completada!')}
        />
      </h1>


      <Canvas camera={{ position: [20, 0, 6], fov: 30 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={-0.4} />
          <OrbitControls
            enableZoom={false}
            maxPolarAngle={Math.PI / 2.2}
            minPolarAngle={Math.PI / 2.2}
          />
          <Earth className="tierra"/>

        </Suspense>
        <Environment preset="sunset" />
        <ContactShadows position={[0, -3, 0]} opacity={0.6} scale={10} blur={10} far={3} />

      </Canvas>

      <h3 className='eslogan select-none'>
        <TextType className="textoeslogan"
          text={["Never Loose Your Way", "Explore The World", "Discover New Places"]}
          typingSpeed={75}
          pauseDuration={2500}
          showCursor={true}
          cursorCharacter="|" /*cursorCharacter="🌍"*/
        />
      </h3>
    
    </>
  )
}

export default Portada;