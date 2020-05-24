/// <reference path='../../References/VSS.SDK.Interfaces.d.ts' />
/// <reference types="q" />

import Context = require("VSS/Context");
import Contracts_Platform = require("VSS/Common/Contracts/Platform");
import Contributions_Contracts = require("VSS/Contributions/Contracts");
import Contributions_Services = require("VSS/Contributions/Services");
import Contributions_Controls = require("VSS/Contributions/Controls");
import Dialogs = require("VSS/Controls/Dialogs");
import Service = require("VSS/Service");
import Q = require("q");
import SDK = require("VSS/SDK/Shim");

/**
* Class which manages showing dialogs in the parent frame
* @serviceId "vss.dialogs"
*/
export class HostDialogService implements IHostDialogService {
    
    /**
    * Open a modal dialog in the host frame which will get its content from a contributed control.
    * 
    * @param contributionId The id of the control contribution to host in the dialog
    * @param dialogOptions options.title - title of dialog
    * @param contributionConfig Initial configuration to pass to the contribution control.
    * @param postContent Optional data to post to the contribution endpoint. If not specified, a GET request will be performed.
    */
    public openDialog(contributionId: string, dialogOptions: IHostDialogOptions, contributionConfig?: Object, postContent?: Object): IPromise<IExternalDialog> {

        var dialog = Dialogs.show(ExternalDialog, $.extend({
            contributionId: contributionId,
            contributionConfig: contributionConfig,
            postContent: postContent
        }, dialogOptions));
        
        return Q.resolve(dialog);
    }

    /**
     * Open a modal dialog in the host frame which will display the supplied message.
     * @param message the message to display in the dialog. If it's a string, the message is displayed as plain text (no html). For HTML display, pass in a jQuery object.
     * @param methodOptions options affecting the dialog
     * @returns a promise that is resolved when the user accepts the dialog (Ok, Yes, any button with Button.reject===false), or rejected if the user does not (Cancel, No, any button with Button.reject===true).
     */
    public openMessageDialog(message: string | JQuery, options?: IOpenMessageDialogOptions): IPromise<IMessageDialogResult> {
        return Dialogs.showMessageDialog(message, options);
    }

    public buttons = {
        /**
         * Localized Ok button.
         */
        ok: Dialogs.MessageDialog.buttons.ok,
        /**
         * Localized Cancel button.
         */
        cancel: Dialogs.MessageDialog.buttons.cancel,
        /**
         * Localized Yes button.
         */
        yes: Dialogs.MessageDialog.buttons.yes,
        /**
         * Localized No button.
         */
        no: Dialogs.MessageDialog.buttons.no,
    }
}

export interface ExternalDialogOptions extends Dialogs.IModalDialogOptions {
    contributionId: string;
    webContext?: Contracts_Platform.WebContext;
    urlReplacementObject?: any;
    contributionConfig?: any;
    getDialogResult: () => IPromise<any>;
    postContent?: any;
}

/**
* Represents a dialog which hosts an ExternalPart.
*/
export class ExternalDialog extends Dialogs.ModalDialogO<ExternalDialogOptions> implements IExternalDialog {

    private _loadingPromise: IPromise<Contributions_Controls.IExtensionHost>;

    public initializeOptions(options?: any): void {
        super.initializeOptions($.extend({
            cssClass: "external-dialog"
        }, options));
    }

    public initialize(): void {
        super.initialize();

        var contributionId = this._options.contributionId;
        if (!contributionId) {
            throw new Error("Missing required 'contributionId' option");
        }

        var deferred = Q.defer<Contributions_Controls.IExtensionHost>();
        this._loadingPromise = deferred.promise;

        var webContext = this._options.webContext || Context.getDefaultWebContext();
        var replacementObject = $.extend({}, webContext);
        if (this._options.urlReplacementObject) {
            replacementObject = $.extend(replacementObject, this._options.urlReplacementObject);
        }
        
        var contributionConfig = $.extend({ dialog: this }, this._options.contributionConfig);
        
        Contributions_Controls.createExtensionHost(this._element, contributionId, contributionConfig, webContext, this._options.postContent, replacementObject).then((host) => {
            deferred.resolve(host);
        }, deferred.reject);

        Contributions_Services.ExtensionHelper.publishTraceData(null, null, contributionId);
    }

    /**
    * Gets an object registered in the dialog's contribution control.
    *
    * @param instanceId Id of the instance to get
    * @param contextData Optional data to pass to the extension for it to use when creating the instance
    * @return Promise that is resolved to the instance (a proxy object that talks to the instance)
    */
    public getContributionInstance<T>(instanceId: string, contextData?: any): IPromise<T> {
        var deferred = Q.defer<T>();
        this._loadingPromise.then((host) => {
            host.getRegisteredInstance(instanceId, contextData).then(deferred.resolve, deferred.reject);
        }, deferred.reject);
        return deferred.promise;
    }
    
    public onOkClick(e?: JQueryEventObject): any {

        if ($.isFunction(this._options.getDialogResult)) {
            this._options.getDialogResult().then((result: any) => {
                    if ($.isFunction(this._options.okCallback)) {
                        this._options.okCallback(result);
                    }
                    this.close();
            });
        }
        else {
            super.onOkClick(e);
        }
    }
}

SDK.VSS.register("ms.vss-web.dialog-service", new HostDialogService());
SDK.VSS.register("dialog-service", new HostDialogService());
SDK.VSS.register("vss.dialogs", new HostDialogService());
