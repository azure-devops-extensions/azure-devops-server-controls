import { autobind } from "OfficeFabric/Utilities";

import { State } from "VSS/Flux/Component";
import * as Store from "VSS/Flux/Store";

import * as Actions from "Package/Scripts/Actions/Actions";
import { RecycleBinActions } from "Package/Scripts/Actions/RecycleBinActions";
import { SettingsActions } from "Package/Scripts/Actions/SettingsActions";
import { NavigationHandler } from "Package/Scripts/Common/NavigationHandler";
import { CiConstants } from "Feed/Common/Constants/Constants";
import { IGeneralDialogProps } from "Package/Scripts/Dialogs/GeneralDialog";
import { CustomerIntelligenceHelper } from "Package/Scripts/Helpers/CustomerIntelligenceHelper";
import { IError } from "Feed/Common/Types/IError";
import { HubAction, HubStateHelpers } from "Package/Scripts/Types/IHubState";
import { Feed } from "Package/Scripts/WebApi/VSS.CustomFeed.Contracts";
import { Package } from "Package/Scripts/WebApi/VSS.Feed.Contracts";
import { IPackageDependencySelectedPayload } from "Package/Scripts/Common/ActionPayloads";

// tslint:disable:interface-name
export interface GlobalState extends State {
    action: HubAction;
    error: IError;
    dialogProps: IGeneralDialogProps;
}

export class GlobalStore extends Store.Store {
    constructor(action: string, error: IError) {
        super();
        this._currentState = {} as GlobalState;
        this._currentState.action = HubStateHelpers.getHubAction(action);
        this._currentState.dialogProps = null;
        this._currentState.error = error;
        this._initializeActionListeners();
    }

    public getGlobalState(): GlobalState {
        return this._currentState;
    }

    public setActionAndTriggerViewRender(action: string): void {
        this._currentState.action = HubStateHelpers.getHubAction(action);
        this._currentState.error = null;
        this.emitChanged();
    }

    public setErrorAndTriggerViewRender(action: string, error: IError): void {
        this._currentState.action = HubStateHelpers.getHubAction(action);
        this._currentState.error = error;
        this.emitChanged();
    }

    private _initializeActionListeners(): void {
        Actions.ErrorDismissed.addListener(this._handleErrorDismissed);
        Actions.ErrorEncountered.addListener(this._handleErrorEncountered);
        Actions.PackageSelected.addListener(this._handlePackageSelectedAction);
        Actions.PackageDependencySelected.addListener(this._handlePackageDependencySelectedAction);
        SettingsActions.FeedSettingsNavigateClicked.addListener(this._handleFeedSettingsNavigateClickedAction);
        Actions.CreateFeedNavigateClicked.addListener(this._handleCreateFeedClickedAction);
        Actions.CreateFeedCanceled.addListener(this._handleCreateFeedCanceledAction);
        Actions.DialogOpenChanged.addListener(this._handleDialogOpenChangedAction);

        RecycleBinActions.RecycleBinBreadCrumbClicked.addListener(this._handleRecycleBinBreadCrumbSelectedAction);
        RecycleBinActions.PackageSelected.addListener(this._handleRecyleBinPackageSelectedAction);

        // Closing the dialog after the action has been completed
        Actions.PackageDeletedCompleted.addListener(this._closeGeneralDialog);
        Actions.PackageVersionDeprecatedCompleted.addListener(this._closeGeneralDialog);
        Actions.PackageListedChangedCompleted.addListener(this._closeGeneralDialog);
        RecycleBinActions.PackagesPermanentDeletedCompleted.addListener(this._closeGeneralDialog);
    }

    // used in tests - listeners must be removed from any action getting tested
    public dispose(): void {
        Actions.ErrorDismissed.removeListener(this._handleErrorDismissed);
        Actions.ErrorEncountered.removeListener(this._handleErrorEncountered);
        SettingsActions.FeedSettingsNavigateClicked.removeListener(this._handleFeedSettingsNavigateClickedAction);
        Actions.CreateFeedNavigateClicked.removeListener(this._handleCreateFeedClickedAction);
        Actions.CreateFeedCanceled.removeListener(this._handleCreateFeedCanceledAction);
        Actions.DialogOpenChanged.removeListener(this._handleDialogOpenChangedAction);

        RecycleBinActions.RecycleBinBreadCrumbClicked.removeListener(this._handleRecycleBinBreadCrumbSelectedAction);
        RecycleBinActions.PackageSelected.removeListener(this._handleRecyleBinPackageSelectedAction);

        Actions.PackageDeletedCompleted.removeListener(this._closeGeneralDialog);
        Actions.PackageVersionDeprecatedCompleted.removeListener(this._closeGeneralDialog);
        Actions.PackageListedChangedCompleted.removeListener(this._closeGeneralDialog);
        RecycleBinActions.PackagesPermanentDeletedCompleted.removeListener(this._closeGeneralDialog);

        Actions.PackageDependencySelected.removeListener(this._handlePackageDependencySelectedAction);
    }

    @autobind
    private _handleErrorEncountered(error: IError): void {
        this._currentState.error = error;
        this.emitChanged();
    }

    @autobind
    private _handleErrorDismissed(): void {
        this._currentState.error = null;
        this.emitChanged();
    }

    @autobind
    private _closeGeneralDialog(): void {
        this._handleDialogOpenChangedAction(null);
    }

    @autobind
    private _handleRecycleBinBreadCrumbSelectedAction(): void {
        this._currentState.action = HubAction.RecycleBin;
        this._currentState.error = null;
        this.emitChanged();
    }

    @autobind
    private _handlePackageDependencySelectedAction(dependency: IPackageDependencySelectedPayload): void {
        this._currentState.action = HubAction.PackageDependencySelected;
        this._currentState.error = null;
        this.emitChanged();
    }

    @autobind
    private _handlePackageSelectedAction(packageSummary: Package): void {
        this._currentState.action = HubAction.Package;
        this._currentState.error = null;
        this.emitChanged();
    }

    @autobind
    private _handleRecyleBinPackageSelectedAction(packageSummary: Package): void {
        this._currentState.action = HubAction.RecycleBinPackage;
        this._currentState.error = null;
        this.emitChanged();
    }

    @autobind
    private _handleFeedSettingsNavigateClickedAction(): void {
        this._currentState.action = HubAction.Settings;
        this._currentState.error = null;
        this.emitChanged();
    }

    @autobind
    private _handleCreateFeedClickedAction(): void {
        this._currentState.action = HubAction.CreateFeed;
        this._currentState.error = null;
        NavigationHandler.navigateToCreateFeed();
        this.emitChanged();
        CustomerIntelligenceHelper.publishEvent(CiConstants.CreateFeedPageOpened);
    }

    @autobind
    private _handleCreateFeedCanceledAction(feed: Feed): void {
        this._currentState.action = HubAction.Feed;
        this._currentState.error = null;
        NavigationHandler.navigateToFeed(feed, /*replaceHistoryPoint*/ false);
        this.emitChanged();
    }

    @autobind
    private _handleDialogOpenChangedAction(dialogProps: IGeneralDialogProps): void {
        this._currentState.dialogProps = dialogProps;
        this.emitChanged();
    }

    private _currentState: GlobalState;
}
