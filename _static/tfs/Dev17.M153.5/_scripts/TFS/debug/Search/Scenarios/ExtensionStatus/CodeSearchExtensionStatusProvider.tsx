import * as React from "react";
import * as SDK_Shim from "VSS/SDK/Shim";
import * as _NavigationHandler from "Search/Scenarios/Hub/NavigationHandler";
import * as Constants from "Search/Scenarios/ExtensionStatus/Constants";
import * as Resources from "Search/Scripts/Resources/TFS.Resources.Search.Scenarios";
import { ContributedSearchTab } from "Search/Scenarios/Shared/Base/ContributedSearchTab";
import { ActionsHub } from "Search/Scenarios/ExtensionStatus/Flux/ActionsHub";
import { StoresHub } from "Search/Scenarios/ExtensionStatus/Flux/StoresHub";
import { ActionCreator } from "Search/Scenarios/ExtensionStatus/Flux/ActionCreator";
import { getWindowTitle } from "Search/Scenarios/Shared/Utils";
import { getHistoryService } from "VSS/Navigation/Services";
import { ExtensionStatusContainer } from "Search/Scenarios/ExtensionStatus/Components/ExtensionStatus";
import { CountSpy } from "Search/Scenarios/ExtensionStatus/Flux/Sources/CountSpy";
import { IExtensionDetail } from "Search/Scenarios/ExtensionStatus/Util";

export class CodeSearchExtensionStatusProvider extends ContributedSearchTab {
    private actionCreator: ActionCreator;
    private storesHub : StoresHub;
    private countSpy: CountSpy;

    constructor(initializedOnTabSwitch: boolean, pageContext: Object, providerContributionId: string) {
        super(Constants.EntityTypeUrlParam, initializedOnTabSwitch, pageContext, providerContributionId);
        this.initializeFlux();
    }

    protected onRenderResults(): JSX.Element {
        const extensionDetail = this.getCodeSearchExtensionDetail();
        return <ExtensionStatusContainer actionCreator={this.actionCreator} storesHub={this.storesHub} extensionDetail={extensionDetail} />;
    }

    protected onDispose(): void {
        this.storesHub.dispose();
        this.countSpy.dispose();
    }

    protected onNavigate(rawState: _NavigationHandler.UrlParams): void {
        this.actionCreator.loadInitialState();
    }

    protected onInitialize(): void {
        const historyService = getHistoryService();
        const currentParams: _NavigationHandler.UrlParams = getHistoryService().getCurrentState();
        this.actionCreator.loadInitialState();
    }

    private initializeFlux(): void {
        const actionsHub = new ActionsHub();
        this.storesHub = new StoresHub(actionsHub);
        this.actionCreator = new ActionCreator(actionsHub);
        this.countSpy = new CountSpy(actionsHub, this.storesHub);

        document.title = getWindowTitle(Resources.SearchCodeLabel);
    }

    private getCodeSearchExtensionDetail = (): IExtensionDetail => {
        return {
                publisherId: "ms",
                extensionId: "vss-code-search",
                extensionName: "Code Search",
                userHasRequestedExtension: false,
                userHasManageExtensionPermission: false,
                isExtensionDisabled: false,
                extensionMarketplaceUrl: "",
                extensionDetailUrl: ""
            };
    }
}

SDK_Shim.VSS.register("ms.vss-search-platform.code-search-extension-status-provider", (context) => {
    const { tabSwitch, pageContext, providerContributionId } = context;
    return new CodeSearchExtensionStatusProvider(tabSwitch || false, pageContext, providerContributionId);
});