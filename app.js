const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

// VARIABLE PARA DEVOLVER EL MOVIMIENTO AL FRONT END
var movimiento = 0;
// VARIABLE PARA MANEJO DE JUEGO
var progress = 1;

// TURNOS PARA INDICAR SI SOY BLANCO O NEGRO
var computer = 1;
var player   = 2;

// TABLERO CON 0 ES UNA CELDA VACIA, 1 ES UNA CELDA BLANCA Y 2 ES UNA CELDA NEGRA
// TABLERO CON 2 ES UNA CELDA VACIA, 1 ES UNA CELDA BLANCA Y 0 ES UNA CELDA NEGRA
var Spielfeld = new Array(64);
var tempSpielfeld = new Array(64);

// ARRAY DE POSIBILIDADES Y TEMPORAL DE POSIBILIDADES
var possibilities = new Array();
var tempPossibilities = new Array();

// PESOS PARA TOMAR DECISIONES
var wert = new Array( 50,  -1, 5, 2, 2, 5,  -1, 50,
                       -1, -10, 1, 1, 1, 1, -10, -1,
                        5,   1, 1, 1, 1, 1,   1,  5,
                        2,   1, 1, 0, 0, 1,   1,  2,
                        2,   1, 1, 0, 0, 1,   1,  2,
                        5,   1, 1, 1, 1, 1,   1,  5,
                       -1, -10, 1, 1, 1, 1, -10, -1,
                       50,  -1, 5, 2, 2, 5,  -1, 50 );
					   
// PESOS EN POSICIONES CONSECUTIVAS
var wertRea = new Array(0, 1, 2, 3, 4, 5, 6, 7,
						8, 9, 10, 11, 12, 13, 14, 15,
						16, 17, 18, 19, 20, 21, 22, 23,
						24, 25, 26, 27, 28, 29, 30, 31,
						32, 33, 34, 35, 36, 37, 38, 39,
						40, 41, 42, 43, 44, 45, 46, 47,
						48, 49, 50, 51, 52, 53, 54, 55,
						56, 57, 58, 59, 60, 61, 62, 63 );
						
// PESOS EN POSICIONES X,Y
var wertDic = new Array(00,	01,	02,	03,	04,	05,	06,	07,
						10,	11,	12,	13,	14,	15,	16,	17,
						20,	21,	22,	23,	24,	25,	26,	27,
						30,	31,	32,	33,	34,	35,	36,	37,
						40,	41,	42,	43,	44,	45,	46,	47,
						50,	51,	52,	53,	54,	55,	56,	57,
						60,	61,	62,	63,	64,	65,	66,	67,
						70,	71,	72,	73,	74,	75,	76,	77 );
					   

// CONTADOR DE CANTIDAD DE FICHAS DE CADA JUGADOR
var white, black;

// VARIABLE PARA OBTENER DATOS DEL GET
var turno, estado;


// NODEJS LOGICA
express()
  .use(express.static(path.join(__dirname, 'public')))  
  .get('/', function(req, res){ 
  
  turno = req.query.turno
  if(turno == 0){
	  turno = 2;
  }
  estado = req.query.estado
  
  init();
  res.send(String(movimiento)); 
  
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))

// OBTENER POSICION EN X,Y
function buscarPosicionReal(posicion){
	console.log("Buscando: " + posicion);
	for(var i=0; i<wertRea.length; i++){
		if(wertRea[i] == posicion){
			console.log("Encontrado en: " + i);
			console.log("Equivale a: " + wertDic[i]);
			movimiento = wertDic[i].toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false});
			break;
		}
	}
}

// FUNCION INICIAL
function init()
{
  //RESET DE LOS TABLEROS
  for (var i = 0;  i < 64;  i++)
  {
    Spielfeld[i] = 0;
    possibilities[i] = new Array();
    possibilities[i]['anzahl'] = 0;
    possibilities[i]['flips'] = '';
    tempPossibilities[i] = new Array();
    tempPossibilities[i]['anzahl'] = 0;
    tempPossibilities[i]['flips'] = '';
  }  
   player = turno;
    
  for (var i = 0; i < estado.length; i++) {
	  Spielfeld[i] = estado.charAt(i);	  
  }
  reemplazarNumeracion();
  // BUSCAR POSIBILIDADES
  checkPossibilities(turno);
  // ANALIZAR CON IA
  KI();  
}

