const fs = require('fs');
const express = require('express');
const https = require('https');
const http = require('http');
const app = express();
const path = require('path');

const privateKey = fs.readFileSync(__dirname + '/ssl/server.key');
const certificate = fs.readFileSync(__dirname + '/ssl/server.crt');

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/dist/index.html'));
});

app.use('/public', express.static(__dirname + '/dist/assets'));
app.use('/', express.static(__dirname + '/dist/'));

https.createServer({
    key: privateKey,
    cert: certificate
}, app).listen(8082);
