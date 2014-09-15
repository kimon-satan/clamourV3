
var numPlayers;
var isAllPlayers;
var isLockOn;
var isRandVoice_Num = false;
var isRandVoice_oo = false;
var pwtOptions = {};
var gpnOptions = {};

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
  Session.set("numbersVoice", voices[0]);
  Session.set("onOffVoice", voices[0]);
  Session.set('currentSynth', synths[0]);
  Session.set('currentFilter', 'none');

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
    Session.set("currentFilter", "none");
    e.preventDefault();
  },

  'click .ooFilterItem':function(e){

    Session.set("currentFilter", e.currentTarget.id);
    e.preventDefault();
  },

  'click .nFilterItem':function(e){

    Session.set("currentFilter", e.currentTarget.id);
    e.preventDefault();
  }



});

Template.su_players.playerModes = function(){
  return ["numbers" , "chat", "onOff", "not_numbers", "not_chat" , "not_onOff", "none"];
}

Template.su_players.getSelected = function(p){if(p.isSelected)return "selected"}
Template.su_players.checkCurrentMode = function(m){return (Session.get("currentMode") == m)}

Template.su_players.selectedPlayers = function(){
  return UserData.find({},{sort: {isSelected: -1}}).fetch();
}

Template.su_players.currentMode = function(){return Session.get("currentMode")}
Template.su_players.currentFilter = function(){return Session.get("currentFilter")}

Template.su_players.onOffFilters = function(){return ["none", "noOn","hasOn", "noOff", "hasOff"]}
Template.su_players.voiceFilters = function(){

  var filters = ["none"];
  for(v in voices){
    filters.push(voices[v]);
    filters.push("not_" + voices[v]);
  }

  return filters;

}

function selectAllPlayers(){


    Meteor.users.find({'profile.role': "player"}).forEach(function(e){
      UserData.update(e._id,{$set: {isSelected: true}});
    });

}

function selectSomePlayers(){

  var uids = [];
  var invert = $('#invert').prop('checked');

   UserData.find().forEach(function(e){UserData.update(e._id, {$set: {isSelected: invert}})});

  var searchObj = {};

  switch(Session.get("currentMode")){
    case "numbers": 
    case "chat": 
    case "onOff": 
      searchObj.view = Session.get("currentMode");
    break;
    case "not_numbers":
    case "not_chat": 
    case "not_onOff": 
      searchObj.view = {$ne: Session.get("currentMode").substring(4)}
    break;

  }

  if(Session.get("currentMode") == "onOff"){
    switch(Session.get("currentFilter")){
        case "hasOn": 
        searchObj.on = true;
        break;
        case "hasOff": 
        searchObj.off = true;
        break;
        case "noOn": 
        searchObj.on = {$ne: true}
        break;
        case "noOff": 
        searchObj.off = {$ne: true}
        break;
    }
  }else if(Session.get("currentMode") == "numbers"){
    if(Session.get("currentFilter") != "none"){

      if(Session.get("currentFilter").substring(0,4) == "not_"){
        searchObj.voice =  {$ne: Session.get("currentFilter").substring(4)}
      }else{
        searchObj.voice = Session.get("currentFilter");
      }

    }
  }
      


    


  UserData.find(searchObj).forEach(function(e){
    uids.push(e._id);
  });

  shuffleArray(uids);

  var numPlayers = Math.min(uids.length , $('#numPlayers').val());

  for(var i = 0; i < numPlayers; i++){
    UserData.update(uids[i], {$set: {isSelected: !invert}});
  }

}

function shuffleArray(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};


/*--------------------------------------------------------chat-------------------------------------------*/

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

/*--------------------------------------------------------numbers-------------------------------------------*/

Template.su_numbers.voices = function(){
  return voices;
}

Template.su_numbers.currentVoice = function(){return Session.get("numbersVoice")}


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

'click #splay':function(e){

  var options = {splay: $('#splay').val()};
  options = checkSendAll(options);
  msgStream.emit('message', {type: 'numbersChange', 'value': options});
  e.preventDefault();
},


'click #randVoices_num': function(e){

    isRandVoice_Num = true;
    $('#randVoices_num').removeClass('btn-default');
    $('#randVoices_num').addClass('btn-primary');
    var options = {isRandomVoice: isRandVoice_Num};
    options = checkSendAll(options);
    msgStream.emit('message', {type: 'numbersChange', 'value': options});

    e.preventDefault();
},

'click #notRandVoices_num': function(e){

    isRandVoice_Num = false;
    $('#randVoices_num').addClass('btn-default');
    $('#randVoices_num').removeClass('btn-primary');
    var options = {isRandomVoice: isRandVoice_Num};
    options = checkSendAll(options);
    msgStream.emit('message', {type: 'numbersChange', 'value': options});

    e.preventDefault();
},

'click .voiceItem':function(e){

  if(isRandVoice_Num){
        isRandVoice_Num = false;
        $('#randVoices_num').addClass('btn-default');
        $('#randVoices_num').removeClass('btn-primary');
    }
  Session.set("numbersVoice", e.currentTarget.id);
  var options = {voice: e.currentTarget.id, isRandomVoice: false};
  options = checkSendAll(options);
  msgStream.emit('message', {type: 'numbersChange', 'value': options});

  e.preventDefault();
},

