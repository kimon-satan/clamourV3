
var CLMR_CMDS = {}

var cli_mode = "clmr";
var cursor_prefix;
var sus_mode;
var sus_list;
var sus_idx;

var comIdx = 0;
var prevComms = [];
var clis = [];

var currentOptions = {};


var pwtOptions = {};
var gpnOptions = {};


Session.set("CLIS", []);

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

  Meteor.subscribe("UserData", Meteor.user()._id);
  Meteor.subscribe("AllPlayers", Meteor.user()._id);
  Meteor.subscribe("UserGroups", Meteor.user()._id);
  Meteor.subscribe("Presets",function(){

    currentOptions["numbers"] = Presets.findOne({type: "numbers", name: "df"}).options;
    currentOptions["words"] = Presets.findOne({type: "words", name: "df"}).options;
    currentOptions["onoff"] = Presets.findOne({type: "onoff", name: "df"}).options;

  });

  Meteor.subscribe("Threads");

  var tcli = new CLI(0, "clmr");

  clis = Session.get("CLIS");
  clis.push(tcli);
  var idxs = [];
  for(var  i in clis){
    idxs.push(clis[i].idx);
  }

  Session.set("CLI_IDXS", idxs);

}

Template.su.cli_idxs = function(){return Session.get("CLI_IDXS");}

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

//Template.su_playerTable.getSelected = function(p){if(p.activeThreads.indexOf(cli.thread) > -1)return "selected"}
UI.registerHelper('checkCurrentMode', function(m){return (Session.get("currentMode") == m)});

Template.su_playerTable.selectedPlayers = function(){
  return UserData.find({}).fetch();
}



Template.su_threads.threads = function(){
  return Threads.find({}).fetch();
}


/*-----------------------------------------------CLI ----------------------------------------*/

function CLI(idx, mode, thread){

  this.idx = idx;
  this.cli_mode = mode;
  this.sus_mode;
  this.sus_list;
  this.sus_idx;
  this.com_idx;
  this.thread = thread;
  this.temp_thread;
  this.cursor_prefix;



  this.newCursor = function(isNewLine){

    this.cursor_prefix = this.cli_mode;
    if(typeof(this.thread )!= "undefined" && this.thread.length > 0)this.cursor_prefix += "_" + this.thread;
    this.cursor_prefix += ">"
    if(typeof(isNewLine) == "undefined" || isNewLine){
      console.log(this);
      this.println(this.cursor_prefix);

    }else{
      var id_str = "#cmdText_" + this.idx;
      $(id_str).val(this.cursor_prefix);
    }

    this.com_idx = prevComms.length;

  } 

  this.cmdReturn = function(error, result){

    if(error){
      this.println(error.reason);
    }else if(result){
      this.println(result)
    }

    this.newCursor();
  }

  this.println = function(str){
    var id_str ='#cmdText_' + this.idx;
    $(id_str).val($(id_str).val() + "\n"+ str);   
  }

  this.replaceln = function(str){
    var id_str ='#cmdText' + "_" + this.idx;
    var t = $(id_str).val();
    t = t.substring(0,t.lastIndexOf("\n"));
    t = t + "\n" + str;
    $(id_str).val(t);
  }

  this.keydown = function(e){

    var id_str ='#cmdText' + "_" + this.idx;

    if(this.sus_mode == "thread" || e.keyCode == 38 || e.keyCode == 40){
      return false;
    }

    var str = $(id_str).val();    
    var cmds = str.split(this.cursor_prefix);
    var cmd = cmds[cmds.length - 1];

    if(e.keyCode == 8)
    {
      return (cmd.length > 0);
    }else if(e.keyCode == 13){
      return false;
    }else if(e.keyCode == 75 && e.metaKey){
      $(id_str).val("");
      this.newCursor(false);
    }

  }

  this.keyup  = function(e){

    var id_str ='#cmdText' + "_" + this.idx;

    if(this.sus_mode == "thread"){ 

      return this.handleSus(e);

    }else if(e.keyCode == 40){

      if(prevComms.length > 0){
        this.com_idx = Math.min(this.com_idx + 1, prevComms.length - 1);
        this.replaceln(this.cursor_prefix + prevComms[this.com_idx]);
      }
      return false;
    }
    else if(e.keyCode == 38){

      if(prevComms.length > 0){
        this.com_idx = Math.max(0, this.com_idx - 1);
        replaceln(this.cursor_prefix + prevComms[this.com_idx]);
      }
      return false;
    }

    var str = $(id_str).val();    
    var cmds = str.split(this.cursor_prefix); //
    var cmd = cmds[cmds.length - 1];

    if(this.cli_mode == "chat" && cmd.substring(0,1) != "_"){
      this.handleChatKeys(e, cmd);
    }
    else if(e.keyCode == 13)
    {
      if(prevComms.indexOf(cmd) == -1)prevComms.push(cmd);
      cmd.replace(/\r?\n|\r/,"");
      evaluateCommand(cmd, this);
    }

  }

  this.handleSus = function(e){

    if(e.keyCode == 38){
      this.sus_idx = Math.min(this.sus_idx + 1, this.sus_list.length -1);
      this.replaceln(this.sus_list[this.sus_idx]);

    }else if(e.keyCode == 40){

      this.sus_idx = Math.max(this.sus_idx - 1, 0);
      this.replaceln(this.sus_list[this.sus_idx]);

    }else if(e.keyCode == 13){
      this.thread = this.sus_list[this.sus_idx];
      this.newCursor();
      this.sus_mode = undefined;
    }
    return false;

  }

  this.handleChatKeys = function(e, cmd){

    if(e.keyCode == 13){
      this.newCursor();
      msgStream.emit('message', { type: 'chatNewLine', value:  "", thread: this.thread});
    }else{
      msgStream.emit('message', { type: 'chatUpdate', value:  cmd, thread: this.thread});
    }

  }



}


