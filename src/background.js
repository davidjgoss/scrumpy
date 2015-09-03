(function() {
    class Background {
        constructor() {
            chrome.runtime.onMessage.addListener(this.handleRequest.bind(this));
        }

        handleRequest(request, sender, sendResponse) {
            this[request.service](request.data, sendResponse);
        }

        launchStatsPage(data) {
            this.data = data;
            chrome.tabs.create({
                url: "../stats.html"
            });
        }

        getStatsData(data, sendResponse) {
            sendResponse(this.data);
        }
    }

    return new Background();
}());
