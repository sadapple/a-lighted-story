'use strict';

// consts
var WIDTH = 960;
var HEIGHT = 540;
var FONT = ' "文泉驿正黑","微软雅黑","黑体" ';
var ME_R = 12;
var LIGHT_R_MAX = 50*6;
var DEBUG = {
	SKIP_TEXT: true,
	SHOW_FPS: true
};

// parse a map

var parseMap = function(level){
	var map = {};
	var a = game.maps[level].split('|');
	map.startX = a[1]*6;
	map.startY = a[2]*6;
	map.endX = a[3]*6;
	map.endY = a[4]*6;
	// parse lights
	map.lights = [];
	var s = a[5].split(/[ \t]+/g);
	for(var i=0; i<s.length; i++) {
		var b = s[i].match(/^\(([0-9]+)\,([0-9]+)\)\*([0-9]+)\(([0-9]+)\,([0-9]+)\)(o[0-9]+|)(~[0-9\.]+|)$/);
		if(!b) continue;
		if(b[6])
			b[6] = Number(b[6].slice(1))*6
		else
			b[6] = 0;
		if(b[7])
			b[7] = Number(b[7].slice(1))
		else
			b[7] = 1;
		map.lights.push({
			x: b[1]*6,
			y: b[2]*6,
			r: b[3]*6,
			xori: b[1]*6,
			yori: b[2]*6,
			rori: b[3]*6,
			rmin: b[4]*6,
			rmax: b[5]*6,
			area: b[6],
			speed: b[7],
			moveX: 0,
			moveY: 0,
			sizeState: 0
		});
	}
	// draw map
	var s = a[0];
	var block = new Array(90*160);
	var picture = new createjs.Shape();
	var g = picture.graphics.f('rgb(128,128,128)');
	for(var i=0; i<2400; i++) {
		var t = s.charCodeAt(i) - 48;
		for(var j=5; j>=0; j--) {
			var p = i*6+j;
			block[p] = !(t%2);
			t = t >> 1;
			if(block[p])
				g.r((p%160)*6, Math.floor(p/160)*6, 6, 6);
		}
	}
	picture.filters = [ new createjs.BoxBlurFilter(12,12,1) ];
	picture.cache(0,0,WIDTH,HEIGHT);
	map.block = block;
	map.picture = picture;
	return map;
};

// basic shape generater

var generateRound = function(color, r1, r2){
	var round = new createjs.Shape();
	var a = (r1+r2) / 2;
	var b = r2 - a;
	round.graphics.f(color).arc(0,0,a,0,2*Math.PI);
	round.filters = [ new createjs.BoxBlurFilter(b,b,1) ];
	round.cache(-r2,-r2,r2*2,r2*2);
	return round;
};

var lightCache = new Array(LIGHT_R_MAX+1);
var generateLight = function(r, x, y){
	var R_INNER = 5;
	var R_OUTER = 5;
	if(lightCache[r]) return lightCache[r].clone().set({
		x: x-R_OUTER-1-r,
		y: y-R_OUTER-1-r
	});
	var g = new createjs.Graphics();
	for(var i=r+R_OUTER; i>=r-R_INNER; i--)
		g.f('rgba(255,255,255,'+(r+R_OUTER-i)*0.025+')').arc(0, 0, i, 0, 2*Math.PI);
	var s = new createjs.Shape(g);
	s.cache(-(r+R_OUTER+1), -(r+R_OUTER+1), 2*(r+R_OUTER+1), 2*(r+R_OUTER+1));
	lightCache[r] = new createjs.Bitmap(s.cacheCanvas);
	return lightCache[r].clone().set({
		x: x-R_OUTER-1-r,
		y: y-R_OUTER-1-r
	});
};

