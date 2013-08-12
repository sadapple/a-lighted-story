'use strict';

// consts
var WIDTH = 960;
var HEIGHT = 540;
var FONT = ' "文泉驿正黑","微软雅黑","黑体" ';

// handling a level

var startLevel = function(level){

	// show level words
	var story = game.words[level].story;
	var i = 0;
	var storyText = new createjs.Text('', '30px'+FONT, '#ccc');
	storyText.textAlign = 'center';
	storyText.textBaseline = 'middle';
	storyText.x = WIDTH/2;
	storyText.y = HEIGHT/2;
	var storyLoop = function(){
		// TODO
	};
	createjs.Ticker.addEventListener('tick', storyLoop);

	// show 
	var storyLoopEnd = function(){
		// TODO
	};

};

// init game ctrls

game.start = function(){

	// pause and unpause
	var paused = false;
	var pause = function(){};
	var unpause = function(){};

	// keyboard event handlers

	var keyPause = function(){
		if(paused) unpause();
		else pause;
	};
	var keyReset = function(){};
	var keyMusicOn = function(){};
	var keyVolumeUp = function(){};
	var keyVolumeDown = function(){};
	var keyStartAction = function(){};
	var keyStartUp = function(){};
	var keyStartDown = function(){};
	var keyStartLeft = function(){};
	var keyStartRight = function(){};
	var keyEndAction = function(){};
	var keyEndUp = function(){};
	var keyEndDown = function(){};
	var keyEndLeft = function(){};
	var keyEndRight = function(){};

	var keyDownFunc = {
		19: keyPause,
		27: keyPause,
		80: keyPause,
		77: keyMusicOn,
		188: keyVolumeDown,
		190: keyVolumeUp,
		82: keyReset,
		32: keyStartAction,
		38: keyStartUp,
		87: keyStartUp,
		40: keyStartDown,
		83: keyStartDown,
		37: keyStartLeft,
		65: keyStartLeft,
		39: keyStartRight,
		68: keyStartRight
	};

	var keyUpFunc = {
		32: keyEndAction,
		38: keyEndUp,
		87: keyEndUp,
		40: keyEndDown,
		83: keyEndDown,
		37: keyEndLeft,
		65: keyEndLeft,
		39: keyEndRight,
		68: keyEndRight
	};

	// basic listeners
	window.addEventListener('keydown', function(e){
		if(keyDownFunc[e.keyCode])
			keyDownFunc[e.keyCode]();
	}, false);
	window.addEventListener('keydown', function(e){
		if(keyUpFunc[e.keyCode])
			keyUpFunc[e.keyCode]();
	}, false);
	window.addEventListener('blur', function(e){
		pause();
	}, false);

	// enter level
	startLevel(game.settings.curLevel);

};