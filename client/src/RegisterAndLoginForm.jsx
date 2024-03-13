import {UserContext} from './UserContext';
import { createContext,useContext,useState } from 'react';
import axios from 'axios';
import chat from './assets/chat.jpeg';
export default function RegisterAndLoginForm(){
    const [username,setUsername]=useState('');
    const [password,setPassword]=useState('');
    const [isLoginOrRegister,setIsLoginOrRegister]=useState('login');
    const {setUsername:setLoggedInUsername,setId}=useContext(UserContext);

    async function handleSubmit(ev){
        ev.preventDefault();
        const url=isLoginOrRegister==='register'?'register':'login';
        const {data}=await axios.post(url,{username,password});
        setLoggedInUsername(username);
        setId(data.id);
    }

    
  return (<>
<div className="bg-gray-100 flex justify-center items-center h-screen">
    
<div className="w-1/2 h-screen hidden lg:block">
  <img src={chat} alt="Placeholder Image" className="object-cover w-full h-full" />
</div>

<div className="lg:p-36 md:p-52 sm:20 p-8 w-full lg:w-1/2">
  <h1 className="text-2xl font-semibold mb-4">Login</h1>
  <form onSubmit={handleSubmit} >
    
    <div className="mb-4">
      <input value={username}
               onChange={ev => setUsername(ev.target.value)}
               type="text" 
               placeholder="username" 
               className="w-full border border-gray-350 rounded-md py-2 px-3 focus:outline-none focus:border-blue-500" 
               autoComplete="off" />
    </div>
    
    <div className="mb-4">
      <input value={password}
               onChange={ev => setPassword(ev.target.value)}
               type="password"
               placeholder="password"
               className="w-full border border-gray-350 rounded-md py-2 px-3 focus:outline-none focus:border-blue-500" 
               autoComplete="off" />
    </div>
    
    
        <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-md py-2 px-4 w-full">  {isLoginOrRegister === 'register' ? 'Register' : 'Login'}</button>
  </form>
  {isLoginOrRegister==='login' &&(
  <div className="mt-6 text-blue-500 text-center" >
    <button className="ml-1" onClick={() => setIsLoginOrRegister('register')} >Sign up Here</button>
  </div>)
}

{isLoginOrRegister==='register' &&(
  <div className="mt-6 text-blue-500 text-center" >
    <button className="ml-1" onClick={() => setIsLoginOrRegister('login')} >Login Here</button>
  </div>)
}

</div>
</div>    
</>  );
}
