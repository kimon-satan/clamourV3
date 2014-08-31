msgStream = new Meteor.Stream('msgStream');
var buttonPressed = false;




Template.hello.events({

  'touchstart #play, click #play':function(e){

    var un = generateTempId(10);
    Accounts.createUser({username: un, password: '1234'});
    e.preventDefault();
  }

});



Template.clamour.created = function(){
  Session.set('currNumber', 10);
  Session.set('screenMode', 'numbers');
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
      cn = Math.max(1, cn - 1);
      Session.set('currNumber', cn);
      $('#numberBox').removeClass('fade');
      $('#numberBox').css('opacity', 0.25);

    },610);
   
    e.preventDefault();
  }

});

Template.numbers.currNumber = function(){return Session.get('currNumber');}


msgStream.on('message', function(message){


  if(message.type == 'numbersReset')Session.set('currNumber' , 10);
  if(message.type == 'screenChange'){ Session.set('screenMode', 'chat');}

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