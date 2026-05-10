importScripts('pako.min.js');

var iEpgTimeShift = 0, iGrabIntervalSetting = 24, aChannelList = [], aMatchedPlaylistIds = [], aMatchedChannels = [], iDbVersion = 1;

Date.prototype.addHours = function( h ) {
	this.setTime(this.getTime() + (h*60*60*1000));
	return this;
};

Date.prototype.subHours = function( h ) {
	this.setTime(this.getTime() - (h*3600000));
	return this;
};


function debug( mVar ) {
	//console.log(mVar);
	//console.trace(mVar);
}

function freeRegExp() {
	// /\s*/g.exec("");
	/./.exec("a");
}

function getTimeNow() {

	if( iEpgTimeShift ) {
		var oDateNowLocal = new Date();
		oDateNowLocal.addHours(iEpgTimeShift);
		return oDateNowLocal.getTime();
	} else {
		return new Date().getTime()
	}

}

function getMatch( sContent, sRegExp, iMatchNum ) {
	iMatchNum = iMatchNum || 1;
	var aData = sContent.match(sRegExp);
	if( aData && aData.length > iMatchNum ) {
		return aData[iMatchNum];
		//return (" " + aData[iMatchNum]).substr(1); //aData[iMatchNum];
	}

	return '';
}


function insertCharAt( sString, sChar, iPos ) {
	return sString.substring(0, iPos) + sChar + sString.substring(iPos);
}


function getTimezoneShift( sTimeString ) {
	var aData = sTimeString.split(' ');
	if( aData && aData.length === 2 && aData[1].length === 5 ) {
		return parseInt(aData[1]);
	}

	return 0;
}


function getEpgDateObject( sTimeString, iAddTimezoneHours ) {

	if( sTimeString ) {

		var oDate = new Date(sTimeString);
		var iTimezoneOffset = oDate.getTimezoneOffset();
		if( iTimezoneOffset ) {
			oDate.addHours(Math.round(iTimezoneOffset / 60 * -1));
		}

		if( iAddTimezoneHours ) {
			iAddTimezoneHours = Math.round(iAddTimezoneHours / 100);
			if( iAddTimezoneHours ) {
				oDate.addHours(iAddTimezoneHours);
			}
		}

		return oDate;

	}

	return false;

}


function extractDateString( sEpgFormat ) {

	if( sEpgFormat && sEpgFormat.length === 20 ) {
		var aData = sEpgFormat.split(' ');
		if( aData && aData.length === 2 && aData[0].length === 14 ) {
			sEpgFormat = aData[0];
		}
	}

	if( sEpgFormat && sEpgFormat.length === 14 ) { // timezone missing
		sEpgFormat = insertCharAt(sEpgFormat, '-', 4);
		sEpgFormat = insertCharAt(sEpgFormat, '-', 7);
		sEpgFormat = insertCharAt(sEpgFormat, ' ', 10);
		sEpgFormat = insertCharAt(sEpgFormat, ':', 13);
		sEpgFormat = insertCharAt(sEpgFormat, ':', 16);
		return sEpgFormat;
	}

	return false;

}


function getProgramDuration( sStart, sStop ) {

	if( sStart && sStop ) {
		oDateStart = new Date(sStart);
		oDateStop = new Date(sStop);

		if( oDateStart && oDateStop ) {
			return oDateStop.getTime() - oDateStart.getTime();
		}
	}

	return '';

}


function isGzipped(arrayBuffer) {
    if (!arrayBuffer || arrayBuffer.byteLength < 2) return false;
    const bytes = new Uint8Array(arrayBuffer);
    return bytes[0] === 0x1F && bytes[1] === 0x8B; // Gzip magic number
}


