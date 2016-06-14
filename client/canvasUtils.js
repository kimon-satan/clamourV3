var frameCount = 0;
var pos = new vec2d(0,0);
var canvasCallback;


Template.blob.onRendered (function(){

    var c = $('#canvas');

	
    if(c !== undefined)
    {

    	var canvas = c[0];

		var width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
		var height = (window.innerHeight > 0) ? window.innerHeight : screen.height;

		if(canvas){
	    	canvas.setAttribute('width', width);
	    	canvas.setAttribute('height', height);
		}

	    Meteor.clearInterval(canvasCallback);
	    canvasCallback = Meteor.setInterval(draw, 10);

	    frameCount = 0;

	    canvas.addEventListener("touchstart", function (e) {
	      
	      pos = getTouchPos(canvas, e);

	    }, false);

	    canvas.addEventListener("touchmove", function (e) {
	      
	      pos = getTouchPos(canvas, e);

	    }, false);

	}


});

Template.blob.onDestroyed(function(){

  Meteor.clearInterval(canvasCallback);

  var canvas = $('#canvas')[0];

	if(canvas !== undefined)
	{
		console.log(canvas);
	}

});



function draw()
{

    var canvas = $('#canvas')[0];
    frameCount += 1;
    var context = canvas.getContext('2d');
    context.setTransform(1,0,0,1,0,0);
    context.clearRect(0, 0, canvas.width, canvas.height);

    /*var x = canvas.width / 2 ;
    var y = canvas.height / 2 ;
    var phase = 5 * frameCount/360;

    for(var i = 0; i < 20; i++)
    {
      context.fillStyle = 'green';
      context.fillRect(x - 10 + Math.sin(phase + i * Math.PI/10) * x  , y - 10 + Math.cos(phase + i * Math.PI/10) * y, 20, 20);
    }

      context.fillStyle = 'red';
      context.fillRect(pos.x -10, pos.y, 20, 20);*/

     drawBlob(context);



}

function drawBlob(ctx) {

	
    var x = canvas.width / 2 ;
    var y = canvas.height / 2 ;

	ctx.translate(x,y);
	ctx.rotate(frameCount/360);

   	var numPoints = 10;
	var points = [];
	var cpoints = [];


	for(var i = 0; i < numPoints; i++)
	{

		var p = new vec2d(
			Math.sin(i/numPoints * Math.PI * 2) * x * 0.7,
			Math.cos(i/numPoints * Math.PI * 2) * x * 0.7 
				);
		points.push(p);

	}

	

	for(var i = 1; i < numPoints + 1; i++)
	{
		var a = points[i%numPoints];
		var b = points[(i-1)];
		var v = b.getSub(a);
		
		//mid point
		var mp = a.getAdd(v.getMul(0.5));

		var shift = (Math.sin(frameCount/100 + rand(i/4.0) * Math.PI) + 1.0 ) * 50;
		var cp = v.getNormalised().getNormal().getMul(shift  ).getAdd(mp);

		cpoints.push(cp);

		/*ctx.beginPath();
		ctx.arc(cp.x, cp.y , 10, 0, Math.PI * 2);
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(mp.x, mp.y);
		ctx.lineTo(cp.x , cp.y);
		ctx.stroke();*/

	}



	ctx.beginPath();
	ctx.lineWidth="3";
	ctx.strokeStyle="pink"; // Green path
	ctx.moveTo(points[0].x , points[0].y);


	for(var i = 1; i < numPoints + 1; i++)
	{
		var p = points[i%numPoints];
		var cp = cpoints[i-1];

		ctx.quadraticCurveTo(
			cp.x, cp.y,
			p.x, p.y
		);
	}
	ctx.stroke(); // Draw it
	

	ctx.setTransform(1,0,0,1,0,0);
}

function getTouchPos(canvasDom, touchEvent)
{
  //var rect = canvasDom.getBoundingClientRect();

  //this is a crude version which only works if the canvas is the whole screen

  return {
    x: touchEvent.touches[0].clientX ,
    y: touchEvent.touches[0].clientY
  };
}




/*-----------------------------------------------------*/
// useful 2D vec class

function vec2d(x, y){

	this.x = x;
	this.y = y;

	this.sub = function(val){

		if(val instanceof vec2d)
		{
			this.x -= val.x;
			this.y -= val.y;
		}
		else
		{
			this.x -= val;
			this.y -= val;
		}
	}

	this.add = function(val)
	{
		if(val instanceof vec2d)
		{
			this.x += val.x;
			this.y += val.y;
		}
		else
		{
			this.x += val;
			this.y += val;
		}
	}

		this.sub = function(val){

		if(val instanceof vec2d)
		{
			this.x -= val.x;
			this.y -= val.y;
		}
		else
		{
			this.x -= val;
			this.y -= val;
		}
	}

	this.getAdd = function(val)
	{

		var o = new vec2d(this.x,this.y);

		if(val instanceof vec2d)
		{
			o.x += val.x;
			o.y += val.y;
		}
		else
		{
			o.x += val;
			o.y += val;
		}

		return o;
	}

	this.getSub = function(val)
	{

		var o = new vec2d(this.x,this.y);

		if(val instanceof vec2d)
		{
			o.x -= val.x;
			o.y -= val.y;
		}
		else
		{
			o.x -= val;
			o.y -= val;
		}

		return o;
	}

	this.getMul = function(val)
	{
		var o = new vec2d(this.x,this.y);

		o.x *= val;
		o.y *= val;

		return o;
	}

	this.getDot = function(val)
	{
		if(val instanceof vec2d)
		{
			var scalar = this.x * val.x + this.y * val.y;
			return scalar;
		}
	}

	this.getNormalised = function()
	{
		//length squared
		var dp = this.getDot(this);
		var o = this.getMul(1.0/Math.sqrt(dp)); //normalized
		return o;
	}

	this.getNormal = function(){
		var o = new vec2d(this.y,-this.x);
		return o;
	}


	return this;

}

/*-----------------------------------------------------------------------*/

//hashable random function

rand = function(x){
	var f  = ((x * 1308153369613)%3628811 )/3628811.0; 
	return f;
}

// one with a seed for multiple instances

function Rand(seed) {
	
	this.seed = seed;

	this.getRand = function(x){
		x = (x + seed)%1.0;

		var f  = ((x * 1308153369613)%3628811 )/3628811.0; 
		return f;
	}
}

