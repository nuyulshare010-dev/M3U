/*

	Copyright 2026 - Herber eDevelopment - Jaroslav Herber
	All rights reserved.

	This code is proprietary and confidential.
	Copying, modification, distribution, or use of this code without explicit permission is strictly prohibited.

*/

var bDbInitiated = 0, oDb = false, iDbVersion = 1, iPlaylistId = 0, sXtreamType = false, iInsertId = 0, iTimeNow = new Date().getTime(),
aInsertedTypesCount = {
	live: 0, movie: 0, vod: 0, series: 0
};

var sDeviceFamily = self.location.host === 'm3u-ip.tv' ? 'Browser' : '';

function debug( mVar ) {
	console.trace(mVar);
	//console.trace(mVar);
}

function debugError( e ) {
	console.log(e.message);
	console.trace(e);
	console.log(e.trace);
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
	}

	return '';

}


function initDb( sOnSuccess ) {

	if( bDbInitiated > 0 ) {
		return bDbInitiated;
	}

	// Request persistent storage for site
	if( navigator.storage && navigator.storage.persist ) {
		navigator.storage.persist();
	}

	try {
		var oDbOpen = indexedDB.open("m3u_v3", iDbVersion);

		if( bDbInitiated === 0 ) {
			bDbInitiated = 9; // First time loading
		}

		oDbOpen.onsuccess = function() {
			oDb = oDbOpen.result;
			bDbInitiated = 1; // OK
			sOnSuccess();
		};
		oDbOpen.onerror = function() {
			postMessage("ERROR: DB error. Please reinstall the app.");
			self.close();
		};
		oDbOpen.onblocked = function(event) {
			postMessage("ERROR: DB error. Please reinstall the app.");
			self.close();
		};

	} catch( e ) {
		debug(e.message);
		postMessage("ERROR: DB error: " + e.message);
	}

}


function fireRequest( sUrl, oFormdata, sOnSuccess, sOnFailure, sOnProgress ) {

	var oHttp = new XMLHttpRequest(), bFailureFired = false;
	oHttp.timeout = 600000; // 10 min timeout
	oHttp.onload = function() {
		if( !oHttp.status || oHttp.status > 399 ) {
			if( !bFailureFired ) { bFailureFired = true; sOnFailure(oHttp); }
		} else {
			sOnSuccess(oHttp);
		}
	};

	if( typeof(sOnProgress) === 'function' ) {
		//oHttp.addEventListener('loadstart', sOnProgress);
		//oHttp.addEventListener('load', sOnProgress);
		//oHttp.addEventListener('loadend', sOnProgress);
		oHttp.addEventListener('progress', sOnProgress);
	}

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
				//oHttp.setRequestHeader('Cache-Control', 'no-cache');
				//oHttp.setRequestHeader('Pragma', 'no-cache');
				//oHttp.setRequestHeader('Expires', 'Sat, 01 Jan 2000 00:00:00 GMT');
				oHttp.send();
			}
		} catch( e ) {
			if( !bFailureFired ) { bFailureFired = true; sOnFailure(e); }
			debugError(e);
			return false;
		}
		return true;
	}

	return false;

}


var iInsertedTables = 0, iInsertTablesCount = 1;
function dbInsertCompleteHandler( sStoreName ) {
	iInsertedTables++;
	//debug('dbInsertComplete: ' + sStoreName);
	// close worker, if insert-job is done
	if( iInsertedTables === iInsertTablesCount ) {
		if( !iInsertId ) {
			postMessage('ERROR: This playlist is empty'); self.close(); return;
		}

		//debug('everything is done. Close worker. Thank you!');
		// delete old records
		truncateOldChannels(function() {
			postMessage('finish'); self.close();
		});
	}
}


function dbErrorHandler( event ) {
	if( event.target.error.name === "QuotaExceededError" || event.target.error.name === "NS_ERROR_DOM_QUOTA_REACHED" ) {
		postMessage('ERROR: Not enough space');
	} else {
		postMessage('ERROR: ' + event.target.error.message);
	}
}


