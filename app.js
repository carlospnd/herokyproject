const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

express()
  .use(express.static(path.join(__dirname, 'public')))  
  .get('/', function(req, res){ 
  
  var turno = req.query.turno
  var estado = req.query.estado
  
  var saludar = init(turno, estado);
  res.send(saludar); 
  
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

function init(turno, estado)
{
	console.log("init");
	console.log("turno: " + turno);
	console.log("estado: " + estado)
	return "Hola Mundo";
}
