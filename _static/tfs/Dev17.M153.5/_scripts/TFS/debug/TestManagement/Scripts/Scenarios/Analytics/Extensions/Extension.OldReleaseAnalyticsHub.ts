/// <reference types="react" />
import { autobind } from "OfficeFabric/Utilities";
import * as React from "react";
import { ITestResultAnalyticsExtensionOptions } from "TestManagement/Scripts/Scenarios/Analytics/Extensions/Extension";
import { TestAnalyticsPage } from "TestManagement/Scripts/Scenarios/Analytics/Extensions/Extension.AnalyticsHub";
import { NavigationConstants, TestAnalyticsRouteParameters } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Constants";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import * as Services from "TestManagement/Scripts/Services/Services.Common";
import * as TFS_RMService from "TestManagement/Scripts/Services/TFS.ReleaseManagement.Service";
import { UrlHelper } from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Controls from "VSS/Controls";
import { HubsService } from "VSS/Navigation/HubsService";
import * as NavigationService from "VSS/Navigation/Services";
import * as SDK_Shim from "VSS/SDK/Shim";
import { getLocalService } from "VSS/Service";

export class OldReleaseTestAnalyticsPage extends TestAnalyticsPage {

    public initialize(){
        this._contextType = TCMContracts.TestResultsContextType.Release;
        super.initialize();
    }

    public initializeOptions(options: ITestResultAnalyticsExtensionOptions) {
        super.initializeOptions($.extend({
            contextType: TCMContracts.TestResultsContextType.Release
        }, options));
    }

    protected _getDefinitionIdFromUrl(): number {
        let state: any = NavigationService.getHistoryService().getCurrentState();
        let value: number = 0;
        if (state && state[TestAnalyticsRouteParameters.ReleaseDefinitionId]) {
            value = parseInt(state[TestAnalyticsRouteParameters.ReleaseDefinitionId], 10);
        }
        return value;
    }

    protected _fetchDefinitionName(definitionId: number): IPromise<string> {
        return Services.ServiceFactory.getService(Services.ServiceType.ReleaseManagement)
            .then((releaseService: TFS_RMService.ReleaseService) => releaseService.getReleaseDefinition(definitionId))
            .then(releaseDefinition => releaseDefinition.name);
    }

    @autobind
    protected _onDefinitionClick(event: React.MouseEvent<HTMLAnchorElement>): void {
        super._onDefinitionClick(event);
        const url = UrlHelper.getReleaseDefinitionUrl(this._definitionId, NavigationConstants.ReleasesHubActionOverview);
        const hubsService = getLocalService(HubsService);
        hubsService.navigateToHub(NavigationConstants.ReleaseHub, url);
    }

    @autobind
    protected _onAnalyticsClick(event: React.MouseEvent<HTMLAnchorElement>): void {
        super._onAnalyticsClick(event);
        const url = UrlHelper.getReleaseDefinitionUrl(this._definitionId, NavigationConstants.ReleasesHubActionAnalytics);
        const hubsService = getLocalService(HubsService);
        hubsService.navigateToHub(NavigationConstants.ReleaseHub, url);
    }
}

SDK_Shim.registerContent("release-definition-test-analytics-full-view", (context: SDK_Shim.InternalContentContextData) => {
    FluxFactory.instance().dispose();
    return Controls.create<OldReleaseTestAnalyticsPage, ITestResultAnalyticsExtensionOptions>(OldReleaseTestAnalyticsPage, context.$container, context.options);
});