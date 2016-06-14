

msgStream = new Meteor.Stream('msgStream');

var buttonPressed = false;
var panOffset = Math.random() * 2 - 1;

var numbersOptions = {};
var wordsOptions = {};
var onoffOptions = {};

var curRamp = {};

var counter = 0;
var pos = {x: 0, y: 0};
var canvasCallback;



Template.hello.events({

  'touchstart #play, click #play':function(e){

    var un = generateTempId(10);
    Accounts.createUser({username: un, password: '1234'});
    e.preventDefault();
  }

});



Template.clamour.created = function(){
  
  Meteor.subscribe("UserData", Meteor.user()._id, function(){
      Session.set('screenMode', UserData.findOne(Meteor.user()._id, {fields: {view: 1}}).view);
  });

  Meteor.subscribe("Presets",  function(){
    //do something

    numbersOptions = Presets.findOne({type: "numbers", name: "df"}).options;
    numbersOptions.ovol = numbersOptions.vol;

    wordsOptions = Presets.findOne({type: "words", name: "df"}).options;
    onoffOptions = Presets.findOne({type: "onoff", name: "df"}).options;
    var v = {

      numbers: numbersOptions.voice,
      on: onoffOptions.voice,
      off: onoffOptions.voice,
      words: wordsOptions.voice

    };

    Session.set('voice', v);

    UserData.update(Meteor.user()._id, {$set: {voice: v.numbers}});

  });
  

  var oo = {isOnButton: false, isOnActive: false, isOffButton: false};
  Session.set("onOffButtons", oo);

}

Template.clamour.screenMode = function(){return Session.get('screenMode');}

Template.clamour.isScreen = function(mode){

  return (Session.get('screenMode') == mode);
}

UI.registerHelper('voice', function(){return Session.get("voice")});


/*----------------------------------------------WORDS---------------------------------------------------*/

Template.words.created = function(){
    Session.set('isPause', false);
    Session.set("currentWord", wordsOptions.word);
}

Template.words.currentWord = function(){
  return Session.get("currentWord");
}

Template.words.vol = function(){return Session.get("wordsVol");}

Template.words.events({

  'touchstart #wordsBox, click #wordsBox' :function(e){

    if(Session.get("screenMode") != "words") return;

    if(buttonPressed)return;
    buttonPressed = true;

    var fstring = 'fadeInOut ' + wordsOptions.fade + 's forwards'
   $('#wordsBox').css('-webkit-animation', fstring ); 
   $('#wordsBox').css('animation', fstring); 

    var soundOptions = {

      num: Session.get('currentWord'),
      voice: Session.get('voice').words,
      pan: wordsOptions.pan + wordsOptions.splay * panOffset,
      vol: wordsOptions.vol

    };


    if(wordsOptions.kills){

      Meteor.call('killSynths'); //combine to make sure this works
      
    }

    Meteor.call('numPing', soundOptions);

    updateFontSizes();

    setTimeout(function(){

      buttonPressed = false;

      var v = Session.get('voice');
      v.words = (wordsOptions.rand) ? chooseRandomVoice() : wordsOptions.voice;
      Session.set('voice', v);
      wordsOptions.voice = v.words;
      Session.set('currentWord', wordsOptions.word);
      UserData.update(Meteor.user()._id, {$set: {voice: v.words}});

      $('#wordsBox').css('opacity', 0.25);
      $('#wordsBox').css('-webkit-animation', 'nil'); 
      $('#wordsBox').css('animation', 'nil'); 



    }, wordsOptions.fade * 1000 + wordsOptions.reset * 1000 );


    e.preventDefault();
  }

});




/*-----------------------------------------------------NUMBERS ----------------------------------------*/

Template.numbers.created = function(){
  Session.set('isPause', false);
}

