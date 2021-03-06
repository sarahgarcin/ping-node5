var express = require('express'); //inclusion du framework express
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io').listen(http); // création d'un objet app avec express + serveur + socket.io

var config  = require('./config');
var fs = require('fs');
var request = require('request');

/*
* Server config
*/
config(app, express);


// server.listen(1337);
// io.set('log level', 1)

// app.use(express.static(__dirname + '/public'));

// var req = app.get('/', function (req, res) { // c'est ici qu'on indique les différentes routes (URLs)
//   //res.sendfile(__dirname + '/public/index.html');
// });

/**
* routing
*/
//Handle route "GET /", as in "http://localhost:8080/"
app.get("/", getIndex);

/**
* routing functions
*/
/* GET */
function getIndex(req, res) {
    res.render("index", {title : "Ping"});
};

var users = [];
var clients =[];
var socketCount = 0;

io.sockets.on('connection', function (socket) {

    // Socket has connected, increase socket count
    socketCount++

    // Let all sockets know how many are connected
    io.sockets.emit('users connected', socketCount);
    clients.push(socket);

    socket.on('nouveau_client', function (user) {
        socket.user = user;
        users.push(user);
        updateClients();

    });

    // Reçoit le contenu "notes"
    socket.on('sendnotes', function (data) {
        var fileName = __dirname + '/public/sessions/diplome/' + socket.user + ".txt"; // créer un fichier texte dans lequel vont s'écrire les données
        var fileBrut = __dirname + '/public/sessions/diplome/' + socket.user + "-" + "brut.txt"; // créer un fichier texte dans lequel vont s'écrire les données
        fs.writeFileSync(fileBrut, data.text); // Écrire dans les notes dans un fichier texte
        fs.writeFile(fileName, JSON.stringify(data), function (err){ // Écrire dans les notes + timestamp + user dans un fichier json
            console.log(err);
        });
        socket.broadcast.emit('receivenotes', data); // Envoyer les "notes" à tous les users connectés
    });

    socket.on('user image', function (data) {
        var time = new Date();
        var ts = time.getHours() +"-" + time.getMinutes() + "-" + time.getSeconds();
        var fileName = __dirname + '/public/sessions/diplome/images/' + ts + "_" + socket.user + ".jpg";

        var imageBuffer = decodeBase64Image(data);

        fs.writeFile(fileName, imageBuffer.data, function (err) {
            console.info("write new file to " + fileName);
        });   

        socket.broadcast.emit('user image', socket.user, data);
    });

    socket.on('image url', function (data){
        var time = new Date();
        var ts = time.getHours() +"-" + time.getMinutes() + "-" + time.getSeconds();
        var fileName = __dirname + '/public/sessions/diplome/images/' + ts + "_" + socket.user + ".jpg";
        var download = function(uri, filename, callback){
            request.head(uri, function(err, res, body){
                console.log('content-type:', res.headers['content-type']);
                console.log('content-length:', res.headers['content-length']);

                request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
            });
        };
        download(data, fileName, function(){
            console.log('done');
        }); 

        socket.broadcast.emit('image url', socket.user, data);
        // io.sockets.emit('image url', socket.user, data);
    })

    socket.on('comment image', function (message){
        var time = new Date();
        var ts = time.getHours() +"-" + time.getMinutes() + "-" + time.getSeconds();
        var fileName = __dirname + '/public/sessions/diplome/images/' + ts + "_" + socket.user + ".txt";
        fs.writeFile(fileName, message);
        socket.broadcast.emit('comment image', message);
    });

    socket.on('comment imageWeb', function (comment){
        var time = new Date();
        var ts = time.getHours() +"-" + time.getMinutes() + "-" + time.getSeconds();
        var fileName = __dirname + '/public/sessions/diplome/images/' + ts + "_" + socket.user + ".txt";
        fs.writeFile(fileName, comment);
        socket.broadcast.emit('comment imageWeb', comment);
    });

    socket.on('disconnect', function (user) {
        for(var i=0; i<users.length; i++) {
            if(users[i] == socket.user) {
                users.splice(i, 1);
            }
        }
        updateClients();

        // Decrease the socket count on a disconnect, emit
        socketCount--
        io.sockets.emit('users connected', socketCount);

        for(var i=0; i<clients.length; i++) {
            if(clients[i] == socket) {
                clients.splice(i, 1);
                // console.log("client disconnect");
            }
        }

    });

});


function updateClients() {
    io.sockets.emit('update', users);
}

function decodeBase64Image(dataString) {
    var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
    response = {};

    if (matches.length !== 3) {
        return new Error('Invalid input string');
    }

    response.type = matches[1];
    response.data = new Buffer(matches[2], 'base64');

    return response;
}

/**
* Start the http server at port and IP defined before
*/
http.listen(app.get("port"), /*app.get("ipaddr"),*/ function() {
  console.log("Server up and running. Go to http://" + app.get("ipaddr") + ":" + app.get("port"));
});


