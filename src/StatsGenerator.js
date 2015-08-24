class ScrumpyStatsGenerator {
    go() {
        chrome.runtime.sendMessage({
            service: "getStatsData",
            data: null
        }, data => {
            this.render(data);
        });
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
        let dateCounter = moment(startDate);

        while (duration > 1) {
            if (this.onWeekday(dateCounter)) {
                duration--;
            }
            dateCounter.add(1, "days");
        }

        return dateCounter;
    }

    getReportDate(startDate, duration) {
        let endDate = this.getEndDate(startDate, duration), reportDate;

        reportDate = this.getToday();
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
        let dateCounter = moment(startDate),
            reportDate = this.getReportDate(startDate, duration),
            elapsed;

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

    getAllCards(data) {
        return [].concat(data.pending.cards, data.inflight.cards, data.done.cards);
    }

    getProblems(data) {
        let problems = [];

        if (this.getAllCards(data).some(card => card.estimate === "none")) {
            problems.push("Some cards didn't have estimates.");
        }

        if (data.done.cards.some(card => card.actual === "none")) {
            problems.push("Some completed cards didn't have actuals.");
        }

        return problems;
    }

    getInitialEstimate(data) {
        return data.pending.estimate + data.inflight.estimate + data.done.estimate;
    }

    getTitleContent(data) {
        return `Stats for <b>${data.boardName}</b>`;
    }

    getAmountDone(data) {
        return {
            "cards": data.done.cards.length,
            "actual": data.done.actual
        };
    }

    getVelocity(data) {
        return Math.floor((data.done.estimate / data.done.actual) * 100);
    }

    getBurndownLabels(data) {
        let labels = ["Start"];
        for (let day = 1; day <= data.userInput.duration; day++) {
            labels.push(this.getSprintDay(data.userInput.startDate, day).format("D MMM"));
        }
        return labels;
    }

    getBurndownEstimateSeries(data) {
        let initial = this.getInitialEstimate(data),
            duration = data.userInput.duration,
            series = [initial];
        for (let day = 1; day <= duration; day++) {
            series.push(initial - (initial * (day / duration)));
        }
        return series;
    }

    getBurndownActualSeries(data) {
        let initial = this.getInitialEstimate(data),
            elapsed = this.getElapsedDays(data.userInput.startDate, data.userInput.duration),
            series = [initial];
        for (let day = 1; day <= elapsed; day++) {
            series.push(initial - (data.done.estimate * (day / elapsed)));
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
        new Chartist.Line("#burndown-chart", {
            labels: this.getBurndownLabels(data),
            series: [
                this.getBurndownEstimateSeries(data),
                this.getBurndownActualSeries(data)
            ]
        });
    }

    populateAmountDone(data) {
        let stats = this.getAmountDone(data);
        document.getElementById("amount-done-text").innerHTML = `<strong>${stats.cards}</strong> tasks completed in <strong>${stats.actual}</strong> hours this sprint.`;
    }

    populateVelocity(data) {
        document.getElementById("velocity-percent-text").innerHTML = `Team is running at <strong>${this.getVelocity(data)}%</strong> of estimated velocity this sprint.`;

        new Chartist.Bar("#velocity-chart", {
            labels: ["Done this Sprint"],
            series: [
                [data.done.estimate],
                [data.done.actual]
            ]
        }, {
            horizontalBars: true
        });
    }
}