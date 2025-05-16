import React from 'react'
import { HashLoader } from "react-spinners";

const Spinner = () => {
  return (
    <div className='bg-black w-screen h-screen flex justify-center items-center'>
        <HashLoader
        color="#ffffff"
        loading
        size={80}
        />
    </div>
  )
}

export default Spinner