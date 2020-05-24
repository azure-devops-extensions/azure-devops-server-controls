
import { Action } from "VSS/Flux/Action";
import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";
import { ISetDefaultProcessPayload } from "WorkCustomization/Scripts/Contracts/Process";
import { WebAccessHttpClient, IWebAccessHttpClient } from "WorkCustomization/Scripts/WebApi/WebAccessHttpClient";
import { showErrorAction, clearErrorAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";

export interface IEndSetDefaultProcessPayload {
    templateTypeId: string;
}

export const endSetDefaultProcessAction = new Action<IEndSetDefaultProcessPayload>();

export class SetDefaultProcessActionCreator extends TfsService {

    public beginSetDefaultProcess(payload: ISetDefaultProcessPayload): IPromise<void> {

        let httpClient: IWebAccessHttpClient = this._getClient();

        return httpClient.beginSetDefaultProcess(payload)
            .then<void>(() => {
                endSetDefaultProcessAction.invoke({ templateTypeId: payload.templateTypeId });
                clearErrorAction.invoke(null);
            }, (error) => {
                showErrorAction.invoke({ errorMessage: error.message });
            });
    }

    private _getClient(): IWebAccessHttpClient {
        return this.tfsConnection.getService(WebAccessHttpClient);
    }
}