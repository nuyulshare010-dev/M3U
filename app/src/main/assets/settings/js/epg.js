/*

	Copyright 2026 - Herber eDevelopment - Jaroslav Herber
	All rights reserved.

	This code is proprietary and confidential.
	Copying, modification, distribution, or use of this code without explicit permission is strictly prohibited.

*/

var bIsLoadingEpgSources = false, bEpgDownloadRunning = false, oActiveEpgWorker = false,
oEpgDownloadStatus = getEl('epg_download_status'), oEpgSourcesNav = getEl('epg_sources_nav'),
iCurrentEpgEditId = 0, iHighestEpgSourceId = 0, bIsNewEpg = false, oCurrentEditEpg = {}, aLoadedEpgSources = {};

var oEmEpgUrl = getEl('em_epg_url'), oEmEpgTimeshift = getEl('em_epg_time_shift');

function checkEpgUrl( sUrl ) {
	return (sUrl && sUrl.length > 6 && sUrl.indexOf('http') === 0 );
}


function updateEpgDownloadStatus( sStatus ) {

	if( sActiveControl !== 'epg' ) { return false; }

	if( sStatus ) {
		oEpgDownloadStatus.innerHTML = sStatus;
		oEpgDownloadStatus.style.display = 'block';
	} else {
		oEpgDownloadStatus.innerHTML = '';
		oEpgDownloadStatus.style.display = 'none';
	}

}


function setEpgNavItem( oEpg ) {

	if( !oEpg || oEpg.id == 'undefined' ) { return false; }

	var oEpgItem = getEl('epgsource_' + oEpg.id);
	if( !oEpgItem ) {
		oEpgItem = document.createElement("li");
		oEpgItem.id = 'epgsource_' + oEpg.id;
		oEpgItem.className = 'epgsource-nav-item';
		oEpgItem.dataset.action = 'edit-epg-source';
		oEpgItem.dataset.type = 'input';
		oEpgItem.dataset.id = oEpg.id;
		oEpgSourcesNav.prepend(oEpgItem);
	} else {
		if( !oEpg.queue ) {
			oEpgItem.classList.remove('loading');
		}
	}

	var sHtml = oEpg.url + '<p>', sStatus = '', iPlaylistId = oEpg.pid;

	if( iPlaylistId && aLoadedPlaylists && aLoadedPlaylists[iPlaylistId] ) {
		sHtml += getLangTag('playlist') + ': ' + aLoadedPlaylists[iPlaylistId].name;
	}

	if( oEpg.status === 'ERROR' && oEpg.error ) {
		sStatus = '<span class="error">' + oEpg.error + '</span>';
	} else if( oEpg.status === 'OK' && oEpg.channels ) {
		var sDate = '';
		if( oEpg.grabtime ) {
			var oDate = new Date(oEpg.grabtime); sDate = ', <span class="NOBR">' + getLangTag('date') + ': ' + oDate.toLocaleString() + '</span>';
		}

		sStatus = getLangTag('channels-processed') + oEpg.channels + ', ' + getLangTag('programs-processed') + oEpg.programs + sDate;
	} else {
		sStatus = getLangTag('no-data-yet');
	}

	oEpgItem.innerHTML = sHtml + ' <i class="epg-status">' + sStatus + '</i><span class="nav-item-loader"></span></p>';

	aLoadedEpgSources[oEpg.id] = oEpg;

}


function removeEpgNavItem( iEpgId ) {

	//iEpgId = parseInt(iEpgId);

	if( aLoadedEpgSources[iEpgId] ) {
		delete aLoadedEpgSources[iEpgId];
		localStorage.setItem('aEpgSources', JSON.stringify(aLoadedEpgSources));
	}

	var oEpgItem = getEl('epgsource_' + iEpgId);
	if( oEpgItem ) { oEpgItem.remove(); }

}


