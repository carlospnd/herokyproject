const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000

//Now to the actual script. At first there are the usual declarations of global variables.
//If it is the computer's turn, this variable is 1. It's used to block further actions from the player.
var progress = 1;

//the colors of both parties
var computer = 1;
var player   = 2;

//the board, 0 is an empty cell, 1 is a white disc, 2 is a black disc
//the board, 2 is an empty cell, 1 is white disc, 0 is a black disc
var Spielfeld = new Array(64);
var tempSpielfeld = new Array(64);

//contains possible legal moves
var possibilities = new Array();
var tempPossibilities = new Array();

//A matrix of values to evaluate the worth of positions on the board for the A.I.
//The edges are most important because they cannot be taken by the other player anymore. The fields next to the edges are the worst ones, because those usually lead to the other player getting the edge. The fields on the boarder have higher values than those in the middle, because the latter ones change their owner frequently.

var wert = new Array( 50,  -1, 5, 2, 2, 5,  -1, 50,
                       -1, -10, 1, 1, 1, 1, -10, -1,
                        5,   1, 1, 1, 1, 1,   1,  5,
                        2,   1, 1, 0, 0, 1,   1,  2,
                        2,   1, 1, 0, 0, 1,   1,  2,
                        5,   1, 1, 1, 1, 1,   1,  5,
                       -1, -10, 1, 1, 1, 1, -10, -1,
                       50,  -1, 5, 2, 2, 5,  -1, 50 );
					   

var wertRea = new Array(0, 1, 2, 3, 4, 5, 6, 7,
						8, 9, 10, 11, 12, 13, 14, 15,
						16, 17, 18, 19, 20, 21, 22, 23,
						24, 25, 26, 27, 28, 29, 30, 31,
						32, 33, 34, 35, 36, 37, 38, 39,
						40, 41, 42, 43, 44, 45, 46, 47,
						48, 49, 50, 51, 52, 53, 54, 55,
						56, 57, 58, 59, 60, 61, 62, 63 );
						

var wertDic = new Array(00,	01,	02,	03,	04,	05,	06,	07,
						10,	11,	12,	13,	14,	15,	16,	17,
						20,	21,	22,	23,	24,	25,	26,	27,
						30,	31,	32,	33,	34,	35,	36,	37,
						40,	41,	42,	43,	44,	45,	46,	47,
						50,	51,	52,	53,	54,	55,	56,	57,
						60,	61,	62,	63,	64,	65,	66,	67,
						70,	71,	72,	73,	74,	75,	76,	77 );
					   

//the two variables to count the discs currently on the board
var white, black;

var turno, estado;


// INICIALIZO

