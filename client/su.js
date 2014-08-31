
var isChat;
var numPlayers;
var isAllPlayers;


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

Template.su.created = function(){

  isChat = false;
  numPlayers = 1;
  isAllPlayers = false;


  Meteor.subscribe("UserData", Meteor.user()._id);
  Meteor.subscribe("AllPlayers", Meteor.user()._id);


  Meteor.defer(function(){

    $('#chatText').val("");
    selectSomePlayers();

  });

}


Template.su_players.events({


  'click #resetPlayers':function(e){

    if(confirm("are you sure ?")){

      Meteor.call("resetPlayers", Meteor.user()._id);

    };

    e.preventDefault();
  },


  'change #allPlayers, click #reselect':function(e){

    if($('#allPlayers').prop('checked')){
      selectAllPlayers();
    }else{
      selectSomePlayers();
    }


  }

});

Template.su_players.selectedPlayers = function(){
  return UserData.find({isSelected: true}).fetch();
}

function selectAllPlayers(){


    Meteor.users.find({'profile.role': "player"}).forEach(function(e){
      UserData.update(e._id,{$set: {isSelected: true}});
    });

}

function selectSomePlayers(){

  var uids = [];

   UserData.find().forEach(function(e){UserData.update(e._id, {$set: {isSelected: false}})});

  Meteor.users.find({'profile.role': "player"}).forEach(function(e){
    uids.push(e._id);
  });

  shuffleArray(uids);

  var numPlayers = Math.min(uids.length , $('#numPlayers').val());

  for(var i = 0; i < numPlayers; i++){
    UserData.update(uids[i], {$set: {isSelected: true}});
  }

}

function shuffleArray(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

Template.su_chat.events({

   'click #chatClear':function(e){

    $('#chatText').val("");
    e.preventDefault();

  },


  'keyup #chatText':function(e){
    
      msgStream.emit('message', {type: 'updateChat', 'value':  $('#chatText').val()});
    
  },

  'click #chatInit':function(e){
    
    $('#chatText').val("");
  
    msgStream.emit('message', {type: 'screenChange', 'value' : 'chat'});
    msgStream.emit('message', {type: 'updateChat', 'value':  $('#chatText').val()});
    
  }

});

Template.su_numbers.events({

'click #replay':function(e){

    msgStream.emit('message', {type: 'numbersReset'});
    e.preventDefault();
  },

  'click #numbersInit':function(e){
  

      msgStream.emit('message', {type: 'screenChange', 'value' : 'numbers'});
      msgStream.emit('message', {type: 'numbersReset'});

  }

});