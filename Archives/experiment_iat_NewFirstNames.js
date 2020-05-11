/// LICENCE -----------------------------------------------------------------------------
//
// Copyright 2018 - Cédric Batailler
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this
// software and associated documentation files (the "Software"), to deal in the Software
// without restriction, including without limitation the rights to use, copy, modify,
// merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to the following
// conditions:
//
// The above copyright notice and this permission notice shall be included in all copies
// or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
// CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
// OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
// OVERVIEW -----------------------------------------------------------------------------
//
// TODO:
// 
// dirty hack to lock scrolling ---------------------------------------------------------
// note that jquery needs to be loaded.
$('body').css({'overflow':'hidden'});
  $(document).bind('scroll',function () { 
       window.scrollTo(0,0); 
  });

// safari & ie exclusion ----------------------------------------------------------------
var is_safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
var is_ie = /*@cc_on!@*/false || !!document.documentMode;

var is_compatible = !(is_safari || is_ie);


if(!is_compatible) {

    var safari_exclusion = {
        type: "html-keyboard-response",
        stimulus:
        "<p>Sorry, this study is not compatible with your browser.</p>" +
        "<p>Please try again with a compatible browser (e.g., Chrome or Firefox).</p>",
        choices: jsPsych.NO_KEYS
    };

    var timeline_safari = [];

    timeline_safari.push(safari_exclusion);
    jsPsych.init({timeline: timeline_safari});

}

// firebase initialization ---------------------------------------------------------------
  var firebase_config = {
    apiKey: "AIzaSyBwDr8n-RNCbBOk1lKIxw7AFgslXGcnQzM",
    databaseURL: "https://aatblack.firebaseio.com/"
  };

  firebase.initializeApp(firebase_config);
  var database = firebase.database();

  // prolific variables
  var prolificID = jsPsych.data.getURLVariable("prolificID");
  if(prolificID == null) {prolificID = "999";}
  var id  = jsPsych.data.getURLVariable("id");
   if(id == null) {id = "999";}

  var training_cond = jsPsych.data.getURLVariable("training_cond");
  var control_cond = jsPsych.data.getURLVariable("control_cond");

  //var session_id  = jsPsych.randomization.randomID();

  // connection status ---------------------------------------------------------------------
  // This section ensure that we don't lose data. Anytime the 
  // client is disconnected, an alert appears onscreen
  var connectedRef = firebase.database().ref(".info/connected");
  var connection   = firebase.database().ref("IAT_Black/" + id + "/")
  var dialog = undefined;
  var first_connection = true;

  connectedRef.on("value", function(snap) {
    if (snap.val() === true) {
      connection
        .push()
        .set({status: "connection",
              timestamp: firebase.database.ServerValue.TIMESTAMP})

      connection
        .push()
        .onDisconnect()
        .set({status: "disconnection",
              timestamp: firebase.database.ServerValue.TIMESTAMP})

    if(!first_connection) {
      dialog.modal('hide');
    }
    first_connection = false;
    } else {
      if(!first_connection) {
      dialog = bootbox.dialog({
          title: 'Connection lost',
          message: '<p><i class="fa fa-spin fa-spinner"></i> Please wait while we try to reconnect.</p>',
          closeButton: false
          });
    }
    }
  });

    // counter variables
  var iat_trial_n      = 1;
  var browser_events_n = 1;

// Variable input -----------------------------------------------------------------------
// Variable used to define experimental condition.
var iat_good    = jsPsych.randomization.sampleWithoutReplacement(["left", "right"], 1)[0];; // either "left" or "right"
var iat_black_1 = jsPsych.randomization.sampleWithoutReplacement(["left", "right"], 1)[0];; // either "left" or "right"

 // cursor helper functions
var hide_cursor = function() {
	document.querySelector('head').insertAdjacentHTML('beforeend', '<style id="cursor-toggle"> html { cursor: none; } </style>');
}
var show_cursor = function() {
	document.querySelector('#cursor-toggle').remove();
}

var hiding_cursor = {
    type: 'call-function',
    func: hide_cursor
}

var showing_cursor = {
    type: 'call-function',
    func: show_cursor
}

// Saving blocks ------------------------------------------------------------------------
// Every function here send the data to keen.io. Because data sent is different according
// to trial type, there are differents function definition.

  // iat trial ----------------------------------------------------------------------------
  var saving_iat_trial = function(){
    database
      .ref("iat_trial/")
      .push()
      .set({id: id,
          prolificID: prolificID,
          iat_good_side: iat_good,
          iat_black_1_side: iat_black_1,
          timestamp: firebase.database.ServerValue.TIMESTAMP,
          iat_trial_data: jsPsych.data.get().last().json()})
  }

  var saving_browser_events = function(completion) {
    database
     .ref("browser_event/")
     .push()
     .set({id: id,
      prolificID: prolificID,
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      iat_good_side: iat_good,
      iat_black_1_side: iat_black_1,
      completion: completion,
      event_data: jsPsych.data.getInteractionData().json()})
  }

  var saving_extra = function() {
    database
     .ref("extra_info/")
     .push()
     .set({id: id,
         prolificID: prolificID,
         timestamp: firebase.database.ServerValue.TIMESTAMP,
         extra_data: jsPsych.data.get().last(8).json(),  //it was 7 before 4: check if it works
        })
  }

// saving blocks ------------------------------------------------------------------------
var save_iat_trial = {
    type: 'call-function',
    func: saving_iat_trial
}

var save_extra = {
    type: 'call-function',
    func: saving_extra
}

