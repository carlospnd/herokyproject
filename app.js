const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

express().use(express.static(path.join(__dirname, 'public')));
express().get('/', function(req, res){
	var numero = init();
	res.send(numero);
});
express().listen(PORT, () => console.log(`Listening on ${ PORT }`));

function init()
{
	return 52;
}
