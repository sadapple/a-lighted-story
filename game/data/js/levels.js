'use strict';
(function(){

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
		77: keyPause,
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
		keyDownFunc[e.keyCode]();
	}, false);
	window.addEventListener('keydown', function(e){
		keyUpFunc[e.keyCode]();
	}, false);
	window.addEventListener('blur', function(e){
		pause();
	}, false);

})();