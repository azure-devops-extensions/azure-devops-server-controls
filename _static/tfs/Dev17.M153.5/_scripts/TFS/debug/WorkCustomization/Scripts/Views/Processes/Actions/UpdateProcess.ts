
import Q = require("q");
import { Action } from "VSS/Flux/Action";
import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";
import { IProcess, IUpdateProcessRequestPayload } from "WorkCustomization/Scripts/Contracts/Process";
import { WebAccessHttpClient, IWebAccessHttpClient } from "WorkCustomization/Scripts/WebApi/WebAccessHttpClient";
import { showErrorAction, clearErrorAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";

export interface IEndUpdateProcessPayload {
    processes: IProcess[];
}

export const endUpdateProcessAction = new Action<IEndUpdateProcessPayload>();

export class UpdateProcessActionCreator extends TfsService {

    public beginUpdateProcess(payload: IUpdateProcessRequestPayload, errorBarId: string): Q.Promise<void> {

        let httpClient: IWebAccessHttpClient = this._getClient();

        return Q(httpClient.beginUpdateProcess(payload)
            .then<void>((processes: IProcess[]) => {
                endUpdateProcessAction.invoke({ processes: processes });
                clearErrorAction.invoke(null);
            }, (error) => {
                showErrorAction.invoke({ errorMessage: error.message, errorBarId: errorBarId });
            }));
    }

    private _getClient(): IWebAccessHttpClient {
        return this.tfsConnection.getService(WebAccessHttpClient);
    }
}