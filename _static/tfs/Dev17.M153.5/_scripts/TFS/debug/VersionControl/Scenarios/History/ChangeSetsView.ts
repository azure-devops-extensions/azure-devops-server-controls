import * as ReactDOM from "react-dom";

import { WebPageDataService } from "VSS/Contributions/Services";
import { NavigationView } from "VSS/Controls/Navigation";
import { getDebugMode } from "VSS/Diag";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as VSSService from "VSS/Service";
import * as Utils_String from "VSS/Utils/String";
import * as VSS from "VSS/VSS";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { TfvcActionsHub } from "VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcActionsHub";
import { TfvcHistoryActionCreator } from "VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcHistoryActionCreator";
import * as ChangeSetsPage from "VersionControl/Scenarios/History/TfvcHistory/Components/ChangeSetsPage"
import { ChangeSetsTelemetrySpy } from "VersionControl/Scenarios/History/TfvcHistory/Sources/ChangeSetsTelemetrySpy";
import { TfvcChangeSetsStoresHub } from "VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcChangeSetsStoresHub";
import * as UrlPageHandler from "VersionControl/Scenarios/History/TfvcHistory/UrlPageHandler";
import * as Constants from "VersionControl/Scenarios/Shared/Constants";
import { VersionControlViewModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { TfvcRepositoryContext } from "VersionControl/Scripts/TfvcRepositoryContext";

export class ChangeSetsView extends NavigationView {
    private _actionCreator: TfvcHistoryActionCreator;
    private _storesHub: TfvcChangeSetsStoresHub;
    private _rawState: {};

    public initializeOptions(options?: {}): void {
        super.initializeOptions($.extend({ attachNavigate: true }, options));
    }

    public initialize(): void {
        const tfsContext = this._options.tfsContext || TfsContext.getDefault();
        // TODO : USER STORY 941965 reading the viewmodel from data provider can be removed after moving to new source explorer tree
        const webPageDataSvc = VSSService.getService(WebPageDataService);
        const vcViewModel = webPageDataSvc.getPageData(Constants.versionControlDataProviderId) || {};
        this._initializeFlux(tfsContext, vcViewModel as VersionControlViewModel);

        super.initialize();
    }

    public onNavigate(state: {}): void {
        this._rawState = state;
        UrlPageHandler.applyNavigatedUrl(this._actionCreator, state, this._storesHub.getChangeSetsPageState());
    }

    private _initializeFlux(tfsContext: TfsContext, viewModel: VersionControlViewModel): void {
        const actionsHub = new TfvcActionsHub();
        const repositoryContext = TfvcRepositoryContext.create(tfsContext);
        const telemetrySpy = new ChangeSetsTelemetrySpy();
        this._storesHub = new TfvcChangeSetsStoresHub(actionsHub);
        this._actionCreator = new TfvcHistoryActionCreator(actionsHub, this._storesHub, repositoryContext, telemetrySpy);
        this._actionCreator.changeRepository();
        this._actionCreator.loadChangesets();

        ChangeSetsPage.renderInto(
            $(".hub-content")[0],
            {
                actionCreator: this._actionCreator,
                storesHub: this._storesHub,
            });

        this._storesHub.filterStore.addChangedListener(this._updateUrl);
        this._storesHub.pathStore.addChangedListener(this._onPathStoreChanged);
    }

    private _onPathStoreChanged = (): void => {
        const windowTitle = (this._storesHub.pathStore.state.itemName && this._storesHub.pathStore.state.itemName.length > 0)
            ? Utils_String.format(
                VCResources.ChangesetHistoryTitleFormat,
                this._storesHub.pathStore.state.itemName)
            : Utils_String.format(
                VCResources.ChangesetHistoryTitleFormat,
                this._storesHub.getChangeSetsPageState().repositoryContext.getTfsContext().navigation.project);

        this.setWindowTitle(windowTitle);
        this._updateUrl();
    }

    private _updateUrl = (): void => {
        const nextParams = UrlPageHandler.getUrlParameters(this._storesHub.getChangeSetsPageState(), this._rawState);
        if (UrlPageHandler.areEqualUrlParamters(nextParams, this._rawState)) {
            return;
        }

        this._rawState = nextParams;
        Navigation_Services.getHistoryService().addHistoryPoint(
            null, // action
            nextParams, // data
            null, // window title
            true, // supress navigate
            false // merge data
        );
    }

    protected _dispose(): void {
        ReactDOM.unmountComponentAtNode($(".hub-content")[0]);
        if (this._storesHub) {
            this._storesHub.filterStore.removeChangedListener(this._updateUrl);
            this._storesHub.pathStore.removeChangedListener(this._onPathStoreChanged);
            this._storesHub.dispose();
            this._storesHub = null;
        }

        this._actionCreator = null;
        super._dispose();
    }
}

VSS.classExtend(ChangeSetsView, TfsContext.ControlExtensions);
