import React, { useEffect, useState,useContext } from 'react'
import OTPInput from 'react-otp-input'
import { verifyEmailAndSignUp,resendOtp } from '../services/operations/AuthAPI'
import { useNavigate } from 'react-router-dom'
import { IoIosArrowRoundBack } from "react-icons/io";
import { FaClockRotateLeft } from "react-icons/fa6";
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AuthContext } from '../context/AuthContext';
import Button from "@/components/ui/button-custom";


export const VerifyEmail = () => {
    const [otp,setOtp] = useState("")
    const navigate = useNavigate();
    const {loading,setLoading,signupData,setUser} = useContext(AuthContext)

    useEffect(() => {
        if(signupData==null) navigate('/signup')
    },[])

    function submitHandler(e : React.FormEvent){
        e.preventDefault();
        setLoading(true);
        if(otp.length !== 6){
            toast.error("Enter complete OTP")
            return;
        }
        // console.log(otp)
        setOtp("");
        verifyEmailAndSignUp(otp,signupData,setUser,setLoading,navigate)
        setLoading(false);
    }

  return (
    loading ? 
    <div className='flex justify-center items-center'>
        Loading...
    </div>
    :
    <div className='text-white bg-gray-900 h-screen w-screen flex flex-col justify-center items-center'>
        <h1 className='text-3xl' >Verify Email</h1>
        <p  className='text-sm mt-2 mb-2 text-richblack-400'>A verification code has been sent to you. Enter the code below</p>
        <form onSubmit={submitHandler} className='mt-2'>
            <OTPInput 
                value={otp}
                onChange={setOtp}
                numInputs={6}
                renderInput={(props) => <input {...props} placeholder='-'/>}
                containerStyle='text-black gap-5 '
                inputStyle={'w-10 h-12 border border-[#e7a34f] rounded-md text-lg text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-300 outline-none transition-all duration-200'}
                skipDefaultStyles={true}
                inputType='tel'
            />

            <button type='submit'
            className="w-full flex justify-center items-center bg-yellow-500 text-white p-2 rounded-md mt-8">
                Submit
            </button>
        </form>

        <div className='w-[25%] flex justify-between mt-5'>
            <Link to={'/login'} className='flex items-center cursor-pointer justify-between'>
                <IoIosArrowRoundBack size={26}/>
                <span> Back To Login</span>
            </Link>

            

            <button className='flex items-center cursor-pointer justify-between gap-1'
                onClick={() => resendOtp(signupData?.email)}
            >
                <FaClockRotateLeft />
                <span> Resend it</span>
            </button>
        </div>
    </div>
  )
}

export default VerifyEmail