Template.numbers.events({
  

  'touchstart #numberBox, click #numberBox': function (e) {

    if(Session.get("screenMode") != "numbers") return;

    if(buttonPressed)return;
    buttonPressed = true;
    var cn = Session.get('currNumber');

    var fstring = 'fadeInOut ' + numbersOptions.fade + 's forwards'
   $('#numberBox').css('-webkit-animation', fstring ); 
   $('#numberBox').css('animation', fstring); 


    var soundOptions = {

      num: cn,
      voice: Session.get('voice').numbers,
      pan: numbersOptions.pan + numbersOptions.splay * panOffset,
      vol: numbersOptions.vol

    };

    if(numbersOptions.rule == "minus"){
      numbersOptions.vol *= 0.9;
      numbersOptions.vol = Math.max(0.03, numbersOptions.vol);
    }else if(numbersOptions.rule == "plus"){
      numbersOptions.vol *= 1.1;
      numbersOptions.vol =  Math.min(numbersOptions.vol, 1.0);
    }


    updateFontSizes();

    Meteor.call('numPing', soundOptions);

    setTimeout(function(){

      buttonPressed = false;


      if(numbersOptions.start > numbersOptions.end){
        if(numbersOptions.lock){
          cn = Math.max(numbersOptions.end, cn - 1);
        }else{
          cn = cn - 1;
          if(cn < numbersOptions.end){
            
            var v = Session.get('voice');
            v.numbers = (numbersOptions.rand) ? chooseRandomVoice() : numbersOptions.voice;
            Session.set('voice', v);
            numbersOptions.voice = v.numbers;
            UserData.update(Meteor.user()._id, {$set: {voice: v.numbers}});
            
            cn = numbersOptions.start;
          }
        }
      }else{
        if(numbersOptions.lock){
          cn = Math.min(numbersOptions.end, parseInt(cn) + 1);
        }else{
          cn = parseInt(cn) + 1;
          if(cn > parseInt(numbersOptions.end)){
            cn = numbersOptions.start;
            var v = Session.get('voice');
            v.numbers = (numbersOptions.rand) ? chooseRandomVoice() : numbersOptions.voice;
            Session.set('voice', v);
            numbersOptions.voice = v.numbers;
            UserData.update(Meteor.user()._id, {$set: {voice: v.numbers}});

          }
        }
      }
      
      Session.set('currNumber', cn);

      $('#numberBox').css('opacity', 0.25);
      $('#numberBox').css('-webkit-animation', 'nil'); 
      $('#numberBox').css('animation', 'nil'); 

    },numbersOptions.fade * 1000);
   
    e.preventDefault();
  }

});

Template.numbers.currNumber = function(){return Session.get('currNumber');}
Template.numbers.vol = function(){return Session.get('numbersVol');}
Template.numbers.isPause = function(){return Session.get('isPause');}

function updateFontSizes(){
    Session.set("numbersVol", Math.max(Math.min(300,1000 * numbersOptions.vol),20));
    Session.set("wordsVol",  Math.max(Math.min(300,1000 * wordsOptions.vol),20));
    Session.set("onoffVol",  Math.max(Math.min(300,1000 * onoffOptions.vvol),20));
}


/*-----------------------------------------------CHAT --------------------------------------------*/
Template.chat.chatText = function(){return Session.get('chatText');}

/*---------------------------------------------------ON OFF-----------------------------------------*/

Template.onOff.vol = function(){return Session.get("onoffVol");}

Template.onOff.created = function(){

  UserData.update(Meteor.user()._id, {$set: {off: false, on: false}});
  var oo = Session.get('onOffButtons');
  oo.isOnButton = false;
  oo.isOnActive = false;
  oo.isOffButton = false;
  Session.set('onOffButtons', oo);
    
}

Template.onOff.destroyed = function(){

  UserData.update(Meteor.user()._id, {$set: {off: false, on: false}});
  var oo = Session.get('onOffButtons');
  oo.isOnButton = false;
  oo.isOnActive = false;
  oo.isOffButton = false;
  Session.set('onOffButtons', oo);

}

