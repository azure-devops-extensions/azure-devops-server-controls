import * as Base from "DistributedTaskControls/Common/Components/Base";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import * as Utils_String from "VSS/Utils/String";
import * as Utils_Url from "VSS/Utils/Url";

export interface IState extends Base.IState {
    isOkDisabled: boolean;
}

export abstract class ConnectionDialogBase<Props, State extends IState> extends Base.Component<Props, State> {
    protected _getErrorMessageForConnectionName = (newValue: string): string => {
        const errorMessage = this._getErrorMessageForEmptyField(newValue);
        this._isConnectionNameValid = errorMessage ? false : true;
        this._updateState();
        return errorMessage;
    }

    protected _getErrorMessageForUrlField = (newValue: string): string => {
        let errorMessage = this._getErrorMessageForEmptyField(newValue);

        if (!errorMessage) {
            try {
                const uri = Utils_Url.Uri.parse(newValue, { absoluteUriRequired: true });
                if (!uri.host || uri.host.length === 0) {
                    // Need at least a host to be valid
                    errorMessage = Resources.UrlInvalid;
                }
            } catch {
                errorMessage = Resources.UrlInvalid;
            }
        }

        this._isUrlValid = errorMessage ? false : true;
        this._updateState();
        return errorMessage;
    }

    private _updateState(): void {
        if (this._isUrlValid && this._isConnectionNameValid) {
            this.setState({ isOkDisabled: false } as State);
        } else {
            this.setState({ isOkDisabled: true } as State);
        }
    }

    private _getErrorMessageForEmptyField(newValue: string): string {
        return newValue ? Utils_String.empty : Resources.RequiredInputErrorMessage;
    }

    protected textFieldValidationTimeout: number = 500;
    private _isConnectionNameValid: boolean;
    private _isUrlValid: boolean;
}
