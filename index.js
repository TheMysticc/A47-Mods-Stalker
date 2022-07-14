const express = require('express')
const dotenv = require('dotenv');
const path = require('path');
const { Server } = require('ws');
const PORT = process.env.PORT || 5636
const clients = new Map();
const cookieParser = require('cookie-parser')
const findPlayer = require('./modules/playerTracker')
const gameId = 1581113210
const bulkModerationGroupId = 5649380

async function getGroupUsers(groupId){
  return new Promise(async (resolve, reject) => {
    let responseData = []
    let finished = false
    let checkingInterval;
    let pageCursorsViewed = 0
    async function addMembers(groupId, cursor){
        request(`https://groups.roblox.com/v1/groups/${groupId}/users?sortOrder=Asc&limit=100${cursor !== undefined ? `&cursor=${cursor}` : ``}`, {
            method: "GET",
            headers: {
            "Content-Type": "application/json",
            },
        }).then(data => {
            const parsedData = JSON.parse(data)
            for(let user of parsedData.data){
                responseData.push(user)
            }
            if(parsedData.nextPageCursor !== null && pageCursorsViewed < 4){
                addMembers(groupId, parsedData.nextPageCursor)
                pageCursorsViewed++
            } else {
                finished = true
            }
        })
        .catch(err => {
            console.log(err)
            finished = true
        })
    }
    addMembers(groupId)
    checkingInterval = setInterval(function(){
        if(finished === true){
            clearInterval(checkingInterval)
            resolve(responseData)
        }
    },100)
  })
}


dotenv.config();

function uuidv4() {
  return 'xxxxxxxx_xxxx_4xxx_yxxx_xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const server = express()
  .use(express.json())
  .use(cookieParser())
  .use(express.static(path.join(__dirname, 'public')))
  .set('views', path.join(__dirname, 'views'))  
  .set('view engine', 'ejs')
  .post('/api/validateLogin', async function (req, res, next) {
    const body = req.body
    
    async function getExpiryTime(days){
      const expiryTime = (86400 * Number(days)) || 604800
      var currentUnixTime = Math.round((new Date()).getTime() / 1000)
      const finalTime = currentUnixTime + expiryTime
      return finalTime
    }

    if(body.password === "0239"){
      const cookie = await uuidv4()
      clients.set(cookie, {
        cookie: cookie,
        sessionExpires: await getExpiryTime(1)
      })
      res.cookie('sessionToken',cookie, { maxAge: 86400000, httpOnly: true })
      return res.send({message: "Success", status: 200}).status(200)
    }

    return res.send({message: "Invalid Password", status: 401}).status(401)
  })
  .use(function (req, res, next) {
    if(req.cookies === undefined){
      return res.render('pages/login')
    }
    var cookie = req.cookies.sessionToken;
    if (cookie === undefined) {
      return res.render('pages/login')
    } else {
      const cookieData = clients.get(cookie)
      if(cookieData){
        if(cookieData.sessionExpires > (Math.round((new Date()).getTime() / 1000))){
          next()
        } else {
          res.clearCookie('sessionToken')
          clients.delete(cookie)
        }
      } else {
        res.clearCookie('sessionToken')
        return res.render('pages/login')
      }
    } 
  })
  .get('/api/getToken', async function (req, res, next) {
    return res.send(req.cookies)
  })
  .get('/', async function (req, res, next) {
    const isOnline = findPlayer()
    res.render(`pages/index`);
  })
  .use(function (err, req, res, next) {
    res.status(err.status || 500).send(err.message)
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

const wss = new Server({ server });

// Websockets
wss.on('connection', (ws) => {

  ws.on('message', async (messageAsString) => {
    const sentData = JSON.parse(messageAsString)
    if(!sentData.sessionToken){

    } else {
      //-- Validating Session Token
      async function validateCookie(cookie){
        const cookieData = clients.get(cookie)
        if(cookieData){
          if(cookieData.sessionExpires > (Math.round((new Date()).getTime() / 1000))){
            return true
          } else {
            return false
          }
        } else {
          return false
        }
      }

      if(await validateCookie(sentData.sessionToken) === false) return;

      if(sentData.action === "getOnlineModerators"){
        const groupMembers = await getGroupUsers(bulkModerationGroupId)
        console.log(groupMembers[0])
        for(let member of groupMembers){

        }
        ws.send(JSON.stringify({
          action: "sendModerators",
          data: ""
        }))
      }
    }

  });

  ws.on("close", () => {
    
  });
});
