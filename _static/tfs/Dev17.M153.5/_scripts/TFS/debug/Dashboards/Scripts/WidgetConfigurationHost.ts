/// <reference types="jquery" />


import Q = require("q");

import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");

import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import WidgetConfigHelpers = require("TFS/Dashboards/WidgetConfigHelpers");

import Contribution_Services = require("VSS/Contributions/Services");
import Contributions_Controls = require("VSS/Contributions/Controls");
import Controls = require("VSS/Controls");
import Service = require("VSS/Service");
import Utils_String = require("VSS/Utils/String");

var ErrorMessageHelper = TFS_Dashboards_Common.ErrorMessageHelper;

export interface WidgetConfigurationHostOptions
    extends Dashboard_Shared_Contracts.IConfigureWidgetName, Dashboard_Shared_Contracts.IConfigureWidgetSize {
    /**
    * the widget being configured.
    */
    widget: TFS_Dashboards_Contracts.Widget;

    /**
    * current settings for the widget/widget config
    */
    currentSettings: WidgetContracts.WidgetSettings;

    // callback to use for updating live preview
    onConfigurationChangeCallback: (
        customSettings: WidgetContracts.CustomSettings,
        widgetStateRequest: Q.Deferred<WidgetContracts.NotifyResult>) => void;

    onConfigurationErrorCallback?: (error: string) => void;
}

export interface IWidgetConfigurationInternal extends
    WidgetContracts.IWidgetConfiguration {

}

