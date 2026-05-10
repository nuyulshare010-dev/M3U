var oUsbFileList = false, oStoragePath = false, oMessage = false, oSelectedUsbFile = false;
var iNumOfMountedUSB = 0;

function initStorage() {

	oStoragePath = document.getElementById("storage_path");
	oUsbFileList = document.getElementById("storage_list");
	oMessage = document.getElementById("storage_message");

	checkMountState();
	//Adds a listener to subscribe to notifications when a change in storage state occurs.
	tizen.filesystem.addStorageStateChangeListener(onStorageStateChanged);
};


function openUsbManager() {

	if( iNumOfMountedUSB ) {
		loadFileList();
		showElement('storage_manager');
		bUsbManagerOpened = true;
	} else {
		showModal(getLang('errorNoUsbMounted'));
	}

}


function closeUsbManager() {

	if( bUsbManagerOpened ) {
		hideElement('storage_manager');
		bUsbManagerOpened = false;
		//oSettingsFields[iSettingsFocusedField].focus();
	}

}


/**
 * Check how many USB are mounted
 */
function checkMountState( bSilent ) {

	bSilent = bSilent || false;

	iNumOfMountedUSB = 0;
	var USBLabelList = "";

	tizen.filesystem.listStorages(function(storages) {
		for( var i = 0; i < storages.length; i++ ) {
			//debug(storages[i]);
			if( storages[i].type == "EXTERNAL" && storages[i].state == "MOUNTED" ) {
				iNumOfMountedUSB = iNumOfMountedUSB + 1;
				USBLabelList += storages[i].label + " is mounted.\n";
			}
		}
		//oUsbFileList.innerHTML = USBLabelList;
		debug(iNumOfMountedUSB + " USB is mounted");
		debug(USBLabelList);

		if( iNumOfMountedUSB ) {
			if( bSilent ) {
				showStatus(getLang('usbMountedStatus'));
			} else if( iNumOfMountedUSB ) {
				openUsbManager();
			}
		} else {
			closeUsbManager();
			showModal(getLang('errorNoUsbMounted'));
		}

	}, function(error) {
		debug("Error code : " + error.code + ", message:" + error.message);
		closeUsbManager();
		showModal(getLang('errorNoUsbMounted'), error.message);
	});

	return iNumOfMountedUSB;
}

/**
 * List File list of first attached USB, if USB is mounted
 */
function loadFileList( sActiveFolder ) {

	sActiveFolder = sActiveFolder || '';
	oSelectedUsbFile = false;

	if( iNumOfMountedUSB == 0 ) {
		oUsbFileList.innerHTML = "USB is not mounted";
	} else {
		oUsbFileList.innerHTML = '<div id="file_spinner"></div>';
		tizen.filesystem.listStorages(function(storages) {
			for( var i = 0; i < storages.length; i++ ) {
				if( storages[i].type == "EXTERNAL" && storages[i].state == "MOUNTED" ) {

					if( sActiveFolder && sActiveFolder.indexOf('/') !== 0 ) {
						sActiveFolder = '/' + sActiveFolder;
					}

					oStoragePath.innerHTML = 'USB:/' + sActiveFolder + '/';
					var sDrivePath = storages[i].label + sActiveFolder;
					tizen.filesystem.resolve(sDrivePath, function(removableStorage) {
						removableStorage.listFiles(function(files) {
							var sHtmlList = '<ul id="usb_file_list">';
							for( i = 0; i < files.length; i++ ) {
								var sClass = '', sName = files[i].name;
								if( files[i].isDirectory ) {
									sClass = 'dir';
								} else if( files[i].isFile ) {
									sClass = 'file';
									if( sName.indexOf('.m3u') > 0 ) {
										sClass = 'file m3u';
									}
								}

								if( files[i].name.indexOf('�') > 0 ) {
									sClass = 'invalid';
									sName += ' (invalid)';
								}

								sHtmlList += "<li class='" + sClass + "' data-path='" + sActiveFolder + "' data-file='" + files[i].name + "'>" + sName + "</li>";
							}
							sHtmlList += "</ul>";
							oUsbFileList.innerHTML = sHtmlList;

							// select first
							oSelectedUsbFile = document.querySelector('#usb_file_list li:first-child');
							oSelectedUsbFile.classList.add('active');

						}, function(error) {
							oUsbFileList.innerHTML = "Error: " + error.code + ", message: " + error.message + '<br>Please press RETURN and try again.';
						});
					}, function(error) {
						oUsbFileList.innerHTML = "Error: " + error.code + ", message: " + error.message + '<br>Please press RETURN and try again.';
					});

					break; // first USB
				}
			}
		}, function(error) {
			oUsbFileList.innerHTML = "Error: " + error.code + ", message: " + error.message + '<br>Please press RETURN and try again.';
		});
	}

}