function fireRequest( sUrl, oFormdata, sOnSuccess, sOnFailure ) {

	var oHttp = new XMLHttpRequest(), bFailureFired = false;
	if( sUrl.indexOf('.gz') > 0 ) {
		oHttp.responseType = 'arraybuffer';
	}

	oHttp.onreadystatechange = function() {
		if( oHttp.readyState == XMLHttpRequest.HEADERS_RECEIVED ) {
			var sHeaderEncoding = oHttp.getResponseHeader("Content-Encoding"), sHeaderDisposition = oHttp.getResponseHeader("Content-Disposition");

			if( sHeaderEncoding && sHeaderEncoding.indexOf("gzip") >= 0 ) {
				oHttp.responseType = 'arraybuffer';
			} else if( sHeaderDisposition && sHeaderDisposition.indexOf(".gz") > 0 ) {
                oHttp.responseType = 'arraybuffer';
            }
		} else if( oHttp.readyState == XMLHttpRequest.DONE ) { // oHttpRequest.DONE == 4
			if( oHttp.status > 399 ) {
				if( !bFailureFired ) { bFailureFired = true; sOnFailure(oHttp); }
			} else {
				sOnSuccess(oHttp);
			}
		}
	};

	/*
	oHttp.addEventListener('loadstart', function() { debug(1); });
	oHttp.addEventListener('load', function() { debug(2); });
	oHttp.addEventListener('loadend', function() { debug(3); });
	oHttp.addEventListener('progress', function() { debug(4); });
	*/
	oHttp.addEventListener('error', function() {
		if( !bFailureFired ) { bFailureFired = true; sOnFailure(oHttp); }
	});
	oHttp.addEventListener('abort', function() {
		if( !bFailureFired ) { bFailureFired = true; sOnFailure(oHttp); }
	});
	oHttp.addEventListener('timeout', function() {
		if( !bFailureFired ) { bFailureFired = true; sOnFailure(oHttp); }
	});

	if( sUrl && typeof(sOnSuccess) === 'function' && typeof(sOnFailure) === 'function' ) {
		try {
			if( oFormdata ) {
				oHttp.open("POST", sUrl, true);
				oHttp.send(oFormdata);
			} else {
				oHttp.open("GET", sUrl, true);
				oHttp.send();
			}
		} catch( e ) {
			if( !bFailureFired ) { bFailureFired = true; sOnFailure(e); }
			debug(e.message);
			return false;
		}
		return true;
	}

	return false;

}


function parseAlternativeChannelIds( oStore, sContent, sId ) {

	var aMatches = sContent.match(/<display-name[^>]*>([\s\S]*?)<\/display-name>/g);

	if( aMatches ) {
		var iCount = aMatches.length;
		for( var i = 0; i < iCount; i++ ) {

			var sDisplayTag = aMatches[i];
			var sDisplayName = getMatch(sDisplayTag, /<display-name[^>]*>(.+)<\/display-name>/),
				sLangId = getMatch(sDisplayTag, /lang="([^"]+)"/);

			oStore.put({id: sId, name: sDisplayName, lang: sLangId});
			postMessage({id: sId, name: sDisplayName, lang: sLangId});

		}
	}

}

var iInsertedTables = 0;
function dbInsertCompleteHandler( sStoreName ) {
	iInsertedTables++;
	debug('dbInsertComplete: ' + sStoreName);
	// close worker, if insert-job is done
	if( iInsertedTables === 2 ) {
		debug('everything is done. Close worker. Thank you!');
		self.close();
	}
}


function dbErrorHandler( event ) {
	if( event.target.error.name === "QuotaExceededError" || event.target.error.name === "NS_ERROR_DOM_QUOTA_REACHED" ) {
		postMessage('DB ERROR: Not enough space');
	} else {
		postMessage('DB ERROR: ' + event.target.error.message);
	}
}


function insertChannels( oDb, aMatches, sCallback ) {

	var tx = oDb.transaction("epgStore", "readwrite");
	var oStore = tx.objectStore("epgStore");

	var oClearRequest = oStore.clear();
	oClearRequest.onsuccess = function() {

		tx.onerror = dbErrorHandler;
		tx.onabort = dbErrorHandler;

		var iCount = aChannelList.length, iCountInserted = 0;
		for( var i = 0; i < iCount; i++ ) {

			try {
				var aChannel = aChannelList[i];
				if( aChannel.epgid ) {
					oStore.put({id: aChannel.tvgid, epgid: aChannel.epgid, name: aChannel.name, icon: aChannel.epgicon});
					aMatchedPlaylistIds[aChannel.epgid] = 1;

					iCountInserted++;
					if( (iCountInserted % 50) === 0 ) {
						postMessage('OK channels: ' + iCountInserted);
					}
				}
			} catch( e ) {
				debug('insertChannels error!');
				debug(e.message);
			}

		}

		tx.oncomplete = sCallback;

		postMessage('OK channels: ' + iCountInserted);

		debug('update epgStore/channels complete');

	};

}

// OBSOLETE
function insertAltIds( oDb, aMatches, sCallback ) {

	var tx = oDb.transaction("epgAlternativeIds", "readwrite");
	var oStore = tx.objectStore("epgAlternativeIds");

	var oClearRequest = oStore.clear();
	oClearRequest.onsuccess = function() {

		tx.onerror = dbErrorHandler;
		tx.onabort = dbErrorHandler;

		var iCount = aMatches.length;
		for( var i = 0; i < iCount; i++ ) {
			var sContent = aMatches[i];
			if( sContent ) {
				var sId = getMatch(sContent, /id="([^"]+)"/);
				if( sId ) {
					parseAlternativeChannelIds(oStore, sContent, sId);
				}
			}
		}

		tx.oncomplete = sCallback;

		debug('update epgAlternativeIds complete');

	};
}


