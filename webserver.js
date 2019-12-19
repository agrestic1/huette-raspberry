// Set up nodeJS webserver using http
var fs = require('fs'); //require filesystem to read html files
var express = require('express');
var app = express();
var cors = require('cors')
var http = require('http').createServer(app);
var http2 = require('http').createServer(app);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html'); // routes initial call to index.html
});
app.use(express.static('public')); // express public folder
// app.use(function (req, res, next) {
//     res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
//     res.header('Access-Control-Allow-Credentials', 'true');
//     res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
//     res.header('Access-Control-Expose-Headers', 'Content-Length');
//     res.header('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, X-Requested-With, Range');
//     next();
// });

// const corsOptions = {
//     origin: "*",
//     credentials: true
// };
// app.use(cors(corsOptions));

var clients = {}; // List of clients
var devices = {}; // List of devices

// first socket to communicate with clients
var io = require('socket.io')(http, { log: false, origins: '*:*', path: "/LosOchos.org/socket.io" }); //require socket.io module and pass the http object

http.listen(8020, '0.0.0.0', function () { //listen to port 8020
    console.log("Waiting for clients on", "http://" + http.address().address + ":" + http.address().port);
});

io.sockets.on('connection', (socket) => { // Socket Connection to client
    clients[socket.id] = socket; // not yet necessary to: Store clients
    console.log('New Client with ID', socket.id);

    // Send attach event to client for every device in list
    Object.keys(devices).forEach((element) => {
        socket.emit("attach", { device: { id: element } });
    });

    // Invoke publish event on every device in list
    Object.keys(devices).forEach((element) => {
        devices[element].emit("publish", { payload: {} });
    });

    socket.on('get', (data) => { // Do this if on client disconnetcs
        console.log('Get command received:', data);
        try {
            devices[data.id].emit("get", data.payload);
        } catch (error) {
            console.error("Device not found!");
        }
    });

    socket.on('set', (data) => { // Do this if on client disconnetcs
        console.log('Set command received:', data);
        try {
            devices[data.id].emit("set", data.payload);
        } catch (error) {
            console.error("Device not found!");
        }
    });

    socket.on('disconnect', () => { // Do this if on client disconnetcs
        console.log('Disconnection of Client', socket.id);
        // delete clients[socket.id]; // not yet necessary to: Store clients
    });

    socket.on('debugCommandAttach', (data) => { // Do this if on client disconnetcs
        console.log('Debug: Device attach event discovered:', data);
        let here_id = Math.random().toString();
        io2.emit('connection', {
            id: here_id, on: (event, callback) => {

            },
            emit: (event, ...args) => {
                setTimeout(() => {
                    console.log("Device response:", event, data);
                    Object.keys(clients).forEach((element) => {
                        clients[element].emit(event, { device: { id: here_id, payload: { name: data.name, type: data.type } } });
                    });
                }, 100);

            },
            disconnect: () => {
                console.log('Disconnection of ID', here_id);

                Object.keys(clients).forEach((element) => {
                    clients[element].emit("detach", { device: { id: here_id } });
                });

                delete devices[here_id]; // delete element
            }
        });
    });

    socket.on('debugCommandDetach', (data) => { // Do this if on client disconnetcs
        setTimeout(() => {
            try {
                devices[data.id].disconnect();
            } catch (error) {
                console.error("Device not found!");
            }
        }, 100);
        // console.log('Disconnection of ID', data.id);

        // Object.keys(clients).forEach((element) => {
        //     clients[element].emit("detach", { device: { id: data.id } });
        // });

        // delete devices[data.id]; // delete element
    });

});

// // ------------------------------- DEVICE SOCKET ----------------------------------------
// // Socket2 to communicate with devices
var io2 = require('socket.io')(http2, {
    log: false,
    origins: '*:*',
    pingInterval: 2000,
    pingTimeout: 10000
});

http2.listen(8030, '0.0.0.0', function () { //listen to port 8030
    console.log("Waiting for devices on", "http://" + http2.address().address + ":" + http2.address().port);
});

io2.on('connection', (socket) => {
    devices[socket.id] = socket; // Store object to make it available for other functions

    console.log('New Device with ID', socket.id);
    socket.emit("publish", { payload: {} });

    // TODO: gather device type information upon connection event "LED is just a dummy placeholder"
    Object.keys(clients).forEach((element) => {
        clients[element].emit("attach", { device: { id: socket.id } });
    });

    socket.on("get", function (data) {
        console.log("Device GET response:", data);
        Object.keys(clients).forEach((element) => {
            clients[element].emit("get", { device: { id: socket.id, payload: data } });
        });
    });

    socket.on("set", function (data) {
        console.log("Device SET response:", data);
        Object.keys(clients).forEach((element) => {
            clients[element].emit("set", { device: { id: socket.id, payload: data } });
        });
    });

    socket.on("publish", function (data) {
        console.log("Device PUBLISH response:", data);
        Object.keys(clients).forEach((element) => {
            clients[element].emit("publish", { device: { id: socket.id, payload: data } });
        });
    });

    socket.on("write_eeprom", function (data) {
        console.log("Device response:", data);
    });

    socket.on("error", function (data) {
        console.log("Device response:", data);
    });

    socket.on('disconnect', function () { // Do this if a device disconnetcs
        console.log('Disconnection of ID', socket.id);

        Object.keys(clients).forEach((element) => {
            clients[element].emit("detach", { device: { id: socket.id } });
        });

        delete devices[socket.id]; // delete element
    });
});