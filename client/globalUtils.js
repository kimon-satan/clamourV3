/*---------------------------------------------------------GENERIC FUNCTIONS-----------------------------------*/

randCol = function(){

	return '#'+Math.floor(Math.random()*16777215).toString(16);
}

chooseRandomVoice = function(){
    var v = voices[Math.floor(Math.random() * voices.length)];
    return v;
}


generateTempId  = function(n){

  var chars = "abcdefghijklmnnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ!@£$%^&*()-=_+";  
  var count = 0;
  var str = "";
  var idx;

  while(count < n){

    idx = Math.random() * (chars.length - 1);
    str += chars[parseInt(idx)];
    count++;
  }

  return str;

}

parseOptions = function (options_i, options_o){

  for(var i in options_i){

    if(typeof(options_i[i]) == "string" || typeof(options_i[i]) == "number"){
        options_o[i] = isNumber(options_i[i])? parseFloat(options_i[i]) : options_i[i];
    }else if(typeof(options_i[i]) == "object"){
        if(options_i[i] instanceof Array){
          var idx = parseInt(Math.floor(Math.random() * options_i[i].length));
          options_o[i] = isNumber(options_i[i][idx])? parseFloat(options_i[i][idx]) : options_i[i][idx];
        }else{
          var r = parseFloat(options_i[i].max) - parseFloat(options_i[i].min);
          options_o[i] = Math.random() * r + options_i[i].min;

        }
    }else if(typeof(options_i[i]) == "boolean"){
      options_o[i] = options_i[i];
    }

  }

}