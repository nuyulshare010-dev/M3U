/* Copyright 2026 - Herber eDevelopment - Jaroslav Herber */

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
		var sValue = oSetting = this.getSetting(sKey);
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