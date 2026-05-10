/*

	Copyright 2026 - Herber eDevelopment - Jaroslav Herber
	All rights reserved.

	This code is proprietary and confidential.
	Copying, modification, distribution, or use of this code without explicit permission is strictly prohibited.

*/

var AppSettings = {
    storageKey: 'settings',
    settings: {},

    init: function() {
        this.loadSettings();
		this.applyAction('color');
		this.applyAction('font-size');
    },

    loadSettings: function() {
        var savedSettings = localStorage.getItem(this.storageKey);
        if( savedSettings ) {
			this.settings = JSON.parse(savedSettings);
		} else {
			openSettings();
		}
    },

	saveSettings: function() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    },

	updateSetting: function( sKey, sValue, sType ) {
		if( !sType ) { sType = 'hidden'; }
		this.settings[sKey] = {type: sType, value: sValue};
		this.saveSettings();
		this.applyAction(sKey);
		return true;
    },

	applyAction: function( sKey ) {
		var sValue = this.getSetting(sKey);
		switch( sKey ) {
			case 'color':
				applyTheme(sValue);
				break;
			case 'font-size':
				applyFontsize(sValue);
				break;
		}
	},

    getSetting: function( sKey, sDefaultValue ) {
		if( this.settings[sKey] ) {
			return this.settings[sKey].value;
		}

		if( typeof(sDefaultValue) !== 'undefined' ) {
			return sDefaultValue;
		}

        return '';
    },

	getNumberSetting( sKey, sDefaultValue ) {
		return parseInt(this.getSetting(sKey, sDefaultValue));
	},

	isActive( sKey ) {
		if( this.settings[sKey] && this.settings[sKey].type === 'checkbox' ) {
			return this.settings[sKey].value === 'on';
		}

		return false;
	}
};


function openSettings( sMenu ) {

	stopStream();
	document.body.classList.add('booting');
	setBootStatusText('Loading settings');

	var sUrl = "../settings/index.html";
	if( sMenu ) {
		sUrl += '#' + sMenu;
	}
	window.location.href = sUrl;
}


function applyBufferSetting() {

	var iBufferLength = AppSettings.getNumberSetting('buffer', 15);

	switch( sDeviceFamily ) {
		case 'Browser':
		case 'LG':
			if( oHlsApi ) {
				//oHlsApi.config.maxMaxBufferLength = '30s';
				//oHlsApi.config.liveSyncDuration = 7;
				//oHlsApi.config.debug = true;
				//oHlsApi.config.testBandwidth = false;
				//oHlsApi.config.liveSyncDuration = 6;
				//debug('apply test config');

				oHlsApi.config.maxBufferLength = iBufferLength;
				oHlsApi.config.maxBufferSize = iBufferLength * 2000000;
			}
			break;
		case 'Samsung':

			var sState = webapis.avplay.getState();
			if( sState === 'PLAYING' ) {
				webapis.avplay.stop();
				sState = webapis.avplay.getState();
				//debug('applyBufferSetting stop stream. Status: ' + sState);
			}

			if( sState === 'IDLE' ) {
				// https://msx.benzac.de/wiki/index.php?title=Tizen_Player#Syntax
				// this crashes some channels :(
				//webapis.avplay.setStreamingProperty("PREBUFFER_MODE", (iBufferLength * 1000).toString());
				webapis.avplay.setTimeoutForBuffering(iBufferLength);

				// For the initial buffering
				webapis.avplay.setBufferingParam("PLAYER_BUFFER_FOR_PLAY", "PLAYER_BUFFER_SIZE_IN_SECOND", iBufferLength);  // in seconds
				// For the rebuffering
				webapis.avplay.setBufferingParam("PLAYER_BUFFER_FOR_RESUME", "PLAYER_BUFFER_SIZE_IN_SECOND", iBufferLength + 15);  // in seconds
				//debug('applyBufferSetting OK');
			}

			break;
		case 'Android':
			m3uConnector.setBufferLength(iBufferLength);
			break;
	}

}


function getBufferSetting() {
	return AppSettings.getNumberSetting('buffer', 15);
}


function getUserAgentSetting() {
	return AppSettings.getSetting('user-agent', sUserAgent);
}


function setCameraCutoutSetting( sValue ) {
	AppSettings.updateSetting('camera-cutout', sValue, 'checkbox');
	switchCameraCutout(sValue);
}

function getCameraCutoutSetting() {
	return AppSettings.getSetting('camera-cutout', 'on');
}


function setVideoFormatSetting( sMode ) {
	AppSettings.updateSetting('video-format', sMode);
	switchVideoFormat(sMode);
}

function getVideoFormatSetting() {
	return AppSettings.getSetting('video-format', 'fit');
}


function getEnabledEpgSetting() {
	return AppSettings.isActive('epg-enabled');
}


function getLastPlayedChannel() {

	var iChannel = 0;
	if( AppSettings.isActive('startup-last-channel') && localStorage.getItem('iCurrentChannel') ) {
		iChannel = parseInt(localStorage.getItem('iCurrentChannel'));
	}

	return iChannel;

}


function getLicenseType() {

	if( localStorage.getItem('bIsPremiumApp') ) {
		return 'Premium';
	}

	if( typeof(bIsPremiumApp) === 'boolean' && bIsPremiumApp ) {
		return 'Premium';
	}

	var sType = AppSettings.getSetting('license-type');
	if( !sType ) {
		sType = 'Free';
	}

	return sType;

}


function isAdsPremiumActive() {
	return AppSettings.isActive('unlock-ads-premium');
}


function isTrialActive() {
	var iTrialSecondsLeft = localStorage.getItem('iTrialPremiumTime');
	if( iTrialSecondsLeft ) {
		return parseInt(iTrialSecondsLeft) > 10;
	}
	return false;
}


function isPremiumAccessAllowed() {
	return getLicenseType() === 'Premium' || isTrialActive();
}


var bAdsPremiumActive = false;
function disableAdsPremium() {
	bAdsPremiumActive = false;
	AppSettings.updateSetting('unlock-ads-premium', 'off', 'checkbox');
	localStorage.removeItem('iSecondsUntilAd');
}

function checkAdsPremium() {
	bAdsPremiumActive = AppSettings.isActive('unlock-ads-premium');
}


function consentErrorCallback( sReason ) {
	if( typeof(remoteConsentErrorCallback) === 'function' ) {
		remoteConsentErrorCallback(sReason);
	}
}