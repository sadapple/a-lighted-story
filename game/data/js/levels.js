'use strict';

// consts
var WIDTH = 960;
var HEIGHT = 540;
var FONT = ' "文泉驿正黑","微软雅黑","黑体" ';
var DEBUG = {};
DEBUG.SKIP_TEXT = true;

// parse a map

var mapSlice = new createjs.Graphics();
mapSlice.f('rgba(192,192,192,0.7)').r(0,0,6,6);

var parseMap = function(level){
	var map = {};
	var a = game.maps[level].split('|');
	map.startX = a[1];
	map.startY = a[2];
	map.endX = a[3];
	map.endY = a[4];
	// parse lights
	map.lights = [];
	var s = a[5].split(/[ \t]+/g);
	for(var i=0; i<s.length; i++) {
		var b = s[i].match(/\(([0-9]+)\,([0-9]+)\)\*([0-9]+)\(([0-9]+)\,([0-9]+)\)(~[0-9\.]+|)/);
		if(!b) continue;
		map.lights.push({
			x: b[1],
			y: b[2],
			r: b[3],
			rmin: b[4],
			rmax: b[5]
		});
	}
	// draw map
	var s = a[0];
	map.picture = new createjs.Container();
	for(var i=0; i<2400; i++) {
		var t = s.charCodeAt(i) - 48;
		for(var j=5; j>=0; j--) {
			var isFilled = t%2;
			t = t >> 1;
			if(!isFilled) {
				var g = new createjs.Shape(mapSlice);
				var p = i*6+j;
				g.y = Math.floor(p/160)*6;
				g.x = (p%160)*6;
				map.picture.addChild(g);
			}
		}
	}
	map.picture.filters = [ new createjs.BoxBlurFilter(12,12,1) ];
	map.picture.cache(0,0,WIDTH,HEIGHT);
	return map;
};

// handling a level

var startLevel = function(level){

	// switch music
	if(game.curMusic !== game.words[level].chapter) {
		var curVol = 1;
		var volDown = function(){
			curVol -= 0.04;
			if(curVol <= 0) {
				curVol = 0;
				// switch music
				game.curMusic = game.words[level].chapter;
				switch(game.curMusic) {
					case 1:
						createjs.Sound.play('bgm1', createjs.Sound.INTERRUPT_ANY, 0, 0, -1);
						break;
					case 2:
						createjs.Sound.play('bgm2', createjs.Sound.INTERRUPT_ANY, 0, 0, -1);
						break;
					case 3:
						createjs.Sound.play('bgm3', createjs.Sound.INTERRUPT_ANY, 0, 0, -1);
						break;
					default:
						createjs.Sound.play('bgm4', createjs.Sound.INTERRUPT_ANY, 0, 0, -1);
				}
				createjs.Ticker.removeEventListener('tick', volDown);
				createjs.Ticker.addEventListener('tick', volUp);
				startStoryLoop();
			}
			if(game.settings.musicOn)
				createjs.Sound.setVolume(curVol*game.settings.volume/100);
			else
				createjs.Sound.setVolume(0);
		};
		var volUp = function(){
			curVol += 0.02;
			if(curVol >= 1) {
				curVol = 1;
				createjs.Ticker.removeEventListener('tick', volUp);
			}
			if(game.settings.musicOn)
				createjs.Sound.setVolume(curVol*game.settings.volume/100);
			else
				createjs.Sound.setVolume(0);
		};
		createjs.Ticker.addEventListener('tick', volDown);
	};

	var startStoryLoop = function(){
		// show level words
		var story = game.words[level].story;
		var storyText = new createjs.Text('', '30px'+FONT, '#ccc');
		storyText.textAlign = 'center';
		storyText.textBaseline = 'middle';
		storyText.x = WIDTH/2;
		storyText.y = HEIGHT/2;
		game.stage.addChild(storyText);
		var i = 0;
		var isFadeIn = true;
		var fadeAlphaMin = -1;
		var fadeAlphaStep = 0.04;
		var fadeAlphaMaxStd = 1.25;
		var fadeAlphaMaxPerChar = 0.15;
		storyText.alpha = -1;
		var fadeAlphaMax = 1;
		var storyLoop = function(){
			if(i >= story.length) {
				// end loop
				createjs.Ticker.removeEventListener('tick', storyLoop);
				storyLoopEnd();
				return;
			}
			if(isFadeIn) {
				// init text
				if(storyText.alpha <= fadeAlphaMin) {
					storyText.text = story[i];
					fadeAlphaMax = story[i].length * fadeAlphaMaxPerChar + fadeAlphaMaxStd;
				}
				// fade in
				storyText.alpha += fadeAlphaStep;
				if(storyText.alpha >= fadeAlphaMax)
					isFadeIn = false;
			} else {
				// fade out
				storyText.alpha -= fadeAlphaStep;
				if(storyText.alpha <= fadeAlphaMin) {
					isFadeIn = true;
					i++;
				}
			}
			game.stage.update();
		};
		createjs.Ticker.addEventListener('tick', storyLoop);
	};

	// show 
	var map = parseMap(level);
	var storyLoopEnd = function(){
		game.stage.addChild(map.picture);
		game.stage.update();
	};

	// TODO : DEBUG
	if(DEBUG.SKIP_TEXT) {
		storyLoopEnd();
		storyLoopEnd = function(){};
	}

};

// init game ctrls

game.start = function(){

	// update volume
	var updateVolume = function(){
		if(game.settings.musicOn) {
			createjs.Sound.setVolume(game.settings.volume/100);
			hint.show('音乐已经打开，音量：'+game.settings.volume, 1000);
		} else {
			createjs.Sound.setVolume(0);
			hint.show('音乐已经关闭', 1000);
		}
		game.saveSettings();
	};

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
	var keyMusicOn = function(){
		game.settings.musicOn = !game.settings.musicOn;
		updateVolume();
	};
	var keyVolumeUp = function(){
		if(game.settings.volume < 100) game.settings.volume += 10;
		updateVolume();
	};
	var keyVolumeDown = function(){
		if(game.settings.volume > 0) game.settings.volume -= 10;
		updateVolume();
	};
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