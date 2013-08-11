'use strict';

// consts

var WIDTH = 960;
var HEIGHT = 540;
var USE_ADVANCED_LOADING = (location.protocol !== 'file:');
var FONT = ' "文泉驿正黑","微软雅黑","黑体" ';

// global vars

var stage = null;
var bgmVolume = 1;
var curBgm = null;

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
	stage.addChild(lastleafLink);
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
	stage.enableMouseOver();

	// show subtitle
	var subtitle = new createjs.Container();
	var bg = new createjs.Shape();
	bg.graphics.s('black').f('black').r(-95,-5,190,30);
	subtitle.addChild(bg,
		new createjs.Text('改编自同名短篇小说', '20px'+FONT, '#888'),
		new createjs.Text('改编自同名短篇小说', '20px'+FONT, '#00d2ff')
	);
	stage.addChild(subtitle);
	subtitle.getChildAt(1).textAlign = 'center';
	subtitle.getChildAt(2).textAlign = 'center';
	subtitle.x = WIDTH/2;
	subtitle.y = 420;
	subtitle.getChildAt(2).visible = false;
	subtitle.addEventListener('mouseover', function(){
		subtitle.getChildAt(2).visible = true;
		subtitle.getChildAt(1).visible = false;
	});
	subtitle.addEventListener('mouseout', function(){
		subtitle.getChildAt(1).visible = true;
		subtitle.getChildAt(2).visible = false;
	});
	subtitle.addEventListener('click', function(){
		window.open('http://blog.programet.org/2010/04/%E6%98%8E%E5%A4%A9.html', '_blank');
	});

	// show title
	var titleImg = new createjs.Bitmap(res.getResult('title'));
	stage.addChild(titleImg);
	titleImg.x = titleImg.cx = (WIDTH - titleImg.image.width) / 2;
	titleImg.y = titleImg.cy = 50;
	titleImg.alpha = 0.8;

	// show progress bar
	var progressBar = new createjs.Text('—— 不久之后到来 ——', '20px'+FONT, '#888');
	stage.addChild(progressBar);
	progressBar.textAlign = 'center';
	progressBar.x = WIDTH/2;
	progressBar.y = 300;
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
		stage.update();
	};
	createjs.Ticker.addEventListener('tick', titleAni);

	// start load main resource
	hint.show('正在载入资源……');
	var q = new createjs.LoadQueue(USE_ADVANCED_LOADING, 'data/');
	q.installPlugin(createjs.Sound);
	q.addEventListener('fileload', function(e){
		if(e.item.src !== 'audio/the_start_of_night.ogg' && e.item.src !== 'audio/the_start_of_night.mp3') return;
		if(curBgm) return;
		curBgm = createjs.Sound.play('titleBgm', createjs.Sound.INTERRUPT_ANY, 1000, 0, -1, bgmVolume*0.4);
		var ib = curBgm;
		var iv = bgmVolume*0.4;
		var io = setInterval(function(){
			if(ib !== curBgm) {
				clearInterval(io);
				return;
			}
			iv += 0.2;
			ib.setVolume(iv);
			if(iv >= 1) {
				clearInterval(io);
			}
		}, 2000);
	});
	q.addEventListener('complete', function(){
		hint.hide();
		//resourceLoaded(q);
	});
	q.loadManifest([
		{id:'titleBgm', src:'audio/the_start_of_night.ogg|audio/the_start_of_night.mp3'}
	]);

};

// start function

document.bindReady(function(){

	// check compatibility
	hint.show('正在检测浏览器兼容性……');
	if(HTML5Compatibility.unsupported('DOM/Canvas', 'DOM/Audio', 'DOM/LocalStorage').length) {
		hint.show('你的浏览器不支持本游戏，请使用其他浏览器访问，或下载离线版本');
		return;
	}

	// init canvas
	document.getElementById('wrapper').innerHTML = '<canvas id="main_canvas" width="'+WIDTH+'" height="'+HEIGHT+'"></canvas>';
	stage = new createjs.Stage('main_canvas');

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