/// <reference types="react-dom" />
import * as ReactDOM from "react-dom";

import * as VSS from "VSS/VSS";
import { NavigationView } from "VSS/Controls/Navigation";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { ShelveSetsTelemetrySpy } from "VersionControl/Scenarios/History/TfvcHistory/Sources/ShelveSetsTelemetrySpy";
import { TfvcRepositoryContext } from "VersionControl/Scripts/TfvcRepositoryContext";
import { TfvcShelveSetsActionsHub } from "VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcShelveSetsActionsHub";
import { TfvcShelveSetsActionCreator } from "VersionControl/Scenarios/History/TfvcHistory/Actions/TfvcShelveSetsActionCreator";
import { TfvcShelveSetsStoreHub } from "VersionControl/Scenarios/History/TfvcHistory/Stores/TfvcShelveSetsStoreHub";
import * as ShelveSetsPage from "VersionControl/Scenarios/History/TfvcHistory/Components/ShelveSetsPage"

export class ShelveSetsView extends NavigationView {
    private _actionCreator: TfvcShelveSetsActionCreator;
    private _storesHub: TfvcShelveSetsStoreHub;
    private _tfsContext: TfsContext;
    private _repositoryContext: RepositoryContext;

    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({ attachNavigate: true }, options));
    }

    public initialize(): void {
        this._tfsContext = this._options.tfsContext || TfsContext.getDefault();
        this._repositoryContext = TfvcRepositoryContext.create(this._tfsContext);
        this.initializeFlux();

        super.initialize();
    }

    private initializeFlux(): void {
        const actionsHub = new TfvcShelveSetsActionsHub();
        const telemetrySpy = new ShelveSetsTelemetrySpy(actionsHub);
        this._storesHub = new TfvcShelveSetsStoreHub(actionsHub);
        this._actionCreator = new TfvcShelveSetsActionCreator(actionsHub, this._tfsContext, this._repositoryContext, this._storesHub, telemetrySpy);       

        this._actionCreator.loadShelvesets();

        ShelveSetsPage.renderInto(
            $(".hub-content")[0],
            {
                actionCreator: this._actionCreator,
                storesHub: this._storesHub,
                tfsContext: this._tfsContext,
                repositoryContext: this._repositoryContext,
            });
    }

    public onNavigate(state: any): void {
        if (!state.user && !state.userId ) {
            state.user = this._tfsContext.currentIdentity.displayName;         
            state.userId = this._tfsContext.currentIdentity.id;
        }

        this._actionCreator.applyNavigatedUrl(state);
    }  

    protected _dispose(): void {
        ReactDOM.unmountComponentAtNode($(".hub-content")[0]);

        if (this._storesHub) {
            this._storesHub.dispose();
            this._storesHub = null;
        }
        this._actionCreator = null;

        super._dispose();
    }
}

VSS.classExtend(ShelveSetsView, TfsContext.ControlExtensions);