var generateMe = function(){
	var ss = new createjs.SpriteSheetBuilder();
	var rmax = ME_R*0.75;
	var rmin = ME_R/2;
	var rout = ME_R*1.25;
	var rspeed = (rmax-rmin)/18;
	var frameCount = 19;
	var rect = new createjs.Rectangle(-ME_R, -ME_R, ME_R*2, ME_R*2);
	for(var i=rmax; i>rmin-(1e-6); i-=rspeed)
		ss.addFrame(generateRound('rgb(128,128,128)',i,rout), rect);
	var frames = [];
	for(var i=0; i<frameCount; i++)
		frames.push(i);
	for(var i=frameCount-2; i>0; i--)
		frames.push(i);
	ss.addAnimation('normal', frames, 'normal', 2);
	ss.addAnimation('fast', frames, 'fast');
	return new createjs.BitmapAnimation(ss.build());
};
var mePicture = generateMe();

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
				storyLoopStart();
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
	} else {
		setTimeout(storyLoopStart, 1000);
	}

	// story loop
	var storyLoopStart = function(){
		// show level words
		var story = game.words[level].story;
		var storyText = new createjs.Text('', '30px'+FONT, '#ccc');
		storyText.textAlign = 'center';
		storyText.textBaseline = 'middle';
		storyText.x = WIDTH/2;
		storyText.y = HEIGHT/2;
		storyText.filters = [ new createjs.BoxBlurFilter(1,1,1) ];
		storyText.cache(-480, -20, 960, 40);
		game.stage.addChild(storyText);
		var i = 0;
		var isFadeIn = true;
		var FADE_ALPHA_MIN = -1;
		var FADE_ALPHA_STEP = 0.04;
		var FADE_ALPHA_MAX_STD = 1.25;
		var FADE_ALPHA_MAX_PER_CHAR = 0.15;
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
				if(storyText.alpha <= FADE_ALPHA_MIN) {
					storyText.text = story[i];
					storyText.cache(-480, -20, 960, 40);
					fadeAlphaMax = story[i].length * FADE_ALPHA_MAX_PER_CHAR + FADE_ALPHA_MAX_STD;
				}
				// fade in
				storyText.alpha += FADE_ALPHA_STEP;
				if(storyText.alpha >= fadeAlphaMax)
					isFadeIn = false;
			} else {
				// fade out
				storyText.alpha -= FADE_ALPHA_STEP;
				if(storyText.alpha <= FADE_ALPHA_MIN) {
					isFadeIn = true;
					i++;
				}
			}
			game.stage.update();
		};
		createjs.Ticker.addEventListener('tick', storyLoop);
	};

	// generate clouds
	var cloudsStart = function(){
		var R1_MIN = 20;
		var R1_MAX = 100;
		var R2_MIN = 10;
		var R2_MAX = 20;
		var ALPHA_MIN = 0.04;
		var ALPHA_MAX = 0.08;
		var GEN_P = 0.3;
		var SPEED = 0.001;
		var container = new createjs.Container();
		game.stage.addChild(container);
		var rounds = [];
		createjs.Ticker.addEventListener('tick', function(){
			if(Math.random() < GEN_P) {
				var r1 = R1_MIN + Math.random()*(R1_MAX-R1_MIN);
				var r2 = R2_MIN + Math.random()*(R2_MAX-R2_MIN);
				var a = ALPHA_MIN + Math.random()*(ALPHA_MAX-ALPHA_MIN);
				var s = generateRound('black', r1, r1+r2).set({
					x: Math.random()*WIDTH,
					y: Math.random()*HEIGHT,
					alpha: 0
				});
				container.addChild(s);
				rounds.push({
					s: s,
					isAdd: true,
					a: a
				});
			}
			for(var i=0; i<rounds.length; i++) {
				var r = rounds[i];
				if(r.isAdd) {
					r.s.alpha += SPEED;
					if(r.s.alpha >= r.a)
						r.isAdd = false;
				} else {
					r.s.alpha -= SPEED;
				}
				if(r.s.alpha < 0) {
					container.removeChild(r.s);
					rounds.splice(i, 1);
					i--;
				}
			}
		});
	};

	// show map
	var map = parseMap(level);
	var storyLoopEnd = function(){
		// show me
		game.stage.addChild(mePicture);
		mePicture.x = map.startX;
		mePicture.y = map.startY;
		mePicture.gotoAndPlay('normal');
		// show map
		game.stage.addChild(map.picture);
		// update lights every tick
		var lights = map.lights;
		var lightsLayer = new createjs.Container().set({x:0,y:0});
		game.stage.addChild(lightsLayer);
		createjs.Ticker.addEventListener('tick', function(){
			// redraw lights
			lightsLayer.removeAllChildren();
			for(var i=0; i<lights.length; i++) {
				var a = lights[i];
				// random size
				var P_SIZE_STATE = 0.06;
				var P_CHANGE = 0.5;
				var SIZE_SPEED_MAX = 1;
				if(a.rmax > a.rmin) {
					if(Math.random() < P_SIZE_STATE) {
						var p = Math.random();
						if(p < P_CHANGE) {
							var p1 = (a.r-a.rmin)/(a.rori-a.rmin);
							if(a.rori === a.rmin)
								p1 = (a.r-a.rmin)*1e6;
							var p2 = (a.r-a.rmax)/(a.rori-a.rmax);
							if(a.rori === a.rmax)
								p2 = (a.r-a.rmax)*1e6;
							if(p/P_CHANGE < p1/(p1+p2))
								a.sizeState = -Math.random()*SIZE_SPEED_MAX*a.speed;
							else
								a.sizeState = Math.random()*SIZE_SPEED_MAX*a.speed;
						} else {
							a.sizeState = 0;
						}
					}
				}
				a.r += a.sizeState;
				if(a.r >= a.rmax) a.r = a.rmax;
				if(a.r <= a.rmin) a.r = a.rmin;
				// random moving
				var P_MOVE_STATE = 0.03;
				var MOVE_SPEED_MAX = 1;
				if(a.area) {
					if(Math.random() < P_MOVE_STATE) {
						var p = Math.random()*Math.PI*2;
						var q = Math.random()*a.area;
						var dx = Math.cos(p)*q + a.xori;
						var dy = Math.sin(p)*q + a.yori;
						var d = Math.sqrt( (dx-a.x)*(dx-a.x) + (dy-a.y)*(dy-a.y) );
						a.moveX = (dx-a.x)*MOVE_SPEED_MAX*a.speed/d;
						a.moveY = (dy-a.y)*MOVE_SPEED_MAX*a.speed/d;
					}
					a.x += a.moveX;
					a.y += a.moveY;
					if( (a.x-a.xori)*(a.x-a.xori) + (a.y-a.yori)*(a.y-a.yori) > a.area*a.area ) {
						a.x -= a.moveX;
						a.y -= a.moveY;
						a.moveX = 0;
						a.moveY = 0;
					}
				}
				// draw
				lightsLayer.addChild(generateLight(Math.round(a.r), a.x, a.y));
			}
		});
		// show clouds
		cloudsStart();
		// update every tick
		createjs.Ticker.addEventListener('tick', function(){
			game.stage.update();
		});
	};

	// TODO : DEBUG
	if(DEBUG.SKIP_TEXT) {
		storyLoopEnd();
		storyLoopEnd = function(){};
		if(DEBUG.SHOW_FPS) {
			var t = new createjs.Text('FPS: ...', '12px monospace', 'red');
			t.x = 0;
			t.y = 0;
			game.stage.addChild(t);
			createjs.Ticker.addEventListener('tick', function(){
				t.text = 'FPS: '+Math.round(createjs.Ticker.getMeasuredFPS());
			});
		}
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