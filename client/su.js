
var CLMR_CMDS = {}
var CHAT_CMDS = {}
var cli_mode = "clmr";

var numPlayers;
var isAllPlayers;
var isLockOn;
var isRandVoice_Num = false;
var isRandVoice_oo = false;
var isRandVoice_wds = false;
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
  Meteor.subscribe("UserGroups", Meteor.user()._id);

  Session.set("currentMode", "none");
  Session.set("numbersVoice", voices[0]);
  Session.set("wordsVoice" , voices[0]);
  Session.set("currentWord", words[0]);
  Session.set("offTVoice", voices[0]);
  Session.set("onOffVoice", voices[0]);
  Session.set('currentSynth', synths[0]);
  Session.set('currentFilter', 'none');

  Meteor.defer(function(){

    $('#chatText').val("");
    selectSomePlayers();

  });

}

Template.su_synth_ctrl.events({

  'click #killSynths':function(e){

    Meteor.call("killSynths", Meteor.user()._id);
    e.preventDefault();
  }, 

  'click #startPedal':function(e){

    Meteor.call("startPedal", Meteor.user()._id);
    e.preventDefault();

  }



});


Template.su_players.events({


  'click #resetPlayers':function(e){

    if(confirm("are you sure ?")){

      Meteor.call("resetPlayers", Meteor.user()._id);

    };

    e.preventDefault();
  },

  'click #deselect':function(e){
    deselectAllPlayers();
    e.preventDefault();
  },


  'change #allPlayers, click #reselect, click #numPlayers':function(e){

      if(e.currentTarget.id == 'numPlayers'){$('#allPlayers').prop('checked', false)}
      selectSomePlayers($('#allPlayers').prop('checked'));


  },

  'click .filterItem':function(e){

    Session.set("currentMode", e.currentTarget.id);
    Session.set("currentFilter", "none");
    selectSomePlayers($('#allPlayers').prop('checked'));
    e.preventDefault();
  },

  'click .ooFilterItem':function(e){

    Session.set("currentFilter", e.currentTarget.id);
     selectSomePlayers($('#allPlayers').prop('checked'));
    e.preventDefault();
  },

  'click .nFilterItem':function(e){

    Session.set("currentFilter", e.currentTarget.id);
     selectSomePlayers($('#allPlayers').prop('checked'));
    e.preventDefault();
  },

  'click #invert':function(e){
     selectSomePlayers($('#allPlayers').prop('checked'));
   },

  'click .grpSel':function(e){

    var idx = e.currentTarget.id.substring(4);
    var ug = UserGroups.findOne({index: idx});

    for(var i = 0; i < ug.users.length; i++){
      UserData.update(ug.users[i], {$set:{isSelected: true}});
    }


    e.preventDefault();
  },

  'click .grpDSel':function(e){
    
    var idx = e.currentTarget.id.substring(4);
    var ug = UserGroups.findOne({index: idx});

    for(var i = 0; i < ug.users.length; i++){
      UserData.update(ug.users[i], {$set:{isSelected: false}});
    }

    e.preventDefault();
  },

  'click .grpSave':function(e){
    
    var idx = e.currentTarget.id.substring(4);
    var ug = UserGroups.findOne({index: idx});
    var sel = UserData.find({isSelected: true},{fields: {isSelected: 1}}).fetch();


    ug.users = [];
    for(var i = 0; i < sel.length; i++){
      ug.users.push(sel[i]._id);
    }

    UserGroups.update(ug._id, {$set: {users: ug.users}});
    e.preventDefault();
  }



});

Template.su_players.playerModes = function(){
  return ["words", "numbers" , "chat", "onOff", "not_words","not_numbers", "not_chat" , "not_onOff", "none"];
}

Template.su_players.playerGroups = function(){
  return UserGroups.find({},{sort:{index: 1}}).fetch();
}

Template.su_players.population = function(){
  return this.users.length;
}

Template.su_players.getGroupSelected = function(){
  return this.isSelected;
}

Template.su_playerTable.getSelected = function(p){if(p.isSelected)return "selected"}
UI.registerHelper('checkCurrentMode', function(m){return (Session.get("currentMode") == m)});

