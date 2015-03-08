
var CLMR_CMDS = {}
var CHAT_CMDS = {}
var WORDS_CMDS = {}
var NUMBERS_CMDS = {}

var cli_mode = "clmr";

var numPlayers;
var cliThread;
var isAllPlayers;
var isLockOn;
var isRandVoice_Num = false;
var isRandVoice_oo = false;
var isRandVoice_wds = false;
var pwtOptions = {};
var gpnOptions = {};

var wordsPresets = {};  //this should be in a DB
var numbersPresets = {};

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
  Meteor.subscribe("Presets");

  Session.set("currentMode", "none");


  Session.set("offTVoice", voices[0]);
  Session.set("onOffVoice", voices[0]);
  Session.set('currentSynth', synths[0]);




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
  }



});



Template.su_players.playerGroups = function(){
  return UserGroups.find({},{sort:{index: 1}}).fetch();
}

Template.su_players.population = function(){
  return this.members.length;
}

Template.su_playerTable.getSelected = function(p){if(p.activeThreads.indexOf(cliThread) > -1)return "selected"}
UI.registerHelper('checkCurrentMode', function(m){return (Session.get("currentMode") == m)});

Template.su_playerTable.selectedPlayers = function(){
  return UserData.find({}).fetch();
}






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
    }else if(e.keyCode == 75 && e.metaKey){
      $('#cmdText').val(cli_mode + ">");
    }

  },

  'keyup #cmdText':function(e){
        
      var str = $('#cmdText').val();    
      var cmds = str.split(cli_mode + ">");
      var cmd = cmds[cmds.length - 1];

      if(cli_mode == "chat" && cmd.substring(0,1) != "_"){ //potentially refacctor at somepoint
        
        if(e.keyCode == 13){
          newCursor();
          msgStream.emit('message', { type: 'chatNewLine', value:  "", thread: cliThread});
        }else{
          msgStream.emit('message', { type: 'chatUpdate', value:  cmd, thread: cliThread});
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

cmdReturn = function(error, result){

  if(error){
    println(error.reason);
  }else if(result){
    println(result)
  }

  newCursor();
}

println = function(str){
  $('#cmdText').val($('#cmdText').val() + "\n"+ str);   
}


evaluateCommand = function(cmd, callback){

  var result_str;
  var cmds, args;

  switch(cli_mode){
    case "clmr": cmds = CLMR_CMDS;break;
    case "chat": cmds = CHAT_CMDS;break;
    case "words": cmds = WORDS_CMDS;break;
    case "numbers": cmds = NUMBERS_CMDS; break;
  }

  //get rid of any unnecessary spaces
  cmd = cmd.replace(/,\s|\s,/g, ",");
  
  cmd = cmd.replace(/\[\s/g, "[");
  cmd = cmd.replace(/\s\]/g, "]");
  cmd = cmd.replace(/\(\s/g, "(");
  cmd = cmd.replace(/\s\)/g, ")");


  args = cmd.split(" ");
  console.log(args);
  cmd = args[0];
  args = args.slice(1);

  if(typeof(cmds[cmd]) != 'undefined'){
    cmds[cmd](args, callback);
  }else{
    println("command not found")
    callback();
  }

}

CLMR_CMDS["_chat"] = function(args, callback){

    cli_mode = "chat";
    cliThread = generateTempId(10); //TODO: this will go soon ?

    var selector = parseFilters(args);
    selector.mode = cli_mode;
    if(selector){
      selector.thread = cliThread;

      Meteor.call("addThreadToPlayers", Meteor.user()._id, selector,
        function(e, r){
            //only make the call once the thread has been added
            if(!e){

              msgStream.emit('message', {type: 'screenChange', 'value' : 'chat', thread: cliThread});
              msgStream.emit('message', {type: 'chatClear', 'value':  "", thread: cliThread});
              println(r);

            }else{
              println(e.reason);
            }
            newCursor();
        }
      );
    }else{

      msgStream.emit('message', {type: 'screenChange', 'value' : 'chat', thread: cliThread});
      msgStream.emit('message', {type: 'chatClear', 'value':  "", thread: cliThread});
      callback();
    }

    

}

CLMR_CMDS["_words"] = function(args, callback){

    cli_mode = "words";
    cliThread = generateTempId(10);  //this will need to change in a minute to keep last thread

    var selector = parseFilters(args);
    selector.mode = cli_mode;
    if(selector){
      selector.thread = cliThread;

      Meteor.call("addThreadToPlayers", Meteor.user()._id, selector,
        function(e, r){
            //only make the call once the thread has been added
            if(!e){

              var p = Presets.findOne({type: "words", name: "df"}).options;
              msgStream.emit('message', {type: 'screenChange', 'value' : 'words', thread: cliThread});
              msgStream.emit('message', {type: 'wordsReset', 'value': p, thread: cliThread});
              println(r);

            }else{
              println(e.reason);
            }
            newCursor();
        }
      );
    }else{

      var p = Presets.findOne({type: "words", name: "df"}).options;
      msgStream.emit('message', {type: 'screenChange', 'value' : 'words', thread: cliThread});
      msgStream.emit('message', {type: 'wordsReset', 'value': options, thread: cliThread});
      callback();
    }

}

CLMR_CMDS["_numbers"] = function(args, callback){

  cli_mode = "numbers";
  cliThread = generateTempId(10);  //this will need to change in a minute to keep last thread

  var selector = parseFilters(args);
  selector.mode = cli_mode;
  if(selector){
    selector.thread = cliThread;

    Meteor.call("addThreadToPlayers", Meteor.user()._id, selector,
      function(e, r){
  //only make the call once the thread has been added
        if(!e){

          var p = Presets.findOne({type: "numbers", name: "df"}).options;
          msgStream.emit('message', {type: 'screenChange', 'value' : 'numbers', thread: cliThread});
          msgStream.emit('message', {type: 'numbersReset', 'value': p, thread: cliThread});
          println(r);

        }else{
          println(e.reason);
        }
        newCursor();
      }
    );
  }else{

    var p = Presets.findOne({type: "numbers", name: "df"}).options;

    msgStream.emit('message', {type: 'screenChange', 'value' : 'numbers', thread: cliThread});
    msgStream.emit('message', {type: 'numbersReset', 'value': p, thread: cliThread});
    callback();
  }


}

CLMR_CMDS["_group"] = function(args, callback){
    
    var name;
    if(args[0].substring(0,1) != "-"){
      name = args[0];
      args.splice(0,1);
    }

    if(args[0] == "-d"){

      var s_args = {};
      s_args.orig = args[1];
      s_args.numGps = parseInt(args[2]);
      Meteor.call("createSubGroups", Meteor.user()._id, s_args, cmdReturn);

    }else if(args[0] == "-r"){
      if(typeof(args[1]) == "undefined"){
        Meteor.call("removeGroups", Meteor.user()._id, cmdReturn);
      }else{
        Meteor.call("removeGroups", Meteor.user()._id, args[1], cmdReturn);
      }
    }else{

      var selector = parseFilters(args);
      if(typeof(name) != "undefined"){
        selector.group = name;
      }

      if(selector && selector.group){
        Meteor.call("createGroup", Meteor.user()._id, selector, cmdReturn);
      }else{
        callback();
      }
    }


}


/*-----------------------------------------------CHAT-------------------------------------------*/

CHAT_CMDS["_q"] = function(args, callback){ //need to think about what these commands can usefully do
    cli_mode = "clmr";
    Meteor.call("killThread", Meteor.user()._id, cliThread);
    callback();
}

CHAT_CMDS["_c"] = function(args, callback){
    msgStream.emit('message', {type: 'chatClear', 'value':  "", thread: cliThread});
    callback();
}

/*-----------------------------------WORDS-----------------------------------------*/


WORDS_CMDS["_q"] = function(args, callback){
    cli_mode = "clmr";
    Meteor.call("killThread", Meteor.user()._id, cliThread); 
    callback();
}

WORDS_CMDS["_i"] = function(args, callback){
    //instant change
    var options = parseWordsOptions(args);
    msgStream.emit('message', {type: 'wordsChange', 'value': options, thread: cliThread});
    callback();
}

WORDS_CMDS["_r"] = function(args, callback){
    //ramp change
    //change all players simultaneously over time
    callback();
}

WORDS_CMDS["_d"] = function(args, callback){
    //ramp change
    //change all players after a delay
    callback();
}

function parseWordsOptions(args){

  var options = {};

  if(args.length == 0){ //default to previous options
    for(var i in wordsPresets.cr){
      options[i] = wordsPresets.cr[i];
    }
    return options;
  }

  var i = args.indexOf("-p");
  
  if(i > -1){
      args.splice(i,1);      
      for(var x in wordsPresets[args[i]]){
        options[x] = wordsPresets[args[i]][x];
      }
      args.splice(i,1);
  }

  var params = Object.keys(wordsPresets.df);

  for(var x = 0; x < params.length; x++){
      i = args.indexOf("-" + params[x]);
      if(i > -1){
        args.splice(i,1); 
        if(args[i].substring(0,1) == "["){
          //repackage as an array
          args[i] = args[i].substring(1, args[i].length -1);
          options[params[x]] = args[i].split(",");
          console.log(options[params[x]]);

        }else if(args[i].substring(0,1) == "("){
          //repackage as an object
          args[i] = args[i].substring(1, args[i].length -1);
          var ar = args[i].split(",");
          options[params[x]] = {min: parseFloat(ar[0]), max: parseFloat(ar[1])};


        }else{
          options[params[x]] = isNumber(args[i]) ? parseFloat(args[i]) : args[i];
        }
        
        args.splice(i,1); 
      }
  }

  return options;
}

/*----------------------------------NUMBERS--------------------------------------*/

NUMBERS_CMDS["_q"] = function(args, callback){
    cli_mode = "clmr";
    Meteor.call("killThread", Meteor.user()._id, cliThread); 
    callback();
}

NUMBERS_CMDS["_i"] = function(args, callback){
    //instant change
    var options = parseNumbersOptions(args);
    msgStream.emit('message', {type: 'numbersChange', 'value': options, thread: cliThread});
    callback();
}


function parseNumbersOptions(args){

  //this could be changed into an abstract function
  var options = {}; 

  if(args.length == 0){ //default to previous options
    for(var i in wordsPresets.cr){
      options[i] = wordsPresets.cr[i];
    }
    return options;
  }

  var i = args.indexOf("-p");
  
  if(i > -1){
      args.splice(i,1);      
      for(var x in wordsPresets[args[i]]){
        options[x] = wordsPresets[args[i]][x];
      }
      args.splice(i,1);
  }

  var params = Object.keys(numbersPresets.df);

  for(var x = 0; x < params.length; x++){
      i = args.indexOf("-" + params[x]);
      if(i > -1){
        args.splice(i,1); 
        if(args[i].substring(0,1) == "["){
          //repackage as an array
          args[i] = args[i].substring(1, args[i].length -1);
          options[params[x]] = args[i].split(",");
          console.log(options[params[x]]);

        }else if(args[i].substring(0,1) == "("){
          //repackage as an object
          args[i] = args[i].substring(1, args[i].length -1);
          var ar = args[i].split(",");
          options[params[x]] = {min: parseFloat(ar[0]), max: parseFloat(ar[1])};


        }else{
          options[params[x]] = isNumber(args[i]) ? parseFloat(args[i]) : args[i];
        }
        
        args.splice(i,1); 
      }
  }

  return options;
}




function parseFilters(args){

  var selector = {};

  for(var i = 0; i < args.length; ){
    if(args[i] == "-f" || args[i] == "-n"){
      
      if(typeof(selector.filters) == "undefined")selector.filters = [];

      (function(){
        var filter = {};
        filter.not = args[i] == "-n";
        args.splice(i,1);

        switch(args[i]){

          case "words": //FIXME: this could be done more concisely
            filter.mode = "words";
          break;
          case "numbers":
            filter.mode = "numbers";
          break;
          case "onOff":
            filter.mode = "onOff";
          break;
          case "chat":
            filter.mode = "chat";
          break;
          case "hasOn":
            filter.mode = "hasOn";
          break;
          case "hasOff":
            filter.mode = "hasOff";
          break;

          default:
            if(!isNaN(args[i])){
              selector.numPlayers = parseInt(args[i]);
            }else if(voices.indexOf(args[i]) > -1){
              filter.mode = "voice";
              filter.voice = args[i];
            }else if(UserGroups.findOne({name: args[i]})){
              filter.mode = "group";
              filter.group = args[i];
            }

        }

        args.splice(i, 1);
        selector.filters.push(filter);

      })();

    }else if(args[i] == "-g"){
      
      args.splice(i,1);
      selector.group = args[i];

    }else if(UserGroups.findOne({name: args[i]})){

      if(typeof(selector.filters) == "undefined")selector.filters = [];
      var filter = {mode: "group", group: args[i]};
      selector.filters.push(filter);
      args.splice(i, 1);

    }else{
      i++;
    }
  }

  if(typeof(selector.filters) == "undefined")selector = false; //there are no selectors

  return selector;
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



