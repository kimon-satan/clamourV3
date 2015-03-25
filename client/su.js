
var CLMR_CMDS = {}


var gPrevComms = [];
var gClis = {};
var gCli_idx = 0; 

var gCurrentOptions = {};
var gProcs = {};


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

    gCurrentOptions["numbers"] = Presets.findOne({type: "numbers", name: "df"}).options;
    gCurrentOptions["words"] = Presets.findOne({type: "words", name: "df"}).options;
    gCurrentOptions["onoff"] = Presets.findOne({type: "onoff", name: "df"}).options;

  });

  Meteor.subscribe("Threads");

  var tcli = new CLI(gCli_idx, "clmr");

  gClis[gCli_idx] = tcli;
  var idxs = [];
  for(var  i in gClis){
    idxs.push(gClis[i].idx);
  }

  Session.set("cli_idxs", idxs);

}

Template.su.cli_idxs = function(){return Session.get("cli_idxs");}


UI.registerHelper('checkCurrentMode', function(m){return (Session.get("currentMode") == m)});


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
  this.proc;



  this.newCursor = function(isNewLine){

    this.cursor_prefix = this.cli_mode;
    var id_str = "#cmdText_" + this.idx;
    if(typeof(this.thread )!= "undefined" && this.thread.length > 0)this.cursor_prefix += "_" + this.thread;
    this.cursor_prefix += ">"
    if(typeof(isNewLine) == "undefined" || isNewLine){
      this.println(this.cursor_prefix);

    }else{

      $(id_str).val(this.cursor_prefix);
    }

    this.com_idx = gPrevComms.length;

    var psconsole = $(id_str);
    psconsole.scrollTop(psconsole.prop('scrollHeight'));

  } 

  this.cmdReturn = function(error, result){

    if(error){
      this.println(error.reason);
    }else if(result){
      this.println(result);
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

    if(typeof(this.proc) != "undefined" && e.keyCode == 75 && e.metaKey){
      clearInterval(this.proc.loop);
      this.newCursor();
      this.proc = undefined;
      return false;
    }

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
    }else if(e.keyCode == 65 && e.metaKey){
      newCli();
      return false;
    }


  }

  this.keyup  = function(e){



    var id_str ='#cmdText' + "_" + this.idx;

    if(this.sus_mode == "thread"){ 

      return this.handleSus(e);

    }else if(e.keyCode == 40){

      if(gPrevComms.length > 0){
        this.com_idx = Math.min(this.com_idx + 1, gPrevComms.length - 1);
        this.replaceln(this.cursor_prefix + gPrevComms[this.com_idx]);
      }
      return false;
    }
    else if(e.keyCode == 38){

      if(gPrevComms.length > 0){
        this.com_idx = Math.max(0, this.com_idx - 1);
        this.replaceln(this.cursor_prefix + gPrevComms[this.com_idx]);
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
      if(gPrevComms.indexOf(cmd) == -1)gPrevComms.push(cmd);
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
      gClis[id].newCursor(false);

  });
 
}