function reloadPlaylistEpg( iPlaylistId ) {

	if( aLoadedEpgSources ) {
		for( var i in aLoadedEpgSources ) {
			if( parseInt(aLoadedEpgSources[i].pid) === iPlaylistId ) {
				aLoadedEpgSources[i].grabtime = 0;
				saveCurrentEpg(aLoadedEpgSources[i]);
			}
		}
	}

}


function loadEpgSourcesFromLocalStorage( sOnSuccess, sOnFailure ) {

	var sEpgSourcesStorage = localStorage.getItem('aEpgSources');
	if( sEpgSourcesStorage ) {

		try {
			aLoadedEpgSources = JSON.parse(sEpgSourcesStorage);
		} catch( e ) {
			if( typeof(sOnFailure) === 'function' ) { sOnFailure(e); }
			return false;
		}

		if( aLoadedEpgSources && typeof(aLoadedEpgSources) === 'object' ) {

			var iListCount = 0;

			for( var iId in aLoadedEpgSources ) {
				if( iId === "undefined" ) {
					removeEpgNavItem(iId); continue;
				}

				var oEpg = aLoadedEpgSources[iId];
				if( !oEpg ) { continue; }
				iId = parseInt(iId);
				if( iHighestEpgSourceId < iId ) { iHighestEpgSourceId = iId; }

				setEpgNavItem(oEpg);
				iListCount++;
			}

			if( typeof(sOnSuccess) === 'function' ) { sOnSuccess(iListCount); }
			return true;

		}

	}

	return false;

}


function loadEpgSources( sOnSuccess, sOnFailure ) {

	if( loadEpgSourcesFromLocalStorage(sOnSuccess, sOnFailure) ) {
		return;
	}

	if( bDbInitiated && oDb ) {

		oEpgSourcesNav.classList.add('loading');

		var oTx = oDb.transaction("epgStore", "readonly"), oStore = oTx.objectStore("epgStore"),
			oRequest = oStore.openCursor(), iListCount = 0;

		oRequest.onsuccess = function(e) {
			var oRecord = e.target.result;
			if( oRecord && oRecord.value ) {
				var oEpg = oRecord.value, iId = parseInt(oEpg.id);

				if( iHighestEpgSourceId < iId ) { iHighestEpgSourceId = iId; }

				if( !aLoadedEpgSources[oEpg.id] ) {
					setEpgNavItem(oEpg);
				}

				iListCount++;
			}

			if( oRecord ) {
				oRecord.continue();
			}
		};

		oRequest.onerror = function(e) {
			oEpgSourcesNav.classList.remove('loading');

			if( typeof(sOnFailure) === 'function' ) {
				sOnFailure(e);
			}
		};

		oTx.oncomplete = function() {

			oEpgSourcesNav.classList.remove('loading');

			if( typeof(sOnSuccess) === 'function' ) {
				sOnSuccess(iListCount);
			}

		};

	}

}


function loadEpgSourcesList() {

	var oList = getEl('epg_sources_nav');
	loadEpgSources(function() {
		//console.log('EPG load success');
	});

}


var iEpgQueueTimer = false;
function downloadQueuedEpgSources() {

	if( iEpgQueueTimer ) {
		clearInterval(iEpgQueueTimer);
	}

	iEpgQueueTimer = setInterval(function() {
		if( !bEpgDownloadRunning && aLoadedEpgSources ) {
			for( var i in aLoadedEpgSources ) {
				if( !bEpgDownloadRunning && aLoadedEpgSources[i].queue ) {
					downloadEpgManager(aLoadedEpgSources[i]);
					return;
				}
			}

			clearInterval(iEpgQueueTimer);
		}
	}, 2000);

}


function updateAllEpg() {

	if( aLoadedEpgSources ) {
		resetEpgDatabase(function() {
			for( var i in aLoadedEpgSources ) {
				setEpgToQueue(aLoadedEpgSources[i], true);
			}
		});
	}

}


