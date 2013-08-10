/*
* Eric Vandegriek 
* 
* 2013
*/

// Wait for gadget to load.                                                       
gadgets.util.registerOnLoadHandler(init);

MAX_MESSAGES = 50;
DICE_BOXES = 1;
MSG_BOX_FLIP = false;

function init() {
    // When API is ready...                                                         
    gapi.hangout.onApiReady.add(
        function(eventObj) {
            if (eventObj.isApiReady) {
                gapi.hangout.data.onStateChanged.add(function(stateChangeEvent) {
                    update_messages();
                });
            }
        }
    );
    
    var add_box = document.getElementById('add_box');
    add_box.onclick = add_dice_box;
    update_db_num(['']);
}

function get_d_str_array() {
    var d_str_array = [];
    for (var i = 0; i < DICE_BOXES; i++) {
        var d_box = document.getElementById("db_input_"+i);
        d_str_array.push(d_box.value);
    }
    return d_str_array;
}

function add_dice_box() {
    var d_str_array = get_d_str_array();
    d_str_array.push('');
    DICE_BOXES += 1;
    update_db_num(d_str_array);
}

function remove_dice_box(box_num) {
    var d_str_array = get_d_str_array();
    d_str_array.splice(box_num, 1);
    DICE_BOXES -= 1;
    update_db_num(d_str_array);
}

function update_db_num(d_str_array) {
    var boxes = document.getElementById('dice_boxes');
    var boxes_html = '';
    var i;
    for (i = 0; i < DICE_BOXES; i++) {
        var disabled = (DICE_BOXES > 1) ? "" : "disabled"
        boxes_html += "\
        <div id='dice_box_"+i+"' class='dice_box'> \
            <input type='text' id='db_input_"+i+"' class='dice_input'/> \
            <input type='button' value='roll' id='db_roll_"+i+"'/> \
            <input type='button' value='clear' id='db_clear_"+i+"'/> \
            <input type='button' value='-' id='db_minus_"+i+"' "+disabled+"/> \
        </div> \
        ";
    }
    boxes.innerHTML = boxes_html;
    for (i = 0; i < DICE_BOXES; i++) {
        var d_input = document.getElementById("db_input_"+i);
        var d_roll = document.getElementById("db_roll_"+i);
        var d_clear = document.getElementById("db_clear_"+i);
        var d_minus = document.getElementById("db_minus_"+i);
        d_input.onkeypress = (function(event) {
            var cur_d_input = d_input;
            return function(event) {
                if (event.keyCode == 13) {
                    roll_dice_box(cur_d_input.value);
                }
            }
        })();
        d_roll.onclick = (function() {
            var cur_d_input = d_input;
            return function() {
                roll_dice_box(cur_d_input.value);
            }
        })();
        d_clear.onclick = (function() {
            var cur_d_input = d_input;
            return function() {
                cur_d_input.value = '';
            }
        })();
        d_minus.onclick = (function() {
            var cur_i = i;
            return function() {
                remove_dice_box(cur_i);
            }
        })();
        d_input.value = d_str_array[i];
    }
}

function msg_sort(ma, mb) {
    ma = parseInt(ma.replace(/message_/, ''));
    mb = parseInt(mb.replace(/message_/, ''));
    if (ma < mb) return -1;
    if (ma > mb) return 1;
    return 0;
}

function roll_dice_box(d_str) {
    var result_str = parse_dice_string(d_str);
    if (result_str == 'Error') {
        return;
    }
    
    var person = gapi.hangout.getLocalParticipant().person
    var name = person.displayName;
    var roll_str = name.split(' ')[0] + " rolled " + d_str;
    var title_txt = (name == 'Ben Adams') ? "I&#8217;m dumb" : "";
    var img_url = person.image.url;
    var img_str = "<img src='"+img_url+"' title='"+title_txt+"' class='message'>";
    
    var keys = gapi.hangout.data.getKeys().sort(msg_sort);
    var remove_key = [];
    var last_num = 0;
    if (keys.length > 0) {
        last_num = parseInt(keys[keys.length-1].replace(/message_/, ''));
        
        if (keys.length >= MAX_MESSAGES) {
            remove_key = ['message_'+(last_num-MAX_MESSAGES+1)];
        }
    }
    
    var msg_str = img_str+"<span class='message'>"+roll_str+"</br>"+result_str+"</span>";
    
    var add_key_val = {};
    add_key_val['message_'+(last_num+1)] = msg_str;
    
    MSG_BOX_FLIP = !MSG_BOX_FLIP;
    gapi.hangout.data.submitDelta(add_key_val, remove_key);
}

function update_messages() {
    var keys = gapi.hangout.data.getKeys();
    var msg_div = document.getElementById("message_box");
    
    var messages = "";
    
    for (var i = keys.length-1; i >= 0; i--) {
        var off = MSG_BOX_FLIP ? 1 : 0;
        var sign = ((i+keys.length + off) % 2) ? 'odd' : 'even';
        messages += " \
        <div class='message "+sign+"'> \
        " + gapi.hangout.data.getValue(keys[i]) + " \
        </div> \
        ";
    }
    
    msg_div.innerHTML = messages;
}

function parse_dice_string(d_str) {
    d_str = d_str.replace(/\s/g, '');
    var splits = d_str.split(/([\sd+-])/g);
    splits.push('end');
    var stack = [];
    var dice = [];
    var modifier = 0;
    var op = 1;
    var i, j;
    for (i = 0; i < splits.length; i++) {
        if (splits[i] == '') continue;
        if (i == splits.length-1 || splits[i] == '+' || splits[i] == '-') {
            if (stack.length == 1) {
                var mod = parseInt(stack.pop());
                modifier += mod * op;
            } else {
                var mult;
                var die;
                if (stack.length == 2) {
                    mult = 1;
                    die = parseInt(stack[1]) * op;
                } else if (stack.length == 3) {
                    mult = parseInt(stack[0]);
                    die = parseInt(stack[2]) * op;
                } else {
                    return "Error";
                }
                for (j = 0; j < mult; j++) {
                    dice.push(die);
                }
                stack = [];
            }
            
            if (splits[i] == '+') {
                op = 1;
            } else {
                op = -1;
            }
        } else {
            stack.push(splits[i]);
        }
    }
    
    var output = '';
    var skip_op = true;
    var op_sign;
    var total = 0;
    for (i = 0; i < dice.length; i++) {
        var mag = Math.abs(dice[i]);
        var result = Math.floor(Math.random() * mag) + 1;
        if (mag == 0) result = 0;
        
        if (dice[i] < 0) {
            op_sign = '-';
        } else {
            op_sign = '+';
        }
        if (!skip_op) {
            output += ' ' + op_sign + ' ';
        } else {
            skip_op = false;
        }
        var res_class = 'result';
        if (result == mag) {
            res_class += ' crit';
        }
        output += "<span class='"+res_class+"'>" + result + '</span>/' + mag;
        total += result;
    }
    
    if (modifier !== 0) {
        if (output == '') {
            op_sign = '';
        } else if (modifier < 0) {
            op_sign = ' - ';
        } else {
            op_sign = ' + ';
        }
        output += op_sign + modifier;
        total += modifier;
    }
    if (isNaN(total)) {
        return 'Error';
    }
    output += " = <span class='total'>" + total.toString() + "</span>";
    return output;
}