function insertProgramms( oDb, aProgramme, sCallback ) {

	// clear programs
	var tx = oDb.transaction("epgProgramme", "readwrite");
	var oStore = tx.objectStore("epgProgramme");

	var oClearRequest = oStore.clear();
	oClearRequest.onsuccess = function() {

		tx.onerror = dbErrorHandler;
		tx.onabort = dbErrorHandler;

		// insert programs
		if( aProgramme ) {

			var iProgrammeCount = aProgramme.length, iProgrammeUpdateCount = 0;
			var iDateNow = getTimeNow();

			debug('update epgProgramme start. Count: ' + iProgrammeCount);

			for( var i = 0; i < iProgrammeCount; i++ ) {

				try {

					var sProgramme = aProgramme[i];
					if( sProgramme ) {
						var sId = getMatch(sProgramme, /channel="([^"]+)"/), sId = getCompatibleChannels(sId);
						if( sId ) {
							var sStart = getMatch(sProgramme, /start="([^"]+)"/), sStop = getMatch(sProgramme, /stop="([^"]+)"/), sShift = getTimezoneShift(sStart);

							sStart = extractDateString(sStart);
							sStop = extractDateString(sStop);

							if( !sStart || !sStop ) {
								continue;
							}

							var oEndTime = getEpgDateObject(sStop, sShift), oStartTime = getEpgDateObject(sStart, sShift);

							// Filter expired or more than 30 h in future
							if( iDateNow > oEndTime.getTime() || (iDateNow + (iGrabIntervalSetting * 3600000) + 7200000) < oStartTime.getTime() ) {
								continue;
							}

							var sIcon = getMatch(sProgramme, /<icon src="([^"]+)"/),
								sTitle = getMatch(sProgramme, /<title[^>]*>(.+)<\/title>/),
								sDesc = getMatch(sProgramme, /<desc[^>]*>([\s\S]*?)<\/desc>/),
								sDuration = getProgramDuration(sStart, sStop);

							if( sId && sTitle && sStart && sStop ) {
								oStore.put({id: sId, title: sTitle, desc: sDesc, icon: sIcon, start: sStart, stop: sStop, tz: sShift, duration: sDuration});
								iProgrammeUpdateCount++;
								if( (iProgrammeUpdateCount % 100) === 0 ) {
									postMessage('OK programms: ' + iProgrammeUpdateCount);
								}
							}
						}
					}

				} catch( e ) {
					debug('insertProgramms error!');
					debug(e.message);
				}

			}

			postMessage('OK programms: ' + iProgrammeUpdateCount);
			debug('update epgProgramme complete. Count: ' + iProgrammeUpdateCount);

		}

		tx.oncomplete = sCallback;

	};

}


function setEpgDataToPlaylistChannels( sMainId, sId, sIconUrl ) {

	if( !sId ) { return false; }

	var iChannelsCount = aChannelList.length;
	for( var i = 0; i < iChannelsCount; i++ ) {

		if( !aChannelList[i] || typeof(aChannelList[i].name) === 'undefined' ) {
			continue;
		}

		try {
			if( aChannelList[i].tvgn == sId || aChannelList[i].tvgid == sId || aChannelList[i].name == sId ||
				aChannelList[i].tvgn == sMainId || aChannelList[i].tvgid == sMainId || aChannelList[i].name == sMainId ||
				aChannelList[i].name.toUpperCase() == sId.toUpperCase() ) {
				if( typeof(aChannelList[i].epgIds) === 'undefined' ) {
					aChannelList[i].epgid = sMainId;
					aChannelList[i].epgicon = sIconUrl;
				}

				return true;
			}
		} catch( e ) {}

	}

	return false;

}


/*
	Searches TVG-ID + NAME in playlist. If match, return ID from playlist
*/
function collectCompatibleIds( aMatches ) {

	var iFoundIs = 0;

	if( aChannelList.length ) {

		var iCount = aMatches.length;
		for( var i = 0; i < iCount; i++ ) {

			var sContent = aMatches[i];
			if( sContent ) {
				var sId = getMatch(sContent, /id="([^"]+)"/);
				if( sId ) {

					var aDisplayNames = sContent.match(/<display-name[^>]*>([\s\S]*?)<\/display-name>/g);
					if( !aDisplayNames ) {
						continue;
					}

					var sIconUrl = getMatch(sContent, /<icon src="([^"]+)"/),
						iCountDisplayNames = aDisplayNames.length;

					for( var x = 0; x < iCountDisplayNames; x++ ) {
						var sDisplayName = getMatch(aDisplayNames[x], /<display-name[^>]*>(.+)<\/display-name>/);
						sFoundId = setEpgDataToPlaylistChannels(sId, sDisplayName, sIconUrl);
						if( sFoundId ) {
							iFoundIs++;
						}

					}

				}
			}

		}

	}

	return iFoundIs;

}


