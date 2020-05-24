/// <reference types="react" />
import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/Extensions/Extension.AnalyticsHub";

import { autobind } from "OfficeFabric/Utilities";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { ITestResultsAnalyticsReportOptions, TestResultsAnalyticsReport } from "TestManagement/Scripts/Scenarios/Analytics/Extensions/AnalyticsReport";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import { AnalyticsBreadcrumb } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/AnalyticsHubBreadCrumb";
import { AnalyticsUnavailableMessage, IAnalyticsUnavailableMessageProps } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/AnalyticsUnavailableMessage";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Controls from "VSS/Controls";
import { NavigationView } from "VSS/Controls/Navigation";
import * as Diag from "VSS/Diag";
import * as Utils_String from "VSS/Utils/String";

export abstract class TestAnalyticsPage extends NavigationView {

    public initialize(): void {
        super.initialize();
        this._createView();
    }

    public initializeOptions(options: ITestResultsAnalyticsReportOptions) {
        super.initializeOptions($.extend({
            cssClass: "testresults-analytics"
        }, options));
    }

    public dispose(): void {
        if (this._breadCrumbDiv) {
            ReactDOM.unmountComponentAtNode(this._breadCrumbDiv.get(0));
            this._breadCrumbDiv = null;
        }

        if (this._reportControl) {
            this._reportControl.dispose();
            this._reportControl = null;
        }

        super.dispose();
    }

    private _createView() {

        const parentDiv = $("<div>").addClass("testresults-analytics-hub");
        this._breadCrumbDiv = $("<div>").addClass("testresults-analytics-breadcrumb");
        parentDiv.append(this._breadCrumbDiv);
        const reportDiv = $("<div>").addClass("testresults-analytics-report");
        parentDiv.append(reportDiv);
        parentDiv.appendTo(this.getElement());

        this._definitionId = this._getDefinitionIdFromUrl();
        if (this._definitionId) {
            this._fetchDefinitionName(this._definitionId).then((definitionName: string) => {
                ReactDOM.render(React.createElement(AnalyticsBreadcrumb, {
                    definitionName: definitionName,
                    onDefinitionClick: this._onDefinitionClick,
                    onAnalyticsClick: this._onAnalyticsClick
                }), this._breadCrumbDiv.get(0));
            }, (error) => {
                Diag.logError(Utils_String.format("Unable to fetch Definition object for DefinitionId: {0}", this._definitionId));
            });

            let options = $.extend(this._options, { definitionId: this._definitionId, contextType: this._contextType });
            this._reportControl = Controls.create<TestResultsAnalyticsReport, ITestResultsAnalyticsReportOptions>(TestResultsAnalyticsReport, reportDiv, options);
        } else {
            let container: HTMLElement = this._element.get(0);
            //Unmount any component inside container.
            ReactDOM.unmountComponentAtNode(container);

            ReactDOM.render(React.createElement(AnalyticsUnavailableMessage, {
                suggestion: Resources.AnalyticsUnavailableCardMetricsSuggestion,
            } as IAnalyticsUnavailableMessageProps), container);
        }
    }

    protected _getDefinitionIdFromUrl(): number {
        throw new Error("Method not implemented");
    }

    protected _fetchDefinitionName(definitionId: number): IPromise<string> {
        throw new Error("Method not implemented");
    }

    @autobind
    protected _onDefinitionClick(event: React.MouseEvent<HTMLAnchorElement>): void {
        FluxFactory.instance().dispose();
    }

    @autobind
    protected _onAnalyticsClick(event: React.MouseEvent<HTMLAnchorElement>): void {
        FluxFactory.instance().dispose();
    }

    protected _definitionId: number;
    protected _contextType: TCMContracts.TestResultsContextType;

    private _breadCrumbDiv: JQuery;
    private _reportControl: TestResultsAnalyticsReport;
}