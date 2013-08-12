'use strict';

// consts

var FPS = 25;
var WIDTH = 960;
var HEIGHT = 540;
var FONT = ' "文泉驿正黑","微软雅黑","黑体" ';
var USE_ADVANCED_LOADING = (location.protocol !== 'file:');
var STORAGE_ID = 'tomorrow';
var STORAGE_VERSION = 1;
var DEFAULT_SETTINGS = {
	version: STORAGE_VERSION,
	musicOn: true,
	volume: 100,
	curLevel: 0
};

// global vars

window.game = {};
game.settings = null;
game.stage = null;
game.curAudio = null;

// global funcs

game.saveSettings = function(){
	localStorage.tomorrow = JSON.stringify(game.settings);
};

game.createTextButton = function(text, fontSize, background, centerX, centerY, width, height, clickFunc){
	var button = new createjs.Container();
	var bg = new createjs.Shape();
	bg.graphics.s(background).f(background).r(-width/2, -height/2, width, height);
	button.addChild(bg,
		new createjs.Text(text, fontSize+'px'+FONT, '#888'),
		new createjs.Text(text, fontSize+'px'+FONT, '#00d2ff')
	);
	button.getChildAt(1).lineHeight = height;
	button.getChildAt(2).lineHeight = height;
	button.getChildAt(1).textAlign = 'center';
	button.getChildAt(2).textAlign = 'center';
	button.getChildAt(1).textBaseline = 'middle';
	button.getChildAt(2).textBaseline = 'middle';
	button.getChildAt(2).visible = false;
	button.x = centerX;
	button.y = centerY;
	button.addEventListener('mouseover', function(){
		button.getChildAt(2).visible = true;
		button.getChildAt(1).visible = false;
	});
	button.addEventListener('mouseout', function(){
		button.getChildAt(1).visible = true;
		button.getChildAt(2).visible = false;
	});
	button.addEventListener('click', clickFunc);
	return button;
};

// show cover

