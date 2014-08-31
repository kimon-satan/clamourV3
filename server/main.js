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
		console.log(user);
		UserData.insert({ _id: user._id, view: 'wait', isSelected: false});
	}

	return user;
});


Meteor.publish('UserData', function(userId){
	if(checkAdmin(userId)){
		this.ready();
		return UserData.find({}); 
	}else{
		return UserData.find(userId); 
	}
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

msgStream.permissions.read(function(eventName, args) {

	 var ud = UserData.findOne(this.userId, {fields: {isSelected: 1}});

	 if(ud){
		 if(ud.isSelected){
		 	//console.log(this.userId, eventName , args);
		 	return true;
		 }else{
		 	//console.log( this.userId , " not found");
		 	return false;
		 }
	}

},false);






Meteor.methods({

	numPing:function(num) { // this will need revising for the new SC model

		console.log(num);

		var buf = osc.toBuffer({
			address: "/hit",
			args: [num, 'peterUK', 0.1, 0]
	  	});

	  	udp.send(buf, 0, buf.length, port, host);
		
	},

	resetPlayers:function(userId){

		if(checkAdmin(userId)){

			UserData.find({isSelected: true}).forEach(function(e){

				Meteor.users.remove(e._id);
				UserData.remove(e._id);

			});
			
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