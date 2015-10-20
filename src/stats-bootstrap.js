/* global ScrumpyStatsGenerator */
(function() {
    // spin up stats generator
    let generator = new ScrumpyStatsGenerator();
    generator.go();

    // wire up print button
    document.querySelector("#print-button").addEventListener("click", () => window.print());
}());
