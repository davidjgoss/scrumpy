"use strict";
(function() {
    document.querySelector("#js-logo-img").addEventListener("click", function() {
        this.classList.add("logo__img--crazy");
    });
}());