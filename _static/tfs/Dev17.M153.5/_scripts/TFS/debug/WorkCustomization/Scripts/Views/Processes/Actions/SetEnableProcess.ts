
import { Action } from "VSS/Flux/Action";
import { TfsService } from "Presentation/Scripts/TFS/TFS.Service";
import { ISetEnableProcessPayload } from "WorkCustomization/Scripts/Contracts/Process";
import { WebAccessHttpClient, IWebAccessHttpClient } from "WorkCustomization/Scripts/WebApi/WebAccessHttpClient";
import { showErrorAction, clearErrorAction } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";

export interface IEndSetEnableProcessPayload {
    templateTypeId: string;
    isEnabled: boolean;
}

export const endSetEnableProcessAction = new Action<IEndSetEnableProcessPayload>();

export class SetEnableProcessActionCreator extends TfsService {

    public beginSetEnableProcess(payload: ISetEnableProcessPayload): IPromise<void> {

        let httpClient: IWebAccessHttpClient = this._getClient();

        return httpClient.beginSetEnableProcess(payload)
            .then<void>(() => {
                endSetEnableProcessAction.invoke({ templateTypeId: payload.templateTypeId, isEnabled: payload.isEnabled });
                clearErrorAction.invoke(null);
            }, (error) => {
                showErrorAction.invoke({ errorMessage: error.message });
            });
    }

    private _getClient(): IWebAccessHttpClient {
        return this.tfsConnection.getService(WebAccessHttpClient);
    }
}