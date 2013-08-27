'use strict';

// consts

// graphics
var WIDTH = 960;
var HEIGHT = 540;
var ME_R = 12;
var LIGHT_R_MAX = 50*6;

// game
var ME_HP_MAX = [4000,2000,1200,800];
var LIGHTS_SPEED = [2,2.5,3,3.5];
var ME_MOVE_SPEED = 3;
var ME_ACTION_SPEED = 6; // no larger than 6
var ME_ACTION_DAMAGE = 4;
var ME_ACTION_DIF = Math.PI/8;
var ME_DAMAGE_PER_R = 1;

// debug
var DEBUG = {
	SKIP_TEXT: false,
	SHOW_FPS: true
};

// parse a map

var parseMap = function(level){
	var map = {};
	var a = game.maps[level].split('|');
	map.startX = a[1]*6;
	map.startY = a[2]*6;
	var endX = a[3].split(' ');
	var endY = a[4].split(' ');
	var i = Math.floor( Math.random() * endX.length );
	map.endX = endX[i]*6;
	map.endY = endY[i]*6;
	// special controls
	map.showEnd = false;
	if(endY[endX.length] === 'S' || endY[endX.length] === 'SW')
		map.showEnd = true;
	map.alwaysShowEnd = false;
	if(endY[endX.length] === 'A')
		map.alwaysShowEnd = true;
	map.white = false;
	if(endY[endX.length] === 'W' || endY[endX.length] === 'SW')
		map.white = true;
	// parse lights
	map.lights = [];
	var s = a[5].split(' ');
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
	if(!map.white)
		picture.cache(0,0,WIDTH,HEIGHT);
	else
		picture.cache(24,24,WIDTH-48,HEIGHT-48)
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

var generatePerson = function(color){
	// TODO : person not shown in chrome
	var ss = new createjs.SpriteSheetBuilder();
	var rmax = ME_R*0.75;
	var rmin = ME_R*0.25;
	var rout = ME_R*1.25;
	var rspeed = (rmax-rmin)/40;
	var frameCount = 41;
	var rect = new createjs.Rectangle(-rout, -rout, rout*2, rout*2);
	for(var i=rmax; i>rmin-(1e-6); i-=rspeed)
		ss.addFrame(generateRound(color,i,rout), rect);
	var frames = [];
	for(var i=0; i<frameCount/2; i++)
		frames.push(i);
	for(var i=Math.floor(frameCount/2)-2; i>0; i--)
		frames.push(i);
	ss.addAnimation('normal', frames, 'normal');
	var frames = [];
	for(var i=0; i<frameCount; i+=8)
		frames.push(i);
	for(var i=frameCount-4; i>0; i-=8)
		frames.push(i);
	ss.addAnimation('fast', frames, 'fast');
	return new createjs.BitmapAnimation(ss.build());
};

var whiteMap = (function(){
	var b = new createjs.Shape();
	b.graphics.f('rgb(128,128,128)').r(12,12,WIDTH-24,HEIGHT-24);
	b.filters = [ new createjs.BoxBlurFilter(12,12,1) ];
	b.cache(0,0,WIDTH,HEIGHT);
	return b;
})();

// user operations

var userCtrlReset = function(){
	userCtrl.paused = false;
	userCtrl.skip = false;
	userCtrl.reset = false;
	userCtrl.action = false;
	userCtrl.up = false;
	userCtrl.down = false;
	userCtrl.left = false;
	userCtrl.right = false;
};
var userCtrl = {
	paused: false,
	reset: false,
	skip: false,
	action: false,
	up: false,
	down: false,
	left: false,
	right: false
};

// pause and unpause

var pause = function(){
	userCtrl.paused = true;
};
var unpause = function(){
	userCtrl.paused = false;
};

// handling a level

var startLevel = function(level){
	if(!game.maps[level]) {
		game.curMusic = -1;
		var curVol = 1;
		var gameEnd = function(){
			curVol -= 0.04;
			if(game.settings.musicOn)
				createjs.Sound.setVolume(curVol*game.settings.volume/100);
			if(curVol <= 0) {
				if(level >= 0) {
					game.settings.curLevel = 0;
					game.saveSettings();
				}
				game.started = false;
				createjs.Sound.stop();
				createjs.Ticker.removeAllEventListeners('tick');
				game.mouseFuncRemove();
				window.removeEventListener('keydown', game.keyDownFunc);
				window.removeEventListener('keyup', game.keyUpFunc);
				game.showCover();
			}
		}
		createjs.Ticker.addEventListener('tick', gameEnd);
		return;
	}

	// switch music
	if(game.curMusic !== game.words[level].chapter) {
		var curVol = 1;
		var volDown = function(){
			curVol -= 0.04;
			if(curVol <= 0) {
				curVol = 0;
				// switch music
				createjs.Sound.stop();
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
		setTimeout(function(){
			storyLoopStart();
		}, 1000);
	}

	// story loop
	var storyLoopStart = function(){
		// show level words
		var story = game.words[level].story;
		var storyText = new createjs.Text();
		storyText.textAlign = 'center';
		storyText.textBaseline = 'middle';
		storyText.x = WIDTH/2;
		storyText.y = HEIGHT/2;
		storyText.filters = [ new createjs.BoxBlurFilter(1,1,1) ];
		storyText.cache(-480, -20, 960, 40);
		var storyContainer = new createjs.Container();
		game.stage.addChild(storyContainer);
		var i = 0;
		var isFadeIn = true;
		var FADE_ALPHA_MIN = -1;
		var FADE_ALPHA_STEP = 0.04;
		var FADE_ALPHA_MAX_STD = 1.25;
		var FADE_ALPHA_MAX_PER_CHAR = 0.15;
		storyContainer.alpha = -1;
		var fadeAlphaMax = 1;
		userCtrl.skip = false;
		var storyLoop = function(){
			if(i >= story.length || userCtrl.skip) {
				userCtrl.skip = false;
				if(i >= story.length || game.settings.levelReached >= level) {
					// end loop
					createjs.Ticker.removeEventListener('tick', storyLoop);
					game.stage.removeChild(storyContainer);
					storyLoopEnd();
					return;
				}
			}
			if(isFadeIn) {
				// init text
				if(storyContainer.alpha <= FADE_ALPHA_MIN) {
					storyContainer.removeAllChildren();
					if(story[i].charAt(0) === '!') {
						if(story[i].slice(0,5) === '!img:') {
							fadeAlphaMax = 8 * FADE_ALPHA_MAX_PER_CHAR + FADE_ALPHA_MAX_STD;
							var img = game.mainResource.getResult(story[i].slice(5));
							storyContainer.addChild( new createjs.Bitmap(img).set({
								x: (WIDTH-img.width)/2,
								y: (HEIGHT-img.height)/2
							}) );
						} else if(story[i].slice(0,8) === '!author:') {
							storyText.font = '24px'+game.lang.font;
							storyText.color = '#c0c0c0';
							storyText.text = story[i].slice(8);
							storyText.cache(-480, -40, 960, 80);
							fadeAlphaMax = story[i].length/2 * FADE_ALPHA_MAX_PER_CHAR + FADE_ALPHA_MAX_STD;
							storyContainer.addChild(storyText);
						} else if(story[i].slice(0,5) === '!her:') {
							storyText.font = '30px'+game.lang.font;
							storyText.color = '#FBB7BF';
							storyText.text = story[i].slice(5);
							storyText.cache(-480, -40, 960, 80);
							fadeAlphaMax = story[i].length * FADE_ALPHA_MAX_PER_CHAR + FADE_ALPHA_MAX_STD;
							storyContainer.addChild(storyText);
						}
					} else {
						storyText.font = '30px'+game.lang.font;
						storyText.color = '#c0c0c0';
						storyText.text = story[i];
						storyText.cache(-480, -20, 960, 40);
						fadeAlphaMax = story[i].length * FADE_ALPHA_MAX_PER_CHAR + FADE_ALPHA_MAX_STD;
						storyContainer.addChild(storyText);
					}
				}
				// fade in
				storyContainer.alpha += FADE_ALPHA_STEP;
				if(storyContainer.alpha >= fadeAlphaMax)
					isFadeIn = false;
			} else {
				// fade out
				storyContainer.alpha -= FADE_ALPHA_STEP;
				if(storyContainer.alpha <= FADE_ALPHA_MIN) {
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
			if(userCtrl.paused) return;
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
	var storyLoopEnd = function(){
		// save progress
		if(game.settings.levelReached < level)
			game.settings.levelReached = level;
		game.saveSettings();

		// show keys for mobile
		if(MOBILE)
			document.getElementById('keys').style.display = 'block';

		// init
		var meHpMax = ME_HP_MAX[game.settings.difficulty];
		var meHp = meHpMax;
		var map = parseMap(level);
		var mePicture = null;
		if(map.white)
			mePicture = generatePerson('#000');
		else
			mePicture = generatePerson('#808080');
		var lights = map.lights;
		userCtrlReset();

		// auto pause
		createjs.Ticker.addEventListener('tick', function(){
			if(!game.focused && !userCtrl.paused) {
				pause();
				userCtrl.up = false;
				userCtrl.down = false;
				userCtrl.left = false;
				userCtrl.right = false;
			}
		});

		// end level
		var levelEnd = function(endFunc){
			if(MOBILE) document.getElementById('keys').style.display = 'none';
			createjs.Ticker.removeAllEventListeners('tick');
			var fadingRect = (new createjs.Shape()).set({alpha: 0});
			fadingRect.graphics.f('black').r(0,0,WIDTH,HEIGHT);
			game.stage.addChild(fadingRect);
			var fadingAni = function(){
				if(fadingRect.alpha >= 1) {
					createjs.Ticker.removeEventListener('tick', fadingAni);
					game.stage.removeAllChildren();
					endFunc();
					return;
				}
				fadingRect.alpha += 0.02;
				game.stage.update();
			};
			createjs.Ticker.addEventListener('tick', fadingAni);
		};
		var resetLevel = function(){
			levelEnd(storyLoopEnd);
		};
		var doneLevel = function(){
			game.settings.curLevel++;
			levelEnd(function(){
				startLevel(game.settings.curLevel);
			});
		};
		var skipLevel = function(t){
			if(t < 0) {
				// return cover
				levelEnd(function(){
					startLevel(-1);
				});
			} else {
				// to level
				game.settings.curLevel = t;
				game.saveSettings();
				levelEnd(function(){
					startLevel(game.settings.curLevel);
				});
			}
		};

		// pause
		var pauseLayer = new createjs.Container();
		pauseLayer.addChild( new createjs.Shape(
			(new createjs.Graphics()).f('rgba(0,0,0,0.7)').r(0,0,WIDTH,HEIGHT)
		) );
		var pauseLayerFrame = new createjs.Container();
		pauseLayer.addChild(pauseLayerFrame);
		pauseLayerFrame.x = WIDTH/2 - 250;
		pauseLayerFrame.y = HEIGHT/2 - 150;
		var pauseLayerBackground = (new createjs.Shape(
			(new createjs.Graphics()).f('rgba(255,255,255,0.7)').r(0,0,500,300)
		)).set({filters: [ new createjs.BoxBlurFilter(10,10,1) ]});
		pauseLayerBackground.cache(-10,-10,520,320);
		pauseLayerFrame.addChild(pauseLayerBackground);
		pauseLayerFrame.addChild(new createjs.Shape(
			(new createjs.Graphics()).f('rgba(64,64,64,0.7)').r(30,80,440,3)
		));
		pauseLayerFrame.addChild( (new createjs.Text(game.str[23], '20px'+game.lang.font, 'black')).set({
			textAlign: 'center',
			textBaseline: 'top',
			x: 250,
			y: 40
		}) );
		pauseLayerFrame.addChild( (new createjs.Text(game.str[24], '16px'+game.lang.font, 'rgb(64,64,64)')).set({
			textAlign: 'center',
			textBaseline: 'bottom',
			x: 250,
			y: 270
		}) );
		var levelLinkFrame = new createjs.Container();
		pauseLayerFrame.addChild(levelLinkFrame);
		var levelLinkSelected = 0;
		var levelLink = function(centerX, centerY, text, selected){
			if(selected)
				levelLinkFrame.addChild( (new createjs.Shape(
					(new createjs.Graphics()).ss(2).s('rgb(128,128,128)').f('rgb(128,128,128)')
					.r(-20+centerX,-20+centerY,40,40)
				)) );
			else
				levelLinkFrame.addChild( (new createjs.Shape(
					(new createjs.Graphics()).ss(2).s('rgb(128,128,128)')
					.r(-20+centerX,-20+centerY,40,40)
				)) );
			levelLinkFrame.addChild( new createjs.Text(text, '16px'+game.lang.font, 'black').set({
				textAlign: 'center',
				textBaseline: 'middle',
				x: centerX,
				y: centerY
			}) );
		};
		var levelLinksUpdate = function(){
			levelLinkFrame.removeAllChildren();
			levelLink(75, 120, 0, !levelLinkSelected);
			for(var i=1; i<=game.settings.levelReached; i++) {
				var r = Math.floor((i-1)/6) + 1;
				var c = (i-1)%6 + 2;
				if(i === 19) {
					r = 3;
					c = 8;
				}
				levelLink(c*50+25, r*50+70, i, (i === levelLinkSelected));
			}
		};
		var pauseLayerShown = false;
		var pauseArrowKey = 3;
		createjs.Ticker.addEventListener('tick', function(){
			// show or hide frame
			if(userCtrl.paused && !pauseLayerShown) {
				game.stage.addChild(pauseLayer);
				pauseLayerShown = true;
				if(game.settings.musicOn)
					createjs.Sound.setVolume(game.settings.volume*0.003);
				levelLinkSelected = game.settings.curLevel;
				levelLinksUpdate();
				game.stage.update();
			} else if(!userCtrl.paused && pauseLayerShown) {
				game.stage.removeChild(pauseLayer);
				pauseLayerShown = false;
				if(game.settings.musicOn)
					createjs.Sound.setVolume(game.settings.volume/100);
			}
			if(!userCtrl.paused) {
				userCtrl.skip = false;
				return;
			}
			pauseArrowKey--;
			if(pauseArrowKey) return;
			pauseArrowKey = 3;
			// update level link
			if(userCtrl.up && levelLinkSelected>=7 && levelLinkSelected<=18)
				levelLinkSelected -= 6;
			if(userCtrl.down && levelLinkSelected>=1 && levelLinkSelected<=12 && levelLinkSelected<=game.settings.levelReached-6)
				levelLinkSelected += 6;
			if(userCtrl.left && levelLinkSelected>=1) levelLinkSelected--;
			if(userCtrl.right && levelLinkSelected<game.settings.levelReached) levelLinkSelected++;
			if(userCtrl.up || userCtrl.down || userCtrl.left || userCtrl.right) {
				levelLinksUpdate();
				game.stage.update();
			}
			// action or reset
			if(userCtrl.skip) {
				userCtrl.skip = false;
				if(levelLinkSelected === game.settings.curLevel) {
					setTimeout(function(){
						unpause();
						if(game.settings.musicOn)
							createjs.Sound.setVolume(game.settings.volume/100);
					}, 0);
				} else {
					setTimeout(function(){
						unpause();
						if(game.settings.musicOn)
							createjs.Sound.setVolume(game.settings.volume/100);
						skipLevel(levelLinkSelected);
					}, 0);
				}
			} else if(userCtrl.reset) {
				userCtrl.reset = false;
				setTimeout(function(){
					unpause();
					if(game.settings.musicOn)
						createjs.Sound.setVolume(game.settings.volume/100);
					skipLevel(-1);
				}, 0);
			}
		});

		// reset
		createjs.Ticker.addEventListener('tick', function(){
			if(userCtrl.paused || !userCtrl.reset) return;
			resetLevel();
			userCtrl.reset = false;
		});

		// calc hp
		createjs.Ticker.addEventListener('tick', function(){
			if(userCtrl.paused) return;
			if(userCtrl.action && level > 1) meHp -= ME_ACTION_DAMAGE;
			for(var i=0; i<lights.length; i++) {
				var a = lights[i];
				var dx = a.x - mePicture.x;
				var dy = a.y - mePicture.y;
				var d = Math.sqrt(dx*dx + dy*dy) - ME_R;
				if(d <= a.r) {
					if(a.r-d > ME_R*2)
						meHp -= ME_R*2*ME_DAMAGE_PER_R;
					else
						meHp -= (a.r-d)*ME_DAMAGE_PER_R;
				}
			}
			if(meHp <= 0) resetLevel();
			// check end
			var dx = map.endX - mePicture.x;
			var dy = map.endY - mePicture.y;
			if( dx*dx + dy*dy <= 4*ME_R*ME_R )
				doneLevel();
		});

		// handling moves
		var actionAni = false;
		createjs.Ticker.addEventListener('tick', function(){
			if(userCtrl.paused) return;
			// move
			var x = 0;
			var y = 0;
			if(userCtrl.up) y--;
			if(userCtrl.down) y++;
			if(userCtrl.left) x--;
			if(userCtrl.right) x++;
			if(userCtrl.action && level > 1) {
				// allow run from level 2
				if(!actionAni) {
					actionAni = true;
					mePicture.gotoAndPlay('fast');
				}
				if(x !== 0 || y !== 0) {
					var p = 0;
					if(y === 0 && x === 1) p = 0;
					else if(y === 0 && x === -1) p = Math.PI;
					else if(x === 0) p = Math.PI/2;
					else if(x === -1) p = Math.PI*3/4;
					else if(x === 1) p = Math.PI/4;
					if(y === -1) p = -p;
					p += Math.random()*ME_ACTION_DIF*2 - ME_ACTION_DIF;
					x = ME_ACTION_SPEED * Math.cos(p);
					y = ME_ACTION_SPEED * Math.sin(p);
				}
			} else {
				// standard move
				if(actionAni) {
					actionAni = false;
					mePicture.gotoAndPlay('normal');
				}
				x *= ME_MOVE_SPEED;
				y *= ME_MOVE_SPEED;
				if(x !== 0 && y !== 0) {
					x /= 1.4142136;
					y /= 1.4142136;
				}
			}
			// check walls
			if(x || y) {
				var px = mePicture.x + x;
				var py = mePicture.y + y;
				var checkWall = function(x, y){
					if(x < ME_R || y < ME_R || x >= WIDTH-ME_R || y >= HEIGHT-ME_R) return true;
					return map.block[ Math.floor(x/6) + Math.floor(y/6)*160 ];
				};
				if(checkWall(px, py)) {
					if(!checkWall(mePicture.x + x, mePicture.y)) {
						if(y > 0) py = (Math.floor(py/6))*6 - 1e-3;
						else if(y < 0) py = (Math.floor(py/6)+1)*6;
					} else if(!checkWall(mePicture.x, mePicture.y + y)) {
						if(x > 0) px = (Math.floor(px/6))*6 - 1e-3;
						else if(x < 0) px = (Math.floor(px/6)+1)*6;
					} else {
						if(x > 0) px = (Math.floor(px/6))*6 - 1e-3;
						else if(x < 0) px = (Math.floor(px/6)+1)*6;
						if(y > 0) py = (Math.floor(py/6))*6 - 1e-3;
						else if(y < 0) py = (Math.floor(py/6)+1)*6;
					}
				}
				mePicture.x = px;
				mePicture.y = py;
			}
		});

		// show me and map
		if(map.white) {
			game.stage.addChild(map.picture);
			game.stage.addChild(whiteMap);
		}
		game.stage.addChild(mePicture);
		mePicture.x = map.startX;
		mePicture.y = map.startY;
		mePicture.gotoAndPlay('normal');
		if(!map.white)
			game.stage.addChild(map.picture);

		// show end if needed
		if(map.showEnd || map.alwaysShowEnd) {
			var endPicture = generatePerson('#FBB7BF');
			game.stage.addChild(endPicture);
			endPicture.x = map.endX;
			endPicture.y = map.endY;
				endPicture.gotoAndPlay('normal');
			if(map.showEnd) {
				endPicture.alpha = 4;
				var endAni = function(){
					endPicture.alpha -= 0.02;
					if(endPicture.alpha <= 0) {
						createjs.Ticker.removeEventListener('tick', endAni);
						game.stage.removeChild(endPicture);
					}
				};
				createjs.Ticker.addEventListener('tick', endAni);
			}
		}

		// update lights
		var lightsLayer = new createjs.Container().set({x:0,y:0});
		game.stage.addChild(lightsLayer);
		var lightsSpeed = LIGHTS_SPEED[game.settings.difficulty];
		createjs.Ticker.addEventListener('tick', function(){
			if(userCtrl.paused) return;
			// redraw lights
			lightsLayer.removeAllChildren();
			for(var i=0; i<lights.length; i++) {
				var a = lights[i];
				// random size
				var P_SIZE_STATE = 0.06;
				var P_CHANGE = 0.5;
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
								a.sizeState = -Math.random()*lightsSpeed*a.speed;
							else
								a.sizeState = Math.random()*lightsSpeed*a.speed;
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
				if(a.area) {
					if(Math.random() < P_MOVE_STATE) {
						var p = Math.random()*Math.PI*2;
						var q = Math.random()*a.area;
						var dx = Math.cos(p)*q + a.xori;
						var dy = Math.sin(p)*q + a.yori;
						var d = Math.sqrt( (dx-a.x)*(dx-a.x) + (dy-a.y)*(dy-a.y) );
						a.moveX = (dx-a.x)*lightsSpeed*a.speed/d;
						a.moveY = (dy-a.y)*lightsSpeed*a.speed/d;
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
		if(!MOBILE)
			cloudsStart();

		// show hp from level 1
		if(level > 0) {
			var hpBackground = new createjs.Shape();
			hpBackground.graphics.f('black').r(0,0,8,100);
			hpBackground.filters = [ new createjs.BoxBlurFilter(3,3,1) ];
			hpBackground.cache(-7,-7,22,114);
			var hpOutline = new createjs.Shape();
			hpOutline.graphics.ss(1).s('#fff').f('black').r(0,0,8,100);
			hpOutline.cache(0,0,8,100);
			var hpShape = new createjs.Shape();
			hpShape.graphics.f('#fff').r(0,0,8,100);
			var hpPicture = new createjs.Container().set({x:50, y:50, alpha:0.3});
			if(map.white) whiteMap.alpha = 1.3 - hpPicture.alpha;
			hpPicture.addChild(hpBackground);
			hpPicture.addChild(hpOutline);
			hpPicture.addChild(hpShape);
			game.stage.addChild(hpPicture);
			var meHpOri = meHp;
			var hpShapeAni = 0;
			var HP_SHAPE_ANI_SPEED = 0.03;
			createjs.Ticker.addEventListener('tick', function(){
				if(userCtrl.paused) return;
				if(hpPicture.alpha <= 0.3)
					hpShapeAni = 0;
				if(meHp < meHpOri) {
					meHpOri = meHp;
					var h = 100*meHp/meHpMax;
					if(h > 0)
						hpShape.graphics.c().f('#fff').r(0,100-h,8,h);
					else
						hpShape.graphics.c();
					if(hpShapeAni <= 0) hpShapeAni = 1;
				}
				if(hpPicture.alpha >= 0.8)
					hpShapeAni = -1;
				if(hpShapeAni === 1) {
					hpPicture.alpha += HP_SHAPE_ANI_SPEED;
					if(map.white) whiteMap.alpha = 1.3 - hpPicture.alpha;
				} else if(hpShapeAni === -1) {
					hpPicture.alpha -= HP_SHAPE_ANI_SPEED;
					if(map.white) whiteMap.alpha = 1.3 - hpPicture.alpha;
				}
			});
		}

		// fade in
		var fadingRect = new createjs.Shape().set({alpha: 1});
		fadingRect.graphics.f('black').r(0,0,WIDTH,HEIGHT);
		game.stage.addChild(fadingRect);
		var fadingAni = function(){
			if(userCtrl.paused) return;
			if(fadingRect.alpha <= 0) {
				createjs.Ticker.removeEventListener('tick', fadingAni);
				game.stage.removeChild(fadingRect);
				return;
			}
			fadingRect.alpha -= 0.04;
		};
		createjs.Ticker.addEventListener('tick', fadingAni);

		// update every tick
		createjs.Ticker.addEventListener('tick', function(){
			if(userCtrl.paused) return;
			game.stage.update();
		});

		// show hint
		if(game.words[level].hint)
			hint.show(game.words[level].hint, 5000);

		// TODO : DEBUG
		if(DEBUG.SHOW_FPS) {
			var t = new createjs.Text('FPS: ...', '12px monospace', 'red');
			t.x = 0;
			t.y = 0;
			game.stage.addChild(t);
			createjs.Ticker.addEventListener('tick', function(){
				t.text = 'FPS: '+Math.round(createjs.Ticker.getMeasuredFPS());
			});
		}
	};

};

// init game ctrls

game.started = false;

game.start = function(){
	if(game.started) return;
	game.started = true;

	// update volume
	var updateVolume = function(){
		if(game.settings.musicOn) {
			createjs.Sound.setVolume(game.settings.volume/100);
			hint.show(game.str[25]+game.settings.volume, 1000);
		} else {
			createjs.Sound.setVolume(0);
			hint.show(game.str[26], 1000);
		}
		game.saveSettings();
	};

	// keyboard event handlers

	var keyPause = function(){
		if(userCtrl.paused) unpause();
		else pause();
	};
	var keyReset = function(){
		userCtrl.reset = true;
	};
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
	var keySkip = function(){
		userCtrl.skip = true;
	};
	var keyStartAction = function(){};
	var keyStartUp = function(){
		userCtrl.up = true;
	};
	var keyStartDown = function(){
		userCtrl.down = true;
	};
	var keyStartLeft = function(){
		userCtrl.left = true;
	};
	var keyStartRight = function(){
		userCtrl.right = true;
	};
	var keyEndAction = function(){
		if(!userCtrl.paused)
			userCtrl.action = !userCtrl.action;
	};
	var keyEndUp = function(){
		userCtrl.up = false;
	};
	var keyEndDown = function(){
		userCtrl.down = false;
	};
	var keyEndLeft = function(){
		userCtrl.left = false;
	};
	var keyEndRight = function(){
		userCtrl.right = false;
	};

	var keyDownFunc = {
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
		19: keyPause,
		27: keyPause,
		80: keyPause,
		77: keyMusicOn,
		188: keyVolumeDown,
		190: keyVolumeUp,
		13: keySkip,
		82: keyReset,
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

	// mouse event
	if(MOBILE) {
		document.getElementById('key_up').addEventListener('touchstart', keyStartUp, false);
		document.getElementById('key_up').addEventListener('touchend', keyEndUp, false);
		document.getElementById('key_down').addEventListener('touchstart', keyStartDown, false);
		document.getElementById('key_down').addEventListener('touchend', keyEndDown, false);
		document.getElementById('key_left').addEventListener('touchstart', keyStartLeft, false);
		document.getElementById('key_left').addEventListener('touchend', keyEndLeft, false);
		document.getElementById('key_right').addEventListener('touchstart', keyStartRight, false);
		document.getElementById('key_right').addEventListener('touchend', keyEndRight, false);
		document.getElementById('key_space').addEventListener('touchstart', keyStartAction, false);
		document.getElementById('key_space').addEventListener('touchend', keyEndAction, false);
		document.getElementById('key_pause').addEventListener('touchend', keyPause, false);
		document.getElementById('key_enter').addEventListener('touchend', keySkip, false);
		game.mouseFuncRemove = function(){
			document.getElementById('key_up').removeEventListener('touchstart', keyStartUp);
			document.getElementById('key_up').removeEventListener('touchend', keyEndUp);
			document.getElementById('key_down').removeEventListener('touchstart', keyStartDown);
			document.getElementById('key_down').removeEventListener('touchend', keyEndDown);
			document.getElementById('key_left').removeEventListener('touchstart', keyStartLeft);
			document.getElementById('key_left').removeEventListener('touchend', keyEndLeft);
			document.getElementById('key_right').removeEventListener('touchstart', keyStartRight);
			document.getElementById('key_right').removeEventListener('touchend', keyEndRight);
			document.getElementById('key_space').removeEventListener('touchstart', keyStartAction);
			document.getElementById('key_space').removeEventListener('touchend', keyEndAction);
			document.getElementById('key_pause').removeEventListener('touchend', keyPause);
			document.getElementById('key_enter').removeEventListener('touchend', keySkip);
		};
	}

	// basic listeners
	game.keyDownFunc = function(e){
		if(keyDownFunc[e.keyCode]) {
			keyDownFunc[e.keyCode]();
			e.preventDefault();
		}
	};
	window.addEventListener('keydown', game.keyDownFunc, false);
	game.keyUpFunc = function(e){
		if(keyUpFunc[e.keyCode]) {
			keyUpFunc[e.keyCode]();
			e.preventDefault();
		}
	};
	window.addEventListener('keyup', game.keyUpFunc, false);
	game.blurFunc = function(e){
		pause();
	};

	// enter level
	game.stage.enableMouseOver(0);
	startLevel(game.settings.curLevel);

};