function getCompatibleChannels( sId ) {

	if( typeof(aMatchedPlaylistIds[sId]) !== 'undefined' || typeof(aMatchedPlaylistIds[sId.toUpperCase()]) !== 'undefined' ) {
		return sId;
	}

	return false;

}


function parseChannels( sXml ) {

	/*
	var oRegEx = /<channel[^>]*>([\s\S]*?)<\/channel>/g;
	var aMatches = [], iCount = 0;

	oRegEx.lastIndex = 0;
	var match;

	while( (match = oRegEx.exec(sXml)) !== null ) {
		aMatches[iCount] = match[0];
		iCount++;
		oRegEx.lastIndex++;
	}

	if( !aMatches ) {
		return iCount;
	}
	*/

	var aMatches = sXml.match(/<channel[^>]*>([\s\S]*?)<\/channel>/g), iCount = 0;
	if( !aMatches ) {
		return iCount;
	}

	freeRegExp();

	if( !collectCompatibleIds(aMatches) ) {
		postMessage('playlist not compatible');
		//self.close();
		return true;
	}

	iCount = aMatches.length;

	/*
	var oXmlParser = new DOMParser(), oXmlDoc = oXmlParser.parseFromString(sXml, "text/xml");
	if( oXmlDoc && oXmlDoc.firstChild && oXmlDoc.firstChild.tagName === 'tv' ) {
		//aChannels = oXmlDoc.firstChild.querySelector('channel');
		debug(sXml);

		for (const child of oXmlDoc.firstChild.children) {
			debug(child.tagName);
		}
		for( var i = 0; i < oXmlDoc.firstChild.length; i++ ) {
			//debug(aChannels);
		}
	}
	*/

	var oDbOpen = indexedDB.open("m3u", iDbVersion);
	// DB is created in epg.js

	oDbOpen.onsuccess = function() {
		var oDb = oDbOpen.result;

		insertChannels(oDb, aMatches, function() {

			postMessage('start programmsImport');
			aMatches = sXml.match(/<programme[^>]*>([\s\S]*?)<\/programme>/g);
			freeRegExp();

			insertProgramms(oDb, aMatches, function() {
				postMessage('finish');
				dbInsertCompleteHandler('insertProgramms');
			});

			postMessage('finish insertChannels');
			dbInsertCompleteHandler('insertChannels');

		});

	};
	oDbOpen.onerror = function() {
		postMessage("ERROR: DB error");
		self.close();
	};
	oDbOpen.onblocked = function(event) {
		postMessage("ERROR: DB error");
		self.close();
	};

	return iCount;

}


function grabXml( sUrl ) {

	postMessage('downloading');

	// check multiple URLs
	var aMultiUrls = sUrl.split(',');
	if( aMultiUrls && aMultiUrls.length > 1 ) {
		sUrl = aMultiUrls[0];
	}

	fireRequest(sUrl, false, function(oHttp) {
		var iChannelsParsed = 0, sXml = false;

		if( oHttp.response ) {

			if( oHttp.responseType === 'arraybuffer' ) {

				/*
				if( typeof(DecompressionStream) !== 'undefined' ) {
					console.log("start decompress");
					decompress(oHttp.response);
				} else {

				}*/

				sXml = pako.inflate(oHttp.response, { to: 'string' });

			} else {
				sXml = oHttp.response;
			}

			if( sXml ) {
				iChannelsParsed = parseChannels(sXml);
			}

			if( iChannelsParsed ) {
				//postMessage('finish');
			} else {
				postMessage("ERROR: Is this a valid EPG/XML-file?");
				self.close();
			}

		} else {
			postMessage("ERROR: Is this a valid EPG/XML-file?");
			self.close();
		}

	}, function(oHttp) {
		var sErrorMessage = oHttp.status;
		if( sErrorMessage == 0 ) {
			postMessage('Unknown error. Please check your URL');
		} else {
			postMessage('ERROR: Status ' + sErrorMessage + ' ' + oHttp.statusText);
		}

		self.close();
	});

}


onmessage = function(e) {
	var aData = e.data;

	if( aData ) {
		iDbVersion = parseInt(aData.version);
		iGrabIntervalSetting = parseInt(aData.interval);
		iEpgTimeShift = parseInt(aData.timeshift);
		aChannelList = aData.playlist;
		grabXml(aData.url);
	} else {
		postMessage("ERROR");
	}

};
