const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

// VARIABLE PARA DEVOLVER EL MOVIMIENTO AL FRONT END
var movimiento = 0;
// VARIABLE PARA MANEJO DE JUEGO
var progress = 1;

// TURNOS PARA INDICAR SI SOY BLANCO O NEGRO
var blanco = 1;
var negro   = 2;

// TABLERO CON 0 ES UNA CELDA VACIA, 1 ES UNA CELDA BLANCA Y 2 ES UNA CELDA NEGRA
// TABLERO CON 2 ES UNA CELDA VACIA, 1 ES UNA CELDA BLANCA Y 0 ES UNA CELDA NEGRA
var Tablero = new Array(64);
var tempTablero = new Array(64);

// ARRAY DE POSIBILIDADES Y TEMPORAL DE POSIBILIDADES
var posibilidades = new Array();
var tempPosibilidad = new Array();

// PESOS PARA TOMAR DECISIONES
var tableroPesos = new Array( 50,  -1, 5, 2, 2, 5,  -1, 50,
                       -1, -10, 1, 1, 1, 1, -10, -1,
                        5,   1, 1, 1, 1, 1,   1,  5,
                        2,   1, 1, 0, 0, 1,   1,  2,
                        2,   1, 1, 0, 0, 1,   1,  2,
                        5,   1, 1, 1, 1, 1,   1,  5,
                       -1, -10, 1, 1, 1, 1, -10, -1,
                       50,  -1, 5, 2, 2, 5,  -1, 50 );
					   
// PESOS EN POSICIONES CONSECUTIVAS
var tableroPesosConsecutivo = new Array(0, 1, 2, 3, 4, 5, 6, 7,
						8, 9, 10, 11, 12, 13, 14, 15,
						16, 17, 18, 19, 20, 21, 22, 23,
						24, 25, 26, 27, 28, 29, 30, 31,
						32, 33, 34, 35, 36, 37, 38, 39,
						40, 41, 42, 43, 44, 45, 46, 47,
						48, 49, 50, 51, 52, 53, 54, 55,
						56, 57, 58, 59, 60, 61, 62, 63 );
						
// PESOS EN POSICIONES X,Y
var tableroPesosXY = new Array(00,	01,	02,	03,	04,	05,	06,	07,
						10,	11,	12,	13,	14,	15,	16,	17,
						20,	21,	22,	23,	24,	25,	26,	27,
						30,	31,	32,	33,	34,	35,	36,	37,
						40,	41,	42,	43,	44,	45,	46,	47,
						50,	51,	52,	53,	54,	55,	56,	57,
						60,	61,	62,	63,	64,	65,	66,	67,
						70,	71,	72,	73,	74,	75,	76,	77 );
					   

// CONTADOR DE CANTIDAD DE FICHAS DE CADA JUGADOR
var cantidadBlancas, cantidadNegras;

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
	for(var i=0; i<tableroPesosConsecutivo.length; i++){
		if(tableroPesosConsecutivo[i] == posicion){
			console.log("Encontrado en: " + i);
			console.log("Equivale a: " + tableroPesosXY[i]);
			movimiento = tableroPesosXY[i].toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false});
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
    Tablero[i] = 0;
    posibilidades[i] = new Array();
    posibilidades[i]['numero'] = 0;
    posibilidades[i]['flips'] = '';
    tempPosibilidad[i] = new Array();
    tempPosibilidad[i]['numero'] = 0;
    tempPosibilidad[i]['flips'] = '';
  }  
   negro = turno;
    
  for (var i = 0; i < estado.length; i++) {
	  Tablero[i] = estado.charAt(i);	  
  }
  reemplazarNumeracion();
  // BUSCAR POSIBILIDADES
  validaPosibilidad(turno);
  // ANALIZAR CON IA
  Jugar();  
}

// PARA DEVOLVER EN EL FORMATO NECESITADO POR EL FRONT END
function reemplazarNumeracion(){
	//console.log("reemplazarNumeracion");
	for (var i = 0; i < Tablero.length; i++) {
		if(Tablero[i] == 2){
			Tablero[i] = 3;
		}
	}
	
	for (var i = 0; i < Tablero.length; i++) {
		if(Tablero[i] == 0){
			Tablero[i] = 2;
		}
	}
	
	for (var i = 0; i < Tablero.length; i++) {
		if(Tablero[i] == 1){
			Tablero[i] = 1;
		}
	}
	
	for (var i = 0; i < Tablero.length; i++) {
		if(Tablero[i] == 3){
			Tablero[i] = 0;
		}
	}
}

