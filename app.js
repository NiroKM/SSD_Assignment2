var express =require('express')

 const OAuth2Data =require('./credentials.json')

 const {google, oauth2_v2} =require('googleapis')

 const multer =require('multer')

 const fs=require('fs')

 var title,description
 var tags=[]

var app=express()

app.set("view engine","ejs")

//handle authendication
const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL
);

var authed=false
var SCOPES=  "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/userinfo.profile";

var Storage = multer.diskStorage({
    destination: function (req, file, callback) {
      callback(null, "./videos");
    },
    filename: function (req, file, callback) {
      callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
    },
  });
  
  var upload = multer({
    storage: Storage,
  }).single("file"); //Field name and max count


app.get('/' ,(req,res)=>{

    if(!authed){
        //generate a oauth url
        var url = oAuth2Client.generateAuthUrl({
            access_type: "offline",
            scope: SCOPES,
          });
          res.render("index",{url:url})

    }
    else{
        // user is authendicated
        var oauth2 = google.oauth2({
            auth: oAuth2Client,
            version: "v2",
          });

          oauth2.userinfo.get(function(err,response){
              if(err)throw err
              console.log(response.data)
              var name=response.data.name
              var pic =response.data.picture

              res.render("success",{name:name,pic:pic,
                success: false,})

          })
    }

})




app.post("/upload", (req, res) => {
    upload(req, res, function (err) {
      if (err) {
        console.log(err);
        return res.end("Something went wrong");
      } else {
        console.log(req.file.path);
        title = req.body.title;
        description = req.body.description;
        tags = req.body.tags;
        console.log(title);
        console.log(description);
        console.log(tags);
        const youtube = google.youtube({ version: "v3", auth: oAuth2Client });
        console.log(youtube)
        youtube.videos.insert(
          {
            resource: {
              // Video title and description
              snippet: {
                  title:title,
                  description:description
              },
              // I don't want to spam my subscribers
              status: {
                privacyStatus: "private",
              },
            },
            // This is for the callback function
            part: "snippet,status",
  
            // Create the readable stream to upload the video
            media: {
              body: fs.createReadStream(req.file.path)
            },
          },
          (err, data) => {
            if(err) throw err
            console.log(data)
            console.log("Done.");
            fs.unlinkSync(req.file.path);
            res.render("success", { name: name, pic: pic, success: true });

          }
        );
      }
    });
  });
  
  app.get("/logout", (req, res) => {
    authed = false;
    res.redirect("/");
  });

app.get("/google/callback", function (req, res) {
    const code = req.query.code;
    if (code) {
      // Get an access token based on our OAuth code
      oAuth2Client.getToken(code, function (err, tokens) {
        if (err) {
          console.log("Error authenticating");
          console.log(err);
        } else {
          console.log("Successfully authenticated");
          console.log(tokens);
          oAuth2Client.setCredentials(tokens);
  
          authed = true;
          res.redirect("/");
        }
      });
    }
  });

app.listen(5000,()=>{
    console.log("App is listening on port 5000")
})