/* Copyright 2026 - Herber eDevelopment - Jaroslav Herber */

var iCurrentChannel = 0, iCurrentPlaylistId = 0, oLoader = getEl('loader'), aLoadedPlaylists = {}, oCurrentPlaylist = false,
oEpgOverview = getEl('epg_overview_table'), oChanneList = getEl('epg_channels'), oProgramsList = getEl('epg_programme'), oEpgDetails = getEl('epg_details'), oActiveDetailsProgram = false,
bEpgTableBuilt = false, iEpgNavListClockTimer = false, iSelectedEpgOverviewChannel = false, aActiveChannelList = [], aLoadedProgramms = [], iBrowsePosition = 0,
iEpgOverviewScrollMin = 0, iEpgOverviewScrollMax = 0, iLastOverviewScrollPosY = 0, iLastOverviewScrollPosX = 0, aLazyLoadedOverviewItems = {}, iEpgOverviewItemHeight = 65,
sPlaylistArchiveType = false, oTimeline = getEl('epg_timeline'), oCurrentTimeline = getEl('epg_current_timeline'), oCurrentTime = getEl('current_time'), oTimestamps = getEl('epg_timestamp_container');

var oTimePast = new Date(), oTimeAhead = new Date(), iTimePast = 0;


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


function getTimeNow() {

	if( iEpgTimeShift ) {
		var oDateNowLocal = new Date();
		oDateNowLocal.addHours(iEpgTimeShift);
		return oDateNowLocal.getTime();
	} else {
		return new Date().getTime();
	}

}


function getProgramDuration( oDateStart, oDateStop ) {

	if( oDateStart && oDateStop ) {
		return oDateStop.getTime() - oDateStart.getTime();
	}

	return '';

}


function parseEpgTime( sTimeString, iOffset ) {
	var year = parseInt(sTimeString.substring(0, 4), 10);
	var month = parseInt(sTimeString.substring(4, 6), 10) - 1;
	var day = parseInt(sTimeString.substring(6, 8), 10);
	var hour = parseInt(sTimeString.substring(8, 10), 10);
	var minute = parseInt(sTimeString.substring(10, 12), 10);
	var second = parseInt(sTimeString.substring(12, 14), 10);

	// Convert timezone offset to minutes
	var offsetHours = parseInt(iOffset.substring(0, 3), 10);
	var offsetMinutes = parseInt(iOffset.substring(0, 1) + iOffset.substring(3, 5), 10); // Keeps sign

	// Convert to UTC by subtracting the offset
	return new Date(Date.UTC(year, month, day, hour, minute, second) - (offsetHours * 60 + offsetMinutes) * 60000);
}


function isExpired( sTimeString ) {

	if( !sTimeString ) { return true; }

	try {
		var aSplittedTime = sTimeString.match(/^(\d{14}) ([+-]\d{4})$/);
		if( aSplittedTime && aSplittedTime.length === 3 ) {
			var oDate = parseEpgTime(aSplittedTime[1], aSplittedTime[2]);
			return ( oDate < oTimePast );
		}
	} catch( e ) {}

	return true;

}


