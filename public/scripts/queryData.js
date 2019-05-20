var ctx = document.getElementById("myChart");//.getContext('2d');

assignee = assignee || "bishal-pdMSFT"

// Define a plugin to provide data labels on the chart items
Chart.plugins.register({
    afterDatasetsDraw: function (chart) {
        var ctx = chart.ctx;

        chart.data.datasets.forEach(function (dataset, i) {
            var meta = chart.getDatasetMeta(i);
            if (!meta.hidden) {
                meta.data.forEach(function (element, index) {
                    // Draw the text in black, with the specified font
                    ctx.fillStyle = 'rgb(0, 0, 0)';

                    var fontSize = 20;
                    var fontStyle = 'bold';
                    var fontFamily = 'arial';
                    ctx.font = Chart.helpers.fontString(fontSize, fontStyle, fontFamily);

                    // Just naively convert to string for now
                    var dataString = dataset.data[index].toString();

                    // Make sure alignment settings are correct
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    var padding = 5;
                    var position = element.tooltipPosition();
                    if (dataString === "0") {
                        ctx.fillText(dataString, position.x, position.y - (fontSize / 2) - padding);
                    }
                    else {
                        ctx.fillText(dataString, position.x, position.y + fontSize);
                    }
                });
            }
        });
    }
});

var localGridLines = {};
if (showOnlyStaleIssues || showTeamDashboard) {
    /* animation to show the chart data */
    Chart.defaults.global.animation.duration = 100;
    Chart.defaults.global.legend.display = true;

    localGridLines = {
        display: true,
        drawBorder: true,
        drawOnChartArea: true,
    };
}

// add new alias here and also ajax to be added with new index
var aliasesForDashboard = ["bansalaseem", "kmkumaran", "lovakumar", "prativen", "bishal-pdMSFT"];
var tmpMinLabels = [">21 days Issues", ">7 days PRs"];
var tmpChartLabels = showTeamDashboard ? aliasesForDashboard : showOnlyStaleIssues ? tmpMinLabels : ["Total Issues", "Old Issues", "Total Pull requests", "Old Pull requests"];
var tmpDatasets = {};
if (showTeamDashboard) {
    tmpDatasets = [{
            label: tmpMinLabels[0],
            data: [0, 0, 0, 0, 0],
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255,99,132,1)',
            fill: false,
            borderWidth: 2
        },
        {
            label: tmpMinLabels[1],
            data: [0, 0, 0, 0, 0],
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2
        }
    ];
} else {
    tmpDatasets = [{
        label: 'Count',
        data: [0, 0, 0, 0],
        backgroundColor: [
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
        ],
        borderColor: [
            'rgba(255,99,132,1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 2
    }]
}

var chart = new Chart(ctx, {
    type: chartType ? 'pie' : 'bar',
    data: {
        labels: tmpChartLabels,
        datasets: tmpDatasets
    },
    options: {
        scales: {
            xAxes: [{
                gridLines: localGridLines
            }],
            yAxes: [{
                ticks: {
                    beginAtZero: true,
                    stepSize: 1
                },
                gridLines: localGridLines
            }]
        },
        tooltips: {
            callbacks: {
                label: toolTipLabelCallback
            }
        },
        events: ["click"],
        title: {
            display: true,
            text: showTeamDashboard ? "GitHub data fetching..." : assignee + " -- " + "GitHub data fetching..."
        }
    }
});

var repo = "microsoft/azure-pipelines-tasks";
var query = "-label:enhancement+is:open -label:\"Area: Documentation\"";
var lastCopiedUrl;

function toolTipLabelCallback(tooltipItem, data) {
    var label = data.datasets[tooltipItem.datasetIndex].label || '';
    var value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];

    label += ": " + value;

    if (inIframe()) {
        label += " :: Copied URL to clipboard."
    }

    return label;
}

