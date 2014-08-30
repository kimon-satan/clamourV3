msgStream = new Meteor.Stream('msgStream');

Template.clamour.created = function(){
	Session.set('currNumber', 10);
}

Template.hello.events({

  'touchstart #play, click #play':function(e){

    var un = generateTempId(10);
    Accounts.createUser({username: un, password: '1234'});
    e.preventDefault();
  }

});


Template.clamour.events({
  
  'touchstart #numberBox, click #numberBox': function (e) {

  	var cn = Session.get('currNumber');
  	cn = Math.max(1, cn - 1);
  	Session.set('currNumber', cn);
  	$('#numberBox').css('background-color', randCol());
  	Meteor.call('numPing', cn);
  	e.preventDefault();
  }

});

Template.clamour.currNumber = function(){return Session.get('currNumber');}


msgStream.on('message', function(message){

  if(message == 'reset')Session.set('currNumber' , 10);

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