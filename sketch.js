// Variation consts
var HARDWARE = false;
var STATS = true;
var TEST_STATE = 'long-long'; // options dev, short-long, long-long, show

// Test configurations

var decay = {
  'dev': {
    initBuffer: 20, // How many cycles on the counter until the book is considered "down"?
    leadTime: 2000, // How long down (in ms) before we should start fading?
    incDivisor: 1000, // Used with incMod to define cycle length (see forceState fn)
    incMod: 1,
    totalRefill: 1000, // How long, in ms until a column is refilled
    bottomChance: 0.95, // Chance a faded square is a bottom square as opposed to random
  },

  'short-long': {
    initBuffer: 20, // How many cycles on the counter until the book is considered "down"?
    leadTime: 5000, // How long down (in ms) before we should start fading?
    incDivisor: 1000, // Used with incMod to define cycle length (see forceState fn)
    incMod: 3,
    totalRefill: 120000, // How long, in ms until a column is refilled
    bottomChance: 0.97, // Chance a faded square is a bottom square as opposed to random
  },

  'long-long': {
    initBuffer: 20, // How many cycles on the counter until the book is considered "down"?
    leadTime: 2000, // How long down (in ms) before we should start fading?
    incDivisor: 1000, // Used with incMod to define cycle length (see forceState fn)
    incMod: 50,
    totalRefill: 400000, // How long, in ms until a column is refilled
    bottomChance: 0.95, // Chance a faded square is a bottom square as opposed to random
  },

  'show': {
    initBuffer: 20, // How many cycles on the counter until the book is considered "down"?
    leadTime: 300, // How long down (in ms) before we should start fading?
    incDivisor: 1000, // Used with incMod to define cycle length (see forceState fn)
    incMod: 3,
    totalRefill: 400000, // How long, in ms until a column is refilled
    bottomChance: 0.95, // Chance a faded square is a bottom square as opposed to random
  },

}

// Board setup
if (HARDWARE) {
  // var board = p5.board('/dev/cu.usbmodem1421', 'arduino'), // mac
  var board = p5.board('/dev/ttyACM0', 'arduino'), // pi
      firstBook   = board.pin(3, 'VRES'),
      secondBook  = board.pin(2, 'VRES'),
      thirdBook   = board.pin(1, 'VRES'),
      fourthBook  = board.pin(0 , 'VRES');
}

// Chart setup
var g_cfg = {
  chartNum: 0,
  chartW: 400,
  titlePadding: 20,
  squareSize: 20,
  colHeight: 800,
  counter: 0,
  intervalId: undefined,
  lastDown: undefined,
  textDiv: undefined,
  fullCols: [],
  stopped: false,
  texts: {
    full: 'are you fulfilled?',
    justFilled: '♡♥♡♥♡♥♡♥♡',
    fading: 'read me read me',
    danger: 'i don\'t feel so great',
    imminent: 'urgh',
    dead: 'you monsters' 
  }
};

var fills = ['#9ae8d2', '#ff8993', '#fff055', '#b977d3'],
    pins  = [firstBook, secondBook, thirdBook, fourthBook],
    books = [
      { title: 'The Big Sleep/Farewell My Lovely',
        date: '1939/1940',
        pages: 544,
        dimension: '5.1 x 1.4 x 7.6',
        price: '16.13' },
      { title: 'The Glass Cage',
        date: 2014,
        pages: 288,
        dimension: '6.5 x 1 x 9.6',
        price: '$5.35' },
      { title: 'A Little Princess',
        date: 1905,
        pages: 320,
        dimension: '5.2 x 1.0 x 7.3',
        price: '$11.50' },
      { title: 'The Book of Symbols',
        date: 2010,
        pages: 810,
        dimension: '6.9 x 2.1 x 9.7',
        price: '$28.15' }
    ];

// Generate chart objects

var charts = _.map(fills, function(fill, i){

  var numRows = Math.floor(g_cfg.colHeight / g_cfg.squareSize),
      numCols = Math.floor(g_cfg.chartW / g_cfg.squareSize);
  
  var cols = _.times(numCols, function(idx){
    return Object.assign({}, { 
      num: idx,
      fill: fill, 
      x: g_cfg.squareSize * idx,
      y: 0,
      yCount: 0,
      height: g_cfg.colHeight
    });
  });

  var atts = Object.assign({}, g_cfg, { 
    chartNum: i,
    pin: pins[i], 
    colsArray: cols, 
    numCols: numCols, 
    numRows: numRows,
    book: books[i] });

  return atts;
});

console.log('Chart objects:', charts);

// Actually draw charts
_.forEach(charts, makeBigRect);

