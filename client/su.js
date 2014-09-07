
var numPlayers;
var isAllPlayers;
var isLockOn;

var isRandomVoice = false;

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

  numPlayers = 1;
  isAllPlayers = false;
  isLockOn = false;

  Meteor.subscribe("UserData", Meteor.user()._id);
  Meteor.subscribe("AllPlayers", Meteor.user()._id);

  Session.set("currentMode", "none");
  Session.set("currentVoice", voices[0]);

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

  },

  'click .filterItem':function(e){

    Session.set("currentMode", e.currentTarget.id);
    e.preventDefault();
  }



});

Template.su_players.playerModes = function(){
  return ["numbers" , "chat", "onOff", "none"];
}

Template.su_players.selectedPlayers = function(){
  return UserData.find({},{sort: {isSelected: -1}}).fetch();
}

Template.su_players.currentMode = function(){return Session.get("currentMode")}

function selectAllPlayers(){


    Meteor.users.find({'profile.role': "player"}).forEach(function(e){
      UserData.update(e._id,{$set: {isSelected: true}});
    });

}

function selectSomePlayers(){

  var uids = [];
  var invert = $('#invert').prop('checked');

   UserData.find().forEach(function(e){UserData.update(e._id, {$set: {isSelected: false}})});

  var searchObj = {};

  if(Session.get("currentMode")!= "none"){

    if(!$('#invert').prop('checked')){
      searchObj.view = Session.get("currentMode");
    }else{
      searchObj.view = {$ne: Session.get("currentMode")}
    }
  }


  UserData.find(searchObj).forEach(function(e){
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

Template.su_numbers.voices = function(){
  return voices;
}

Template.su_numbers.currentVoice = function(){return Session.get("currentVoice")}

Template.su_numbers.events({

'click #replay':function(e){

    var options = {};

    options = checkSendAll(options);

    msgStream.emit('message', {type: 'numbersReset', 'value': options});
    e.preventDefault();
  },

'click #numbersInit':function(e){
  
      var options = {};
      options = checkSendAll(options);
      msgStream.emit('message', {type: 'screenChange', 'value' : 'numbers'});
      msgStream.emit('message', {type: 'numbersReset', 'value': options});
      e.preventDefault();

  },

'click #lockOn':function(e){

  isLockOn = true;
  $('#lockOn').addClass('btn-primary');
  $('#lockOn').removeClass('btn-default');
  $('#lockOff').removeClass('btn-primary');
  $('#lockOff').addClass('btn-default');

  var options = {lockOn: isLockOn};
  options = checkSendAll(options);
  msgStream.emit('message', {type: 'numbersChange', 'value': options});
  e.preventDefault();
},

'click #lockOff':function(e){

  isLockOn = false;
  $('#lockOn').addClass('btn-default');
  $('#lockOn').removeClass('btn-primary');
  $('#lockOff').removeClass('btn-default');
  $('#lockOff').addClass('btn-primary');
  
  var options = {lockOn: isLockOn};
  options = checkSendAll(options);
  msgStream.emit('message', {type: 'numbersChange', 'value': options});
  e.preventDefault();
},



'click #randVoices': function(e){

    isRandomVoice = true;
    $('#randVoices').removeClass('btn-default');
    $('#randVoices').addClass('btn-primary');
    var options = {isRandomVoice: isRandomVoice};
    options = checkSendAll(options);
    msgStream.emit('message', {type: 'numbersChange', 'value': options});

    e.preventDefault();
},

'click .numbersInput, blur .numbersInput':function(e){

    var options = {};
    options[e.currentTarget.id] = $('#' + e.currentTarget.id).val();
    options = checkSendAll(options);
    msgStream.emit('message', {type: 'numbersChange', 'value': options});


},



'click .voiceItem':function(e){

  if(isRandomVoice){
      isRandomVoice = false;
      $('#randVoices').addClass('btn-default');
      $('#randVoices').removeClass('btn-primary');
  }
  Session.set("currentVoice", e.currentTarget.id);
  var options = {voice: e.currentTarget.id, isRandomVoice: false};
  options = checkSendAll(options);
  msgStream.emit('message', {type: 'numbersChange', 'value': options});
  e.preventDefault();
}




});

function checkSendAll(options){

  if($('#sendAll').prop('checked')){
      options = getNumbersOptions();
  }

  return options;
}

function getNumbersOptions(){
  var options = {

    lockOn: isLockOn, 
    startIndex: $('#startIndex').val(),
    endIndex: $('#endIndex').val(),
    volume: $('#volume').val(),
    pan:  $('#pan').val() ,
    fadeTime: $('#fadeTime').val(),
    isRandomVoice: isRandomVoice,
    voice: Session.get('currentVoice')

  };

  return options
}


Template.su_onOff.events({

  'click #onOffInit':function(e){

      msgStream.emit('message', {type: 'screenChange', 'value' : 'onOff'});
      e.preventDefault();
  }

});