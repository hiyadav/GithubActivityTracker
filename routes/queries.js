'use strict';
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res) {
    res.render('queries', {
        title: 'GitHub Queries',
        assignee: req.query.assignee,
        repo: req.query.repo, //format: organization/repoName
        showOnlyStaleIssues: req.query.showOnlyStaleIssues,
        chartType: req.query.chartType,
        showTeamDashboard: req.query.showTeamDashboard
    });
});

module.exports = router;
