const express = require('express')
const { google } = require('googleapis')
const multer = require('multer')
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URL } = require('./oAuth')
const { DRIVE_SCOPE, USER_SCOPE } = require('./scopes')


const app = express()

let name,profPic

const oAuthClient = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URL
)

const SCOPES = DRIVE_SCOPE+" "+USER_SCOPE

let isUserAuthed = false

app.set("view engine", "ejs")

app.get('/', (req, res) => {
    if(!isUserAuthed){
        let url = oAuthClient.generateAuthUrl({
            access_type:'offline',
            scope:SCOPES
        })
        console.log(url)
        res.render('index',{url:url}) 
    }else{
        
        let oAuth2 = google.oauth2({
            auth:oAuthClient,
            version:'v2'
        })

        oAuth2.userinfo.get((error,response)=>{
            if(error)
                throw error
            
            console.log(response.data)
            name = response.data.name
            profPic = response.data.picture
            res.render("success", {name:name, profPic:profPic})
        })
    }
})

app.get('/google/callback',(req,res)=>{
    const code = req.query.code
    if(code){
        oAuthClient.getToken(code,(error,accessToken)=>{
            if(error){
                console.log("Error when Authenticating User")
                console.log(error)
            }else{
                console.log("User Authenticated successfully")
                console.log(accessToken)
                oAuthClient.setCredentials(accessToken)
                isUserAuthed = true
                res.redirect('/')
            }
        })
    }
})

var Storage = multer.diskStorage({
    destination: function (req, file, callback) {
      callback(null, "./images");
    },
    filename: function (req, file, callback) {
      callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
    },
  });
  
  var upload = multer({
    storage: Storage,
  }).single("file"); //Field name and max count

app.listen(5000, () => {
    console.log("App started on Port 5000")
})