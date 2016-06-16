import './canvasUtils.js'

///////////////////////////////////////////ARCHITECTURE////////////////////////////////////

var frameCount = 0;
var touchPos = new vec2d(0,0);
var canvasCallback;
var canvasCenter = new vec2d(0,0);
var blob;

Template.balloons.onRendered (function(){

    var c = $('#canvas');


	touchCount = 0;

    if(c !== undefined)
    {

    	var canvas = c[0];

		var width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
		var height = (window.innerHeight > 0) ? window.innerHeight : screen.height;

		if(canvas){
	    	canvas.setAttribute('width', width);
	    	canvas.setAttribute('height', height);
	    	canvasCenter.x = width/2;
			canvasCenter.y = height/2;
			blob = new Blob();
		}


	    Meteor.clearInterval(canvasCallback);
	    canvasCallback = Meteor.setInterval(draw, 10);

	    frameCount = 0;

	    canvas.addEventListener("touchstart", function (e) {
	      
	      //console.log("start");
	      touchPos = getTouchtouchPos(canvas, e);

	    }, false);

	    canvas.addEventListener("touchmove", function (e) {
	      
	      touchPos = getTouchtouchPos(canvas, e);

	    }, false);

	    canvas.addEventListener("touchend", function (e) {
	      
	      //console.log("end");
	      blob.increment();

	    }, false);

	}


});



Template.balloons.onDestroyed(function(){

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

    blob.draw(context);
}

function getTouchtouchPos(canvasDom, touchEvent)
{
  //var rect = canvasDom.getBoundingClientRect();

  //this is a crude version which only works if the canvas is the whole screen

  return {
    x: touchEvent.touches[0].clientX ,
    y: touchEvent.touches[0].clientY
  };
}




///////////////////////////////////////////////////SHAPES////////////////////////////////////////////////////////




function Blob(){


	this.touchCount = 0;
	this.maxTouchCount = 25;
	this.numPoints = 100;
	this.points = [];
	this.growth = 0.001;
	this.energy = 0;
	this.sleeping = false;
	this.release = 5000;
	this.releaseCount = 0;
	this.noise = new Rand(Math.random());
	this.options = blobOptions;


	/////////////////////METHODS//////////////////////

	this.resetPoints = function()
	{

		this.points.length = 0;
		var radius = canvasCenter.x;
		var incr = 1.0/this.numPoints * Math.PI * 2;
		var seed = Math.random();
		var mix = this.energy * 0.8;

		for(var i = 0; i < this.numPoints; i++)
		{

			
			var mul = this.noise.getRand(i/this.numPoints + seed);
			var r = radius * mix * mul + radius * (1 - mix);

			var p = new vec2d(
				Math.sin(i * incr) * r,
				Math.cos(i * incr) * r
					);
			this.points.push(p);
		}

		this.options = {

		    amp: 1,
		    pan:  Math.random() * 1.5 * 0.75,
		    tweetRel: 2.0 + Math.random() * 6.0,
			tweetMul: Math.random(),
			tweetAdd: 66 + Math.random() * 40,
			combMul: Math.random(),
			shotDec: 0.01 + Math.pow(Math.random(),2) * 0.5,
		    splay: 0

		  }
	}


	this.increment = function()
	{
		if(this.sleeping)return;

		this.touchCount += 1;
		if(this.touchCount > this.maxTouchCount)
		{
			this.touchCount = 0;
			this.sleeping = true;
			this.release = this.options.tweetRel * 1000;
			this.releaseCount = this.release;
			Meteor.call('blobPing', this.options); // sound options will go here
		}

		this.growth = Math.max(0.001, Math.min(1.0,this.touchCount/this.maxTouchCount));
		this.growth = Math.pow(this.growth,0.25);
		this.energy = Math.pow(this.touchCount/this.maxTouchCount, 2);
		this.resetPoints();


	}

	this.draw = function(ctx){

		ctx.translate(canvasCenter.x, canvasCenter.y);

		if(this.sleeping){

			this.releaseCount -= 10;
			if(this.releaseCount < 0)this.sleeping = false;
			
			// draw hairs
			var a = this.releaseCount /this.release;

			ctx.beginPath();
			ctx.lineWidth="3";
			ctx.strokeStyle="rgba(255, 130, 171, " + a + ")";

			for(var j = 0; j < 20; j++){

				var p = new vec2d(
					(rand(j/20.0) - 0.5 ) * canvasCenter.x * 2.0, 
					(rand(((j+10)%20.0)/20.0) - 0.5 ) * canvasCenter.y * 2.0
					);

				ctx.moveTo(p.x, p.y);
				for(var i = 0; i < 10; i++){

					p.add(new vec2d(10 * Math.random() - 5, 10 * Math.random() - 5));
					ctx.lineTo( p.x, p.y);
				}

			}

			ctx.stroke();

			return;
		}

		var shift = this.energy * 20;
	
		ctx.translate(Math.random() * shift, Math.random() * shift);
		ctx.scale(this.growth, this.growth);

		ctx.beginPath();
		ctx.lineWidth="3";
		ctx.strokeStyle="pink";
		ctx.fillStyle="pink";

		var p = this.points[0];//.getMul(0.5);
		ctx.moveTo(p.x, p.y);


		for(var i = 1; i < this.numPoints + 1; i++)
		{
			var p = this.points[i%this.numPoints];//.getMul(0.5);
			ctx.lineTo(p.x, p.y);
		}
		
		//ctx.fill(); // Fill it
		ctx.stroke();

		ctx.font = 'Bold 100px Sans-Serif';
        ctx.fillText('tap', -80, 0);

		ctx.setTransform(1,0,0,1,0,0); //essentially pop matrix
	}

	/////////////////////////////////////
	this.touchCount = -1;
	this.increment();

	return this;
}


