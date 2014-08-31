
var isChat;
var numPlayers;
var isAllPlayers;


UI.registerHelper('isSu', function(){ return Meteor.user().profile.role == 'admin';});
UI.registerHelper('isSuLogin', function(){ return Session.get('isAdmin')});

Meteor.subscribe("SelectedUsers");

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

Template.su.created = function(){

  isChat = false;
  numPlayers = 1;
  isAllPlayers = false;

  Meteor.defer(function(){

    $('#chatText').val("");

  });

}

Template.su.events({

  'click #replay':function(e){

    msgStream.emit('message', {type: 'numbersReset'});
    e.preventDefault();
  },

  'click #resetAll':function(e){

  	if(confirm("are you sure ?")){

  		Meteor.call("resetAllPlayers", Meteor.user()._id);

  	};
  	e.preventDefault();
  },

  'click #chatClear':function(e){

    $('#chatText').val("");
    e.preventDefault();

  },


  'keyup #chatText':function(e){
    if(isChat){
      msgStream.emit('message', {type: 'updateChat', 'value':  $('#chatText').val()});
      console.log( isChat + "," + $('#chatText').val());
    }
  },

  'change #chatBox':function(e){
    isChat = $('#chatBox').prop('checked');
    $('#chatText').val("");
    if(isChat){
      msgStream.emit('message', {type: 'screenChange', 'value' : 'chat'});
      msgStream.emit('message', {type: 'updateChat', 'value':  $('#chatText').val()});
    }
  }



});