// PARA DEVOLVER EN EL FORMATO NECESITADO POR EL FRONT END
function reemplazarNumeracion(){
	//console.log("reemplazarNumeracion");
	for (var i = 0; i < Spielfeld.length; i++) {
		if(Spielfeld[i] == 2){
			Spielfeld[i] = 3;
		}
	}
	
	for (var i = 0; i < Spielfeld.length; i++) {
		if(Spielfeld[i] == 0){
			Spielfeld[i] = 2;
		}
	}
	
	for (var i = 0; i < Spielfeld.length; i++) {
		if(Spielfeld[i] == 1){
			Spielfeld[i] = 1;
		}
	}
	
	for (var i = 0; i < Spielfeld.length; i++) {
		if(Spielfeld[i] == 3){
			Spielfeld[i] = 0;
		}
	}
}

function checkPossibilities(color){
	var Reihe, Spalte;
	var i, j, k;
	var flips = '';
	var anzahl = 0;

  //RESET EL ARRAY DE POSIBILIDADES
  for (i = 0;  i < 64;  i++)
  {
    possibilities[i]['anzahl'] = 0;
    possibilities[i]['flips'] = '';
  }
  
  //ASIGNO EL COLOR DEL OPONENTE
  var opponent = (color == 1) ? 2 : 1;

  //VALIDACIONES
  for (i = 0;  i < 64;  i++)
  {
    if (Spielfeld[i] == color)
    {
	//OBTENGO LA FILA Y COLUMNA
      Reihe = Math.floor(i/8);
      Spalte = i%8;

	  //BUSCO ESPACIOS VACIOS EN LA FILA ACTUAL
      for (j = 0;  j < 8;  j++)
      {
        if (j == Spalte || j == Spalte-1 || j == Spalte+1) continue;
		//COMPROBAR SI LOS CAMPOS VACIOS PERTENECEN AL OPONENTE, SI: INCREMENTO NUMERO, NO HAGO RESET PARA INICIAR NUEVAMENTE EN OTRA FILA
        if (Spielfeld[(Reihe*8+j)] == 0)
        {
          if (Spalte > j)
          {
            for (k = 1;  k < Spalte-j;  k++)
            {
              if (Spielfeld[i-k] == opponent)
              {
                anzahl++;
                flips = flips.concat((i-k) + '|');
              }
              else
              {
                anzahl = 0;
                flips = '';
                break;
              }
            }
            possibilities[(Reihe*8+j)]['anzahl'] += anzahl;
            possibilities[(Reihe*8+j)]['flips'] = possibilities[(Reihe*8+j)]['flips'].concat(flips);
            anzahl = 0;
            flips = '';
          }
          else
          {
            for (k = 1;  k < j-Spalte;  k++)
            {
              if (Spielfeld[i+k] == opponent)
              {
                anzahl++;
                flips = flips.concat((i+k) + '|');
              }
              else
              {
                anzahl = 0;
                flips = '';
                break;
              }
            }
            possibilities[(Reihe*8+j)]['anzahl'] += anzahl;
            possibilities[(Reihe*8+j)]['flips'] = possibilities[(Reihe*8+j)]['flips'].concat(flips);
            anzahl = 0;
            flips = '';
          }
        }
      }
	  
	  //BUSCO ESPACIOS VACIOS EN LA COLUMNA ACTUAL
      for (j = 0;  j < 8;  j++)
      {
		//COMPROBAR SI LOS CAMPOS VACIOS PERTENECEN AL OPONENTE, SI: INCREMENTO NUMERO, NO HAGO RESET PARA INICIAR NUEVAMENTE EN OTRA FILA
        if (j == Reihe || j == Reihe-1 || j == Reihe+1) continue;
        if (Spielfeld[(j*8+Spalte)] == 0)
        {
          if (Reihe > j)
          {
            for (k = 1;  k < Reihe-j;  k++)
            {
              if (Spielfeld[(i-k*8)] == opponent)
              {
                anzahl++;
                flips = flips.concat((i-k*8) + '|');
              }
              else
              {
                anzahl = 0;
                flips = '';
                break;
              }
            }
            possibilities[(j*8+Spalte)]['anzahl'] += anzahl;
            possibilities[(j*8+Spalte)]['flips'] = possibilities[(j*8+Spalte)]['flips'].concat(flips);
            anzahl = 0;
            flips = '';
          }
          else
          {
            for (k = 1;  k < j-Reihe;  k++)
            {
              if (Spielfeld[(i+k*8)] == opponent)
              {
                anzahl++;
                flips = flips.concat((i+k*8) + '|');
              }
              else
              {
                anzahl = 0;
                flips = '';
                break;
              }
            }
            possibilities[(j*8+Spalte)]['anzahl'] += anzahl;
            possibilities[(j*8+Spalte)]['flips'] = possibilities[(j*8+Spalte)]['flips'].concat(flips);
            anzahl = 0;
            flips = '';
          }
        }
      }
	  
	  //BUSCO ESPACIOS VACIOS EN LAS DIAGONALES
      for (j = 2;  j < 8;  j++)
      {
        if (j <= Reihe && j <= Spalte && Spielfeld[(i-j*9)] == 0)
        {
          for (k = 1;  k < j;  k++)
          {
            if (Spielfeld[(i-k*9)] == opponent)
            {
              anzahl++;
              flips = flips.concat((i-k*9) + '|');
            }
            else
            {
              anzahl = 0;
              flips = '';
              break;
            }
          }
          possibilities[(i-j*9)]['anzahl'] += anzahl;
          possibilities[(i-j*9)]['flips'] = possibilities[(i-j*9)]['flips'].concat(flips);
          anzahl = 0;
          flips = '';
        }
        if (j <= Reihe && j < 8-Spalte && Spielfeld[(i-j*7)] == 0)
        {
          for (k = 1;  k < j;  k++)
          {
            if (Spielfeld[i-k*7] == opponent)
            {
              anzahl++;
              flips = flips.concat((i-k*7) + '|');
            }
            else
            {
              anzahl = 0;
              flips = '';
              break;
            }
          }
          possibilities[(i-j*7)]['anzahl'] += anzahl;
          possibilities[(i-j*7)]['flips'] = possibilities[(i-j*7)]['flips'].concat(flips);
          anzahl = 0;
          flips = '';
        }
        
        if ( j < 8-Reihe && j <= Spalte && Spielfeld[(i+j*7)] == 0)
        {
          for (k = 1;  k < j;  k++)
          {
            if (Spielfeld[i+k*7] == opponent)
            {
              anzahl++;
              flips = flips.concat((i+k*7) + '|');
            }
            else
            {
              anzahl = 0;
              flips = '';
              break;
            }
          }
          possibilities[(i+j*7)]['anzahl'] += anzahl;
          possibilities[(i+j*7)]['flips'] = possibilities[(i+j*7)]['flips'].concat(flips);
          anzahl = 0;
          flips = '';
        }
        if (j < 8-Reihe && j < 8-Spalte && Spielfeld[(i+j*9)] == 0)
        {
          for (k = 1;  k < j;  k++)
          {
            if (Spielfeld[i+k*9] == opponent)
            {
              anzahl++;
              flips = flips.concat((i+k*9) + '|');
            }
            else
            {
              anzahl = 0;
              flips = '';
              break;
            }
          }
          possibilities[(i+j*9)]['anzahl'] += anzahl;
          possibilities[(i+j*9)]['flips'] = possibilities[(i+j*9)]['flips'].concat(flips);
          anzahl = 0;
          flips = '';
        }
      }
    }
  }
}

