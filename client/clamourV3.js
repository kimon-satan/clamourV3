

msgStream = new Meteor.Stream('msgStream');
var buttonPressed = false;

var numbersOptions = {

  lockOn: false,
  lockIndex: 0,
  amp: 0.5,
  pan: 0,
  voice: 'peterUK'

};



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

}

Template.clamour.screenMode = function(){return Session.get('screenMode');}

Template.clamour.isScreen = function(mode){

  return (Session.get('screenMode') == mode);
}

Template.numbers.events({
  

  'touchstart #numberBox, click #numberBox': function (e) {

    if(buttonPressed)return;
    buttonPressed = true;
    var cn = Session.get('currNumber');
    $('#numberBox').addClass('fade');
    Meteor.call('numPing', cn);

    setTimeout(function(){

      buttonPressed = false;

      console.log(numbersOptions);

      if(numbersOptions.lockOn){
        cn = Math.max(1, cn - 1);
      }else{
        cn = cn - 1;
        if(cn == 0)cn = 10;
      }
      
      Session.set('currNumber', cn);
      $('#numberBox').removeClass('fade');
      $('#numberBox').css('opacity', 0.25);

    },610);
   
    e.preventDefault();
  }

});

Template.numbers.currNumber = function(){return Session.get('currNumber');}

Template.chat.chatText = function(){return Session.get('chatText');}


msgStream.on('message', function(message){

  var options;

  if(message.type == 'numbersReset'){
    
    options = message.value;

    Session.set('currNumber' , 10);

  }

  if(message.type == 'numbersChange'){

    options = message.value;
    if(typeof options.lockOn !== "undefined")numbersOptions.lockOn = options.lockOn;

  }

  if(message.type == 'screenChange'){ 
    Session.set('screenMode', message.value);
    UserData.update(Meteor.user()._id, {$set: {view: Session.get('screenMode')}});
  }

  if(message.type == 'updateChat'){ Session.set('chatText', message.value);}

});


function randCol(){

	return '#'+Math.floor(Math.random()*16777215).toString(16);
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