function browseFileOperation( sAction ) {

	if( oSelectedUsbFile ) {
		var oCurrentFileList = document.querySelectorAll('#usb_file_list li');
		if( oCurrentFileList && oCurrentFileList.length ) {
			iFileLength = oCurrentFileList.length;

			if( sAction == 'down' ) {
				var oNextFile = oSelectedUsbFile.nextElementSibling;
				if( !oNextFile ) {
					oNextFile = document.querySelector('#usb_file_list li:first-child');
				}
				oSelectedUsbFile.classList.remove('active');
				oSelectedUsbFile = oNextFile;
				oSelectedUsbFile.classList.add('active');
				scrollToListItem(oSelectedUsbFile);
			}
			else if( sAction == 'up' ) {
				var oNextFile = oSelectedUsbFile.previousElementSibling;
				if( !oNextFile ) {
					oNextFile = document.querySelector('#usb_file_list li:last-child');
				}
				oSelectedUsbFile.classList.remove('active');
				oSelectedUsbFile = oNextFile;
				oSelectedUsbFile.classList.add('active');
				scrollToListItem(oSelectedUsbFile);
			}
			else if( sAction == 'left' ) {
				if( oSelectedUsbFile.dataset.path ) {
					var sPath = oSelectedUsbFile.dataset.path;
					sPath = sPath.substring(0, sPath.lastIndexOf("/"));
					loadFileList(sPath);
				}
			}
			else if( sAction == 'right' ) {
				if( oSelectedUsbFile.classList.contains('dir') ) {
					var sPath = oSelectedUsbFile.dataset.path + '/' + oSelectedUsbFile.dataset.file;
					loadFileList(sPath);
				}
			}
			else if( sAction == 'ok' ) {
				if( oSelectedUsbFile.classList.contains('file') ) {
					oCurrentEditPlaylist.url = 'USB:/' + oSelectedUsbFile.dataset.path + '/' + oSelectedUsbFile.dataset.file;
					if( oCurrentEditPlaylist ) {
						oCurrentEditPlaylist.fileName = oSelectedUsbFile.dataset.file;
					}

					closeUsbManager();
					downloadUsbPlaylist(oCurrentEditPlaylist.url, function() {

					});

					//focusSettingsField('settings_download_button'); // focus download button
	    			//downloadButton();
				}
				else if( oSelectedUsbFile.classList.contains('dir') ) {
					var sPath = oSelectedUsbFile.dataset.path + '/' + oSelectedUsbFile.dataset.file;
					loadFileList(sPath);
				}
			}

		}

	}

}


/**
 * This function use to check the external devices
 *
 * @param storage
 */

function onStorageStateChanged(storage) {
	hideModal();
	checkMountState(true);
}

/**
 * Handle on external storage.
 */
