

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
  isRandomVoice: false,
  resetPause: 0.0

};

var onOptions = {

  voice: 'peterUK',

};

var offOptions = {

    voice: 'peterUK',

};

var offTOptions;

voices = ['peterUK' , 'grahamUK', 'rachelUK' , 'catherineUK', 'bridgetUK',  'rayUS', 'ryanUS', 'paulUS', 'heatherUS', 'kateUS'];
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

  UserData.update(Meteor.user()._id, {$set: {voice: v.numbers}});

  var oo = {isOnButton: false, isOnActive: false, isOffButton: false};
  Session.set("onOffButtons", oo);

}

Template.clamour.screenMode = function(){return Session.get('screenMode');}

Template.clamour.isScreen = function(mode){

  return (Session.get('screenMode') == mode);
}

UI.registerHelper('voice', function(){return Session.get("voice")});


/*-----------------------------------------------------NUMBERS ----------------------------------------*/

Template.numbers.created = function(){
  Session.set('isPause', false);
}

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
            numbersOptions.voice = v.numbers;
            UserData.update(Meteor.user()._id, {$set: {voice: v.numbers}});
            
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
            numbersOptions.voice = v.numbers;
            UserData.update(Meteor.user()._id, {$set: {voice: v.numbers}});

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
Template.numbers.isPause = function(){return Session.get('isPause');}

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
  if(typeof options.resetPause !== "undefined"){numbersOptions.resetPause = options.resetPause;}
}

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
      synth: onOptions.synth,
      pan: parseFloat(onOptions.pan) + parseFloat(onOptions.splay * panOffset),
      v_volume: onOptions.vVolume,
      s_volume: onOptions.sVolume,


    };


    if(onOptions.synth == 'playWithTone'){
      soundOptions.freq =  Math.random() * parseInt(onOptions.fRng) + parseInt(onOptions.minFreq),
      soundOptions.noiseFreq = onOptions.noiseFreq * (1 - (Math.random() * 2 - 1) * onOptions.nFreqV);
    }else if(onOptions.synth == 'granPulseNoise'){
      var v 
      soundOptions.trigRate = onOptions.trigRate * (1 - (Math.random() * 2 - 1) * onOptions.variance);
      soundOptions.envDur = onOptions.envDur * (1 - (Math.random() * 2 - 1) * onOptions.variance);
      soundOptions.endPosR = onOptions.endPosR * (1 - (Math.random() * 2 - 1) * onOptions.variance);
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
      pan: offOptions.pan + parseFloat(onOptions.splay * panOffset),
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

    msgStream.emit('userMessage', {type: 'offTransition', 'value': {}});

    window.setTimeout(function(){
      Session.set('screenMode', "onOff");
      UserData.update(Meteor.user()._id, {$set: {view: Session.get('screenMode')}});
      UserData.update(Meteor.user()._id, {$set: {off: false, on: false}});
    },300);
    
    e.preventDefault();

  }
});

Template.offTransition.currentVoice = function(){return Session.get('offTVoice');}


/*-------------------------------------RECIEVERS-------------------------------------------*/

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
    
    
    setNumbersOptions(message.value);
    if(numbersOptions.resetPause > 0){
        Session.set('isPause', true);
      setTimeout(function(){
        Session.set('isPause', false);
      },numbersOptions.resetPause * 1000)
    }
    Session.set('currNumber' , numbersOptions.startIndex);

    var v = Session.get('voice');
    v.numbers = (numbersOptions.isRandomVoice) ?  chooseRandomVoice() : numbersOptions.voice;
    Session.set('voice', v);
    numbersOptions.voice = v.numbers;
    UserData.update(Meteor.user()._id, {$set: {voice: v.numbers}});


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

      UserData.update(Meteor.user()._id, {$set: {on: true}});
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

      UserData.update(Meteor.user()._id, {$set: {off: true}});
    }

  }

  if(message.type == 'updateChat'){ Session.set('chatText', message.value);}

  if(message.type == 'offTransition'){
      Session.set("screenMode", "offTransition");
      UserData.update(Meteor.user()._id, {$set: {view: Session.get('screenMode')}});
      offTOptions = message.value;
      Session.set("offTVoice", message.value.voice);
  }

  

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