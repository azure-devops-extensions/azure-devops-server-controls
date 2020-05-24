import * as BaseStore from "VSS/Flux/Store";
import { showErrorAction, clearErrorAction, IErrorActionPayload, showMessageAction, clearMessageAction, IMessageActionPayload } from "WorkCustomization/Scripts/Common/Actions/MessageBarActions";

export interface IMessageStoreOptions {
    id?: string;
}

export class MessageStore extends BaseStore.Store {
    private _id: string;

    private _error: string;
    private _message: string;
    private _isDangerousHTML: boolean;

    constructor(options?: IMessageStoreOptions) {
        super();
        this._id = options && options.id ? options.id : null;
        this._addListeners();
    }

    public get error(): string {
        return this._error;
    }

    public get message(): string {
        return this._message;
    }

    public get isDangerousHTML(): boolean {
        return this._isDangerousHTML;
    }

    public dispose() {
        this._removeListeners();
    }

    private _addListeners(): void {

        showErrorAction.addListener(this._onError, this);
        clearErrorAction.addListener(this._onClearError, this);
        showMessageAction.addListener(this._onMessage, this);
        clearMessageAction.addListener(this._onClearMessage, this);
    }

    private _removeListeners(): void {
        showErrorAction.removeListener(this._onError);
        clearErrorAction.removeListener(this._onClearError);
        showMessageAction.removeListener(this._onMessage);
        clearMessageAction.removeListener(this._onClearMessage);
    }

    private _onError(payload: IErrorActionPayload) {
        if (payload.errorBarId && payload.errorBarId !== this._id) {
            return;
        }

        this._error = payload.errorMessage;
        this._isDangerousHTML = !!payload.isDangerousHTML;
        this.emitChanged();
    }

    private _onClearError() {
        this._error = null;
        this.emitChanged();
    }

    private _onMessage(payload: IMessageActionPayload) {
        this._message = payload.message;
        this._isDangerousHTML = !!payload.isDangerousHTML;
        this.emitChanged();
    }

    private _onClearMessage() {
        this._message = null;
        this.emitChanged();
    }

}