// iat sampling function ----------------------------------------------------------------
var sample_n_iat = function(list, n) {
  list = jsPsych.randomization.sampleWithoutReplacement(list, n);
  list = jsPsych.randomization.shuffleNoRepeats(list);

  return(list);
}

// EXPERIMENT ---------------------------------------------------------------------------

// Switching to fullscreen --------------------------------------------------------------
var fullscreen_trial = {
  type: 'fullscreen',
  message:  'To start Task 3, please switch again to full screen </br></br>',
  button_label: 'Switch to fullscreen',
  fullscreen_mode: true
}

// IAT -----------------------------------------------------------------------------------
// IAT variable initialization ----------------------------------------------------------
// Correct responses -----------------------
var good_side      = undefined;
var bad_side     = undefined;
var black_side_1st = undefined;
var white_side_1st  = undefined;
var black_side_2nd = undefined;
var white_side_2nd  = undefined;

// Label -----------------------------------
var block_1_left_label          = undefined;
var block_1_right_label         = undefined;
var block_2_left_label          = undefined;
var block_2_right_label         = undefined;
var block_3_left_label_top      = undefined;
var block_3_right_label_top     = undefined;
var block_3_left_label_bottom   = undefined;
var block_3_right_label_bottom  = undefined;
var block_4_left_label          = undefined;
var block_4_right_label         = undefined;
var block_5_left_label_top      = undefined;
var block_5_right_label_top     = undefined;
var block_5_left_label_bottom   = undefined;
var block_5_right_label_bottom  = undefined;

switch(iat_good) {
  case "left":
        good_side               = "left";
        bad_side              = "right";

        block_2_left_label      = "GOOD";
        block_2_right_label     = "BAD";
        block_3_left_label_top  = "GOOD";
        block_3_right_label_top = "BAD";
        block_5_left_label_top  = "GOOD";
        block_5_right_label_top = "BAD";

    break;

  case "right":
        good_side               = "right";
        bad_side              = "left";

        block_2_left_label      = "BAD";
        block_2_right_label     = "GOOD";
        block_3_left_label_top  = "BAD";
        block_3_right_label_top = "GOOD";
        block_5_left_label_top  = "BAD";
        block_5_right_label_top = "GOOD";

    break;
}

switch(iat_black_1) {
  case "left":
      black_side_1st = "left";
      white_side_1st  = "right";
      black_side_2nd = "right";
      white_side_2nd  = "left";

    block_1_left_label          = "Black people";
    block_1_right_label         = "White people";
    block_3_left_label_bottom   = "Black people";
    block_3_right_label_bottom  = "White people";
    block_4_left_label          = "White people";
    block_4_right_label         = "Black people";
    block_5_left_label_bottom   = "White people";
    block_5_right_label_bottom  = "Black people";

    break;

  case "right":
        black_side_1st = "right";
        white_side_1st  = "left";
        black_side_2nd = "left";
        white_side_2nd  = "right";

    block_1_left_label          = "White people";
    block_1_right_label         = "Black people";
    block_3_left_label_bottom   = "White people";
    block_3_right_label_bottom  = "Black people";
    block_4_left_label          = "Black people";
    block_4_right_label         = "White people";
    block_5_left_label_bottom   = "Black people";
    block_5_right_label_bottom  = "White people";

    break;
}


// To alternate good/bad and black/white trials ---------------------------------------------------------------------
var shuffleIATstims = function (stims) {
    // Alterenate categories blackWhite vs. goodBad
    var n = stims.length / 2;
    var chunkedStims = _.chunk(stims, n);
    var stims1 = jsPsych.randomization.shuffleNoRepeats(chunkedStims[0]);
    var stims2 = jsPsych.randomization.shuffleNoRepeats(chunkedStims[1]);

    var stims12 = stims1.map(function (e, i) { // merge two arrays so that the values alternate
        return [e, stims2[i]];
    });
    var stims21 = stims2.map(function (e, i) {
        return [e, stims1[i]];
    });

    var t = _.sample([stims12, stims21]);
    t = _.flattenDeep(t);

    return t;
};


// iat instructions ---------------------------------------------------------------------

var iat_instructions_1 = {
  type: "html-keyboard-response",
  stimulus:
    "<h1 class ='custom-title'> Task 3: First name categorization task </h1>" +
    "<p class='instructions'>In this task, you will be asked to sort words and first names" +
    " into groups as fast as you can using the keyboard. In the following screen you will be presented" +
    " a list of category labels and the items that belong to each of these categories." +
    "</p>" +
    "<p class='instructions'>As you will see, you will have to sort" +
    " words depending on whether these ones are good vs. bad" +
    " and first names depending on whether these ones are usually associated with Black people vs. White people.</p>" +
    "<h3 class='instructions'>Instructions</h3>" +
    "<ul class='instructions'>" +
      "<li>Keep fingers on the <span class='key'>E</span> and <span class='key'>I</span> keys to enable rapid response.</li>" +
      "<li>Labels at the top will tell you which items go with each key.</li>" +
      "<li>Go as fast as you can.</li>" +
    "</ul>" +
    "<p>&nbsp;</p>" +
    "<p class = 'continue-instructions'>Press <span class='key'>space</span>" +
    " to continue.</p>",
  choices: [32]
};