function getEpgDateObject( sTimeString, iAddTimezoneHours ) {

	if( sTimeString ) {

		var aSplittedTime = sTimeString.match(/^(\d{14}) ([+-]\d{4})$/);

		if( aSplittedTime ) {
			return parseEpgTime(aSplittedTime[1], aSplittedTime[2]);
		}

		return false;

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

function getTimelineString( oDate ) {

	var sDatePart = oDate.toLocaleDateString(navigator.language, {
		weekday: 'long',
		day: '2-digit',
		month: '2-digit'
	});

	var aOptions = {
		hour: '2-digit',
		minute: '2-digit'
	};

	if( b24HoursClock ) {
		aOptions.hour12 = false;
	}

	return sDatePart + '<br>' + oDate.toLocaleTimeString(navigator.language, aOptions);

}


function getTimeString( oDate, aOptions ) {

	if( typeof(oDate) === 'string' ) {
		oDate = getEpgDateObject(oDate);
	}

	var aOptions = aOptions || {
		hour: '2-digit',
		minute: '2-digit'
	};

	if( aOptions.showDate ) {
		aOptions = {
			weekday: 'long',
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		};
	}

	if( b24HoursClock ) {
		aOptions.hour12 = false;
	}

	return oDate.toLocaleTimeString(navigator.language, aOptions);

}


function bootPlaylistReady( sOnSuccess, sOnFailure ) {

	loadPlaylists(function() {
		if( aLoadedPlaylists && aLoadedPlaylists[iCurrentPlaylistId] && aLoadedPlaylists[iCurrentPlaylistId].channelCount ) {
			oCurrentPlaylist = aLoadedPlaylists[iCurrentPlaylistId];
		}
		getPlaylistChannels(iCurrentPlaylistId, sOnSuccess, sOnFailure);
	}, sOnFailure);

}


function loadPlaylistsFromLocalStorage( sOnSuccess, sOnFailure ) {

	var sPlaylistsStorage = localStorage.getItem('aPlaylists');
	if( sPlaylistsStorage ) {

		try {
			aLoadedPlaylists = JSON.parse(sPlaylistsStorage);
		} catch( e ) {
			sOnFailure(e);
			return false;
		}

		if( aLoadedPlaylists && typeof(aLoadedPlaylists) === 'object' ) {
			sOnSuccess();
			return true;
		}

	}

	return false;

}


function loadPlaylists( sOnSuccess, sOnFailure ) {

	if( loadPlaylistsFromLocalStorage(sOnSuccess, sOnFailure) ) {
		return;
	}

	if( bDbInitiated && oDb ) {

		setBootStatusText('Loading playlist');
		aLoadedPlaylists = {};

		var oTx = oDb.transaction("playlistStore"), oStore = oTx.objectStore("playlistStore"),
			oIndex = oStore.index('id'), oRequest = oIndex.openCursor();

		oRequest.onsuccess = function(event) {
			var oRecord = event.target.result;
			if( oRecord && oRecord.value ) {
				var oPlaylist = oRecord.value;
				aLoadedPlaylists[oPlaylist.id] = oPlaylist;
				oRecord.continue();
			}
		};

		oRequest.onerror = function(e) {
			sOnFailure(e);
		};

		oTx.oncomplete = function() {
			sOnSuccess();

/*			var sHtml = '';

			for( var i in aLoadedPlaylists ) {
				if( !aLoadedPlaylists[i].channelCount ) {
					continue;
				}

				var sSelected = '', sName = '';
				if( aLoadedPlaylists[i].name ) {
					sName = aLoadedPlaylists[i].name;
				} else {
					sName = getLang('noPlaylistName');
				}

				if( aLoadedPlaylists[i].channelCount ) {
					sName += ' (' + aLoadedPlaylists[i].channelCount + ')';
				}

				if( iCurrentPlaylistId == i ) {
					sSelected = 'class="selected active"';
				}
				sHtml += '<li data-pid="' + i + '" ' + sSelected + '>' + sName + '</li>';
			}

			sHtml += '<li id="selector_open_playlist_manager" class="i18n icon icon-settings" data-langid="playlistSelectorOpenPm">' + getLang('playlistSelectorOpenPm') + '</li>';
*/
		};

	}

}


function getPlaylistChannels( iPlaylistId, sOnSuccess, sOnFailure ) {

	setBootStatusText('Loading channels');

	iPlaylistId = parseInt(iPlaylistId);

	var oTx = oDb.transaction("playlistChannels"), oStore = oTx.objectStore("playlistChannels"),
		oIndex = oStore.index('pid'), oRange = IDBKeyRange.only(iPlaylistId), oRequest = oIndex.getAll(oRange);

	oRequest.onsuccess = function(e) {
		aActiveChannelList = e.target.result.filter(r => !r.deleted);
	};

	oRequest.onerror = function(e) {
		if( typeof(sOnFailure) === 'function' ) {
			sOnFailure(e);
		}
	};

	oTx.oncomplete = function() {
		if( typeof(sOnSuccess) === 'function' ) {
			sOnSuccess(iPlaylistId);
		}
	};

}


function loadChannelAndClose( iCh ) {
	parent.loadChannel(iCh);
	hideEpgOverview();
}


function loadArchiveUrl( aData ) {

	if( !aData.catchup ) { return false; }

	// Is license active?
	if( !isPremiumAccessAllowed() ) {
		showModal(getLang('license-archive-play-fail'));
		return false;
	}

	if( typeof(parent.loadArchiveChannel) !== 'function' ) {
		console.log('please open the player first.');
		return;
	}

	aData = JSON.parse(JSON.stringify(aData)); // Transform DOMStringMap to object

	if( aData ) {
		parent.loadArchiveChannel(aData);
	} else {
		// cannot load archive! TODO
	}

}


// ------------ EPG ------------
function setEpgDetailsChannel( oProgramElement ) {
	if( oProgramElement && loadEpgDetailsChannel(oProgramElement.dataset.channelnum, oProgramElement.id) ) {
		if( oActiveDetailsProgram ) { oActiveDetailsProgram.classList.remove('active-details'); }
		oActiveDetailsProgram = oProgramElement;
		oActiveDetailsProgram.classList.add('active-details');
	}
}


function getProgramAtPos( iCh, iPos ) {

	var aChannelPrograms = aPrograms[iCh];
	if( aChannelPrograms ) {
		for( var sId in aChannelPrograms ) {
			if( aChannelPrograms[sId].left <= iPos && aChannelPrograms[sId].right > iPos ) {
				return createProgram(iCh, aChannelPrograms[sId], true);
			}
		}
	}

	return false;

}


function getNextProgramElement( iCh, iPos ) {

	var iCurrentLeft = iPos;

	if( !iCurrentLeft && oActiveDetailsProgram ) {
		iCh = oActiveDetailsProgram.dataset.channelnum;
		var iProgId = oActiveDetailsProgram.id, oCurrentProgram = aPrograms[iCh][iProgId];
		if( oCurrentProgram ) {
			iCurrentLeft = oCurrentProgram.left;
		}
	}

	if( aPrograms[iCh] && iCurrentLeft ) {
		var oNextProgram = false, iNearestLeft = false;
		for( var sId in aPrograms[iCh] ) {
			var iLeft = aPrograms[iCh][sId].left;
			if( iCurrentLeft < iLeft ) {
				if( iNearestLeft === false || iNearestLeft > iLeft ) {
					iNearestLeft = iLeft;
					oNextProgram = aPrograms[iCh][sId];
				}
			}
		}

		if( oNextProgram ) {
			return createProgram(iCh, oNextProgram, true);
		}
	}

	return false;

}


function getPrevProgramElement( iCh, iPos ) {

	var iCurrentLeft = iPos;

	if( !iCurrentLeft && oActiveDetailsProgram ) {
		iCh = oActiveDetailsProgram.dataset.channelnum;
		var iProgId = oActiveDetailsProgram.id, oCurrentProgram = aPrograms[iCh][iProgId];
		if( oCurrentProgram ) {
			iCurrentLeft = oCurrentProgram.left;
		}
	}

	if( aPrograms[iCh] && iCurrentLeft ) {
		var oPrevProgram = false, iNearestLeft = false;
		for( var sId in aPrograms[iCh] ) {
			var iLeft = aPrograms[iCh][sId].left;
			if( iCurrentLeft > iLeft ) {
				if( iNearestLeft === false || iNearestLeft < iLeft ) {
					iNearestLeft = iLeft;
					oPrevProgram = aPrograms[iCh][sId];
				}
			}
		}

		if( oPrevProgram ) {
			return createProgram(iCh, oPrevProgram, true);
		}
	}

	return false;

}


function loadChannelEpgIds( sEpgId, sCallback, sErrorCallback ) {

	if( !sEpgId ) {
		sErrorCallback(false); return;
	}

	var singleKeyRange = IDBKeyRange.only(sEpgId), oRequest = oDb.transaction("epgChannels").objectStore("epgChannels").index('ch_name');

	oRequest.openCursor(singleKeyRange).onsuccess = function(event) {
		var oRecord = event.target.result;
		if( oRecord && oRecord.value ) {
			sCallback(oRecord.value.chid);
		} else {
			sErrorCallback(false);
		}
	};

	oRequest.onerror = sErrorCallback;

}


function getChannelEpgId( oChannel, sCallback ) {

	if( oChannel ) {

		if( oChannel.epgid ) {
			sCallback(oChannel.epgid); return true;
		}

		loadChannelEpgIds(oChannel.tvgid, function(sEpgId) {
			oChannel.epgid = sEpgId;
			sCallback(sEpgId);
		}, function() {
			loadChannelEpgIds(oChannel.tvgn, function(sEpgId) {
				oChannel.epgid = sEpgId;
				sCallback(sEpgId);
			}, function() {
				loadChannelEpgIds(oChannel.name, function(sEpgId) {
					oChannel.epgid = sEpgId;
					sCallback(sEpgId);
				}, function() { oChannel.epgid = false; sCallback(false); });

			});
		});

		return true;

	}

	sCallback(false); return false;

}


function loadEpgDetailsChannel( iCh, iProgId ) {

	if( !iProgId ) { return false; }

	var oProgram = aPrograms[iCh][iProgId]; // aLoadedProgramms[iProgId];
	if( oProgram ) {
		var sHtml = '', sTags = '', sImage = '';

		if( oProgram.pic ) {
			sImage = '<div id="program_image"><img id="image" src="' + oProgram.pic + '" width="60"></div>';
		}

		sHtml += sImage + '<h2>' + oProgram.title + '</h2>';

		if( oProgram['sub-title'] ) {
			sHtml += '<h3>' + oProgram['sub-title'] + '</h3>';
		}

		sHtml += '<p>' + getTimeString(oProgram.start, {showDate: true}) + ', ' + getTimeString(oProgram.start) + ' – ' + getTimeString(oProgram.stop);

		if( oProgram.category ) {
			var aCategories = oProgram.category.split("|");
			for( var i = 0; i < aCategories.length; i++ ) {
				//sHtml += ' <span class="epg-program-category">' + aCategories[i] + '</span>';
				sTags += '<div class="epg-tag epg-program-category">' + aCategories[i] + '</div>';
			}
		}

		sHtml += '</p>';

		if( oProgram['episode-num'] || oProgram.date ) {

			sHtml += '<p>';

			if( oProgram['episode-num'] ) {
				sHtml += '<span class="epg-program-episode">' + oProgram['episode-num'] + '</span>';
				if( oProgram.date ) { sHtml += ', '; }
			}

			if( oProgram.date ) {
				if( /^\d{8}$/.test(oProgram.date) ) {
					var year = parseInt(oProgram.date.slice(0, 4), 10), month = parseInt(oProgram.date.slice(4, 6), 10) - 1, day = parseInt(oProgram.date.slice(6, 8), 10);
					var oDate = new Date(year, month, day);
					sHtml += '<span class="epg-program-date">' + oDate.toLocaleDateString() + '</span>';
				} else {
					sHtml += '<span class="epg-program-date">' + oProgram.date + '</span>';
				}
			}

			sHtml += '</p>';

		}

		if( oProgram.desc ) {
			sHtml += '<div>' + oProgram.desc.replace(/\n/g, "<br>") + '</div>';
		}

		if( oProgram.subtitles ) {
			sTags += '<div class="epg-tag">' + oProgram.subtitles + '</div>';
		}

		if( oProgram.country ) {
			sTags += '<div class="epg-tag">' + oProgram.country + '</div>';
		}

		if( oProgram.rating ) {
			sTags += '<div class="epg-tag">' + oProgram.rating + '</div>';
		}

		if( oProgram.hasCatchup ) {
			sTags += '<div class="epg-tag p-arch"><span>Catchup</span></div>';
		}

		if( sTags ) {
			sTags = '<div id="program_tags">' + sTags + '</div>';
		}

		oEpgDetails.innerHTML = '<div id="program_descr" class="custom-scrollbar">' + sTags + sHtml + '</div>';
		return true;
	}

	return false;

}


var iProgramsMinWidth = 0, iLastTimeStamp = 0, oTimestampDate = false;
function generateTimeline( iMax ) {

	if( iMax > iProgramsMinWidth && oTimestampDate ) {
		for( var i = iLastTimeStamp; i < iMax; i += 720 ) {
			var iPos = (oTimestampDate.getTime() - iTimePast) / 5000;
			var oTsElement = document.createElement('div');
			if( iPos > iMax ) { break; }

			oTsElement.className = 'timestamp';
			oTsElement.style.left = iPos + 'px';
			oTsElement.innerHTML = getTimelineString(oTimestampDate);

			oTimestamps.appendChild(oTsElement);
			oTimestampDate.addHours(1);

			iLastTimeStamp = i;
		}

		iProgramsMinWidth = iMax;
		oTimeline.style.minWidth = iProgramsMinWidth + 'px';
	}

}


function createNoEpgHint( iChNum, iTop ) {
	var oEl = document.createElement('div');
	oEl.className = 'p-i no-channel x' + iChNum;
	oEl.style.top = iTop + 'px';
	oEl.innerHTML = '<span>' + getLang('noEpgForChannel') + '</span>';

	aPrograms[iChNum]['---'] = {domRef: oEl};
	oProgramsList.appendChild(oEl);
	return oEl;

}


function createProgram( iChNum, oProgram, bLazy ) {

	if( !oProgram ) { return false; }

	//var oProgramElement = getEl(oProgram.progId);
	if( !oProgram.domRef ) {

		var oEl = document.createElement('div');
		oEl.className = 'p-i x' + iChNum;
		oEl.id = oProgram.progId; // Needed for details
		oEl.dataset.channelnum = iChNum;

		oEl.style.top = oProgram.top + 'px';
		oEl.style.left = oProgram.left + 'px';
		oEl.style.width = oProgram.width + 'px';

		if( oProgram.width < 50 ) {

		} else {
			oEl.innerHTML = '<span>' + oProgram.title + '</span>';
		}

		if( oProgram.hasCatchup ) {
			oEl.dataset.id = oProgram.id;
			oEl.dataset.catchup = sPlaylistArchiveType;
			oEl.dataset.start = oProgram.start;
			oEl.dataset.end = oProgram.stop;

			if( oProgram.xid ) {
				oEl.dataset.xid = oProgram.xid;
			}

			oEl.classList.add('p-arch');
		}

		// Channel has own defined catchup type
		if( oProgram.catchup && oProgram.catchup.type ) {
			oEl.dataset.catchup = oProgram.catchup.type;
		}

		if( !bLazy && oProgram.isRunning && !oActiveDetailsProgram ) {
			oEl.classList.add('active-details');
			oActiveDetailsProgram = oEl;
		}

		oEl.created = true;
		oProgram.domRef = oEl;
		//generateTimeline(oProgram.right);

	}

	oProgramsList.appendChild(oProgram.domRef);

	return oProgram.domRef;

}


var aPrograms = [];
function createOverviewChannel( iChNum ) {

	var oChannel = getEl('e-n' + iChNum);

	if( !oChannel && oDb && aActiveChannelList[iChNum] ) {

		var aCurrentChannel = aActiveChannelList[iChNum];
		var sDisplayName = aCurrentChannel.name, sIconUrl = aCurrentChannel.logo, iTopPosition = ((iChNum + 1) * iEpgOverviewItemHeight);

		oChannel = document.createElement('div');
		oChannel.className = 'e-name x' + iChNum;
		oChannel.id = 'e-n' + iChNum;
		oChannel.dataset.channelnum = iChNum;
		oChannel.innerText = (iChNum + 1) + '. ' + sDisplayName;
		oChannel.style.top = iTopPosition + 'px';

		aLazyLoadedOverviewItems[iChNum] = oChannel;
		aPrograms[iChNum] = {};

		if( aCurrentChannel.type === 'series' ) {
			oChannel.innerHTML += '<div class="e-logo icon icon-series"></div>';
		}
		else if( aCurrentChannel.type === 'movie' ) {
			oChannel.innerHTML += '<div class="e-logo icon icon-movies"></div>';
		}
		else if( sIconUrl ) {
			oChannel.innerHTML += '<div class="e-logo"><img src="' + sIconUrl + '"></div>';
		}

		if( iChNum === iCurrentChannel ) {
			oChannel.classList.add('playing');
			if( iSelectedEpgOverviewChannel === false ) {
				iSelectedEpgOverviewChannel = iChNum;
			}
		}

		if( iSelectedEpgOverviewChannel === iChNum ) {
			oChannel.classList.add('selected');
		}

		oChanneList.appendChild(oChannel);

		getChannelEpgId(aCurrentChannel, function(sEpgId) {

			if( !aPrograms[iChNum] ) { return false; } // lazy removed already?
			if( !sEpgId ) {
				createNoEpgHint(iChNum, iTopPosition);
				return false;
			}

			// Already loaded from DB
			if( Object.keys(aPrograms[iChNum]).length ) {
				return true;
			}

			// Load programs from DB
			var iProgramsLeftLimit = oEpgOverview.scrollLeft, iProgramsRightLimit = iProgramsLeftLimit + oEpgOverview.offsetWidth;
			var iCount = 0, iDateNow = getTimeNow(), iCurrentTime = new Date().getTime(), oEarliestCatchupDate = false, iCatchupDays = false;

			var oTx = oDb.transaction("epgProgramme"), oStore = oTx.objectStore("epgProgramme"),
				oIndex = oStore.index('id'), oRange = IDBKeyRange.only(sEpgId), oRequest = oIndex.getAll(oRange);

			var oCatchup = aCurrentChannel.catchup;
			if( oCatchup ) {
				iCatchupDays = oCatchup.days;
				if( !iCatchupDays ) { iCatchupDays = 7; }
			}

			// No channel catchup available. Fallback to playlist catchup
			if( !iCatchupDays && oCurrentPlaylist.catchup && oCurrentPlaylist.catchup.days ) {
				iCatchupDays = oCurrentPlaylist.catchup.days;
			}

			if( iCatchupDays ) {
				oEarliestCatchupDate = new Date();
				oEarliestCatchupDate.subDays(iCatchupDays);
			}

			oRequest.onsuccess = function(event) {

				if( !aPrograms[iChNum] ) { return false; } // lazy removed already?

				var aRecords = event.target.result;
				if( !aRecords || aRecords.length == 0 ) {
					createNoEpgHint(iChNum, iTopPosition);
					return;
				}

				iCount = aRecords.length;

				for( var i = 0; i < iCount; i++ ) {

					var oProgram = aRecords[i];

					// Expired, skip
					if( !oProgram.start || isExpired(oProgram.stop) ) {
						continue;
					}

					var oStartTime = getEpgDateObject(oProgram.start), oEndTime = getEpgDateObject(oProgram.stop);
					var iStart = oStartTime.getTime(), iEnd = oEndTime.getTime(), iMin = iTimePast;
					var iPosLeft = (iStart - iMin) / 5000, iPosRight = (iEnd - iMin) / 5000, iWidth = Math.round(iPosRight - iPosLeft - 4);

					if( iWidth < 25 ) {
						continue;
					}

					oProgram.progId = iChNum + '_' + iStart;
					oProgram.tvgid = sEpgId; oProgram.top = iTopPosition;
					generateTimeline(iPosRight);

					if( iChNum === iCurrentChannel && iStart < iDateNow && iDateNow < iEnd ) {
						oProgram.isRunning = true;
					}

					// For lazy loading
					oProgram.left = Math.round(iPosLeft);
					oProgram.right = Math.round(iPosRight);
					oProgram.width = iWidth;
					oProgram.catchup = oCatchup;

					if( aCurrentChannel.x_stream_id ) {
						oProgram.xid = aCurrentChannel.x_stream_id;
					}

					// For catchup
					if( oEarliestCatchupDate && oStartTime > oEarliestCatchupDate && (iStart + 200000) < iCurrentTime ) {
						oProgram.hasCatchup = true;
					}

					//var iProgId = aLoadedProgramms.push(oProgram) - 1; // For details

					aPrograms[iChNum][oProgram.progId] = oProgram;

					// Open current program of current channel
					if( oProgram.isRunning ) {
						loadEpgDetailsChannel(iChNum, oProgram.progId);
						//oActiveDetailsProgram.classList.add('active-details');
					}

					// Skip creation and load lazy if needed
					if( iPosRight < (iProgramsLeftLimit - 100) || iPosLeft > (iProgramsRightLimit + 100) ) {
						continue;
					}

					createProgram(iChNum, oProgram, false);

				}

			};

			oTx.oncomplete = function() {
				//console.log(iProgramsMinWidth);
				//oProgram.classList.remove('e-loading');
			};
			oTx.onerror = function() {
				debug('EPG onerror');
			};

		});

	}

	return oChannel;

}


function removeOverviewChannel( iCh ) {

	if( !aLazyLoadedOverviewItems[iCh] ) {
		return false;
	}

	var aChannelPrograms = aPrograms[iCh];
	if( aChannelPrograms ) {
		for( var sId in aChannelPrograms ) {
			if( aChannelPrograms[sId].domRef ) {
				//aChannelPrograms[sId].created = false;
				aChannelPrograms[sId].domRef.remove();
			}
		}
		aPrograms[iCh] = null;
		delete aPrograms[iCh];
	}

	aLazyLoadedOverviewItems[iCh].remove();

	/*
	var aDeleteElements = oEpgOverview.getElementsByClassName('x' + iCh);
	Array.from(aDeleteElements).forEach(oEl => {
		oEl.remove(); // TODO: add again without creating it first? Maby make reference in aPrograms[iChNum]
	});
	delete aLazyLoadedOverviewItems[iCh];
	*/

}


function lazyLoadOverviewPrograms( iCh ) {

	var oArray = aPrograms[iCh];
	if( !oArray ) { return; }

	Object.values(oArray).forEach(function(oProgram) {
		if( oProgram.domRef ) {
			// Outside: remove
			if( oProgram.right < (iOverviewLeftPos - 200) || oProgram.left > (iOverviewRightPos + 200) ) {
				oProgram.domRef.remove();
				oProgram.domRef = null;
				delete oProgram;
			}
		} else if( oProgram.right > (iOverviewLeftPos - 100) && oProgram.left < (iOverviewRightPos + 100) ) {
			createProgram(iCh, oProgram, true);
		}
	});

}


function lazyLoadOverviewChannel( iCh ) {

	if( aLazyLoadedOverviewItems[iCh] ) {
		createOverviewChannel(iCh);
		//lazyLoadOverviewPrograms(iCh);
		return false;
	}

	var yPos = iEpgOverviewItemHeight * iCh;
	if( yPos >= iEpgOverviewScrollMin && yPos < iEpgOverviewScrollMax ) {
		createOverviewChannel(iCh);
	}

	return true;

}


function refreshEpgOverviewTable() {

	iLastOverviewScrollPos = oEpgOverview.scrollTop;
	iEpgOverviewScrollMin = oEpgOverview.scrollTop - iEpgOverviewItemHeight;
	iEpgOverviewScrollMax = oEpgOverview.scrollTop + oEpgOverview.offsetHeight + (iEpgOverviewItemHeight * 2);
	aLazyLoadedOverviewItems = {};

	iSecondsSinceEpgOverviewRefresh = 0;
	var iMaxChannel = aActiveChannelList.length;
	for( var i = 0; i < iMaxChannel; i++ ) {
		lazyLoadOverviewChannel(i);
	}

}


function refreshEpgOverview() {
	console.log('TODO');

}


function buildEpgOverview() {

	if( bEpgTableBuilt ) {
		if( iSecondsSinceEpgOverviewRefresh > 120 ) {
			//refreshEpgOverviewTable();
		}
		return true;
	}

	/*
	var sTableHtml = '', sProgrammHtml = '', iMinChannel = 0, iMaxChannel = aActiveChannelList.length;
	for( var i = iMinChannel; i < iMaxChannel; i++ ) {
		var iChNum = i - 1;
		if( aActiveChannelList[iChNum] ) {
			sTableHtml += '<div id="e-n' + iChNum + '" class="e-name" onclick="loadChannelAndClose(' + i + ')">' + i + '. ' + aActiveChannelList[iChNum].name;

			if( aActiveChannelList[iChNum].epgid ) {
				sProgrammHtml += '<div id="e-ch' + iChNum + '" class="e-prog-row e-loading" data-tvgid="' + aActiveChannelList[iChNum].epgid + '"></div>';
			} else {
				sProgrammHtml += '<div class="e-prog-row">' + getLang('noEpgForChannel') + '</div>';
			}

			sTableHtml += '</div>';
		}
	}

	oEpgOverview.innerHTML = '<div id="epg_channels">' + sTableHtml + '</div><div id="epg_programme" class="custom-scrollbar">' + sProgrammHtml + '</div>';
	*/

	var iListHeight = aActiveChannelList.length * iEpgOverviewItemHeight + iEpgOverviewItemHeight,
		iCurrentScrollTop = (iCurrentChannel * iEpgOverviewItemHeight) - (3 * iEpgOverviewItemHeight);

	oChanneList.style.height = iListHeight + 'px';
	oProgramsList.style.height = iListHeight + 'px';
	getEl('epg_current_time_mark').style.height = (iListHeight - 38) + 'px';

	iSelectedEpgOverviewChannel = false;

	addScrollHandler();

	if( iCurrentScrollTop < 1 || iCurrentChannel < 10 ) {
		oEpgOverview.scrollTop = 0;
		iEpgOverviewScrollMin = 0;
		iEpgOverviewScrollMax = oEpgOverview.offsetHeight + (iEpgOverviewItemHeight * 2);
		for( var i = 0; i <= 14; i++ ) {
			lazyLoadOverviewChannel(i);
		}
	} else {
		oEpgOverview.scrollTop = iCurrentScrollTop;
	}

	bEpgTableBuilt = true;

}


var iOverviewLeftPos = 0, iOverviewRightPos = 0;
function addScrollHandler() {

	oEpgOverview.onscroll = function(ev) {
		var iScTop = this.scrollTop, iScHeight = this.offsetHeight, iScWidth = this.offsetWidth;

		iOverviewLeftPos = this.scrollLeft; iOverviewRightPos = iOverviewLeftPos + iScWidth;

		var iVisibleMinChannel = Math.floor(iScTop / iEpgOverviewItemHeight) - 2,
			iVisibleMaxChannel = Math.ceil((iScTop + iScHeight) / (iEpgOverviewItemHeight)) + 1;

		// Scroll X, load programs
		if( Math.abs(iOverviewLeftPos - iLastOverviewScrollPosX) > 100 ) {
			iLastOverviewScrollPosX = iOverviewLeftPos;
			for( var iCh = iVisibleMinChannel; iCh <= iVisibleMaxChannel; iCh++ ) {
				lazyLoadOverviewPrograms(iCh);
			}
		}

		// Scroll Y, load channels
		if( Math.abs(iScTop - iLastOverviewScrollPosY) < iEpgOverviewItemHeight ) {
			return false;
		}

		iLastOverviewScrollPosY = iScTop;

		iEpgOverviewScrollMin = iScTop - (iEpgOverviewItemHeight * 3);
		iEpgOverviewScrollMax = iScTop + iScHeight + (iEpgOverviewItemHeight * 2);

		for( var iCh = iVisibleMinChannel; iCh <= iVisibleMaxChannel; iCh++ ) {
			lazyLoadOverviewChannel(iCh);
		}

		// Delete channels outside visible zone (Y)
		for( iCh in aLazyLoadedOverviewItems ) {
			if( iCh > iVisibleMaxChannel || iCh < iVisibleMinChannel ) {
				removeOverviewChannel(iCh);
			}
		}

	};

	oEpgOverview.addEventListener("click", function(oClickItem) {
		var oItem = oClickItem.target.closest('.p-arch');
		if( oItem && oItem.dataset ) {
			loadArchiveUrl(oItem.dataset); return false;
		}

		oItem = oClickItem.target.closest('.e-name');
		if( oItem && oItem.dataset ) {
			loadChannelAndClose(oItem.dataset.channelnum); return false;
		}

	});

}


var iProgHover = 0;
function moveToEpgOverviewItem( sDir ) {

	var iMaxChannel = aActiveChannelList.length - 1;

	if( iSelectedEpgOverviewChannel === false ) {
		iSelectedEpgOverviewChannel = iCurrentChannel;
	}

	var iType = 1, sScrollBehaviour = 'smooth'; // 1 = up/down, 2 = left/right

	switch( sDir ) {
		case 'up':
			iSelectedEpgOverviewChannel--;
			if( iSelectedEpgOverviewChannel < 0 ) {
				iSelectedEpgOverviewChannel = iMaxChannel;
				sScrollBehaviour = 'instant';
			}
			break;
		case 'up10':
			iSelectedEpgOverviewChannel -= 10;
			if( iSelectedEpgOverviewChannel < 0 ) {
				iSelectedEpgOverviewChannel = iMaxChannel;
				sScrollBehaviour = 'instant';
			}
			break;
		case 'down':
			iSelectedEpgOverviewChannel++;
			if( iSelectedEpgOverviewChannel > iMaxChannel ) {
				iSelectedEpgOverviewChannel = 0;
				sScrollBehaviour = 'instant';
			}
			break;
		case 'down10':
			iSelectedEpgOverviewChannel += 10;
			if( iSelectedEpgOverviewChannel > iMaxChannel ) {
				iSelectedEpgOverviewChannel = 0;
				sScrollBehaviour = 'instant';
			}
			break;
		case 'left':
			iType = 2;
			var oPrevItem = getPrevProgramElement(iSelectedEpgOverviewChannel, iBrowsePosition);
			if( oPrevItem ) {
				setEpgDetailsChannel(oPrevItem);
				iBrowsePosition = oPrevItem.offsetLeft;
			} else {
				iBrowsePosition -= 200;
			}

			if( typeof(oEpgOverview.scrollTo) === 'function' ) {
				oEpgOverview.scrollTo({ left: iBrowsePosition - 200, behavior: sScrollBehaviour });
			} else {
				oEpgOverview.scrollLeft = iBrowsePosition - 200;
			}

			//crosshair.style.top = oPrevItem.offsetTop + 'px';
			//crosshair.style.left = iBrowsePosition + 'px';
			return false;
		case 'right':
			iType = 2;
			var oNextItem = getNextProgramElement(iSelectedEpgOverviewChannel, iBrowsePosition);
			if( oNextItem ) {
				setEpgDetailsChannel(oNextItem);
				iBrowsePosition = oNextItem.offsetLeft;
			} else {
				iBrowsePosition += 200;
			}

			if( typeof(oEpgOverview.scrollTo) === 'function' ) {
				oEpgOverview.scrollTo({ left: iBrowsePosition - 200, behavior: sScrollBehaviour });
			} else {
				oEpgOverview.scrollLeft = iBrowsePosition - 200;
			}

			//crosshair.style.top = oNextItem.offsetTop + 'px';
			//crosshair.style.left = iBrowsePosition + 'px';

			return false;

		case 'enter':
			if( oActiveDetailsProgram && oActiveDetailsProgram.classList.contains('p-arch') ) {
				loadArchiveUrl(oActiveDetailsProgram.dataset);
			} else {
				loadChannelAndClose(iSelectedEpgOverviewChannel); return true;
			}
			break;
	}

	try {

		if( iType === 1 ) {

			var iTop = (iSelectedEpgOverviewChannel * iEpgOverviewItemHeight) - (3 * iEpgOverviewItemHeight);

			if( typeof(oEpgOverview.scrollTo) === 'function' ) {
				oEpgOverview.scrollTo({ top: iTop, left: iBrowsePosition - 200, behavior: sScrollBehaviour });
			} else {
				oEpgOverview.scrollTop = iTop;
				oEpgOverview.scrollLeft = iBrowsePosition - 200;
			}

			var oNewProgram = getProgramAtPos(iSelectedEpgOverviewChannel, iBrowsePosition);
			//crosshair.style.top = ((iSelectedEpgOverviewChannel * iEpgOverviewItemHeight) + iEpgOverviewItemHeight) + 'px';
			if( oNewProgram ) {
				setEpgDetailsChannel(oNewProgram);
				//crosshair.style.top = oNewProgram.offsetTop + 'px';
			}
			var oLastActiveEpgCh = document.querySelector('.e-name.selected');
			if( oLastActiveEpgCh ) {
				oLastActiveEpgCh.classList.remove('selected');
			}

			var oEl = createOverviewChannel(iSelectedEpgOverviewChannel);
			if( oEl ) { oEl.classList.add('selected'); }

		}

		/*oSelectedProgramm = document.querySelector('#e-ch' + iSelectedEpgOverviewChannel + ' .e-prog .p-i:nth-child(' + iProgHover + ')');
		if( !oSelectedProgramm && iProgHover > 1 ) {
			oSelectedProgramm = document.querySelector('#e-ch' + iSelectedEpgOverviewChannel + ' .e-prog .p-i:last-child');
			iProgHover--;
		}

		if( oSelectedProgramm ) {
			oSelectedProgramm.classList.add('hover');
			var iScrollLeft = oSelectedProgramm.offsetLeft - 200;
			if( iProgHover < 2 || iScrollLeft < 0 ) {
				iScrollLeft = 0;
			}
			//oEpgOverview.scrollLeft = iScrollLeft;
		} else {
			//oEpgOverview.scrollLeft = 0;
			if( iProgHover ) {
				iProgHover = 1;
			}
		}*/

	} catch( e ) {
		console.log(e);
	}

	return true;

}


function refreshCurrentTime() {

	var oCurrentDate = new Date(), iPos = (oCurrentDate.getTime() - iTimePast) / 5000;

	generateTimeline(iPos + oEpgOverview.offsetWidth);
	oCurrentTimeline.style.left = iPos + 'px';
	oCurrentTime.innerText = getTimeString(oCurrentDate);

	return iPos;

}


function addTimelineScroller() {

	var oLeft = getEl('epg_scroller_left'), oRight = getEl('epg_scroller_right');
	var iScrollInterval = false;

	oEpgOverview.addEventListener('mouseenter', function() {
		oLeft.style.display = 'block';
		oRight.style.display = 'block';
	});

	oLeft.addEventListener('mousedown', function() {
		iScrollInterval = setInterval(function() {
			oEpgOverview.scrollLeft -= 3;
		}, 2);

	});
	oRight.addEventListener('mousedown', function() {
		iScrollInterval = setInterval(function() {
			oEpgOverview.scrollLeft += 3;
		}, 2);
	});

	oLeft.addEventListener('touchstart', function() {
		iScrollInterval = setInterval(function() {
			oEpgOverview.scrollLeft -= 3;
		}, 2);

	});
	oRight.addEventListener('touchstart', function() {
		iScrollInterval = setInterval(function() {
			oEpgOverview.scrollLeft += 3;
		}, 2);
	});

	oLeft.addEventListener('mouseup', function() {
		oEpgOverview.classList.remove('smooth-scrolling');
		if( iScrollInterval ) { clearInterval(iScrollInterval); }
	});
	oRight.addEventListener('mouseup', function() {
		oEpgOverview.classList.remove('smooth-scrolling');
		if( iScrollInterval ) { clearInterval(iScrollInterval); }
	});

	oLeft.addEventListener('mouseleave', function() {
		oEpgOverview.classList.remove('smooth-scrolling');
		if( iScrollInterval ) { clearInterval(iScrollInterval); }
	});
	oRight.addEventListener('mouseleave', function() {
		oEpgOverview.classList.remove('smooth-scrolling');
		if( iScrollInterval ) { clearInterval(iScrollInterval); }
	});

	oLeft.addEventListener('touchend', function() {
		oEpgOverview.classList.remove('smooth-scrolling');
		if( iScrollInterval ) { clearInterval(iScrollInterval); }
	});
	oRight.addEventListener('touchend', function() {
		oEpgOverview.classList.remove('smooth-scrolling');
		if( iScrollInterval ) { clearInterval(iScrollInterval); }
	});

}


function boot() {

	initDb(function() { // DB successfully loaded, load playlists next

		iCurrentChannel = parseInt(localStorage.getItem('iCurrentChannel'));
		iCurrentPlaylistId = localStorage.getItem('iCurrentPlaylistId');
		if( !iCurrentPlaylistId ) {
			iCurrentPlaylistId = 0;
		}

		iCurrentPlaylistId = parseInt(iCurrentPlaylistId);
		bootPlaylistReady(function(sPlaylistId) { // has playlist - play channel

			sPlaylistArchiveType = aLoadedPlaylists[sPlaylistId].archiveType;
			if( !sPlaylistArchiveType || sPlaylistArchiveType == '-' ) { sPlaylistArchiveType = false; }

			var iKeepDays = AppSettings.getNumberSetting('epg-keep-days', 1);
			if( iKeepDays ) { oTimePast.subDays(iKeepDays); }
			else {
				oTimePast.subHours(1);
			}

			initClock();
			iTimePast = oTimePast.getTime();

			var iFutureDays = AppSettings.getNumberSetting('epg-future-days', 2);
			if( iFutureDays ) {
				oTimeAhead.addDays(iFutureDays);
			} else {
				//oTimeAhead.addHours(iGrabIntervalSetting + 10);
			}

			oTimestampDate = new Date(oTimePast);
			oTimestampDate.setMinutes(0);

			iBrowsePosition = refreshCurrentTime();
			oEpgOverview.scrollLeft = iBrowsePosition + 380 - oChanneList.offsetWidth - 120;
			addTimelineScroller();

			buildEpgOverview();

			document.body.classList.remove('booting');
		}, function() { // no playlist yet, show settings
			//openSettings();
			document.body.classList.remove('booting');
		});

	}, function() { // DB failure

	});

}


function bootEverything() {
	bIsBooting = true;

	try {
		boot();
	} catch( e ) {
		debugError(e);
	}

	bIsBooting = false;

}



function bootEpgView() {

	applyLang();
	initControls();
	bootEverything();

}


function hideEpgOverview() {

	if( window.self !== window.top && typeof(parent.hideEpgOverview) === 'function' ) {
		parent.hideEpgOverview();
	} else {
		window.location.href = "../player/index.html";
	}

}


function initClock() {

	b24HoursClock = AppSettings.isActive('clock-24-hours');

	setInterval(function() {
		refreshCurrentTime();
	}, 5000);

}