function inIframe () {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

function handleOnClick(e) {
    var elements = chart.getElementAtEvent(e);
    if (!elements || !elements.length) return;
    element = elements[0];

    var clkAlias = showTeamDashboard ? aliasesForDashboard[element._index] : assignee;
    url = 'https://github.com/' + repo + "/issues?q=" + query + "+assignee:" + clkAlias;

    var filters = showOnlyStaleIssues ? 
        [
            "+is:issue+updated:<" + getDateBeforeDays(21),
            "+is:pr+updated:<" + getDateBeforeDays(7)
        ]
        :
        [
            "+is:issue",
            "+is:issue+updated:<" + getDateBeforeDays(21) ,
            "+is:pr",
            "+is:pr+updated:<" + getDateBeforeDays(7)
        ]

    var filterIndex = showTeamDashboard ? element._datasetIndex : element._index;
    url += filters[filterIndex]

    if (inIframe()) {
       copyToClipboard(url);
       lastCopiedUrl = url;
    }
    else {
        window.open(url);
    }
}

const copyToClipboard = str => {
    const el = document.createElement('textarea');
    el.value = str;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  };

function isOlder(item, days) {
    var olderDate = new Date(getDateBeforeDays(days));
    return olderDate.getTime() > (new Date(item.updated_at)).getTime();
}

function getDateBeforeDays(days) {
    var x = new Date();
    x.setDate(x.getDate() - days)
    return x.toISOString().substring(0,10);
}

function updateData(result, alias, indexToUse) {
    var issues = result.items.filter(i => i.pull_request == null);
    var pullRequests = result.items.filter(i => i.pull_request != null);

    var oldIssues = issues.filter(i => isOlder(i, 21));
    var pullRequestsOld = pullRequests.filter(i => isOlder(i, 7));

    if (!showOnlyStaleIssues) {
        chart.data.datasets[0].data[0] = issues.length;
        chart.data.datasets[0].data[1] = oldIssues.length;
        chart.data.datasets[0].data[2] = pullRequests.length;
        chart.data.datasets[0].data[3] = pullRequestsOld.length;
    } else {
        if (!showTeamDashboard) {
            chart.data.datasets[0].data[0] = oldIssues.length;
            chart.data.datasets[0].data[1] = pullRequestsOld.length;
        } else {
            chart.data.datasets[0].data[indexToUse] = oldIssues.length;
            chart.data.datasets[1].data[indexToUse] = pullRequestsOld.length;
        }
    }

    chart.options.title.text = showTeamDashboard ? "GitHub data fetching...." : alias + " -- GitHub data fetching...";
}

function updateOtherRepoData(result, indexToUse) {
    var issues = result.items.filter(i => i.pull_request == null);
    var pullRequests = result.items.filter(i => i.pull_request != null);

    var oldIssues = issues.filter(i => isOlder(i, 21));
    var pullRequestsOld = pullRequests.filter(i => isOlder(i, 7));
    
    if (!showOnlyStaleIssues) {
        chart.data.datasets[0].data[0] = chart.data.datasets[0].data[0] + issues.length;
        chart.data.datasets[0].data[1] = chart.data.datasets[0].data[1] + oldIssues.length;
        chart.data.datasets[0].data[2] = chart.data.datasets[0].data[2] + pullRequests.length;
        chart.data.datasets[0].data[3] = chart.data.datasets[0].data[3] + pullRequestsOld.length;
    } else {
        if (showOnlyStaleIssues || showTeamDashboard) {
            if (!showTeamDashboard) {
                chart.data.datasets[0].data[0] = chart.data.datasets[0].data[0] + oldIssues.length;
                chart.data.datasets[0].data[1] = chart.data.datasets[0].data[1] + pullRequestsOld.length;
            } else {
                chart.data.datasets[0].data[indexToUse] = chart.data.datasets[0].data[indexToUse] + oldIssues.length;
                chart.data.datasets[1].data[indexToUse] = chart.data.datasets[1].data[indexToUse] + pullRequestsOld.length;
            }
        }
    }
}

function prepareWebCall(url) {
    return $.ajax({
        url: url
    });
}

var otherRepos = ["microsoft/azure-pipelines-extensions", "microsoft/azure-pipelines-agent"];
var minSecToWait = showTeamDashboard ? 6 : 2;
function fetchOtherRepoData(aliasIndex, totalAliasSize, repoIndex, totalRepoSize) {
    // fetch other repo details
    setTimeout((localAliasIndex, localTotalAliasSize, localRepoIndex, localTotalRepoSize) => {
        var otherRepoPromises = [];
        var otherRepoQuerySuffix = "https://api.github.com/search/issues?q=" + query + "+repo:" + otherRepos[localRepoIndex] + "+assignee:" + aliasesForDashboard[localAliasIndex];
        otherRepoPromises.push(prepareWebCall(otherRepoQuerySuffix));

        Q.allSettled(otherRepoPromises).done(function (values) {
            var errorMessage = "";
            values.forEach(function (r) {
                r.state === "fulfilled" && updateOtherRepoData(r.value, localAliasIndex);
                errorMessage = !errorMessage && r.state === "rejected" && JSON.stringify(r.reason);
            });

            if ((localAliasIndex + 1) >= localTotalAliasSize && (localRepoIndex + 1) >= localTotalRepoSize) {
                // all processing is done
                chart.options.title.text = (totalAliasSize > 1 ? "" : assignee + " -- ") + "GitHub all repos data";
            }
            else {
                var newRepoIndex = localRepoIndex;
                var newAliasIndex = localAliasIndex + 1;
                // one round of aliases are done
                if (newAliasIndex >= localTotalAliasSize) {
                    newAliasIndex = 0;
                    newRepoIndex = localRepoIndex + 1;
                }

                fetchOtherRepoData(newAliasIndex, localTotalAliasSize, newRepoIndex, localTotalRepoSize);
            }

            chart.update();
            errorMessage && $("#error").text("Could not load data. Error: " + errorMessage);
        });
    }, minSecToWait * 1000, aliasIndex, totalAliasSize, repoIndex, totalRepoSize);
}

function fetchRepoData(aliasIndex, totalAliasSize) {
    // fetch other repo details
    setTimeout((localAliasIndex, localTotalAliasSize) => {
        var tmpQuerySuffix = "https://api.github.com/search/issues?q=" + query + "+repo:" + repo + "+assignee:" + aliasesForDashboard[localAliasIndex];
        var issuePromises = [prepareWebCall(tmpQuerySuffix)];

        Q.allSettled(issuePromises).done(function (values) {
            var errorMessage = "";
            values.forEach(function (r) {
                r.state === "fulfilled" && updateData(r.value, aliasesForDashboard[localAliasIndex], localAliasIndex);
                errorMessage = !errorMessage && r.state === "rejected" && JSON.stringify(r.reason);
            });

            chart.update();
            errorMessage && $("#error").text("Could not load data. Error: " + errorMessage);

            if (!showTeamDashboard || (localAliasIndex + 1) >= localTotalAliasSize) {
                // all processing is done
                ctx.onclick = handleOnClick;

                // fetch other repo details
                fetchOtherRepoData(0, showTeamDashboard ? aliasesForDashboard.length : 1, 0, otherRepos.length);
            }
            else {
                fetchRepoData((localAliasIndex + 1), localTotalAliasSize);
            }
        })
    }, minSecToWait * 1000, aliasIndex, totalAliasSize);
}


// use assignee as [0] index if the request is not for dashboard.
aliasesForDashboard[0] = showTeamDashboard ? aliasesForDashboard[0] : assignee
fetchRepoData(0, showTeamDashboard ? aliasesForDashboard.length : 1);