Template.su_cmd.created = function(){

  var ctxt = this;

  Meteor.defer(function(){

      var id_str = ctxt.$('.cmdText')[0].id;
      var id = parseInt(id_str.substring(id_str.lastIndexOf("_") + 1));
      clis[id].newCursor(false);

  });
 
}


Template.su_cmd.events({


  'keydown .cmdText':function(e)
  {
    
    //will need to get id in a bit
    return clis[0].keydown(e);
  },

  'keyup .cmdText':function(e){

     return clis[0].keyup(e);
  }



});



evaluateCommand = function(cmd,  cli){

  var result_str;
  var args;

  //get rid of any unnecessary spaces
  cmd = cmd.replace(/,\s|\s,/g, ",");
  
  cmd = cmd.replace(/\[\s/g, "[");
  cmd = cmd.replace(/\s\]/g, "]");
  cmd = cmd.replace(/\(\s/g, "(");
  cmd = cmd.replace(/\s\)/g, ")");


  args = cmd.split(" ");
  cmd = args[0];
  args = args.slice(1);

  if(typeof(CLMR_CMDS[cmd]) != 'undefined'){
    CLMR_CMDS[cmd](args,  cli);
  }else{
    cli.println("command not found");
    cli.newCursor();
  }

}


CLMR_CMDS["_chat"] = function(args,  cli){

    cli.cli_mode = "chat";

    permThread(cli.cli_mode, args, 
    function(options, th){
      msgStream.emit('message', {type: 'screenChange', 'value' : 'chat', thread: th});
      msgStream.emit('message', {type: 'chatClear', 'value':  "", thread: th});
    }, cli);

}

CLMR_CMDS["_words"] = function(args,  cli){

  cli.cli_mode = "words";

  permThread(cli.cli_mode, args, 
  function(options, th){
    msgStream.emit('message', {type: 'wordsChange', 'value': options, thread: th});
    msgStream.emit('message', {type: 'screenChange', 'value' : 'words', thread: th});
  }, cli);

}

CLMR_CMDS["_numbers"] = function(args,  cli){

  cli.cli_mode = "numbers";

  permThread(cli.cli_mode, args, 
  function(options, th){
      msgStream.emit('message', {type: 'numbersChange', 'value': options, thread: th});
      msgStream.emit('message', {type: 'screenChange', 'value' : 'numbers', thread: th});
  }, cli);


}

CLMR_CMDS["_onoff"] = function(args,  cli){

  cli.cli_mode = "onoff";

  permThread(cli.cli_mode, args, 
  function(options, th){
      msgStream.emit('message', {type: 'onoffChange', 'value': options, thread: th});
      msgStream.emit('message', {type: 'screenChange', 'value' : 'onOff', thread: th});
  }, cli);
  
}



