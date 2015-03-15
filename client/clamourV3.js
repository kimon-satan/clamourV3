

msgStream = new Meteor.Stream('msgStream');



var buttonPressed = false;
var panOffset = Math.random() * 2 - 1;

var numbersOptions = {};
var wordsOptions = {};
var onoffOptions = {};

var onOptions = {

  voice: 'peterUK',

};

var offOptions = {

    voice: 'peterUK',

};

var offTOptions;





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
    wordsOptions = Presets.findOne({type: "words", name: "df"}).options;
    onoffOptions = Presets.findOne({type: "onoff", name: "df"}).options;
    var v = {

      numbers: numbersOptions.voice,
      on: onOptions.voice,
      off: offOptions.voice,
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

Template.words.events({

  'touchstart #wordsBox, click #wordsBox' :function(e){

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

    if(buttonPressed)return;
    buttonPressed = true;
    var cn = Session.get('currNumber');

    console.log(numbersOptions.fade);
    var fstring = 'fadeInOut ' + numbersOptions.fade + 's forwards'
   $('#numberBox').css('-webkit-animation', fstring ); 
   $('#numberBox').css('animation', fstring); 

 

    var soundOptions = {

      num: cn,
      voice: Session.get('voice').numbers,
      pan: numbersOptions.pan + numbersOptions.splay * panOffset,
      vol: numbersOptions.vol

    };


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
Template.numbers.isPause = function(){return Session.get('isPause');}



/*-----------------------------------------------CHAT --------------------------------------------*/
Template.chat.chatText = function(){return Session.get('chatText');}

/*---------------------------------------------------ON OFF-----------------------------------------*/

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

    console.log(soundOptions);
    Meteor.call('onOffPing', soundOptions);

    e.preventDefault();
  }, 

  'touchstart #offBox, click #offBox':function(e){

    
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

    window.setTimeout(function(){

      oo.isOffButton = false;
      Session.set('onOffButtons', oo);
      UserData.update(Meteor.user()._id, {$set: {off: false, on: false}});

    },300);




    Meteor.call('onOffPing', soundOptions);

    msgStream.emit('userMessage', {type: 'turnOff', 'value': {}});


    e.preventDefault();
  }

});

/*--------------------------------------------------------------------------------------*/

Template.offTransition.events({

  'touchstart #offBox, click #offBox' : function(e){

    var fstring = 'fadeInOut 0.3s forwards'
   $('#offBox').css('-webkit-animation', fstring ); 
   $('#offBox').css('animation', fstring); 

    var soundOptions = {

      msg: 'off',
      voice: Session.get('offTVoice'),
      pan: offTOptions.pan + parseFloat(offTOptions.splay * panOffset),
      volume: offTOptions.vol

    };

    Meteor.call('onOffPing', soundOptions);
    Meteor.call('killSynths');

    msgStream.emit('userMessage', {type: 'offTransition', 'value': {}});

    window.setTimeout(function(){
      Session.set('screenMode', "onOff");
      var oo = Session.get('onOffButtons');
        oo.isOffButton = false;
        oo.isOnButton = false;
        oo.isOnActive = false;
      Session.set('onOffButtons', oo);
      UserData.update(Meteor.user()._id, {$set: {view: Session.get('screenMode')}});
      UserData.update(Meteor.user()._id, {$set: {off: false, on: false}});
    },300);
    
    e.preventDefault();

  }
});

Template.offTransition.currentVoice = function(){return Session.get('offTVoice');}


/*-------------------------------------RECIEVERS-------------------------------------------*/


function parseOptions(options_i, options_o){

  for(var i in options_o){

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
      UserData.update(Meteor.user()._id, {$set: {off: false}});
    }

  }

  if(message.type == 'offTransition'){
      Session.set('screenMode', "onOff");
      var oo = Session.get('onOffButtons');
        oo.isOffButton = false;
        oo.isOnButton = false;
        oo.isOnActive = false;
      Session.set('onOffButtons', oo);
      UserData.update(Meteor.user()._id, {$set: {off: false, on: false}});
      UserData.update(Meteor.user()._id, {$set: {view: Session.get('screenMode')}});

  }

});

msgStream.on('message', function(message){

  if(message.type == 'numbersReset'){
    
    parseOptions(message.value, numbersOptions);
    numbersReset();

  }

  if(message.type == 'numbersChange'){

    parseOptions(message.value, numbersOptions);
    if(message.value.reset == true){
      numbersReset();
    }

  }

  if(message.type == 'wordsChange'){

    parseOptions(message.value, wordsOptions);

  }


  if(message.type == 'screenChange'){ 

    var osm = Session.get('screenMode');
    Session.set('screenMode', message.value);
    UserData.update(Meteor.user()._id, {$set: {view: Session.get('screenMode')}});
    if(osm != message.value && message.value == "numbers"){
      numbersReset();
    }

  }

  if(message.type == 'onoffChange'){

    parseOptions(message.value, onoffOptions);
    console.log(onoffOptions);
    console.log(message.value);

  }

  if(message.type == 'addOn'){


    var oo = Session.get('onOffButtons');

    if(!oo.isOnButton){

      var v = Session.get('voice');
      v.on = (onoffOptions.isRandomVoice) ? chooseRandomVoice() : onoffOptions.voice;
      console.log(v.on);
      Session.set('voice', v);

      oo.isOnButton = true;
      oo.isOnActive = false;
      Session.set('onOffButtons', oo);

      UserData.update(Meteor.user()._id, {$set: {on: true}});
    }



  }

  if(message.type == 'addOff'){

    var oo = Session.get('onOffButtons');
    if(!oo.isOffButton){
       


      var v = Session.get('voice');
      v.off = (message.value.isRandomVoice) ? chooseRandomVoice() : onoffOptions.voice;
      Session.set('voice', v);

      oo.isOffButton = true;
      Session.set('onOffButtons', oo);

      UserData.update(Meteor.user()._id, {$set: {off: true}});
    }

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

  if(message.type == 'offTransition'){
      Session.set("screenMode", "offTransition");
      UserData.update(Meteor.user()._id, {$set: {view: Session.get('screenMode')}});
      offTOptions = message.value;
      Session.set("offTVoice", message.value.voice);
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

    var v = Session.get('voice');
    v.numbers = (numbersOptions.rand) ?  chooseRandomVoice() : numbersOptions.voice;
    Session.set('voice', v);
    numbersOptions.voice = v.numbers;
    UserData.update(Meteor.user()._id, {$set: {voice: v.numbers}});

 
}


/*---------------------------------------------------------GENERIC FUNCTIONS-----------------------------------*/

function randCol(){

	return '#'+Math.floor(Math.random()*16777215).toString(16);
}

function chooseRandomVoice(){
    var v = voices[Math.floor(Math.random() * voices.length)];
    console.log(v);
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