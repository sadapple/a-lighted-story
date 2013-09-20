var fs = require('fs');
var exec = require('child_process').exec;
var UglifyJS = require("uglify-js");
var UglifyCSS = require("uglifycss/uglifycss-lib");

// remove prev generated dir
var removeDir = function(dir){
	var files = fs.readdirSync(dir);
	for(var i=0; i<files.length; i++) {
		var file = dir+'/'+files[i];
		if(fs.statSync(file).isDirectory())
			removeDir(file);
		else
			fs.unlinkSync(file);
	}
	fs.rmdirSync(dir);
};
if(fs.existsSync('game'))
	removeDir('game');

// generate web version
var generateWebDir = function(srcDir, destDir){
	fs.mkdirSync(destDir);
	var files = fs.readdirSync(srcDir);
	for(var i=0; i<files.length; i++) {
		var src = srcDir+'/'+files[i];
		var dest = destDir+'/'+files[i];
		// svg and hidden files: ignore
		if(src.slice(-4) === '.svg' || src.slice(0,1) === '.')
			continue;
		// dir: copy
		if(fs.statSync(src).isDirectory()) {
			generateWebDir(src, dest);
			continue;
		}
		// js: uglifyjs
		if(src.slice(-3) === '.js' && src.slice(-7) !== '.min.js') {
			var result = UglifyJS.minify(src);
			fs.writeFileSync(dest, result.code);
			console.log('Compressed "'+src+'", '+result.code.length+ ' Bytes.');
			continue;
		}
		// json: parse and stringify
		if(src.slice(-5) === '.json') {
			var str = JSON.stringify(JSON.parse(fs.readFileSync(src, 'utf8')));
			fs.writeFileSync(dest, str);
			console.log('Compressed "'+src+'", '+str.length+ ' Bytes.');
			continue;
		}
		// css: uglifycss
		if(src.slice(-4) === '.css') {
			var str = UglifyCSS.processFiles([src], {
				maxLineLen: 0,
				expandVars: false,
				cuteComments: true
			});
			fs.writeFileSync(dest, str);
			console.log('Compressed "'+src+'", '+str.length+ ' Bytes.');
			continue;
		}
		// default: copy
		var BUFFER_LEN = 64*1024;
		var buffer = new Buffer(BUFFER_LEN);
		var fr = fs.openSync(src, 'r');
		var fw = fs.openSync(dest, 'w');
		var c = 0;
		while( (c = fs.readSync(fr, buffer, 0, BUFFER_LEN)) > 0 )
			fs.writeSync(fw, buffer, 0, c);
		fs.closeSync(fr);
		fs.closeSync(fw);
	}
}
generateWebDir('src', 'game');

// combine js
var COMBINE_JS = ['game/data/js/utils.js','game/data/js/main.js','game/data/js/langs.js'];
var COMBINE_JS_DEST = 'game/data/js/script.min.js';
fs.writeFileSync(COMBINE_JS_DEST, '// Copyright 2013 LastLeaf, MIT LICENSE');
for(var i=0; i<COMBINE_JS.length; i++) {
	var str = fs.readFileSync(COMBINE_JS[i], 'utf8');
	fs.appendFileSync(COMBINE_JS_DEST, '\n'+str);
	fs.unlinkSync(COMBINE_JS[i]);
}
var str = fs.readFileSync('game/index.html', 'utf8');
str = str.replace(/\r?\n\t*\<script type\=\"text\/javascript\" src\=\"data\/js\/(utils|langs).js\"\>\<\/script\>/g, '');
str = str.replace(/\<script type\=\"text\/javascript\" src\=\"data\/js\/main.js\"\>\<\/script\>/, '<script type="text/javascript" src="data/js/script.min.js"></script>');
fs.writeFileSync('game/index.html', str);
console.log('Scripts combined to "game/data/js/script.min.js".');

// generate win32 version
if(!fs.existsSync('win32/xulrunner')) {
	console.log('"win32/xulrunner" does not exists. Win32 version is not generated.');
} else {
	var WIN32_FILE_NAME = 'Tomorrow_windows.zip';
	if(fs.existsSync(WIN32_FILE_NAME))
		fs.unlinkSync(WIN32_FILE_NAME);
	if(!fs.existsSync('win32/html'))
		fs.renameSync('game', 'win32/html');
	process.chdir('win32');
	exec('zip -9 -r ../'+WIN32_FILE_NAME+' * -x .gitignore profile/ html/data/audio/\*.mp3 html/kongregate*', function(error){
		process.chdir('..');
		if(!fs.existsSync('game'))
			fs.renameSync('win32/html', 'game');
		if(error)
			console.log('An error occurred. Win32 version is not generated.');
		else
			console.log('Win32 version is generated.');
	});
}