//FUNCION IA
function KI()
{
  var i, j, k, l;
  var blah, blah2, nimm;
  var temp  = new Array();
  var temp2 = new Array();
  var temp3 = new Array();

//VALIDO SI MI MOVIMIENTO HACE QUE EL OPONENTE NO LE QUEDAN MOVIMIENTOS , SI NO TIENE MOVIMIENTOS LO AGREGO A MI LISTA DE MOVIMIENTOS POSIBLES
  for (i = 0;  i < 64;  i++)
  {
    tempPossibilities[i]['anzahl'] = possibilities[i]['anzahl'];
    tempPossibilities[i]['flips']  = possibilities[i]['flips'];
    tempSpielfeld[i]               = Spielfeld[i];
  }
  for (i = 0;  i < 64;  i++)
  {
    if (tempPossibilities[i]['anzahl'] > 0)
    {
      Spielfeld[i] = computer;
      fakeFlip(computer, i);
    }
    else continue;
    
    checkPossibilities(player);
    if (checkMove() == 0) temp2.push(i);
    
    for (j = 0;  j < 64;  j++) Spielfeld[j] = tempSpielfeld[j];
  }
  for (i = 0;  i < 64;  i++)
  {
    possibilities[i]['anzahl'] = tempPossibilities[i]['anzahl'];
    possibilities[i]['flips']  = tempPossibilities[i]['flips'];
    Spielfeld[i]               = tempSpielfeld[i];
  }

//SI NO ENCUENTRO MOVIMIENTOS ANALIZO LAS ESQUINAS
  if (typeof(temp2[0]) == 'undefined')
  {
    if (possibilities[0]['anzahl'] > 0) temp2.push(0);
    if (possibilities[7]['anzahl'] > 0) temp2.push(7);
    if (possibilities[56]['anzahl'] > 0) temp2.push(56);
    if (possibilities[63]['anzahl'] > 0) temp2.push(63);

	//COMO NO ENCUENTRO ME MUEVO EN LOS BORDES DE LA ESQUINA 1,8 - 6,15 - 45,57 - 55,62
    if (typeof(temp2[0]) == 'undefined')
    {
      for (i = 2;  i < 6;  i++)
      {
        if (possibilities[i]['anzahl'] > 0) temp2.push(i);
        if (possibilities[(i*8)]['anzahl'] > 0) temp2.push(i*8);
        if (possibilities[(i*8+7)]['anzahl'] > 0) temp2.push(i*8+7);
        if (possibilities[(56+i)]['anzahl'] > 0) temp2.push(56+i);
      }
      
      if (Spielfeld[0] == computer && possibilities[1]['anzahl'] > 0) temp2.push(1);
      if (Spielfeld[0] == computer && possibilities[8]['anzahl'] > 0) temp2.push(8);
      if (Spielfeld[7] == computer && possibilities[6]['anzahl'] > 0) temp2.push(6);
      if (Spielfeld[7] == computer && possibilities[15]['anzahl'] > 0) temp2.push(15);
      if (Spielfeld[56] == computer && possibilities[48]['anzahl'] > 0) temp2.push(48);
      if (Spielfeld[56] == computer && possibilities[57]['anzahl'] > 0) temp2.push(57);
      if (Spielfeld[63] == computer && possibilities[55]['anzahl'] > 0) temp2.push(55);
      if (Spielfeld[63] == computer && possibilities[62]['anzahl'] > 0) temp2.push(62);
	//COMO NO ENCUENTRO ME MUEVO EN LA 2DA FILA Y DE LA 5TA FILA
      if (typeof(temp2[0]) == 'undefined')
      {
        for (i = 2;  i < 6;  i++)
        {
          if (possibilities[(16+i)]['anzahl'] > 0) temp2.push(16+i);
          if (possibilities[(i*8+2)]['anzahl'] > 0) temp2.push(i*8+2);
          if (possibilities[(i*8+5)]['anzahl'] > 0) temp2.push(i*8+5);
          if (possibilities[(40+i)]['anzahl'] > 0) temp2.push(40+i);
        }
        
        if (Spielfeld[0] == computer && possibilities[9]['anzahl'] > 0) temp2.push(9);
        if (Spielfeld[7] == computer && possibilities[14]['anzahl'] > 0) temp2.push(14);
        if (Spielfeld[56] == computer && possibilities[49]['anzahl'] > 0) temp2.push(49);
        if (Spielfeld[63] == computer && possibilities[54]['anzahl'] > 0) temp2.push(54);
	//COMO NO ENCUENTRO ME MUEVO EN LA 1ERA FILA Y LA 6TA FILA
        if (typeof(temp2[0]) == 'undefined')
        {
          for (i = 2;  i < 6;  i++)
          {
            if (possibilities[(8+i)]['anzahl'] > 0) temp2.push(8+i);
            if (possibilities[(i*8+1)]['anzahl'] > 0) temp2.push(i*8+1);
            if (possibilities[(i*8+6)]['anzahl'] > 0) temp2.push(i*8+6);
            if (possibilities[(48+i)]['anzahl'] > 0) temp2.push(48+i);
          }
	//BUSCO EN LOS VALORES DE FILAS Y COLUMNAS QUE ESTAN CERCA DE LA ESQUINA
          if (typeof(temp2[0]) == 'undefined')
          {
            if (possibilities[1]['anzahl'] > 0) temp2.push(1);
            if (possibilities[6]['anzahl'] > 0) temp2.push(6);
            if (possibilities[8]['anzahl'] > 0) temp2.push(8);
            if (possibilities[15]['anzahl'] > 0) temp2.push(15);
            if (possibilities[48]['anzahl'] > 0) temp2.push(48);
            if (possibilities[55]['anzahl'] > 0) temp2.push(55);
            if (possibilities[57]['anzahl'] > 0) temp2.push(57);
            if (possibilities[62]['anzahl'] > 0) temp2.push(62);
	//BUSCO EN LOS VALORES CERCANOS A LA DIAGONAL DE LA ESQUINA
            if (typeof(temp2[0]) == 'undefined')
            {
              if (possibilities[9]['anzahl'] > 0) temp2.push(9);
              if (possibilities[14]['anzahl'] > 0) temp2.push(14);
              if (possibilities[49]['anzahl'] > 0) temp2.push(49);
              if (possibilities[54]['anzahl'] > 0) temp2.push(54);
            }
          }
        }
      }
    }
  }
//ELIJO LA MEJOR JUGADA EN LAS ENCONTRADAS DURANTE LOS PRIMEROS 10 MOVIMIENTOS ALEATORIAMENTE 
  if (white + black < 25)
  {
    for (i = 0;  i < temp2.length;  i++) temp3[i] = temp2[i];
  }
 //ELIJO LA JUGADA CON LA MAYOR DIFERENCIA ENTRE LOS VALORES DE LA JUGADA ACTUAL Y LOS DE LAS POSIBILIDADES
  else
  {
    var Differenz = -1000;
    if (temp2.length > 1)
    {
      for (i = 0;  i < 64;  i++)
      {
        tempPossibilities[i]['anzahl'] = possibilities[i]['anzahl'];
        tempPossibilities[i]['flips']  = possibilities[i]['flips'];
        tempSpielfeld[i]               = Spielfeld[i];
      }
      
      for (i = 0;  i < temp2.length;  i++)
      {
        temp = possibilities[(temp2[i])]['flips'].split('|');
        blah = 0;
        for (j = 0;  j < temp.length-1;  j++) blah += wert[(temp[j])];
        Spielfeld[(temp2[i])] = computer;
        fakeFlip(computer, (temp2[i]));
        checkPossibilities(player);
        
        for (j = 0;  j < 64;  j++)
        {
          temp = possibilities[j]['flips'].split('|');
          blah2 = 0;
          for (k = 0;  k < temp.length-1;  k++) blah2 += wert[(temp[k])];
        }
        
        for (j = 0;  j < 64;  j++)
        {
          possibilities[j]['anzahl'] = tempPossibilities[j]['anzahl'];
          possibilities[j]['flips']  = tempPossibilities[j]['flips'];
          Spielfeld[j]               = tempSpielfeld[j];
        }
        
        if (blah - blah2 > Differenz)
        {
          while (typeof(temp3[0]) != 'undefined')
          {
            temp3.pop();
          }
          temp3.push(temp2[i]);
          Differenz = blah - blah2;
        }
        else if (Differenz == blah - blah2)
        {
          temp3.push(temp2[i]);
        }
      }
    }
    else temp3[0] = temp2[0];
  }
 //COMO PUEDE EXISTIR MAS DE UN MOVIMIENTO CON EL MISMO VALOR LO ESCOJO ALEATORIAMENTE
  blah = Math.floor((Math.random() * 1000) % temp3.length);
  nimm = temp3[blah];
  
  buscarPosicionReal(nimm);
  
  console.log("Movimiento: " + nimm);
  putPiece(computer, nimm);
  flip(computer, nimm);

  //VALIDO SI PUEDO MOVERME
  progress = 0;
  checkPossibilities(player);
  
  if (checkMove() == 0)
  {
    checkPossibilities(computer);
  }
  else for (i = 0;  i < 64;  i++)
  {
    if (possibilities[i]['anzahl'] > 0) putPiece (5,i);
    else if (Spielfeld[i] == 0) putPiece(0,i);
  }
}

