// helper function definitions
function checkSavedTitles(object, title) {
    return Object.keys(object).includes(title);
}

function checkUserEditsUrl(mangaToEdit, urlToRemove) {
    const removeIndex = allNames[mangaToEdit].urls.indexOf(urlToRemove);
    allNames[mangaToEdit].urls.splice(removeIndex, 1);
    if (checkSavedTitles(validTitles, mangaToEdit) && validTitles[mangaToEdit].includes(urlToRemove)) {
        const removeUpdateindex = validTitles[mangaToEdit].indexOf(urlToRemove);
        validTitles[mangaToEdit].splice(removeUpdateindex, 1);
    }
}

function checkUserEdits(mangaToEdit, rename) {
    const urlToRemove = document.getElementById('urlRemove').value;
    const regexWhitespace =  /^\s*$/;
    if (!checkSavedTitles(allNames, mangaToEdit)) {
        alert('Title not found in Current Collection')
        return false
    } else if (regexWhitespace.test(rename)) {
        alert('Improper New Name; suggesting "ChunChunMaru"');
        return false
    } if (allNames[mangaToEdit].urls.includes(urlToRemove)) {
        checkUserEditsUrl(mangaToEdit, urlToRemove)
    }
    return true
}

function removeFromArchieve(titleToRemove) {
    const titleElement = document.getElementById(titleToRemove + 'archieve');
    titleElement.remove();
    if (document.getElementById(titleToRemove) !== null) {
        document.getElementById(titleToRemove).remove();
    }
}

function addUrlsToRemove(urlList, dataList) {
    urlList.forEach((url) => {
        const savedUrl = document.createElement('option');
        savedUrl.value = url;
        dataList.appendChild(savedUrl);
    })
}

function createSavedTitleOptions(allTitleNames, listToBeAppended) {
    allTitleNames.forEach((savedManga) => {
        const newTitle = document.createElement('option');
        newTitle.value = savedManga;
        listToBeAppended.appendChild(newTitle)
    })
    return
}

function checkMangaLinks(manga, mangaLink) {
    const nodeList = document.getElementById(manga).childNodes
    nodeList.forEach((value) => {
        if (value.href === mangaLink) return false
    });
};

function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

function stopInterval(interval) {
    clearInterval(interval)
}

function renameTitle(currentName, newName, archieve, updates) {
    chrome.alarms.get(currentName, (alarm) => {
        chrome.alarms.create(
            newName, {
            when: alarm.scheduledTime, periodInMinutes: alarm.periodInMinutes
        });
    });
    chrome.alarms.clear(currentName);
    archieve[newName] = archieve[currentName];
    delete archieve[currentName];
    chrome.storage.sync.set({ allTitles: archieve });
    if (checkSavedTitles(updates, currentName)) {
        updates[newName] = updates[currentName];
        delete updates[currentName];
        chrome.storage.sync.set({ validUpdates: updates });
    }
}

function delTitle(currentName, archieve, updates) {
    chrome.alarms.clear(currentName);
    delete archieve[currentName];
    chrome.storage.sync.set({ allTitles: archieve }, () => {
    });
    if (checkSavedTitles(updates, currentName)) {
        delete updates[currentName];
        chrome.storage.sync.set({ validUpdates: updates }, () => {
        });
    }
}

function createDate() {
    let today = new Date();
    let hour = String(today.getHours());
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = today.getFullYear();
    if (hour.length < 2) {
        hour = '0' + hour;
    }
    today = mm + '/' + dd + '/' + yyyy + '/' + hour;
    return today
}

function getDom(url) {
    if (!(url.includes('chrome://'))) {
        let domain = '';
        let startIndex = url.indexOf("//") + 2;
        if (url.includes('www.')) {
            startIndex = url.indexOf('www.') + 4;
        }
        while (url[startIndex] !== '.') {
            domain = domain + url[startIndex];
            startIndex++;
        } return domain;
    }
    return false
};

function createArchieveTitle(title, mainStorage, validUpdates) {
    const manga = document.createElement('dt');
    manga.id = String(title) + 'archieve';
    manga.textContent = String(title) + ': Chpt. ' + String(mainStorage[title].latestChapter);
    if (checkSavedTitles(validUpdates, title) && validUpdates[title].length > 0) {
        const newestDom = document.createElement('a');
        newestDom.href = validUpdates[title][0];
        newestDom.target = "_blank";
        newestDom.textContent = ' @' + String(getDom(newestDom.href));
        manga.appendChild(newestDom);
    }
    return manga
};

function createArchieveDoms(title, mainStorage) {
    const domList = document.createElement('dd');
    domList.textContent = 'Saved Websites: ';
    domList.id = String(title) + 'urls';
    mainStorage[title].urls.forEach((url) => {
        const userUrl = document.createElement('a');
        userUrl.href = url;
        userUrl.textContent = String(getDom(url)) + ', ';
        userUrl.target = "_blank";
        domList.appendChild(userUrl);
    })
    return domList
}

function createArchieveTitleInfo(title, mainStorage) {
    const mangaInfo = document.createElement('dd');
    mangaInfo.textContent = 'Last Updated: ' + mainStorage[title].lastUpdated;
    mangaInfo.id = String(title) + 'update';
    return mangaInfo
}

