
import Q = require("q");
import { Action } from "VSS/Flux/Action";
import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";
import { IProcess, IDeleteProcessRequestPayload } from "WorkCustomization/Scripts/Contracts/Process";
import { WebAccessHttpClient, IWebAccessHttpClient } from "WorkCustomization/Scripts/WebApi/WebAccessHttpClient";
import { showErrorAction, clearErrorAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";

export interface IEndDeleteProcessPayload {
    processes: IProcess[];
}

export const endDeleteProcessAction = new Action<IEndDeleteProcessPayload>();

export class DeleteProcessActionCreator extends TfsService {

    public beginDeleteProcess(payload: IDeleteProcessRequestPayload, errorBarId: string): Q.Promise<void> {

        let httpClient: IWebAccessHttpClient = this._getClient();

        return Q(httpClient.beginDeleteProcess(payload)
            .then<void>((processes: IProcess[]) => {
                endDeleteProcessAction.invoke({ processes: processes });
                clearErrorAction.invoke(null);
            }, (error) => {
                showErrorAction.invoke({ errorMessage: error.message, errorBarId: errorBarId });
            }));
    }

    private _getClient(): IWebAccessHttpClient {
        return this.tfsConnection.getService(WebAccessHttpClient);
    }
}