Template.su_cmd.events({


  'keydown .cmdText':function(e)
  {
    var id_str = e.currentTarget.id;
    var id = parseInt(id_str.substring(id_str.lastIndexOf("_") + 1));

    return gClis[id].keydown(e);
  },

  'keyup .cmdText':function(e){
     var id_str = e.currentTarget.id;
     var id = parseInt(id_str.substring(id_str.lastIndexOf("_") + 1));
     return gClis[id].keyup(e);
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

CLMR_CMDS["_logoutPlayers"] = function(args, cli){

  //ideally should do a confirmation here
  Meteor.call("resetPlayers", Meteor.user()._id);
  cli.thread = "";
  Meteor.call("killThreads", Meteor.user()._id);
  cli.newCursor();
}

CLMR_CMDS["_pedalStart"] = function(args, cli){
  Meteor.call("startPedal", Meteor.user()._id);
  cli.newCursor();
}

CLMR_CMDS["_killSound"]  = function(args, cli){
  Meteor.call("killSynths", Meteor.user()._id);
  cli.newCursor();
}

CLMR_CMDS["_killProcs"] = function(args, cli){
  for (var i in gProcs){
    clearInterval(gProcs[i].loop);
  }

  gProcs = [];

  for(var i in gClis){
    if(typeof(gClis[i].proc) != "undefined"){
      gClis[i].proc = undefined;
      gClis[i].newCursor();
    }
  }

  cli.newCursor();
}

CLMR_CMDS["_new"] = function(args, cli){

  newCli();

  cli.newCursor();

}

function newCli(){

  gCli_idx += 1;
  var tcli = new CLI(gCli_idx, "clmr");

  gClis[gCli_idx] = tcli;

  var idxs = [];

  for(var  i in gClis){
    idxs.push(gClis[i].idx);
  }

  Session.set("cli_idxs", idxs);

}

CLMR_CMDS["_exit"] = function(args, cli){

  if(gClis.length < 2)return;

  delete gClis[cli.idx];
  var idxs = [];

  for(var  i in gClis){
    idxs.push(gClis[i].idx);
  }

  Session.set("cli_idxs", idxs);
}

CLMR_CMDS["_wait"] = function(args,  cli){

    cli.cli_mode = "wait";

    permThread(cli.cli_mode, args, 
    function(options, th){
      msgStream.emit('message', {type: 'screenChange', 'value' : {mode: cli.cli_mode}, thread: th});
    }, cli);

}



CLMR_CMDS["_chat"] = function(args,  cli){

    cli.cli_mode = "chat";

    permThread(cli.cli_mode, args, 
    function(options, th){
      msgStream.emit('message', {type: 'screenChange', 'value' : {mode: cli.cli_mode}, thread: th});
      msgStream.emit('message', {type: 'chatClear', 'value':  "", thread: th});
    }, cli);

}

CLMR_CMDS["_words"] = function(args,  cli){

  cli.cli_mode = "words";

  var cb = function(options, th){
            var pkg = {options: options, mode: cli.cli_mode};
            msgStream.emit('message', {type: 'screenChange', 'value' : pkg, thread: th});
          };

  if(!addStep(args, cb, cli)){
    permThread(cli.cli_mode, args, cb, cli);
  }

}

CLMR_CMDS["_blank"] = function(args, cli){

  cli.cli_mode = "blank";

  var cb = function(options, th){
            var pkg = {options: options, mode: cli.cli_mode};
            msgStream.emit('message', {type: 'screenChange', 'value' : pkg, thread: th});
          };

  if(!addStep(args, cb, cli)){
    permThread(cli.cli_mode, args, cb, cli);
  }

}

CLMR_CMDS["_numbers"] = function(args,  cli){

  cli.cli_mode = "numbers";

  var cb = function(options, th){
      var pkg = {options: options, mode: cli.cli_mode};
      msgStream.emit('message', {type: 'screenChange', 'value' : pkg, thread: th});
  };

  if(!addStep(args, cb, cli)){
    permThread(cli.cli_mode, args, cb, cli);
  }


}

CLMR_CMDS["_onoff"] = function(args,  cli){

  cli.cli_mode = "onoff";

  var cb =   function(options, th){
      var pkg = {options: options, mode: cli.cli_mode};
      msgStream.emit('message', {type: 'screenChange', 'value' : pkg, thread: th});
  }

  if(!addStep(args, cb, cli)){
    permThread(cli.cli_mode, args, cb, cli);
  }
  
}



CLMR_CMDS["_addon"] = function(args,  cli){

  if(cli.cli_mode != "onoff"){
    cli.println("this is an onoff funtion only");
    cli.newCursor();
  }else{


    var cb =  function(options, th){msgStream.emit('message', {type: 'addOn', 'value': options, thread: th});}

    if(!addStep(args, cb, cli, true))tempThread("_addon", args,cb, cli);

  }

}


CLMR_CMDS["_addoff"] = function(args, cli){

  if(cli.cli_mode != "onoff"){
    cli.println("this is an onoff funtion only");
    cli.newCursor();
  }else{
    //will actually need filters and an a temporary thread
    var cb = function(options, th){msgStream.emit('message', {type: 'addOff', 'value': options, thread: th});}

    if(!addStep(args, cb, cli, true))tempThread("_addoff", args, cb, cli);

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
      Meteor.call("createSubGroups", Meteor.user()._id, s_args, function(e,r){cli.cmdReturn(e,r)});

    }else if(args[0] == "-r"){
      if(typeof(args[1]) == "undefined"){
        Meteor.call("removeGroups", Meteor.user()._id, function(e,r){cli.cmdReturn(e,r)});
      }else{
        Meteor.call("removeGroups", Meteor.user()._id, args[1], function(e,r){cli.cmdReturn(e,r)});
      }
    }else{

      var selector = parseFilters(args);
      if(typeof(name) != "undefined"){
        selector.group = name;
      }

      if(selector && selector.group){
        Meteor.call("createGroup", Meteor.user()._id, selector, function(e,r){cli.cmdReturn(e,r)});
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
    Meteor.call("removePreset", Meteor.user()._id, {type: t, name: p}, function(e,r){cli.cmdReturn(e,r)});
  }else{
    cli.newCursor();
  }


}

CLMR_CMDS["_lplayers"] = function(args, cli){

  //add filters and info args later if desired
  var selector = parseFilters(args);
  if(!selector)selector = {};
  var so = generateSearchObj(selector);

  UserData.find(so).forEach(function(e){
    var str = e._id.substring(0,5) + ",  view: " + e.view + ",  on: " + e.on + ",  off: "  + e.off + ",  voice: " + e.voice;
    cli.println(str);

  });

  cli.newCursor();
}

CLMR_CMDS["_iplayers"] =  function(args, cli){

  var proc = {};
  var selector = parseFilters(args);
  proc.id = generateTempId(8);
  if(!selector)selector = {};
  proc.so = generateSearchObj(selector);
  proc.loop = setInterval(function(){

    $('#cmdText_' + cli.idx).val("");

    UserData.find(proc.so).forEach(function(e){
      var str = e._id.substring(0,5) + ",  view: " + e.view + ",  on: " + e.on + ",  off: "  + e.off + ",  voice: " + e.voice;
      cli.println(str);

    });

  }, 500);

  gProcs[proc.id] = proc;
  cli.proc = proc;


}



CLMR_CMDS["_lthreads"] = function(args, cli){
  
  Threads.find({}).forEach(function(e){

    var str = e.thread + " :: " + e.population;
    if(e.thread == cli.thread)str += " *";
    if(e.thread == cli.temp_thread)str += " -";
    cli.println(str);

  });

  cli.newCursor();

}


CLMR_CMDS["_ithreads"] = function(args, cli){

  var proc = {};

  proc.id = generateTempId(8);
  proc.loop = setInterval(function(){

    $('#cmdText_' + cli.idx).val("");

    Threads.find({}).forEach(function(e){

      var str = e.thread + " :: " + e.population;
      if(e.thread == cli.thread)str += " *";
      if(e.thread == cli.temp_thread)str += " -";
      cli.println(str);

    });

  }, 500);

  gProcs[proc.id] = proc;
  cli.proc = proc;

}

CLMR_CMDS["_lgroups"] = function(args, cli){

  UserGroups.find({}).forEach(function(e){

    var str = e.name + " :: " + e.members.length;
    cli.println(str);

  });

  cli.newCursor();


}

CLMR_CMDS["_lvoices"] = function(args, cli){

  for(var i in voices){
    cli.println(voices[i]);
  }
  cli.newCursor();
}

CLMR_CMDS["_lsynths"] = function(args, cli){

  for(var i in synths){
    cli.println(synths[i]);
  }
  cli.newCursor();
}

CLMR_CMDS["_lrules"] = function(args,cli){

  for(var i in rules){
    cli.println(rules[i]);
  }
  cli.newCursor();
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

  i = args.indexOf("-p");
  var name;

  if(i > -1){
    args.splice(i,1);
    name = args[i]
    args.splice(i,1);
  }

  var preset = Presets.findOne({name: name, type: t});

  if(preset){
    for(item in preset.options){
      var tp = typeof(preset.options[item]);
      if(tp == "number" || tp == "string" || tp == "boolean"){
        cli.println(item + ": " + preset.options[item]);
      }else{
        var str = item + ": ";
        for(var o in preset.options[item]){
          str += ", " + preset.options[item][o];
        }
        cli.println(str);
      }
      
    }
  }else{
    for(o in gCurrentOptions[t]){
      cli.println(o + ": " + gCurrentOptions[t][o]);
    }
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

  //maybe an option to add a player to this thread

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

CLMR_CMDS["_i"] = function(args,  cli){ //should be come update as it can deal with all types of changes

  var cb = function(options, th){msgStream.emit('message', {type: cli.cli_mode + 'Change', 'value': options, thread: th});}

  if(!addStep(args, cb, cli, true))tempThread("_i", args, cb, cli);

}




function addStep(args, callback, cli, istemp){

  var i = args.indexOf("-step");

  if(i < 0)return false;
   
  var proc = {};

  args.splice(i,1);
  var totalTime = args[i];
  args.splice(i, 1);

  proc.id = generateTempId(5);
  var selector = parseFilters(args);
  if(!selector){
    selector = {filters: [{thread: cli.thread}]}; 
  }else{
    if(!istemp){
      cli.thread = generateTempId(8);
      selector.thread = cli.thread;
      selector.mode = cli.cli_mode;
      Meteor.call("addThreadToPlayers", Meteor.user()._id, selector);
    }
  }


  
  proc.players = selectPlayers(selector);
  proc.options = parseOptions(args, cli.cli_mode, cli);
  var interval = (totalTime/proc.players.length) * 1000;
  proc.threads = [];

  proc.loop = setInterval(function(){

    if(proc.players.length == 0){
      clearInterval(proc.loop);
      //remove each of the threads
      for(i in proc.threads){
        Meteor.call("killThread", Meteor.user()._id, proc.threads[i]);
      }
      delete gProcs[proc.id];

      cli.proc = undefined;
      cli.newCursor();
      return;

    }

    cli.println(proc.players[0]);
    var t = generateTempId(8);
    proc.threads.push(t);
    var p_args = {uid: proc.players[0], thread: t};
    proc.players.splice(0,1);

    Meteor.call("addThreadToPlayer", Meteor.user()._id, p_args, function(e,r){
      callback(proc.options , r);
    });
    
    var id_str = "#cmdText_" + cli.idx;
    var psconsole = $(id_str);
    psconsole.scrollTop(psconsole.prop('scrollHeight'));




  }, interval);

  gProcs[proc.id] = proc;
  cli.proc = proc;

  return true;

}



function permThread(cmd, args, send,  cli){

  var selector = parseFilters(args);
  if(selector)cli.thread = generateTempId(5); 
  var options = parseOptions(args, cmd, cli);

  if(selector){
    selector.thread = cli.thread;
    selector.mode = cli.cli_mode;

    Meteor.call("addThreadToPlayers", Meteor.user()._id, selector,
      function(e, r){
  //only make the call once the thread has been added,
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
      var options = parseOptions(args, cli.cli_mode, cli);

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



function parseOptions(args, type, cli){

  var options = {}; 

  if(args.length == 0){ 
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


  i = args.indexOf("-time");

  if(i > -1){
    args.splice(i,1);
    options["time"] = parseInt(args[i]);
    args.splice(i,1);
  }



  var params = Object.keys(gCurrentOptions[type]);

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
          if(options[params[x]] == "T")options[params[x]] = true; //handle booleans
          if(options[params[x]] == "F")options[params[x]] = false;
        }
        
        args.splice(i,1); 
      }
  }

  i = args.indexOf("-s");

  if(i > -1){
    args.splice(i,1);
    Meteor.call("createPreset", Meteor.user()._id, {type: type, name: args[i], options: options},function(e,r){cli.cmdReturn(e,r)});
    args.splice(i,1);
    
  }else{
    //cli.newCursor();
  }
  
  for(var i in options){
    gCurrentOptions[type][i] = options[i]; //copy the changes to current options
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
          case "thread":
            filter.mode = "thread";
            filter.thread = cli.thread;
          break;

          default:
            if(!isNaN(args[i])){
              selector.numPlayers = parseInt(args[i]);
            }else if(voices.indexOf(args[i]) > -1){
              filter.mode = "voice";
              filter.voice = args[i];
            }else if(words.indexOf(args[i]) > -1){
              filter.mode = "word";
              filter.word = args[i];
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
      args.splice(i,1);

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