function getTypesCountOutput() {

	var sHtml = '';

	if( aInsertedTypesCount.live ) {
		sHtml += '<i class="icon-status icon-livetv">' + aInsertedTypesCount.live + '</i>';
	}

	if( aInsertedTypesCount.movie ) {
		sHtml += ' <i class="icon-status icon-movies">' + aInsertedTypesCount.movie + '</i>';
	}

	if( aInsertedTypesCount.vod ) {
		sHtml += ' <i class="icon-status icon-movies">' + aInsertedTypesCount.vod + '</i>';
	}

	if( aInsertedTypesCount.series ) {
		sHtml += ' <i class="icon-status icon-series">' + aInsertedTypesCount.series + '</i>';
	}

	return sHtml;

}


function insertChannels( aChannelList, sCallback ) {

	var txLoad = oDb.transaction("playlistChannels"), oStore = txLoad.objectStore("playlistChannels");
	var oIndex = oStore.index("pid"), oRange = IDBKeyRange.only(iPlaylistId);

	var oExistingChannelIdents = {
		//live: {}, movie: {}, series: {}
	};

	// First collect all old channels from this playlist
	oIndex.openCursor(oRange).onsuccess = function(event) {
		var oRecord = event.target.result;
        if( oRecord ) {
			var sChannelIdent = oRecord.value.name + '|' + oRecord.value.tvgid + '|' + oRecord.value.tvgn + '|' + oRecord.value.type;
			oExistingChannelIdents[sChannelIdent] = oRecord.value;
            oRecord.continue();
        } else {
			// finish
		}
    };

	txLoad.oncomplete = function() {

		//debug('start channel import for id: ' + iPlaylistId);
		var tx = oDb.transaction("playlistChannels", "readwrite", {durability: 'relaxed'});
		oStore = tx.objectStore("playlistChannels");

		tx.onerror = dbErrorHandler;
		tx.onabort = dbErrorHandler;

		var iCount = aChannelList.length, iCountInserted = 0;
		for( var i = 0; i < iCount; i++ ) {

			var aChannel = aChannelList[i], sChannelIdent = aChannel.name + '|' + aChannel.tvgid + '|' + aChannel.tvgn + '|' + aChannel.type;
			aChannel.ts = iTimeNow;

			// Merge old channels to newly imported
			var oOldChannel = oExistingChannelIdents[sChannelIdent];
			if( oOldChannel ) {
				if( !aChannel.logo && oOldChannel.logo ) { aChannel.logo = oOldChannel.logo; }
				//if( oOldChannel.epgid ) { aChannel.epgid = oOldChannel.epgid; }
				if( oOldChannel.deleted ) { aChannel.deleted = oOldChannel.deleted; }
				if( oOldChannel.protect ) { aChannel.protect = oOldChannel.protect; }
				if( oOldChannel.fpos ) { aChannel.fpos = oOldChannel.fpos; }
				if( oOldChannel.fposDate ) { aChannel.fposDate = oOldChannel.fposDate; }
				if( oOldChannel.cname ) { aChannel.cname = oOldChannel.cname; }
				//delete oExistingChannelIdents[sChannelIdent];
			}

			if( aChannel.pos ) {
				oStore.put(aChannel);
				iCountInserted++;

				if( aChannel.type && aInsertedTypesCount[aChannel.type] >= 0 ) {
					aInsertedTypesCount[aChannel.type]++;
				} else {
					aInsertedTypesCount['live']++;
				}

				if( (iCountInserted % 100) === 0 ) {
					//console.log(aChannel.type, aInsertedTypesCount);
					postMessage('OK channels: ' + getTypesCountOutput());
				}
			}

		}

		// Remove old, not available channels
		/*
		for( var sChannelIdent in oExistingChannelIdents ) {
			var pid = oExistingChannelIdents[sChannelIdent].pid, pos = oExistingChannelIdents[sChannelIdent].pos;
			oStore.delete([pid, pos]);
		}*/

		tx.oncomplete = function() {
			//postMessage('OK channels: ' + iCountInserted);
			postMessage('OK channels: ' + getTypesCountOutput());
			postMessage('COUNT live: ' + aInsertedTypesCount.live);
			postMessage('COUNT movie: ' + aInsertedTypesCount.movie);
			postMessage('COUNT series: ' + aInsertedTypesCount.series);

			sCallback();
		};

		//debug('update playlistChannels/channels complete');

	};


}


