// chrome.storage.sync.clear()
// chrome.alarms.clearAll();

// main storage item
let allNames = {};
let validTitles = {};
const mangaInfo = {
    urls: [],
    latestChapter: 0,
    lastUpdated: false,
    lastQueried: false
};

//alarm info
let alarmTimeDays = 0;
let alarmTime = false;
let period = false;

//obtain manga name & form data
const mangaNames = document.getElementById("mangaName");
const addForm = document.getElementById('inputManga');
const editForm = document.getElementById('mangaEdits');
const delForm = document.getElementById('mangaDelete');
const recordedList = document.getElementById('recordedNames');
const editTitles = document.getElementById('currentTitlesEdit');
const delTitles = document.getElementById('currentTitlesDelete');
const validDates = {
    '': new Date().getDay(),
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
}
const validUpdateOptions = ['', 'Daily', 'Weekly', 'Bi-weekly', 'Monthly'];
const validDomains = ['manga4life', 'mangakakalot', 'webtoons'];
const timeDates = {
    '3:00am': 3,
    '6:00am': 6,
    '9:00am': 9,
    '12:00pm': 12,
    '3:00pm': 15,
    '6:00pm': 18,
    '9:00pm': 21,
    '12:00am': 0,
    '12:00': 12,
    '3:00': 15,
    '6:00': 18,
    '9:00': 21,
    '': 12,
    'am': 0,
    'pm': 12
};
const userUpdates = {
    '': 60 * 24,
    'Daily': 60 * 24,
    'Weekly': 60 * 24 * 7,
    'Bi-weekly': 60 * 24 * 7 * 2,
    'Monthly': 60 * 24 * 7 * 4
}
let urlInfo = '';
let chapterInfo = 0;
let mangaCount = 0; // displays a number based on new manga chapter released

// check for saved data
chrome.storage.sync.get("allTitles", (data) => {
    if (data !== undefined) {
        allNames = { ...data.allTitles };
        console.log(allNames)
        const allNamesArray = Object.keys(allNames);
        createSavedTitleOptions(allNamesArray, recordedList);
        createSavedTitleOptions(allNamesArray, editTitles);
        createSavedTitleOptions(allNamesArray, delTitles);
    };
});


chrome.storage.sync.get("validUpdates", (titles) => {
    if (titles !== undefined) {
        validTitles = { ...titles.validUpdates };
        console.log(validTitles);
        recentManga(allNames, validTitles)
        updatePopupStart(validTitles, allNames)
    }
    chrome.action.setBadgeText({ text: String(mangaCount) });
});
// get url from content-script
window.addEventListener('DOMContentLoaded', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (validDomains.includes(getDom(tabs[0].url))) {
            chrome.tabs.sendMessage(tabs[0].id, { search: "url", item: "chapter" }, (response) => {
                if (response !== undefined && response.newChapter) {
                    document.getElementById('weebUrl').value = response.site;
                    urlInfo = response.site;
                    chapterInfo = response.newChapter; // check if chapter is the same;
                }
            });
        }
    });
})


//initialization functions
function displayArchieve() {
    const archieve = document.getElementById("archieveMain");
    const archieveHead = document.getElementById("archieveTop");
    if (archieveHead.style.display === "none") {
        archieve.style.display = "inline-block";
        archieveHead.style.display = "flex";
        if (archieve.childNodes.length <= 3) {
            updateArchieve(archieve, allNames, validTitles)
        }
    } else {
        archieveHead.style.display = "none";
    }
}

function diffMonths(popupDate, mangaInfo) {
    return parseInt(popupDate.slice(0, 2)) > parseInt(mangaInfo.lastUpdated.slice(0, 2))
}

function updateScrollText(manga, mangaInfo, titlesDictionary) {
    const recentLink = document.createElement('a');
    recentLink.id = 'recent-' + String(manga);
    recentLink.href = titlesDictionary[manga][0];
    recentLink.textContent = String(manga) + ' Chp.' + String(mangaInfo.latestChapter) + ', ';
    recentLink.target = "_blank";
    return recentLink
}

function appendRecentManga(mangaList, scrollText) {
    mangaList.forEach((anchor) => {
        if (scrollText.childNodes.length < 3) {
            scrollText.appendChild(anchor)
        }
    })
}

function recentManga(archieveDictionary, titlesDictionary) {
    const scrollText = document.getElementById('recent-manga-text');
    const mangaList = [];
    Object.keys(archieveDictionary).forEach((manga) => {
        const mangaInfo = archieveDictionary[manga];
        if (mangaInfo.lastUpdated !== false) {
            const popupDate = createDate();
            const currentDate = parseInt(popupDate.slice(3, 5));
            const updateDate = parseInt(mangaInfo.lastUpdated.slice(3, 5));
            if (diffMonths(popupDate, mangaInfo)) {
                const updateMonth = parseInt(daysInMonth(mangaInfo.lastUpdated.slice(6, 10), mangaInfo.lastUpdated.slice(0, 2)));
                if (currentDate + updateMonth - updateDate < 4) {
                    const recentLink = updateScrollText(manga, titlesDictionary);
                    mangaList.push(recentLink);
                }
            }
            else if (currentDate - updateDate < 4) {
                scrollText.textContent = '';
                const recentLink = updateScrollText(manga, mangaInfo, titlesDictionary)
                mangaList.push(recentLink);
            }
        }
    })
    appendRecentManga(mangaList, scrollText);
}

