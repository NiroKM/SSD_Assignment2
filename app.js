const express = require('express')
const { google } = require('googleapis')
const multer = require('multer')
const fs = require('fs')
const path = require("path")
const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URL } = require('./oAuth')
const { DRIVE_SCOPE, USER_SCOPE } = require('./scopes')


const app = express()

let name, profPic

const oAuthClient = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URL
)

const SCOPES = DRIVE_SCOPE + " " + USER_SCOPE

let isUserAuthenticated = false

app.set("view engine", "ejs")

app.get('/', (req, res) => {
    if (!isUserAuthenticated) {
        let url = oAuthClient.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES
        })
        console.log(url)
        res.render('index', { url: url })
    } else {

        let oAuth2 = google.oauth2({
            auth: oAuthClient,
            version: 'v2'
        })

        oAuth2.userinfo.get((error, response) => {
            if (error)
                throw error

            console.log(response.data)
            name = response.data.name
            profPic = response.data.picture
            res.render("success", { name: name, profPic: profPic, success: false })
        })
    }
})

app.get('/google/callback', (req, res) => {
    const code = req.query.code
    if (code) {
        oAuthClient.getToken(code, (error, accessToken) => {
            if (error) {
                console.log("Error when Authenticating User")
                console.log(error)
            } else {
                console.log("User Authenticated successfully")
                console.log(accessToken)
                oAuthClient.setCredentials(accessToken)
                isUserAuthenticated = true
                res.redirect('/')
            }
        })
    }
})

//logout function 
app.get('/logout', (req, res) => {
    isUserAuthenticated = false
    res.redirect('/')
})

const Storage = multer.diskStorage({
    destination: function (req, file, callback) {
        let dir = './images'
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir)
        }
        callback(null, "./images");
    },
    filename: function (req, file, callback) {
        callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
    },
});

const upload = multer({
    storage: Storage,
}).single("file"); //Field name and max count


//creating a drive object
const drive = google.drive({
    version: 'v3',
    auth: oAuthClient
})

app.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err)
            throw error

        console.log(req.file.path)

        const fileMetaData = {
            name: req.file.filename
        }

        const media = {
            mimeType: req.file.mimetype,
            body: fs.createReadStream(req.file.path)
        }

        //upload using drive api
        drive.files.create({
            resource: fileMetaData,
            media: media,
            fields: "id"
        }, (err, file) => {
            if (err)
                throw err

            //delete the file in images folder
            fs.unlinkSync(req.file.path)
            res.render("success", { name: name, profPic: profPic, success: true })
        })
    })
})

app.listen(5000, () => {
    console.log("App started on Port 5000")
})