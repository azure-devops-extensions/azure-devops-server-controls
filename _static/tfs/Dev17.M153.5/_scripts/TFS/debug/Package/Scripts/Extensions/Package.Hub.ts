import * as Controls from "VSS/Controls";
import * as KeyboardShortcuts from "VSS/Controls/KeyboardShortcuts";
import { getNavigationHistoryService } from "VSS/Navigation/NavigationHistoryService";
import * as NavigationService from "VSS/Navigation/Services";
import * as Performance from "VSS/Performance";
import * as SDK from "VSS/SDK/Shim";
import * as Utils_String from "VSS/Utils/String";

import * as Actions from "Package/Scripts/Actions/Actions";
import { SettingsActions } from "Package/Scripts/Actions/SettingsActions";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import { getFullyQualifiedFeedName } from "Package/Scripts/Helpers/FeedNameResolver";
import { IPackageHubViewProps, PackageHubView } from "Package/Scripts/PackageHubView";
import { ProtocolProvider } from "Package/Scripts/Protocols/ProtocolProvider";
import { FeedStore } from "Package/Scripts/Stores/FeedStore";
import { GlobalStore } from "Package/Scripts/Stores/GlobalStore";
import { PackageStore } from "Package/Scripts/Stores/PackageStore";
import { IHubState } from "Package/Scripts/Types/IHubState";

import {
    CiConstants,
    FeedServiceInstanceId,
    HubActionStrings,
    HubScenarioSplits,
    PerfScenarios,
    SupportedHubActionStrings
} from "Feed/Common/Constants/Constants";
import * as PackageResources from "Feed/Common/Resources";
import { IError } from "Feed/Common/Types/IError";

export class PackageHub extends Controls.Control<{}> {
    public async initialize(): Promise<void> {
        $("html").attr("dir", "ltr");
        this.getElement().addClass("package-hub");
        this.getElement().empty();

        const { hubState, error } = this.getOrFixHubState();
        await this.initializeStores(hubState, error);

        this.attachNavigationListeners();

        PackageHubView.render(this.getElement()[0], {
            globalStore: this._globalStore,
            feedStore: this._feedStore,
            packageStore: this._packageStore
        } as IPackageHubViewProps);
        Performance.getScenarioManager().split(HubScenarioSplits.RENDERCOMPLETE);

        this._initializeKeyboardShortcuts();

        this.publishPageLoadCiEvent(hubState.action);
        const scenarioManager = Performance.getScenarioManager();
        if (scenarioManager.recordPageLoadScenarioForService) {
            // M135: Temporary test for a cross-service compat issue - deployment dependency
            scenarioManager.recordPageLoadScenarioForService(
                PerfScenarios.Area,
                PerfScenarios.PageLoad,
                { action: hubState.action },
                FeedServiceInstanceId
            );
        }
        scenarioManager.endScenario(PerfScenarios.Area, PerfScenarios.Initialize);
    }

    public dispose(): void {
        NavigationService.getHistoryService().detachNavigate(this.navigationHandler);
        super._dispose();
    }

    private getOrFixHubState(): { hubState: IHubState; error: IError } {
        let hubState = NavigationService.getHistoryService().getCurrentState();
        let error = {} as IError;
        if (hubState != null && hubState.action != null && SupportedHubActionStrings.has(hubState.action) === false) {
            error = {
                message: Utils_String.format(PackageResources.Error_UrlActionNotSupported, hubState.action)
            } as IError;
        }

        if (hubState == null || hubState.action == null || SupportedHubActionStrings.has(hubState.action) === false) {
            const navigationHistoryService = getNavigationHistoryService();
            const navState = navigationHistoryService.getState();
            navState._a = HubActionStrings.ViewFeed;
            navigationHistoryService.replaceState(navState);
            hubState = NavigationService.getHistoryService().getCurrentState();
        }
        return { hubState, error };
    }

