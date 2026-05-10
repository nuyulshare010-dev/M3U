/*

	Copyright 2026 - Herber eDevelopment - Jaroslav Herber
	All rights reserved.

	This code is proprietary and confidential.
	Copying, modification, distribution, or use of this code without explicit permission is strictly prohibited.

*/

var iCurrentChannel = 0, iCurrentPlaylistId = 0, aLoadedPlaylists = {}, oCurrentPlaylist = false, aActiveChannelList = [], aGroups = {},
oEditor = getEl('groups_editor'), oLoader = getEl('loader'), oHeadline = getEl('list_headline'), oBreadcrumb = getEl('breadcrumb'),
oPlaylistList = getEl('playlists_list'), oGroupsList = getEl('groups_list'), oFavsList = getEl('favs_list'),
oChannelList = getEl('channel_list'), oChannelListUl = getEl('channel_list_ul'), oSelectedItem = false,
iNavChannelHeight = 64, aLazyLoadedChannels = [], aChannelOrder = [];


function boot() {

	initDb(function() { // DB successfully loaded, load playlists next

		/*
		iCurrentChannel = parseInt(localStorage.getItem('iCurrentChannel'));
		iCurrentPlaylistId = localStorage.getItem('iCurrentPlaylistId');
		if( !iCurrentPlaylistId ) {
			iCurrentPlaylistId = 0;
		}

		iCurrentPlaylistId = parseInt(iCurrentPlaylistId);
		bootPlaylistReady(function(sPlaylistId) { // has playlist - play channel
			pickPlaylist(iCurrentPlaylistId);
			document.body.classList.remove('booting');
		}, function() { // no playlist yet, show settings
			//openSettings();
			document.body.classList.remove('booting');
		});
		*/

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



function bootGroupsView() {

	applyLang();
	initControls();
	bootEverything();

}


function closeGroupsEditor() {

	if( window.self !== window.top && typeof(parent.closeGroupsEditor) === 'function' ) {
		parent.closeGroupsEditor();
	} else {
		window.location.href = "../player/index.html";
	}

}



function bootPlaylistReady( sOnSuccess, sOnFailure ) {

	loadPlaylists(function(iListCount) {
		if( aLoadedPlaylists && aLoadedPlaylists[iCurrentPlaylistId] && aLoadedPlaylists[iCurrentPlaylistId].channelCount ) {
			oCurrentPlaylist = aLoadedPlaylists[iCurrentPlaylistId];
		}
		sOnSuccess();
		//getPlaylistChannels(iCurrentPlaylistId, sOnSuccess, sOnFailure);
	}, sOnFailure);

	//getPlaylistChannels(iCurrentPlaylistId, sOnSuccess, sOnFailure);

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
		//oPlaylistList.className = 'loading';

		var oTx = oDb.transaction("playlistStore"), oStore = oTx.objectStore("playlistStore"),
			oIndex = oStore.index('id'), oRequest = oIndex.openCursor();

		oRequest.onsuccess = function(event) {
			var oRecord = event.target.result;
			if( oRecord && oRecord.value ) {
				var aPlaylist = oRecord.value;
				aLoadedPlaylists[aPlaylist.id] = aPlaylist;
				oRecord.continue();
			}
		};

		oRequest.onerror = function(e) {
			sOnFailure(e);
		};

		oTx.oncomplete = function() {

			//oPlaylistList.className = '';
			sOnSuccess();

			var sHtml = '';

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

			//sHtml += '<li id="selector_open_playlist_manager" class="i18n icon icon-settings" data-langid="playlistSelectorOpenPm">' + getLang('playlistSelectorOpenPm') + '</li>';

			oPlaylistList.innerHTML = '<ul id="playlists_list_ul">' + sHtml + '</ul>';

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


function updateBreadCrumb() {

	if( oCurrentPlaylist.name ) {
		oBreadcrumb.innerHTML = oCurrentPlaylist.name;
	}

}


function pickPlaylist( iPlaylistId ) {

	getPlaylistChannels(iPlaylistId, function() {

		updateBreadCrumb();

		/*
		if( oCurrentPlaylist.name ) {
			oHeadline.innerHTML = oCurrentPlaylist.name;
		} else {
			oHeadline.innerHTML = 'Unnamed playlist';
		}*/

		buildNav();
	}, function( oEr ) {
		oChannelList.innerHTML = '';
	});

}


function buildNav() {

	aGroups = {};

	var sListPoints = '', sGroupListPoints = '', iChCount = 0,
		sActiveClass = '', iChannelsCount = aActiveChannelList.length;

	aFilteredChannelList = []; aChannelOrder = []; aLazyLoadedChannels = []; aLazyLoadedEpgChannels = [];
	iVisibleChannels = 0; iFavChannels = 0; bPlaylistHasFavs = false;

	for( var i = 0; i < iChannelsCount; i++ ) {

		var oChannel = aActiveChannelList[i];
		if( !oChannel ) { continue; }

		oChannel.order = null;

		var sName = oChannel.name, sGroup = oChannel.group, aChannelGroups = false;

		if( sGroup && sGroup.indexOf(';') > 1 ) {
			aChannelGroups = sGroup.split(';');
			aChannelGroups.forEach(function(sGr) {
				if( typeof(aGroups[sGr]) === 'undefined' ) {
					aGroups[sGr] = 0;
				}
			});
		} else {
			if( typeof(aGroups[sGroup]) === 'undefined' ) {
				aGroups[sGroup] = 0; // Count channels in groups
			}
		}

		if( aChannelGroups ) {
			aChannelGroups.forEach(function(sGr) { aGroups[sGr]++; });
		} else {
			aGroups[sGroup]++;
		}

		if( iCurrentChannel == i ) {
			//sClass += ' active';
			iScrollToActiveChannel = iVisibleChannels;
		}

		aFilteredChannelList[i] = iVisibleChannels;
		aChannelOrder[iVisibleChannels] = i;
		oChannel.order = iVisibleChannels;
		iVisibleChannels++;

	}


	for( var sKey in aGroups ) {
		sGroupListPoints += '<li id="nav_gr_' + sKey + '" data-group="' + sKey + '">' + sKey + ' (' + aGroups[sKey] + ')</li>';
	}
	oGroupsList.innerHTML = '<ul id="groups_list_ul">' + sGroupListPoints + '</ul>';

	channelScrollEvent(); // Lazy load

}


function getChannelHtml( iChNum, sTitleId ) {

	var aCurChannel = aActiveChannelList[iChNum], sName = aCurChannel.cname ? aCurChannel.cname : aCurChannel.name;
	if( !aCurChannel || !sName ) {
		return '';
	}

	var sEditAttributes = '';
	if( sTitleId ) {
		sEditAttributes = ' id="' + sTitleId + '" onclick="showRenameInput(' + iChNum + ');" ';
	}

	var sHtml = '<span class="list-ch">' + (iChNum + 1) + '</span> <span ' + sEditAttributes + ' class="list-title">' + sName + '</span>';

	if( aCurChannel.x_series_id && aCurChannel.type === 'series' ) {
		sHtml += '<div class="nav_logo icon icon-series"></div>';
	} else if( aCurChannel.x_stream_id && aCurChannel.type === 'movie' ) {
		sHtml += '<div class="nav_logo icon icon-movies"></div>';
	} else if( typeof(aCurChannel.logo) === 'string' ) {
		//sHtml += '<div class="nav_logo"><img src="' + aCurChannel.logo + '" alt="" /></div>';
	}

	return sHtml;

}


function createNavChannel( i ) {

	var aCurChannel = aActiveChannelList[i];
	if( !aCurChannel || !aCurChannel.name || aCurChannel.deleted ) { return false; }

	var iOrderNum = aCurChannel.order;
	if( typeof(iOrderNum) !== "number" ) { return false; }

	var oChannel = document.createElement('li');
	oChannel.id = 'nav_ch_' + i;
	oChannel.dataset.channelnum = i;
	oChannel.innerHTML = getChannelHtml(i);
	oChannel.style.top = (iOrderNum * iNavChannelHeight) + 'px';
	oChannel.dataset.order = iOrderNum;
	//oChannel.onmouseenter = function() { focusListItem(this, true); };

	if( iCurrentChannel == i ) {
		oChannel.className = 'active';
	}

	if( aCurChannel.protect ) {
		oChannel.classList.add('protected');
		if( !bProtectionUnlocked && bHideProtected ) {
			oChannel.classList.add('invisible');
			return oChannel;
		}
	}

	/*if( isFavourite(i) ) {
		oChannel.classList.add('fav');
	}*/

	if( aCurChannel.x_series_id && aCurChannel.type === 'series' ) {
		oChannel.classList.add('series');
	} else if( aCurChannel.x_stream_id && aCurChannel.type === 'movie' ) {
		oChannel.classList.add('movie');
	}

	oChannelListUl.appendChild(oChannel);

	return oChannel;

}


function lazyLoadChannel( iChNum ) {

	iChNum = parseInt(iChNum);

	if( aLazyLoadedChannels.includes(iChNum) || !aActiveChannelList[iChNum] ) {
		return false;
	}

	// Truncate nav next time it is opened if there were too many items loaded
	if( aLazyLoadedChannels.length > 100 ) {
		bNeedNavRefresh = true;
	}

	aLazyLoadedChannels.push(iChNum);
	return createNavChannel(iChNum);

}


function channelScrollEvent() {

	//syncScrollEpgList(oChannelList);

	var iTop = oChannelList.scrollTop, iChannelBoxHeight = oChannelList.offsetHeight,
		iVisibleChannelTop = Math.floor(iTop / iNavChannelHeight),
		iVisibleChannelBottom = (iTop + iChannelBoxHeight + 10) / iNavChannelHeight;

	//var iScrollbarTop = calculateScrollbarTop(iTop, iChannelBoxHeight, iChannelListHeight);
	//oChannelListScrollbar.style.top = iScrollbarTop + 'px';

	if( iVisibleChannelBottom && aChannelOrder ) {
		if( iVisibleChannelBottom < 8 ) {
			iVisibleChannelBottom = 8;
		}

		for( var i = iVisibleChannelTop; i < iVisibleChannelBottom; i++ ) {
			if( aChannelOrder[i] >= 0 ) {
				lazyLoadChannel(aChannelOrder[i]);
				//lazyLoadEpgNavChannel(aChannelOrder[i]);
			}
		}
	}

}


var aLists = ['edit_type', 'playlist', 'groups', 'favs'], iCurrentEditorList = 0, oCurrentNav = getEl('edit_type_list');
function moveToList( iDir ) {

	if( iDir == -1 ) {

	}

	oEditor.className = '';

}


function goBack() {
	if( oCurrentNav && oCurrentNav.dataset.top ) {
		openNavList(oCurrentNav.dataset.top); return;
	}

	closeGroupsEditor();
}


function scrollToListItem( oListItem ) {

	var oParentBox = oListItem.parentElement, iBoxHeight = oParentBox.offsetHeight;
		//iScrolled = oParentBox.scrollTop;

	oParentBox.scrollTop = oListItem.offsetTop - (iBoxHeight * 0.4);

}


function openNavList( sListId, bIsPopStateEvent ) {

	if( oCurrentNav ) {
		oCurrentNav.classList.remove('active');
	}

	sCurrentNavId = sListId + '_nav';
	oCurrentNav = getEl(sCurrentNavId);
	if( !oCurrentNav ) {
		sCurrentNavId = 'top_nav';
		oCurrentNav = getEl(sCurrentNavId);
	}

	oSettingsHeadline.innerHTML = getLang(sListId.replace('_', '-'));

	if( !bIsPopStateEvent ) {
		bSkipPopState = true;
		window.location.hash = sListId;
	}

	bSkipPopState = false;

	if( oCurrentNav.dataset.loadaction ) {
		executeAction(oCurrentNav.dataset.loadaction, oCurrentNav);
	}

	oCurrentNav.classList.add('active');
	oCurrentNavList = oCurrentNav.getElementsByTagName('li');

	if( oCurrentNavList.length ) {
		var oSelectedItem = oCurrentNav.getElementsByClassName('select');
		if( oSelectedItem.length === 1 ) {
			selectNavItem(oSelectedItem[0]);
			scrollToListItem(oCurrentNavItem);
		} else {
			selectNavItem(oCurrentNavList[0]);
		}
	}

}


function selectListItem() {
	
	var oLastSelected = getCurrentSelectedItem();
	if( oLastSelected && oLastSelected != oSelectedItem ) {
		oLastSelected.classList.remove('selected');
		oSelectedItem.classList.add('selected');
	}
	
}


function selectNavItem( oEl ) {

	if( oCurrentNavItem ) {
		oCurrentNavItem.classList.remove('select');
	}

	oCurrentNavItem = oEl;
	oCurrentNavItem.classList.add('select');

	if( oCurrentNavItem.dataset.guide ) {

		// take headline into guide
		var oLangItem = oEl.getElementsByClassName('i18n'), sHeadlineKey = false;
		if( oLangItem && oLangItem.length ) {
			sHeadlineKey = oLangItem[0].dataset.langid;
		}

		applyGuideLang(oCurrentNavItem.dataset.guide, sHeadlineKey);
	} else {
		oSettingsGuide.style.display = 'none';
	}

	if( oCurrentNavItem.dataset.hoveraction ) {
		executeAction(oCurrentNavItem.dataset.hoveraction, oCurrentNavItem);
	}

}


function clickOnListItem( oItem ) {

	oSelectedItem = oItem;
	selectListItem();
	return;
	
	if( !oItem ) {
		oItem = oSelectedItem;
	}

	if( !oItem ) {
		console.log("no item selected");
		return false;
	}

	var sAction = oItem.dataset.action;

	switch( sAction ) {
		case 'edit-favs':
			break;
	}

	console.log(oItem);

}



function getCurrentSelectedItem() {

	var oSelected = oCurrentNav.querySelector('li.selected');
	if( !oSelected && iCurrentChannel ) {
		oSelected = oCurrentNav.querySelector('li:first-child');
	}

	return oSelected;

}


function getNextListItem( oItems, oCurrent, iSteps = 1 ) {

	if( !oItems || !oCurrent ) return oCurrent;
	var oListItems = Array.from(oItems);
	if( !oListItems.length ) return oCurrent;

	var iCurrentIndex = oListItems.indexOf(oCurrent), iNextIndex = iCurrentIndex + iSteps;

	iNextIndex = (iNextIndex % oListItems.length + oListItems.length) % oListItems.length;

	return oListItems[iNextIndex];

}

function getPrevListItem( oItems, oCurrent, iSteps = 1 ) {
	return getNextListItem(oItems, oCurrent, -iSteps);
}


function moveListUp( iSteps ) {

	var oSelected = getCurrentSelectedItem();
	iSteps = iSteps || 1; oSelectedItem = oSelected;

	if( oSelected ) {
		oSelected.classList.remove('selected');
		var iChannelOrderPos = oSelectedItem.dataset.order;

		if( typeof(iChannelOrderPos) !== "undefined" ) {
			iChannelOrderPos = parseInt(iChannelOrderPos) - iSteps;
			if( iChannelOrderPos < -1 ) {
				iChannelOrderPos = 0;
			} else if( iChannelOrderPos == -1 ) {
				iChannelOrderPos = aChannelOrder.length - 1;
			}

			var iNewChannelNum = aChannelOrder[iChannelOrderPos];
			oSelectedItem = getNavChannel(iNewChannelNum);
		} else if( oSelected.dataset.prev ) {
			oSelectedItem = document.querySelector('#' + oSelected.dataset.prev + ' li:last-child');
		} /*else if( bGroupsOpened ) {
			oSelectedItem = getPrevListItem(oGroupsNavItems, oSelected, iSteps);
		}*/ else {
			for( var i = 1; i <= iSteps; i++ ) {
				var oPrev = oSelectedItem.previousElementSibling;
				while( oPrev && oPrev.dataset.skip === 'yes' ) {
					oPrev = oPrev.previousElementSibling;
				}

				if( !oPrev ) {
					if( i === 1 ) {
						oSelectedItem = oSelected.parentElement.lastElementChild;
						while( oSelectedItem && oSelectedItem.dataset.skip === 'yes' ) {
							oSelectedItem = oSelectedItem.previousElementSibling;
						}
					}
					break;
				}
				oSelectedItem = oPrev;
			}
		}

		scrollToListItem(oSelectedItem, (iSteps > 3));
		oSelectedItem.classList.add('selected');
	}

	return oSelectedItem;

}


function moveListDown( iSteps ) {

	var oSelected = getCurrentSelectedItem();
	iSteps = iSteps || 1; oSelectedItem = oSelected;

	if( oSelected ) {
		oSelected.classList.remove('selected');
		var iChannelOrderPos = oSelectedItem.dataset.order;

		if( typeof(iChannelOrderPos) !== "undefined" ) {
			iChannelOrderPos = parseInt(iChannelOrderPos) + iSteps;
			if( iChannelOrderPos > aChannelOrder.length ) {
				iChannelOrderPos = aChannelOrder.length - 1;
			} else if( iChannelOrderPos == aChannelOrder.length ) {
				iChannelOrderPos = 0;
			}

			var iNewChannelNum = aChannelOrder[iChannelOrderPos];
			oSelectedItem = getNavChannel(iNewChannelNum);
		} else if( oSelected.dataset.next ) {
			oSelectedItem = document.querySelector('#' + oSelected.dataset.next + ' li:first-child');
		} /*else if( bGroupsOpened ) {
			oSelectedItem = getNextListItem(oGroupsNavItems, oSelected, iSteps);
		}*/
		else {
			for( var i = 1; i <= iSteps; i++ ) {
				var oNext = oSelectedItem.nextElementSibling;
				while( oNext && oNext.dataset.skip === 'yes' ) {
					oNext = oNext.nextElementSibling;
				}

				if( !oNext ) {
					if( i === 1 ) {
						oSelectedItem = oSelected.parentElement.firstElementChild;
						while( oSelectedItem && oSelectedItem.dataset.skip === 'yes' ) {
							oSelectedItem = oSelectedItem.nextElementSibling;
						}
					}
					break;
				}
				oSelectedItem = oNext;
			}
		}

		scrollToListItem(oSelectedItem, (iSteps > 3));
		oSelectedItem.classList.add('selected');
	}

	return oSelectedItem;

}