CLMR_CMDS["_addon"] = function(args,  cli){

  if(cli.cli_mode != "onoff"){
    cli.println("this is an onoff funtion only");
    cli.newCursor();
  }else{

    //will actually need filters and an a temporary thread
      tempThread("_addon", args,
      function(options, th){
        msgStream.emit('message', {type: 'addOn', 'value': options, thread: th});
      }, cli);

  }

}


CLMR_CMDS["_addoff"] = function(args, cli){

  if(cli.cli_mode != "onoff"){
    cli.println("this is an onoff funtion only");
    cli.newCursor();
  }else{
    //will actually need filters and an a temporary thread
      tempThread("_addon", args,
      function(options, th){
        msgStream.emit('message', {type: 'addOff', 'value': options, thread: th});
      }, cli);

  }


}

CLMR_CMDS["_group"] = function(args,  cli){
    
    var name;
    if(args[0].substring(0,1) != "-"){
      name = args[0];
      args.splice(0,1);
    }

    if(args[0] == "-d"){

      var s_args = {};
      s_args.orig = args[1];
      s_args.numGps = parseInt(args[2]);
      Meteor.call("createSubGroups", Meteor.user()._id, s_args, cli.cmdReturn);

    }else if(args[0] == "-r"){
      if(typeof(args[1]) == "undefined"){
        Meteor.call("removeGroups", Meteor.user()._id, cli.cmdReturn);
      }else{
        Meteor.call("removeGroups", Meteor.user()._id, args[1], cli.cmdReturn);
      }
    }else{

      var selector = parseFilters(args);
      if(typeof(name) != "undefined"){
        selector.group = name;
      }

      if(selector && selector.group){
        Meteor.call("createGroup", Meteor.user()._id, selector, cli.cmdReturn);
      }else{
        cli.newCursor();
      }
    }


}

CLMR_CMDS["_remove"] = function(args,  cli){

  var i = args.indexOf("-p");
  var p;
  var t;

  if(i > -1){
    args.splice(i,1);
    p = args[i];
    args.splice(i,1);
  }

  i = args.indexOf("-t");
  if(i > -1){
     args.splice(i,1);
     t = args[i];
     args.splice(i,1);
  }

  if(typeof(p) != "undefined" && typeof(t) != "undefined"){
    Meteor.call("removePreset", Meteor.user()._id, {type: t, name: p}, cli.cmdReturn);
  }else{
    cli.newCursor();
  }


}

CLMR_CMDS["_lcmds"] = function(args,  cli){

  for(var i in CLMR_CMDS){
    cli.println(i);
  }

  cli.newCursor();
}

CLMR_CMDS["_lpresets"] = function(args,  cli){

  var i = args.indexOf("-t");
  var t;

  if(i > -1){
    args.splice(i,1);
    t = args[i];
    args.splice(i,1);
  }else{
    t = cli.cli_mode;
  }

  Presets.find({type: t}).forEach(function(r){

    cli.println(r.name);
  });

  cli.newCursor();

}

CLMR_CMDS["_loptions"] = function(args,  cli){

  var i = args.indexOf("-t");
  var t;

  if(i > -1){
    args.splice(i,1);
    t = args[i];
    args.splice(i,1);
  }else{
    t = cli.cli_mode;
  }

  for(var o in currentOptions[t]){
    println(o + ": " + currentOptions[t][o]);
  }


  cli.newCursor();

}

CLMR_CMDS["_q"] = function(args,  cli){ //need to think about what these commands can usefully do
    cli.cli_mode = "clmr";
    cli.newCursor();
}

CLMR_CMDS["_kill"] = function(args,  cli){ 

  Meteor.call("killThread", Meteor.user()._id, cli.thread);
  cli.thread = "";
  cli.newCursor();

}

CLMR_CMDS["_killall"] = function(args,  cli){

  cli.thread = "";
  Meteor.call("killThreads", Meteor.user()._id);
  cli.newCursor();

}

CLMR_CMDS["_thread"] = function(args,  cli){

  var r = Threads.find({},{sort: {thread: 1}}).fetch();
  cli.sus_list = [];
  for(var i in r){
    cli.sus_list.push(r[i].thread);
  }

  if(cli.sus_list.length > 0){
    cli.sus_mode = "thread";
    cli.sus_idx = cli.sus_list.indexOf(cli.thread);
    cli.println(cli.sus_list[cli.sus_idx]);
  }else{
    cli.println("there are no threads ...");
    cli.newCursor();
  }
}

