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
let portNumber;


//mangoDB
require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') })
username = process.env.MONGO_DB_USERNAME;
password = process.env.MONGO_DB_PASSWORD;
const uri = MONGO_CONNECTION_STRING = `mongodb+srv://${username}:${password}@cluster0.uxhmn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
const { MongoClient, ServerApiVersion } = require('mongodb');
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });



// Process args
let counter = 0;
let connected = false;



//Render appropriate pages

//index page
app.get("/", (request, response) => {
    response.render("index");
 });
 

//404
app.use((request, response) => {
    const httpNotFoundStatusCode = 404;
    response.status(httpNotFoundStatusCode).send("Resource not found");
});





//MongoDB funcs



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
    let counter = 0; 

    for (const val of args) {
        counter++;
        if (counter === 3) {
            portNumber = val;
        }
    }
    
    if (counter < 3){//not enough args
        console.log("Usage final.js portnum");
        process.exit(0);
    }
    

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