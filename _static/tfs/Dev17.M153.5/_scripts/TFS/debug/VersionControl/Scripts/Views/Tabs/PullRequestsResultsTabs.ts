import ko = require("knockout");

import Navigation = require("VSS/Controls/Navigation");
import Utils_UI = require("VSS/Utils/UI");

import {RepositoryContext} from "VersionControl/Scripts/RepositoryContext";
import VCPullRequestsViewViewModel = require("VersionControl/Scripts/ViewModels/PullRequestsViewViewModel");
import {CustomerIntelligenceData} from "VersionControl/Scripts/CustomerIntelligenceData";
import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");

import domElem = Utils_UI.domElem;
import TfsContext = TFS_Host_TfsContext.TfsContext;

/**
 * Base class for results views
 */
export class ResultsTab extends Navigation.NavigationViewTab {
    protected _viewModel: VCPullRequestsViewViewModel.ViewViewModel;

    protected _repositoryContext: RepositoryContext;

    public onNavigate(rawState: any, parsedState: any) {
        CustomerIntelligenceData.publishFirstTabView("PullRequestsMyResultsTab", parsedState, this._options);
        this._viewModel = <VCPullRequestsViewViewModel.ViewViewModel>parsedState.viewModel;

        this._reapplyBinding();
    }

    public onNavigateAway() {
        this._clearBinding();
    }

    private _reapplyBinding() {
        this._clearBinding();
        this._applyBinding();
    }

    protected _applyBinding() {
        const notificationElement = $(domElem('div'))
            .attr("data-bind", "template: { name: 'vc-pullrequest-notification-ko' }")
            .appendTo(this._element);
        ko.applyBindings(this._viewModel.myResultsViewModel, notificationElement[0]);

        const $resultsSet1 = $(domElem('div'))
            .attr("data-bind", "template: { name: 'vc-pullrequest-summary-table-ko' }")
            .addClass('vc-pullrequests-results-set')
            .appendTo(this._element);
        ko.applyBindings(this._viewModel.myResultsViewModel.pullRequestResultSets()[0], $resultsSet1[0]);

        const $resultsSet2 = $(domElem('div'))
            .attr("data-bind", "template: { name: 'vc-pullrequest-summary-table-ko' }")
            .addClass('vc-pullrequests-results-set')
            .appendTo(this._element);
        ko.applyBindings(this._viewModel.myResultsViewModel.pullRequestResultSets()[1], $resultsSet2[0]);

        if (TfsContext.getDefault().currentTeam) {
            const $resultsSet3 = $(domElem('div'))
                .attr("data-bind", "template: { name: 'vc-pullrequest-summary-table-ko' }")
                .addClass('vc-pullrequests-results-set')
                .appendTo(this._element);
            ko.applyBindings(this._viewModel.myResultsViewModel.pullRequestResultSets()[2], $resultsSet3[0]);
        }
    }

    private _clearBinding() {
        ko.cleanNode(this._element[0]);
        this._element.empty();
    }
}

/**
 * View for the "Mine" (or overview) pull requests tab.
 */
export class MyResultsTab extends ResultsTab {

    public onNavigate(rawState: any, parsedState: any) {
        CustomerIntelligenceData.publishFirstTabView("PullRequestsMyResultsTab", parsedState, this._options);
        super.onNavigate(rawState, parsedState);
    }

    protected _applyBinding() {
        const $spinnerContainer = $(domElem('div'))
            .addClass('vc-pullrequests-spinner-container')
            .appendTo(this._element);
        ko.applyBindings(this._viewModel.myResultsViewModel, $spinnerContainer[0]);

        const notificationElement = $(domElem('div'))
            .attr("data-bind", "template: { name: 'vc-pullrequest-notification-ko' }")
            .appendTo(this._element);
        ko.applyBindings(this._viewModel.myResultsViewModel, notificationElement[0]);

        const $resultsSet1 = $(domElem('div'))
            .attr("data-bind", "template: { name: 'vc-pullrequest-summary-table-ko' }")
            .addClass('vc-pullrequests-results-set')
            .addClass('mine')
            .appendTo(this._element);
        ko.applyBindings(this._viewModel.myResultsViewModel.pullRequestResultSets()[0], $resultsSet1[0]);

        const $resultsSet2 = $(domElem('div'))
            .attr("data-bind", "template: { name: 'vc-pullrequest-summary-table-ko' }")
            .addClass('vc-pullrequests-results-set')
            .addClass('mine')
            .appendTo(this._element);
        ko.applyBindings(this._viewModel.myResultsViewModel.pullRequestResultSets()[1], $resultsSet2[0]);

        if (TfsContext.getDefault().currentTeam) {
            const $resultsSet3 = $(domElem('div'))
                .attr("data-bind", "template: { name: 'vc-pullrequest-summary-table-ko' }")
                .addClass('vc-pullrequests-results-set')
                .addClass('mine')
                .appendTo(this._element);
            ko.applyBindings(this._viewModel.myResultsViewModel.pullRequestResultSets()[2], $resultsSet3[0]);
        }
    }
}

/**
 * View for the "All" pull requests tab.
 */
export class AllResultsTab extends ResultsTab {

    protected _applyBinding() {
        const pullRequestResultSet = this._viewModel.resultsViewModel.pullRequestResultSets()[0];

        const $spinnerContainer = $(domElem('div'))
            .addClass('vc-pullrequests-spinner-container')
            .appendTo(this._element);
        ko.applyBindings(this._viewModel.resultsViewModel, $spinnerContainer[0]);

        const notificationElement = $(domElem('div'))
            .attr("data-bind", "template: { name: 'vc-pullrequest-notification-ko' }")
            .appendTo(this._element);
        ko.applyBindings(this._viewModel.resultsViewModel, notificationElement[0]);

        const $resultsSet1 = $(domElem('div'))
            .attr("data-bind", "template: { name: 'vc-pullrequest-summary-table-ko' }")
            .addClass('vc-pullrequests-results-set')
            .appendTo(this._element);
        ko.applyBindings(pullRequestResultSet, $resultsSet1[0]);
    }
}

export class ActiveResultsTab extends AllResultsTab {

    public onNavigate(rawState: any, parsedState: any) {
        CustomerIntelligenceData.publishFirstTabView("PullRequestsActiveResultsTab", parsedState, this._options);
        super.onNavigate(rawState, parsedState);
    }
}

export class CompletedResultsTab extends AllResultsTab {

    public onNavigate(rawState: any, parsedState: any) {
        CustomerIntelligenceData.publishFirstTabView("PullRequestsCompletedResultsTab", parsedState, this._options);
        super.onNavigate(rawState, parsedState);
    }
}

export class AbandonedResultsTab extends AllResultsTab {

    public onNavigate(rawState: any, parsedState: any) {
        CustomerIntelligenceData.publishFirstTabView("PullRequestsAbandonedResultsTab", parsedState, this._options);
        super.onNavigate(rawState, parsedState);
    }
}
