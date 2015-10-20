describe("StatsGenerator tests", function() {
    var generator;

    beforeEach(function() {
        generator = new ScrumpyStatsGenerator();
        spyOn(generator, "isMorning").and.returnValue(false);
        spyOn(generator, "getToday").and.returnValue(moment("2015-08-21"));
    });

    afterEach(function() {
        generator = null;
    });

    it("should get the following monday from a weekend day", function() {
        expect(generator.getNextMonday("2015-08-22").format("YYYY-MM-DD")).toBe("2015-08-24");
        expect(generator.getNextMonday("2015-08-23").format("YYYY-MM-DD")).toBe("2015-08-24");
    });

    it("should get the previous friday from a weekend day", function() {
        expect(generator.getLastFriday("2015-08-22").format("YYYY-MM-DD")).toBe("2015-08-21");
        expect(generator.getLastFriday("2015-08-23").format("YYYY-MM-DD")).toBe("2015-08-21");
    });

    it("should correctly decide whether the sprint has decided based on now and start date", function() {
        expect(generator.hasStarted(moment("2015-08-20"))).toBeTruthy();
        expect(generator.hasStarted(moment("2015-08-21"))).toBeTruthy();
        expect(generator.hasStarted(moment("2015-08-22"))).toBeFalsy();
        generator.isMorning.and.returnValue(true);
        expect(generator.hasStarted(moment("2015-08-21"))).toBeFalsy();
    });

    it("should get the requested day of the sprint, excluding weekends", function() {
        expect(generator.getSprintDay("2015-08-20", 1).format("YYYY-MM-DD")).toBe("2015-08-20");
        expect(generator.getSprintDay("2015-08-20", 2).format("YYYY-MM-DD")).toBe("2015-08-21");
        expect(generator.getSprintDay("2015-08-20", 3).format("YYYY-MM-DD")).toBe("2015-08-24");
        expect(generator.getSprintDay("2015-08-20", 4).format("YYYY-MM-DD")).toBe("2015-08-25");
    });

    it("should calculate the sprint end date", function() {
        // one weekday
        expect(moment("2015-08-20").isSame(generator.getEndDate("2015-08-20", 1))).toBeTruthy();
        // a few weekdays
        expect(moment("2015-08-21").isSame(generator.getEndDate("2015-08-17", 5))).toBeTruthy();
        // two weeks, starting and ending on weekdays
        expect(moment("2015-09-02").isSame(generator.getEndDate("2015-08-20", 10))).toBeTruthy();
        // two weeks, starting on a weekend
        expect(moment("2015-08-28").isSame(generator.getEndDate("2015-08-16", 10))).toBeTruthy();
    });

    it("should calculate the date to report to for a historic sprint", function() {
        expect(moment("2014-08-22").isSame(generator.getReportDate("2014-08-11", 10))).toBeTruthy();
    });

    it("should report to today if running in the afternoon during sprint", function() {
        expect(moment("2015-08-21").isSame(generator.getReportDate("2015-08-17", 10))).toBeTruthy();
    });

    it("should report to friday if run at a weekend", function() {
        generator.getToday.and.returnValue(moment("2015-08-22"));
        expect(moment("2015-08-21").isSame(generator.getReportDate("2015-08-20", 10))).toBeTruthy();
        generator.getToday.and.returnValue(moment("2015-08-23"));
        expect(moment("2015-08-21").isSame(generator.getReportDate("2015-08-20", 10))).toBeTruthy();
    });

    it("should calculate the elapsed days of the sprint", function() {
        // historic sprint
        expect(generator.getElapsedDays("2014-08-11", 10)).toBe(10);
        // first day
        expect(generator.getElapsedDays("2015-08-21", 10)).toBe(1);
        // only weekdays elapsed
        expect(generator.getElapsedDays("2015-08-17", 10)).toBe(5);
        // weekdays and weekends elapsed
        expect(generator.getElapsedDays("2015-08-13", 10)).toBe(7);
        // last day
        expect(generator.getElapsedDays("2015-08-10", 10)).toBe(10);
        // saturday
        generator.getToday.and.returnValue(moment("2015-08-22"));
        expect(generator.getElapsedDays("2015-08-20", 10)).toBe(2);
        // sunday
        generator.getToday.and.returnValue(moment("2015-08-23"));
        expect(generator.getElapsedDays("2015-08-20", 10)).toBe(2);
    });

    it("should get elapsed days as 0 if run on morning of start date", function() {
        generator.isMorning.and.returnValue(true);
        expect(generator.getElapsedDays("2015-08-21", 10)).toBe(0);
    });

    it("should generate a single list of planned cards", function() {
        var testData = {
            pending: {
                cards: ["foo", "bar", "baz"]
            },
            inflight: {
                cards: ["tom", "dick", "harry"]
            },
            donePlanned: {
                cards: ["something"]
            }
        };
        expect(generator.getAllPlannedCards(testData).length).toBe(7);
    });

    it("should note that there were cards without estimates", function() {
        var testData = {
            userInput: {
                startDate: "2015-08-20"
            },
            pending: {
                cards: [{
                    estimate: 1,
                    actual: "none"
                }, {
                    estimate: "none",
                    actual: "none"
                }]
            },
            inflight: {
                cards: [{
                    estimate: 2,
                    actual: "none"
                }]
            },
            done: {
                cards: [{
                    estimate: 3,
                    actual: 2
                }, {
                    estimate: "none",
                    actual: 4
                }]
            },
            donePlanned: {
                cards: [{
                    estimate: 3,
                    actual: 2
                }, {
                    estimate: "none",
                    actual: 4
                }]
            }
        };
        expect(generator.getProblems(testData).length).toBe(1);
    });

    it("should note that there were done cards without actuals", function() {
        var testData = {
            userInput: {
                startDate: "2015-08-20"
            },
            pending: {
                cards: [{
                    estimate: 1,
                    actual: "none"
                }, {
                    estimate: 3,
                    actual: "none"
                }]
            },
            inflight: {
                cards: [{
                    estimate: 2,
                    actual: "none"
                }]
            },
            done: {
                cards: [{
                    estimate: 3,
                    actual: 2
                }, {
                    estimate: 3,
                    actual: "none"
                }]
            },
            donePlanned: {
                cards: [{
                    estimate: 3,
                    actual: 2
                }, {
                    estimate: 3,
                    actual: "none"
                }]
            }
        };
        expect(generator.getProblems(testData).length).toBe(1);
    });

    it("should calculate the initial sprint estimate", function() {
        var testData = {
            pending: {estimate: 100},
            inflight: {estimate: 10},
            donePlanned: {estimate: 30}
        };
        expect(generator.getInitialEstimate(testData)).toBe(140);
    });

    it("should include the board name in the page title", function() {
        var testData = {
            boardName: "Foo Bar"
        };
        expect(generator.getTitleContent(testData)).toBe("Stats for <b>Foo Bar</b>");
    });

    it("should calculate the amount of work done so far", function() {
        var testData = {
            userInput: {
                startDate: "2015-08-20"
            },
            pending: {},
            inflight: {},
            done: {
                cards: ["foo", "bar", "baz"],
                estimate: 10,
                actual: 8
            }
        };
        expect(generator.getAmountDone(testData)).toEqual({
            cards: 3,
            actual: 8
        });
        testData.userInput.startDate = "2016-08-20";
        expect(generator.getAmountDone(testData)).toEqual({
            cards: 0,
            actual: 0
        });
    });

    it("should calculate the sprint velocity so far", function() {
        var testData = {
            userInput: {
                startDate: "2015-08-20"
            },
            pending: {},
            inflight: {},
            donePlanned: {
                cards: ["foo", "bar", "baz"],
                estimate: 10,
                actual: 8
            }
        };
        expect(generator.getVelocity(testData)).toBe(125);
        testData.donePlanned.actual = 11;
        expect(generator.getVelocity(testData)).toBe(90);
        testData.donePlanned.actual = 13.5;
        expect(generator.getVelocity(testData)).toBe(74);
        testData.userInput.startDate = "2016-08-20";
        expect(generator.getVelocity(testData)).toBe(0);
    });

    it("should provide a list of labels for the burndown chart", function() {
        var testData = {
            userInput: {
                startDate: "2014-08-17",
                duration: 5
            }
        };
        // weekdays
        expect(generator.getBurndownLabels(testData)).toEqual([
            "Start",
            "17 Aug",
            "18 Aug",
            "19 Aug",
            "20 Aug",
            "21 Aug"
        ]);
        testData.userInput.startDate = "2015-08-10";
        testData.userInput.duration = 10;
        // weekdays and weekends
        expect(generator.getBurndownLabels(testData)).toEqual([
            "Start",
            "10 Aug",
            "11 Aug",
            "12 Aug",
            "13 Aug",
            "14 Aug",
            "17 Aug",
            "18 Aug",
            "19 Aug",
            "20 Aug",
            "21 Aug"
        ]);
    });

    xit("should provide an estimate series for the burndown chart", function() {

    });

    xit("should provide an actual series (so far) for the burndown chart", function() {

    });
});