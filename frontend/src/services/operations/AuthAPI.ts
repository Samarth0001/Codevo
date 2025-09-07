import { authEndpoints } from '../apis'
import { apiConnector } from '../apiConnector';
import toast from 'react-hot-toast';

const {LOGIN_API, VERIFY_OTP_API, VERIFY_SIGNUP_API, SENDOTP_API, CHANGEPASS_API,LOGOUT_API, USER_DETAILS_API, COMMIT_STATS_API, PROFILE_API} = authEndpoints;

export async function login(
  data: any,
  setUser: React.Dispatch<React.SetStateAction<any | null>>,
  setLoggedIn: React.Dispatch<React.SetStateAction<boolean>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  navigate: (path: string) => void
) {
  const toastID = toast.loading('Loading...')
  setLoading(true);

  try {
    // console.log(LOGIN_API);
    const response = await apiConnector('POST', LOGIN_API, data);
    
    // console.log("Printing response -> ", response);
    
    if(!response?.data?.success){   //if success if false,then throw an error with message
      throw new Error(response.data.message)
    }

    toast.success("Login Successful")
    setLoggedIn(true);

    // After successful login, fetch complete user details including projects
    try {
      const userDetailsResponse = await apiConnector("GET", USER_DETAILS_API, {
        withCredentials: true
      });
      
      if(userDetailsResponse?.data?.success) {
        // Set user data with complete details including projects
        const userImage = userDetailsResponse?.data?.user?.image ? 
          userDetailsResponse?.data?.user?.image : 
          `https://api.dicebear.com/9.x/initials/svg?seed=${userDetailsResponse?.data?.user.name}`;
        
        setUser({...userDetailsResponse?.data?.user, image: userImage});
      } else {
        // Fallback to login response if user details fetch fails
        const userImage = response?.data?.user?.image ? 
          response?.data?.user?.image : 
          `https://api.dicebear.com/9.x/initials/svg?seed=${response?.data?.user.name}`;
        
        setUser({...response?.data?.user, image: userImage});
      }
    } catch (userDetailsError) {
      // console.log("Error fetching user details after login:", userDetailsError);
      // Fallback to login response if user details fetch fails
      const userImage = response?.data?.user?.image ? 
        response?.data?.user?.image : 
        `https://api.dicebear.com/9.x/initials/svg?seed=${response?.data?.user.name}`;
      
      setUser({...response?.data?.user, image: userImage});
    }
    
    navigate('/dashboard/home')
  }
  catch(err){
    // console.log("Login error message : ",err)
    toast.error("Login Failed!")
  }
  setLoading(false);
  toast.dismiss(toastID)
}

export async function verifyDetailsAndSendOTP(
  data: any,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  navigate: (path: string) => void
) {
  const toastID = toast.loading("Loading...")
  setLoading(true);

  try {
    // console.log("inside api")
    const response = await apiConnector("POST",VERIFY_SIGNUP_API,data)
    // console.log(response)
    

    // console.log("after call")
    if(! response?.data?.success){
      // console.log(response?.data?.message)
      throw new Error(response?.data?.message)
    }
    // setSignupData(data);
    // console.log("before otp call")
    try {
      // send object in data body, because in backend side, it is fetching email from object
      const output = await apiConnector("POST",SENDOTP_API,{email : data.email})

      if(!output?.data?.success){
        throw new Error(output?.data?.message)
      }

      toast.success("OTP send successfully")
      navigate('/verify-email')
    }   
    catch(err){
      // // console.log("SENDOTP API ERROR............", err)
      toast.error("Could Not Send OTP")
    }
  }
  catch(err){
    // // console.log("Verify Details Error Message : " + err)
    toast.error("Signup Failed!")
  }

  setLoading(false);
  toast.dismiss(toastID)
}

export async function resendOtp(email: string) {
  const toastID = toast.loading("Loading...")
  try {
    // send object in data body, because in backend side, it is fetching email from object
    const output = await apiConnector("POST",SENDOTP_API,{email : email})

    if(! output?.data?.success){
      throw new Error(output?.data?.message)
    }

    toast.success("OTP send successfully")
  }   
  catch(err){
    // console.log("SENDOTP API ERROR............", err)
    toast.error("Could Not Send OTP")
  }
  toast.dismiss(toastID)
}

export async function verifyEmailAndSignUp(
  otp: string,
  signupData: any,
  setUser: React.Dispatch<React.SetStateAction<any | null>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  navigate: (path: string) => void
) {
  const toastId = toast.loading("Loading...")
  setLoading(true);
  try {
    // console.log("before otp verify call")
    const response = await apiConnector("POST",VERIFY_OTP_API,{...signupData,accountType: signupData.role,otp});
    // console.log("after otp verify call")

    if(! response?.data?.success){
      throw new Error(response?.data?.message)
    }
    
    setUser(response?.data?.user);
    
    toast.success("Account Created Successfully")
    navigate('/login')
  }
  catch(err){
    // console.log("Error in verifing email : ",err)
    toast.error("Error while verifying OTP!");
  }
  setLoading(false);
  toast.dismiss(toastId);
}

export async function logout(
  setUser: React.Dispatch<React.SetStateAction<any | null>>,
  setLoggedIn: React.Dispatch<React.SetStateAction<boolean>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  navigate: (path: string) => void
) {
  try {
    setLoading(true);
    const response = await apiConnector("POST",LOGOUT_API);

    if(! response?.data?.success){
      throw new Error(response?.data?.message)
    }
    
    setLoggedIn(false);
    setUser(null);
    toast.success("Logout Successfully")
    navigate('/')
  }
  catch(err){
    // console.log("Error in logging out: ",err)
  }
  setLoading(false);
}

export async function getCommitStats() {
  try {
    const response = await apiConnector('GET', COMMIT_STATS_API);
    return response.data;
  } catch (error: any) {
    // console.error('Error fetching commit stats:', error);
    throw error;
  }
}

export async function getProfile() {
  try {
    const response = await apiConnector('GET', PROFILE_API);
    return response.data;
  } catch (error: any) {
    // console.error('Error fetching profile:', error);
    throw error;
  }
}

export async function updateProfile(profileData: any) {
  try {
    const response = await apiConnector('PUT', PROFILE_API, profileData);
    return response.data;
  } catch (error: any) {
    // console.error('Error updating profile:', error);
    throw error;
  }
}
