"use strict";
(function() {
    if (chrome && chrome.webstore) {
        if (!document.body.classList.contains("is-installed")) {
            document.getElementById("js-install-button").addEventListener("click", function(e) {
                e.preventDefault();
                chrome.webstore.install("", function() {
                    document.body.classList.remove("can-install");
                    document.body.classList.add("is-installed");
                });
            });
            document.body.classList.add("can-install");
        }
    }
}());