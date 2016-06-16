

/*-----------------------------------------------------*/
// useful 2D vec class

vec2d = function(x, y){

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
	var f  = fract(Math.sin(x)*1308153369613);
	return f;
}

fract = function(f)
{
	return (f < 1.0) ? f : (f % Math.floor(f));
}

//seedable object

Rand = function(seed) {

	//ensures seed is a 6 digit number
	this.seed = Math.floor(rand(seed) * 100000);

	this.getRand = function(x){
	
		var f  = fract(Math.sin(x)*1308153369613 + seed);
		return f;
	}
}



