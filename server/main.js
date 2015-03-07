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
		//console.log(user);
		UserData.insert({ _id: user._id, view: 'wait', isSelected: false, on: false, off: false, voice: "none", activeThreads: [], groups: []});
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
			return true;
		}
	}

},false);






Meteor.methods({

	killThread: function(userId, thread){

		if(checkAdmin(userId)){
			UserData.update({activeThreads: {$in: [thread]}}, {$pull: {activeThreads: thread}},{multi: true});
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
			
			if(typeof(args.group) == "undefined"){
				

				for(var i = 0; i < uids.length; i++){
					UserData.update(uids[i], {$push: {activeThreads: args.thread}});
				}

			}else{

				for(var i = 0; i < uids.length; i++){
					UserData.update(uids[i], {$push: {activeThreads: args.thread, groups: args.group}});
				}

				UserGroups.insert({name: args.group, members: uids});
				msg += "\n these players will now be called " + args.group;

			}

			return msg;

		}

	},



	createGroup:function(userId, args){

		if(typeof(args) == "undefined")return false;

		if(checkAdmin(userId)){

			var uids = selectPlayers(args);

			for(var i = 0; i < uids.length; i++){
				UserData.update(uids[i], {$push: {groups: args.group}});
			}

			UserGroups.insert({name: args.group, members: uids});
			return  uids.length + " players will now be called " + args.group;

		}
	},

	createSubGroups: function(userId, args){

		if(checkAdmin(userId)){
			var uids = UserGroups.findOne({name: args.orig}).members;
			var gpsize = uids.length/parseInt(args.numGps);
			if(gpsize < 2){
				throw new Meteor.Error("invalid argument", "there aren't enough members in the parent group");
			}else{
				var msg = "";
				shuffleArray(uids);
				for(var i = 0; i < args.numGps; i++){
					var gpname = args.orig + "_" + i;
					var nids = [];
					for(var j = 0; j < gpsize; j++){
						UserData.update(uids[0], {$push: {groups: gpname}});
						nids.push(uids.splice(0,1));
						if(uids.length == 0)break;
					}
					UserGroups.insert({name: gpname, members: nids});
					msg += gpname + " with " + nids.length + " members \n";
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

			}
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

	numPing:function(options) { 

		//console.log(options);

		var buf = osc.toBuffer({
			address: "/hit",
			args: [options.num, options.voice, options.vol, options.pan]
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

			UserGroups.remove({});

			
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


function selectPlayers(args){

	console.log("selecting players ... ");

	var uids = [];

	var searchObj = {};

	if(typeof(args.filters) == "undefined")args.filters = [];

	for(var i = 0; i < args.filters.length; i++){

	var filter = args.filters[i];

	switch(filter.mode){
		case "words":
		case "numbers": 
		case "chat": 
		case "onOff": 
			searchObj.view = filter.not ? {$ne: filter.mode} : filter.mode;
		break;
		case "hasOn": 
			searchObj.on = !filter.not;
		break;
		case "hasOff": 
			searchObj.off = !filter.not; 
		break;
		case "voice":
			searchObj.voice = filter.not ?  {$ne: filter.voice} : filter.voice; 
		break;
		case "group":
			if(typeof(searchObj.groups) == "undefined"){
				searchObj.groups = filter.not ?  {$nin: [filter.group]} : {$in: [filter.group]}
			}else{

				if(filter.not){
					if(typeof(searchObj.groups['$nin']) == "undefined"){
						searchObj.groups['$nin'] = [filter.group];
					}else{
						searchObj.groups['$nin'].push(filter.group);
					}

				}else{

					if(typeof(searchObj.groups.$in) == "undefined"){
						searchObj.groups['$in'] = [filter.group];
					}else{
						searchObj.groups['$in'].push(filter.group);
					}
				}
			}
		break;
		}

	}


	UserData.find(searchObj).forEach(function(e){
		uids.push(e._id);
	});


	if(typeof(args.numPlayers) != "undefined"){
		shuffleArray(uids);
		var numPlayers = Math.min(uids.length , args.numPlayers);
		uids = uids.slice(0,numPlayers);
	}


	return uids;
}

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

function shuffleArray(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}