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

//GET localhost:5000/
//Home page Route
//Public
app.get('/', (req, res) => {
    if (!isUserAuthenticated) {
        let url = oAuthClient.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES
        })
        res.render('home', { url: url })
    } else {
        let oAuth2 = google.oauth2({
            auth: oAuthClient,
            version: 'v2'
        })

        oAuth2.userinfo.get((error, response) => {
            if (error)
                throw error

            name = response.data.name
            profPic = response.data.picture
            res.render("selection", { name: name, profPic: profPic })
        })
    }
})

//GET localhost:5000/google/callback
//Authenticating user using goole account and getting accessToken
//Private
app.get('/google/callback', (req, res) => {
    const code = req.query.code
    if (code) {
        oAuthClient.getToken(code, (error, accessToken) => {
            if (error) {
                console.log("Error when Authenticating User")
                console.log(error)
            } else {
                console.log("User Authenticated successfully")
                oAuthClient.setCredentials(accessToken)
                isUserAuthenticated = true
                res.redirect('/')
            }
        })
    }
})

//GET localhost:5000/drive
//Redirecting user to drive upload page if user is authenticated
//Private
app.get('/drive', (req, res) => {
    if (isUserAuthenticated) {
        res.render("drive_success", { name: name, profPic: profPic, success: false })
    } else {
        res.redirect('/')
    }
})

//GET localhost:5000/youtube
//Redirecting user to youtube upload page if user is authenticated
//Private
app.get('/youtube', (req, res) => {
    if (isUserAuthenticated) {
        // res.render("youtube_page_name", { name: name, profPic: profPic, success: false })
    } else {
        res.redirect('/')
    }
})

//GET localhost:5000/logout
//Logging out the authenticated user
//Public
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


//GET localhost:5000/upload
//upload file to drive
//Private  - need accessToken
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

        //upload using drives' create api
        drive.files.create({
            resource: fileMetaData,
            media: media,
            fields: "id"
        }, (err, file) => {
            if (err)
                throw err

            //delete the file in images folder
            fs.unlinkSync(req.file.path)
            res.render("drive_success", { name: name, profPic: profPic, success: true })
        })
    })
})

app.get('/test', (req, res) => {
    res.render("success2")
})

app.listen(5000, () => {
    console.log("App started on Port 5000")
})