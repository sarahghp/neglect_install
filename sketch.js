
var g_cfg = {
  chartNum: 0,
  chartW: 220,
  chartH: 800,
  titlePadding: 20,
  squareSize: 40,
  colHeight: 400,
};

var fills = ['#9ae8d2', '#ff8993', '#b977d3', '#fff055'];

// Generate charts

var charts = _.map(fills, function(fill, i){
  
  var cols = _.times(Math.floor(g_cfg.chartW / g_cfg.squareSize), function(idx){
    return Object.assign({}, { 
      num: idx,
      x: g_cfg.squareSize * idx,
      type: 'full'
    });
  });

  var atts = Object.assign({}, g_cfg, { fill: fill, chartNum: i, colsArray: cols });


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

      // elements

      p.noStroke();
      p.fill(data.fill);

      _.forEach(data.colsArray, function(col){
        p.rect(col.x, 0, data.squareSize, data.colHeight);
      })




    };

  }


  var inst = new p5(chart);
}
