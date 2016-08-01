// Board setup
var HARDWARE = false;

if (HARDWARE) {
  var board = p5.board('/dev/cu.usbmodem1421', 'arduino'),
      firstBook   = board.pin(0, 'VRES'),
      secondBook  = board.pin(1, 'VRES'),
      thirdBook   = board.pin(2, 'VRES'),
      fourthBook  = board.pin(3, 'VRES');
}

// Chart setup
var g_cfg = {
  chartNum: 0,
  chartW: 220,
  chartH: 400,
  titlePadding: 20,
  squareSize: 20,
  colHeight: 400,
  counter: 0,
  intervalId: undefined,
  lastDown: undefined
};

var fills = ['#9ae8d2', '#ff8993', '#b977d3', '#fff055'],
    pins  = [firstBook, secondBook, thirdBook, fourthBook];

// Generate charts

var charts = _.map(fills, function(fill, i){

  var numRows = Math.floor(g_cfg.chartH / g_cfg.squareSize),
      numCols = Math.floor(g_cfg.chartW / g_cfg.squareSize);
  
  var cols = _.times(numCols, function(idx){
    return Object.assign({}, { 
      num: idx,
      fill: fill, 
      x: g_cfg.squareSize * idx,
      y: 0,
      yCount: 0,
      height: g_cfg.chartH
    });
  });

  var atts = Object.assign({}, g_cfg, { 
    chartNum: i,
    pin: pins[i], 
    colsArray: cols, 
    numCols: numCols, 
    numRows: numRows });


  return atts;
});

console.log('Chart objects:', charts);

_.forEach(charts, makeBigRect);

// Draw little unit charts
function makeBigRect(data){

  function chart(p){

    p.setup = function() {

      // canvas

      var canvas = p.createCanvas(data.chartW, data.chartH),
          div = p.createDiv('');

      // text

      var textDiv = p.createDiv('');
      textDiv.parent(div);

      var text = p.createP('This is a test.\n <hr>');
      text.style('width:' + data.chartW);
      text.parent(textDiv);

      div.class('chart');
      canvas.parent(div);

      // sensors
      if (HARDWARE) {
        data.pin && data.pin.threshold(300);
        data.pin && data.pin.read();        
      }

      // perfomance shenanigans

      p.frameRate(10);

    }; // setup

    p.draw = function() {
      p.noStroke();
      p.clear();

      _.forEach(data.colsArray, function(col){
        p.fill(col.fill);
        p.rect(col.x, col.y, data.squareSize, col.height);
      });

      if (HARDWARE) {
        data.pin && forceState(data);
      }
      

    } // draw

    p.keyPressed = function() {
      if (p.keyCode == p.LEFT_ARROW){
        fadeRandomSquare(data.colsArray, data.numCols, data.numRows);
      } else if (p.keyCode == p.RIGHT_ARROW){
        fadeBottomSquare(data.colsArray, data.numCols, data.numRows);
      } else if (p.keyCode == p.UP_ARROW){
        refill(data.colsArray, data.numCols, data);
      }
      else if (p.keyCode == p.DOWN_ARROW){
        if (data.pin) {
          console.log('value', data.pin.val, 'over?', data.pin.overThreshold());
        }
      }
    }

    // Calibration
    function forceState(data){

      if (data.pin.overThreshold()) {
        console.log('over');
        ++data.counter;
      } else {
        data.counter = 0;
        data.lastDown = undefined;
        refill(data.colsArray, data.numCols, data);
      }

      if (data.counter > 50) {
        data.lastDown = data.lastDown ? data.lastDown : Date.now();
        var diff = Date.now() - data.lastDown;
        console.log('diff', diff);

        window.clearInterval(data.intervalId);
        data.intervalId = undefined;

        if (diff > 5000 && Math.round(diff/1000) % 3 === 0) {
          console.log('Fade.');
          fadeBottomSquare(data.colsArray, data.numCols, data.numRows);
        }

      }

    }


    // Maniuplation fns
    function fadeRandomSquare(columnsArray, numCols, numRows){
      var newSq = Object.assign({}, {
        fill: 'hsla(360, 100%, 100%, 0.6)',
        x: columnsArray[randomInt(0, numCols)].x,
        y: randomInt(0, numRows) * data.squareSize,
        height: (p.random() > 0.65 ? 0.5 : 1) * data.squareSize,
      });

      columnsArray.push(newSq);
    }

    function fadeBottomSquare(columnsArray, numCols, numRows){
      var chosenCol = columnsArray[randomInt(0, numCols)];
      ++chosenCol.yCount;

      var newSq = Object.assign({}, {
        fill: 'hsla(360, 100%, 100%, 0.6)',
        x: chosenCol.x,
        y: data.colHeight - (data.squareSize * chosenCol.yCount),
        height: data.squareSize * chosenCol.yCount,
      });

      columnsArray.push(newSq);
    }

    function refill(columnsArray, numCols, data){
      // var timing = 120000 / (columnsArray.length - numCols); // over 2 minutes
      var timing = 500; // for testing
      if (data.intervalId == undefined) {
        data.intervalId = setInterval(popTilDone.bind(this),  timing);
        _.forEach(columnsArray, function(col){
          col.yCount = 0;
        }) 
      }

      function popTilDone() {
        if (columnsArray.length > numCols) {
          columnsArray.pop();
        } else {
          window.clearInterval(data.intervalId);
          data.intervalId = undefined;
        } 
      }

    } // refill

  } // chart

  var inst = new p5(chart);

} // makeBigRect


function randomInt(a, b) { 
  return Math.floor((Math.random() * (b - a)) + a);
}