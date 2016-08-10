var osc, dgram, udp, host, port;

osc = require('osc-min');
dgram = require('dgram');



Meteor.startup(function(){


	udp = dgram.createSocket('udp4');
	host = "localhost";
	port = 57120;

	if(!Meteor.users.findOne({'profile.role': 'admin'})){
		Accounts.createUser({username: 'clamourAdmin', password: 'ontap'});
	}

//create default presets

	if(!Presets.findOne({type: "words", name: "df"})){
		console.log("creating words defaults");
		//create one
		var p = {
		    vol: 0.2,
		    pan:  0.0 ,
		    fade: 0.5,
		    rand: false,
		    splay: 0.25,
		    voice: voices[0],
		    reset: 0.0,
		    word: words[0],
		    kills: true
		  }

		 Presets.insert({type: "words", name: "df", options: p});
	}

	if(!Presets.findOne({type: "numbers", name: "df"})){
		console.log("creating numbers defaults");
		//create one
		var p = {

		    lock: false, 
		    rule: rules[0], //none, minus, plus, mute, plus_mute
		    start: 10,
		    end: 0,
		    vol: 0.2,
		    pan:  0,
		    fade: 0.5,
		    rand: false,
		    splay: 0,
		    voice: voices[0],
		    reset: false,
		    pause: 0
		  }

		 Presets.insert({type: "numbers", name: "df", options: p});

	}

	if(!Presets.findOne({type: "onoff", name: "df"})){
		console.log("creating onoff defaults");
		//create one
		var p = {

		    synth: "playWithTone", 
		    vvol: 0.25,
		    svol: 0.05,
		    pan:  0,
		    fade: 0.5,
		    rand: false,
		    minf: 40,
		    frange: 24,
		    noisef: 20.0,
		    variance: 0.0,
		    trigrate: 1.0,
		    envdur: 1.0,
		    endpos: 0.8,
		    splay: 0,
		    voice: voices[0],
		    killswitch: false
		  }

		 Presets.insert({type: "onoff", name: "df", options: p});

	}

	if(!Presets.findOne({type: "balloons", name: "df"})){
		console.log("creating balloon defaults");
		//create one
		var p = {

			maxTouches: 100,
		    amp: 1,
		    pan:  0,
		    tweetRel: 5.0,
			tweetMul: 0.25,
			tweetAdd: 95,
			combMul: 0.5,
			shotDec: 0.5,
			reset: true,
		    splay: 0

		  }

		 Presets.insert({type: "balloons", name: "df", options: p});

	}


});

