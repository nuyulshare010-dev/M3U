//i18n.en.helpHint = '';

if( typeof(sAppVersion) === 'undefined' ) {
	var sAppVersion = 0;
}

var bAddDisplayed = false;

function showChannelNameCallback() {

    return false;
    var oEndDate = new Date(), fSeconds = (oEndDate.getTime() - oStartDate.getTime()) / 1000;

    if( fSeconds < 30 ) {
        return false;
    }

    if( typeof(m3uConnector) === 'object' ) {
        m3uConnector.displayAd(1);
    }
    return false;

	//return false; // Deactivated because Google AdMob sucks!!!

	if( !bAddDisplayed && typeof(m3uConnector) === 'object' ) {

		var iAdVisibleTimeout = 45, iAdVisibleTimeoutMs = iAdVisibleTimeout * 1000;

		//m3uConnector.closeApp();

		bAddDisplayed = true;
		m3uConnector.displayAd(iAdVisibleTimeoutMs); // Nach 45 Sekunden Werbung ausblenden

		// Nach 45 Sekunden Werbung ausblenden
		var iTickInterval = setInterval(function() {
			iAdVisibleTimeout--;
			m3uConnector.setAdTimerRest(iAdVisibleTimeout);
		}, 1000);

		setTimeout(function() {
			m3uConnector.removeAd();
			clearInterval(iTickInterval);
		}, iAdVisibleTimeoutMs);

		// Nach 3 Minuten Werbung wieder erlauben (beim nächten Kanalwechsel)
		setTimeout(function() {
			bAddDisplayed = false;
		}, 180000);

		// Video alle 30 Minuten

	}

}