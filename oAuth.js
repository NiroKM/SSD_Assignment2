/* Client Credentials*/
const oAuth2Cred = require('./credentials.json')

const CLIENT_ID = oAuth2Cred.web.client_id
const CLIENT_SECRET = oAuth2Cred.web.client_secret
const REDIRECT_URL = oAuth2Cred.web.redirect_uris[0]

module.exports = {
    CLIENT_ID:CLIENT_ID,
    CLIENT_SECRET:CLIENT_SECRET,
    REDIRECT_URL:REDIRECT_URL
}