'use strict';

// consts

var WIDTH = 960;
var HEIGHT = 540;
var USE_ADVANCED_LOADING = (location.protocol !== 'file:');
var STORAGE_ID = 'tomorrow';
var STORAGE_VERSION = 1;
var FONT = ' "文泉驿正黑","微软雅黑","黑体" ';

// global vars

window.game = {};
game.settings = null;
game.stage = null;
game.volume = 1;
game.curAudio = null;

// global funcs

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

	// show author logo
	var lastleafLink = new createjs.Container();
	var bg = new createjs.Shape();
	bg.graphics.s('black').f('black').r(-5,-5,154,58);
	lastleafLink.addChild(bg,
		new createjs.Bitmap(res.getResult('lastleaf_grey')),
		new createjs.Bitmap(res.getResult('lastleaf'))
	);
	lastleafLink.getChildAt(1).alpha = 0.8;
	lastleafLink.getChildAt(2).visible = false;
	game.stage.addChild(lastleafLink);
	lastleafLink.x = (WIDTH - 144) / 2;
	lastleafLink.y = HEIGHT - 48 - 20;
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
	game.stage.enableMouseOver();

	// show subtitle
	var subtitle = game.createTextButton('改编自同名短篇小说', 20, '#000', WIDTH/2, 430, 190, 30, function(){
		window.open('http://blog.programet.org/2010/04/%E6%98%8E%E5%A4%A9.html', '_blank');
	});
	game.stage.addChild(subtitle);

	// show title
	var titleImg = new createjs.Bitmap(res.getResult('title'));
	game.stage.addChild(titleImg);
	titleImg.x = titleImg.cx = (WIDTH - titleImg.image.width) / 2;
	titleImg.y = titleImg.cy = 50;
	titleImg.alpha = 0.8;

	// show progress bar
	var progressBar = new createjs.Container();
	var p = new createjs.Shape();
	p.graphics.f('#222').r(0, 0, 800, 3);
	var progressShape = new createjs.Shape();
	var progress = progressShape.graphics;
	progress.f('#888').r(0, 0, 0, 3);
	progressBar.addChild(p, progressShape);
	game.stage.addChild(progressBar);
	progressBar.textAlign = 'center';
	progressBar.x = (WIDTH-800) / 2;
	progressBar.y = 287;
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
		// read settings
		try {
			game.settings = JSON.parse(localStorage[STORAGE_ID]);
			if(game.settings.version < STORAGE_VERSION)
				game.settings.version = STORAGE_VERSION;
		} catch(e) {
			game.settings = {
				version: STORAGE_VERSION
			};
			game.settings.musicOn = true;
		}
		// show buttons
		var musicButtonOn = game.createTextButton('音乐：开', 20, '#000', WIDTH/2, 385, 90, 30, function(){
			musicButtonOn.visible = false;
			musicButtonOff.visible = true;
			game.settings.musicOn = false;
			musicButtonOff.dispatchEvent('mouseover');
		});
		var musicButtonOff = game.createTextButton('音乐：关', 20, '#000', WIDTH/2, 385, 90, 30, function(){
			musicButtonOff.visible = false;
			musicButtonOn.visible = true;
			game.settings.musicOn = true;
			musicButtonOn.dispatchEvent('mouseover');
		});
		if(game.settings.musicOn) {
			musicButtonOff.visible = false;
			musicButtonOn.visible = true;
		} else {
			musicButtonOn.visible = false;
			musicButtonOff.visible = true;
		}
		var startButton = game.createTextButton('开始游戏', 20, '#000', WIDTH/2, 340, 90, 30, function(){
			document.head.appendChild(q.getResult('levels'));
		});
		game.stage.addChild(musicButtonOn, musicButtonOff, startButton);
	});
	q.loadManifest([
		{id:'bgm1', src:'audio/the_start_of_night.ogg|audio/the_start_of_night.mp3'},
		{id:'bgm2', src:'audio/tomorrow.ogg|audio/tomorrow.mp3'},
		{id:'bgm3', src:'audio/spreading_white.ogg|audio/spreading_white.mp3'},
		{id:'bgm4', src:'audio/tomorrow.ogg|audio/tomorrow.mp3'},
		{id:'levels', src:'js/levels.js'}
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