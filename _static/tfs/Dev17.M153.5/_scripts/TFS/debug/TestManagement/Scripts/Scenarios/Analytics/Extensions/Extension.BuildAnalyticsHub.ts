/// <reference types="react" />
import { autobind } from "OfficeFabric/Utilities";
import * as React from "react";
import { ITestResultAnalyticsExtensionOptions } from "TestManagement/Scripts/Scenarios/Analytics/Extensions/Extension";
import { TestAnalyticsPage } from "TestManagement/Scripts/Scenarios/Analytics/Extensions/Extension.AnalyticsHub";
import { NavigationConstants, TestAnalyticsRouteParameters } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Constants";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import { ServiceManager } from "TestManagement/Scripts/TFS.TestManagement.Service";
import { UrlHelper } from "TestManagement/Scripts/TFS.TestManagement.Utils";
import { BuildDefinition } from "TFS/Build/Contracts";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Controls from "VSS/Controls";
import { HubsService } from "VSS/Navigation/HubsService";
import * as NavigationService from "VSS/Navigation/Services";
import * as SDK_Shim from "VSS/SDK/Shim";
import { getLocalService } from "VSS/Service";


export class NewBuildTestAnalyticsPage extends TestAnalyticsPage {

    public initialize(){
        this._contextType = TCMContracts.TestResultsContextType.Build;
        super.initialize();
    }

    public initializeOptions(options: ITestResultAnalyticsExtensionOptions) {
        super.initializeOptions($.extend({
            contextType: TCMContracts.TestResultsContextType.Build
        }, options));
    }

    protected _getDefinitionIdFromUrl() {
        let state: any = NavigationService.getHistoryService().getCurrentState();
        let value: number = 0;
        if (state && state[TestAnalyticsRouteParameters.BuildDefinitionId]) {
            value = parseInt(state[TestAnalyticsRouteParameters.BuildDefinitionId], 10);
        }
        return value;
    }

    protected _fetchDefinitionName(definitionId: number): IPromise<string> {
        const buildService = ServiceManager.instance().buildService2();
        return buildService.getDefinition(definitionId).then((buildDefinitionInfo: BuildDefinition) => buildDefinitionInfo.name);
    }

    @autobind
    protected _onDefinitionClick(event: React.MouseEvent<HTMLAnchorElement>): void {
        super._onDefinitionClick(event);
        const url = UrlHelper.getBuildDefinitionUrl(this._definitionId, NavigationConstants.BuildHubActionHistory);
        const hubsService = getLocalService(HubsService);
        hubsService.navigateToHub(NavigationConstants.BuildHub, url);
    }

    @autobind
    protected _onAnalyticsClick(event: React.MouseEvent<HTMLAnchorElement>): void {
        super._onAnalyticsClick(event);
        const testTabExtensionId: string = NavigationConstants.BuildHubActionAnalytics;
        const url = UrlHelper.getBuildDefinitionUrl(this._definitionId, testTabExtensionId);
        const hubsService = getLocalService(HubsService);
        hubsService.navigateToHub(NavigationConstants.BuildHub, url);
    }
}

SDK_Shim.registerContent("build-definition-test-analytics-full-view", (context: SDK_Shim.InternalContentContextData) => {
    FluxFactory.instance().dispose();
    return Controls.create<NewBuildTestAnalyticsPage, ITestResultAnalyticsExtensionOptions>(NewBuildTestAnalyticsPage, context.$container, context.options);
});