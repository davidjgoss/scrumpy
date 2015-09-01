"use strict";
(function() {
    if (chrome && chrome.webstore) {
        if (!document.documentElement.classList.contains("is-installed")) {
            document.getElementById("js-install-button").addEventListener("click", function(e) {
                e.preventDefault();
                chrome.webstore.install("", function() {
                    document.documentElement.classList.remove("can-install");
                    document.documentElement.classList.add("is-installed");
                });
            });
            document.documentElement.classList.add("can-install");
        }
    }
}());