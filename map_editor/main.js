'use strict';

// map: 2D Array
var map = new Uint8Array(90*160);

// update canvas
var updateCanvas = function(){
	var context = $('#canvas')[0].getContext('2d');
	context.lineWidth = 0;
	for(var i=0; i<90; i++)
		for(var j=0; j<160; j++) {
			if(map[i*160+j])
				context.fillStyle = "#888";
			else
				context.fillStyle = "#000";
			context.fillRect(j, i, 1, 1);
		}
};

$(function(){
	// mouse drag
	var mouseStart = {
		ed: false,
		x: 0,
		y: 0
	};
	$('#canvas')
	.bind('contextmenu', function(e){
		e.preventDefault();
	})
	.mousedown(function(e){
		e.preventDefault();
		mouseStart.ed = true;
		var p = $(this).offset();
		mouseStart.x = Math.round((e.pageX - p.left)/6);
		mouseStart.y = Math.round((e.pageY - p.top)/6);
	})
	.mouseup(function(e){
		e.preventDefault();
		if(!mouseStart.ed) return;
		mouseStart.ed = false;
		var p = $(this).offset();
		var x1 = Math.round((e.pageX - p.left)/6);
		var y1 = Math.round((e.pageY - p.top)/6);
		var x2 = mouseStart.x;
		var y2 = mouseStart.y;
		for(var i=(y1<y2?y1:y2); i<=y1 || i<=y2; i++)
			for(var j=(x1<x2?x1:x2); j<=x1 || j<=x2; j++)
				map[i*160+j] = (e.button?0:1);
		updateCanvas();
	})
	.mouseout(function(e){
		e.preventDefault();
		mouseStart.ed = false;
	});

	// update canvas
	updateCanvas();
});