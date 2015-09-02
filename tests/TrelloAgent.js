describe("TrelloAgent tests", function() {
    var agent = new ScrumpyTrelloAgent();

    it("should get a numeric amount or 'none' from value", function() {
        var testFunction = agent.getAmountAsNumber;
        expect(testFunction("1")).toBe(1);
        expect(testFunction("2.5")).toBe(2.5);
        expect(testFunction("0")).toBe(0);
        expect(testFunction("none")).toBe("none");
        expect(testFunction("foo")).toBe("none");
    });

    it("should extract a board id from the url path", function() {
        expect(agent.extractBoardIdFromPath("/b/2aOkziAO/ui-team-sprint-6")).toBe("2aOkziAO");
    });

    it("should extract the card name from the dom node", function() {
        var testElement = document.createElement("span");
        testElement.innerHTML = "this should be the title (4) {3}";
        expect(agent.extractCardName(testElement)).toBe("this should be the title");
    });

    it("should extract 'none' as card estimate from the dom node", function() {
        var testElement = document.createElement("span");
        testElement.innerHTML = "this should be the title";
        expect(agent.extractCardEstimate(testElement)).toBe("none");
    });

    it("should extract an integer card estimate from the dom node", function() {
        var testElement = document.createElement("span");
        testElement.innerHTML = "this should be the title (4) {3}";
        expect(agent.extractCardEstimate(testElement)).toBe(4);
    });

    it("should extract a decimal card estimate from the dom node", function() {
        var testElement = document.createElement("span");
        testElement.innerHTML = "this should be the title (5.5) {2.5}";
        expect(agent.extractCardEstimate(testElement)).toBe(5.5);
    });

    xit("should extract a time-style card estimate from the dom node", function() {
        var testElement = document.createElement("span");
        testElement.innerHTML = "this should be the title (5:30) {2:30}";
        expect(agent.extractCardEstimate(testElement)).toBe(5.5);
    });

    it("should extract 'none' as card actual from the dom node", function() {
        var testElement = document.createElement("span");
        testElement.innerHTML = "this should be the title";
        expect(agent.extractCardActual(testElement)).toBe("none");
    });

    it("should extract an integer card actual from the dom node", function() {
        var testElement = document.createElement("span");
        testElement.innerHTML = "this should be the title (4) {3}";
        expect(agent.extractCardActual(testElement)).toBe(3);
    });

    it("should extract a decimal card actual from the dom node", function() {
        var testElement = document.createElement("span");
        testElement.innerHTML = "this should be the title (5.5) {2.5}";
        expect(agent.extractCardActual(testElement)).toBe(2.5);
    });

    xit("should extract a time-style card actual from the dom node", function() {
        var testElement = document.createElement("span");
        testElement.innerHTML = "this should be the title (5:30) {2:30}";
        expect(agent.extractCardActual(testElement)).toBe(2.5);
    });
});