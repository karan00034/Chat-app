const express=require("express");
const cors=require("cors");
const bcrypt=require("bcryptjs");
const mongoose=require("mongoose");
const ws=require("ws");
const fs=require("fs");
const dotenv=require("dotenv");
const cookieParser=require("cookie-parser");
const jwt=require("jsonwebtoken");
const User=require("./models/User")
const Message=require("./models/Message")

const app=express();
/*const allowCors = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Another common pattern
  // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, PATCH, DELETE, POST, PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  return await fn(req, res);
};

// Apply allowCors middleware to all routes
app.use(allowCors);
*/
dotenv.config();
console.log(__dirname)
app.use('/uploads',express.static(__dirname + '/uploads'));
app.use(cookieParser());
app.use(express.json());
app.use(cors({
    origin:"http://localhost:5173",
    methods:["POST","GET"],
    credentials:true,
}))

const connectDB=()=>{
    mongoose.connect("your-mongodb-userid").then(()=>{
        console.log("Database connected");
    })
}
connectDB();



const jwtSecret = "hello world";
const bcryptSalt = bcrypt.genSaltSync(10);

async function getUserDataFromRequest(req){
  return new Promise((resolve,reject)=>{
    const token=req.cookies?.token;
    if(token){
      jwt.verify(token,jwtSecret,{},(err,userData)=>{
        if(err) throw err;
        resolve(userData); 
      })
    }
    else{
      reject('No token');
    }
  })

}

app.get('/',(req,res)=>{
    res.json("hello");
})



app.post("/login",async(req,res)=>{
    const {username,password}=req.body;
    const foundUser=await User.findOne({username})
    if(foundUser){
        const passOK=bcrypt.compareSync(password,foundUser.password);
        if (passOK) {
      jwt.sign({userId:foundUser._id,username}, jwtSecret, {}, (err, token) => {
        res.cookie('token', token, {sameSite:'none', secure:true}).json({
          id: foundUser._id,
        });
      });
    }
    }
})


app.post('/logout', (req,res) => {
  res.cookie('token', '', {sameSite:'none', secure:true}).json('ok');
});


app.post("/register",async(req,res)=>{
    const {username,password}=req.body;
    try{
        const hashedPassword=bcrypt.hashSync(password,bcryptSalt);
        const createdUser=await User.create({
            username:username,
            password:hashedPassword
        })
         jwt.sign({userId:createdUser._id,username}, jwtSecret, {}, (err, token) => {
      if (err) throw err;
      res.cookie('token', token, {sameSite:'none', secure:true}).status(201).json({
        id: createdUser._id,
      });
    });

    }
    catch(err){
        if (err) throw err;
         res.status(500).json('error');
    }

})

app.get('/profile',(req,res)=>{
  const token=req.cookies?.token;
  if(token){
    jwt.verify(token,jwtSecret,{},(err,userData)=>{
      if(err) throw err;
      res.json(userData);
    });

  }
  else{
    res.status(401).json('no token');
  } 

})

app.get('/people',async(req,res)=>{
  const users=await User.find({},{'_id':1,username:1});
  res.json(users)
})


app.get('/messages/:userId',async(req,res)=>{
  const {userId}=req.params;
  const userData=await getUserDataFromRequest(req);
  const ourUserId=userData.userId;
  const messages=await Message.find({
    sender:{$in:[userId,ourUserId]},
    recipient:{$in:[userId,ourUserId]},
  }).sort({createrAt:1})
  res.json(messages);

})

const server=app.listen(4040)
console.log("Server running on port 4040")

const wss=new ws.WebSocketServer({server});
wss.on("connection",(connection,req)=>{

  function notifyAboutOnlinePeople(){
    [...wss.clients].forEach(client=>{
      client.send(JSON.stringify({
        online:[...wss.clients].map(c=>({userId:c.userId,username:c.username})),
      }))
    })
  }

  connection.isAlive=true;
  connection.timer=setInterval(()=>{
    connection.ping();
    connection.deathTimer=setTimeout(()=>{
      connection.isAlive=false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyAboutOnlinePeople();
      console.log("Connection is dead now!!!");
    },1000)
  },5000)

  connection.on("pong",()=>{
    clearInterval(connection.deathTimer);
  })

  const cookies=req.headers.cookie;
  if(cookies){
    const cookieString=req.headers.cookie.split(';').find(str=>str.startsWith("token="));
    if(cookieString){
      const token=cookieString.split('=')[1];
      if(token){
        jwt.verify(token,jwtSecret,{},(err,userData)=>{
          if(err) throw err;
          const {userId,username}=userData;
          connection.userId=userId;
          connection.username=username;
        })
      }
    }
  }

  connection.on('message',async(message)=>{
    const messageData=JSON.parse(message.toString());
    const {recipient,text,file}=messageData;
    let filename=null;
    if(file){
      console.log(`file size : `,file.data.length);
      const filepart=file.name.split('.');
      const ext=filepart[filepart.length-1];
      filename=Date.now()+'.'+ext;
      const path=__dirname + '/uploads/' + filename;
      const bufferData=Buffer.from(file.data.split(',')[1],'base64')
       fs.writeFile(path, bufferData, () => {
        console.log('file saved:'+path);
      });
    }
    if(recipient && (text || file)){
      const messageDoc=await Message.create({
        sender:connection.userId,
        recipient,
        text,
        file:file?filename:null,
      })
      console.log("message created");
      [...wss.clients].filter(c=>c.userId==recipient).
      forEach(c=>c.send(JSON.stringify({
        text,
        sender:connection.userId,
        recipient,
        file:file?filename:null,
        _id:messageDoc._id,

      })))
    }
  });
  notifyAboutOnlinePeople();

})