'click .numbersInput, blur .numbersInput':function(e){

    var options = {};
    options[e.currentTarget.id] = $('#' + e.currentTarget.id).val();
    options = checkSendAll(options);
    msgStream.emit('message', {type: 'numbersChange', 'value': options});


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
    isRandomVoice: isRandVoice_Num,
    splay: $('#splay').val(),
    voice: Session.get('numbersVoice')

  };

  return options
}


/*---------------------------------------------------- on off -------------------------------------------*/

Template.su_onOff.events({

  'click #onOffInit':function(e){

      msgStream.emit('message', {type: 'screenChange', 'value' : 'onOff'});
      e.preventDefault();
  },

  'click #addOn':function(e){

    var onOptions = getOnOptions();
    msgStream.emit('message', {type: 'addOn', 'value' : onOptions});
    e.preventDefault();
  },

  'click #addOff':function(e){

    var offOptions = getOffOptions();
    msgStream.emit('message', {type: 'addOff', 'value' : offOptions});
    e.preventDefault();
  },

  'click #randVoices_oo': function(e){

    isRandVoice_oo = true;
    $('#randVoices_oo').removeClass('btn-default');
    $('#randVoices_oo').addClass('btn-primary');
    var options = {isRandomVoice: isRandVoice_oo};
    options = checkSendAll(options);
    msgStream.emit('message', {type: 'numbersChange', 'value': options});

    e.preventDefault();
  },

  'click .voiceItem':function(e){

    if(isRandVoice_oo){
        isRandVoice_oo = false;
        $('#randVoices_oo').addClass('btn-default');
        $('#randVoices_oo').removeClass('btn-primary');
    }

    Session.set("onOffVoice", e.currentTarget.id);

    e.preventDefault();
  },

  'click .synthItem':function(e){

    Session.set('currentSynth', e.currentTarget.id);
    e.preventDefault();

  }

});


Template.su_onOff.voices = function(){
  return voices;
}

Template.su_onOff.currentSynth = function(){
  return Session.get('currentSynth');
}

Template.su_onOff.isSynth = function(s){
  return (Session.get('currentSynth') == s);
}

Template.su_onOff.synths = function(){
  return synths;
}

Template.su_onOff.currentVoice = function(){return Session.get("onOffVoice")}

Template.su_pwtCtrls.created = function(){

  Meteor.defer(function(){
    

    if(typeof pwtOptions.minFreq !== 'undefined')$('#oo_minF').val(pwtOptions.minFreq);
    if(typeof pwtOptions.fRng !== 'undefined')$('#oo_fRng').val(pwtOptions.fRng);
    if(typeof pwtOptions.noiseFreq !== 'undefined')$('#oo_noiseFreq').val(pwtOptions.noiseFreq);
    if(typeof pwtOptions.nFreqV !== 'undefined')$('#oo_nFreqV').val(pwtOptions.nFreqV);

  });
}

Template.su_pwtCtrls.destroyed = function(){
    pwtOptions.minFreq = $('#oo_minF').val();
    pwtOptions.fRng = $('#oo_fRng').val();
    pwtOptions.noiseFreq = $('#oo_noiseFreq').val();
    pwtOptions.nFreqV = $('#oo_nFreqV').val();
}

Template.su_gpnCtrls.created = function(){

  Meteor.defer(function(){
    

    if(typeof gpnOptions.trigRate !== 'undefined')$('#oo_trigRate').val(gpnOptions.trigRate);
    if(typeof gpnOptions.envDur !== 'undefined')$('#oo_envDur').val(gpnOptions.envDur);
    if(typeof gpnOptions.endPosR !== 'undefined')$('#oo_endPosR').val(gpnOptions.endPosR);
    if(typeof gpnOptions.variance !== 'undefined')$('#oo_variance').val(gpnOptions.variance);

  });
}

Template.su_gpnCtrls.destroyed = function(){
      gpnOptions.trigRate = $('#oo_trigRate').val();
      gpnOptions.envDur = $('#oo_envDur').val();
      gpnOptions.endPosR = $('#oo_endPosR').val();
      gpnOptions.variance = $('#oo_variance').val();

}



function getOnOptions(){

    var onOptions = {};
    onOptions.synth = Session.get('currentSynth');
    onOptions.isRandomVoice = isRandVoice_oo;
    onOptions.voice = Session.get('onOffVoice');
    onOptions.pan = $('#oo_pan').val();
    onOptions.splay = $('#oo_splay').val();
    onOptions.vVolume = $('#oo_Vvolume').val();
    onOptions.sVolume = $('#oo_Svolume').val();

    if(onOptions.synth == 'playWithTone'){
      onOptions.minFreq = $('#oo_minF').val();
      onOptions.fRng = $('#oo_fRng').val();
      onOptions.noiseFreq = $('#oo_noiseFreq').val();
      onOptions.nFreqV = $('#oo_nFreqV').val();
    }else if(onOptions.synth == 'granPulseNoise'){
      onOptions.trigRate = $('#oo_trigRate').val();
      onOptions.envDur = $('#oo_envDur').val();
      onOptions.endPosR = $('#oo_endPosR').val();
      onOptions.variance = $('#oo_variance').val();
    }


    return onOptions;

}

function getOffOptions(){

  var offOptions = {};
  offOptions.isRandomVoice = isRandVoice_oo;
  offOptions.voice = Session.get('onOffVoice');
  offOptions.volume = $('#oo_Vvolume').val();
  offOptions.pan = $('#oo_pan').val();
  offOptions.splay = $('#oo_slay').val();

  return offOptions;

}



