/*

	Copyright 2026 - Herber eDevelopment - Jaroslav Herber
	All rights reserved.

	This code is proprietary and confidential.
	Copying, modification, distribution, or use of this code without explicit permission is strictly prohibited.

*/

// For old devices!
if( typeof(NodeList.prototype.forEach) === 'undefined' ) {
	NodeList.prototype.forEach = Array.prototype.forEach;
}

if( typeof(HTMLCollection.prototype.forEach) === 'undefined' ) {
	HTMLCollection.prototype.forEach = Array.prototype.forEach;
}

// en, ar, cs, da, de, el, es, fi, fr, hi, id, it, ja, ka, ko, nl, no, pl, pt, ro, ru, sk, sl, sv, tr, uk, vi, zh

var i18n = {

'hint': {
	en: 'M3U IPTV is a player app that does not provide its own channels or content.<br>To watch channels, you need to add an M3U playlist from your IPTV provider.',
	ar: 'تطبيق M3U IPTV هو مشغل فقط ولا يوفر قنوات أو محتوى خاص به.<br>لمشاهدة القنوات، تحتاج إلى إضافة قائمة M3U من مزود IPTV الخاص بك.',
	cs: 'M3U IPTV je přehrávač a neposkytuje vlastní kanály ani obsah.<br>Pro sledování kanálů musíte přidat M3U seznam od svého poskytovatele IPTV.',
	da: 'M3U IPTV er en afspiller-app, som ikke leverer egne kanaler eller indhold.<br>For at se kanaler skal du tilføje en M3U-playliste fra din IPTV-udbyder.',
	de: 'M3U IPTV ist eine Player-App, die keine eigenen Kanäle oder Inhalte bereitstellt.<br>Um Kanäle zu sehen, müssen Sie eine M3U-Wiedergabeliste von Ihrem IPTV-Anbieter hinzufügen.',
	el: 'Η εφαρμογή M3U IPTV είναι ένα πρόγραμμα αναπαραγωγής και δεν παρέχει δικά της κανάλια ή περιεχόμενο.<br>Για να παρακολουθήσετε κανάλια, πρέπει να προσθέσετε μια λίστα M3U από τον πάροχο IPTV σας.',
	es: 'M3U IPTV es una app reproductora que no proporciona canales ni contenido propio.<br>Para ver canales, debes añadir una lista M3U de tu proveedor de IPTV.',
	fi: 'M3U IPTV on toistinsovellus, joka ei tarjoa omia kanavia tai sisältöä.<br>Katsoaksesi kanavia, sinun täytyy lisätä M3U-soittolista IPTV-palveluntarjoajaltasi.',
	fr: 'M3U IPTV est une application de lecture qui ne fournit pas ses propres chaînes ou contenus.<br>Pour regarder des chaînes, vous devez ajouter une playlist M3U de votre fournisseur IPTV.',
	hi: 'M3U IPTV एक प्लेयर ऐप है जो अपने चैनल या सामग्री प्रदान नहीं करता है।<br>चैनल देखने के लिए, आपको अपने IPTV प्रदाता से M3U प्लेलिस्ट जोड़नी होगी।',
	id: 'M3U IPTV adalah aplikasi pemutar yang tidak menyediakan saluran atau kontennya sendiri.<br>Untuk menonton saluran, Anda harus menambahkan daftar M3U dari penyedia IPTV Anda.',
	it: 'M3U IPTV è un’app di riproduzione che non fornisce canali o contenuti propri.<br>Per guardare i canali, devi aggiungere una playlist M3U dal tuo fornitore IPTV.',
	ja: 'M3U IPTVは、自身のチャンネルやコンテンツを提供しないプレイヤーアプリです。<br>チャンネルを視聴するには、IPTVプロバイダーからM3Uプレイリストを追加する必要があります。',
	ka: 'M3U IPTV არის დამკვრელი აპლიკაცია, რომელიც არ უზრუნველყოფს საკუთარ არხებს ან კონტენტს.<br>არხების სანახავად საჭიროა თქვენი IPTV პროვაიდერისგან M3U პლეილისტის დამატება.',
	ko: 'M3U IPTV는 자체 채널이나 콘텐츠를 제공하지 않는 플레이어 앱입니다.<br>채널을 시청하려면 IPTV 제공업체의 M3U 재생목록을 추가해야 합니다.',
	nl: 'M3U IPTV is een player-app die geen eigen kanalen of inhoud biedt.<br>Om kanalen te bekijken, moet je een M3U-afspeellijst van je IPTV-provider toevoegen.',
	no: 'M3U IPTV er en avspillingsapp som ikke tilbyr egne kanaler eller innhold.<br>For å se kanaler må du legge til en M3U-spilleliste fra din IPTV-leverandør.',
	pl: 'M3U IPTV to aplikacja odtwarzacza, która nie udostępnia własnych kanałów ani treści.<br>Aby oglądać kanały, musisz dodać listę M3U od swojego dostawcy IPTV.',
	pt: 'M3U IPTV é um aplicativo de player que não fornece seus próprios canais ou conteúdo.<br>Para assistir canais, adicione uma lista M3U do seu provedor de IPTV.',
	ro: 'M3U IPTV este o aplicație de redare care nu oferă propriile canale sau conținut.<br>Pentru a viziona canale, trebuie să adăugați o listă M3U de la furnizorul dvs. IPTV.',
	ru: 'M3U IPTV — это приложение-плеер, которое не предоставляет собственные каналы или контент.<br>Чтобы смотреть каналы, добавьте плейлист M3U от вашего IPTV-провайдера.',
	sk: 'M3U IPTV je prehrávačová aplikácia, ktorá neposkytuje vlastné kanály ani obsah.<br>Na sledovanie kanálov musíte pridať M3U playlist od svojho IPTV poskytovateľa.',
	sl: 'M3U IPTV je predvajalna aplikacija, ki ne ponuja lastnih kanalov ali vsebine.<br>Za ogled kanalov morate dodati M3U seznam od svojega ponudnika IPTV.',
	sv: 'M3U IPTV är en player-app som inte tillhandahåller egna kanaler eller innehåll.<br>För att titta på kanaler måste du lägga till en M3U-spellista från din IPTV-leverantör.',
	tr: 'M3U IPTV, kendi kanal veya içeriğini sunmayan bir oynatıcı uygulamasıdır.<br>Kanal izlemek için IPTV sağlayıcınızdan bir M3U oynatma listesi eklemeniz gerekir.',
	uk: 'M3U IPTV — це додаток-програвач, який не надає власних каналів або контенту.<br>Щоб дивитися канали, потрібно додати M3U-плейлист від вашого провайдера IPTV.',
	vi: 'M3U IPTV là một ứng dụng trình phát không cung cấp kênh hoặc nội dung riêng.<br>Để xem kênh, bạn cần thêm danh sách M3U từ nhà cung cấp IPTV của mình.',
	zh: 'M3U IPTV 是一个播放器应用程序，不提供自己的频道或内容。<br>要观看频道，您需要从 IPTV 提供商添加 M3U 播放列表。'
},
'previous-version-hint': {
	en: '<b>Used version 2 of the M3U IPTV app before?</b><br><br>You can import your last loaded playlist from <b>Settings » Playlists » Add Playlist</b>.<br>To switch back to the previous player, go to <b>Settings » General » Switch to old app version 2</b>.',
	ar: '<b>هل استخدمت الإصدار 2 من تطبيق M3U IPTV من قبل؟</b><br><br>يمكنك استيراد آخر قائمة تشغيل قمت بتحميلها من <b>الإعدادات » قوائم التشغيل » إضافة قائمة تشغيل</b>.<br>للتبديل إلى المشغل السابق، انتقل إلى <b>الإعدادات » عام » التبديل إلى إصدار التطبيق القديم 2</b>.',
	cs: '<b>Používali jste dříve verzi 2 aplikace M3U IPTV?</b><br><br>Poslední načtený seznam stop můžete importovat z <b>Nastavení » Seznamy skladeb » Přidat seznam</b>.<br>Chcete-li se vrátit k předchozímu přehrávači, přejděte do <b>Nastavení » Obecné » Přepnout na starou verzi aplikace 2</b>.',
	da: '<b>Har du tidligere brugt version 2 af M3U IPTV-appen?</b><br><br>Du kan importere din senest indlæste playliste fra <b>Indstillinger » Playlister » Tilføj playliste</b>.<br>For at skifte tilbage til den tidligere afspiller skal du gå til <b>Indstillinger » Generelt » Skift til gammel appversion 2</b>.',
	de: '<b>Haben Sie zuvor Version 2 der M3U IPTV-App verwendet?</b><br><br>Sie können Ihre zuletzt geladene Playlist unter <b>Einstellungen » Playlists » Playlist hinzufügen</b> importieren.<br>Zum alten Player wechseln Sie unter <b>Einstellungen » Allgemein » Zur alten App-Version 2 wechseln</b>.',
	el: '<b>Χρησιμοποιήσατε προηγουμένως την έκδοση 2 της εφαρμογής M3U IPTV;</b><br><br>Μπορείτε να εισάγετε την τελευταία λίστα αναπαραγωγής σας από <b>Ρυθμίσεις » Λίστες » Προσθήκη λίστας</b>.<br>Για να επιστρέψετε στην προηγούμενη έκδοση, μεταβείτε στις <b>Ρυθμίσεις » Γενικά » Εναλλαγή στην παλιά έκδοση 2</b>.',
	es: '<b>¿Usaste la versión 2 de la app M3U IPTV antes?</b><br><br>Puedes importar tu última lista desde <b>Configuración » Listas » Agregar lista</b>.<br>Para volver al reproductor anterior, ve a <b>Configuración » General » Cambiar a la versión antigua de la app 2</b>.',
	fi: '<b>Käytitkö aiemmin M3U IPTV -sovelluksen versiota 2?</b><br><br>Voit tuoda viimeksi ladatun soittolistan kohdasta <b>Asetukset » Soittolistat » Lisää soittolista</b>.<br>Vaihtaaksesi edelliseen soittimeen, siirry kohtaan <b>Asetukset » Yleiset » Vaihda vanhaan sovellusversioon 2</b>.',
	fr: '<b>Vous avez utilisé la version 2 de l’application M3U IPTV ?</b><br><br>Vous pouvez importer votre dernière playlist depuis <b>Paramètres » Listes » Ajouter une liste</b>.<br>Pour revenir à l’ancien lecteur, allez dans <b>Paramètres » Général » Revenir à l’ancienne version 2</b>.',
	hi: '<b>क्या आपने पहले M3U IPTV ऐप का संस्करण 2 इस्तेमाल किया है?</b><br><br>आप अपनी अंतिम लोड की गई प्लेलिस्ट <b>सेटिंग्स » प्लेलिस्ट्स » प्लेलिस्ट जोड़ें</b> से इंपोर्ट कर सकते हैं।<br>पिछले प्लेयर पर वापस जाने के लिए <b>सेटिंग्स » सामान्य » पुराने ऐप संस्करण 2 पर स्विच करें</b> पर जाएं।',
	id: '<b>Pernah menggunakan versi 2 dari aplikasi M3U IPTV?</b><br><br>Anda dapat mengimpor daftar putar terakhir dari <b>Pengaturan » Daftar Putar » Tambah Daftar</b>.<br>Untuk kembali ke pemutar sebelumnya, buka <b>Pengaturan » Umum » Beralih ke versi lama 2</b>.',
	it: '<b>Hai già usato la versione 2 dell’app M3U IPTV?</b><br><br>Puoi importare la tua ultima playlist da <b>Impostazioni » Playlist » Aggiungi playlist</b>.<br>Per tornare alla versione precedente del lettore, vai su <b>Impostazioni » Generale » Passa alla vecchia versione 2</b>.',
	ja: '<b>以前に M3U IPTV アプリのバージョン2を使用しましたか？</b><br><br><b>設定 » プレイリスト » プレイリストを追加</b>から最後に読み込んだプレイリストをインポートできます。<br>以前のプレーヤーに戻すには、<b>設定 » 一般 » 古いバージョン2に切り替え</b>に進んでください。',
	ka: '<b>ადრე იყენებდით M3U IPTV აპლიკაციის მე-2 ვერსიას?</b><br><br>ბოლოს ჩატვირთული პლეილისტის იმპორტი შეგიძლიათ <b>პარამეტრები » პლეილისტები » პლეილისტის დამატება</b> მენიუდან.<br>ძველ დამკვრელზე დასაბრუნებლად გადადით <b>პარამეტრები » ზოგადი » ძველ აპლიკაციის ვერსია 2-ზე გადართვა</b>.',
	ko: '<b>M3U IPTV 앱 버전 2를 사용한 적이 있나요?</b><br><br><b>설정 » 재생목록 » 재생목록 추가</b>에서 마지막으로 불러온 재생목록을 가져올 수 있습니다.<br>이전 플레이어로 돌아가려면 <b>설정 » 일반 » 이전 앱 버전 2로 전환</b>으로 이동하세요。',
	nl: '<b>Heeft u eerder versie 2 van de M3U IPTV-app gebruikt?</b><br><br>U kunt uw laatst geladen afspeellijst importeren via <b>Instellingen » Afspeellijsten » Voeg afspeellijst toe</b>.<br>Om terug te schakelen naar de vorige speler, gaat u naar <b>Instellingen » Algemeen » Schakel over naar oude versie 2</b>.',
	no: '<b>Har du brukt versjon 2 av M3U IPTV-appen før?</b><br><br>Du kan importere den sist brukte spillelisten fra <b>Innstillinger » Spillelister » Legg til spilleliste</b>.<br>For å bytte tilbake til forrige spiller, gå til <b>Innstillinger » Generelt » Bytt til gammel appversjon 2</b>.',
	pl: '<b>Używałeś wcześniej wersji 2 aplikacji M3U IPTV?</b><br><br>Możesz zaimportować ostatnią załadowaną listę odtwarzania z <b>Ustawienia » Listy odtwarzania » Dodaj listę</b>.<br>Aby wrócić do poprzedniego odtwarzacza, przejdź do <b>Ustawienia » Ogólne » Przełącz na starą wersję aplikacji 2</b>.',
	pt: '<b>Usou a versão 2 do app M3U IPTV antes?</b><br><br>Você pode importar sua última playlist de <b>Configurações » Listas de Reprodução » Adicionar Lista</b>.<br>Para voltar ao player anterior, vá para <b>Configurações » Geral » Mudar para a versão antiga 2</b>.',
	ro: '<b>Ați folosit versiunea 2 a aplicației M3U IPTV înainte?</b><br><br>Puteți importa ultima listă încărcată din <b>Setări » Liste de redare » Adăugare listă</b>.<br>Pentru a reveni la versiunea anterioară, accesați <b>Setări » General » Comutare la versiunea veche 2</b>.',
	ru: '<b>Ранее использовали версию 2 приложения M3U IPTV?</b><br><br>Вы можете импортировать последний загруженный плейлист из <b>Настройки » Плейлисты » Добавить плейлист</b>.<br>Чтобы вернуться к предыдущему плееру, перейдите в <b>Настройки » Общие » Переключиться на старую версию приложения 2</b>.',
	sk: '<b>Používali ste predtým verziu 2 aplikácie M3U IPTV?</b><br><br>Posledný načítaný playlist môžete importovať z <b>Nastavenia » Playlisty » Pridať playlist</b>.<br>Ak sa chcete vrátiť k predchádzajúcemu prehrávaču, prejdite na <b>Nastavenia » Všeobecné » Prepnúť na starú verziu aplikácie 2</b>.',
	sl: '<b>Ste prej uporabljali različico 2 aplikacije M3U IPTV?</b><br><br>Zadnji seznam lahko uvozite iz <b>Nastavitve » Seznami predvajanja » Dodaj seznam</b>.<br>Za vrnitev na prejšnji predvajalnik pojdite na <b>Nastavitve » Splošno » Preklopi na staro različico aplikacije 2</b>.',
	sv: '<b>Har du tidigare använt version 2 av M3U IPTV-appen?</b><br><br>Du kan importera din senaste spellista från <b>Inställningar » Spellistor » Lägg till spellista</b>.<br>För att återgå till föregående spelare, gå till <b>Inställningar » Allmänt » Byt till gamla version 2</b>.',
	tr: '<b>Daha önce M3U IPTV uygulamasının 2. sürümünü kullandınız mı?</b><br><br>Son yüklü çalma listenizi <b>Ayarlar » Çalma Listeleri » Çalma Listesi Ekle</b> bölümünden içe aktarabilirsiniz.<br>Önceki oynatıcıya geçmek için <b>Ayarlar » Genel » Eski sürüm 2\'ye geç</b> bölümüne gidin.',
	uk: '<b>Раніше використовували версію 2 застосунку M3U IPTV?</b><br><br>Ви можете імпортувати останній список відтворення з <b>Налаштування » Плейлисти » Додати плейлист</b>.<br>Щоб повернутися до попереднього плеєра, перейдіть у <b>Налаштування » Загальні » Перемкнутися на стару версію 2</b>.',
	vi: '<b>Bạn đã từng sử dụng phiên bản 2 của ứng dụng M3U IPTV?</b><br><br>Bạn có thể nhập danh sách phát cuối cùng từ <b>Cài đặt » Danh sách phát » Thêm danh sách</b>.<br>Để quay lại trình phát cũ, hãy vào <b>Cài đặt » Chung » Chuyển sang phiên bản cũ 2</b>.',
	zh: '<b>之前使用过 M3U IPTV 应用的第2版吗？</b><br><br>您可以从 <b>设置 » 播放列表 » 添加播放列表</b> 导入上次加载的播放列表。<br>要切换回旧版播放器，请进入 <b>设置 » 常规 » 切换到旧版应用2</b>。'
},
'add': {
	en: 'Add playlist',
	ar: 'إضافة قائمة تشغيل',
	cs: 'Přidat seznam',
	da: 'Tilføj playliste',
	de: 'Playlist hinzufügen',
	el: 'Προσθήκη λίστας',
	es: 'Agregar lista',
	fi: 'Lisää soittolista',
	fr: 'Ajouter une liste',
	hi: 'प्लेलिस्ट जोड़ें',
	id: 'Tambah daftar putar',
	it: 'Aggiungi playlist',
	ja: 'プレイリストを追加',
	ka: 'პლეილისტის დამატება',
	ko: '재생목록 추가',
	nl: 'Afspeellijst toevoegen',
	no: 'Legg til spilleliste',
	pl: 'Dodaj playlistę',
	pt: 'Adicionar playlist',
	ro: 'Adaugă listă',
	ru: 'Добавить плейлист',
	sk: 'Pridať playlist',
	sl: 'Dodaj seznam',
	sv: 'Lägg till spellista',
	tr: 'Çalma listesi ekle',
	uk: 'Додати плейлист',
	vi: 'Thêm danh sách phát',
	zh: '添加播放列表'
}

};


