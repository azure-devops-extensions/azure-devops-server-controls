

import ko = require("knockout");

import Notifications = require("VSS/Controls/Notifications");
import Utils_Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import VSS = require("VSS/VSS");

let delegate = Utils_Core.delegate;

export interface IMessageAreaOptions {
    viewModel: MessageAreaViewModel;
}

export class MessageAreaView extends Notifications.MessageAreaControl {

    constructor(options: IMessageAreaOptions) {
        super(options as any);
        this._messageAreaViewModel = options.viewModel;
        this._messageAreaViewModel.clearDelegate = delegate(this, this.clear);
    }

    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            closeable: true
        }, options));
    }

    public initialize(options?): void {
        super.initialize();
        this._subscribe();
    }

    public dispose(): void {
        this.clear();
        this._disposalManager.dispose();
    }

    private _subscribe() {
        this._disposalManager.addDisposable(this._messageAreaViewModel.logError.subscribe((error: string) => {
            if (error) {
                this.setError(VSS.getErrorMessage(error));

                // The erroor string on view model needs to be set to empty to ensure that another error with the same
                // error message as the previous triggers notification.
                this._messageAreaViewModel.logError(Utils_String.empty);
            }
        }));

        this._disposalManager.addDisposable(this._messageAreaViewModel.logInfo.subscribe((info: string) => {
            if (info) {
                this.setMessage(info, Notifications.MessageAreaType.Info);

                // The info string on view model needs to be set to empty to ensure that another info with the same
                // message as the previous triggers notification.
                this._messageAreaViewModel.logInfo(Utils_String.empty);
            }
        }));

        this._disposalManager.addDisposable(this._messageAreaViewModel.logInfoJQuery.subscribe((info: JQuery) => {
            if (info) {
                this.setMessage(info, Notifications.MessageAreaType.Info);

                // The info element on view model needs to be set to empty to ensure that another info with the same
                // message as the previous triggers notification.
                this._messageAreaViewModel.logInfoJQuery(null);
            }
        }));
    }

    private _messageAreaViewModel: MessageAreaViewModel;
    private _disposalManager: Utils_Core.DisposalManager = new Utils_Core.DisposalManager();
    private _link: JQuery;
}

export class MessageAreaViewModel {

    public logError: KnockoutObservable<string> = ko.observable(Utils_String.empty);

    public logInfo: KnockoutObservable<string> = ko.observable(Utils_String.empty);
    public logInfoJQuery: KnockoutObservable<JQuery> = ko.observable(null);

    public clearDelegate: () => void;

    public clear(): void {
        if (this.clearDelegate) {
            this.clearDelegate();
        }
    }
}

// TFS plugin model requires this call for each tfs module.
VSS.tfsModuleLoaded("TFS.TestManagement.MessageArea", exports);
