(function() {
    "use strict";
    if (chrome && chrome.webstore) {
        document.getElementById("js-install-button").addEventListener("click", function(e) {
            e.preventDefault();
            chrome.webstore.install("", function() {
                document.body.classList.remove("can-install");
                document.body.classList.add("is-installed");
            });
        });
        document.body.classList.add("can-install");
    }
}());