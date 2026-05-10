/*

	Copyright 2026 - Herber eDevelopment - Jaroslav Herber
	All rights reserved.

	This code is proprietary and confidential.
	Copying, modification, distribution, or use of this code without explicit permission is strictly prohibited.

*/

//importScripts('pako.min.js');
importScripts('fflate.js');
importScripts('sax.js');

var iEpgTimeShift = 0, iGrabIntervalSetting = 24, iKeepDays = 1, iFutureDays = 2, bKeepDescriptions = false, aPlaylistChannelIds = {}, aAllowProgramImportForId = {},
aChannelList = [], aEpgHead = {}, aMatchedPlaylistIds = [], aMatchedChannels = [], sDeviceFamily = '',
bDbInitiated = 0, oDb = false, iDbVersion = 1, oXmlParser = false, sXmlBuffer = '', iChannelsParsed = 0, iProgramsParsed = 0, bChannelsImportCompleted = false;

var oTimePast = new Date(), oTimeAhead = new Date(), iTimeNow = new Date().getTime();

var aBatchProgramms = [], aBatchChannelsRefs = [], aBatchChannels = [], iActiveTransactions = 0;
var oInput = false, iInputLength = 0, iChunkSize = 70000, iOffset = 0, oDecoder = new TextDecoder("utf-8"), oGunzip = new fflate.Gunzip(), isGzip = false;

Date.prototype.addHours = function( h ) {
	this.setTime(this.getTime() + (h*60*60*1000));
	return this;
};

Date.prototype.subHours = function( h ) {
	this.setTime(this.getTime() - (h*3600000));
	return this;
};

Date.prototype.addDays = function( d ) {
	this.setDate(this.getDate() + d);
	return this;
};

Date.prototype.subDays = function( d ) {
	this.setDate(this.getDate() - d);
	return this;
};


/*function sleep(milliseconds) {
	var date = Date.now();
	let currentDate = null;
	do {
		currentDate = Date.now();
	} while (currentDate - date < milliseconds);
}*/


function debug( mVar ) {
	console.log(mVar);
}


