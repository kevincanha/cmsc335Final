const { argv } = require('node:process');
let fs = require('fs');

//expresstuff
const express = require("express");   /* Accessing express module */
const app = express();  /* app is a request handler function */
// Set EJS as the view engine
app.set("view engine", "ejs");
const path = require("path");
app.set("views", path.join(__dirname, ".\\"));
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
let portNumber = 5050;


//mangoDB
require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') })
username = process.env.MONGO_DB_USERNAME;
password = process.env.MONGO_DB_PASSWORD;
const uri = MONGO_CONNECTION_STRING = `mongodb+srv://${username}:${password}@cluster0.uxhmn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
const { MongoClient, ServerApiVersion } = require('mongodb');
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

//spotify args
let yourtoken = "NOTYETRETRIEVED";
let SpotifyWebApi = require('spotify-web-api-node');
var spotifyApi = new SpotifyWebApi({
    clientId: process.env.CLIENTID,
    clientSecret: process.env.CLIENTSECRET,
    redirectUri: process.env.REDIRECTURL
});
const scopes = ['user-read-private', 'user-read-email', 'user-read-playback-state', 'user-modify-playback-state'],
  redirectUri = process.env.REDIRECTURL,
  clientId = process.env.CLIENTID,
  state = 'user-read-playback-state';
var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

// Process args
let connected = false;



//Render appropriate pages

//default page, generate the spotify token, redirect to index.html
app.get("/", (request, response) => {
    //yourtoken = getToken();
    response.redirect("/home")
});

//homepage
app.get("/home", (request, response) => {
    response.render("index")
});

//Login page
app.get("/login", (request, response) => {
    response.redirect(spotifyApi.createAuthorizeURL(scopes));
});

//handle callbacks
app.get("/callback", (request, response) => {
    const error = request.query.error;
    const code = request.query.code;
    const state = request.query.state;

    if(error){
        let errortext = `Error ${error}`;
        console.error(errortext);
        response.send(errortext);
        return;
    }

    spotifyApi.authorizationCodeGrant(code).then(data => {
          console.log('The token expires in ' + data.body['expires_in']);
          console.log('The access token is ' + data.body['access_token']);
          console.log('The refresh token is ' + data.body['refresh_token']);
      
          // Set the access token on the API object to use it in later calls
          spotifyApi.setAccessToken(data.body['access_token']);
          spotifyApi.setRefreshToken(data.body['refresh_token']);

          response.send("Login was a success")
            
        setInterval(async() => {
            const data = await spotifyApi.refreshAccessToken();
            const new_accesstoken = data.body['access_token'];
            spotifyApi.setAccessToken(new_accesstoken);
        }, data.body['expires_in']);
    }),function(err) {
        console.log('Something went wrong!', err);
    }
});

//Do Search page
app.get("/search", (request, response) => {
    const {query} = request.query;
    spotifyApi.searchTracks(query).then(searchData=>{
        const trackURL = searchData.body.tracks.items[0].uri;
        response.send({uri:trackURL});
    }).catch(error=>{
        response.send("Error:", error);
    })

});

app.get("/play", (request, response) => {
    const {url} = request.query;
    spotifyApi.play({uris:url}).then(()=>{
        response.send('started playing')
    }).catch(error=>{
        response.send('error playing the song')
    })
});

//showmytoken page
app.get("/showmytoken", (request, response) => {
    console.log(yourtoken);
    //console.log(getTrackInfo(yourtoken));
    response.render("showmytoken", {yourtoken});
});


 

//404
app.use((request, response) => {
    const httpNotFoundStatusCode = 404;
    response.status(httpNotFoundStatusCode).send("Resource not found");
});





//MongoDB funcs


//Spotify functions, etc

//to fetch the user's token, per the spotify guide we want to
//from the example from spotify here given here https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow
//https://github.com/spotify/web-api-examples/blob/master/authorization/client_credentials/app.js
async function getToken() {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      body: new URLSearchParams({
        'grant_type': 'client_credentials',
      }),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + (Buffer.from(process.env.CLIENTID + ':' + process.env.CLIENTSECRET).toString('base64')),
      },
    });
  
    return await response.json();
  }
//https://github.com/spotify/web-api-examples/blob/master/authorization/client_credentials/app.js
  async function getTrackInfo(access_token) {
    const response = await fetch("https://api.spotify.com/v1/tracks/4cOdK2wGLETKBW3PvgPWqT", {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + access_token },
    });
  
    return await response.json();
  }
  
  getToken().then(response => {
    getTrackInfo(response.access_token).then(profile => {
      console.log(profile)
    })
  });




//main runners

async function connectToDatabase() {
    try {
        await client.connect()
        connected = true;
        return true;
    } catch (e) {
        console.error(e);
    }
    return false;
}

async function startServer(){
    const dbConnected = await connectToDatabase().catch(console.error);
    let args = [...argv]


    //using port 5050
    if (dbConnected) {
        app.listen(portNumber, () => {
            console.log(`Web server started and running at http://localhost:${portNumber}`);
            process.stdout.write(`Stop to shutdown the server: `)
        });
    } else {
        console.error("Server failed to start due to database connection issues.");
    }

}

startServer();

process.stdin.on('data', async (input) => { 
	if (input !== null) {
		const command = input.toString().trim();
		if (command === "stop") {
			console.log("Shutting down the server");
            await client.close();
            process.exit(0);
        }else {
			console.log(`Invalid command: ${command}`);
		}
        process.stdout.write("Stop to shutdown the server: ");
    }
});