Template.onOff.isOnButton = function(){return Session.get('onOffButtons').isOnButton;}
Template.onOff.isOffButton = function(){return Session.get('onOffButtons').isOffButton;}

Template.onOff.events({

  'touchstart #onBox, click #onBox':function(e){

  if(Session.get("screenMode") != "onoff") return;
    var oo = Session.get('onOffButtons');

    if(oo.isOnActive)return;
    $('#onBox').css('opacity', 1.0 );
    
     var fstring = 'shakin 0.5s infinite'

   $('#onBox').css('-webkit-animation', fstring ); 
   $('#onBox').css('animation', fstring);  

    
    oo.isOnActive = true;
    Session.set('onOffButtons', oo);
 

    var soundOptions = {

      msg: 'on',
      voice: Session.get('voice').on,
      synth: onoffOptions.synth,
      pan: parseFloat(onoffOptions.pan) + parseFloat(onoffOptions.splay * panOffset),
      v_volume: onoffOptions.vvol,
      s_volume: onoffOptions.svol


    };


    if(onoffOptions.synth == 'playWithTone'){
      soundOptions.freq =  Math.random() * parseInt(onoffOptions.frange) + parseInt(onoffOptions.minf),
      soundOptions.noiseFreq = onoffOptions.noisef * (1 - (Math.random() * 2 - 1) * onoffOptions.variance);
    }else if(onoffOptions.synth == 'granPulseNoise'){
      var v 
      soundOptions.trigRate = onoffOptions.trigrate * (1 - (Math.random() * 2 - 1) * onoffOptions.variance);
      soundOptions.envDur = onoffOptions.envfur * (1 - (Math.random() * 2 - 1) * onoffOptions.variance);
      soundOptions.endPosR = onoffOptions.endpos * (1 - (Math.random() * 2 - 1) * onoffOptions.variance);
    }

    Meteor.call('onOffPing', soundOptions);

    e.preventDefault();
  }, 

  'touchstart #offBox, click #offBox':function(e){

    if(Session.get("screenMode") != "onoff") return;

    
    var fstring = 'fadeInOut 0.3s forwards'
   $('#offBox').css('-webkit-animation', fstring ); 
   $('#offBox').css('animation', fstring); 

    var soundOptions = {

      msg: 'off',
      voice: Session.get('voice').off,
      pan: onoffOptions.pan + parseFloat(onoffOptions.splay * panOffset),
      volume: onoffOptions.vvol

    };

    var oo = Session.get('onOffButtons');
    if(oo.isOnActive){
      oo.isOnButton = false;
      oo.isOnActive = false;
    }
    Session.set('onOffButtons', oo);

    if(onoffOptions.killswitch){
       Meteor.call('killSynths');
       msgStream.emit('userMessage', {type: 'killall', 'value': {}});
    }

    window.setTimeout(function(){

      oo.isOffButton = false;

      if(onoffOptions.killswitch){
        oo.isOnButton = false;
        oo.isOnActive = false;
        Session.set("screenMode", 'blank');
      }

      UserData.update(Meteor.user()._id, {$set: {off: false, on: oo.isOnButton}});
      Session.set('onOffButtons', oo);

    },300);


    Meteor.call('onOffPing', soundOptions);

    msgStream.emit('userMessage', {type: 'turnOff', 'value': {}});


    e.preventDefault();
  }

});

Template.blob.onRendered (function(){

    var canvas = $('#myCanvas')[0];
    canvas.setAttribute('width', 400);
    canvas.setAttribute('height', 600);
    Meteor.clearInterval(canvasCallback);
    canvasCallback = Meteor.setInterval(moveSquare, 10);

    canvas.addEventListener("touchstart", function (e) {
      
      pos = getTouchPos(canvas, e);

    }, false);

    canvas.addEventListener("touchmove", function (e) {
      
      pos = getTouchPos(canvas, e);

    }, false);


});

Template.blob.onDestroyed(function(){

  Meteor.clearInterval(canvasCallback);

  })