function addToArchieve(title, mainStorage, validUpdates) {
    const manga = createArchieveTitle(title, mainStorage, validUpdates);
    const domList = createArchieveDoms(title, mainStorage);
    const mangaInfo = createArchieveTitleInfo(title, mainStorage)
    manga.appendChild(domList);
    manga.appendChild(mangaInfo);
    return manga
}

function validCurrentUpdates(manga, mangaInfo, titlesDictionary) {
    const currentDate = createDate();
    const readTime = parseInt(currentDate.slice(3, 5));
    const queriedDate = parseInt(mangaInfo.lastUpdated.slice(3, 5));
    return (titlesDictionary[manga].length > 0) && (queriedDate === readTime)
}

function createCurrentUpdateAnchor(recievedManga, webUrl, webDom) {
    const newestChapter = allNames[recievedManga].latestChapter;
    const currentUpdateAnchor = document.createElement('a');
    currentUpdateAnchor.id = recievedManga + '@' + String(webDom);
    currentUpdateAnchor.href = webUrl;
    currentUpdateAnchor.target = "_blank";
    currentUpdateAnchor.textContent = '@' + String(webDom) + ' Chpt. ' + String(newestChapter);
    return currentUpdateAnchor
}

function updateBadge(mangaCount) {
    if (mangaCount > 0) {
        chrome.action.setBadgeText({ text: String(mangaCount) });
    }
}

function checkArchieve(title, validUpdates) {
    const manga = document.getElementById(title + 'archieve');
    if (checkSavedTitles(validUpdates, title) && manga.firstChild.href !== validUpdates[title][0]) {
        manga.firstChild.href = validUpdates[title][0];
        manga.firstChild.textContent = ' @' + String(getDom(validUpdates[title][0]));
    }
}

function popupRecentUpdates(webUrl, manga) {
    document.getElementById('updateMessage').textContent = 'Daily Readings For Weebs';
    const recievedManga = String(manga);
    const webDom = getDom(webUrl);
    const mangaUpdate = document.getElementById('recent-updates');
    const currentUpdateAnchor = createCurrentUpdateAnchor(recievedManga, webUrl, webDom)
    if (document.getElementById(recievedManga) !== null && checkMangaLinks(recievedManga, webUrl)) { // change to [0] of array?
        document.getElementById(recievedManga).appendChild(currentUpdateAnchor);
        mangaCount++;
    } else {
        const mangaAlert = document.createElement('dt');
        mangaAlert.id = recievedManga;
        mangaAlert.textContent = recievedManga + ': ';
        mangaAlert.style.marginBottom = '2%';
        mangaAlert.appendChild(currentUpdateAnchor)
        mangaUpdate.appendChild(mangaAlert);
        mangaCount++
    };
}

function userAlarmInput(userDate, frequency) {
    if (frequency !== 'Daily' && frequency !== '') {
        const alarmDate = new Date().getDay();
        let dateholder = validDates[userDate];
        if (alarmDate > dateholder) {
            dateholder = dateholder + 7;
        }
        alarmTimeDays = 86400000 * (Math.abs(alarmDate - dateholder))
    }
}

function validTimeInput() {
    const userTime = document.getElementById('time').value + document.getElementById('ampm').value;
    const userDate = document.getElementById('date').value;
    const frequency = document.getElementById('frequency').value;
    // validate time
    if (!checkSavedTitles(timeDates, userTime)) {
        alert('Invalid Time Input');
        return false
    } else if (!checkSavedTitles(validDates, userDate) && !validUpdateOptions.includes(frequency)) {
        alert('Invalid Date/Frequency Input')
        return false
    }
    alarmTime = timeDates[userTime];
    period = userUpdates[frequency];
    userAlarmInput(userDate, frequency)
    return true
}

function createNewTitle(mangaTitle, urlInfo) {
    // add to manga collection & append manga to selected options
    allNames[mangaTitle] = { ...mangaInfo };
    allNames[mangaTitle].urls.push(urlInfo);
    allNames[mangaTitle].latestChapter = chapterInfo - 1;
    chrome.storage.sync.set({ allTitles: allNames }, () => {
        console.warn('Value is set to ', allNames);
    });
    // whenAlarm period
    const whenAlarm = new Date().setHours(alarmTime, 0, 0, 0) + alarmTimeDays;
    chrome.alarms.create(
        mangaTitle, {
        when: 2, periodInMinutes: 1
    }
    );
}

function validTitleInput(mangaTitle, urlInfo) {
    if (mangaTitle === '') {
        alert('Manga Name is invalid');
        return false
    } else if (!validDomains.includes(getDom(urlInfo))) {
        alert('Url is invalid')
        return false
    } else if (checkSavedTitles(allNames, mangaTitle)) { // if manga has already been used checker
        const currentUrls = allNames[mangaTitle].urls;
        if (currentUrls.includes(urlInfo)) {// checks if url has been added twice on accident
            alert('Url has already been added')
            return false
        } else {
            currentUrls.push(urlInfo);
            chrome.storage.sync.set({ allTitles: allNames }, () => {
                console.warn('Value is set to ', allNames);
            }); return false
        }
    }
    return true
}