/**
* Extension host to host the custom widget configuration extensions
*/
export class WidgetConfigurationHost
    extends Controls.Control<WidgetConfigurationHostOptions> {

    /**
    * proxy object for the underlying widget configuration
    */
    public widgetConfigProxy: IWidgetConfigurationInternal;

    /**
    * contribution data for the widget configuration
    */
    public contribution: IExtensionContribution;

    /**
    * Relative Id of the contribution.
    */
    public contributionRelativeId: string;

    constructor(options: WidgetConfigurationHostOptions) {
        super(options);
    }

    /**
     * called when the configuration is saved. Allows the widget configuration to complete post save operations.
     */
    public onConfigurationSave(): void {
        if (this.widgetConfigProxy && $.isFunction(this.widgetConfigProxy.onSaveComplete)) {
            this.widgetConfigProxy.onSaveComplete();
        }
    }

    /**
     * creates the host that contains a proxy to the object encapsulating the widget configuration
     * @returns a promise of the creation, success returns a null object and resolves the promise, 
     *          failure returns a message and rejects it.
     */
    public createHost(): IPromise<string> {
        this.contributionRelativeId = this._options.widget.configurationContributionRelativeId;

        // load the contribution of the config.
        return Service.getService(Contribution_Services.ExtensionService)
            .getContribution(this._options.widget.configurationContributionId)
            .then((contribution: IExtensionContribution) => {
                this.contribution = contribution;

                this.getElement().addClass("widget-configuration-container");

                /* Add class to identify 3rd party widget configurations.
                    This is needed to fix 556790 and will get cleaned up as part of Task 550678
                */
                if (!Contribution_Services.ExtensionHelper.hasInternalContent(contribution)) {
                    $(document).find("#configuration-containers").addClass("third-party");
                }

                // create the extension control and receive a proxy object. 
                return this._createWidgetConfigurationControl();
            })
            .then(null, error => {
                return Q.reject(ErrorMessageHelper.getConsoleMessage(error));
            })
            .then((config: IWidgetConfigurationInternal) => {
                this.widgetConfigProxy = config;

                // call the load method on the proxy as its available to render the widget configuration.
                return this._load();
            })
            .then<string>(null, error => {
                return Q.reject(ErrorMessageHelper.getErrorMessage(error));
            });
    }

    /**
     *  Notifies configuration change by calling the delegate registered for the event.
     */
    public _notifyConfigurationChange(customSettings: WidgetContracts.CustomSettings): IPromise<WidgetContracts.NotifyResult> {
        var widgetStateDeferred: Q.Deferred<WidgetContracts.NotifyResult> = Q.defer<WidgetContracts.NotifyResult>();
        if ($.isFunction(this._options.onConfigurationChangeCallback)) {
            this._options.onConfigurationChangeCallback(customSettings, widgetStateDeferred);
        }
        return widgetStateDeferred.promise;
    }

    public notify<T>(event: string, eventArgs: WidgetContracts.EventArgs<T>): IPromise<WidgetContracts.NotifyResult> {
        switch(event) {
            case WidgetHelpers.WidgetEvent.ConfigurationChange:
                let customEventArgs: WidgetContracts.EventArgs<WidgetContracts.CustomSettings> = (<any>eventArgs);
                let customSettings = customEventArgs.data;
                if (!customSettings || !customSettings.hasOwnProperty('data')) {
                    return Q.reject(Utils_String.format(TFS_Dashboards_Resources.Config_NotifyChangeEvent_BadData, this.contribution.id));
                }
                else {
                    return this._notifyConfigurationChange(customSettings);
                }
            case WidgetConfigHelpers.ConfigurationEvent.ConfigurationError:
                let errorEventArgs: WidgetContracts.EventArgs<string> = (<any>eventArgs);
                this._options.onConfigurationErrorCallback(errorEventArgs.data);
                return Q.resolve();
            default:
                return Q.reject(Utils_String.format(TFS_Dashboards_Resources.ConfigHost_EventNotSupported, event));
        }
    }


    /**
     * Send notification to a listen method in the widget configuration
     * @param event event type string
     * @param eventArgs data to send
     */

    public sendNotification(event: string, eventArgs: WidgetContracts.EventArgs<any>): void {
        if (this.widgetConfigProxy && $.isFunction(this.widgetConfigProxy.listen)) {
            this.widgetConfigProxy.listen(event, eventArgs);
        }
    }

    /**
    *  call that proxies the call to the load method on the widget configuration.
    * @returns a promise of the load operations success or failure.
    */
    public _load(): IPromise<WidgetContracts.WidgetStatus> {
        if (this.widgetConfigProxy && $.isFunction(this.widgetConfigProxy.load)) {
            return this.widgetConfigProxy.load({
                    customSettings: this._options.currentSettings.customSettings,
                    name: this._options.currentSettings.name,
                    size: this._options.currentSettings.size,
                    lightboxOptions: this._options.currentSettings.lightboxOptions
                }, {
                    notify: (event, data) => { return this.notify(event, data);}
                });
        }
        else {
            return WidgetHelpers.WidgetStatusHelper.Failure(TFS_Dashboards_Resources.ConfigHost_NoLoadImplemented, false);
        }
    }

    /**
     * Call getCustomSettings on the widgetConfigProxy and return the customSettings in a promise
     * If getCustomSettings is not implemented by widgetConfigProxy return a rejected promise
     * If getCustomSettings returns object that doesnt conform to WidgetContracts.CustomSettings return a rejected promise
     * If customSettings are invalid return rejected promise
     */
    public validateAndGetSettings(): IPromise<WidgetContracts.CustomSettings> {
        var deferred = Q.defer<WidgetContracts.CustomSettings>();
        if ($.isFunction(this.widgetConfigProxy.onSave)) {
            this.widgetConfigProxy.onSave().then((status: WidgetContracts.SaveStatus) => {    
                // Ensure customSettings follows WidgetContracts.CustomSettings.
                // This check is an overhead for 1st Party as typescript ensures type safety,
                // But 3rd party can send anything via getCustomSettings()
                if (!status || !status.customSettings || !status.customSettings.hasOwnProperty('data')) {
                    deferred.reject(ErrorMessageHelper.getConsoleMessage(TFS_Dashboards_Resources.ConfigHost_onSaveBadData));
                }  
                else {
                    deferred.resolve(status.customSettings);
                }
            }, (status: WidgetContracts.SaveStatus) => {
                if (status && status.isValid === false) {
                    deferred.reject(ErrorMessageHelper.getUserVisiblePlainTextMessage(TFS_Dashboards_Resources.ValidationErrorOnConfigurationSave));
                } else {
                    deferred.reject(ErrorMessageHelper.getConsoleMessage(TFS_Dashboards_Resources.ConfigHost_onSaveRejectedPromise));
                }
            });                       
        }
        else {
            deferred.reject(ErrorMessageHelper.getConsoleMessage(TFS_Dashboards_Resources.ConfigHost_NoOnSave));
        }
        return deferred.promise;
    }

    /**
     * creates the options to be sent to the widget configuration. 
     * @returns options for the configuration host. 
     */
    private setupWidgetConfigOptions():
        Dashboard_Shared_Contracts.WidgetConfigurationOptions {
        var widgetOptions: Dashboard_Shared_Contracts.WidgetConfigurationOptions =
            <Dashboard_Shared_Contracts.WidgetConfigurationOptions>{};
        // currently only first party widget configuraton get options data. 
        // Note: the live title methods will be refactored as part of S95.
        // Note: we should look at encapsulating this on the widget config side as a host service, similar to how its done for the WidgetHostService.
        if (Contribution_Services.ExtensionHelper.hasInternalContent(this.contribution)) {
            widgetOptions.widgetTypeId = this._options.widget.typeId;
            widgetOptions.getCurrentWidgetName = () => { return this._options.getCurrentWidgetName(); };
            widgetOptions.getCurrentWidgetSize = () => { return this._options.getCurrentWidgetSize(); };
            widgetOptions.setCurrentWidgetName = (name: string) => { this._options.setCurrentWidgetName(name); };
        }

        return widgetOptions;
    }

    /**
    * Create the contribution framework extension container control (widget config host) to hold the widget configuration content.
    * @returns a proxy to the widget configuration object to be used by the host for communications.
    */
    public _createWidgetConfigurationControl(): IPromise<IWidgetConfigurationInternal> {

        var widgetConfigurationOptions: Dashboard_Shared_Contracts.WidgetConfigurationOptions =
            this.setupWidgetConfigOptions();

        // instanceId for contributed controls (note that first party configs dont need one as their registration mechanism is done via
        // the registerContent mechanism which uses the hidden initializeConfig handshake options. We should consider transforming
        // first party widget configs to be registered similar 3rd party ones to reduce code branches and simplify code).        
        var instanceId: string =
            Contribution_Services.ExtensionHelper.hasInternalContent(this.contribution) ?
                null :
                this.contributionRelativeId;

        return Contributions_Controls.createContributedControl<IWidgetConfigurationInternal>(
            this.getElement(),
            this.contribution,
            widgetConfigurationOptions,
            null,
            instanceId);
    }  
}
