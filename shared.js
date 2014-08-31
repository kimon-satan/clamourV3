UserData = new Meteor.Collection('UserData');

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