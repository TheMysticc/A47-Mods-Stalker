const express = require('express')
const dotenv = require('dotenv');
const path = require('path');
const { Server } = require('ws');
const PORT = process.env.PORT || 5636
const clients = new Map();
const cookieParser = require('cookie-parser')


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

      async function keyReplace(key){
        let newString;
        for(let originalLetter of Object.keys(dictionary)){
          if(key === originalLetter){
            const capitalLetter = new RegExp(String(originalLetter), "g")
            newString = String(key).replace(capitalLetter, String(dictionary[originalLetter]))
            return newString
          } else if(key === (originalLetter.toLowerCase())){
            const lowercaseLetter = new RegExp((String(originalLetter).toLowerCase()), "g")
            newString = String(key).replace(lowercaseLetter, `${String(dictionary[originalLetter])}-.`)
            return newString
          }
        }
        return false
      }

      async function decrypt(key){
        let newString;
        for(let originalLetter of Object.keys(dictionary)){
          if(key === originalLetter){
            const capitalLetter = new RegExp(String(originalLetter), "g")
            newString = String(key).replace(capitalLetter, String(dictionary[originalLetter]))
            return newString
          } else if(key === (originalLetter.toLowerCase())){
            const lowercaseLetter = new RegExp((String(originalLetter).toLowerCase()), "g")
            newString = String(key).replace(lowercaseLetter, `${String(dictionary[originalLetter])}-.`)
            return newString
          }
        }
        return false
      }

      if(sentData.action === "Encrypt"){
        const textToConvert = String(sentData.data)
        const convertedString = []
        if(textToConvert){
          const noSpaces = new RegExp(" ", "g")
          let stringLength = textToConvert.length
          await Array.from(Array(stringLength)).map(async (_, i) => {
            const partToView = textToConvert.slice(i, (i+1))
            const isConverted = await keyReplace(partToView)
            if(isConverted === false){
              convertedString.push(partToView)
            } else {
              convertedString.push(isConverted)
            }
          });
          const finalString = convertedString.join("")
          //const finalString = checkForSpacesStr.replace(noSpaces, `_`)
          ws.send(JSON.stringify({
            action: "updateResult",
            data: finalString
          }))
        }
      } else if(sentData.action === "Decrypt"){
        const textToConvert = String(sentData.data)
        if(textToConvert){
          let newString = textToConvert
          
          for(let originalLetter of Object.keys(dictionary)){
            if(newString.indexOf(dictionary[originalLetter]) !== -1){
              const capitalLetter = new RegExp(String(dictionary[originalLetter]), "g")
              newString = String(newString).replace(capitalLetter, String(originalLetter))
            }
            if(newString.indexOf((originalLetter + `-.`)) !== -1){
              const lowercaseLetter = new RegExp(`${(String(originalLetter))}-.`, "g")
              newString = newString.replace(lowercaseLetter, `${String(originalLetter).toLowerCase()}`)
            }
          }
          ws.send(JSON.stringify({
            action: "updateResult",
            data: newString
          }))
        }
      }
    }

  });

  ws.on("close", () => {
    
  });
});