function updateArchieve(htmlArchieve, mainStorage, validUpdates) { // add new param for edits?
    if (Object.keys(mainStorage).length <= 0) {
        document.getElementById("baseMessage").textContent = 'Add To Your Collection Now!';
    } else {
        Object.keys(mainStorage).sort().forEach((title) => {
            if (document.getElementById(title + 'archieve') !== null) {
                checkArchieve(title, validUpdates)
            } else {
                const archieveItems = addToArchieve(title, mainStorage, validUpdates);
                htmlArchieve.appendChild(archieveItems);
            }
        })
    }
}

function updatePopupStart(titlesDictionary, archieveDictionary) {
    Object.keys(titlesDictionary).forEach((manga) => {
        const mangaInfo = archieveDictionary[manga];
        if (mangaInfo.lastUpdated !== false && validCurrentUpdates(manga, mangaInfo, titlesDictionary)) {
            const webUrl = titlesDictionary[manga][0];
            if (validDomains.includes(getDom(webUrl))) {
                popupRecentUpdates(webUrl, manga, newest)
            }
        }
    })
    updateBadge(mangaCount);
}

// user input html
document.getElementById('userManga').addEventListener("click", displayArchieve);
const archieve = document.getElementById("archieveMain");
const mangaModal = document.getElementById("addMangaModal");
const addBtn = document.getElementById("addManga");
const spanAdd = document.getElementsByClassName("close")[0];
const editMenu = document.getElementById('editMangaModal');
const editBtn = document.getElementById('editArchieve');
const spanEdit = document.getElementsByClassName('close')[1];
const delMenu = document.getElementById('deleteMangaModal');
const deleteBtn = document.getElementById("deleteArchieve");
const spanDel = document.getElementsByClassName('close')[2];
let checkEditInterval = false;

addBtn.onclick = () => {
    mangaModal.style.display = "block";
}

editBtn.onclick = () => {
    editMenu.style.display = "block";
    let previousEdit = false;
    checkEditInterval = setInterval(function checkEdit() {
        const titles = Object.keys(allNames);
        const mangaToEdit = document.getElementById('titles').value;
        const urlsToEdit = document.getElementById('remove');
        if (titles.includes(mangaToEdit)) {
            const editTitleUrls = allNames[mangaToEdit].urls;
            if (urlsToEdit.childNodes.length <= 1) {
                previousEdit = mangaToEdit;
                addUrlsToRemove(editTitleUrls, urlsToEdit);
            } else if (previousEdit !== mangaToEdit) {
                previousEdit = mangaToEdit
                while (urlsToEdit.hasChildNodes()) {
                    urlsToEdit.removeChild(urlsToEdit.firstChild);
                }
                addUrlsToRemove(editTitleUrls, urlsToEdit);
            }
        }
    }, 100)
}

deleteBtn.onclick = () => {
    delMenu.style.display = "block";
}

spanAdd.onclick = () => {
    mangaModal.style.display = "none";
}

spanEdit.onclick = () => {
    editMenu.style.display = "none";
    if (checkEditInterval !== false) {
        stopInterval(checkEditInterval)
    }
}

spanDel.onclick = () => {
    delMenu.style.display = "none";
}

window.onclick = (event) => {
    if (event.target === mangaModal) {
        mangaModal.style.display = "none";
    } else if (event.target === editMenu) {
        editMenu.style.display = "none";
        if (checkEditInterval !== false) {
            stopInterval(checkEditInterval)
        }
    } else if (event.target === delMenu) {
        delMenu.style.display = "none";
    }
}

addForm.addEventListener('submit', (event) => {
    event.preventDefault(); //stop addForm from submitting and refreshing page
    const mangaTitle = mangaNames.value;
    // validate time
    if (validTimeInput() && validTitleInput(mangaTitle, urlInfo)) {
        createNewTitle(mangaTitle, urlInfo)
        createSavedTitleOptions([mangaTitle], recordedList);
        createSavedTitleOptions([mangaTitle], editTitles);
        createSavedTitleOptions([mangaTitle], delTitles);
    }
});

editForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const rename = document.getElementById('newTitle').value;
    const mangaToEdit = document.getElementById('titles').value;
    if (checkUserEdits(mangaToEdit, rename)) {
        renameTitle(mangaToEdit, rename, allNames, validTitles);
        removeFromArchieve(String(mangaToEdit));
        updateArchieve(archieve, allNames, validTitles);
    }
    editMenu.style.display = "none";
})

delForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const mangaToDel = document.getElementById('delete').value;
    if (checkSavedTitles(allNames, mangaToDel)) {
        alert('Title not found in Current Collection')
    } else {
        delTitle(mangaToDel, allNames, validTitles);
        updateArchieve(archieve, allNames, validTitles);
        removeFromArchieve(String(mangaToDel));
        alert('Title has been deleted :(. Reload Extension to View');
        delMenu.style.display = "none";
    }
})
