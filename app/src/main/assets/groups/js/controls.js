/* Copyright 2025 - Herber eDevelopment - Jaroslav Herber */

// Android
function doKey( iKeyCode ) {
	document.dispatchEvent(new KeyboardEvent('keydown', {'keyCode': iKeyCode}));
}

var is = function(el, selector) {
	return (el.matches || el.matchesSelector || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector || el.oMatchesSelector).call(el, selector);
};


function initEvents() {

	getEl('list_container').addEventListener('click', function(oItem) {
		oItem = oItem.target.closest('li');
		if( oItem ) { clickOnListItem(oItem); }
	});

}


var aButtons = {
	'ChannelUp': 33,		// Page UP
	'ChannelDown': 34,		// Page Down
	'PreviousChannel': 8,	// Back
	'ChannelList': 2,
	'MediaPlay': 32,		// Space
	'MediaStop': 2,
	'MediaPause': 2,

	'Info': 72,		// H
	'E-Manual': 72,	// H
	'Guide': 72,	// H
	'Menu': 77,		// M
	'Tools': 77,	// M

	'ColorF0Red': 82,		// R
	'ColorF1Green': 71,		// G
	'ColorF2Yellow': 89,	// Y
	'ColorF3Blue': 66,		// B

	'BackButton': 27		// ESC
};

if( sDeviceFamily === 'Android' ) {
	aButtons['ChannelUp'] = 1011;
	aButtons['ChannelDown'] = 1012;
	aButtons['PreviousChannel'] = 1017;
	aButtons['ChannelList'] = 1013;
	aButtons['MediaPlay'] = 1014;
	aButtons['MediaStop'] = 1015;
	aButtons['MediaPause'] = 1016;

	aButtons['Info'] = 1005;
	aButtons['E-Manual'] = 1005;
	aButtons['Guide'] = 1006;
	aButtons['Menu'] = 1007;

	aButtons['ColorF0Red'] = 1001;
	aButtons['ColorF1Green'] = 1002;
	aButtons['ColorF2Yellow'] = 1003;
	aButtons['ColorF3Blue'] = 1004;

	aButtons['BackButton'] = 999;
}

if( sDeviceFamily === 'LG' ) {
	// https://webostv.developer.lge.com/design/webos-tv-system-ui/remote-control/
	aButtons['ColorF0Red'] = 403;
	aButtons['ColorF1Green'] = 404;
	aButtons['ColorF2Yellow'] = 405;
	aButtons['ColorF3Blue'] = 406; // also Guide
	aButtons['BackButton'] = 461;

	aButtons['Guide'] = 406; // Blue button
	// Page up/down are not supported in LG. Use arrows instead
	aButtons['ChannelUp'] = 38;
	aButtons['ChannelDown'] = 40;
	//aButtons['PreviousChannel'] = 40;
}

if( sDeviceFamily === 'Browser' ) {
	aButtons['ChannelUp'] = 38;		// Pfeil nach oben
	aButtons['ChannelDown'] = 40;	// Pfeil nach unten
}

if( sDeviceFamily === 'Samsung' && tizen ) {

	// tizen.tvinputdevice.getSupportedKeys();
	tizen.tvinputdevice.registerKeyBatch(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Info', 'E-Manual', 'Guide', 'Menu', 'Tools', 'ColorF0Red', 'ColorF1Green', 'ColorF2Yellow', 'ColorF3Blue']);
	tizen.tvinputdevice.registerKeyBatch(['ChannelUp', 'ChannelDown', 'PreviousChannel', 'ChannelList', 'MediaPlay', 'MediaStop', 'MediaPause']);

	aButtons = {
		'ChannelUp': tizen.tvinputdevice.getKey('ChannelUp').code,
		'ChannelDown': tizen.tvinputdevice.getKey('ChannelDown').code,
		'PreviousChannel': tizen.tvinputdevice.getKey('PreviousChannel').code,
		'ChannelList': tizen.tvinputdevice.getKey('ChannelList').code,

		'MediaPlay': tizen.tvinputdevice.getKey('MediaPlay').code,
		'MediaStop': tizen.tvinputdevice.getKey('MediaStop').code,
		'MediaPause': tizen.tvinputdevice.getKey('MediaPause').code,
		'MediaPlayPause': tizen.tvinputdevice.getKey('MediaPlayPause').code,

		'Info': tizen.tvinputdevice.getKey('Info').code,
		'E-Manual': tizen.tvinputdevice.getKey('E-Manual').code,
		'Guide': tizen.tvinputdevice.getKey('Guide').code,
		'Menu': tizen.tvinputdevice.getKey('Menu').code,
		'Tools': tizen.tvinputdevice.getKey('Tools').code,

		'Caption': tizen.tvinputdevice.getKey('Caption').code,
		'Teletext': tizen.tvinputdevice.getKey('Teletext').code,

		'ColorF0Red': tizen.tvinputdevice.getKey('ColorF0Red').code,
		'ColorF1Green': tizen.tvinputdevice.getKey('ColorF1Green').code,
		'ColorF2Yellow': tizen.tvinputdevice.getKey('ColorF2Yellow').code,
		'ColorF3Blue': tizen.tvinputdevice.getKey('ColorF3Blue').code,

		'BackButton': 27
	};

}


function initControls() {

	initEvents();

	// add eventListener for keydown
	document.addEventListener('keydown', function(e) {

		if( e.target.id === 'search_field' ) {
			return false;
		}

		var k = e.keyCode;
		e.preventDefault();

		if( bModalOpened ) {
			hideModal();
			return false;
		}

		// EPG overview opened
		switch( k ) {
			case 38: // UP
				oSelectedItem = moveListUp();
				break;
			case 40: // DOWN
				oSelectedItem = moveListDown();
				break;

			case 33: // PAGE UP
			case aButtons['ChannelUp']:
				oSelectedItem = moveListUp(10);
				break;
			case 34: // PAGE DOWN
			case aButtons['ChannelDown']:
				oSelectedItem = moveListDown(10);
				break;

			case 37: // LEFT
				//moveToList(-1);
				goBack();
				break;
			case 39: // RIGHT
			case 13: // OK button
				//moveToEpgOverviewItem('right');
				//moveToList(1);
				selectListItem();
				break;

			case aButtons['BackButton']:
			case 10009: // RETURN
			case 27:	// ESC
			case 113:	// F2 - backbutton in android
				goBack();
				break;
		}

		return false;

	});


}