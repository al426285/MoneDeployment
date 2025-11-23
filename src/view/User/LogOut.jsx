import React from 'react'
import '../../../styles/styles.css'
import { useUserViewModel2 } from '../../viewmodel/userViewModel2'
export const LogOut = () => {
      const {
        email,
        message,
        errors,
        loading,
        setEmail,
        setMessage,
        setErrors,
        setLoading,
        recoverPassword, logOut
      } = useUserViewModel2();
    return (

        <div>
            <button className='cerrarSesion' onClick={logOut}>Cerrar Sesion</button>
            {message && <p style={{ color: "green" }}>{message}</p>}
            {errors.email && <p style={{ color: "red" }}>{errors.email}</p>}
        </div>
    )
}

export default LogOut;