var iat_instructions_1_1 = {
  type: "html-keyboard-response",
  stimulus:
    "<h1 class ='custom-title'> Task 3: First name categorization task </h1>" +
    "<p class='instructions'><center>Here are the four categories and the items belonging to each category</center></p>" +
    "<table>" +
      "<tr>" +
        "<th width='200px'>Category</th>" +
        "<th align='left'>Item</th>" +
      "</tr>" +
      "<tr>" +
        "<td>GOOD</td>" +
        "<td align='left'>Delightful, Appealing, Lovely, Triumph, Cherish, Magnificent, Adore, Enjoy</td>" +
      "</tr>" +
      "<tr>" +
        "<td>BAD</td>" +
        "<td align='left'>Scorn, Pain, Evil, Hatred, Rotten, Dirty, Ugly, Angry</td>" +
      "</tr>" +
      "<tr>" +
      "<br>"+
        "<td>White people</td>" +
        "<td align='left'>Jake, Connor, Tanner, Wyatt, Cody, Dustin</td>" +
      "</tr>" +
      "<tr>" +
        "<td>Black people</td>" +
        "<td align='left'>DeShawn, DeAndre, Marquis, Darnell, Terrell, Trevon</td>" +
      "</tr>" +
    "</table>" +
    "<br>" +
    "<br>" +
    "<p class = 'continue-instructions'>Press <span class='key'>space</span>" +
    " to continue.</p>",
  choices: [32]
};



// iat block instructions ---------------------------------------------------------------

var iat_instructions_block_1 = {
  type: 'html-keyboard-response',
  stimulus:
  "<div style='position: absolute; top: 18%; left: 20%'> <p>Press " +
    "<span class='key'>E</span> for:<br><span class='iat-category black-white'>" +
    block_1_left_label  +
    "</span></p>" +
    "</div>" +
    "<div style='position: absolute; top: 18%; right: 20%'><p>Press " +
    "<span class='key'>I</span> for:<br><span class='iat-category black-white'>" +
    block_1_right_label +
    "</span></p>" +
  "</div>" +
  "<div class='iat-instructions' style='position: relative; top: 42%, width:80%;'> " +
    "<p class='instructions'>" +
      "In the upcoming task, you will have to put your middle or index fingers on the <span class='key'>E</span> " +
      "and <span class='key'>I</span> keys of your keyboard. Words representing the categories at the top " +
      "will appear one-by-one in the middle of the screen. " +
      "When the item belongs to a category on the left, press the <span class='key'>E</span> key; when the item " +
      "belongs to a category on the right, press the <span class='key'>I</span> key. Items belong to only one category. " +
      "If you make an error, an X will appear – fix the error by hitting the other key." +
    "</p>" +
    "<p class='instructions'>" +
      "This is a timed sorting task. GO AS FAST AS YOU CAN while making as few mistakes as possible. " +
    "</p>" +
  "</div> " +
  "<br>" +
  "<br>" +
  "<p class = 'continue-instructions'>Press <span class='key'>space bar</span> when you are ready to start.</p>",
  choices: [32]
};

var iat_instructions_block_2 = {
  type: 'html-keyboard-response',
  stimulus:
  "<div style='position: absolute; top: 18%; left: 20%'> <p>Press " +
    "<span class='key'>E</span> for:<br><span class='iat-category good-bad'>" +
    block_2_left_label  +
    "</span></p>" +
    "</div>" +
    "<div style='position: absolute; top: 18%; right: 20%'><p>Press " +
    "<span class='key'>I</span> for:<br><span class='iat-category good-bad'>" +
    block_2_right_label +
    "</span></p>" +
  "</div>" +
  "<div class='iat-instructions' style='position: relative; top: 42%, width:80%;'> " +
    "<p class='instructions'>" +
      "See above, the categories have changed. The items for sorting have changed as well. " +
      "The rules, however, are the same." +
    "</p>" +
    "<p class='instructions'>" +
      "When the items belong to a category to the left, press the <span class='key'>E</span> key; " +
      "when the item belongs to a category on the right, press the <span class='key'>I</span> key. " +
      "Items belong to only one category. " +
      "An X will appear after an error – fix the error by hitting the other key. " +
      "GO AS FAST AS YOU CAN. " +
    "</p>" +
  "</div> " +
  "<br>" +
  "<br>" +
  "<p class = 'continue-instructions'>Press <span class='key'>space bar</span> when you are ready to start.</p>",
  choices: [32]
};

var iat_instructions_block_3 = {
  type: 'html-keyboard-response',
  stimulus:
  "<div style='position: absolute; top: 18%; left: 20%'><p>" +
    "Press <span class='key'>E</span> for:<br> " +
    "<span class='iat-category good-bad'>" + block_3_left_label_top  + "</span>" +
    "<br>or<br>" +
    "<span class='iat-category black-white'>" + block_3_left_label_bottom + "</span>" +
  "</p></div>" +
  "<div style='position: absolute; top: 18%; right: 20%'><p>" +
    "Press <span class='key'>I</span>  for:<br>" +
    "<span class='iat-category good-bad'>" + block_3_right_label_top + "</span>" +
    "<br>or<br>" +
    "<span class='iat-category black-white'>" + block_3_right_label_bottom  + "</span>" +
  "</p></div>" +
  "<div class='iat-instructions' style='position: relative; top: 42%'> "+
    "<p class='instructions'>" +
    "See above, the four categories you saw separately now appear together. " +
    "Remember, each item belongs to only one group." +
    "</p>" +
    "<p class='instructions'>" +
    "The <span class='black-white'>green</span> and <span class='good-bad'>black</span> labels " +
    "and items may help to identify the appropriate category. " +
    "Use the <span class='key'>E</span> and <span class='key'>I</span> keys to categorize " +
    "items into the four groups left and right, and correct errors by hitting the other key." +
    "</p>" +
  "</div> " +
  "<br />" +
  "<br>" +
  "<p class = 'continue-instructions'>Press <span class='key'>space bar</span> when you are ready to start.</p>",
  choices: [32]
};