/*-----------------------------------------------MORE SPECIFIC-------------------------------------------*/



CLMR_CMDS["_c"] = function(args,  cli){

    if(cli.cli_mode == "chat"){
      msgStream.emit('message', {type: 'chatClear', 'value':  "", thread: cli.thread});
    }

    cli.newCursor();
}

CLMR_CMDS["_i"] = function(args,  cli){
    //instant change
    if(cli.cli_mode == "words" || cli.cli_mode == "numbers"){
      var options = parseOptions(args , cli.cli_mode, callback);
      msgStream.emit('message', {type: cli.cli_mode + 'Change', 'value': options, thread: cli.thread});
    }
    
}

/*-----------------------------------TO DO-----------------------------------------*/



/*
CLMR_CMDS["_r"] = function(args, callback){
    //ramp change,
    //change all players simultaneously over time
    cli.newCursor();
}

CLMR_CMDS["_d"] = function(args, callback){
    //ramp change
    //change all players after a delay
    cli.newCursor();
}

*/




function permThread(cmd, args, send,  cli){

  var selector = parseFilters(args);
  if(selector)cli.thread = generateTempId(5); //create a new thread as it's a new selection
  var options = parseOptions(args, cmd);

  if(selector){
    selector.thread = cli.thread;
    selector.mode = cli.cli_mode;

    Meteor.call("addThreadToPlayers", Meteor.user()._id, selector,
      function(e, r){
  //only make the call once the thread has been added
        if(!e){

          send(options, cli.thread);
          cli.println(r);

        }else{
          cli.println(e.reason);
        }
        cli.newCursor();
      }
    );
  }else{

    send(options, cli.thread);

    //TO DO add an extra option for reset here ... perhaps just the same as instant ?? 
    cli.newCursor();
  }
}


function tempThread(cmd, args, send,  cli){


  Meteor.call("killThread" ,Meteor.user()._id, cli.temp_thread, function(e,r){

      cli.temp_thread = "";

      var selector = parseFilters(args);
      cli.temp_thread = generateTempId(5); //create a new thread as it's a new selection
      var options = parseOptions(args, cli.cli_mode);

      if(selector){
        selector.thread = cli.temp_thread;
        selector.mode = "cmd";

        Meteor.call("addThreadToPlayers", Meteor.user()._id, selector,
          function(e, r){
      //only make the call once the thread has been added
            if(!e){

              send(options, cli.temp_thread);
              cli.println(r);

            }else{
              cli.println(e.reason);
            }
            cli.newCursor();
          }
        );
      }else{
        send(options, cli.thread); //send on the regular thread
        cli.newCursor();
      }

  });

 

}



function parseOptions(args, type, callback){

  var options = {}; 

  if(args.length == 0){ //default to previous options
    for(var i in currentOptions[type]){
      options[i] = currentOptions[type][i];
    }
    return options;
  }

  var i = args.indexOf("-p");
  
  while(i > -1){
      args.splice(i,1);      
      var preset = Presets.findOne({type: type, name: args[i]}).options;
      if(preset){
        for(var x in preset){
          options[x] = preset[x];
        }
      }
      args.splice(i,1);
      i = args.indexOf("-p");
  }



  var params = Object.keys(currentOptions[type]);

  for(var x = 0; x < params.length; x++){
      i = args.indexOf("-" + params[x]);
      if(i > -1){
        args.splice(i,1); 
        if(args[i].substring(0,1) == "["){
          //repackage as an array
          args[i] = args[i].substring(1, args[i].length -1);
          options[params[x]] = args[i].split(",");

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

  i = args.indexOf("-s");

  if(i > -1){
    args.splice(i,1);
    Meteor.call("createPreset", Meteor.user()._id, {type: type, name: args[i], options: options},cmdReturn);
    args.splice(i,1);
    
  }else{
    if(typeof(callback) != "undefined")cli.newCursor();
  }
  
  for(var i in options){
    currentOptions[type][i] = options[i]; //copy the changes to current options
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
          case "cthread":
            filter.mode = "thread";
            filter.thread = cli.thread;
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