function setEpgToQueue( oEpg, bQueue ) {

	if( oEpg.queue && bQueue ) { return false; }

	oEpg.queue = bQueue;

	var oNavItem = getEl('epgsource_' + oEpg.id);
	var oListStatus = oNavItem ? oNavItem.querySelector('.epg-status') : false;
	if( oListStatus ) {
		oListStatus.innerHTML = '&raquo; ' + getLang('queued') + ' &laquo;';
		//oListStatus.innerHTML = '<img class="epg-loading" src="../images/loading.svg" height="21" width="26" alt="...">';
	}

	downloadQueuedEpgSources(); // start listener for queued EPGs
	return oListStatus;

}


function emBack() {
	closeEpgManager();
}


function emSaveEpgUrl( sUrl ) {

	sUrl = sUrl || oEmEpgUrl.value;
	if( sUrl && checkEpgUrl(sUrl) ) {

		oCurrentEditEpg.url = sUrl;
		oCurrentEditEpg.timeshift = parseFloat(oEmEpgTimeshift.value).toFixed(1);

		saveCurrentEpg(oCurrentEditEpg, function(oEpg) {
			loadEpgSources(function() {
				downloadEpgManager(oEpg); // Download edited epg
				if( sActiveControl === 'epg' ) {
					closeEpgManager();
					oCurrentNav.scrollTop = 0;
				}
			});
		});

	} else {
		// Jump to first field
		updateEpgDownloadStatus(getLang('epg-download-error'));
		iCurrentFieldIndex = 0;
		oCurrentInputEditItem.blur();
		oCurrentInputEditItem.classList.remove('select');
		oCurrentInputEditItem = aCurrentFields[iCurrentFieldIndex];
		oCurrentInputEditItem.classList.add('select');
		oCurrentInputEditItem.focus();
	}

}


function emDelete() {

	if( bIsNewEpg ) {
		closeEpgManager(); return false;
	}

	if( iCurrentEpgEditId ) {
		var iDeleteId = iCurrentEpgEditId;
		closeEpgManager();
		deleteEpg(iDeleteId, function() {
			loadEpgSources();
		});
	}

}


function openEpgManager( sId, sType ) {

	aControlButtons = getEl('epg_manager_form').querySelectorAll(".round-button");

	if( sId === 'new' ) {

		bIsNewEpg = true;
		iCurrentEpgEditId = iHighestEpgSourceId + 1;
		oCurrentEditEpg = {};
		oCurrentEditEpg.id = iCurrentEpgEditId;
		oCurrentEditEpg.programs = 0;
		oCurrentEditEpg.channels = 0;

	} else {

		bIsNewEpg = false;
		iCurrentEpgEditId = sId;

		if( aLoadedEpgSources && aLoadedEpgSources[sId] ) {
			oCurrentEditEpg = aLoadedEpgSources[sId];
			oEmEpgUrl.value = oCurrentEditEpg.url;
			oEmEpgTimeshift.value = oCurrentEditEpg.timeshift;
			updateEpgTimeShift(oEmEpgTimeshift.value);
		} else {
			return false; // should not happen
		}

	}

	iCurrentFieldIndex = 0;
	aCurrentFields = getEl('em_url_form').querySelectorAll("input, select, button");
	if( aCurrentFields && aCurrentFields.length ) {
		aCurrentFields.forEach(function(oEl) { oEl.classList.remove('select'); });
		oCurrentInputEditItem = aCurrentFields[iCurrentFieldIndex];
		oCurrentInputEditItem.classList.add('select');
		if( oCurrentInputEditItem.dataset.guide ) {
			applyGuideLang(oCurrentInputEditItem.dataset.guide);
		}
	}

	document.body.classList.add('open-epg-manager');
	sActiveControl = 'epg';

	if( oCurrentEditEpg.channels ) {
		updateEpgDownloadStatus(getLang('channels-processed') + oCurrentEditEpg.channels + ', ' + getLang('programs-processed') + oCurrentEditEpg.programs);
	}

}


