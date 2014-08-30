
UI.registerHelper('isSu', function(){ return Meteor.user().profile.role == 'admin';});
UI.registerHelper('isSuLogin', function(){ return Session.get('isAdmin')});

Template.helloSu.events({

  'click #login':function(e){

    var un = $('#username').val();
    var pass = $('#password').val();

    Meteor.loginWithPassword(un, pass, function(err){

      if(err)console.log(err);

    });

    e.preventDefault();
  }

});

Template.su.events({

  'click #replay':function(e){

    msgStream.emit('message', "reset");
    e.preventDefault();
  },

  'click #resetAll':function(e){

  	if(confirm("are you sure ?")){

  		Meteor.call("resetAllPlayers", Meteor.user()._id);

  	};
  	e.preventDefault();
  }

});