Accounts.onCreateUser(function(options, user){

	if(!Meteor.users.findOne({'profile.role':'admin'})){
		user.profile = {role: 'admin'};
	}else{
		user.profile = {role: 'player'};
		//console.log(user);
		UserData.insert({ _id: user._id, view: 'wait', isSelected: false, on: false, off: false, voice: "none", word: "none", activeThreads: [], groups: []});
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

Meteor.publish('Presets', function(){
	return Presets.find({}); 
});

Meteor.publish('Threads', function(){
	return Threads.find({}); 
});


msgStream  = new Meteor.Stream('msgStream');

msgStream.permissions.write(function(eventName) {


	if(eventName == "message"){

		return checkAdmin(this.userId);

	}else if(eventName == "userMessage"){

		return checkPlayer(this.userId);

	}else if (eventName == "displayMessage") {

		return true;
	}

});

msgStream.permissions.read(function(eventName, args) {

	 var ud = UserData.findOne(this.userId, {fields: {isSelected: 1, activeThreads: 1}});


	 if(ud){
		if(eventName == "message"){
			
			 if(ud.activeThreads.indexOf(args.thread) > -1 ){
			 	//console.log(this.userId, eventName , args);
			 	return true;
			 }else{
			 	//console.log( this.userId , " not found");
			 	return false;
			 }
			
		}else if(eventName == "userMessage"){
			return checkPlayer(this.userId);
		}else if(eventName == "displayMessage"){
			return checkDisplay(this.userId);
		}
	}

},false);






Meteor.methods({

	killThread: function(userId, thread){

		if(checkAdmin(userId)){
			UserData.update({activeThreads: {$in: [thread]}}, {$pull: {activeThreads: thread}},{multi: true});
			Threads.remove({thread: thread});
			return true;
		}else{
			return false;
		}

	},

	killThreads: function(userId, thread){

		if(checkAdmin(userId)){
			UserData.update({}, {$set: {activeThreads: []}},{multi: true});
			Threads.remove({});
			return true;
		}else{
			return false;
		}

	},


	addThreadToPlayers: function(userId, args){

		if(typeof(args) == "undefined")return false;

		if(checkAdmin(userId)){
			
			

			var uids = selectPlayers(args);
			var msg =  args.mode + " with " + uids.length + " players with activeThread: " + args.thread; //this message needs to change

			Threads.insert({thread: args.thread, population: uids.length});
			
			if(typeof(args.group) == "undefined"){
				

				for(var i = 0; i < uids.length; i++){
					UserData.update(uids[i], {$push: {activeThreads: args.thread}});
				}

			}else{

				for(var i = 0; i < uids.length; i++){
					UserData.update(uids[i], {$push: {activeThreads: args.thread, groups: args.group}});
				}

				UserGroups.upsert({name: args.group, members: uids});
				msg += "\n these players will now be called " + args.group;

			}

			return msg;

		}

	},

	addThreadToPlayer:function(userId, args){

		if(typeof(args) == "undefined")return false;

		if(checkAdmin(userId)){

			Threads.insert({thread: args.thread, population: 1});
			UserData.update(args.uid, {$push: {activeThreads: args.thread}});
			return args.thread;
		}
	},




	createGroup:function(userId, args){

		if(typeof(args) == "undefined")return false;

		if(checkAdmin(userId)){

			var uids = selectPlayers(args);

			for(var i = 0; i < uids.length; i++){
				UserData.update(uids[i], {$push: {groups: args.group}});
			}

			UserGroups.upsert({name: args.group }, {name: args.group, members: uids});
			return  uids.length + " players will now be called " + args.group;

		}
	},

	createSubGroups: function(userId, args){

		if(checkAdmin(userId)){
			var uids = UserGroups.findOne({name: args.orig}).members;
			var gpsize = Math.floor(uids.length/parseInt(args.numGps));
			console.log(gpsize);
			if(gpsize < 1){
				throw new Meteor.Error("invalid argument", "there aren't enough members in the parent group");
			}else{
				var msg = "";
				shuffleArray(uids);
				var count = 0;
				while(uids.length > 0){
					var gpname = args.orig + "_" + count;
					var nids = [];
					if(count == args.numGps - 1)gpsize = uids.length;
					
					for(var j = 0; j < gpsize; j++){
						UserData.update(uids[0], {$push: {groups: gpname}});
						nids.push(uids.splice(0,1));
					}
					UserGroups.upsert({name: gpname }, {name: gpname, members: nids});
					msg += gpname + " with " + nids.length + " members \n";
					count ++;
				}
				return msg;
			}
		}
	},

	removeGroups: function(userId, args){
		if(checkAdmin(userId)){
			if(typeof(args) == "undefined"){
				//delete all groups
				UserData.update({},{$set: {groups: []}},{multi: true});
				UserGroups.remove({});
				return "clearing all groups ..."
			}else{

				UserData.update({groups: {$in: [args]}},{$pull: {groups: args}}, {multi: true});
				UserGroups.remove({name: args});
				return "removed group " + args;

			}
		}
	},

	createPreset: function(userId, args){

		if(checkAdmin(userId)){
			console.log("adding preset");
			Presets.upsert({type: args.type, name: args.name}, args); 
			var a = Object.keys(args.options);
			return "adding " + args.type + " preset " + args.name + " with " + a.length + " arguments";
		}

	},

	removePreset: function(userId, args){
		if(checkAdmin(userId)){
			Presets.remove({type: args.type, name: args.name});
			return "removing " + args.name + " in " + args.type;
		}
	},

	clearPresets: function(userId, args){

		if(checkAdmin(userId)){
			Presets.remove({});
		}
	},

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

	blobPing:function(options) { 

		var args = [];

	  	for(var p in options)
	  	{
	  		args.push(p);
			args.push(options[p]);
	  	}


		var buf = osc.toBuffer({
			address: "/blob",
			args: args
	  	});

	  	//console.log(args);

	  	udp.send(buf, 0, buf.length, port, host);

		
	},


	

	resetPlayers:function(userId){

		if(checkAdmin(userId)){

			Meteor.users.remove({'profile.role': 'player'});

			UserData.remove({});

			UserGroups.remove({});

			console.log("clearing player DB");

			
		}


	},

	fakePlayers:function(userId, numPlayers){

		if(checkAdmin(userId)){
			for(var i = 0; i < numPlayers; i++){
				UserData.insert({ view: 'wait', isSelected: false, on: false, off: false, voice: "none", activeThreads: [], groups: []});
			}
		}
	}


});




function checkAdmin(userId){

	var user = Meteor.users.findOne(userId);
	if(!user)return false;
	if(user.profile.role == "admin"){
		return true;
	}else{
		//throw new Meteor.Error("insufficient admin rights");
		return false;
	}
	
}

function checkDisplay(userId)
{
	var user = Meteor.users.findOne(userId);
	if(!user)return false;
	if(user.profile.role == "display"){
		return true;
	}else{
		//throw new Meteor.Error("insufficient admin rights");
		return false;
	}

}

function checkPlayer(userId)
{
	var user = Meteor.users.findOne(userId);
	if(!user)return false;
	if(user.profile.role == "player"){
		return true;
	}else{
		//throw new Meteor.Error("insufficient admin rights");
		return false;
	}

}