Template.su_playerTable.selectedPlayers = function(){
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

function deselectAllPlayers(){


    Meteor.users.find({'profile.role': "player"}).forEach(function(e){
      UserData.update(e._id,{$set: {isSelected: false}});
    });

}

function selectSomePlayers(allPlayers){

  var uids = [];
  var invert = $('#invert').prop('checked');

   UserData.find().forEach(function(e){UserData.update(e._id, {$set: {isSelected: invert}})});

  var searchObj = {};

  switch(Session.get("currentMode")){
    case "words":
    case "numbers": 
    case "chat": 
    case "onOff": 
      searchObj.view = Session.get("currentMode");
    break;
    case "not_words":
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
  }else if(Session.get("currentMode") == "numbers" || Session.get("currentMode") == "words" ){
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

  if(!allPlayers){
    shuffleArray(uids);

    var numPlayers = Math.min(uids.length , $('#numPlayers').val());

    for(var i = 0; i < numPlayers; i++){
      UserData.update(uids[i], {$set: {isSelected: !invert}});
    }
  }else{

    for(var i = 0; i < uids.length; i++){
      UserData.update(uids[i], {$set: {isSelected: !invert}});
    }

  }

}

function shuffleArray(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};


/*-----------------------------------------------CLI ----------------------------------------*/


Template.su_cmd.created = function(){

  Meteor.defer(function(){
     $('#cmdText').val("clmr>");

  })
 
}


Template.su_cmd.events({


  'keydown #cmdText':function(e)
  {
    
    var str = $('#cmdText').val();    
    var cmds = str.split(cli_mode + ">");
    var cmd = cmds[cmds.length - 1];

    if(e.keyCode == 8)
    {
        return (cmd.length > 0);
    }else if(e.keyCode == 13){
        e.preventDefault();
    }
  },

  'keyup #cmdText':function(e){
        
      var str = $('#cmdText').val();    
      var cmds = str.split(cli_mode + ">");
      var cmd = cmds[cmds.length - 1];

      if(cli_mode == "chat" && cmd.substring(0,1) != "_"){ //potentially refacctor at somepoint
        
        if(e.keyCode == 13){
          newCursor();
          msgStream.emit('message', {type: 'chatNewLine', 'value':  ""});
        }else{
          msgStream.emit('message', {type: 'updateChat', 'value':  cmd});
        }
      }
      else if(e.keyCode == 13)
      {
     
        cmd.replace(/\r?\n|\r/,"");
        evaluateCommand(cmd, newCursor);
     
      }

  }



});

newCursor = function(){
  println(cli_mode + ">");
}

println = function(str){
  $('#cmdText').val($('#cmdText').val() + "\n"+ str);   
}


evaluateCommand = function(cmd, callback){

  var result_str;
  var cmds;

  switch(cli_mode){
    case "clmr": cmds = CLMR_CMDS;break;
    case "chat": cmds = CHAT_CMDS;break;
  }

  if(typeof(cmds[cmd]) != 'undefined'){
    cmds[cmd](callback);
  }else{
    println("command not found")
    callback();
  }

}

CLMR_CMDS["_chat"] = function(callback){

    cli_mode = "chat";
    msgStream.emit('message', {type: 'screenChange', 'value' : 'chat'});
    msgStream.emit('message', {type: 'updateChat', 'value':  ""});
    callback();

}

CHAT_CMDS["_q"] = function(callback){
    cli_mode = "clmr";
    callback();
}



/*--------------------------------------------------------chat-------------------------------------------*/




Template.su_chat.events({

   'click #chatClear':function(e){

    $('#chatText').val("");
    e.preventDefault();

  },


  'keyup #chatText':function(e){
        
      var s = $('#chatText').val();    
      console.log(s);
      msgStream.emit('message', {type: 'updateChat', 'value':  s});
    
  },

  'click #chatInit':function(e){
    
    $('#chatText').val("");
  
    msgStream.emit('message', {type: 'screenChange', 'value' : 'chat'});
    msgStream.emit('message', {type: 'updateChat', 'value':  $('#chatText').val()});
    
  }

});

/*---------------------------------------------------------words-------------------------------------------*/



Template.su_words.events({

  'click #init':function(e){
  
      var options = {};
      options = checkSendAllWords(options);
      msgStream.emit('message', {type: 'screenChange', 'value' : 'words'});
      msgStream.emit('message', {type: 'wordsReset', 'value': options});
      e.preventDefault();

  },

  'click #killSynthsWds':function(e){

      var options = {killSynths: $('#killSynthsWds').prop('checked')};
      options = checkSendAllWords(options);
      msgStream.emit('message', {type: 'wordsChange', 'value': options});
  },

  'click .voiceItem':function(e){

    if(isRandVoice_wds){
        isRandVoice_wds = false;
        $('#randVoices_wds').addClass('btn-default');
        $('#randVoices_wds').removeClass('btn-primary');
      }
    Session.set("wordsVoice", e.currentTarget.id);
    var options = {voice: e.currentTarget.id, isRandomVoice: false};
    options = checkSendAllWords(options);
    msgStream.emit('message', {type: 'wordsChange', 'value': options});

    e.preventDefault();
  },

  'click .wordItem':function(e){

    Session.set("currentWord", e.currentTarget.id);
    var options = {word: e.currentTarget.id};
    options = checkSendAllWords(options);
    msgStream.emit('message', {type: 'wordsChange', 'value': options});

    e.preventDefault();
  },

  'click #randVoices_wds': function(e){

    isRandVoice_wds = true;
    $('#randVoices_wds').removeClass('btn-default');
    $('#randVoices_wds').addClass('btn-primary');
    var options = {isRandomVoice: isRandVoice_wds};
    options = checkSendAllWords(options);
    msgStream.emit('message', {type: 'wordsChange', 'value': options});

    e.preventDefault();
},

'click #notRandVoices_wds': function(e){

    isRandVoice_Num = false;
    $('#randVoices_wds').addClass('btn-default');
    $('#randVoices_wds').removeClass('btn-primary');
    var options = {isRandomVoice: isRandVoice_wds};
    options = checkSendAllWords(options);
    msgStream.emit('message', {type: 'wordsChange', 'value': options});

    e.preventDefault();
},


'click .wordsInput, blur .wordsInput':function(e){

    var options = {};
    options[e.currentTarget.id] = $('#' + e.currentTarget.id).val();
    options = checkSendAllWords(options);
    msgStream.emit('message', {type: 'wordsChange', 'value': options});

}


});



Template.su_words.voice = function(){return Session.get("wordsVoice")}

Template.su_words.words = function(){return words}
Template.su_words.currentWord = function(){ return Session.get("currentWord")}


function checkSendAllWords(options){

  if($('#sendAllWds').prop('checked')){
      options = getWordsOptions();
  }

  return options;
  
}

function getWordsOptions(options){
  var options = {
    volume: $('#volume.wordsInput').val(),
    pan:  $('#pan.wordsInput').val() ,
    fadeTime: $('#fadeTime.wordsInput').val(),
    isRandomVoice: isRandVoice_wds,
    splay: $('#splay.wordsInput').val(),
    voice: Session.get('wordsVoice'),
    resetTime: $('#resetTime.wordsInput').val(),
    word: Session.get("currentWord"),
    killSynths: $('#killSynthsWds').prop('checked')
  }
  return options;
}


/*--------------------------------------------------------numbers-------------------------------------------*/


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
    startIndex: $('#startIndex.numbersInput').val(),
    endIndex: $('#endIndex.numbersInput').val(),
    volume: $('#volume.numbersInput').val(),
    pan:  $('#pan.numbersInput').val() ,
    fadeTime: $('#fadeTime.numbersInput').val(),
    isRandomVoice: isRandVoice_Num,
    splay: $('#splay.numbersInput').val(),
    voice: Session.get('numbersVoice'),
    resetPause: $('#resetPause.numbersInput').val()

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


UI.registerHelper('voices' , function(){
  return voices;
});

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

/*--------------------------------------------------------offTransition -------------------------------------*/
Template.su_offTransition.currentVoice = function(){return Session.get("offTVoice")}

Template.su_offTransition.events({

  'click #offTInit':function(e){

    var options = {
      voice: Session.get("offTVoice"),
      vol: $('#ot_volume').val(),
      pan: $('#ot_pan').val(),
      splay: $('#ot_splay').val()
    }

    msgStream.emit('message', {type: 'offTransition', 'value': options});
    e.preventDefault();
  },

  'click .voiceItem':function(e){

    Session.set("offTVoice", e.currentTarget.id);
    e.preventDefault();

  }

});



