UserData = new Meteor.Collection('UserData');
UserGroups = new Meteor.Collection('UserGroups');
Presets = new Meteor.Collection('Presets');
Threads = new Meteor.Collection('Threads');


words = ["go", "start", "stop", "end"];
voices = ['peterUK' , 'grahamUK', 'rachelUK' , 'catherineUK', 'bridgetUK',  'rayUS', 'ryanUS', 'paulUS', 'heatherUS', 'kateUS'];
synths = ['playWithTone', 'granPulseNoise'];
rules = ['none', 'minus', 'plus', 'mute', 'plus_mute'];

UserGroups.allow({

	update: adminTest,
	insert: adminTest,
	remove: adminTest

});

UserGroups.deny({
		
	update: function(user){return !adminTest(user);},
	insert: function(user){return !adminTest(user);},
	remove: function(user){return !adminTest(user);}	

});

UserData.allow({

	update: adminOwnerTest,
	insert: adminOwnerTest,
	remove: adminOwnerTest

});

UserData.deny({

	update: function(user, doc){return !adminOwnerTest(user, doc);},
	insert: function(user, doc){return !adminOwnerTest(user, doc);},
	remove: function(user, doc){return !adminOwnerTest(user, doc);}	
});


Meteor.users.allow({
		
	update: adminTest,
	insert: adminTest,
	remove: adminTest

});

Meteor.users.deny({
		
	update: function(user){return !adminTest(user);},
	insert: function(user){return !adminTest(user);},
	remove: function(user){return !adminTest(user);}	

});

function adminTest(user){

	var role = Meteor.users.findOne(user).profile.role;
	
	if(role == 'admin'){
		return true;
	}else{
		return false;
	}
}

function adminOwnerTest(user, doc){

	var role = Meteor.users.findOne(user).profile.role;
	
	if(role == 'admin'){
		return true;
	}else{
		return (doc._id == user);
	}
}

//helpers

isNumber = function(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

selectPlayers = function(args){

	console.log("selecting players ... ");

	var uids = [];

	var searchObj = generateSearchObj(args);


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

generateSearchObj = function(args){

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
		case "word":
			searchObj.word = filter.not ?  {$ne: filter.word} : filter.word; 
		break;
		case "thread":
			searchObj.activeThreads = filter.not  ? {$nin: [filter.thread]} : {$in: [filter.thread]}
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

	return searchObj;

}

shuffleArray = function(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}