// Draw little unit charts
function makeBigRect(data){

  function chart(p){

    p.setup = function() {

      // layout

      var canvas = p.createCanvas(data.chartW, data.colHeight),
          div = p.createDiv('');

      data.textDiv = p.createDiv('');
      data.textDiv.id('text_'+ data.chartNum);

      if (STATS) {
        div.class('chart');
        canvas.parent(div);

        data.textDiv.parent(div);
        data.textDiv.class('stats');
        baseText(data, data.textDiv);
      
      } else {

        data.textDiv.parent(div);
        data.textDiv.class('text');
        baseText(data, data.textDiv);

        var hr = p.createDiv('\n <hr>');
        hr.parent(div);
        hr.class('hr');

        div.class('chart');
        canvas.parent(div);
      }
      
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

      if (STATS) {
        textState(data, '#title_' + data.chartNum);
      } else {
        textState(data, '#text_' + data.chartNum);
      }
      
      

    } // draw

    // Use keypress to test that time-triggered functions are working
    p.keyPressed = function() {
      if (p.keyCode == p.LEFT_ARROW){
        fadeRandomSquare(data.colsArray, data.numCols, data.numRows);
      } else if (p.keyCode == p.RIGHT_ARROW){
        fadeBottomSquare(data.colsArray, data.numCols, data.numRows, data);
      } else if (p.keyCode == p.UP_ARROW){
        refill(data.colsArray, data.numCols, data);
      }
      else if (p.keyCode == p.DOWN_ARROW){
        if (data.pin) {
          console.log('value', data.pin.val, 'over?', data.pin.overThreshold());
        }

        if (STATS) {
          textFlash(data.texts.justFilled, '#title_' + data.chartNum, data)
        } else {
          textFlash(data.texts.justFilled, '#text_' + data.chartNum, data);
        }

        
      }
    }

    // Text
    function baseText(data){

      // Always clear the div before adding content again
      data.textDiv.elt.textContent = '';

      if (STATS) {
        var text = p.createP(data.book.title);
        text.parent(data.textDiv);
        text.id('title_' + data.chartNum)

        var date = p.createP('Published ' + data.book.date);
        date.parent(data.textDiv);
        date.class('sub');

        var pages = p.createP(data.book.pages  + ' pages');
        pages.parent(data.textDiv);
        pages.class('sub');

        var dim = p.createP(data.book.dimension);
        dim.parent(data.textDiv);
        dim.class('sub');

        var price = p.createP('Purchased for ' + data.book.price);
        price.parent(data.textDiv);
        price.class('sub');
        
      } else {
        var text = p.createSpan(data.book.title);
        text.parent(data.textDiv);

        var span = p.createSpan(data.book.date);
        span.parent(data.textDiv); 
      }
      

    }

    function textFlash(text, selector, data){
      
      var container = p.select(selector);
      container.elt.textContent = text;

      function restore(){
        baseText(data, data.textDiv);
      }

      setTimeout(restore, 500);
    }

    function textState(data, selector){

      var go = Math.round(Date.now()) % (data.chartNum + 300) === 3;

      if (go){
        var category = getCategory(data.colsArray.length, data.numCols, data.numCols * data.numRows);
        var text = data.texts[category];
        textFlash(text, selector, data);
      }

    }


    // Moth-eating
    function forceState(data){
      
      var d = decay[TEST_STATE];

      if (data.pin.overThreshold()) {
        console.log('over');
        ++data.counter;
      } else {
        data.counter = 0;
        data.lastDown = undefined;
        data.fullCols = [];
        data.stopped = false;
        refill(data.colsArray, data.numCols, data);
      }

      if (data.counter > d.initBuffer && !data.stopped) {
        
        data.lastDown = data.lastDown ? data.lastDown : Date.now();
        var diff = Date.now() - data.lastDown;
        // console.log('diff', diff);

        window.clearInterval(data.intervalId);
        data.intervalId = undefined;

        // Hacky way to set long-death
        if (data.chartNum == 2) {
          if (diff > d.leadTime && Math.round(diff/1000) % 3240 === 0) {

            if (p.random() > decay[TEST_STATE].bottomChance) { // 0.95 gives 1 in 20 chance of taking random square
              fadeRandomSquare(data.colsArray, data.numCols, data.numRows);
            } else {
              fadeBottomSquare(data.colsArray, data.numCols, data.numRows, data);
            }
            
          }
        } else { 

          if (diff > d.leadTime && Math.round(diff/d.incDivisor) % d.incMod === 0) {
            console.log('Fade.');

            if (p.random() > decay[TEST_STATE].bottomChance) { // 0.95 gives 1 in 20 chance of taking random square
              fadeRandomSquare(data.colsArray, data.numCols, data.numRows);
            } else {
              fadeBottomSquare(data.colsArray, data.numCols, data.numRows, data);
            }
            
          }
        }
      }

    } // forceState


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

    function fadeBottomSquare(columnsArray, numCols, numRows, data){
      var chosenCol = columnsArray[randomInt(0, numCols)];
      ++chosenCol.yCount;

      if (chosenCol.yCount > numRows) {
        data.fullCols[chosenCol.num] = true;
        data.stopped = checkForFullCols(data);
      }

      var newSq = Object.assign({}, {
        fill: 'hsla(360, 100%, 100%, 0.6)',
        x: chosenCol.x,
        y: data.colHeight - (data.squareSize * chosenCol.yCount),
        height: data.squareSize * chosenCol.yCount,
      });

      columnsArray.push(newSq);
    }

    function checkForFullCols(data){
      var full = true;

      for (var i = 0; i < data.numCols; i++){
        if (full && !data.fullCols[i]){
          full = false;
        }
      }

      return full;
    }

    function refill(columnsArray, numCols, data){
      
      var timing = Math.round(decay[TEST_STATE].totalRefill / (columnsArray.length - numCols));
      
      if (data.intervalId == undefined) {
        data.intervalId = setInterval(popTilDone.bind(this), timing);
        
        _.forEach(columnsArray, function(col){
          col.yCount = 0;
        }); 
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

function getCategory(num, min, max){
  switch(true){
    case (num > min && num <= 0.4 * max):
      return 'fading';
      break;

    case (num > 0.4 * max && num <= 0.8 * max):
      return 'danger';
      break;

    case (num > 0.8 * max && num <= 0.89 * max):
      return 'imminent';
      break;

    case (num > 0.89 * max):
      return 'dead';
      break;

    default:
      return 'full';
  }
}
