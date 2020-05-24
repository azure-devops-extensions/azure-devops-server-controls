/*
* ---------------------------------------------------------
* Copyright(C) Microsoft Corporation. All rights reserved.
* ---------------------------------------------------------
*/

/// <reference types="jquery" />
/// <reference types="knockout" />

import ExploratorySessionView = require("TestManagement/Scripts/TestReporting/ExploratorySession/TabView");
import Resources = require("TestManagement/Scripts/Resources/TFS.Resources.TestManagement");
import ValueMap = require("TestManagement/Scripts/TFS.TestManagement.RunsView.ValueMap");
import RunsExplorer = require("TestManagement/Scripts/TFS.TestManagement.RunsView.RunExplorer.View");
import Common = require("TestManagement/Scripts/TestReporting/ExploratorySession/Common");
import TMUtils = require("TestManagement/Scripts/TFS.TestManagement.Utils");

import Diag = require("VSS/Diag");
import VSS = require("VSS/VSS");
import Controls = require("VSS/Controls");
import Performance = require("VSS/Performance");
import Utils_Core = require("VSS/Utils/Core");
let delegate = Utils_Core.delegate;

export class ExploratorySessionViewWrapper implements RunsExplorer.IViewWrapper {
    public name: string;

    private _isEnabled: boolean;
    private _$container: JQuery;
    private _sessionTabView: ExploratorySessionView.ExploratorySessionTabView;
    private _explorerView: RunsExplorer.RunExplorerView;

    public constructor() {
        this.name = ValueMap.RunExplorerViewTabs.ExploratorySession;
    }

     /**
     * Initalize view for exploratory session hub.
     *
     * @param explorerView Object for runs hub page.
     * @param $parentContainer Jquery object for parent container.
     * @param previousView Object of last visited view.
     * @publicapi
     */
    public initializeView(explorerView: RunsExplorer.RunExplorerView, $parentContainer: JQuery, previousView: RunsExplorer.IViewWrapper): void {
        Diag.logTracePoint("[ExploratorySessionViewWrapper.initializeView]: method called");

        if (this._sessionTabView) {
            this._sessionTabView.dispose();
            this._sessionTabView = null;
            Performance.getScenarioManager().startScenario(TMUtils.TcmPerfScenarios.Area, TMUtils.TcmPerfScenarios.QueryRecentExploratorySessions);
        } else {
            Performance.getScenarioManager().startScenarioFromNavigation(TMUtils.TcmPerfScenarios.Area, TMUtils.TcmPerfScenarios.GotoRecentExploratorySessions, true);
        }

        this._setContainer($parentContainer);
        this._explorerView = explorerView;
        this._sessionTabView = <ExploratorySessionView.ExploratorySessionTabView>Controls.BaseControl.createIn(ExploratorySessionView.ExploratorySessionTabView, this._$container, {
            viewToNavigateBack: previousView,
            noSessionViewCallBack: delegate(this, this._showNoSessionView),
            sessionContainerInitializeCallBack: delegate(this, this._initializeContainersForSessionView),
        });
    }

    /**
     * Set hub title for exploratory session view.
     *
     * @param explorerView Object for runs hub page.
     * @publicapi
     */
    public setState(explorerView: RunsExplorer.RunExplorerView): void {
        Diag.logTracePoint("[ExploratorySessionViewWrapper.setState]: method called");
        let $title = $("<div class='exploratory-session-hub-title' />").text(Resources.RecentSessions);
        this._explorerView.setHubTitle($title);
        let leftPaneOm = explorerView.getLeftPaneOM();
        leftPaneOm.queryTree.setSelectedNodeById(ValueMap.TestQueryConstants.EXPLORATORY_SESSIONS_QUERY_ID);
    }

    /**
     * Get enable state.
     * @publicapi
     */
    public getEnabledState(): boolean {
        Diag.logTracePoint("[ExploratorySessionViewWrapper.getEnabledState]: method called");
        return this._isEnabled;
    }

    /**
     * Set enable state.
     *
     * @param isEnabled True to enable state, false to disable state.
     * @publicapi
     */
    public setStateEnabled(isEnabled: boolean): void {
        if (isEnabled) {
            this.enableSessionFilters();
        } else {
            this.disableSessionFilters();
        }
        this._isEnabled = isEnabled;
    }

    /**
     * Show exploratory session view container.
     * @publicapi
     */
    public show() {
        if (this._$container) {
            this._$container.show();
        }
    }

    /**
     * Hide exploratory session view container.
     * @publicapi
     */
    public hide() {
        if (this._$container) {
            this._$container.hide();
        }
    }

    private enableSessionFilters(): void {
        $(Common.FilterSelectors.owner).attr("style", "display: block");
        $(Common.FilterSelectors.period).attr("style", "display: block");
        $(Common.FilterSelectors.query).attr("style", "display: block");
        $(Common.FilterSelectors.team).attr("style", "display: block");
    }

    private disableSessionFilters(): void {
        $(Common.FilterSelectors.owner).attr("style", "display: none");
        $(Common.FilterSelectors.period).attr("style", "display: none");
        $(Common.FilterSelectors.query).attr("style", "display: none");
        $(Common.FilterSelectors.team).attr("style", "display: none");
    }

    private _setContainer($parentContainer: JQuery): JQuery {
        Diag.logTracePoint("[ExploratorySessionViewWrapper.setContainer]: method called");

        if (this._$container == null) {
            this._$container = $("<div />").addClass("viewContainer").appendTo($parentContainer);
        }
        this._$container.empty();
        return this._$container;
    }

    private _showNoSessionView(message: string): void {
        this.clearErrorMessage();
        let $title = $("<div class='exploratory-session-hub-title' />").append(Resources.RecentSessions);
        this._explorerView.setHubTitle($title);
        $(".exploratory-sessions-layout.fixed-section").hide();
        $(".exploratory-session-view").append("<div class=\"no-sessions-message\">" + message + "</div>");
    }

    private _initializeContainersForSessionView(): void {
        this.clearErrorMessage();
        $(".exploratory-sessions-layout.fixed-section").show();
        this.show();
    }

    private clearErrorMessage(): void {
        $(".no-sessions-message").remove();
    }
}

VSS.initClassPrototype(ExploratorySessionViewWrapper, {
    isEnabled: false,
    name: ValueMap.RunExplorerViewTabs.ExploratorySession,
    _sessionTabView: null
});

// TFS plug-in model requires this call for each TFS module.
VSS.tfsModuleLoaded("ExploratorySession/ViewWrapper", exports);
