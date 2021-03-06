class ScrumpyTrelloAgent { /* eslint no-unused-vars: 0 */
    constructor() {
        this.setConstants();
    }

    go() {
        this.refresh();
    }

    isBoard() {
        return !!this.checkForBoardPath(window.location.pathname);
    }

    checkForBoardPath(path) {
        return path.match(/^\/b\/[\w\d]*\/.*/);
    }

    waitForBoardUI() {
        return new Promise((resolve) => {
            function checkForBoardUI() {
                if (document.querySelector(this.selectors.MENU) && document.querySelector(this.selectors.LIST)) {
                    resolve();
                } else {
                    window.setTimeout(() => checkForBoardUI.call(this), 100);
                }
            }
            checkForBoardUI.call(this);
        });
    }

    refresh() {
        if (this.timer) {
            window.clearTimeout(this.timer);
        }

        if (this.isBoard()) {
            this.waitForBoardUI().then(() => {
                this.calculateBoard();
                this.checkStatsButton();
                this.timer = window.setTimeout(() => this.refresh(), 3000);
            });
        } else {
            this.timer = window.setTimeout(() => this.refresh(), 1000);
        }
    }

    setConstants() {
        this.selectors = {
            "BOARD_NAME": ".board-header-btn-text",
            "MENU": ".js-open-add-menu",
            "LIST": ".js-list.list-wrapper",
            "LIST_TITLE": ".js-list-name-input",
            "CARD": ".list-card",
            "CARD_COMPOSER": ".list-card-composer-textarea",
            "CARD_TITLE": ".js-card-name",
            "CARD_LABELS": ".js-card-labels",
            "LABEL": ".card-label"
        };
        this.patterns = {
            "CARD_ESTIMATE": /.+\((\d+\.*\d*)\)/,
            "CARD_ACTUAL": /.+\{(\d+\.*\d*)\}/
        };
    }

    hasStatsButton() {
        return !!document.querySelector("#js-scrumpy-stats-button");
    }

    createStatsButton() {
        const statsButton = document.createElement("a");
        statsButton.href = "#";
        statsButton.id = "js-scrumpy-stats-button";
        statsButton.className = "header-btn";
        statsButton.innerHTML = "<span class='header-btn-text'>Stats</span>";
        statsButton.addEventListener("click", e => {
            e.preventDefault();
            this.doStats();
        });
        return statsButton;
    }

    checkStatsButton() {
        if (!this.hasStatsButton()) {
            const headerNode = document.querySelector(this.selectors.MENU);
            headerNode.parentNode.insertBefore(this.createStatsButton(), headerNode);
        }
    }

    getListTotalsNode(list) {
        let totalsNode = list.querySelector(".js-scrumpy-totals");
        if (!totalsNode) {
            totalsNode = document.createElement("span");
            totalsNode.className = "js-scrumpy-totals";
            const titleNode = list.querySelector(this.selectors.LIST_TITLE);
            titleNode.parentNode.insertBefore(totalsNode, titleNode.nextElementSibling);
        }
        return totalsNode;
    }

    calculateBoard() {
        const lists = document.querySelectorAll(this.selectors.LIST),
            listsData = Array.prototype.map.call(lists, list => this.getListData(list));

        return {
            "boardName": this.getBoardName(),
            "labels": this.getAllLabels(listsData),
            "pending": listsData[0],
            "inflight": listsData[1],
            "done": listsData[2]
        };
    }

    getListData(list) {
        const cards = list.querySelectorAll(this.selectors.CARD),
            cardsData = Array.prototype.map.call(cards, card => this.getCardData(card)).filter(x => !!x);
        let estimateTotal = 0, actualTotal = 0;

        for (const cardData of cardsData) {
            estimateTotal += cardData.estimate !== "none" ? cardData.estimate : 0;
            actualTotal += cardData.actual !== "none" ? cardData.actual : 0;
        }

        this.renderListTotals(list, estimateTotal, actualTotal);

        return {
            "estimate": this.getAmountAsNumber(estimateTotal),
            "actual": this.getAmountAsNumber(actualTotal),
            "cards": cardsData
        };
    }

    getAllLabels(listsData) {
        let rawArray = [];
        for (const listData of listsData) {
            for (const cardData of listData.cards) {
                // add the list of labels from each card to the array, but filter out falsy ones first
                rawArray = rawArray.concat(cardData.labels.filter(label => !!label));
            }
        }
        // transforming to a set and back to an array to remove duplicates
        return [...new Set(rawArray)];
    }

    renderListTotals(list, estimateTotal, actualTotal) {
        this.getListTotalsNode(list).innerHTML = `(${this.getAmountAsNumber(estimateTotal)}) {${this.getAmountAsNumber(actualTotal)}}`;
    }

    getCardData(card) {
        if (card.querySelector(this.selectors.CARD_COMPOSER)) {
            return null;
        }
        return {
            "name": this.extractCardName(card),
            "labels": this.extractCardLabels(card),
            "estimate": this.extractCardEstimate(card),
            "actual": this.extractCardActual(card)
        };
    }

    extractCardName(card) {
        const titleNode = card.querySelector(this.selectors.CARD_TITLE);
        return titleNode.textContent
            .replace(/\((\d+\.*\d*)\)|{(\d+\.*\d*)\}/g, "") // remove the estimates and actuals
            .trim(); // remove whitespace
    }

    extractCardLabels(card) {
        const labelsNode = card.querySelector(this.selectors.CARD_LABELS);
        return Array.prototype.map.call(labelsNode.querySelectorAll(this.selectors.LABEL), labelNode => {
            return labelNode.textContent;
        });
    }

    extractCardEstimate(card) {
        const titleNode = card.querySelector(this.selectors.CARD_TITLE);
        if (titleNode) {
            const matches = titleNode.textContent.match(this.patterns.CARD_ESTIMATE);
            if (matches && matches.length > 1 && !isNaN(Number(matches[1]))) {
                return Number(matches[1]);
            }
        }
        return "none";
    }

    extractCardActual(card) {
        const titleNode = card.querySelector(this.selectors.CARD_TITLE);
        if (titleNode) {
            const matches = titleNode.textContent.match(this.patterns.CARD_ACTUAL);
            if (matches && matches.length > 1 && !isNaN(Number(matches[1]))) {
                return Number(matches[1]);
            }
        }
        return "none";
    }

    getAmountAsNumber(value) {
        return isNaN(Number(value)) ? "none" : Math.ceil(Number(value) * 100) / 100;
    }

    getBoardName() {
        return document.querySelector(this.selectors.BOARD_NAME).textContent;
    }

    doStats() {
        let data = this.calculateBoard();

        this.getStatsParameters(data).then(userInput => {
            this.launchStatsPage(Object.assign(data, {userInput}));
        }).catch(() => {
            // user cancelled - no action to take
        });
    }

    getBoardId() {
        return this.extractBoardIdFromPath(window.location.pathname);
    }

    extractBoardIdFromPath(path) {
        return path.match(/^\/b\/([\w\d]*)\/.*/)[1];
    }

    fixDuration(value) {
        return ~~value;
    }

    fixStartDate(date) {
        let dateMoment = moment(date);
        if (dateMoment.isoWeekday() > 5) {
            dateMoment = moment(dateMoment).startOf("isoweek").add(7, "days");
        }
        return dateMoment.format("YYYY-MM-DD");
    }

    getStatsParameters(data) {
        const boardId = this.getBoardId();
        const dialogPromise = new Promise((resolve, reject) => {
            chrome.storage.sync.get(boardId, savedParams => {
                const dialog = this.buildParametersDialog(boardId, savedParams, data);
                this.setupGoButton(dialog, resolve);
                this.setupCancelButton(dialog, reject);
                dialog.showModal();
            });
        });
        this.saveUserInput(dialogPromise, boardId);
        return dialogPromise;
    }

    setupGoButton(dialog, callback) {
        dialog.querySelector("button[type=submit]").addEventListener("click", e => {
            e.preventDefault();

            dialog.close();
            callback({
                duration: this.fixDuration(dialog.querySelector("#scrumpy-duration").value),
                startDate: this.fixStartDate(dialog.querySelector("#scrumpy-startdate").value),
                interferenceLabel: dialog.querySelector("#scrumpy-interference").value
            });
        });
    }

    setupCancelButton(dialog, callback) {
        dialog.querySelector("button[type=reset]").addEventListener("click", e => {
            e.preventDefault();

            dialog.close();
            callback();
        });
    }

    saveUserInput(dialogPromise, boardId) {
        dialogPromise.then(data => {
            if (data) {
                chrome.storage.sync.set(this.getStorageObject(boardId, data));
            }
        }).catch(() => {
            // user cancelled - no action to take
        });
    }

    getDefaultParameters() {
        return {
            "duration": "10",
            "startDate": moment().subtract(1, "days").format("YYYY-MM-DD"),
            "interferenceLabel": ""
        };
    }

    getStorageObject(key, data) {
        return {
            [key]: data
        };
    }

    extractStorageObject(boardId, data) {
        if (data[boardId]) {
            return data[boardId];
        }
        return this.getDefaultParameters();
    }

    buildParametersDialog(boardId, savedParams, data) {
        const params = this.extractStorageObject(boardId, savedParams),
            today = moment().format("YYYY-MM-DD"),
            dialog = document.createElement("dialog");

        dialog.className = "scrumpy-modal";
        dialog.innerHTML = `<form>
            <h4>Scrumpy Stats</h4>
            <label>
                Sprint Duration
                <input id="scrumpy-duration" value="${params.duration || ""}" required="true" type="number" step="1" min="1" max="20" />
            </label>
            <label>
                Start Date
                <input id="scrumpy-startdate" value="${params.startDate || ""}" required="true" type="date" max="${today}" />
            </label>
            <label>
                "Interference" Label
                <input id="scrumpy-interference" value="${params.interferenceLabel || ""}" type="text" list="scrumpy-labels" />
            </label>
            <datalist id="scrumpy-labels">${this.buildLabelOptions(data.labels)}</datalist>
            <button class="primary confirm" type="submit">Go</button>
            <button class="negate" type="reset">Cancel</button>
        </form>`;

        return document.body.appendChild(dialog);
    }

    buildLabelOptions(labels) {
        let markup = "";
        for (const label of labels) {
            markup += `<option>${label}</option>`;
        }
        return markup;
    }

    launchStatsPage(data) {
        chrome.runtime.sendMessage({
            service: "launchStatsPage",
            data: data
        });
    }
}