var iat_instructions_block_3_test = {
  type: 'html-keyboard-response',
  stimulus:
  "<div style='position: absolute; top: 18%; left: 20%'><p>" +
    "Press <span class='key'>E</span> for:<br> " +
    "<span class='iat-category good-bad'>" + block_3_left_label_top  + "</span>" +
    "<br>or<br>" +
    "<span class='iat-category black-white'>" + block_3_left_label_bottom + "</span>" +
  "</p></div>" +
  "<div style='position: absolute; top: 18%; right: 20%'><p>" +
    "Press <span class='key'>I</span>  for:<br>" +
    "<span class='iat-category good-bad'>" + block_3_right_label_top + "</span>" +
    "<br>or<br>" +
    "<span class='iat-category black-white'>" + block_3_right_label_bottom  + "</span>" +
  "</p></div>" +
  "<div class='iat-instructions' style='position: relative; top: 42%'> "+
    "<p class='instructions'>" +
    "Sort the same four categories again. Remember to go as fast as you can while " +
    "making as few mistakes as possible." +
    "</p>" +
    "<p class='instructions'>" +
    "The <span class='black-white'>green</span> and <span class='good-bad'>black</span> labels " +
    "and items may help to identify the appropriate category. " +
    "Use the <span class='key'>E</span> and <span class='key'>I</span> keys to categorize " +
    "items into the four groups left and right, and correct errors by hitting the other key." +
    "</p>" +
  "</div> " +
  "<br />" +
  "<br>" +
  "<p class = 'continue-instructions'>Press <span class='key'>space bar</span> when you are ready to start.</p>",
  choices: [32]
};

var iat_instructions_block_4 = {
  type: 'html-keyboard-response',
  stimulus:
  "<div style='position: absolute; top: 18%; left: 20%'> <p>Press " +
    "<span class='key'>E</span> for:<br><span class='iat-category black-white'>" +
    block_4_left_label  +
    "</span></p>" +
    "</div>" +
    "<div style='position: absolute; top: 18%; right: 20%'><p>Press " +
    "<span class='key'>I</span> for:<br><span class='iat-category black-white'>" +
    block_4_right_label +
    "</span></p>" +
  "</div>" +
  "<div class='iat-instructions' style='position: relative; top: 42%, width:80%;'> " +
    "<p class='instructions'>" +
      "Notice above, there are only two categories and they have switched positions. " +
      "The concept that was previously on the left is now on the right, and the concept " +
      "that was on the right is now on the left. Practice this new configuration."  +
    "</p>" +
    "<p class='instructions'>" +
      "Use the <span class='key'>E</span> and <span class='key'>I</span> keys " +
      "to categorize items left and right, and correct error " +
      "by hitting the other key." +
    "</p>" +
  "</div> " +
  "<br>" +
  "<br>" +
  "<p class = 'continue-instructions'>Press <span class='key'>space bar</span> when you are ready to start.</p>",
  choices: [32]
};

var iat_instructions_block_5 = {
  type: 'html-keyboard-response',
  stimulus:
  "<div style='position: absolute; top: 18%; left: 20%'><p>" +
    "Press <span class='key'>E</span> for:<br> " +
    "<span class='iat-category good-bad'>" + block_5_left_label_top  + "</span>" +
    "<br>or<br>" +
    "<span class='iat-category black-white'>" + block_5_left_label_bottom + "</span>" +
  "</p></div>" +
  "<div style='position: absolute; top: 18%; right: 20%'><p>" +
    "Press <span class='key'>I</span>  for:<br>" +
    "<span class='iat-category good-bad'>" + block_5_right_label_top + "</span>" +
    "<br>or<br>" +
    "<span class='iat-category black-white'>" + block_5_right_label_bottom  + "</span>" +
  "</p></div>" +
  "<div class='iat-instructions' style='position: relative; top: 42%'> "+
    "<p class='instructions'>" +
    "See above, the four categories now appear together in a new configuration. " +
    "Remember, each item belongs to only one group." +
    "</p>" +
    "<p class='instructions'>" +
      "Use the <span class='key'>E</span> and <span class='key'>I</span> keys " +
      "to categorize items into the four groups left and right, and correct error " +
      "by hitting the other key." +
    "</p>" +
  "</div> " +
  "<br />" +
  "<br>" +
  "<p class = 'continue-instructions'>Press <span class='key'>space bar</span> when you are ready to start.</p>",
  choices: [32]
};

var iat_instructions_block_5_test = {
  type: 'html-keyboard-response',
  stimulus:
  "<div style='position: absolute; top: 18%; left: 20%'><p>" +
    "Press <span class='key'>E</span> for:<br> " +
    "<span class='iat-category good-bad'>" + block_5_left_label_top  + "</span>" +
    "<br>or<br>" +
    "<span class='iat-category black-white'>" + block_5_left_label_bottom + "</span>" +
  "</p></div>" +
  "<div style='position: absolute; top: 18%; right: 20%'><p>" +
    "Press <span class='key'>I</span>  for:<br>" +
    "<span class='iat-category good-bad'>" + block_5_right_label_top + "</span>" +
    "<br>or<br>" +
    "<span class='iat-category black-white'>" + block_5_right_label_bottom  + "</span>" +
  "</p></div>" +
  "<div class='iat-instructions' style='position: relative; top: 42%'> "+
    "<p class='instructions'>" +
    "Sort the same four categories again. Remember to go as fast as you can while " +
    "making as few mistakes as possible." +
    "</p>" +
    "<p class='instructions'>" +
    "The <span class='black-white'>green</span> and <span class='good-bad'>black</span> labels " +
    "and items may help to identify the appropriate category. " +
    "Use the <span class='key'>E</span> and <span class='key'>I</span> keys to categorize " +
    "items into the four groups left and right, and correct errors by hitting the other key." +
    "</p>" +
  "</div> " +
  "<br />" +
  "<br>" +
  "<p class = 'continue-instructions'>Press <span class='key'>space bar</span> when you are ready to start.</p>",
  choices: [32]
};