function isLangAllowed( sLangId ) {

	switch( sLangId ) {
		case 'ar': return 'عربي';
		case 'cs': return 'český';
		case 'da': return 'Dansk';
		case 'de': return 'Deutsch';
		case 'el': return 'Ελληνικά';
		case 'en': return 'English';
		case 'es': return 'Español';
		case 'fi': return 'Suomalainen';
		case 'fr': return 'Français';
		case 'hi': return 'हिंदी';
		case 'id': return 'Bahasa Indonesia';
		case 'it': return 'Italiano';
		case 'ja':
		case 'jp': return '日本語'; // fallback for japanese
		case 'ka': return 'ქართული';
		case 'ko': return '한국어';
		case 'nl': return 'Nederlands';
		case 'no': return 'Norsk';
		case 'pl': return 'Polski';
		case 'pt': return 'Português';
		case 'ru': return 'Русский';
		case 'ro': return 'Română';
		case 'sk': return 'Slovák';
		case 'sl': return 'Slovenski';
		case 'sv': return 'Svenska';
		case 'tr': return 'Türk';
		case 'uk': return 'Українська';
		case 'vi': return 'Tiếng Việt';
		case 'zh': return '中国人';
	}

	return false;

}

function setLangId( sLangId ) {
	if( sLangId && isLangAllowed(sLangId) ) {
		localStorage.setItem('sLangId', sLangId);
		applyLang();
		//applyGuideLang('default');
	} else {
		console.log('Unknown language: ' + sLangId);
	}
}