function closeEpgManager() {

	if( oCurrentInputEditItem ) {
		oCurrentInputEditItem.classList.remove('select');
		oCurrentInputEditItem = false;
	}

	oCurrentEditEpg = {};
	aCurrentFields = false;
	iCurrentEpgEditId = 0;
	sActiveControl = 'list';
	aControlButtons = false;
	iCurrentControlButtonIndex = 2;

	oEmEpgUrl.value = '';

	document.body.classList.remove('open-epg-manager');

}


function resetV2Database() {
	try {
		indexedDB.deleteDatabase("m3u");
	} catch( e ) {
		console.log(e.message);
	}
}


function resetEpgDatabase( sCallback ) {

	if( bDbInitiated && oDb ) {

		if( iEpgQueueTimer ) {
			clearInterval(iEpgQueueTimer);
		}

		abortEpgDownload();
		resetV2Database();

		var aEpgNavItems = document.querySelectorAll('.epgsource-nav-item');
		if( aEpgNavItems ) {
			aEpgNavItems.forEach(function(oEl) { oEl.classList.add('loading'); });
		}

		var oTx = oDb.transaction("epgProgramme", "readwrite");
		var oClearRequest = oTx.objectStore("epgProgramme").clear();
		oClearRequest.onsuccess = function() {
			oTx = oDb.transaction("epgChannels", "readwrite");
			oClearRequest = oTx.objectStore("epgChannels").clear();
			oClearRequest.onsuccess = function() {
				for( var i in aLoadedEpgSources ) {
					aLoadedEpgSources[i].channels = 0;
					aLoadedEpgSources[i].programs = 0;
					aLoadedEpgSources[i].grabtime = 0;
					aLoadedEpgSources[i].status = null;
					aLoadedEpgSources[i].queue = false;
					saveCurrentEpg(aLoadedEpgSources[i]);
				}

				if( sCallback ) {
					sCallback();
				}
			};
		};

		oTx.onerror = sCallback;
		oTx.onabort = sCallback;
	}

}


function epgDownLoadFinished() {
	bEpgDownloadRunning = false;
}


function abortEpgDownload() {

	if( oActiveEpgWorker ) {
		oActiveEpgWorker.terminate();
		oActiveEpgWorker = false;
	}

	epgDownLoadFinished();

}


