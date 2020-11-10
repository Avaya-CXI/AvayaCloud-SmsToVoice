const express = require('express');
const https = require('https');
const cpaas = require('@avaya/cpaas'); //Avaya cloud
let enums = cpaas.enums;
let ix = cpaas.inboundXml;
const bodyParser = require('body-parser');
const cookieParse = require('cookie-parser');
const fs = require('fs');
const axios = require('axios');

const CPAAS_SID = ""; //Your Avaya Cloud SID
const CPAAS_TOKEN = ""; //Your Avaya Cloud Auth Token
const CPAAS_SEND_NUMBER = ""; //The number that you own that you want Avaya Cloud to send the SMS from
const CPAAS_OUTBOUND_CALL_NUMBER = ""; //The number that you own that you want Avaya Cloud to initiate the outbound call from
const FORWARD_TO_NUMBER = ""; //The number you would like to use as the end destination

const PROTOCOL = "https"; //The protocol of the application that is being hosted
const HOST = ""; //Host of the application
const URL_PORT = 5004; //The Port that the application is being served from
const BASE_URL = PROTOCOL + "://" + HOST + ":" + URL_PORT;
const INCOMING_SMS_PATH = "/IncomingSms/"
const INCOMING_SMS_URL = BASE_URL + INCOMING_SMS_PATH; //The URL that should handle the incoming SMS
const OUTBOUND_CALL_PATH = "/OutboundCall/";
const OUTBOUND_CALL_URL = BASE_URL + OUTBOUND_CALL_PATH; //The URL where the outbound call will forward to the original customer

const CHAIN_FILE =  ""; //Path to Chain File for HTTPS Cert
const KEY_FILE = ""; //Path to Key File for HTTPS Cert

let key = fs.readFileSync(KEY_FILE).toString();
let cert = fs.readFileSync(CHAIN_FILE).toString();

let httpsOptions = {
        key: key,
        cert: cert
};


//Tells the application to use express and the bodyParser as middleware to easily parse JSON
let app = express();
app.use(bodyParser.urlencoded({
    extended : true
}));
app.use(bodyParser.json()); //Tries to parse incoming HTTP request bodies as JSON


let httpsServer = https.createServer(httpsOptions, app); //Creates the HTTPS Server
httpsServer.listen(URL_PORT, function(){ //Tells the HTTPS Server to listen on a specific port
    console.log("Listening: " , URL_PORT.toString());
});

//This is where the endpoints are set up to handle the incoming request
app.post(INCOMING_SMS_PATH , incomingSms);
app.post(OUTBOUND_CALL_PATH , outboundCall);




async function incomingSms(req , res)
{
    let body = req.body.Body;
    let customer = req.body.From;
    let sendNumber = req.body.To;

    let xml = null;
    if(body == "1") {
        xml = generateSMS(customer , sendNumber , "You will be receiving a phone call shortly!");
        makeOutboundCall(customer);
    } else {
        xml = generateSMS(customer , sendNumber , "If you would like for one of our agents to reach out to you, please respond with 1 and then you will receive a call shortly.");
    }

    let xmlResponse = await buildCPaaSResponse(xml);

    res.type('application/xml');
    res.send(xmlResponse);
}

async function outboundCall(req , res)
{
    let target = req.query.target;

    console.log("Outbound Call: " , target);

    let xml = [];

    let number = ix.number({number : target});
    let forward = ix.dial({
        content : number
    });

    xml.push(forward);

    xml = ix.response({content: xml});
    let xmlResponse = await buildCPaaSResponse(xml);

    res.type('application/xml');
    res.send(xmlResponse);
}

function generateSMS(customer , cpaas , body)
{
    var sms = ix.sms({
          text : body ,
          to : customer ,
          from : cpaas
    });

    var xml_content = [];
    xml_content.push(sms);
    var xmlDefinition = ix.response({content: xml_content});

    return xmlDefinition;
}



function makeOutboundCall(personToCall)
{
    var connector = new cpaas.CallsConnector({
        accountSid: CPAAS_SID,
        authToken: CPAAS_TOKEN
    });

      connector.makeCall({
      to: FORWARD_TO_NUMBER,
      from: CPAAS_OUTBOUND_CALL_NUMBER,
      url: OUTBOUND_CALL_URL + "?target=" + encodeURIComponent(personToCall),
      method: enums.HttpMethod.POST
    }).then(function (call) {
      console.log(call.sid);
    });
}

async function buildCPaaSResponse(xmlDefinition)
{
      var result = await ix.build(xmlDefinition).then(function(xml){
          return xml;
      }).catch(function(err){
          console.log('The generated XML is not valid!', err);
      });

      return result;
}
