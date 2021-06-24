const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

var id = req.query.id; // $_GET["id"]

express()
  .use(express.static(path.join(__dirname, 'public')))  
  .get('/', function(req, res){
  res.send('turno: ' + req.query.turno);
});
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))