function downloadEpgManager( oEpg, sCallback, sCallbackError ) {

	if( !oEpg ) {
		oEpg = oCurrentEditEpg;
	}

	/*if( !AppSettings.getSetting('epg-enabled') ) {
		showModal('please enable EPG first');
		bEpgDownloadRunning = false;
		return false;
	}*/

	if( bEpgDownloadRunning ) {
		setEpgToQueue(oEpg, true);
		return false;
	}

	if( oEpg.id && window.Worker ) {

		abortEpgDownload();
		bEpgDownloadRunning = true;

		var oNavItem = getEl('epgsource_' + oEpg.id);
		var oListStatus = setEpgToQueue(oEpg, false);
		oNavItem.classList.add('loading');

		oEpg.queue = false;
		oEpg.status = 'LOADING';

		if( oEpg.error ) {
			oEpg.error = null;
		}

		var sChannelsProcessed = getLangTag('channels-processed'),
			sLangEpgProgramsProcessed = getLangTag('programs-processed'),
			sLangDownloadedBytes = getLangTag('downloaded-bytes');

		oActiveEpgWorker = new Worker(sEpgWorkerPath);
		oActiveEpgWorker.postMessage({
			'epgHead': oEpg,
			'device': sDeviceFamily,
			'interval': AppSettings.getNumberSetting('epg-grab-interval', 3),
			'keepDays': AppSettings.getNumberSetting('epg-keep-days', 1),
			'futureDays': AppSettings.getNumberSetting('epg-future-days', 2),
			'descriptions': AppSettings.isActive('store-epg-desciptions'),
			'version': iDbVersion
		});

		oActiveEpgWorker.onmessage = function(e) {
			var sResponseText = e.data;
			if( sResponseText ) {

				var sStatus = getWorkerStatus(sResponseText, 'Download progress: ');
				if( sStatus ) { // progress download
					oListStatus.innerHTML = sLangDownloadedBytes + sStatus + ' KB';
					return true;
				}

				var sStatus = getWorkerStatus(sResponseText, 'OK channels: ');
				if( sStatus ) { // progress importing channels
					oEpg.channels = parseInt(sStatus);
					if( sActiveControl === 'list' ) {
						oListStatus.innerHTML = sChannelsProcessed + sStatus;
					}
					return true;
				}

				sStatus = getWorkerStatus(sResponseText, 'OK programms: ');
				if( sStatus ) {
					oEpg.programs = parseInt(sStatus);
					if( sActiveControl === 'list' ) {
						oListStatus.innerHTML = sLangEpgProgramsProcessed + sStatus;
					}
					return true;
				}

				// Errors
				sStatus = getWorkerStatus(sResponseText, 'ERROR: ');
				if( sStatus ) {
					if( sStatus === 'Not enough space' ) {
						showModal(getLang('epg-quota-exceeded-error'));
					} else {
						showModal(sStatus, oEpg.url);
					}
					oEpg.status = 'ERROR'; oEpg.error = sStatus;
					oListStatus.innerHTML = '<span class="error">' + oEpg.error + '</span>';
					abortEpgDownload();
					saveCurrentEpg(oEpg);
					return true;
				}

				switch( sResponseText ) {
					case 'writing': break;
					case 'download complete': break;
					case 'channels complete': break;
					case 'extracting file':
						oListStatus.innerHTML = getLangTag('extracting-file');
						break;
					case 'downloading':
						oListStatus.innerHTML = getLangTag('downloading-file');
						break;
					case 'truncating':
						oListStatus.innerHTML = getLangTag('deleting-expired');
						break;
					case 'finish':
						oEpg.status = 'OK';
						oEpg.grabtime = Date.now();
						oListStatus.innerHTML = sChannelsProcessed + oEpg.channels + ', ' + sLangEpgProgramsProcessed + oEpg.programs + ' (' + new Date().toLocaleString() + ')';
						oNavItem.classList.remove('loading');

						saveCurrentEpg(oEpg);
						epgDownLoadFinished();
						if( sCallback ) { sCallback(); }
						break;
					default:
						// should not happen
						console.log("should not happen: " + e.message);
						oEpg.status = 'ERROR'; oEpg.error = e.message;
						oListStatus.innerHTML = '<span class="error">' + sResponseText + '</span>';
				}

			}
		};

		oActiveEpgWorker.onerror = function(e) {
			oEpg.status = 'ERROR'; oEpg.error = e.message;
			oListStatus.innerHTML = '<span class="error">' + oEpg.error + '</span>';
			oNavItem.classList.remove('loading');
			abortEpgDownload();
			saveCurrentEpg(oEpg);
		};

	} else {
		debug('Your device doesn\'t support web workers.');
		abortEpgDownload();
	}

}


function abortEpgDownload() {
	bEpgDownloadRunning = false;

	if( oActiveEpgWorker ) {
		oActiveEpgWorker.terminate();
		oActiveEpgWorker = false;
	}
}


function saveCurrentEpg( oEpg, sCallback ) {

	if( !oEpg ) {
		oEpg = oCurrentEditEpg;
	}

	if( oEpg && oEpg.url ) {

		if( !oEpg.id ) {
			oEpg.id = iHighestEpgSourceId + 1;
		}

		if( aLoadedEpgSources ) {
			for( var i in aLoadedEpgSources ) {
				if( parseInt(oEpg.id) == parseInt(i) ) { continue; }
				if( aLoadedEpgSources[i].url === oEpg.url ) {
					if( !bIsNewPlaylist ) { showModal(getLang('epg-url-already-exists')); }
					return;
				}
			}
		}

		setEpgNavItem(oEpg);
		localStorage.setItem('aEpgSources', JSON.stringify(aLoadedEpgSources));
		if( typeof(sCallback) === 'function' ) { sCallback(oEpg); }

		/*var oTx = oDb.transaction("epgStore", "readwrite"),
		oAddRequest = oTx.objectStore("epgStore").put(oEpg);

		oAddRequest.onsuccess = function(oEv) {
			oEpg.id = oEv.target.result;
			setEpgNavItem(oEpg);
			if( typeof(sCallback) === 'function' ) { sCallback(oEpg); }
		};

		oAddRequest.onerror = function(oEv) {
			if( sActiveControl === 'epg' && oEv.target.error.name === "ConstraintError" ) {
				showModal(getLang('epg-url-already-exists'));
			}
		};*/

	}

}