//REALIZO UNA JUGADA DE MENTIRA PARA VER SI LA QUE ESTOY ESCOGIENDO ES BUENA DESICION
function fakeFlip(color, field)
{
  var temp = new Array();
  temp = tempPossibilities[field]['flips'].split('|');
  for (var i = 0;  i < temp.length-1;  i++)
  {
    Spielfeld[(temp[i])] = color;
  }
}

//FUNCION QUE COMPRUEBA SI TENGO MOVIMIENTOS POSIBLES
function checkMove()
{
  var j = 0;
  for (var i = 0;  i < 64;  i++)
  {
    j += possibilities[i]['anzahl'];
  }
  return j;
}


//REALIZO EL CAMBIO DE UNA FICHA EN UNA POSICION EN ESPECIFICO DEL TABLERO
function putPiece(color, field)
{
//5 for the color parameter is used for the flipcounts. Those of course are only shown if it's the player's turn, i.e. if progress is 0.
  if (color == 5 && progress == 0)
  {
   
  }

  else if (color == 0 || (color == 5 && progress == 1))
  {
 
  }

  else
  {
    if (Spielfeld[field] != 0)
    {
      
    }
    else {
	
	}
    Spielfeld[field] = color;
    
    white = 0;
    black = 0;
    for (j = 0;  j < 64;  j++)
    {
      if (Spielfeld[j] == 1) white++;
      if (Spielfeld[j] == 2) black++;
    }
   
  }
}

//REALIZO LA JUGADA
function flip(color, field)
{
  var temp = new Array();
  temp = possibilities[field]['flips'].split('|');
  for (i = 0;  i < temp.length-1;  i++)
  {
    putPiece(color,temp[i]);
  }
}
