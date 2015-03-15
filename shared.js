UserData = new Meteor.Collection('UserData');
UserGroups = new Meteor.Collection('UserGroups');
Presets = new Meteor.Collection('Presets');
Threads = new Meteor.Collection('Threads');


words = ["go", "start", "stop", "end"];
voices = ['peterUK' , 'grahamUK', 'rachelUK' , 'catherineUK', 'bridgetUK',  'rayUS', 'ryanUS', 'paulUS', 'heatherUS', 'kateUS'];
synths = ['playWithTone', 'granPulseNoise'];

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