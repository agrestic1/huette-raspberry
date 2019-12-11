// Set up nodeJS webserver using http
var fs = require('fs'); //require filesystem to read html files
var express = require('express');
var app = express();
var cors = require('cors')
var http = require('http').createServer(app);

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/public/index.html'); // routes initial call to index.html
});
app.use(express.static('public')); // express public folder
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
    res.header('Access-Control-Expose-Headers', 'Content-Length');
    res.header('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, X-Requested-With, Range');
    next();
  });
 
  const corsOptions = { 
     origin: "*", 
     credentials: true 
  };
  app.use(cors(corsOptions));
  
http.listen(8020); //listen to port 8080

var clients = {}; // not yet necessary to: Store clients
//var clitenIDs = [];  // not yet necessary to: Store clients
var devices = {}; // List of devices
//var deviceIDs = []; // List of ISs of connected devices

// I2C for communication with arduino
// const i2c = require('i2c-bus');
// const MCP9808_ADDR = 0x05;

// first socket to communicate with clients
var io = require('socket.io').listen(http, {log:false, origins:'*:*'}); //require socket.io module and pass the http object
io.sockets.on('connection', (socket) => { // Socket Connection to client
    clients[socket.id] = socket; // not yet necessary to: Store clients
    console.log('New Client with ID', socket.id);
    socket.on('state', function(data) { //get content from function "state" from client
        // const i2c1 = i2c.openSync(1);
        console.log('Sending to arduino:', data);
        // const rawData = i2c1.sendByteSync(MCP9808_ADDR, data);
        // i2c1.closeSync();
    });
    socket.on('Socket2', (data) => { //get content from function "websocket"  from client
        // Websocket
        console.log('Sending to Socket2:', data);
        // Object.keys(devices).forEach((element) => {
            // devices[element].emit("event", data);
        // });
    });
    socket.on('disconnect', () => { // Do this if on client disconnetcs
        console.log('Disconnection of Client', socket.id);
        // delete clients[socket.id]; // not yet necessary to: Store clients
    });

    Object.keys(devices).forEach((element) => {
        socket.emit("attach", { device: { id: element, type: "LED" } });
    });

    socket.on('debugCommandAttach', (data) => { // Do this if on client disconnetcs
        console.log('Debug: Device attach event discovered:', data);
        io2.emit('connection', { id: Math.random(), on: (event, callback) => {

        } });
    });

});

// // ------------------------------- DEVICE SOCKET ----------------------------------------
// // Socket2 to communicate with devices
var app2 = require('http').createServer()
var io2 = require('socket.io')(app2);
app2.listen(8081); // this one listens to 8081

io2.on('connection', function(socket) {
    console.log('New Device with ID', socket.id);
    socket.on("jsonObject", function(data) {
        console.log(data);
    });

    // TODO: gather device type information upon connection event "LED is just a dummy placeholder"
    Object.keys(clients).forEach((element) => {
        clients[element].emit("attach", { device: { id: socket.id, type: "LED" } });
    });

    devices[socket.id] = socket; // Store object to make it available for other functions
    //deviceIDs.push(socket.id); // And store its ID in an array
    socket.on('disconnect', function() { // Do this if a device disconnetcs
        console.log('Disconnection of ID', socket.id);

        Object.keys(clients).forEach((element) => {
            clients[element].emit("detach", { device: { id: socket.id, type: "LED" } });
        });

        delete devices[socket.id]; // delete element
    });
});