// iat - stimuli ------------------------------------------------------------------------

// implicit project pos/neg words
// Pos : Delightful, Appealing, Lovely, Triumph, Cherish, Magnificent, Adore, Enjoy
// Neg : Scorn, Pain, Evil, Hatred, Rotten, Dirty, Ugly, Angry
// + 6 Black / 6 white photos --> here, first names 
// We selected 6 whitest/blackest names ("Freakonomics" book, by Steven D. Levitt and Stephen J. Dubner)
// White : Jake, Connor, Tanner, Wyatt, Cody, Dustin
// Black : DeShawn, DeAndre, Marquis, Darnell, Terrell, Trevon


var iat_block_1_stim = [
  {category: "black-white", stimulus: "DeShawn",    stim_key_association: black_side_1st},
  {category: "black-white", stimulus: "DeAndre",    stim_key_association: black_side_1st},
  {category: "black-white", stimulus: "Marquis",    stim_key_association: black_side_1st},
  {category: "black-white", stimulus: "Darnell",    stim_key_association: black_side_1st},
  {category: "black-white", stimulus: "Terrell",    stim_key_association: black_side_1st},
  {category: "black-white", stimulus: "Trevon",     stim_key_association: black_side_1st},

  {category: "black-white", stimulus: "Jake",       stim_key_association: white_side_1st},
  {category: "black-white", stimulus: "Connor",     stim_key_association: white_side_1st},
  {category: "black-white", stimulus: "Tanner",     stim_key_association: white_side_1st},
  {category: "black-white", stimulus: "Wyatt",      stim_key_association: white_side_1st},
  {category: "black-white", stimulus: "Cody",       stim_key_association: white_side_1st},
  {category: "black-white", stimulus: "Dustin",     stim_key_association: white_side_1st}
]