function validaPosibilidad(color){
	var Fila, Columna;
	var i, j, k;
	var flips = '';
	var numero = 0;

  //RESET EL ARRAY DE POSIBILIDADES
  for (i = 0;  i < 64;  i++)
  {
    posibilidades[i]['numero'] = 0;
    posibilidades[i]['flips'] = '';
  }
  
  //ASIGNO EL COLOR DEL OPONENTE
  var oponente = (color == 1) ? 2 : 1;

  //VALIDACIONES
  for (i = 0;  i < 64;  i++)
  {
    if (Tablero[i] == color)
    {
	//OBTENGO LA FILA Y COLUMNA
      Fila = Math.floor(i/8);
      Columna = i%8;

	  //BUSCO ESPACIOS VACIOS EN LA FILA ACTUAL
      for (j = 0;  j < 8;  j++)
      {
        if (j == Columna || j == Columna-1 || j == Columna+1) continue;
		//COMPROBAR SI LOS CAMPOS VACIOS PERTENECEN AL OPONENTE, SI: INCREMENTO NUMERO, NO HAGO RESET PARA INICIAR NUEVAMENTE EN OTRA FILA
        if (Tablero[(Fila*8+j)] == 0)
        {
          if (Columna > j)
          {
            for (k = 1;  k < Columna-j;  k++)
            {
              if (Tablero[i-k] == oponente)
              {
                numero++;
                flips = flips.concat((i-k) + '|');
              }
              else
              {
                numero = 0;
                flips = '';
                break;
              }
            }
            posibilidades[(Fila*8+j)]['numero'] += numero;
            posibilidades[(Fila*8+j)]['flips'] = posibilidades[(Fila*8+j)]['flips'].concat(flips);
            numero = 0;
            flips = '';
          }
          else
          {
            for (k = 1;  k < j-Columna;  k++)
            {
              if (Tablero[i+k] == oponente)
              {
                numero++;
                flips = flips.concat((i+k) + '|');
              }
              else
              {
                numero = 0;
                flips = '';
                break;
              }
            }
            posibilidades[(Fila*8+j)]['numero'] += numero;
            posibilidades[(Fila*8+j)]['flips'] = posibilidades[(Fila*8+j)]['flips'].concat(flips);
            numero = 0;
            flips = '';
          }
        }
      }
	  
	  //BUSCO ESPACIOS VACIOS EN LA COLUMNA ACTUAL
      for (j = 0;  j < 8;  j++)
      {
		//COMPROBAR SI LOS CAMPOS VACIOS PERTENECEN AL OPONENTE, SI: INCREMENTO NUMERO, NO HAGO RESET PARA INICIAR NUEVAMENTE EN OTRA FILA
        if (j == Fila || j == Fila-1 || j == Fila+1) continue;
        if (Tablero[(j*8+Columna)] == 0)
        {
          if (Fila > j)
          {
            for (k = 1;  k < Fila-j;  k++)
            {
              if (Tablero[(i-k*8)] == oponente)
              {
                numero++;
                flips = flips.concat((i-k*8) + '|');
              }
              else
              {
                numero = 0;
                flips = '';
                break;
              }
            }
            posibilidades[(j*8+Columna)]['numero'] += numero;
            posibilidades[(j*8+Columna)]['flips'] = posibilidades[(j*8+Columna)]['flips'].concat(flips);
            numero = 0;
            flips = '';
          }
          else
          {
            for (k = 1;  k < j-Fila;  k++)
            {
              if (Tablero[(i+k*8)] == oponente)
              {
                numero++;
                flips = flips.concat((i+k*8) + '|');
              }
              else
              {
                numero = 0;
                flips = '';
                break;
              }
            }
            posibilidades[(j*8+Columna)]['numero'] += numero;
            posibilidades[(j*8+Columna)]['flips'] = posibilidades[(j*8+Columna)]['flips'].concat(flips);
            numero = 0;
            flips = '';
          }
        }
      }
	  
	  //BUSCO ESPACIOS VACIOS EN LAS DIAGONALES
      for (j = 2;  j < 8;  j++)
      {
        if (j <= Fila && j <= Columna && Tablero[(i-j*9)] == 0)
        {
          for (k = 1;  k < j;  k++)
          {
            if (Tablero[(i-k*9)] == oponente)
            {
              numero++;
              flips = flips.concat((i-k*9) + '|');
            }
            else
            {
              numero = 0;
              flips = '';
              break;
            }
          }
          posibilidades[(i-j*9)]['numero'] += numero;
          posibilidades[(i-j*9)]['flips'] = posibilidades[(i-j*9)]['flips'].concat(flips);
          numero = 0;
          flips = '';
        }
        if (j <= Fila && j < 8-Columna && Tablero[(i-j*7)] == 0)
        {
          for (k = 1;  k < j;  k++)
          {
            if (Tablero[i-k*7] == oponente)
            {
              numero++;
              flips = flips.concat((i-k*7) + '|');
            }
            else
            {
              numero = 0;
              flips = '';
              break;
            }
          }
          posibilidades[(i-j*7)]['numero'] += numero;
          posibilidades[(i-j*7)]['flips'] = posibilidades[(i-j*7)]['flips'].concat(flips);
          numero = 0;
          flips = '';
        }
        
        if ( j < 8-Fila && j <= Columna && Tablero[(i+j*7)] == 0)
        {
          for (k = 1;  k < j;  k++)
          {
            if (Tablero[i+k*7] == oponente)
            {
              numero++;
              flips = flips.concat((i+k*7) + '|');
            }
            else
            {
              numero = 0;
              flips = '';
              break;
            }
          }
          posibilidades[(i+j*7)]['numero'] += numero;
          posibilidades[(i+j*7)]['flips'] = posibilidades[(i+j*7)]['flips'].concat(flips);
          numero = 0;
          flips = '';
        }
        if (j < 8-Fila && j < 8-Columna && Tablero[(i+j*9)] == 0)
        {
          for (k = 1;  k < j;  k++)
          {
            if (Tablero[i+k*9] == oponente)
            {
              numero++;
              flips = flips.concat((i+k*9) + '|');
            }
            else
            {
              numero = 0;
              flips = '';
              break;
            }
          }
          posibilidades[(i+j*9)]['numero'] += numero;
          posibilidades[(i+j*9)]['flips'] = posibilidades[(i+j*9)]['flips'].concat(flips);
          numero = 0;
          flips = '';
        }
      }
    }
  }
}