var showCover = function(res){

	//init
	createjs.Ticker.setFPS(FPS);
	game.stage.enableMouseOver(FPS);

	// show author logo
	var bottomBar = new createjs.Container();
	bottomBar.x = WIDTH/2;
	bottomBar.y = HEIGHT-30;
	game.stage.addChild(bottomBar);
	var lastleafLink = new createjs.Container();
	var bg = new createjs.Shape();
	bg.graphics.s('black').f('black').r(-5,-5,154,58);
	lastleafLink.addChild(bg,
		new createjs.Bitmap(res.getResult('lastleaf_grey')),
		new createjs.Bitmap(res.getResult('lastleaf'))
	);
	lastleafLink.getChildAt(1).alpha = 0.8;
	lastleafLink.getChildAt(2).visible = false;
	lastleafLink.x = -300;
	lastleafLink.y = -26;
	lastleafLink.addEventListener('mouseover', function(){
		lastleafLink.getChildAt(2).visible = true;
		lastleafLink.getChildAt(1).visible = false;
	});
	lastleafLink.addEventListener('mouseout', function(){
		lastleafLink.getChildAt(1).visible = true;
		lastleafLink.getChildAt(2).visible = false;
	});
	lastleafLink.addEventListener('click', function(){
		window.open('http://lastleaf.mistymiracle.org/', '_blank');
	});
	bottomBar.addChild(lastleafLink);

	// show license link
	var licenseLink = game.createTextButton('授权协议', 16, '#000', 190, 0, 72, 24, function(){
		window.open('license.html', '_blank');
	});
	bottomBar.addChild(licenseLink);

	// show about link
	var aboutLink = game.createTextButton('版本 0.1', 16, '#000', 290, 0, 72, 24, function(){
		window.open('change_logs.html', '_blank');
	});
	bottomBar.addChild(aboutLink);

	// show subtitle
	var subtitle = game.createTextButton('改编自同名短篇小说', 20, '#000', WIDTH/2, 420, 190, 30, function(){
		window.open('http://blog.programet.org/2010/04/%E6%98%8E%E5%A4%A9.html', '_blank');
	});
	game.stage.addChild(subtitle);

	// show title
	var titleImg = new createjs.Bitmap(res.getResult('title'));
	game.stage.addChild(titleImg);
	titleImg.x = titleImg.cx = (WIDTH - titleImg.image.width) / 2;
	titleImg.y = titleImg.cy = 40;
	titleImg.alpha = 0.8;

	// show progress bar
	var progressBar = new createjs.Container();
	var p = new createjs.Shape();
	p.graphics.f('#222').r(0, 0, 800, 3);
	var progressShape = new createjs.Shape();
	var progress = progressShape.graphics;
	progress.f('#888').r(0, 0, 0, 3);
	var progressText = new createjs.Text('正在加载资源……', '20px'+FONT, '#888');
	progressText.textAlign = 'center';
	progressText.textBaseline = 'middle';
	progressText.x = 400;
	progressText.y = 53;
	progressBar.addChild(
		p,
		progressShape,
		progressText
	);
	game.stage.addChild(progressBar);
	progressBar.textAlign = 'center';
	progressBar.x = (WIDTH-800) / 2;
	progressBar.y = 277;
	progressBar.isAlphaUp = false;

	// animation
	var centeredMoving = function(cur, center, radius, acc){
		var dest = (Math.random()-0.5)*radius*2 + center;
		return (dest-cur)*acc + cur;
	};
	var titleAni = function(){
		titleImg.x = centeredMoving(titleImg.x, titleImg.cx, 8, 0.06);
		titleImg.y = centeredMoving(titleImg.y, titleImg.cy, 8, 0.06);
		titleImg.alpha = centeredMoving(titleImg.alpha, 0.75, 0.25, 0.25);
		if(progressBar.isAlphaUp) {
			progressBar.alpha += 0.02;
			if(progressBar.alpha >= 1) progressBar.isAlphaUp = false;
		} else {
			progressBar.alpha -= 0.02;
			if(progressBar.alpha <= 0.5) progressBar.isAlphaUp = true;
		}
		game.stage.update();
	};
	createjs.Ticker.addEventListener('tick', titleAni);

	// start load main resource
	var q = new createjs.LoadQueue(USE_ADVANCED_LOADING, 'data/');
	q.installPlugin(createjs.Sound);
	q.addEventListener('progress', function(e){
		progress.c().f('#888').r(0, 0, e.progress*800, 3);
	});
	q.addEventListener('complete', function(){
		progress.c().f('#888').r(0, 0, 800, 3);
		// get results
		if(USE_ADVANCED_LOADING) {
			game.maps = q.getResult('maps');
			game.words = JSON.parse(q.getResult('words'));
		}
		// read settings
		try {
			game.settings = JSON.parse(localStorage[STORAGE_ID]);
			if(game.settings.version < STORAGE_VERSION)
				game.settings.version = STORAGE_VERSION;
		} catch(e) {
			game.settings = DEFAULT_SETTINGS;
		}
		// show music button
		var musicButtonOn = game.createTextButton('音乐：开', 20, '#000', WIDTH/2, 375, 90, 30, function(){
			musicButtonOn.visible = false;
			musicButtonOff.visible = true;
			game.settings.musicOn = false;
			musicButtonOff.dispatchEvent('mouseover');
		});
		var musicButtonOff = game.createTextButton('音乐：关', 20, '#000', WIDTH/2, 375, 90, 30, function(){
			musicButtonOff.visible = false;
			musicButtonOn.visible = true;
			game.settings.musicOn = true;
			musicButtonOn.dispatchEvent('mouseover');
		});
		var musicHint = function(){
			hint.show('“M”键可以开关音乐，“<”和“>”键调节音量', 3000);
		};
		musicButtonOn.addEventListener('mouseover', musicHint);
		musicButtonOff.addEventListener('mouseover', musicHint);
		musicButtonOn.addEventListener('mouseout', hint.hide);
		musicButtonOff.addEventListener('mouseout', hint.hide);
		if(game.settings.musicOn) {
			musicButtonOff.visible = false;
			musicButtonOn.visible = true;
		} else {
			musicButtonOn.visible = false;
			musicButtonOff.visible = true;
		}
		// show start button
		if(game.settings.curLevel)
			var t = '继续游戏';
		else
			var t = '开始游戏';
		var startButton = game.createTextButton(t, 20, '#000', WIDTH/2, 330, 90, 30, function(){
			// save settings
			game.saveSettings();
			// remove key bindings
			document.body.removeEventListener('keydown', coverKeyFunc);
			// fade-out everything
			var b = new createjs.Shape();
			b.graphics.f('black').r(0,0,WIDTH,HEIGHT);
			b.alpha = 0.005;
			game.stage.addChild(b);
			createjs.Ticker.addEventListener('tick', function(){
				if(b.alpha >= 1) {
					createjs.Ticker.removeAllEventListeners('tick');
					game.stage.removeAllChildren();
					game.stage.update();
					game.start();
				}
				b.alpha += 0.1;
			});
		});
		startButton.addEventListener('mouseover', function(){
			if(game.settings.curLevel)
				hint.show('游戏已进行至第 '+curLevel+' 关', 3000);
			else
				hint.show('开始新的游戏', 3000);
		});
		startButton.addEventListener('mouseout', function(){
			hint.hide();
		});
		// button animation
		musicButtonOn.alpha = 0;
		musicButtonOff.alpha = 0;
		startButton.alpha = 0;
		progressBar.removeChild(progressText);
		game.stage.addChild(musicButtonOn, musicButtonOff, startButton);
		createjs.Ticker.addEventListener('tick', function(){
			if(musicButtonOn.alpha >= 1) return;
			musicButtonOn.alpha += 0.1;
			musicButtonOff.alpha += 0.1;
			startButton.alpha += 0.1;
		});
		// keyboard control
		var coverKeyFunc = function(e){
			if(e.keyCode === 32) {
				startButton.dispatchEvent('mouseover');
				startButton.dispatchEvent('click');
			} else if(e.keyCode === 77) {
				if(musicButtonOn.visible) {
					musicButtonOn.dispatchEvent('click');
				} else {
					musicButtonOff.dispatchEvent('click');
				}
			} else if(e.keyCode === 188) {
				if(game.settings.volume > 0)
					game.settings.volume -= 10;
				hint.show('音量：'+game.settings.volume, 1000);
			} else if(e.keyCode === 190) {
				if(game.settings.volume < 100)
					game.settings.volume += 10;
				hint.show('音量：'+game.settings.volume, 1000);
			}
		};
		document.body.addEventListener('keydown', coverKeyFunc);
	});
	// load data using advanced loading, or directly load for simple loading
	if(USE_ADVANCED_LOADING) {
		q.loadFile({id:'maps', type:'text', src:'maps.data'});
		q.loadFile({id:'words', type:'text', src:'words.data'});
	} else {
		var xhr1 = new XMLHttpRequest();
		xhr1.addEventListener('load', function(){
			game.maps = xhr1.response;
		}, false);
		xhr1.open('GET', 'data/maps.data', false);
		xhr1.overrideMimeType('text/plain');
		xhr1.send();
		var xhr2 = new XMLHttpRequest();
		xhr2.addEventListener('load', function(){
			game.words = JSON.parse(xhr2.response);
		}, false);
		xhr2.open('GET', 'data/words.data', false);
		xhr2.overrideMimeType('text/plain');
		xhr2.send();
	}
	// load else
	q.loadManifest([
		{id:'bgm1', src:'audio/the_start_of_night.ogg|audio/the_start_of_night.mp3'},
		{id:'bgm2', src:'audio/tomorrow.ogg|audio/tomorrow.mp3'},
		{id:'bgm3', src:'audio/spreading_white.ogg|audio/spreading_white.mp3'},
		{id:'bgm4', src:'audio/tomorrow_short.ogg|audio/tomorrow_short.mp3'},
		{src:'js/levels.js'}
	]);

};

// start function

document.bindReady(function(){

	// check compatibility
	hint.show('正在检测浏览器兼容性……');
	if(HTML5Compatibility.unsupported('JavaScript/JSON', 'DOM/Canvas', 'DOM/Audio', 'DOM/LocalStorage', 'DOM/AddEventListener').length) {
		hint.show('你的浏览器不支持本游戏，请使用其他浏览器访问，或下载离线版本');
		return;
	}

	// init canvas
	document.getElementById('wrapper').innerHTML = '<canvas id="main_canvas" width="'+WIDTH+'" height="'+HEIGHT+'"></canvas>';
	game.stage = new createjs.Stage('main_canvas');

	// load title resource
	hint.show('正在载入页面……');
	var q = new createjs.LoadQueue(USE_ADVANCED_LOADING, 'data/');
	q.addEventListener('complete', function(){
		hint.hide();
		showCover(q);
	});
	q.loadManifest([
		{id:'title', src:'image/title.png'},
		{id:'lastleaf', src:'image/lastleaf.png'},
		{id:'lastleaf_grey', src:'image/lastleaf_grey.png'}
	]);

});