var osc, dgram, udp, host, port;

osc = Meteor.require('osc-min');
dgram = Meteor.require ('dgram');


Meteor.startup(function(){


	udp = dgram.createSocket('udp4');
	host = "localhost";
	port = 57120;

	if(!Meteor.users.findOne({'profile.role': 'admin'})){
		Accounts.createUser({username: 'clamourAdmin', password: 'ontap'});
	}


});

Accounts.onCreateUser(function(options, user){

	if(!Meteor.users.findOne({'profile.role':'admin'})){
		user.profile = {role: 'admin'};
	}else{
		user.profile = {role: 'player'};
	}

	return user;
});

Meteor.publish('AllPlayers', function(userId){
	if(checkAdmin(userId)){
		this.ready();
		return Meteor.users.find({}); 
	}
});

Meteor.publish('MyAccount', function(userId){
	
	return Meteor.users.find(userId); 
	
});


msgStream  = new Meteor.Stream('msgStream');

msgStream.permissions.write(function() {

	return checkAdmin(this.userId);

});

msgStream.permissions.read(function() {
  return true;
});




Meteor.methods({

	numPing:function(num) { // this will need revising for the new SC model

		console.log(num);

		var buf = osc.toBuffer({
			address: "/hit",
			args: [num, 'peterUK', 0.1, 0]
	  	});

	  	udp.send(buf, 0, buf.length, port, host);
		
	},

	resetAllPlayers:function(userId){

		if(checkAdmin(userId)){

			Meteor.users.remove({'profile.role':'player'});
		}


	}


});


function checkAdmin(userId){

	var user = Meteor.users.findOne(userId);
	if(user.profile.role == "admin"){
		return true;
	}else{
		return false;
	}
	
}