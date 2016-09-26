class ScrumpyStatsGenerator { /* eslint no-unused-vars: 0 */
    go() {
        chrome.runtime.sendMessage({
            service: "getStatsData",
            data: null
        }, data => {
            this.render(this.fixupData(data));
        });
    }

    fixupData(data) {
        const donePlanned = {estimate: 0, actual: 0, cards: []},
            doneInterference = {actual: 0, cards: []};
        for (const card of data.done.cards) {
            const {estimate, actual} = this.getCardNumbers(card);
            if (this.isInterferenceCard(card, data)) {
                doneInterference.actual += actual;
                doneInterference.cards.push(card);
            } else {
                donePlanned.estimate += estimate;
                donePlanned.actual += actual;
                donePlanned.cards.push(card);
            }
        }
        return Object.assign(data, {donePlanned, doneInterference});
    }

    isInterferenceCard(card, data) {
        const interferenceLabel = data.userInput.interferenceLabel;
        if (interferenceLabel) {
            return card.labels.includes(interferenceLabel);
        }
        return false;
    }

    onWeekend(dateMoment) {
        return dateMoment.isoWeekday() > 5;
    }

    onWeekday(dateMoment) {
        return !this.onWeekend(dateMoment);
    }

    isMorning() {
        return moment().isBefore(moment().hour(12).minute(0).second(0).millisecond(0));
    }

    getToday() {
        return moment().startOf("day");
    }

    getLastFriday(dateMoment) {
        return moment(dateMoment).startOf("isoweek").add(4, "days");
    }

    getNextMonday(dateMoment) {
        return moment(dateMoment).startOf("isoweek").add(7, "days");
    }

    hasStarted(dateMoment) {
        const today = this.getToday();
        if (dateMoment.isSame(today)) {
            return !this.isMorning();
        }
        return dateMoment.isBefore(today);
    }

    getSprintDay(startDate, targetDay) {
        let dateCounter = moment(startDate);

        while (targetDay > 1) {
            targetDay--;
            dateCounter.add(1, "days");
            if (this.onWeekend(dateCounter)) {
                dateCounter = this.getNextMonday(dateCounter);
            }
        }

        return dateCounter;
    }

    getEndDate(startDate, duration) {
        const dateCounter = moment(startDate);

        while (duration > 1) {
            if (this.onWeekday(dateCounter)) {
                duration--;
            }
            dateCounter.add(1, "days");
        }

        return dateCounter;
    }

    getReportDate(startDate, duration) {
        const endDate = this.getEndDate(startDate, duration);
        let reportDate = this.getToday();
        // if it's the morning right now, report to yesterday not today
        if (this.isMorning()) {
            reportDate.subtract(1, "days");
        }
        // if it's the weekend, report to friday
        if (this.onWeekend(reportDate)) {
            reportDate = this.getLastFriday(reportDate);
        }
        // if the sprint finished already, report to the end date
        if (endDate.isBefore(reportDate)) {
            return endDate;
        }
        // report to today (inclusive)
        return reportDate;
    }

    getElapsedDays(startDate, duration) {
        const reportDate = this.getReportDate(startDate, duration);
        let dateCounter = moment(startDate),
            elapsed;

        if (!this.hasStarted(dateCounter)) {
            return 0;
        }

        for (elapsed = 1; elapsed <= duration; elapsed++) {
            if (dateCounter.isSame(reportDate, "days")) {
                break;
            }
            dateCounter.add(1, "days");
            if (this.onWeekend(dateCounter)) {
                dateCounter = this.getNextMonday(dateCounter);
            }
        }

        return elapsed;
    }

    getAllPlannedCards(data) {
        return [].concat(data.pending.cards, data.inflight.cards, data.donePlanned.cards);
    }

    isCardMissingEstimate(card, data) {
        return card.estimate === "none";
    }

    isCardMissingActual(card) {
        return card.actual === "none";
    }

    getCardNumbers(card) {
        return {
            estimate: card.estimate !== "none" ? card.estimate : 0,
            actual: card.actual !== "none" ? card.actual : 0
        };
    }

    getProblems(data) {
        const problems = [];

        if (!this.hasStarted(moment(data.userInput.startDate))) {
            problems.push("The sprint hasn't started yet.");
        }

        if (this.getAllPlannedCards(data).some(card => this.isCardMissingEstimate(card, data))) {
            problems.push("Some cards didn't have estimates.");
        }

        if (data.done.cards.some(card => this.isCardMissingActual(card))) {
            problems.push("Some completed cards didn't have actuals.");
        }

        return problems;
    }

    getInitialEstimate(data) {
        return data.pending.estimate + data.inflight.estimate + data.donePlanned.estimate;
    }

    getTitleContent(data) {
        return `Stats for <b>${data.boardName}</b>`;
    }

    getAmountDone(data) {
        if (this.hasStarted(moment(data.userInput.startDate))) {
            return {
                "cards": data.done.cards.length,
                "actual": data.done.actual
            };
        }
        return {"cards": 0, "actual": 0};
    }

    getVelocity(data) {
        if (this.hasStarted(moment(data.userInput.startDate))) {
            return Math.floor(data.donePlanned.estimate / data.donePlanned.actual * 100);
        }
        return 0;
    }

    getBurndownLabels(data) {
        const labels = ["Start"];
        for (let day = 1; day <= data.userInput.duration; day++) {
            labels.push(this.getSprintDay(data.userInput.startDate, day).format("D MMM"));
        }
        return labels;
    }

    getBurndownEstimateSeries(data) {
        const initial = this.getInitialEstimate(data),
            duration = data.userInput.duration,
            series = [initial];
        for (let day = 1; day <= duration; day++) {
            series.push(initial - initial * day / duration);
        }
        return series;
    }

    getBurndownActualSeries(data) {
        const initial = this.getInitialEstimate(data),
            elapsed = this.getElapsedDays(data.userInput.startDate, data.userInput.duration),
            series = [initial];
        for (let day = 1; day <= elapsed; day++) {
            series.push(initial - data.donePlanned.estimate * day / elapsed);
        }
        return series;
    }

    getBurndownInterferenceSeries(data) {
        const elapsed = this.getElapsedDays(data.userInput.startDate, data.userInput.duration),
            series = [0];
        for (let day = 1; day <= elapsed; day++) {
            series.push(data.doneInterference.actual * (day / elapsed));
        }
        return series;
    }

    render(data) {
        this.populateTitle(data);
        this.populateBurndown(data);
        this.populateAmountDone(data);
        this.populateVelocity(data);
        this.populateProblems(data);
    }

    populateProblems(data) {
        for (let problem of this.getProblems(data)) {
            document.getElementById("problems-list").innerHTML += `<li class="problems-list__item">${problem}</li>`;
        }
    }

    populateTitle(data) {
        document.getElementById("main-title").innerHTML = this.getTitleContent(data);
    }

    populateBurndown(data) {
        const chart = new Chartist.Line("#burndown-chart", {
            labels: this.getBurndownLabels(data),
            series: [
                this.getBurndownEstimateSeries(data),
                this.getBurndownActualSeries(data),
                this.getBurndownInterferenceSeries(data)
            ]
        }, {
            axisX: {
                showGrid: false
            },
            axisY: {
                labelInterpolationFnc: label => label + "h"
            }
        });

        // make sure the chart recalcs its layout when we print
        window.matchMedia("print").addListener(function() {
            chart.update();
        });

        return chart;
    }

    populateAmountDone(data) {
        const stats = this.getAmountDone(data);
        document.getElementById("amount-done-text").innerHTML = `<strong>${stats.cards}</strong> tasks completed in <strong>${stats.actual}</strong> hours this sprint.`;
    }

    populateVelocity(data) {
        document.getElementById("velocity-percent-text").innerHTML = `Team is running at <strong>${this.getVelocity(data)}%</strong> of estimated velocity this sprint.`;

        return new Chartist.Bar("#velocity-chart", {
            labels: ["Done this Sprint"],
            series: [
                [data.donePlanned.estimate],
                [data.donePlanned.actual]
            ]
        }, {
            horizontalBars: true
        });
    }
}