function moveSquare(){

    var canvas = $('#myCanvas')[0];
    counter += 1;
    var context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);

    var w = canvas.width / 2 - 50;
    var phase = 5 * counter/360;

    for(var i = 0; i < 20; i++)
    {
      context.fillStyle = 'green';
      context.fillRect(w + Math.sin(phase + i * Math.PI/10)  * w , w + Math.cos(phase + i * Math.PI/10) * w, 20, 20);

    }

      context.fillStyle = 'red';
      context.fillRect(pos.x, pos.y, 20, 20);

  }

function getTouchPos(canvasDom, touchEvent) {
  var rect = canvasDom.getBoundingClientRect();
  return {
    x: touchEvent.touches[0].clientX - rect.left,
    y: touchEvent.touches[0].clientY - rect.top
  };
}


/*-------------------------------------RECIEVERS-------------------------------------------*/


function parseOptions(options_i, options_o){

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


msgStream.on('userMessage', function(message){

   
  if(message.type == 'turnOff'){

    var oo = Session.get('onOffButtons');
    if(oo.isOnActive){
      oo.isOnButton = false;
      oo.isOnActive = false;
      Session.set('onOffButtons', oo);
      UserData.update(Meteor.user()._id, {$set: {on: false}});
    }

  }

  if(message.type == 'killall'){
      Session.set('screenMode', "blank");
      UserData.update(Meteor.user()._id, {$set: {view: Session.get('screenMode')}});
  }

});

msgStream.on('message', function(message){

  if(message.type == 'numbersReset'){
    
    parseOptions(message.value, numbersOptions);

    numbersOptions.ovol = numbersOptions.vol;
    
    numbersReset();

  }

  if(message.type == 'numbersChange'){

    if(typeof(message.value["time"]) != "undefined"){
      ramp(message.value, numbersOptions); //this removes any managed options
    }
    
    parseOptions(message.value, numbersOptions);
    if(typeof(message.value.vol) != "undefined")numbersOptions.ovol = numbersOptions.vol;
    
    
    if(message.value.reset == true){
      numbersReset();
    }
    updateFontSizes();

  }



  if(message.type == 'wordsChange'){

    if(typeof(message.value["time"]) != "undefined"){
      ramp(message.value, wordsOptions); //this removes any managed options
    }

    parseOptions(message.value, wordsOptions);
    UserData.update(Meteor.user()._id, {$set: {word: wordsOptions.word}});
    updateFontSizes();

  }


  if(message.type == 'screenChange'){ 

    var osm = Session.get('screenMode');
    Session.set('screenMode', message.value.mode);
    UserData.update(Meteor.user()._id, {$set: {view: Session.get('screenMode')}});

    if(typeof(message.value.options)!= "undefined"){
      if(message.value.mode == "words")parseOptions(message.value.options, wordsOptions);
      if(message.value.mode == "numbers")parseOptions(message.value.options, numbersOptions);
      if(message.value.mode == "onoff")parseOptions(message.value.options, onoffOptions);
    }
    //if(osm != message.value){
      if(message.value.mode == "numbers")numbersReset();
      if(message.value.mode == "words")wordsReset();
    //}

  }

  if(message.type == 'onoffChange'){

    if(typeof(message.value["time"]) != "undefined"){
      ramp(message.value, onoffOptions); //this removes any managed options
    }

    parseOptions(message.value, onoffOptions);
    updateFontSizes();

  }

  if(message.type == 'addOn'){

    if(typeof(message.value["time"]) != "undefined"){
      ramp(message.value, onoffOptions); //this removes any managed options
    }

    parseOptions(message.value, onoffOptions);

    var oo = Session.get('onOffButtons');

    if(!oo.isOnButton){

      var v = Session.get('voice');
      v.on = (onoffOptions.isRandomVoice) ? chooseRandomVoice() : onoffOptions.voice;
      Session.set('voice', v);

      oo.isOnButton = true;
      oo.isOnActive = false;
      Session.set('onOffButtons', oo);

      UserData.update(Meteor.user()._id, {$set: {on: true}});
    }

    updateFontSizes();

  }

  if(message.type == 'addOff'){

    if(typeof(message.value["time"]) != "undefined"){
      ramp(message.value, onoffOptions); //this removes any managed options
    }

    parseOptions(message.value, onoffOptions);

    var oo = Session.get('onOffButtons');
    if(!oo.isOffButton){
       


      var v = Session.get('voice');
      v.off = (message.value.isRandomVoice) ? chooseRandomVoice() : onoffOptions.voice;
      Session.set('voice', v);

      oo.isOffButton = true;
      Session.set('onOffButtons', oo);

      UserData.update(Meteor.user()._id, {$set: {off: true}});
    }

    updateFontSizes();

  }

  if(message.type == 'chatUpdate'){ 
    var t = Session.get("chatText");
    if(typeof(t) == "undefined")t =[""];
    t[t.length-1] = message.value;
    Session.set('chatText', t);
  }

  if(message.type == 'chatNewLine'){
    var t = Session.get("chatText");
    if(typeof(t) == "undefined")t =[];
    t.push("");
    Session.set('chatText', t);
  }

  if(message.type == 'chatClear'){
    Session.set("chatText", [""]);
  }



  

});


function numbersReset(){

  if(numbersOptions.pause > 0){
    Session.set('isPause', true);
    setTimeout(function(){
      Session.set('isPause', false);
      },numbersOptions.pause * 1000
    )
  }
  Session.set('currNumber' , numbersOptions.start);

  numbersOptions.vol = numbersOptions.ovol;
  updateFontSizes();
  var v = Session.get('voice');
  v.numbers = (numbersOptions.rand) ?  chooseRandomVoice() : numbersOptions.voice;
  Session.set('voice', v);
  numbersOptions.voice = v.numbers;
  UserData.update(Meteor.user()._id, {$set: {voice: v.numbers}});

 
}

function wordsReset(){

  buttonPressed = false;

  var v = Session.get('voice');
  v.words = (wordsOptions.rand) ? chooseRandomVoice() : wordsOptions.voice;
  Session.set('voice', v);
  wordsOptions.voice = v.words;
  Session.set('currentWord', wordsOptions.word);
  UserData.update(Meteor.user()._id, {$set: {voice: v.words}});
  console.log(v.words);

    $('#wordsBox').css('opacity', 0.25);
    $('#wordsBox').css('-webkit-animation', 'nil'); 
    $('#wordsBox').css('animation', 'nil'); 

}


function ramp(args, liveOptions){

  var o = liveOptions;


  if(typeof(curRamp) != "undefined"){
    clearInterval(curRamp.loop);
    curRamp = {};
  }

  curRamp.startOptions = {};
  curRamp.targetOptions = {};
  curRamp.liveOptions = o;

  var t = args.time;
  delete args["time"];

  for(var i in args){

      if(typeof(args[i]) == "number"){
        curRamp.startOptions[i] = parseFloat(o[i]);
        curRamp.targetOptions[i] = parseFloat(args[i]);
        delete args[i];
      }
    
  }

  curRamp.totalSteps = t * 20;
  curRamp.cStep = 0;

  curRamp.loop = window.setInterval(function(){
    curRamp.cStep += 1;
    var p = curRamp.cStep/curRamp.totalSteps;
    if(p > 1){
      clearInterval(curRamp.loop);
      return;
    }

    for(var i in curRamp.startOptions){
      var d = curRamp.targetOptions[i] - curRamp.startOptions[i];
      curRamp.liveOptions[i] = curRamp.startOptions[i] + d * p;
      curRamp.liveOptions[i];
    }

    updateFontSizes(); 

  },50);  //20 fps is enoug




}

/*---------------------------------------------------------GENERIC FUNCTIONS-----------------------------------*/

function randCol(){

	return '#'+Math.floor(Math.random()*16777215).toString(16);
}

function chooseRandomVoice(){
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