

msgStream = new Meteor.Stream('msgStream');
var buttonPressed = false;
var panOffset = Math.random() * 2 - 1;

var numbersOptions = {

  lockOn: false,
  endIndex: 0,
  startIndex: 10,
  amp: 0.5,
  pan: 0,
  splay: 0,
  volume: 0.2,
  fadeTime: 0.5,
  voice: 'peterUK',
  isRandomVoice: false

};

var onOptions = {

  voice: 'peterUK',

};

var offOptions = {

    voice: 'peterUK',

};

voices = ['peterUK' , 'rachelUK' , 'heatherUS'];
synths = ['playWithTone', 'granPulseNoise'];



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

  var v = {

    numbers: numbersOptions.voice,
    on: onOptions.voice,
    off: offOptions.voice

  };

  Session.set('voice', v);

  var oo = {isOnButton: false, isOnActive: false, isOffButton: false};
  Session.set("onOffButtons", oo);

}

Template.clamour.screenMode = function(){return Session.get('screenMode');}

Template.clamour.isScreen = function(mode){

  return (Session.get('screenMode') == mode);
}

UI.registerHelper('voice', function(){return Session.get("voice")});


/*-----------------------------------------------------NUMBERS ----------------------------------------*/

Template.numbers.events({
  

  'touchstart #numberBox, click #numberBox': function (e) {

    if(buttonPressed)return;
    buttonPressed = true;
    var cn = Session.get('currNumber');

    var fstring = 'fadeInOut ' + numbersOptions.fadeTime + 's forwards'
   $('#numberBox').css('-webkit-animation', fstring ); 
   $('#numberBox').css('animation', fstring); 

 

    var soundOptions = {

      num: cn,
      voice: Session.get('voice').numbers,
      pan: numbersOptions.pan + numbersOptions.splay * panOffset,
      volume: numbersOptions.volume

    };

    Meteor.call('numPing', soundOptions);

    setTimeout(function(){

      buttonPressed = false;


      if(numbersOptions.startIndex > numbersOptions.endIndex){
        if(numbersOptions.lockOn){
          cn = Math.max(numbersOptions.endIndex, cn - 1);
        }else{
          cn = cn - 1;
          if(cn < numbersOptions.endIndex){
            
            var v = Session.get('voice');
            v.numbers = (numbersOptions.isRandomVoice) ? chooseRandomVoice() : numbersOptions.voice;
            Session.set('voice', v);
            
            cn = numbersOptions.startIndex;
          }
        }
      }else{
        if(numbersOptions.lockOn){
          cn = Math.min(numbersOptions.endIndex, parseInt(cn) + 1);
        }else{
          cn = parseInt(cn) + 1;
          if(cn > parseInt(numbersOptions.endIndex)){
            cn = numbersOptions.startIndex;
            var v = Session.get('voice');
            v.numbers = (numbersOptions.isRandomVoice) ? chooseRandomVoice() : numbersOptions.voice;
            Session.set('voice', v);

          }
        }
      }
      
      Session.set('currNumber', cn);

      $('#numberBox').css('opacity', 0.25);
      $('#numberBox').css('-webkit-animation', 'nil'); 
      $('#numberBox').css('animation', 'nil'); 

    },numbersOptions.fadeTime * 1000);
   
    e.preventDefault();
  }

});

Template.numbers.currNumber = function(){return Session.get('currNumber');}

function setNumbersOptions(options){
  if(typeof options.lockOn !== "undefined")numbersOptions.lockOn = options.lockOn;
  if(typeof options.startIndex !== "undefined")numbersOptions.startIndex = parseInt(options.startIndex);
  if(typeof options.endIndex !== "undefined")numbersOptions.endIndex = parseInt(options.endIndex);
  if(typeof options.volume !== "undefined")numbersOptions.volume = parseFloat(options.volume);
  if(typeof options.pan !== "undefined")numbersOptions.pan = parseFloat(options.pan);
  if(typeof options.splay !== "undefined"){numbersOptions.splay = parseFloat(options.splay);}
  if(typeof options.fadeTime !== "undefined")numbersOptions.fadeTime = parseFloat(options.fadeTime);
  if(typeof options.isRandomVoice !== "undefined")numbersOptions.isRandomVoice = options.isRandomVoice;
  if(typeof options.voice !== "undefined"){numbersOptions.voice = options.voice;}
}

/*-----------------------------------------------CHAT --------------------------------------------*/
Template.chat.chatText = function(){return Session.get('chatText');}

/*---------------------------------------------------ON OFF-----------------------------------------*/

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
      synth: onOptions.synth,
      pan: parseFloat(onOptions.pan) + parseFloat(onOptions.splay * panOffset),
      v_volume: onOptions.vVolume,
      s_volume: onOptions.sVolume,


    };

    if(onOptions.synth == 'playWithTone'){
      soundOptions.freq =  Math.random() * (onOptions.maxFreq - onOptions.minFreq) + parseInt(onOptions.minFreq),
      soundOptions.noiseFreq = onOptions.noiseFreq
    }else if(onOptions.synth == 'granPulseNoise'){
      soundOptions.trigRate = onOptions.trigRate;
      soundOptions.envDur = onOptions.envDur;
      soundOptions.endPosR = onOptions.endPosR;
    }

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
      pan: offOptions.pan,
      volume: offOptions.volume

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
    },300);




    Meteor.call('onOffPing', soundOptions);

    msgStream.emit('userMessage', {type: 'turnOff', 'value': {}});


    e.preventDefault();
  }

});



/*-------------------------------------RECIEVERS-------------------------------------------*/

msgStream.on('userMessage', function(message){

   
  if(message.type == 'turnOff'){

    var oo = Session.get('onOffButtons');
    if(oo.isOnActive){
      oo.isOnButton = false;
      oo.isOnActive = false;
      Session.set('onOffButtons', oo);
    }

  }

});

msgStream.on('message', function(message){



  if(message.type == 'numbersReset'){
    
    setNumbersOptions(message.value);
    Session.set('currNumber' , numbersOptions.startIndex);

    var v = Session.get('voice');
    v.numbers = (numbersOptions.isRandomVoice) ?  chooseRandomVoice() : numbersOptions.voice;
    Session.set('voice', v);


  }

  if(message.type == 'numbersChange'){

    setNumbersOptions(message.value);

  }

  if(message.type == 'screenChange'){ 
    Session.set('screenMode', message.value);
    UserData.update(Meteor.user()._id, {$set: {view: Session.get('screenMode')}});
  }

  if(message.type == 'addOn'){


    var oo = Session.get('onOffButtons');
    if(!oo.isOnButton){

      onOptions = message.value;

      var v = Session.get('voice');
      v.on = (onOptions.isRandomVoice) ? chooseRandomVoice() : onOptions.voice;
      Session.set('voice', v);

      oo.isOnButton = true;
      oo.isOnActive = false;
      Session.set('onOffButtons', oo);
    }

  }

  if(message.type == 'addOff'){

    var oo = Session.get('onOffButtons');
    if(!oo.isOffButton){
       
      offOptions = message.value;

      var v = Session.get('voice');
      v.off = (message.value.isRandomVoice) ? chooseRandomVoice() : offOptions.voice;
      Session.set('voice', v);

      oo.isOffButton = true;
      Session.set('onOffButtons', oo);
    }

  }

  if(message.type == 'updateChat'){ Session.set('chatText', message.value);}

  

});




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