function extractCatchupData( sLine ) {

	var aCatchup = {}, sCatchup = getMatch(sLine, /catchup="([^"]+)"/), sCatchupType = getMatch(sLine, /catchup-type="([^"]+)"/),
		sCatchupTime = getMatch(sLine, /catchup-time="([^"]+)"/), sCatchupDays = getMatch(sLine, /catchup-days="([^"]+)"/),
		iTs = getMatch(sLine, /timeshift="([^"]+)"/), sCatchupSource = getMatch(sLine, /catchup-source="([^"]+)"/),
		sTvgRec = getMatch(sLine, /tvg-rec="([^"]+)"/);

	sCatchup ? aCatchup.catchup = sCatchup : null;
	sCatchupType ? aCatchup.type = sCatchupType : null;
	sCatchupTime ? aCatchup.time = sCatchupTime : null;
	sCatchupSource ? aCatchup.source = sCatchupSource : null;

	if( !sCatchupType && sCatchup ) {
		aCatchup.type = sCatchup;
	}

	if( sCatchupDays && sCatchupDays != '0' ) {
		aCatchup.days = parseInt(sCatchupDays);
	}

	if( iTs ) {
		aCatchup.timeshift = parseInt(iTs);
	}

	if( sTvgRec && sTvgRec != '0' ) { // channel level only
		aCatchup.rec = parseInt(sTvgRec);
		if( aCatchup.rec > 1 && !aCatchup.days ) {
			aCatchup.days = aCatchup.rec;
		}
	}

	if( Object.keys(aCatchup).length == 0 ) {
		return false;
	}

	return aCatchup;

}