function getTimeNow() {

	if( iEpgTimeShift ) {
		var oDateNowLocal = new Date();
		oDateNowLocal.addHours(iEpgTimeShift);
		return oDateNowLocal.getTime();
	} else {
		return new Date().getTime();
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


function getValidTimestring( sTimeString ) {

	if( typeof sTimeString !== 'string' ) return false;

	if( /^\d{14}$/.test(sTimeString) ) {
		return sTimeString + ' +0000';
	}

	if( /^\d{14} [+-]\d{4}$/.test(sTimeString) ) {
		return sTimeString;
	}

	return false;

}


function getShiftedTimestring( xmltvDateStr ) {
	// Extract the original offset sign, hours and minutes
	var offsetSign = xmltvDateStr[15] === '+' ? 1 : -1;
	var offsetHours = parseInt(xmltvDateStr.slice(16, 18), 10);
	var offsetMinutes = parseInt(xmltvDateStr.slice(18, 20), 10);

	// Convert original offset to total minutes
	var totalOffsetMinutes = offsetSign * (offsetHours * 60 + offsetMinutes);

	// Convert shift to minutes and add it
	var shiftMinutes = Math.round(iEpgTimeShift * 60);
	totalOffsetMinutes += shiftMinutes;

	// Determine new sign
	var absMinutes = Math.abs(totalOffsetMinutes);
	var newSign = totalOffsetMinutes >= 0 ? '+' : '-', newOffsetHours = String(Math.floor(absMinutes / 60)).padStart(2, '0'), newOffsetMinutes = String(absMinutes % 60).padStart(2, '0');
	return xmltvDateStr.slice(0, 15) + newSign + newOffsetHours + newOffsetMinutes;
}


function parseEpgTime( sTimeString, iOffset ) {
    var year = parseInt(sTimeString.substring(0, 4), 10),
    month = parseInt(sTimeString.substring(4, 6), 10) - 1,
    day = parseInt(sTimeString.substring(6, 8), 10),
    hour = parseInt(sTimeString.substring(8, 10), 10),
    minute = parseInt(sTimeString.substring(10, 12), 10),
    second = parseInt(sTimeString.substring(12, 14), 10);

    // Convert timezone offset to minutes
    var offsetHours = parseInt(iOffset.substring(0, 3), 10), offsetMinutes = parseInt(iOffset.substring(0, 1) + iOffset.substring(3, 5), 10);

    // Convert to UTC by subtracting the offset
    return new Date(Date.UTC(year, month, day, hour, minute, second) - (offsetHours * 60 + offsetMinutes) * 60000);
}


function isExpired( sTimeString ) {

	if( !sTimeString ) { return true; }

	try {
		var aSplittedTime = sTimeString.match(/^(\d{14}) ([+-]\d{4})$/);
		if( aSplittedTime && aSplittedTime.length === 3 ) {
			var oDate = parseEpgTime(aSplittedTime[1], aSplittedTime[2]);
			return ( oTimeAhead < oDate || oDate < oTimePast );
		}
	} catch( e ) {}

	return true;

}


function isExpiredRange( sTimeStart, sTimeEnd ) {

	if( !sTimeStart || !sTimeEnd ) { return true; }

	try {
		var aSplittedTime = sTimeStart.match(/^(\d{14}) ([+-]\d{4})$/);
		if( aSplittedTime && aSplittedTime.length === 3 ) {
			var oDate = parseEpgTime(aSplittedTime[1], aSplittedTime[2]);
			if( oTimeAhead < oDate ) { return true; }
		}

		aSplittedTime = sTimeEnd.match(/^(\d{14}) ([+-]\d{4})$/);
		if( aSplittedTime && aSplittedTime.length === 3 ) {
			oDate = parseEpgTime(aSplittedTime[1], aSplittedTime[2]);
			if( oDate < oTimePast ) { return true; }
		}

	} catch( e ) {}

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


function isGzipped(arrayBuffer) {
    if (!arrayBuffer || arrayBuffer.byteLength < 2) return false;
    var bytes = new Uint8Array(arrayBuffer);
    return bytes[0] === 0x1F && bytes[1] === 0x8B; // Gzip magic number
}


function fetchRequest( sUrl, oFormdata, sOnSuccess, sOnFailure ) {

	if (!sUrl || typeof sOnSuccess !== 'function' || typeof sOnFailure !== 'function') {
		return false;
	}

	// Timeout wrapper around fetch
	var controller = new AbortController();
	var timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes
	var oHeaders = new Headers({
		//'Accept': 'text/xml',
		//'Pragma': 'no-cache',
		'Accept': 'application/json',
		'Content-Type': 'application/x-www-form-urlencoded'
	});

	var aOptions = {
		method: oFormdata ? 'POST' : 'GET',
		body: oFormdata || undefined,
		signal: controller.signal,
		referrerPolicy: 'no-referrer',
		referrer: '',
		mode: 'no-cors',
		headers: oHeaders
	};

	fetch(sUrl, aOptions)
		.then(response => {
			console.log(response);

			clearTimeout(timeoutId);
			if (!response.ok) {
				throw response;
			}
			return response;
		})
		.then(response => sOnSuccess(response))
		.catch(error => {
			sOnFailure(error);
		});


	return true;
}


function fireRequest( sUrl, oFormdata, sOnSuccess, sOnFailure, sOnProgress ) {

	var oHttp = new XMLHttpRequest(), bFailureFired = false;
	oHttp.responseType = 'arraybuffer';

	oHttp.onreadystatechange = function() {
		if( oHttp.readyState == XMLHttpRequest.DONE ) { // oHttpRequest.DONE == 4
			/*if( oHttp.status === 520 ) {
				return fetchRequest(sUrl, oFormdata, sOnSuccess, sOnFailure);
			}*/

			if( !oHttp.status || oHttp.status > 399 ) {
				oHttp.customError = oHttp.statusText;
				if( !bFailureFired ) { bFailureFired = true; sOnFailure(oHttp); }
			} else {
				sOnSuccess(oHttp);
			}
		}
	};

	if( typeof(sOnProgress) === 'function' ) {
		oHttp.addEventListener('progress', sOnProgress);
	}

	oHttp.addEventListener('error', function() {
		oHttp.customError = oHttp.statusText ? oHttp.statusText : 'Unknown error. Check your URL.';
		if( !bFailureFired ) { bFailureFired = true; sOnFailure(oHttp); }
	});
	oHttp.addEventListener('abort', function() {
		oHttp.customError = oHttp.statusText ? oHttp.statusText : 'Aborted. Check your network.';
		if( !bFailureFired ) { bFailureFired = true; sOnFailure(oHttp); }
	});
	oHttp.addEventListener('timeout', function() {
		oHttp.customError = oHttp.statusText ? oHttp.statusText : 'Timeout. Check your network.';
		if( !bFailureFired ) { bFailureFired = true; sOnFailure(oHttp); }
	});

	if( sUrl && typeof(sOnSuccess) === 'function' && typeof(sOnFailure) === 'function' ) {
		try {
			if( oFormdata ) {
				oHttp.open("POST", sUrl, true);
				oHttp.send(oFormdata);
			} else {
				if( sUrl.slice(-4) === ".xml" ) {
					//sUrl += '?m3t=' + new Date().getTime();
				}

				oHttp.open("GET", sUrl, true);
				//oHttp.setRequestHeader('Some-time', 'no-cache');
				//oHttp.setRequestHeader('Pragma', 'no-cache');
				//oHttp.setRequestHeader('Expires', 'Sat, 01 Jan 2000 00:00:00 GMT');
				oHttp.send();
			}
		} catch( e ) {
			e.customError = e.message;
			if( !bFailureFired ) { bFailureFired = true; sOnFailure(e); }
			return false;
		}
		return true;
	}

	return false;

}


var iInsertedTables = 0;
function dbInsertCompleteHandler( sStoreName ) {
	iInsertedTables++;
	//debug('dbInsertComplete: ' + sStoreName);
	// close worker, if insert-job is done
	if( iInsertedTables === 1 ) {
		//debug('everything is done. Close worker. Thank you!');

		// delete old records
		truncatePrograms(aEpgHead.id, function() {
			postMessage('finish'); self.close();
		});

		//postMessage('finish');
		//self.close();
	}
}


function dbErrorHandler( event ) {
	if( event.target.error.name === "QuotaExceededError" || event.target.error.name === "NS_ERROR_DOM_QUOTA_REACHED" ) {
		postMessage('ERROR: Not enough space');
	} else {
		postMessage('ERROR: ' + event.target.error.message);
	}
}


function addChannelId( sChannelId, iUid ) {

	if( sChannelId ) {
		if( !aPlaylistChannelIds[sChannelId] ) {
			aPlaylistChannelIds[sChannelId] = {};
		}
		aPlaylistChannelIds[sChannelId][iUid] = 1;
	}

}


function getPlaylistChannels( iPlaylistId, sOnSuccess, sOnFailure ) {

	var oTx = oDb.transaction("playlistChannels"), oStore = oTx.objectStore("playlistChannels"), oIndex = oStore.index('pid');

	/*if( iPlaylistId == undefined ) {
		var oRequest = oIndex.openCursor();
	} else {
		iPlaylistId = parseInt(iPlaylistId);
		var oRange = IDBKeyRange.only(iPlaylistId), oRequest = oIndex.openCursor();
	}*/

	var oRequest = oIndex.openCursor();

	aChannelList = [];

	var iUid = 0;
	oRequest.onsuccess = (event) => {
		var oRecord = event.target.result;
		if( oRecord && oRecord.value ) {
			if( !oRecord.value.logo ) {
				aChannelList[iUid] = oRecord.value;
			}

			addChannelId(oRecord.value.name, iUid);
			addChannelId(oRecord.value.tvgid, iUid);
			addChannelId(oRecord.value.tvgn, iUid);

			iUid++;
		}

		if( oRecord ) {
			oRecord.continue();
		}
	};

	oRequest.onerror = function(e) {
		if( typeof(sOnFailure) === 'function' ) {
			sOnFailure(e);
		}
	};

	oTx.oncomplete = function() {
		if( typeof(sOnSuccess) === 'function' ) {
			sOnSuccess(iUid);
		}
	};

}


function findPlaylistChannels( sChannelId, aDisplayNames ) {

	var aChannelIds = [];

	/*if( sChannelId in aPlaylistChannelIds ) {
		for( iUid in aPlaylistChannelIds[sChannelId] ) {
			aChannelIds.push(iUid);
		}
	}*/

	for( var i = 0; i < aDisplayNames.length; i++ ) {
		var sId = aDisplayNames[i];
		if( sId in aPlaylistChannelIds ) {
			for( iUid in aPlaylistChannelIds[sId] ) {
				aChannelIds.push(iUid);
			}
		}
	}

	if( aChannelIds.length ) {
		aAllowProgramImportForId[sChannelId] = 1;
		return aChannelIds;
	}

	return false;

}


function insertProgrammsBatch( iCollectCount, sCallback ) {

	var iCurrentBatchSize = aBatchProgramms.length;
	if( iCurrentBatchSize < iCollectCount ) { sCallback(); return false; }

	if( !bChannelsImportCompleted ) {
		bChannelsImportCompleted = true;
		if( iChannelsParsed ) {
			postMessage('channels complete');
		}
	}

	var oTxProg = oDb.transaction("epgProgramme", "readwrite", {durability: 'relaxed'}), oStoreProg = oTxProg.objectStore("epgProgramme");
	iActiveTransactions++;

	aBatchProgramms.forEach(function( oCurrentProgramm ) {
		oStoreProg.put(oCurrentProgramm);
	});

	postMessage('OK programms: ' + iProgramsParsed);

	aBatchProgramms = [];
	oTxProg.oncomplete = function( ee ) {
		//debug('program batch added');
		iActiveTransactions--;
		sCallback();
	};

	oTxProg.onabort = function( e ) {
		debug(e);
		dbErrorHandler(e); self.close();
	};

}


function insertChannelsRefsBatch( iCollectCount, sCallback ) {

	var iCurrentBatchSize = aBatchChannelsRefs.length;
	if( iCurrentBatchSize < iCollectCount ) { sCallback(); return false; }

	var oTxChans = oDb.transaction("epgChannels", "readwrite", {durability: 'relaxed'}), oStoreChannels = oTxChans.objectStore("epgChannels");

	iActiveTransactions++;

	aBatchChannelsRefs.forEach(function( oPlaylistChannel ) {
		oStoreChannels.put(oPlaylistChannel);
	});

	postMessage('OK channels: ' + iChannelsParsed);

	aBatchChannelsRefs = [];
	oTxChans.oncomplete = function( e ) {
		//debug('channel batch added');
		iActiveTransactions--;
		sCallback();
	};

	oTxChans.onabort = function( e ) {
		debug(e);
		dbErrorHandler(e); self.close();
	};

}


/*
	Needed to save channel logos
*/
function insertChannelsBatch( iCollectCount, sCallback ) {

	var iCurrentBatchSize = aBatchChannels.length;
	if( iCurrentBatchSize < iCollectCount ) { sCallback(); return false; }

	var oTxChans = oDb.transaction("playlistChannels", "readwrite"), oStoreChans = oTxChans.objectStore("playlistChannels");

	iActiveTransactions++;

	aBatchChannels.forEach(function( oPlaylistChannel ) {
		oStoreChans.put(oPlaylistChannel);
	});

	postMessage('OK channels: ' + iChannelsParsed);

	aBatchChannels = [];
	oTxChans.oncomplete = function( e ) {
		//debug('channel batch added');
		iActiveTransactions--;
		sCallback();
	};

	oTxChans.onabort = function( e ) {
		debug(e);
		dbErrorHandler(e); self.close();
	};

}


function initXmlParser() {

	if( oXmlParser ) { return true; }

	var sTag = false, sChannelId = false, sIcon = false, oPlaylistChannel = false, oCurrentProgramm = false, aDisplayNames = [],
		sRating = false, sCategory = false;
/*
	var oTx = oDb.transaction(["playlistChannels", "epgProgramme"], "readwrite"),
		oStoreChans = oTx.objectStore("playlistChannels"), oStoreProg = oTx.objectStore("epgProgramme");

	oTx.oncomplete = function( e ) {
		dbInsertCompleteHandler('insertProgramms');
	};
	oTx.onabort = function( e ) {
		debug(e);
		dbErrorHandler(e);
		self.close();
		//dbInsertCompleteHandler('insertProgramms');
	};*/

	oXmlParser = sax.parser(true);
	oXmlParser.onopentag = function(node) {

		if( node.name === 'desc' && !bKeepDescriptions ) {
			return;
		}

		if( node.name === 'stereo' || node.name === 'audio' ) {
			return;
		}

		sTag = node.name;

		if( sTag === "channel" ) {
			sChannelId = node.attributes.id;
			aDisplayNames.push(sChannelId);
			return;
		}

		if( sTag === "icon" ) {
			sIcon = node.attributes.src;
			return;
		}

		if( sTag === "programme" ) {

			var sStart = getValidTimestring(node.attributes.start), sStop = getValidTimestring(node.attributes.stop);
			if( !sStart || !sStop ) {
				sTag = false; sIcon = false; oCurrentProgramm = false; return;
			}

			if( iEpgTimeShift ) {
				sStart = getShiftedTimestring(sStart); sStop = getShiftedTimestring(sStop);
			}

			// If date is out of range, skip
			if( isExpired(sStop) ) {
				sTag = false; sIcon = false; oCurrentProgramm = false; return;
			}

			oCurrentProgramm = {
				id: node.attributes.channel,
				eid: aEpgHead.id, // EPG source id
				start: sStart,
				stop: sStop,
				ts: iTimeNow
			};

		}

		if( sTag === "rating" ) {
			sRating = node.attributes.system;
		}

		if( oCurrentProgramm && sTag === "subtitles" ) {
			oCurrentProgramm.subtitles = node.attributes.type;
		}

	};

	oXmlParser.ontext = function( sText ) {

		sText = sText.trim();
		if( !sText ) { return; }

		if( sChannelId !== false ) {
			if( sTag === 'display-name' ) {
				aDisplayNames.push(sText);
			}
			return;
		}

		if( sRating && sTag === 'value' ) {
			oCurrentProgramm.rating = sRating + ': ' + sText;
			sRating = false; return;
		}

		if( oCurrentProgramm && sTag ) {
			if( sTag === 'desc' && sText.length < 3 ) { return; }
			if( oCurrentProgramm[sTag] ) {
				oCurrentProgramm[sTag] += '|' + sText;
			} else {
				oCurrentProgramm[sTag] = sText;
			}
		}

	};

	oXmlParser.onclosetag = function( tagName ) {

		if( tagName === "channel" ) {

			if( aDisplayNames && sChannelId ) {
				var aChannels = findPlaylistChannels(sChannelId, aDisplayNames); // Collect channels for program import
				for( var i = 0; i < aDisplayNames.length; i++ ) {
					aBatchChannelsRefs.push({
						eid: aEpgHead.id,
						name: aDisplayNames[i],
						chid: sChannelId
					});
				}

				if( sIcon && aChannels ) {
					for( var i = 0; i < aChannels.length; i++ ) {
						var iMatchedChannelId = aChannels[i], oPlaylistChannel = aChannelList[iMatchedChannelId] ? aChannelList[iMatchedChannelId] : false;
						if( oPlaylistChannel && !oPlaylistChannel.logo ) {
							oPlaylistChannel.logo = sIcon;
							aBatchChannels.push(oPlaylistChannel);
							//delete aChannelList[iMatchedChannelId];
						}
					}
				}

				iChannelsParsed++;

				/*if( (iChannelsParsed % 100) === 0 ) {
					insertChannelsBatch(iChannelsParsed);
					postMessage('OK channels: ' + iChannelsParsed);
				}*/

			}

			aDisplayNames = []; sChannelId = false;
			sIcon = false; oPlaylistChannel = false;
			return;
		}

		if( tagName === "programme" && oCurrentProgramm ) {
			if( oCurrentProgramm.id in aAllowProgramImportForId ) {

				if( sIcon ) {
					oCurrentProgramm.pic = sIcon;
				}

				aBatchProgramms.push(oCurrentProgramm);
				//oStoreProg.put(oCurrentProgramm);
				iProgramsParsed++;

				/*if( (iProgramsParsed % 500) === 0 ) {
					insertProgrammsBatch(iProgramsParsed);
					postMessage('OK programms: ' + iProgramsParsed);
				}*/
			}

			sIcon = false; oCurrentProgramm = false; sRating = false; return;
		}

		if( tagName === "tv" ) {
			//debug('XML process finished');
		}

		sTag = false;

	};

	oXmlParser.onerror = function( e ) {
		console.log('parser error', e);
	};

}


function getDetailedHttpError( oHttp ) {

	var sStatusText = oHttp.customError ? oHttp.customError : oHttp.statusText;
	var sStatusInfo = '<b>' + (sStatusText ? sStatusText : 'Unknown error') + '</b>';

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


function processChunk( sXmlChunk ) {

	sXmlBuffer += sXmlChunk;

	// Process the XML-code up to last closing tag
	var iLastCloseTagIndex = sXmlBuffer.lastIndexOf("</"); // find last close tag
	if( iLastCloseTagIndex !== -1 ) {
		var iEndTagIndex = sXmlBuffer.indexOf(">", iLastCloseTagIndex);
		if( iEndTagIndex !== -1 ) {
			oXmlParser.write(sXmlBuffer.substring(0, iEndTagIndex + 1));
			sXmlBuffer = sXmlBuffer.substring(iEndTagIndex + 1);
		}
	}

	// Insert batches to DB
	insertChannelsRefsBatch(100, function() {
		insertChannelsBatch(50, function() {
			insertProgrammsBatch(250, function() {
				setTimeout(doChunkImport, 1);
			});
		});
	});

}


oGunzip.ondata = function(oChunk, bFinal) {
	processChunk(oDecoder.decode(oChunk));
};


function doChunkImport() {

	if( iOffset < iInputLength ) {
		var iNextOffset = iOffset + iChunkSize, oChunk = oInput.subarray(iOffset, iNextOffset);

		if( isGzip ) {
			if( iNextOffset >= iInputLength ) { // Last chunk!
				oChunk = oInput.subarray(iOffset);
				oGunzip.push(oChunk, true);
			} else {
				oGunzip.push(oChunk);
			}
		} else {
			processChunk(oDecoder.decode(oChunk));
		}

		iOffset = iNextOffset;

	} else {
		if( !iChannelsParsed ) {
			postMessage("ERROR: Is this a valid EPG/XML-file?");
			self.close();
		}

		insertChannelsRefsBatch(1, function() {
			insertChannelsBatch(1, function() {
				insertProgrammsBatch(1, function() {
					dbInsertCompleteHandler('all');
				});
			});
		});

	}

}


function grabXml() {

	postMessage('downloading'); iChannelsParsed = 0; iProgramsParsed = 0;

	fireRequest(aEpgHead.url, false, function(oHttp) {

		postMessage('download complete');

		if( oHttp.response ) {

			if( oHttp.responseType === 'arraybuffer' ) {
				initXmlParser();

				isGzip = oHttp.response.byteLength > 2 && new DataView(oHttp.response).getUint16(0, true) === 0x8B1F;
				oInput = new Uint8Array(oHttp.response); iInputLength = oInput.length;

				postMessage('writing');
				doChunkImport();

			}

			//console.log('download complete', iChannelsParsed);

			/*
			if( iChannelsParsed ) {
				//postMessage('finish'); // indexedDB is still working, cannot close worker here
			} else {
				postMessage("ERROR: Is this a valid EPG/XML-file?");
				self.close();
			}*/

		} else {
			postMessage("ERROR: Is this a valid EPG/XML-file?");
			self.close();
		}

	}, function(oHttp) {
		postMessage('ERROR: Status ' + getDetailedHttpError(oHttp));
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


function truncatePrograms( iEpgId, sCallback ) {

	postMessage('truncating');

	var txDelPrograms = oDb.transaction("epgProgramme", "readwrite"), oStore = txDelPrograms.objectStore("epgProgramme");
	var oIndex = oStore.index("epg_id"), oRange = IDBKeyRange.only(iEpgId);

	//debug("truncate start: " + performance.now());

	// First, delete expired programs
	/*
	oIndex.getAllKeys(oRange).onsuccess = function(event) {
		var oKeys = event.target.result;
        oKeys.forEach(key => oStore.delete(key));
		debug("truncate end: " + performance.now());
		//sCallback();
	};*/

	oIndex.openCursor(oRange).onsuccess = function(event) {
		var oRecord = event.target.result;
        if( oRecord ) {
			if( iTimeNow !== oRecord.value.ts ) {
				oRecord.delete();
			}
			/*if( isExpired(oRecord.value.start) ) {
				//debug('expired: ' + oRecord.value);
				oRecord.delete();
			}*/
            oRecord.continue();
        } else {
			//debug('programs deleted for id: ' + iEpgId);
			//debug("truncate end: " + performance.now());
		}
    };

	txDelPrograms.oncomplete = sCallback;
	txDelPrograms.onerror = sCallback;

}


onmessage = function(e) {

	var aData = e.data;
	if( aData ) {
		iDbVersion = parseInt(aData.version);
		aEpgHead = aData.epgHead;
		iEpgTimeShift = parseFloat(aEpgHead.timeshift);
		iGrabIntervalSetting = parseInt(aData.interval);
		iKeepDays = parseInt(aData.keepDays);
		iFutureDays = parseInt(aData.futureDays);
		bKeepDescriptions = aData.descriptions;
		sDeviceFamily = aData.device;

		if( iFutureDays ) {
			oTimeAhead.addDays(iFutureDays);
		} else {
			oTimeAhead.addHours(iGrabIntervalSetting + 10);
		}

		if( iKeepDays ) { oTimePast.subDays(iKeepDays); }
		else { oTimePast.subHours(2); }

		initDb(function() {
			try {
				getPlaylistChannels(aEpgHead.pid, function(iUid) {
					if( !iUid ) {
						postMessage("ERROR: no available channels/playlists available.");
					} else {
						grabXml();
						//truncatePrograms(aEpgHead.id, grabXml);
					}
				});
			} catch( e ) {
				postMessage("ERROR: " + e.message);
			}
		});

	} else {
		postMessage("ERROR: no data given"); // Should not happen
		self.close();
	}

};
