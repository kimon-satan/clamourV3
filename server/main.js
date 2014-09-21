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

	if(UserGroups.find().fetch().length == 0){

		for(var i = 0; i < 6; i++){
			UserGroups.insert({index: "grp_" + i , users: [], isSelected: false});
		}

	}


});

Accounts.onCreateUser(function(options, user){

	if(!Meteor.users.findOne({'profile.role':'admin'})){
		user.profile = {role: 'admin'};
	}else{
		user.profile = {role: 'player'};
		//console.log(user);
		UserData.insert({ _id: user._id, view: 'wait', isSelected: false, on: false, off: false, voice: "none"});
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

Meteor.publish('UserGroups', function(userId){
	if(checkAdmin(userId)){
		this.ready();
		return UserGroups.find({}); 
	}
});


Meteor.publish('MyAccount', function(userId){
	
	return Meteor.users.find(userId); 
	
});


msgStream  = new Meteor.Stream('msgStream');

msgStream.permissions.write(function(eventName) {

	if(eventName == "message"){

		return checkAdmin(this.userId);

	}else if(eventName == "userMessage"){

		return !checkAdmin(this.userId);

	}

});

msgStream.permissions.read(function(eventName, args) {

	 var ud = UserData.findOne(this.userId, {fields: {isSelected: 1}});

	 if(ud){
		if(eventName == "message"){
		
			 if(ud.isSelected){
			 	//console.log(this.userId, eventName , args);
			 	return true;
			 }else{
			 	//console.log( this.userId , " not found");
			 	return false;
			 }
			
		}else if(eventName == "userMessage"){
			return true;
		}
	}

},false);






Meteor.methods({

	killSynths:function(){

		var buf = osc.toBuffer({
			address: "/allOff",
			args: []
	  	});

	  	udp.send(buf, 0, buf.length, port, host);
		

	},


	startPedal:function(userId){

		if(checkAdmin(userId)){

			var buf = osc.toBuffer({
				address: "/startPedal",
				args: []
		  	});

		  	udp.send(buf, 0, buf.length, port, host);
		}

	},

	numPing:function(options) { 

		//console.log(options);

		var buf = osc.toBuffer({
			address: "/hit",
			args: [options.num, options.voice, options.volume, options.pan]
	  	});

	  	udp.send(buf, 0, buf.length, port, host);
		
	},

	onOffPing:function(options) { 

		//console.log(options);

		if(options.msg == 'on'){

			if(options.synth == 'playWithTone'){
				var buf = osc.toBuffer({
					address: "/noteOn",
					args: [
						options.voice, 
						options.synth, 
						options.v_volume, 
						options.s_volume, 
						options.pan, 
						options.freq, 
						options.noiseFreq
					]
			  	});
			}else{
				var buf = osc.toBuffer({
					address: "/noteOn",
					args: [
						options.voice, 
						options.synth, 
						options.v_volume, 
						options.s_volume, 
						options.pan, 
						options.trigRate, 
						options.envDur,
						options.endPosR
					]
			  	});

			}	

		}else{

			var buf = osc.toBuffer({
				address: "/noteOff",
				args: [options.voice, options.volume, options.pan]
		  	});

		}

	  	udp.send(buf, 0, buf.length, port, host);
		
	},

	resetPlayers:function(userId){

		if(checkAdmin(userId)){

			Meteor.users.remove({'profile.role': 'player'});

			UserData.remove({});

			UserGroups.update({},{$set: {users:[]}},{multi: true});

			
		}


	}


});


function checkAdmin(userId){

	var user = Meteor.users.findOne(userId);
	if(!user)return false;
	if(user.profile.role == "admin"){
		return true;
	}else{
		return false;
	}
	
}