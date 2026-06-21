import React from 'react'
import { useAuth } from '../auth/useAuth'

const HomePage = () => {
    const { login } = useAuth();
    return (
        <div>
            <h1>QuickFit - strona główna (publiczna)</h1>
            <button onClick={login}>Login</button>
        </div>
    )
}

export default HomePage