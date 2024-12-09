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
app.use(express.json());
app.use(express.static("public"));
let portNumber = 5050;


//mangoDB
require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') })
username = process.env.MONGO_DB_USERNAME;
password = process.env.MONGO_DB_PASSWORD;
const uri = MONGO_CONNECTION_STRING = `mongodb+srv://${username}:${password}@cluster0.zxafx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
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
const tracklimit = 10; //number of tracks to return from a search

// Process args
let connected = false;



//Render appropriate pages

//default page, generate the spotify token, redirect to index.html
app.get("/", (request, response) => {
    response.render("index")
});

//homepage
app.get("/home", (request, response) => {
    response.render("home");
});

//Login page
app.get("/login", (request, response) => {
    response.redirect(spotifyApi.createAuthorizeURL(scopes));
});

app.get("")

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
          //console.log('The token expires in ' + data.body['expires_in']);
          //console.log('The access token is ' + data.body['access_token']);
          //console.log('The refresh token is ' + data.body['refresh_token']);
      
          // Set the access token on the API object to use it in later calls
          spotifyApi.setAccessToken(data.body['access_token']);
          spotifyApi.setRefreshToken(data.body['refresh_token']);

          
          response.redirect("home");
            
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
app.get("/search", async (request, response) => {
    const {q} = request.query;
    //console.log(request)
    //console.log("\n\nSearch Query: ", q,"\n\n");

    const tokenData = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(tokenData.body.access_token);

    spotifyApi.searchTracks(q, { limit: tracklimit}).then(searchData=>{
        //const trackURL = searchData.body.tracks.items[0].uri;
        console.log(`\nGot ${searchData.body.tracks.items.length} songs`);
        /*console.log("TrackResponse: ", searchData);
        searchData.body.tracks.items.forEach((item, index) =>{
            console.log(`Track #${index}: ${item.name}`);
        });*/ //This returned a list of tracks, yipee
        let reply = searchData.body.tracks;
        //console.log(reply);
        response.json(reply);
    }).catch(error=>{
        console.error("Error:", error);
        response.status(500).send({ error: error.message });
    })

});



app.get("/search-and-play", async (request, response) => {
    const q = request.body.q;
    let trackURL;

    console.log("trying to search and play: ", q)
    
    const tokenData = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(tokenData.body.access_token);

    spotifyApi.searchTracks(q).then(searchData=>{
        trackURL = searchData.body.tracks.items[0].uri;
    }).catch(error=>{
        console.error("Error:", error);
        response.status(500).send({ error: error.message });
    }).then(

    //play the song
    spotifyApi.play({uris:[trackURL]}).then(()=>{
        response.send('started playing')
    }).catch(error=>{
        console.error("Error:", error);
        response.status(500).send({ error: error.message });
    }))

    console.log("Searched for song:", query);
});

app.get("/get_reviews_for", async (request, response) => {
    const { songTitle } = request.query;
    //console.log("asking for reviews for ", songTitle);
    let temp = await getAllReviews_forSong(songTitle);
    
    response.json(temp);
});

app.post("/leave_review_for", async (request, response) => {
    const { songTitle, review } = request.body;
    console.log(`Leaving a review for ${songTitle} that says ${review}`);
    let ret = insertReview({songTitle: songTitle, review: review});
    console.log("Meow, hear");
    response.json({songTitle: songTitle, review: review});
});

app.get("/get_number_reviews", async (request, response) => {
    const { songTitle } = request.query;
    //console.log("asking for reviews for ", songTitle);
    let temp = await getAllReviews_forSong(songTitle);
    let x = temp.length;
    //console.log("val:",x);
    response.json({length: x});
});

//404
app.use((request, response) => {
    const httpNotFoundStatusCode = 404;
    response.status(httpNotFoundStatusCode).send("Resource not found");
});





//MongoDB funcs
async function insertReview(review){
    dbName = process.env.MONGO_DB_NAME;
    collectionName = process.env.MONGO_COLLECTION;
    
    const result = await client.db(dbName).collection(collectionName).insertOne(review);
    console.log("left a review, result: ", result);
    return result;
   
}
async function getAllReviews(){
    dbName = process.env.MONGO_DB_NAME;
    collectionName = process.env.MONGO_COLLECTION;
   
    const result = await client.db(dbName).collection(collectionName).find({});
    const ret = await result.toArray();
    return ret;
}

async function getAllReviews_forSong(song){
    dbName = process.env.MONGO_DB_NAME;
    collectionName = process.env.MONGO_COLLECTION;
    //console.log("getting reveiws for: ", song)
    const result = await client.db(dbName).collection(collectionName).find({});
    const array = await result.toArray();
    let ret = [];
    array.forEach(item =>{
        if(item.songTitle === song){
            //console.log(item.songTitle, ": matches :", song);
            ret.push(item);
        }
    });
    //console.log("all reviews:", ret);
    return ret;
}





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