function parsePlaylist( sContent ) {

	var iCount = 0;
	if( sContent ) {

		var aHeaderLine = sContent.match(/^#EXTM3U\s?(.*)$/m);
		if( aHeaderLine ) {
			if( aHeaderLine[1] ) {
				postMessage('EXTM3U HEAD: ' + aHeaderLine[1]);
			}
		} else {
			postMessage("ERROR NOT VALID EXTM3U");
		}

		sContent = sContent.replace(/\r?\n/g, "\n");
		var sSplitter = "\n", aLines = sContent.split(sSplitter), aChannelList = [], aChannel = {}, aCatchup = false;

		aLines.forEach(function(sLine) {

			sLine = sLine.trim();

			if( sLine.startsWith('#EXTVLCOPT:') ) {

				if( sLine.indexOf('#EXTVLCOPT:http-referrer=') === 0 ) {
					aChannel.ref = sLine.replace('#EXTVLCOPT:http-referrer=', '');
				} else if( sLine.indexOf('#EXTVLCOPT:http-referer=') === 0 ) {
					aChannel.ref = sLine.replace('#EXTVLCOPT:http-referer=', '');
				} else if( sLine.indexOf('#EXTVLCOPT:http-user-agent=') === 0 ) {
					aChannel.ua = sLine.replace('#EXTVLCOPT:http-user-agent=', '');
				}

			} else if( sLine.startsWith('#KODIPROP:') ) {

				if( sLine.indexOf('#KODIPROP:inputstream.adaptive.license_type') === 0 ) {
					aChannel.drmT = sLine.replace('#KODIPROP:inputstream.adaptive.license_type=', '');
				} else if( sLine.indexOf('#KODIPROP:inputstream.adaptive.license_key=') === 0 ) {
					aChannel.drmK = sLine.replace('#KODIPROP:inputstream.adaptive.license_key=', '');
				} else if( sLine.indexOf('#KODIPROP:inputstream.adaptive.stream_headers=referer=') === 0 ) {
					aChannel.ref = sLine.replace('#KODIPROP:inputstream.adaptive.stream_headers=referer=', '');
				} else if( sLine.indexOf('#KODIPROP:inputstream.adaptive.stream_headers=user-agent=') === 0 ) {
					aChannel.ua = sLine.replace('#KODIPROP:inputstream.adaptive.stream_headers=user-agent=', '');
				} else if( sLine.indexOf('#KODIPROP:inputstream.adaptive.stream_headers=') === 0 ) {
				    aChannel.headers = sLine.replace('#KODIPROP:inputstream.adaptive.stream_headers=', '');
				}

			} else if( sLine.startsWith('#EXTGRP:') ) {

				aChannel.group = sLine.replace('#EXTGRP:', '');

			} else if( sLine.startsWith('#EXTINF:') ) {

				var sChannelName = '', aChannelName = sLine.match(/",(.+)/);
				if( !aChannelName ) {
					aChannelName = sLine.match(/,(.+)/);
				}

				if( aChannelName && aChannelName.length === 2 ) {
					sChannelName = aChannelName[1];
				}

				aChannel.name = sChannelName.trim();

				var sLogo = getMatch(sLine, /tvg-logo="([^"]+)"/), sGroup = getMatch(sLine, /group-title="([^"]+)"/),
					sType = getMatch(sLine, /type="([^"]+)"/), bAdult = getMatch(sLine, /adult="([^"]+)"/);

				if( !sGroup ) {
					sGroup = getMatch(sLine, /tvg-group="([^"]+)"/);
				}

				aChannel.group = sGroup ? sGroup : '-';
				sType ? aChannel.type = sType : null;
				sLogo ? aChannel.logo = sLogo : null;
				bAdult ? aChannel.adult = true : null;

				// TVG / EPG
				var sTvgId = getMatch(sLine, /tvg-id="([^"]+)"/), sChannelId = getMatch(sLine, /channel-id="([^"]+)"/),
					sTvgName = getMatch(sLine, /tvg-name="([^"]+)"/), sTvgShift = getMatch(sLine, /tvg-shift="([^"]+)"/),
					sTvgSeason = getMatch(sLine, /tvg-season="([^"]+)"/), sTvgSerie = getMatch(sLine, /tvg-serie="([^"]+)"/);

				if( sTvgId ) {
					aChannel.tvgid = sTvgId;
				} else if( sChannelId ) {
					aChannel.tvgid = sChannelId;
				} else {
					aChannel.tvgid = aChannel.name;
				}

				sTvgName ? aChannel.tvgn = sTvgName : null;
				sTvgShift ? aChannel.tvgshift = sTvgShift : null;
				sTvgSeason ? aChannel.season = sTvgSeason : null;
				sTvgSerie ? aChannel.serie = sTvgSerie : null;

				// Catchup
				aCatchup = extractCatchupData(sLine);

				// Is channel a movie?
				if( sGroup == 'Movies' || sType == 'movie' ) {
					aChannel.isMovie = true;
					aChannel.type = 'movie';
				}

				if( sGroup == 'Serie' || sType == 'series' || sTvgSerie || sTvgSeason ) {
					aChannel.type = 'series';
				}

			} else if( aChannel && sLine && !sLine.startsWith('#') ) {

				if( aCatchup ) {
					aChannel.catchup = aCatchup;
				}

				if( !aChannel.headers && sLine.indexOf('|') > 10 ) {
					var aUrlHeader = sLine.split('|');
					if( aUrlHeader.length == 2 ) {
						sLine = aUrlHeader[0];
						aChannel.headers = aUrlHeader[1];
					}
				}

				if( !aChannel.type ) {
					if( sLine.indexOf('/movie') > 2 ) {
						aChannel.type = 'movie';
					} else if( sLine.indexOf('/serie') > 2 ) {
						aChannel.type = 'series';
					}
				}

				if( aChannel.type !== 'series' && aChannel.type !== 'movie' ) {
					aChannel.type = 'live';
				}

				if( aChannel.name ) {
					iCount++;
					iInsertId++;
					aChannel.pid = iPlaylistId;
					aChannel.url = sLine;
					aChannel.pos = iCount;
					aChannelList.push(aChannel);
				}

				aChannel = {}; // reset
				aCatchup = false;

			}

		});

		if( aChannelList && iCount > 0 ) {
			postMessage('start insertChannels');
			insertChannels(aChannelList, function() {
				dbInsertCompleteHandler('insertChannels');
			});
		} else {
			postMessage("ERROR NOT VALID");
		}

	}

	return iCount;

}


function processPlaylistData( sResult ) {

	var iChannelsParsed = 0;
	if( sResult ) {
		if( sResult ) {
			iChannelsParsed = parsePlaylist(sResult);
		}

		if( iChannelsParsed ) {
			return postMessage('COUNT channels: ' + iInsertId);
		}
	}

	postMessage("ERROR NOT VALID");
	self.close();

}


function getDetailedHttpError( oHttp ) {

	var sStatusInfo = '<b>' + (oHttp.statusText ? oHttp.statusText : 'Unknown error') + '</b>';

	switch( oHttp.status ) {
		case 0:
		case 400:
        case 401:
        case 403:
            sStatusInfo += '<br>Your URL might be malformed or not available. Please check it.'; break;
        case 404:
            sStatusInfo += '<br>The requested URL was not found on the server. Please check it.'; break;
        case 408:
            sStatusInfo += '<br>The server took too long to respond. Try again later.'; break;
        case 429:
            sStatusInfo += '<br>You have sent too many requests in a short time. Try again later.'; break;
        case 500:
            sStatusInfo += '<br>Something went wrong on the server. Please contact your IPTV provider or try again later.'; break;
        case 502:
            sStatusInfo += '<br>The server received an invalid response from an upstream server. Please contact your IPTV provider or try again later.'; break;
        case 503:
            sStatusInfo += '<br>The server is currently unavailable. Try again later.'; break;
        case 504:
            sStatusInfo += '<br>The server did not receive a timely response from another server. Please contact your IPTV provider or try again later.'; break;
		default:
			if( oHttp.status > 400 && oHttp.status < 500 ) {
				sStatusInfo += '<br>The server responded with an error. It is likely that your URL is wrong or not available anymore. Please contact your IPTV provider.';
			} else if( oHttp.status >= 500 ) {
                sStatusInfo += '<br>Server Error: The server encountered an issue. Try again later or contact your IPTV provider.';
            }
	}

	return 'Detailed error: ' + oHttp.status + ' - ' + sStatusInfo;

}


var bGoogleDriveUrl = false;
function convertGoogleDriveUrl( sUrl ) {
	var aMatch = sUrl.match(/\/file\/d\/([^/]+)\//);
	if( aMatch && aMatch[1] ) {
		if( sDeviceFamily === 'Browser' ) {
			sUrl = 'https://proxy.m3u-ip.com/?id=' + aMatch[1];
		} else {
			sUrl = 'https://drive.usercontent.google.com/download?id=' + aMatch[1] + '&export=download&authuser=0';
		}
		bGoogleDriveUrl = true;
	}
	return sUrl;
}


function fixUrl( sUrl ) {

	if( sUrl.indexOf("dropbox.com") >= 0 ) {
		if( sUrl.indexOf("raw=1") > 1 ) {
			return sUrl;
		}

		if( sUrl.indexOf('?') > 1 ) {
			sUrl += '&raw=1';
		} else {
			sUrl += '?raw=1';
		}
	}

	if( sUrl.indexOf("https://drive.google.com/file/d/") === 0 ) {
		sUrl = convertGoogleDriveUrl(sUrl);
	}

	return sUrl;

}


function grabPlaylist( oPlaylist, bProxyFallback, oOriginHttp ) {

	var oFormData = false;
	postMessage('downloading');

	bGoogleDriveUrl = false;
	if( bProxyFallback ) {
		oFormData = new FormData();
		oFormData.append('sUrl', oPlaylist.url);
		oPlaylist.url = 'https://m3u-ip.tv/download.php?device=' + sDeviceFamily;
	} else {
		oPlaylist.url = fixUrl(oPlaylist.url);
	}

	fireRequest(oPlaylist.url, oFormData, function(oHttp) {
		processPlaylistData(oHttp.response);
	}, function(oHttp) { // error

		if( sDeviceFamily === 'Browser' && oHttp.status == 0 && location.protocol === 'https:' &&
			location.pathname.indexOf('/browser') === 0 && oPlaylist.url.indexOf('http:') === 0 ) {
			oHttp.abort();
			postMessage('ERROR HTTP BLOCKED');
			//grabPlaylist(oPlaylist, true, oHttp); // Try proxy fallback (CORS elimination)
			return false;
		}

		if( oOriginHttp ) {
			postMessage('ERROR: Status ' + getDetailedHttpError(oOriginHttp));
		} else if( oHttp.status == 0 ) {
			postMessage('ERROR: Unknown error. Please check your URL');
		} else {
			postMessage('ERROR: Status ' + getDetailedHttpError(oHttp));
		}

		self.close();
	}, function(oHttp) { // progress
		if( oHttp.loaded ) {
			var sDownloaded = (oHttp.loaded / 1024).toFixed(2);
			if( oHttp.total ) {
				sDownloaded += ' / ' + (oHttp.total / 1024).toFixed(2);
			}
			postMessage('Download progress: ' + sDownloaded);
		}
	});

}


///// Xtream

function parseXtremJson( oPlaylist, sContent, aCategoryData, sCallback ) {

	if( sContent ) {

		var aChannelData = JSON.parse(sContent), iMax = typeof(aChannelData) === 'object' ? aChannelData.length : 0, iCount = 0, aChannelList = [];

		if( iMax ) {

			var aChannel = {}, aCatchup = false, sType = sXtreamType, aCategories = {};

			// Categories
			if( aCategoryData ) {
				for( var i in aCategoryData ) {
					var oCat = aCategoryData[i];
					aCategories[oCat.category_id] = oCat.category_name;
				}
			}

			for( var i = 0; i < iMax; i++ ) {

				var oCh = aChannelData[i], sUrl = '', sTypePath = sType + '/', sFileName = '';

				switch( sType ) {
					case 'series':

						aChannel.cover = oCh.cover;
						aChannel.cast = oCh.cast;
						aChannel.plot = oCh.plot;
						aChannel.director = oCh.director;
						aChannel.genre = oCh.genre;
						aChannel.releasedate = oCh.releaseDate;
						aChannel.rating = oCh.rating; // oCh.rating_5based
						aChannel.episode_run_time = oCh.episode_run_time;
						aChannel.x_series_id = oCh.series_id;
						aChannel.url = oCh.series_id;

						break;

					case 'live':
					case 'movie':

						sFileName = oCh.stream_id;
						aChannel.logo = oCh.stream_icon;
						if( oCh.epg_channel_id ) {
							aChannel.tvgid = oCh.epg_channel_id;
							//aChannel.epgid = oCh.epg_channel_id;
						}

						if( oCh.is_adult ) { aChannel.adult = oCh.is_adult; }
						aChannel.x_stream_id = oCh.stream_id;

						if( oCh.tv_archive ) {
							aChannel.catchup = {
								type: 'xc',
								days: parseInt(oCh.tv_archive_duration)
							};
						}

						if( oCh.container_extension ) {
							sFileName += '.' + oCh.container_extension;
						} else {
							sFileName += '.' + oPlaylist.xtreamOutput;
						}

						aChannel.url = oPlaylist.server + sTypePath + oPlaylist.xtreamUser + '/' + oPlaylist.xtreamPw + '/' + sFileName;

				}

				if( aCategories[oCh.category_id] ) {
					aChannel.group = aCategories[oCh.category_id];
				}

				if( oCh.direct_source ) {
					aChannel.url = oCh.direct_source;
				}

				if( aChannel.url && oCh.name ) {
					iCount++;
					iInsertId++;
					aChannel.type = sType;
					aChannel.pid = iPlaylistId;
					aChannel.name = oCh.name;
					aChannel.pos = iInsertId;
					aChannelList.push(aChannel);
				}

				aChannel = {}; // reset
				aCatchup = false;

			}

		}

		if( iCount > 0 ) {

			postMessage('start insertChannels');
			insertChannels(aChannelList, function() {
				dbInsertCompleteHandler('insertChannels');
				sCallback();
			});

			return iCount;

		} else if( sContent === '[]' ) {
			//postMessage("ERROR NOT VALID");
			dbInsertCompleteHandler('insertChannels'); // allow empty list
			sCallback();
		}

	}

	//sCallback();
	return 0;

}


function processXtreamData( oPlaylist, sResult, aCategoryData, sCallback ) {

	if( sResult ) {
		var iChannelsParsed = parseXtremJson(oPlaylist, sResult, aCategoryData, sCallback);
		if( iChannelsParsed || sResult === '[]' ) {
			return postMessage('COUNT channels: ' + iInsertId);
		}
	}

	postMessage("ERROR NOT VALID");
	self.close();

}


var aDownloads = [];
function downloadXtreamApi( oPlaylist, iIndex, sCallback ) {

	if( !aDownloads[iIndex] ) {
		return false;
	}

	var sUrl = aDownloads[iIndex].url, sUrlCategories = aDownloads[iIndex].catUrl, sType = aDownloads[iIndex].type;
	sXtreamType = sType;

	// Download categories first
	fireRequest(sUrlCategories, false, function(oHttp) {
		var aCategoryData = JSON.parse(oHttp.response);

		// Download channels after categories
		fireRequest(sUrl, false, function(oHttp) {
			processXtreamData(oPlaylist, oHttp.response, aCategoryData, function() {
				iIndex++;
				if( !downloadXtreamApi( oPlaylist, iIndex, sCallback ) ) {
					sCallback('Xtream Download done');
				}
			});

		}, function(oHttp) {
			if( oHttp.status == 0 ) {
				postMessage('ERROR: Unknown error. Please check your URL');
			} else {
				postMessage('ERROR: Status ' + getDetailedHttpError(oHttp));
			}
		});

	}, function(oHttp) {
		if( oHttp.status == 0 ) {
			postMessage('ERROR: Unknown error. Please check your URL');
		} else {
			postMessage('ERROR: Status ' + getDetailedHttpError(oHttp));
		}
	});

	return true;

}


function grabXtream( oPlaylist ) {

	var sServerUrl = oPlaylist.server, sLogin = oPlaylist.xtreamUser, sPw = oPlaylist.xtreamPw;
	var sAuthUrl = sServerUrl + 'player_api.php?username=' + sLogin + '&password=' + sPw;

	// 1. Download Live TV
	aDownloads.push({type: 'live', url: sAuthUrl + '&action=get_live_streams', catUrl: sAuthUrl + '&action=get_live_categories'});

	// 2. Download Movies/VOD
	if( oPlaylist.xtreamIncludeVod ) {
		aDownloads.push({type: 'movie', url: sAuthUrl + '&action=get_vod_streams', catUrl: sAuthUrl + '&action=get_vod_categories'});
	}

	// 3. Download Series
	if( oPlaylist.xtreamIncludeSeries ) {
		aDownloads.push({type: 'series', url: sAuthUrl + '&action=get_series', catUrl: sAuthUrl + '&action=get_series_categories'});
	}

	iInsertTablesCount = aDownloads.length;

	downloadXtreamApi(oPlaylist, 0, function() {
		//console.log('grabXtream finish');
	});


	/*fireRequest(sUrl, false, function(oHttp) {
		processXtreamData(oPlaylist, oHttp.response);

		//console.log(oHttp.response);
		console.log('Xtream-Download completed', iIndex);

		iIndex++;
		if( aDownloads[iIndex] ) {

			console.log('next download', aDownloads[iIndex]);

			sUrl = aDownloads[iIndex].url; sXtreamType = aDownloads[iIndex].type;
			fireRequest(sUrl, false, function(oHttp) {
				processXtreamData(oPlaylist, oHttp.response);

				console.log('Xtream-Download completed', iIndex);

				iIndex++;
				if( aDownloads[iIndex] ) {
					sUrl = aDownloads[iIndex].url; sXtreamType = aDownloads[iIndex].type;
					fireRequest(sUrl, false, function(oHttp) {
						processXtreamData(oPlaylist, oHttp.response);

						console.log('Xtream-Download completed', iIndex);
						postMessage('finish');
					});
				}  else { postMessage('finish'); }

			});
		} else { postMessage('finish'); }
	}, function(oHttp) {
		console.log(oHttp);
	});
	*/

}


function truncateOldChannels( sCallback ) {

	postMessage('truncating');

	var txDelChannels = oDb.transaction("playlistChannels", "readwrite"), oStore = txDelChannels.objectStore("playlistChannels");
	var oIndex = oStore.index("pid"), oRange = IDBKeyRange.only(iPlaylistId);

	oIndex.openCursor(oRange).onsuccess = function(event) {
		var oRecord = event.target.result;
        if( oRecord ) {
			if( iTimeNow !== oRecord.value.ts ) {
				oRecord.delete();
			}
            oRecord.continue();
        }
    };

	txDelChannels.oncomplete = sCallback;
	txDelChannels.onerror = sCallback;

}


onmessage = function(e) {
	var aData = e.data;

	if( aData && aData.playlistData ) {
		var oPlaylist = aData.playlistData;
		sDeviceFamily = aData.device;
		iDbVersion = parseInt(aData.version);
		iPlaylistId = parseInt(oPlaylist.id);

		initDb(function() {
			try {
				if( oPlaylist.type == 'xtream' ) {
					grabXtream(oPlaylist); return;
				}

				if( aData.localPlaylist ) {
					processPlaylistData(aData.localPlaylist);
				} else {
					grabPlaylist(oPlaylist, false);
				}
			} catch( e ) {
				postMessage("ERROR: " + e.message);
			}
		});

	} else {
		postMessage("ERROR");
	}

};
