// "use client"
// import React, { useState,useEffect } from 'react';
// import { getAuth,RecaptchaVerifier,signInWithPhoneNumber } from 'firebase/auth';
// import {app} from "./firebaseconfig"

// import { useRouter } from 'next/router';
// import { LogIn } from 'lucide-react';

// export default function LogIn(){
//     const [phoneNumber,setPhoneNumber]=useState('');
//     const [otp,setOtp]=useState('');
//     const [confirmationResult,SetConfirmationResult]=useState(null);
//     const [otpSent,setOtpSent]=useState(false)
//     const auth=getAuth(app)
//     const router=useRouter();

//     useEffect(()=>{
//         window.RecaptchaVerifier=new RecaptchaVerifier(auth,"recaptcha-container",{
//             'size':'normal','callback':(response)=>{

//             },
//             'expired-callback':()=>{

//             }
//         });
//     },[auth])

// const handlePhoneNumberChange=()=>{
//     setPhoneNumber(e.target.value)  
// }

// const handleOtChange=()=>{
//     setOtp(e.target.value)  
// }

// const handleSendOtp=async()=>{
//     try{
//         const formattedPhoneNumber=`+${phoneNumber.replace(/\D/g,'')}`
//         const confirmation=await signInWithPhoneNumber(auth,formattedPhoneNumber,window,recaptchaVerifier);
//         SetConfirmationResult(confirmation);
//         setOtpSent(true);
//         setPhoneNumber('');
//         alert("Otp has been sent");
//     }catch(error){
//         console.error(error);        
//     }

// };
// const handleOtpSubmit=async()=>{
//    try{
//       await  confirmationResult.confrim(otp);
//       setOtp('')
//       router.push("/dashbord")
//    }catch(error){
//     console.error(error);
    
//    }
// };

// return (
//     <div>
//         {!otpSent ?(
//             <div id='recaptcha-container'>

//             </div>
//         ):null
//         }
//         <input 
//         type="tel" 
//         value={phoneNumber} 
//         onChange={handlePhoneNumberChange}  
//         placeholder='Enter phone number '
//         className='border border-gray-500 p-2 rounded-md'

//         />
//          <input 
//         type="text" 
//         value={otp} 
//         onChange={handleOtChange}  
//         placeholder='ENTER otp '
//         className='border border-gray-500 p-2 rounded-md'
//         />
  
//   <button onClick={otpSent ? handleOtpSubmit:handleSendOtp}
//     className={`bg-${otpSent ? 'green':"blue"}-500 text-white p-2 rounded-md m-2`}
//     style={{backgroundColor:otpSent ? "green":"blue"}}
//   >
//      {otpSent ? "Submite" :"Send Otp"}
//   </button>

//     </div>
// )



// }