var iat_block_2_stim = [
  {category: "good-bad", stimulus: "Delightful",     stim_key_association: good_side},
  {category: "good-bad", stimulus: "Appealing",      stim_key_association: good_side},
  {category: "good-bad", stimulus: "Lovely",         stim_key_association: good_side},
  {category: "good-bad", stimulus: "Triumph",        stim_key_association: good_side},
  {category: "good-bad", stimulus: "Cherish",        stim_key_association: good_side},
  {category: "good-bad", stimulus: "Magnificent",    stim_key_association: good_side},
  {category: "good-bad", stimulus: "Adore",          stim_key_association: good_side},
  {category: "good-bad", stimulus: "Enjoy",          stim_key_association: good_side},

  {category: "good-bad", stimulus: "Scorn",          stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Pain",           stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Evil",           stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Hatred",         stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Rotten",         stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Dirty",          stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Ugly",           stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Angry",          stim_key_association: bad_side}
]

var iat_block_3_stim = [
  {category: "good-bad", stimulus: "Delightful",     stim_key_association: good_side},
  {category: "good-bad", stimulus: "Appealing",      stim_key_association: good_side},
  {category: "good-bad", stimulus: "Lovely",         stim_key_association: good_side},
  {category: "good-bad", stimulus: "Triumph",        stim_key_association: good_side},
  {category: "good-bad", stimulus: "Cherish",        stim_key_association: good_side},
  {category: "good-bad", stimulus: "Magnificent",    stim_key_association: good_side},
  {category: "good-bad", stimulus: "Adore",          stim_key_association: good_side},
  {category: "good-bad", stimulus: "Enjoy",          stim_key_association: good_side},

  {category: "good-bad", stimulus: "Scorn",          stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Pain",           stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Evil",           stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Hatred",         stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Rotten",         stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Dirty",          stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Ugly",           stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Angry",          stim_key_association: bad_side}, 

  {category: "black-white", stimulus: "DeShawn",    stim_key_association: black_side_1st},
  {category: "black-white", stimulus: "DeAndre",    stim_key_association: black_side_1st},
  {category: "black-white", stimulus: "Marquis",    stim_key_association: black_side_1st},
  {category: "black-white", stimulus: "Darnell",    stim_key_association: black_side_1st},
  {category: "black-white", stimulus: "Terrell",    stim_key_association: black_side_1st},
  {category: "black-white", stimulus: "Trevon",     stim_key_association: black_side_1st},

  {category: "black-white", stimulus: "Jake",       stim_key_association: white_side_1st},
  {category: "black-white", stimulus: "Connor",     stim_key_association: white_side_1st},
  {category: "black-white", stimulus: "Tanner",     stim_key_association: white_side_1st},
  {category: "black-white", stimulus: "Wyatt",      stim_key_association: white_side_1st},
  {category: "black-white", stimulus: "Cody",       stim_key_association: white_side_1st},
  {category: "black-white", stimulus: "Dustin",     stim_key_association: white_side_1st}
]

var iat_block_4_stim = [
  {category: "black-white", stimulus: "DeShawn",    stim_key_association: black_side_2nd},
  {category: "black-white", stimulus: "DeAndre",    stim_key_association: black_side_2nd},
  {category: "black-white", stimulus: "Marquis",    stim_key_association: black_side_2nd},
  {category: "black-white", stimulus: "Darnell",    stim_key_association: black_side_2nd},
  {category: "black-white", stimulus: "Terrell",    stim_key_association: black_side_2nd},
  {category: "black-white", stimulus: "Trevon",     stim_key_association: black_side_2nd},

  {category: "black-white", stimulus: "Jake",       stim_key_association: white_side_2nd},
  {category: "black-white", stimulus: "Connor",     stim_key_association: white_side_2nd},
  {category: "black-white", stimulus: "Tanner",     stim_key_association: white_side_2nd},
  {category: "black-white", stimulus: "Wyatt",      stim_key_association: white_side_2nd},
  {category: "black-white", stimulus: "Cody",       stim_key_association: white_side_2nd},
  {category: "black-white", stimulus: "Dustin",     stim_key_association: white_side_2nd}
]

var iat_block_5_stim = [
  {category: "good-bad", stimulus: "Delightful",     stim_key_association: good_side},
  {category: "good-bad", stimulus: "Appealing",      stim_key_association: good_side},
  {category: "good-bad", stimulus: "Lovely",         stim_key_association: good_side},
  {category: "good-bad", stimulus: "Triumph",        stim_key_association: good_side},
  {category: "good-bad", stimulus: "Cherish",        stim_key_association: good_side},
  {category: "good-bad", stimulus: "Magnificent",    stim_key_association: good_side},
  {category: "good-bad", stimulus: "Adore",          stim_key_association: good_side},
  {category: "good-bad", stimulus: "Enjoy",          stim_key_association: good_side},

  {category: "good-bad", stimulus: "Scorn",          stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Pain",           stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Evil",           stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Hatred",         stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Rotten",         stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Dirty",          stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Ugly",           stim_key_association: bad_side},
  {category: "good-bad", stimulus: "Angry",          stim_key_association: bad_side}, 

  {category: "black-white", stimulus: "DeShawn",    stim_key_association: black_side_2nd},
  {category: "black-white", stimulus: "DeAndre",    stim_key_association: black_side_2nd},
  {category: "black-white", stimulus: "Marquis",    stim_key_association: black_side_2nd},
  {category: "black-white", stimulus: "Darnell",    stim_key_association: black_side_2nd},
  {category: "black-white", stimulus: "Terrell",    stim_key_association: black_side_2nd},
  {category: "black-white", stimulus: "Trevon",     stim_key_association: black_side_2nd},

  {category: "black-white", stimulus: "Jake",       stim_key_association: white_side_2nd},
  {category: "black-white", stimulus: "Connor",     stim_key_association: white_side_2nd},
  {category: "black-white", stimulus: "Tanner",     stim_key_association: white_side_2nd},
  {category: "black-white", stimulus: "Wyatt",      stim_key_association: white_side_2nd},
  {category: "black-white", stimulus: "Cody",       stim_key_association: white_side_2nd},
  {category: "black-white", stimulus: "Dustin",     stim_key_association: white_side_2nd}
]


// iat - block 1 ------------------------------------------------------------------------orginally 20 trials over 4 stim
var iat_block_1 = {
  timeline: [
    {
      type: 'iat-html',
      stimulus: jsPsych.timelineVariable('stimulus'),
      category: jsPsych.timelineVariable('category'),
      label_category: ['black-white'],
      stim_key_association: jsPsych.timelineVariable('stim_key_association'),
      html_when_wrong: '<span style="color: red; font-size: 80px">&times;</span>',
      force_correct_key_press: true,
      display_feedback: true,
      left_category_label:  [block_1_left_label],
      right_category_label: [block_1_right_label],
      response_ends_trial: true,
      data: {
        iat_block: 1,
        iat_type: 'practice',
        iat_label_left:  block_1_left_label,
        iat_label_right: block_1_right_label
      }
    },
    save_iat_trial
  ],
  timeline_variables: sample_n_iat(iat_block_1_stim,30)  //here, put 30
}

// iat - block 2 ------------------------------------------------------------------------orginally 20 trials over 4 stim
var iat_block_2 = {
  timeline: [
    {
      type: 'iat-html',
      stimulus: jsPsych.timelineVariable('stimulus'),
      category: jsPsych.timelineVariable('category'),
      label_category: ['good-bad'],
      stim_key_association: jsPsych.timelineVariable('stim_key_association'),
      html_when_wrong: '<span style="color: red; font-size: 80px">&times;</span>',
      force_correct_key_press: true,
      display_feedback: true,
      left_category_label:  [block_2_left_label],
      right_category_label: [block_2_right_label],
      response_ends_trial: true,
      data: {
        iat_block: 2,
        iat_type: 'practice',
        iat_label_left:  block_2_left_label,
        iat_label_right: block_2_right_label
         }
    },
    save_iat_trial
  ],
  timeline_variables: sample_n_iat(iat_block_2_stim, 30) //here, put 30
}


// iat - block 3 (test) -----------------------------------------------------------------orginally 74 trials over 8 stim
var iat_block_3_test = {
  timeline: [
    {
      type: 'iat-html',
      stimulus: jsPsych.timelineVariable('stimulus'),
      category: jsPsych.timelineVariable('category'),
      label_category: ['good-bad', 'black-white'],
      stim_key_association: jsPsych.timelineVariable('stim_key_association'),
      html_when_wrong: '<span style="color: red; font-size: 80px">&times;</span>',
      force_correct_key_press: true,
      display_feedback: true,
      left_category_label:  [block_3_left_label_top, block_3_left_label_bottom],
      right_category_label: [block_3_right_label_top, block_3_right_label_bottom],
      response_ends_trial: true,
      data: {
        iat_type: 'test',
        iat_block: 3,
        iat_label_left:  block_3_left_label_top  + "-" + block_3_left_label_bottom,
        iat_label_right: block_3_right_label_top + "-" + block_3_right_label_bottom
         }
    },
    save_iat_trial
  ],
  timeline_variables: shuffleIATstims(iat_block_3_stim)
  //timeline_variables: sample_n_iat(iat_block_3_stim, 5)  //here, put 60
}

// iat - block 4 ------------------------------------------------------------------------orginally 20 trials over 4 stim
var iat_block_4 = {
  timeline: [
    {
      type: 'iat-html',
      stimulus: jsPsych.timelineVariable('stimulus'),
      category: jsPsych.timelineVariable('category'),
      stim_key_association: jsPsych.timelineVariable('stim_key_association'),
      label_category: ['black-white'],
      html_when_wrong: '<span style="color: red; font-size: 80px">&times;</span>',
      force_correct_key_press: true,
      display_feedback: true,
      left_category_label:  [block_4_left_label],
      right_category_label: [block_4_right_label],
      response_ends_trial: true,
      data: {
        iat_block: 4,
        iat_type: 'practice',
        iat_label_left:  block_4_left_label,
        iat_label_right: block_4_right_label
         }
    },
    save_iat_trial
  ],
  timeline_variables: sample_n_iat(iat_block_4_stim, 60)  //here, put 60
}

// iat - block 5 (test) -----------------------------------------------------------------orginally 74 trials over 8 stim
var iat_block_5_test = {
  timeline: [
    {
      type: 'iat-html',
      stimulus: jsPsych.timelineVariable('stimulus'),
      category: jsPsych.timelineVariable('category'),
      label_category: ['good-bad', 'black-white'],
      stim_key_association: jsPsych.timelineVariable('stim_key_association'),
      html_when_wrong: '<span style="color: red; font-size: 80px">X</span>',
      bottom_instructions: '<p>If you press the wrong key, a red X will appear. Press the other key to continue</p>',
      force_correct_key_press: true,
      display_feedback: true,
      left_category_label:  [block_5_left_label_top, block_5_left_label_bottom],
      right_category_label: [block_5_right_label_top, block_5_right_label_bottom],
      response_ends_trial: true,
      data: {
        iat_block: 5,
        iat_type: 'test',
        iat_label_left:  block_5_left_label_top  + "-" + block_5_left_label_bottom,
        iat_label_right: block_5_right_label_top + "-" + block_5_right_label_bottom
         }
    },
    save_iat_trial
  ],
  timeline_variables: shuffleIATstims(iat_block_5_stim)
  //timeline_variables: sample_n_iat(iat_block_5_stim, 5)  //here, put 60
}

//
var iat_instructions_2 = {
  type: "html-keyboard-response",
  stimulus:
    "<p class='instructions'><center>Task 3 is now over, you are almost finished with the study. <br>" +
    "Now you will have to answer a few questions.</center></p>" +
    "<br>" +
    "<p class = 'continue-instructions'>Press <strong>space</strong> to continue.</p>",
  choices: [32]
};

    var ThermoPreamble = '<p class = "justify">Please indicate how warm or cold you feel toward the groups below. <br>' +
        'To do so, use the following scale: ' +
        'from 1 = “Coldest feelings” to 9 = “Warmest feelings”</p>';

    var ThermoScale = ["</br>1</br>Coldest feelings", "</br>2", "</br>3", "</br>4", "</br>5", "</br>6", "</br>7", "</br>8", "</br>9</br>Warmest feelings"];

    var ThermoGrpItems = [
        'Black people',
        'White people',
    ];


    ThermoGrpItems = _.shuffle(ThermoGrpItems);

    var questionsThermoGrp = [];
    ThermoGrpItems.map(function (item) { questionsThermoGrp.push({ prompt: '<i>' + item + '</i>', labels: ThermoScale, required: true }); });

    var ThermoGrp = {
        type: 'survey-likert',
        preamble: ThermoPreamble,
        questions: questionsThermoGrp,
        //post_trial_gap: 300,
        on_finish: function (data) {
            $(".jspsych-content-wrapper").css("height", "700px");
            console.log(data.responses);
            var parsed_response = JSON.parse(data.responses);
            if (ThermoGrpItems[0] == 'White people') {
                jsPsych.data.addProperties({
                    ThermoWhite: parsed_response.Q0,
                    ThermoBlack: parsed_response.Q1,
                });
            } else {
                jsPsych.data.addProperties({
                    ThermoWhite: parsed_response.Q1,
                    ThermoBlack: parsed_response.Q0,
                });
            }
            console.log(jsPsych.data);
        },
    };


    var genderOptions = ['Male&nbsp', 'Female&nbsp', 'Other&nbsp'];
    var gender = {
        type: 'survey-multi-choice',
        questions: [{ prompt: "Please indicate your gender:", options: genderOptions, required: true }],
        button_label: "continue",
        on_finish: function (data) {
            jsPsych.data.addProperties({
                gender: JSON.parse(data.responses).Q0,
            });
            console.log(data);
        },
    };

    var age = {
            type: 'survey-text',
            questions: [{ prompt: "Please indicate your age:", rows: 1, columns: 10, required: true }],
            button_label: "continue",
        on_finish: function (data) {
            jsPsych.data.addProperties({
                age: JSON.parse(data.responses).Q0,
            });
        },
    };

    var languageOptions = ['Fluently&nbsp', 'Very good&nbsp', 'Good&nbsp', 'Average&nbsp', 'Bad&nbsp', 'Very bad&nbsp'];
    var language = {
        type: 'survey-multi-choice',
        questions: [{ prompt: "How well do you speak english?", options: languageOptions, required: true }],
        button_label: "continue",
        on_finish: function (data) {
            jsPsych.data.addProperties({
                language: JSON.parse(data.responses).Q0,
            });
            console.log(data);
        },
    };

    var RaceOptions = ['American Indian or Alaska Native&nbsp', 'Asian&nbsp', 'Black or African American&nbsp', 'Hispanic or Latino&nbsp', 'Native Hawaiian or Other Pacific Islander&nbsp', 'White&nbsp'];
    var Race = {
        type: 'survey-multi-choice',
        questions: [{ prompt: "Please indicate your racial/ethnic category:", options: RaceOptions, required: true }],
        button_label: "continue",
        on_finish: function (data) {
            jsPsych.data.addProperties({
                Race: JSON.parse(data.responses).Q0,
            });
            console.log(data);
        },
    };

    var Prolific_reported = {
            type: 'survey-text',
            questions: [{ prompt: 'Please indicate your Prolific ID:', rows: 3, columns: 60, required: true  }],
            button_label: "continue",
        on_finish: function (data) {
            jsPsych.data.addProperties({
                Prolific_reported: JSON.parse(data.responses).Q0,
            });
        },
    };


    var goal = {
            type: 'survey-text',
            questions: [{ prompt: 'What do you think was the goal of this study ? (2-3 lines max)', rows: 3, columns: 60, required: true }],
            button_label: "continue",
        on_finish: function (data) {
            jsPsych.data.addProperties({
                goal: JSON.parse(data.responses).Q0,
            });
        },
    };

  var debriefing = {
    type: "html-keyboard-response",
    stimulus:
      "<h1 class ='custom-title'>Debriefing and study validation</h1>" +
      "<p class='instructions'>First of all, thank you for your participation!" +
      " The aim of this experiment was to test whether the first part of the experiment (i.e., the video game task) " +
      "influenced your responses to the second part (i.e., in the face and first name categorization tasks)." +
      "</p>" +
      "<p class='instructions'>Specifically, in the video game task, some participants had to approach Black faces and to avoid White faces, " +
      "some other participants had to perform the reverse actions (approaching White faces and avoiding Black faces), and finally, some other participants " + 
      "just had to categorize the two groups faces (without any approach/avoidance actions)." +
      "Our hypothesis is that the approach/avoidance actions performed in the video game task toward the two groups of faces should " + 
      "have impacted our representation of these two groups: participants who approached Black faces should have a more positive " +
      "representation of this group (comparatively to participants who avoided Black faces or did not perform any approach/avoidance)." +
      "We measured these two representations in task 2. Task 3 measured the implicit evaluation of these two groups. Our hypotheses were the same " + 
      "with a more positive evaluation of Black people in the condition where participants approached Black faces and avoided White faces (compared to the two others).</p>" +
      "<p class='instructions'>If you have any questions/remarks regarding this experiment, please contact me at: marine.rougier@uclouvain.be </p>" +
      " You can copy/paste the completion code for Prolific <b>11E3E680</b> or you can press the space bar to be automatically redirected to the study validation.</p>" +
      "<p class = 'continue-instructions'>Press <span class='key'>space</span>" +
      " to continue to the study validation.</p>",
    choices: [32]
  };

// end fullscreen -----------------------------------------------------------------------

var fullscreen_trial_exit = {
  type: 'fullscreen',
  fullscreen_mode: false
}


// procedure ----------------------------------------------------------------------------
// Initialize timeline ------------------------------------------------------------------

var timeline = [];

// fullscreen
timeline.push(
        fullscreen_trial,
			  hiding_cursor);

timeline.push(iat_instructions_1,
              iat_instructions_1_1,
              iat_instructions_block_1, 
              iat_block_1,
              iat_instructions_block_2, 
              iat_block_2,
              iat_instructions_block_3, 
              iat_block_3_test,
              iat_instructions_block_4, 
              iat_block_4,
              iat_instructions_block_5, 
              iat_block_5_test,
              iat_instructions_2);

timeline.push(showing_cursor);

timeline.push(ThermoGrp,
              gender,
              age, 
              language,
              Race, 
              Prolific_reported,
              goal, 
              save_extra,
              debriefing);

timeline.push(fullscreen_trial_exit);

// Launch experiment --------------------------------------------------------------------
// preloading ---------------------------------------------------------------------------
// Preloading. For some reason, it appears auto-preloading fails, so using it manually.
// In principle, it should have ended when participants starts VAAST procedure (which)
// contains most of the image that have to be pre-loaded.
var loading_gif               = ["media/loading.gif"]
jsPsych.pluginAPI.preloadImages(loading_gif);


// timeline initiaization ---------------------------------------------------------------

if(is_compatible) {
  jsPsych.init({
      timeline: timeline,
      on_interaction_data_update: function() {
        saving_browser_events(completion = false);
      },
    on_finish: function() {
        saving_browser_events(completion = true);
        jsPsych.data.addProperties({
        training_cond: training_cond,
        control_cond: control_cond,
        });
        window.location.href = "https://app.prolific.co/submissions/complete?cc=11E3E680";
    }
  });
}