function deleteLinkedEpg( iPlaylistId ) {

	if( aLoadedEpgSources ) {
		for( var i in aLoadedEpgSources ) {
			var iPid = parseInt(aLoadedEpgSources[i].pid);
			if( iPid == parseInt(iPlaylistId) ) {
				if( aLoadedEpgSources[i].status === 'LOADING' ) {
					abortEpgDownload();
				}
				deleteEpg(i, function() {
					loadEpgSources();
				});
			}
		}
	}

}


function deleteEpgChannels( iEpgId, sCallback ) {

	var txDelChannels = oDb.transaction("epgChannels", "readwrite"), oStore = txDelChannels.objectStore("epgChannels"),
		oIndex = oStore.index("epg_id"), oRange = IDBKeyRange.only(iEpgId);

	oIndex.openCursor(oRange).onsuccess = function(event) {
		var oRecord = event.target.result;
		if( oRecord ) {
			oRecord.delete();
			oRecord.continue();
		}
	};

	txDelChannels.oncomplete = function() {
		sCallback();
	};

	txDelChannels.onerror = sCallback;

}


function deleteEpg( iEpgId, sCallback ) {

	if( !iEpgId ) {
		iEpgId = iCurrentEpgEditId;
	}

	if( iEpgId == 'undefined' ) {
		removeEpgNavItem(iEpgId);
		if( typeof(sCallback) === 'function' ) { sCallback(); }
		return;
	}

	iEpgId = parseInt(iEpgId);

	if( aLoadedEpgSources[iEpgId] ) {
		aLoadedEpgSources[iEpgId].status = 'DELETING';
	}

	var oNavItem = getEl('epgsource_' + iEpgId), oListStatus = oNavItem ? oNavItem.querySelector('.epg-status') : false;
	if( oListStatus ) {
		oListStatus.innerHTML = getLang('deleting') + ' ...';
		oNavItem.classList.add('loading');
	}

	var txDelPrograms = oDb.transaction("epgProgramme", "readwrite"), oStore = txDelPrograms.objectStore("epgProgramme"),
		oIndex = oStore.index("epg_id"), oRange = IDBKeyRange.only(iEpgId);

	// First, delete programs
	oIndex.openCursor(oRange).onsuccess = function(event) {
		var oRecord = event.target.result;
		if( oRecord ) {
			oRecord.delete();
			oRecord.continue();
		} else {
			//debug('programs deleted for id: ' + iEpgId);
		}
	};

	// Then, delete epg head
	txDelPrograms.oncomplete = function() {

		deleteEpgChannels(iEpgId, function() {

			removeEpgNavItem(iEpgId);
			if( typeof(sCallback) === 'function' ) { sCallback(); }

			/*var txDelEpg = oDb.transaction("epgStore", "readwrite"), oStore = txDelEpg.objectStore("epgStore");
			oStore.delete(iEpgId).onsuccess = function(event) {
				removeEpgNavItem(iEpgId);
				if( typeof(sCallback) === 'function' ) { sCallback(); }
			};*/

		});

	};

	if( typeof(sCallback) === 'function' ) {
		txDelPrograms.onerror = sCallback;
	}

}


function updateEpgTimeShift( fValue ) {
	getEl('epg_time_shift_output').innerText = '(' + parseFloat(fValue).toFixed(1) + ' h)';
}