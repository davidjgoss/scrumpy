class ScrumpyTrelloAgent {
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
        let menuSelector = this.selectors.MENU,
            listSelector = this.selectors.LIST;
        return new Promise(function(resolve) {
            function checkForBoardUI() {
                if (document.querySelector(menuSelector) && document.querySelector(listSelector)) {
                    resolve();
                } else {
                    window.setTimeout(checkForBoardUI, 100);
                }
            }
            checkForBoardUI();
        });
    }

    refresh() {
        if (this.timer) {
            window.clearTimeout(this.timer);
        }

        if (this.isBoard()) {
            this.waitForBoardUI().then(function() {
                this.refreshBoard();
                this.timer = window.setTimeout(this.refresh.bind(this), 3000);
            }.bind(this));
        } else {
            this.timer = window.setTimeout(this.refresh.bind(this), 1000);
        }
    }

    setConstants() {
        this.selectors = {
            "BOARD_NAME": ".board-header-btn-text",
            "MENU": ".js-open-add-menu",
            "LIST": ".js-list",
            "LIST_TITLE": ".js-list-name",
            "CARD": ".list-card",
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
        let statsButton = document.createElement("a");

        statsButton.href = "#";
        statsButton.id = "js-scrumpy-stats-button";
        statsButton.className = "header-btn";
        statsButton.innerHTML = "<span class='header-btn-text'>Stats</span>";
        statsButton.addEventListener("click", e => {
            e.preventDefault();
            this.refresh();
            this.doStats();
        });

        return statsButton;
    }

    checkStatsButton() {
        if (!this.hasStatsButton()) {
            let headerNode = document.querySelector(this.selectors.MENU);
            headerNode.parentNode.insertBefore(this.createStatsButton(), headerNode);
        }
    }

    getListTotalsNode(list) {
        let totalsNode = list.querySelector(".js-scrumpy-totals");
        if (!totalsNode) {
            totalsNode = document.createElement("span");
            totalsNode.className = "js-scrumpy-totals";
            list.querySelector(this.selectors.LIST_TITLE).appendChild(totalsNode);
        }
        return totalsNode;
    }

    refreshBoard() {
        let lists = document.querySelectorAll(this.selectors.LIST);

        for (let list of lists) {
            this.refreshListTotals(list);
        }

        if (lists.length >= 3) {
            this.checkStatsButton();
        }
    }

    refreshListTotals(list) {
        let cards = list.querySelectorAll(this.selectors.CARD),
            estimateTotal = 0,
            actualTotal = 0;

        for (let card of cards) {
            let cardData = this.parseCardData(card);
            if (cardData.estimate !== "none") {
                estimateTotal += cardData.estimate;
            }
            if (cardData.actual !== "none") {
                actualTotal += cardData.actual;
            }
        }

        this.updateListTotals(list, estimateTotal, actualTotal);
    }

    updateListTotals(list, estimateTotal, actualTotal) {
        estimateTotal = this.getAmountAsNumber(estimateTotal);
        actualTotal = this.getAmountAsNumber(actualTotal);
        list.setAttribute("data-scrumpy-estimate", estimateTotal);
        list.setAttribute("data-scrumpy-actual", actualTotal);
        this.getListTotalsNode(list).textContent = ` (${estimateTotal}) {${actualTotal}}`;
    }

    parseCardData(card) {
        let titleNode = card.querySelector(this.selectors.CARD_TITLE),
            labelsNode = card.querySelector(this.selectors.CARD_LABELS);
        card.setAttribute("data-scrumpy-name", this.extractCardName(titleNode));
        card.setAttribute("data-scrumpy-estimate", this.extractCardEstimate(titleNode));
        card.setAttribute("data-scrumpy-actual", this.extractCardActual(titleNode));
        card.setAttribute("data-scrumpy-labels", this.extractCardLabels(labelsNode));

        return this.getCardData(card);
    }

    extractCardLabels(labelsNode) {
        return Array.prototype.map.call(labelsNode.querySelectorAll(this.selectors.LABEL), labelNode => {
            return labelNode.textContent;
        }).join(",");
    }

    extractCardName(titleNode) {
        return titleNode.textContent
            .replace(/\((\d+\.*\d*)\)|{(\d+\.*\d*)\}/g, "") // remove the estimates and actuals
            .trim(); // remove whitespace
    }

    extractCardEstimate(titleNode) {
        let matches = titleNode.textContent.match(this.patterns.CARD_ESTIMATE);
        if (matches && matches.length > 1 && !isNaN(Number(matches[1]))) {
            return Number(matches[1]);
        }
        return "none";
    }

    extractCardActual(titleNode) {
        let matches = titleNode.textContent.match(this.patterns.CARD_ACTUAL);
        if (matches && matches.length > 1 && !isNaN(Number(matches[1]))) {
            return Number(matches[1]);
        }
        return "none";
    }

    getCardData(card) {
        return {
            "name": card.getAttribute("data-scrumpy-name"),
            "estimate": this.getAmountAsNumber(card.getAttribute("data-scrumpy-estimate")),
            "actual": this.getAmountAsNumber(card.getAttribute("data-scrumpy-actual"))
        }
    }

    getAmountAsNumber(value) {
        return isNaN(Number(value)) ? "none" : Math.ceil(Number(value) * 100) / 100;
    }

    getCardsData(list) {
        let cards = list.querySelectorAll(this.selectors.CARD);
        return Array.prototype.map.call(cards, this.getCardData.bind(this));
    }

    getBoardName() {
        return document.querySelector(this.selectors.BOARD_NAME).textContent;
    }

    doStats() {
        let lists = document.querySelectorAll(this.selectors.LIST);

        this.getStatsParameters().then(userInput => {
            this.launchStatsPage({
                userInput,
                pending: this.getListData(lists[0]),
                inflight: this.getListData(lists[1]),
                done: this.getListData(lists[2]),
                boardName: this.getBoardName()
            });
        }).catch(() => {
            // user cancelled - no action to take
        });
    }

    getBoardId() {
        return this.extractBoardIdFromPath(window.location.pathname);
    }

    extractBoardIdFromPath(path) {
        return path.match(/^\/b\/([\w\d]*)\/.*/)[1]
    }

    fixStartDate(date) {
        let dateMoment = moment(date);
        if (dateMoment.isoWeekday() > 5) {
            dateMoment = moment(dateMoment).startOf("isoweek").add(7, "days");
        }
        return dateMoment.format("YYYY-MM-DD");
    }

    getStatsParameters() {
        let boardId = this.getBoardId(), dialogPromise;
        dialogPromise = new Promise(function(resolve, reject) {
            chrome.storage.sync.get(boardId, savedData => {
                let dialog = this.buildParametersDialog(boardId, savedData);
                this.setupGoButton(dialog, resolve);
                this.setupCancelButton(dialog, reject);
                dialog.showModal();
            });
        }.bind(this));
        this.saveUserInput(dialogPromise, boardId);
        return dialogPromise;
    }

    setupGoButton(dialog, callback) {
        dialog.querySelector("button[type=submit]").addEventListener("click", e => {
            e.preventDefault();

            dialog.close();
            callback({
                duration: ~~(dialog.querySelector("#scrumpy-duration").value),
                startDate: this.fixStartDate(dialog.querySelector("#scrumpy-startdate").value)
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
            duration: "10",
            startDate: moment().subtract(1, "days").format("YYYY-MM-DD")
        };
    }

    getStorageObject(key, data) {
        let obj = {};
        obj[key] = data;
        return obj;
    }

    extractStorageObject(boardId, data) {
        if (data[boardId]) {
            return data[boardId];
        }
        return this.getDefaultParameters();
    }

    buildParametersDialog(boardId, data) {
        let params = this.extractStorageObject(boardId, data),
            today = moment().format("YYYY-MM-DD"),
            dialog = document.createElement("dialog");

        dialog.className = "scrumpy-modal";
        dialog.innerHTML = `<form>
            <h4>Scrumpy Stats</h4>
            <label>
                Sprint Duration
                <input id="scrumpy-duration" value="${params.duration}" required="true" type="number" step="1" min="1" max="20" />
            </label>
            <label>
                Start Date
                <input id="scrumpy-startdate" value="${params.startDate}" required="true" type="date" max="${today}" />
            </label>

            <button class="primary confirm" type="submit">Go</button>
            <button class="negate" type="reset">Cancel</button>
        </form>`;

        return document.body.appendChild(dialog);
    }

    getListData(list) {
        return {
            estimate: Number(list.getAttribute("data-scrumpy-estimate")),
            actual: Number(list.getAttribute("data-scrumpy-actual")),
            cards: this.getCardsData(list)
        };
    }

    launchStatsPage(data) {
        chrome.runtime.sendMessage({
            service: "launchStatsPage",
            data: data
        });
    }
}