//FUNCION IA
function Jugar()
{
  var i, j, k, l;
  var blah, blah2, nimm;
  var temp  = new Array();
  var temp2 = new Array();
  var temp3 = new Array();

//VALIDO SI MI MOVIMIENTO HACE QUE EL OPONENTE NO LE QUEDAN MOVIMIENTOS , SI NO TIENE MOVIMIENTOS LO AGREGO A MI LISTA DE MOVIMIENTOS POSIBLES
  for (i = 0;  i < 64;  i++)
  {
    tempPosibilidad[i]['numero'] = posibilidades[i]['numero'];
    tempPosibilidad[i]['flips']  = posibilidades[i]['flips'];
    tempTablero[i]               = Tablero[i];
  }
  for (i = 0;  i < 64;  i++)
  {
    if (tempPosibilidad[i]['numero'] > 0)
    {
      Tablero[i] = blanco;
      fakeFlip(blanco, i);
    }
    else continue;
    
    validaPosibilidad(negro);
    if (checkMove() == 0) temp2.push(i);
    
    for (j = 0;  j < 64;  j++) Tablero[j] = tempTablero[j];
  }
  for (i = 0;  i < 64;  i++)
  {
    posibilidades[i]['numero'] = tempPosibilidad[i]['numero'];
    posibilidades[i]['flips']  = tempPosibilidad[i]['flips'];
    Tablero[i]               = tempTablero[i];
  }

//SI NO ENCUENTRO MOVIMIENTOS ANALIZO LAS ESQUINAS
  if (typeof(temp2[0]) == 'undefined')
  {
    if (posibilidades[0]['numero'] > 0) temp2.push(0);
    if (posibilidades[7]['numero'] > 0) temp2.push(7);
    if (posibilidades[56]['numero'] > 0) temp2.push(56);
    if (posibilidades[63]['numero'] > 0) temp2.push(63);

	//COMO NO ENCUENTRO ME MUEVO EN LOS BORDES DE LA ESQUINA 1,8 - 6,15 - 45,57 - 55,62
    if (typeof(temp2[0]) == 'undefined')
    {
      for (i = 2;  i < 6;  i++)
      {
        if (posibilidades[i]['numero'] > 0) temp2.push(i);
        if (posibilidades[(i*8)]['numero'] > 0) temp2.push(i*8);
        if (posibilidades[(i*8+7)]['numero'] > 0) temp2.push(i*8+7);
        if (posibilidades[(56+i)]['numero'] > 0) temp2.push(56+i);
      }
      
      if (Tablero[0] == blanco && posibilidades[1]['numero'] > 0) temp2.push(1);
      if (Tablero[0] == blanco && posibilidades[8]['numero'] > 0) temp2.push(8);
      if (Tablero[7] == blanco && posibilidades[6]['numero'] > 0) temp2.push(6);
      if (Tablero[7] == blanco && posibilidades[15]['numero'] > 0) temp2.push(15);
      if (Tablero[56] == blanco && posibilidades[48]['numero'] > 0) temp2.push(48);
      if (Tablero[56] == blanco && posibilidades[57]['numero'] > 0) temp2.push(57);
      if (Tablero[63] == blanco && posibilidades[55]['numero'] > 0) temp2.push(55);
      if (Tablero[63] == blanco && posibilidades[62]['numero'] > 0) temp2.push(62);
	//COMO NO ENCUENTRO ME MUEVO EN LA 2DA FILA Y DE LA 5TA FILA
      if (typeof(temp2[0]) == 'undefined')
      {
        for (i = 2;  i < 6;  i++)
        {
          if (posibilidades[(16+i)]['numero'] > 0) temp2.push(16+i);
          if (posibilidades[(i*8+2)]['numero'] > 0) temp2.push(i*8+2);
          if (posibilidades[(i*8+5)]['numero'] > 0) temp2.push(i*8+5);
          if (posibilidades[(40+i)]['numero'] > 0) temp2.push(40+i);
        }
        
        if (Tablero[0] == blanco && posibilidades[9]['numero'] > 0) temp2.push(9);
        if (Tablero[7] == blanco && posibilidades[14]['numero'] > 0) temp2.push(14);
        if (Tablero[56] == blanco && posibilidades[49]['numero'] > 0) temp2.push(49);
        if (Tablero[63] == blanco && posibilidades[54]['numero'] > 0) temp2.push(54);
	//COMO NO ENCUENTRO ME MUEVO EN LA 1ERA FILA Y LA 6TA FILA
        if (typeof(temp2[0]) == 'undefined')
        {
          for (i = 2;  i < 6;  i++)
          {
            if (posibilidades[(8+i)]['numero'] > 0) temp2.push(8+i);
            if (posibilidades[(i*8+1)]['numero'] > 0) temp2.push(i*8+1);
            if (posibilidades[(i*8+6)]['numero'] > 0) temp2.push(i*8+6);
            if (posibilidades[(48+i)]['numero'] > 0) temp2.push(48+i);
          }
	//BUSCO EN LOS VALORES DE FILAS Y COLUMNAS QUE ESTAN CERCA DE LA ESQUINA
          if (typeof(temp2[0]) == 'undefined')
          {
            if (posibilidades[1]['numero'] > 0) temp2.push(1);
            if (posibilidades[6]['numero'] > 0) temp2.push(6);
            if (posibilidades[8]['numero'] > 0) temp2.push(8);
            if (posibilidades[15]['numero'] > 0) temp2.push(15);
            if (posibilidades[48]['numero'] > 0) temp2.push(48);
            if (posibilidades[55]['numero'] > 0) temp2.push(55);
            if (posibilidades[57]['numero'] > 0) temp2.push(57);
            if (posibilidades[62]['numero'] > 0) temp2.push(62);
	//BUSCO EN LOS VALORES CERCANOS A LA DIAGONAL DE LA ESQUINA
            if (typeof(temp2[0]) == 'undefined')
            {
              if (posibilidades[9]['numero'] > 0) temp2.push(9);
              if (posibilidades[14]['numero'] > 0) temp2.push(14);
              if (posibilidades[49]['numero'] > 0) temp2.push(49);
              if (posibilidades[54]['numero'] > 0) temp2.push(54);
            }
          }
        }
      }
    }
  }
//ELIJO LA MEJOR JUGADA EN LAS ENCONTRADAS DURANTE LOS PRIMEROS 10 MOVIMIENTOS ALEATORIAMENTE 
  if (cantidadBlancas + cantidadNegras < 25)
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
        tempPosibilidad[i]['numero'] = posibilidades[i]['numero'];
        tempPosibilidad[i]['flips']  = posibilidades[i]['flips'];
        tempTablero[i]               = Tablero[i];
      }
      
      for (i = 0;  i < temp2.length;  i++)
      {
        temp = posibilidades[(temp2[i])]['flips'].split('|');
        blah = 0;
        for (j = 0;  j < temp.length-1;  j++) blah += tableroPesos[(temp[j])];
        Tablero[(temp2[i])] = blanco;
        fakeFlip(blanco, (temp2[i]));
        validaPosibilidad(negro);
        
        for (j = 0;  j < 64;  j++)
        {
          temp = posibilidades[j]['flips'].split('|');
          blah2 = 0;
          for (k = 0;  k < temp.length-1;  k++) blah2 += tableroPesos[(temp[k])];
        }
        
        for (j = 0;  j < 64;  j++)
        {
          posibilidades[j]['numero'] = tempPosibilidad[j]['numero'];
          posibilidades[j]['flips']  = tempPosibilidad[j]['flips'];
          Tablero[j]               = tempTablero[j];
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
  //putPiece(blanco, nimm);
  //flip(blanco, nimm);

  //VALIDO SI PUEDO MOVERME
  //progress = 0;
  //validaPosibilidad(negro);
  
  //if (checkMove() == 0)
  //{
  //  validaPosibilidad(blanco);
  //}
  //else for (i = 0;  i < 64;  i++)
 // {
  //  if (posibilidades[i]['numero'] > 0) putPiece (5,i);
  //  else if (Tablero[i] == 0) putPiece(0,i);
  //}
}

//REALIZO UNA JUGADA DE MENTIRA PARA VER SI LA QUE ESTOY ESCOGIENDO ES BUENA DESICION
function fakeFlip(color, field)
{
  var temp = new Array();
  temp = tempPosibilidad[field]['flips'].split('|');
  for (var i = 0;  i < temp.length-1;  i++)
  {
    Tablero[(temp[i])] = color;
  }
}

//FUNCION QUE COMPRUEBA SI TENGO MOVIMIENTOS POSIBLES
function checkMove()
{
  var j = 0;
  for (var i = 0;  i < 64;  i++)
  {
    j += posibilidades[i]['numero'];
  }
  return j;
}


//REALIZO EL CAMBIO DE UNA FICHA EN UNA POSICION EN ESPECIFICO DEL TABLERO
function putPiece(color, field)
{
//5 for the color parameter is used for the flipcounts. Those of course are only shown if it's the negro's turn, i.e. if progress is 0.
  if (color == 5 && progress == 0)
  {
   
  }

  else if (color == 0 || (color == 5 && progress == 1))
  {
 
  }

  else
  {
    if (Tablero[field] != 0)
    {
      
    }
    else {
	
	}
    Tablero[field] = color;
    
    cantidadBlancas = 0;
    cantidadNegras = 0;
    for (j = 0;  j < 64;  j++)
    {
      if (Tablero[j] == 1) cantidadBlancas++;
      if (Tablero[j] == 2) cantidadNegras++;
    }
   
  }
}

//REALIZO LA JUGADA
function flip(color, field)
{
  var temp = new Array();
  temp = posibilidades[field]['flips'].split('|');
  for (i = 0;  i < temp.length-1;  i++)
  {
    putPiece(color,temp[i]);
  }
}