function handleOnExternalDevice(options) {

	if( iNumOfMountedUSB == 0 ) {
		oMessage.innerHTML = "USB is not mounted";
	} else {
		tizen.filesystem.listStorages(function(storages){
			for (var i = 0; i < storages.length; i++){
				if(storages[i].type == "EXTERNAL" && storages[i].state == "MOUNTED") {
					tizen.filesystem.resolve(storages[i].label, function(removableStorage) {
						switch(options){
						case 1:
							debug("create directory"); //create abc directory, if there is
							createDirectory(removableStorage);
							break;
						case 2:
							debug("create File"); //create abc.txt file, if there is
							createFile(removableStorage);
							break;
						case 3:
							debug("read File"); //read abc.txt file, if there is
							readFile(removableStorage);
							break;
						case 4:
							debug("Delete Directory"); //delete abc directory, if there is
							deleteDirectory(removableStorage);
							break;
						case 5:
							debug("Delete File"); //delete abc.txt file, if there is
							deleteFile(removableStorage);
							break;
						case 6:
							debug("Download File");
							downloadToUsb(removableStorage.path + removableStorage.name);
							break;
						}
	               	});

					break;
				}
			}
		}, function(error){
			oMessage.innerHTML = "Error code : " + error.code + ", oMessage:" + error.message;
		});
	}
}

/**
 * create a Directory
 *
 */

function createDirectory(usb) {
	try{
		usb.createDirectory("abc");
		oMessage.innerHTML="Directory created sucessfully";
	}catch(e){
		debug(e);
		oMessage.innerHTML="Directory created fail";
	}
}

/**
 * create a File
 *
 */

function createFile(usb) {
	try{
		var file = usb.createFile("abc.txt");
		if(file != null){
			file.openStream("w",
	             function(fs) {
	                 fs.write("HelloWorld");
	                 fs.close();
	                 oMessage.innerHTML="File created sucessfully";
	             }, function(e) {
	                 debug("Error " + e.oMessage);
	                 oMessage.innerHTML="File created fail";
	             }, "UTF-8"
	         );
		}else{
			oMessage.innerHTML="File created fail";
		}
	}catch(e){
		debug(e);
		oMessage.innerHTML="File created fail";
	}
}

/**
 * read a File
 *
 */

function readFile(usb) {
	try {
		var file = usb.resolve("abc.txt");
		if( file != null ) {
			file.openStream("r",
	             function(fs) {
					oMessage.innerHTML=fs.read(file.fileSize);
	                fs.close();
	             }, function(e) {
	                debug("Error " + e.message);
	                oMessage.innerHTML="File read fail";
	             }, "UTF-8"
	         );
		} else {
			oMessage.innerHTML="File read fail";
		}
	} catch(e) {
		debug(e);
		oMessage.innerHTML="File read fail";
	}
}


/**
 * delete a Directory
 *
 * @param files
 */
function deleteDirectory(usb) {
	debug("Delete Directory");

	try{
		usb.deleteDirectory(usb.path + usb.name + "/abc", true, function() {
	        debug("Directory Deleted");
	        oMessage.innerHTML="Directory deleted sucessfully";
		}, function(e) {
			debug("Error " + e.oMessage);
			oMessage.innerHTML="Directory deleted fail";
		});
	} catch(e) {
		debug(e);
		oMessage.innerHTML="Directory deleted fail";
	}
}


/**
 * Delete a File
 *
 * @param files
 */

function deleteFile(usb) {
	debug("Delete file");

	try{
		usb.deleteFile(usb.path + usb.name + "/abc.txt", function() {
	        debug("File Deleted");
	        oMessage.innerHTML="File deleted sucessfully";
		}, function(e) {
			debug("Error" + e.oMessage);
			oMessage.innerHTML="Directory deleted fail";
		});
	}catch(e){
		debug(e);
		oMessage.innerHTML="File deleted fail";
	}
}

/**
 * Download the file to USB
 *
 */
function downloadToUsb(usb) {
	debug("Download the file in external device from url");
	var request = new tizen.DownloadRequest(
	    'http://download.tizen.org/tools/README.txt', // File URL
	    usb, // Destination directory
	    'new-file-name.txt', // New file name
	    'ALL', // Network type
	    { // HTTP headers
	        'Pragma': 'no-cache',
	        'X-Agent': 'FileDownloader'
	    }
	);
	tizen.download.start(request);
	oMessage.innerHTML="File('new-file-name.txt') download completed";
}

/**
 * Callback method to be invoked when an error has occurred
 *
 * @param error
 */
function onerror(error) {
    debug("The error " + error.message +
        " occurred when listing the files in the selected folder");
}