express()
  .use(express.static(path.join(__dirname, 'public')))  
  .get('/', function(req, res){ 
  
  turno = req.query.turno
  estado = req.query.estado
  
  init();
  res.send("Hola mundo"); 
  
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`))


function buscarPosicionReal(posicion){
	console.log("Buscando: " + posicion);
	for(var i=0; i<wertDic.length; i++){
		if(wertDic[i] == posicion){
			console.log("Encontrado en: " + i);
			console.log("Equivale a: " + wertRea[i]);
			break;
		}
	}
}

function init()
{
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
  printState(Spielfeld);
  
  checkPossibilities(turno); //BUSCO LAS POSIBILIDADES
  KI();
  console.log(possibilities);
    
}

function reemplazarNumeracion(){
	console.log("reemplazarNumeracion");
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


function printState(board){
	console.log("Estado actual: ");	
	console.log(board);
}

function checkPossibilities(color){
	var Reihe, Spalte;
	var i, j, k;
	var flips = '';
	var anzahl = 0;

  //At first this array has to be reset.
  for (i = 0;  i < 64;  i++)
  {
    possibilities[i]['anzahl'] = 0;
    possibilities[i]['flips'] = '';
  }
  
  //Afterwards the color of the opponent is determined.
  var opponent = (color == 1) ? 2 : 1;

 //Now for each disc of color there are some checks.
  for (i = 0;  i < 64;  i++)
  {
    if (Spielfeld[i] == color)
    {
	//The row and column of the current disc are calculated.
      Reihe = Math.floor(i/8);
      Spalte = i%8;

//Now the current row is checked for empty fields. Of course the current field and also the adjacent fields are left out.
      for (j = 0;  j < 8;  j++)
      {
        if (j == Spalte || j == Spalte-1 || j == Spalte+1) continue;
//If an empty field is found it's checked if all the fields between the selected field and the empty one belong to the opponent. If this is the case anzahl is incremented and the fields are added to flips, if not both variables are reset and the next empty field is checked.
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
	  
	//The same procedure for the discs in the same column...
      for (j = 0;  j < 8;  j++)
      {
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
	  
//Accordingly for diagonal lines...
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

//Finally the heart of the game, the artificial intelligence. I tried to make it as simple but effective as possible. Of course you can somewhat trick it if you know which moves it prefers, so if you still want to enjoy the game, go ahead to the HTML part at the bottom. However if you still want to know how it works, go on.
function KI()
{
  var i, j, k, l;
  var blah, blah2, nimm;
  var temp  = new Array();
  var temp2 = new Array();
  var temp3 = new Array();

//The best moves are always those where the opponent cannot move in the next turn (this way you can also find out possible wipe-outs). So at first it's checked, if such moves exist. To do that, the fakeFlip() function from above is used. After flipping all the necessary discs for one possible move the checkPossibilities() function is called for the player and afterwards checkMove() checks, if the player has any legal moves. If he doesn't, this move is instantly added to the computer's choice.
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

//If no moves were found yet the next target are the edges.
  if (typeof(temp2[0]) == 'undefined')
  {
    if (possibilities[0]['anzahl'] > 0) temp2.push(0);
    if (possibilities[7]['anzahl'] > 0) temp2.push(7);
    if (possibilities[56]['anzahl'] > 0) temp2.push(56);
    if (possibilities[63]['anzahl'] > 0) temp2.push(63);

//If there's still no success, check the fields on the boarders except for those adjacent to the edges. Those are of the same importance under the circumstance, that the edge is already occupied, so this is checked directly afterwards.
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
//If still no move was found, the third row and column from the outside is checked and the fields diagonally adjacent to the edges, if the edge is already conquered.
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
//You know the deal... no move found yet, so look further. This time for the second row and column from the outside...
        if (typeof(temp2[0]) == 'undefined')
        {
          for (i = 2;  i < 6;  i++)
          {
            if (possibilities[(8+i)]['anzahl'] > 0) temp2.push(8+i);
            if (possibilities[(i*8+1)]['anzahl'] > 0) temp2.push(i*8+1);
            if (possibilities[(i*8+6)]['anzahl'] > 0) temp2.push(i*8+6);
            if (possibilities[(48+i)]['anzahl'] > 0) temp2.push(48+i);
          }
//... the horizontal and vertical adjacent fields to the edges, no matter if the edge is conquered or not...
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
//... and finally the diagonally adjacent fields. Now all fields were checked.
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
//Now the computer has to choose the best move from those that were found out. During the first 10 moves those are decided by chance. This way the computer may choose moves that leave him with far less discs on the board than his opponent. During the beginning of the game this can be a mobility advantage. Also the decision by chance makes the AI more flexible, because it doesn't choose the same moves for the same opening again and again.
  if (white + black < 25)
  {
    for (i = 0;  i < temp2.length;  i++) temp3[i] = temp2[i];
  }
 //Later it chooses the move with the highest difference between the now won values and the possible values of the best couter move the opponent can take. This is the point where the wert[] array from the beginning becomes important.
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
  console.log("temp3: " + temp3);
 //Still there can be more than one move of the same importance. So finally a move is chosen by chance.
  blah = Math.floor((Math.random() * 1000) % temp3.length);
  nimm = temp3[blah];
  
  buscarPosicionReal(nimm);
  
  console.log("Movimiento: " + nimm);
  putPiece(computer, nimm);
  flip(computer, nimm);
 //Finally the possibilities for the player are checked. If he can move the control is given to him, if not the AI calls itself again after 2 seconds. However if the AI cannot move itself the game is over.
  progress = 0;
  checkPossibilities(player);
  
  if (checkMove() == 0)
  {
    checkPossibilities(computer);
    if (checkMove() == 0) gameOver();
    else setTimeout("KI()", 2000);
  }
  else for (i = 0;  i < 64;  i++)
  {
    if (possibilities[i]['anzahl'] > 0) putPiece (5,i);
    else if (Spielfeld[i] == 0) putPiece(0,i);
  }
}

//fakeFlip() does the same, except that it doesn't switch the graphics
function fakeFlip(color, field)
{
  var temp = new Array();
  temp = tempPossibilities[field]['flips'].split('|');
  for (var i = 0;  i < temp.length-1;  i++)
  {
    Spielfeld[(temp[i])] = color;
  }
}

//The following function checks, if there are any possible moves at the moment.
function checkMove()
{
  var j = 0;
  for (var i = 0;  i < 64;  i++)
  {
    j += possibilities[i]['anzahl'];
  }
  return j;
}


//The following function is used to make changes to a certain position on the board.
function putPiece(color, field)
{
//5 for the color parameter is used for the flipcounts. Those of course are only shown if it's the player's turn, i.e. if progress is 0.
  if (color == 5 && progress == 0)
  {
    //document.getElementById('O'+field).className = 'game point';
    //if (showHelp == 1) document.getElementById('O'+field).firstChild.nodeValue = possibilities[field]['anzahl'];
  }
//0 for color is used to clear a field.
  else if (color == 0 || (color == 5 && progress == 1))
  {
    //document.getElementById('O'+field).className = 'game normal';
    //document.getElementById('O'+field).firstChild.nodeValue = ' ';
  }
//The other colors are for white and black. The following part either flips a disc or puts a new one. After the rotating animation is played, it's also replaced by a static image.
  else
  {
    if (Spielfeld[field] != 0)
    {
      //document.getElementById('O'+field).className = (color == 1) ? 'towhite' : 'toblack';
      //setTimeout("document.getElementById('O"+field+"').className = "+ ((color == 1) ? "'white'; " : "'black'; "), 1500);
    }
    else {
	//document.getElementById('O'+field).className = (color == 1) ? 'white' : 'black';
	}
    Spielfeld[field] = color;
    //document.getElementById('O'+field).firstChild.nodeValue = ' ';
//Now the discs for both parties are counted.
    white = 0;
    black = 0;
    for (j = 0;  j < 64;  j++)
    {
      if (Spielfeld[j] == 1) white++;
      if (Spielfeld[j] == 2) black++;
    }
    //document.getElementById('white').firstChild.nodeValue = white;
    //document.getElementById('black').firstChild.nodeValue = black;
  }
}

//flip() rotates discs
function flip(color, field)
{
  var temp = new Array();
  temp = possibilities[field]['flips'].split('|');
  for (i = 0;  i < temp.length-1;  i++)
  {
    putPiece(color,temp[i]);
  }
}
