/*

	Copyright 2026 - Herber eDevelopment - Jaroslav Herber
	All rights reserved.

	This code is proprietary and confidential.
	Copying, modification, distribution, or use of this code without explicit permission is strictly prohibited.

*/

function getEl( sId ) {
	return document.getElementById(sId);
}

var oSettingsList = getEl('settings_list'), oSettingsHeadline = getEl('current_head'),
oBreadCrumb = getEl('bread_crumb'), oSettingsGuide = getEl('settings_guide'),
sSensitiveProtection = false, bSensitiveAccessAllowed = false;


var AppSettings = {
	storageKey: 'settings',

	defaultSettings: {
		'password': {type: 'input', value: ''},
		'user-agent': {type: 'input', value: 'Mozilla/5.0 (m3u-ip.tv ' + sAppVersion + ') ' + sDeviceFamily},
		'startup-last-channel': {type: 'checkbox', value: 'on'},
		'epg-enabled': {type: 'checkbox', value: 'on'},
		'enable-smart-controls': {type: 'checkbox', value: 'on'},
		'camera-cutout': {type: 'checkbox', value: 'on'},
		'landscape-orientation': {type: 'checkbox', value: 'on'},
		'store-epg-desciptions': {type: 'checkbox', value: 'on'},
		'compact-channel-info': {type: 'checkbox', value: 'on'},
		'epg-grab-interval': {type: 'radio', value: '3'},
		'epg-keep-days': {type: 'radio', value: '1'},
		'epg-future-days': {type: 'radio', value: '2'},
		'buffer': {type: 'radio', value: '15'},
		'clock-size': {type: "radio", value: "150%"},
		'skip-step-size': {type: 'radio', value: '30'},
		'license-type': {type: 'info', value: 'Premium'}
	},

	settings: {},

	init: function() {
		this.loadSettings();
	},

	loadSettings: function() {
		var savedSettings = localStorage.getItem(this.storageKey);
		if( savedSettings ) {
			this.settings = JSON.parse(savedSettings);
		} else {
			this.settings = this.cloneObject(this.defaultSettings);
			this.saveSettings();
		}

		this.applySettings();
	},

	saveSettings: function() {
		localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
	},

	resetSettings: function() {
		this.settings = this.cloneObject(this.defaultSettings);
		this.saveSettings();
		this.applySettings();
	},

	deleteSetting: function( sKey ) {
		console.log("Remove setting: " + sKey);
		delete this.settings[sKey];
		this.saveSettings();
	},

	updateSetting: function( sKey, sValue, sType ) {
		if( !sType ) { sType = 'hidden'; }
		var oSetting = {type: sType, value: sValue};
		this.settings[sKey] = oSetting;
		this.saveSettings();
		this.fillListLabels(sKey, oSetting);
		this.applyAction(sKey, oSetting);
		return true;
	},

	applyAction: function( sKey, oSetting ) {
		switch( sKey ) {
			case 'remove-animals':
				document.body.classList.toggle('no-animal', (oSetting.value === 'on'));
				break;
			case 'color':
				applyTheme(oSetting.value);
				break;
			case 'font-size':
				applyFontsize(oSetting.value);
				break;
			case 'user-agent':
				if( sDeviceFamily === 'Android' ) { m3uConnector.setUserAgent(oSetting.value); }
				break;
			case 'license-type':
				executeAction('check-license');
				break;
			case 'sensitive-settings-password':
				applySensitivePassword();
				break;
		}
	},

	applySettings: function() {
		for( sKey in this.settings ) {
			try {
				this.fillListLabels(sKey, this.settings[sKey]);
				this.setInputFields(sKey, this.settings[sKey]);
				this.applyAction(sKey, this.settings[sKey]);
			} catch(e) { this.deleteSetting(sKey); }
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
	},

	fillListLabels: function( sKey, oSetting ) {

		var sValue = oSetting.value;
		var aLabels = document.querySelectorAll("[data-settingval='" + sKey + "']");
		if( aLabels && aLabels.length ) {
			aLabels.forEach(function(oEl) {
				if( (sKey == 'settings-password' || sKey == 'password-groups') && sValue ) {
					sValue = '****';
				}

				if( sKey == 'license' && sValue ) {
					sValue = sValue.slice(0, -4) + '****';
				}

				oEl.innerHTML = sValue;
			});
		}
	},

	setInputFields: function( sKey, oSetting ) {

		var sValue = oSetting.value, sType = oSetting.type;
		switch( sType ) {
			case 'radio':
				var oSetting = document.querySelector("[data-name='" + sKey + "'][data-value='" + sValue + "']");
				if( oSetting ) {
					oSetting.classList.add('checked');
					oSetting.classList.add('select');
				}
				break;
			case 'checkbox':
				if( sValue === 'on' ) {
					var oSetting = document.querySelector("[data-name='" + sKey + "']");
					oSetting.classList.add('checked');
				}
				break;
			case 'text':
				var oSetting = document.querySelector("[data-name='" + sKey + "']");
				oSetting.value = sValue;
		}

	},

	cloneObject: function( obj ) {
		return JSON.parse(JSON.stringify(obj));
	}
};


function saveSetting( sKey, sValue, sType ) {

	if( !sKey ) {
		console.error("no setting key for value: " + sValue);
		return false;
	}

	return AppSettings.updateSetting(sKey, sValue, sType);

}


function validateLicenseKey( sLicenseKey, sSuccess, sFailure ) {

	var oHttp = new XMLHttpRequest(), bFailureFired = false, sDeviceId = getUniqueId(),
		sUrl = "https://m3u-ip.tv/premium/validate-license.php";

	oHttp.timeout = 3000;
	oHttp.onreadystatechange = function() {
		if( oHttp.readyState == XMLHttpRequest.DONE ) { // oHttpRequest.DONE == 4
			if( oHttp.status === 200 && oHttp.responseText ) {
				var aResult = JSON.parse(oHttp.responseText);
				if( aResult && aResult.status === 'valid' ) {
					sSuccess(aResult);
				} else {
					oHttp.validationresult = aResult;
					sFailure(oHttp);
				}
			} else {
				if( !bFailureFired ) { bFailureFired = true; sFailure(oHttp); }
			}
		}
	};

	oHttp.addEventListener('error', function() {
		if( !bFailureFired ) { bFailureFired = true; sFailure(oHttp); }
	});
	oHttp.addEventListener('abort', function() {
		if( !bFailureFired ) { bFailureFired = true; sFailure(oHttp); }
	});
	oHttp.addEventListener('timeout', function() {
		if( !bFailureFired ) { bFailureFired = true; sFailure(oHttp); }
	});

	try {
		oHttp.open("POST", sUrl, true);
		oHttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		oHttp.send("d=" + sDeviceFamily + "&v=" + sAppVersion + "&id=" + sDeviceId + "&vw=" + sView + "&l=" + getLangId() + "&lkey=" + sLicenseKey);
	} catch( e ) {
		if( !bFailureFired ) { bFailureFired = true; sFailure(e); }
		console.error(e);
		return false;
	}

	return true;

}


function getLicenseType() {

	if( localStorage.getItem('bIsPremiumApp') ) {
		return 'Premium';
	}

	var sType = AppSettings.getSetting('license-type');
	if( !sType ) {
		sType = 'Free';
	}

	if( sType === 'Free' && isTrialActive() ) {
		sType = 'Trial Premium';
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


function isReadyForPlay() {
	return (localStorage.getItem('bReadyForPlay') === "1");
}


function closeSettings() {

	if( bEpgDownloadRunning ) {
		showModal(getLang('not-ready-epg-download'));
		return;
	}

	if( isReadyForPlay() ) {
		localStorage.setItem('coming-from-settings', 1);
		if( sDeviceFamily === 'Android' && getDeviceMode() === 'tv' ) {
			window.location.href = "../player/index-tv.html";
		} else {
			window.location.href = "../player/index.html";
		}
	} else {
		showModal(getLang('not-ready'));
		sCurrentNavId = 'playlists';
		openNavList(sCurrentNavId);
	}
}


function removeDeviceSettings() {

	var aDeviceInclude = document.querySelectorAll('.device-include');
	aDeviceInclude.forEach(function(oEl) {
		var sD = oEl.dataset.device;
		if( sD && sD.indexOf(sDeviceFamily) === -1 ) {
			if( sD === 'Windows' && window.location.pathname.indexOf('/microsoft/') === 0 ) {
				return;
			}
			oEl.remove();
		}
	});

	var aDeviceExclude = document.querySelectorAll('.device-exclude');
	aDeviceExclude.forEach(function(oEl) {
		if( oEl.dataset.device && oEl.dataset.device.indexOf(sDeviceFamily) !== -1 ) {
			oEl.remove();
		}
	});

	if( !localStorage.getItem('sM3uList') ) {
		oLegacyPlaylistNavItem.remove();
	}

	if( AppSettings.getSetting('license-type') === 'Premium' ) {
		//getEl('unlock-trial-license').remove();
	}

	if( sDeviceFamily === 'Android' && getDeviceMode() === 'tv' ) {
		getEl('camera-cutout-navitem').remove();
		var oUnlockAdsItem = getEl('unlock-ads-premium');
		if( oUnlockAdsItem ) {
			oUnlockAdsItem.remove();
		}
	}

	if( localStorage.getItem('bIsPremiumApp') || (typeof(bIsPremiumApp) === 'boolean' && bIsPremiumApp) ) {
		getEl('license-navitem').remove();
	}

}


function applySensitivePassword() {

	if( !isPremiumAccessAllowed() ) {
		sSensitiveProtection = false;
		return false;
	}

	sSensitiveProtection = AppSettings.getSetting('sensitive-settings-password');

	if( !sSensitiveProtection ) {
		bSensitiveAccessAllowed = false;
	}

	if( oSettingsNav ) {
		oSettingsNav.classList.toggle('sensitive-protected', (sSensitiveProtection && !bSensitiveAccessAllowed));
		oSettingsNav.classList.toggle('sensitive-unlocked', (sSensitiveProtection && bSensitiveAccessAllowed));
	}

}


function allowSensitiveAccess( oEl ) {
	if( !sSensitiveProtection || bSensitiveAccessAllowed ) {
		return true;
	}

	if( oEl.classList.contains('sensitive-setting') ) {
		return false;
	}

	return true;
}


function closeSensitivePasswordInput() {
	sActiveControl = 'list';
	aCurrentFields = false;
	getEl('sesitive_password_confirm').style.display = 'none';
	getEl('sesitive_password_confirm_input').value = '';

	if( oCurrentInputEditItem ) {
		oCurrentInputEditItem.blur();
		oCurrentInputEditItem.classList.remove('select');
		oCurrentInputEditItem = false;
	}
}


function showSensitivePasswordInput( sCallback ) {

	sActiveControl = 'password_confirm'; iCurrentFieldIndex = 0;
	bSensitiveAccessAllowed = false;

	var oPasswordConfirm = getEl('sesitive_password_confirm'), oPasswordConfirmInput = getEl('sesitive_password_confirm_input');

	oPasswordConfirm.style.display = 'block';
	aCurrentFields = oPasswordConfirm.querySelectorAll('input, button');

	oPasswordConfirmInput.oninput = function(e) {
		if( sSensitiveProtection == this.value ) {
			bSensitiveAccessAllowed = true;

			if( oSettingsNav ) {
				oSettingsNav.classList.remove('sensitive-protected');
				oSettingsNav.classList.add('sensitive-unlocked');
			}

			closeSensitivePasswordInput();

			// Suceess
			sCallback();
		}
		e.preventDefault();
		return false;
	};

	oCurrentInputEditItem = oPasswordConfirmInput;
	oCurrentInputEditItem.classList.add('select');
	oCurrentInputEditItem.focus();

}


function showPasswordInput( iPassword ) {

	sActiveControl = 'password_confirm'; iCurrentFieldIndex = 0;

	var oPasswordConfirm = getEl('password_confirm'), oPasswordConfirmInput = getEl('password_confirm_input');

	oPasswordConfirm.style.display = 'block';
	aCurrentFields = oPasswordConfirm.querySelectorAll('input, button');

	oPasswordConfirmInput.addEventListener('input', function(e) {
		if( iPassword == this.value ) {
			oPasswordConfirmInput.blur();
			sActiveControl = 'list';
			aCurrentFields = false;
			oCurrentInputEditItem = false;
			oPasswordConfirm.style.display = 'none';
			loadEverything();
		}
		e.preventDefault();
		return false;
	});

	oCurrentInputEditItem = oPasswordConfirmInput;
	oCurrentInputEditItem.focus();

}


function bootSettings() {

	removeDeviceSettings(); // Remove settings that are device specific
	applyTouchMode();	// Add info icons for touch devices/mobile

	var sDeviceId = getUniqueId(), aDeviceId = sDeviceId.split('|');
	getEl('device_id').innerText = aDeviceId[0] + '-' + sDeviceId.slice(-14);

	if( sDeviceFamily === 'Browser' ) {
		var oHttpsSetting = getEl('disable_https_setting');
		if( oHttpsSetting ) {
			oHttpsSetting.classList.toggle('checked', isHttpMode());
			if( !isHttpMode() ) { // Calling settings in HTTPS mode disables the HTTP autostart
				localStorage.removeItem('bDisableHttps');
			}
		}
	}

	// Disable descriptions if device has not enough storage (less than 40 MB)
	if( AppSettings.isActive('store-epg-desciptions') ) {
		getAvailableSpace(function(fUsed, fTotal) {
			//fTotal = fTotal - fUsed;
			if( fTotal < 40 ) {
				saveSetting('store-epg-desciptions', 'off', 'checkbox');
				var oSetting = document.querySelector("[data-name='store-epg-desciptions']");
				oSetting.classList.remove('checked');
			}
		});
	}
	
	if( sDeviceFamily === 'Android' && m3uConnector.getPremiumStatus() ) {
		localStorage.setItem('bIsPremiumApp', '1');
    }

}


function loadEverything() {
	localStorage.removeItem('bReadyForPlay'); // Is set if at least one playlist is loaded and ready
	localStorage.removeItem('deviceStartup');

	if( window.location.hash ) {
		sCurrentNavId = window.location.hash.replace('#', '');
	}

	initDb(function() { // DB successfully loaded, load playlists next
		bootPlaylistReady(function() {
			document.body.classList.remove('booting');
			openNavList(sCurrentNavId);
			bBootComplete = true;
		});
	}, function(oEv) { // DB failure
		console.log("Error boot DB");
	});
}


function boot() {

	bootSettings();
	applyLang();
	initControls();

	var iPassword = AppSettings.getSetting('settings-password');
	if( iPassword ) {
		bBootComplete = true;
		showPasswordInput(iPassword); return;
	}

	loadEverything();

}


var bSkipPopState = true; // if browser back-button is used, this is not true
window.addEventListener("popstate", function(oEv) {

	if( !bSkipPopState && window.location.hash ) {
		sCurrentNavId = window.location.hash.replace('#', '');
		openNavList(sCurrentNavId, true);
	}
	return false;

});

