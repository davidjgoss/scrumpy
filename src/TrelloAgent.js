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
        let menuSelector = this.selectors.menu,
            listSelector = this.selectors.list;
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
            "boardName": ".board-header-btn-text",
            "menu": ".js-open-add-menu",
            "list": ".js-list",
            "listTitle": ".js-list-name",
            "card": ".js-card-name",
            "cardId": ".card-short-id"
        };
        this.patterns = {
            "cardEstimate": /.+\((\d+\.*\d*)\)/,
            "cardActual": /.+\{(\d+\.*\d*)\}/
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
            let headerNode = document.querySelector(this.selectors.menu);
            headerNode.parentNode.insertBefore(this.createStatsButton(), headerNode);
        }
    }

    getListTotalsNode(list) {
        let totalsNode = list.querySelector(".js-scrumpy-totals");
        if (!totalsNode) {
            totalsNode = document.createElement("span");
            totalsNode.className = "js-scrumpy-totals";
            list.querySelector(this.selectors.listTitle).appendChild(totalsNode);
        }
        return totalsNode;
    }

    refreshBoard() {
        let lists = document.querySelectorAll(this.selectors.list);

        for (let list of lists) {
            this.refreshListTotals(list);
        }

        if (lists.length >= 3) {
            this.checkStatsButton();
        }
    }

    refreshListTotals(list) {
        let cards = list.querySelectorAll(this.selectors.card),
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
        list.setAttribute("data-scrumpy-estimate", estimateTotal);
        list.setAttribute("data-scrumpy-actual", actualTotal);
        this.getListTotalsNode(list).textContent = ` (${estimateTotal}) {${actualTotal}}`;
    }

    extractCardName(card) {
        let shortId = card.querySelector(this.selectors.cardId).textContent;
        return card.textContent
            .replace(shortId, "") // remove the identifier from the start
            .replace(/\((\d+\.*\d*)\)|{(\d+\.*\d*)\}/g, "") // remove the estimates and actuals
            .trim(); // remove whitespace
    }

    parseCardData(card) {
        card.setAttribute("data-scrumpy-name", this.extractCardName(card));
        card.setAttribute("data-scrumpy-estimate", this.extractCardEstimate(card));
        card.setAttribute("data-scrumpy-actual", this.extractCardActual(card));

        return this.getCardData(card);
    }

    extractCardEstimate(card) {
        let matches = card.textContent.match(this.patterns.cardEstimate);
        if (matches && matches.length > 1 && !isNaN(Number(matches[1]))) {
            return Number(matches[1]);
        }
        return "none";
    }

    extractCardActual(card) {
        let matches = card.textContent.match(this.patterns.cardActual);
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
        return isNaN(Number(value)) ? "none" : Number(value);
    }

    getCardsData(list) {
        let cards = list.querySelectorAll(this.selectors.card);
        return Array.prototype.map.call(cards, this.getCardData.bind(this));
    }

    getBoardName() {
        return document.querySelector(this.selectors.boardName).textContent;
    }

    doStats() {
        let lists = document.querySelectorAll(this.selectors.list);

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
                duration: Number(dialog.querySelector("#scrumpy-duration").value),
                startDate: dialog.querySelector("#scrumpy-startdate").value
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