function getLangId() {
	var sStoredLang = localStorage.getItem('sLangId');

	if( !sStoredLang ) {
		sStoredLang = getDeviceLang();
		setLangId(sStoredLang);
	}

	if( !isLangAllowed(sStoredLang) ) {
		sStoredLang = 'en';
	}
	return sStoredLang;
}


function getLang( sKey, sForceLangId ) {

	if( typeof(sKey) === 'undefined' ) {
		console.error(sKey);
		return '';
	}

	sForceLangId = sForceLangId || false;

	if( sForceLangId ) {
		var sLangId = sForceLangId;
	} else {
		var sLangId = getLangId();
	}

	if( !isLangAllowed(sLangId) ) {
		sLangId = 'en';
	}

	var aText = i18n[sKey];
	if( aText ) {
		if( aText[sLangId] ) {
			return aText[sLangId];
		} else if( sLangId !== 'en' ) {
			//console.log('Lang fallback: ' + sLangId + ' --- ' + sKey);
			return getLang(sKey, 'en');
		}
	}

	return '';

}


function applyLang() {

	var sLangId = getLangId();
	if( sLangId === 'ar' ) {
		document.body.classList.add('rtl');
	} else {
		document.body.classList.remove('rtl');
	}

	var aElements = document.querySelectorAll('.i18n');
	aElements.forEach(function(oEl) {
		var sLangKey = oEl.dataset.langid;
		if( sLangKey ) {
			var sLangValue = getLang(sLangKey);
			if( sLangValue ) {
				oEl.innerHTML = sLangValue;
			}
		}
	});

}