    private attachNavigationListeners(): void {
        this.navigationHandler = (sender, state): void => {
            this._processNavigation(state.action, state);
        };
        const checkCurrentState: boolean = false; // If true, immediately invokes the handler
        NavigationService.getHistoryService().attachNavigate(this.navigationHandler, checkCurrentState);
    }

    private async initializeStores(state: IHubState, error: IError): Promise<void> {
        // ivy protocol is lazy loaded
        await ProtocolProvider.initializeProtocols();

        this._globalStore = new GlobalStore(state.action, error);
        this._feedStore = new FeedStore(state);
        this._packageStore = new PackageStore(
            state,
            this._feedStore.getCurrentFeed.bind(this._feedStore),
            this._feedStore.getCurrentFeedViews.bind(this._feedStore)
        );
        Performance.getScenarioManager().split(HubScenarioSplits.STORESCREATED);
    }

    private _processNavigation(action: string, state: IHubState): void {
        this._feedStore
            .setHubState(action, state)
            .then(() => {
                this._packageStore.setHubState(action, state);
                this._globalStore.setActionAndTriggerViewRender(action);
            })
            .catch((error: IError) => {
                this._globalStore.setErrorAndTriggerViewRender(action, error);
            });
    }

    private _initializeKeyboardShortcuts(): void {
        let keyboardManager: KeyboardShortcuts.IShortcutManager;
        keyboardManager = KeyboardShortcuts.ShortcutManager.getInstance();

        keyboardManager.registerShortcut(PackageResources.KeyboardShortcuts_AzureArtifactsGroup, "n", {
            action: () => Actions.CreateFeedNavigateClicked.invoke({}),
            description: PackageResources.KeyboardShortcuts_NewFeedText,
            hideFromHelpDialog: false
        });

        keyboardManager.registerShortcut(PackageResources.KeyboardShortcuts_AzureArtifactsGroup, "e", {
            action: () => SettingsActions.FeedSettingsNavigateClicked.invoke({}),
            description: PackageResources.KeyboardShortcuts_EditFeedText,
            hideFromHelpDialog: false
        });

        keyboardManager.registerShortcut(PackageResources.KeyboardShortcuts_AzureArtifactsGroup, "k", {
            action: () => Actions.PackageSelected.invoke(this._feedStore.getFirstPackage()),
            description: PackageResources.KeyboardShortcuts_SelectFirstPackageText,
            hideFromHelpDialog: false
        });
    }

    private publishPageLoadCiEvent(action: string): void {
        if (this._feedStore.getCurrentFeed() != null) {
            const data = {
                FeedName: getFullyQualifiedFeedName(this._feedStore.getCurrentFeed()),
                HubAction: action,
                PackageName: null,
                PackageVersion: null,
                Protocol: null
            };
            if (this._packageStore.getPackageState().selectedPackage != null) {
                data.PackageName = this._packageStore.getPackageState().selectedPackage.normalizedName;
                data.PackageVersion = this._packageStore.getPackageState().selectedVersion.normalizedVersion;
                data.Protocol = this._packageStore.getPackageState().selectedPackage.protocolType;
            }
            CustomerIntelligenceHelper.publishEvent(CiConstants.PageLoaded, data);
        } else {
            CustomerIntelligenceHelper.publishEvent(CiConstants.PageLoaded, { Object: CiConstants.PageLoadedNoFeeds });
        }
    }

    private _globalStore: GlobalStore;
    private _feedStore: FeedStore;
    private _packageStore: PackageStore;
    private navigationHandler: IFunctionPPR<any, IHubState, void>;
}

SDK.registerContent("package-hub", context => {
    Performance.getScenarioManager().startScenario(
        PerfScenarios.Area,
        PerfScenarios.Initialize,
        Performance.getTimestamp(),
        false,
        FeedServiceInstanceId
    );
    Performance.getScenarioManager().split(HubScenarioSplits.INITIALIZING);
    return Controls.Control.create<PackageHub, {}>(PackageHub, context.$container, context.options);
});
