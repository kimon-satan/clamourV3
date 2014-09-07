

msgStream = new Meteor.Stream('msgStream');
var buttonPressed = false;

var numbersOptions = {

  lockOn: false,
  endIndex: 0,
  startIndex: 10,
  amp: 0.5,
  pan: 0,
  volume: 0.2,
  fadeTime: 0.6,
  voice: 'peterUK',
  isRandomVoice: false

};

voices = ['peterUK' , 'rachelUK' , 'heatherUS'];



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

  Session.set('voice', numbersOptions.voice);

}

Template.clamour.screenMode = function(){return Session.get('screenMode');}

Template.clamour.isScreen = function(mode){

  return (Session.get('screenMode') == mode);
}

Template.numbers.voice = function(){return Session.get("voice")}

Template.numbers.events({
  

  'touchstart #numberBox, click #numberBox': function (e) {

    if(buttonPressed)return;
    buttonPressed = true;
    var cn = Session.get('currNumber');

    var fstring = 'fadeInOut ' + numbersOptions.fadeTime + 's forwards'
    console.log(fstring);
   $('#numberBox').css('-webkit-animation', fstring ); 
   $('#numberBox').css('animation', fstring); 

 

    var soundOptions = {

      num: cn,
      voice: Session.get('voice'),
      pan: numbersOptions.pan,
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
            chooseRandomVoice();
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
            chooseRandomVoice();
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

Template.chat.chatText = function(){return Session.get('chatText');}


msgStream.on('message', function(message){


  if(message.type == 'numbersReset'){
    
    setNumbersOptions(message.value);
    Session.set('currNumber' , numbersOptions.startIndex);
    chooseRandomVoice();

  }

  if(message.type == 'numbersChange'){

    setNumbersOptions(message.value);

  }

  if(message.type == 'screenChange'){ 
    Session.set('screenMode', message.value);
    UserData.update(Meteor.user()._id, {$set: {view: Session.get('screenMode')}});
  }

  if(message.type == 'updateChat'){ Session.set('chatText', message.value);}

});


function setNumbersOptions(options){
  if(typeof options.lockOn !== "undefined")numbersOptions.lockOn = options.lockOn;
  if(typeof options.startIndex !== "undefined")numbersOptions.startIndex = parseInt(options.startIndex);
  if(typeof options.endIndex !== "undefined")numbersOptions.endIndex = parseInt(options.endIndex);
  if(typeof options.volume !== "undefined")numbersOptions.volume = parseFloat(options.volume);
  if(typeof options.pan !== "undefined")numbersOptions.pan = parseFloat(options.pan);
  if(typeof options.fadeTime !== "undefined")numbersOptions.fadeTime = parseFloat(options.fadeTime);
  if(typeof options.isRandomVoice !== "undefined")numbersOptions.isRandomVoice = options.isRandomVoice;
  if(typeof options.voice !== "undefined")numbersOptions.voice = options.voice;
}

function randCol(){

	return '#'+Math.floor(Math.random()*16777215).toString(16);
}

function chooseRandomVoice(){
    if(numbersOptions.isRandomVoice){
      numbersOptions.voice = voices[Math.floor(Math.random() * voices.length)];
    }

    Session.set('voice', numbersOptions.voice);
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