function getDeviceLang() {

	try {
		if( sDeviceFamily === 'LG' && window.PalmSystem && window.PalmSystem.country ) {
			var aDeviceCountry = JSON.parse(window.PalmSystem.country);
			if( aDeviceCountry && aDeviceCountry['country'] ) {
				switch( aDeviceCountry['country'] ) {
					case 'CZE':
						return 'cs';
					case 'DEU':
					case 'AUT':
					case 'CHE':
					case 'SUI':
						return 'de';
					case 'DNK':
					case 'DAN':
					case 'DEN':
						return 'da';
					case 'ESP':
					case 'MEX':
						return 'es';
					case 'FRA':
					case 'FXX':
						return 'fr';
					case 'FIN':
						return 'fi';
					case 'GEO':
						return 'ka';
					case 'GRC':
					case 'GRE':
					case 'ELL':
						return 'el';
					case 'HIN':
					case 'IND':
						return 'hi';
					case 'ITA':
						return 'it';
					case 'INA':
					case 'IDN':
						return 'id';
					case 'JPN':
						return 'ja';
					case 'PRK':
					case 'KOR':
					case 'ROK':
						return 'ko';
					case 'NED':
					case 'NLD':
						return 'nl';
					case 'NOR':
						return 'no';
					case 'POL':
						return 'pl';
					case 'POR':
					case 'PRT':
						return 'pt';
					case 'RUS':
						return 'ru';
					case 'ROU':
					case 'RUM':
					case 'ROM':
						return 'ro';
					case 'SLO':
					case 'SVN':
						return 'sl';
					case 'SVK':
						return 'sk';
					case 'SWE':
						return 'sv';
					case 'TUR':
						return 'tr';
					case 'UKR':
						return 'uk';
					case 'VIE':
					case 'VNM':
						return 'vi';
					case 'ZHO':
					case 'CHN':
						return 'zh';
					default:
						return 'en';
				}
			}
		} else if( window.navigator.language ) {
			var sDeviceLang = window.navigator.language;
			if( sDeviceLang.length == 5 ) {
				sDeviceLang = sDeviceLang.substr(0, 2);
			}

			if( sDeviceLang && isLangAllowed(sDeviceLang) ) {
				return sDeviceLang;
			}
		}
	} catch( e ) { console.log(e.message) }

	return 'en';

}