/// <reference types="jquery" />
/// <reference types="q" />
import Q = require("q");

import Dashboard_Shared_Contracts = require("Dashboards/Scripts/Contracts");
import TFS_Dashboards_Common = require("Dashboards/Scripts/Common");
import TFS_Dashboards_Control_Menus = require("Dashboards/Scripts/Menus");
import TFS_Dashboards_Constants = require("Dashboards/Scripts/Generated/Constants");
import TFS_Dashboards_Resources = require("Dashboards/Scripts/Resources/TFS.Resources.Dashboards");
import TFS_Dashboards_Telemetry = require("Dashboards/Scripts/Telemetry");
import { PinArgs } from "Dashboards/Scripts/Pinning.PushToDashboardInternal";

import TFS_Host_TfsContext = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import TFS_Service = require("Presentation/Scripts/TFS/TFS.Service");

import Dashboards_Services = require("TFS/Dashboards/Services");
import TFS_Dashboards_Contracts = require("TFS/Dashboards/Contracts");
import TFS_Dashboards_WidgetContracts = require("TFS/Dashboards/WidgetContracts");
import WidgetHelpers = require("TFS/Dashboards/WidgetHelpers");
import * as UserPermissionsHelper from "Dashboards/Scripts/Common.UserPermissionsHelper";

import Contribution_Services = require("VSS/Contributions/Services");
import Contributions_Controls = require("VSS/Contributions/Controls");
import Controls = require("VSS/Controls");

import Controls_Menus = require("VSS/Controls/Menus");
import Diag = require("VSS/Diag");
import Performance = require("VSS/Performance");
import Context = require("VSS/Context");
import Service = require("VSS/Service");
import Utils_String = require("VSS/Utils/String");
import SDK_Shim = require("VSS/SDK/Shim");
import VSS = require("VSS/VSS");
import * as Locations from "VSS/Locations";
import Utils_UI = require("VSS/Utils/UI");

import TFS_StatusIndicator = require("VSS/Controls/StatusIndicator");
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");

import WidgetLightBox_Async = require("Dashboards/Scripts/WidgetLightBox");
import Navigation_Services_Async = require("VSS/Navigation/Services");
import TFS_Dashboards_ActionRequiredControl_Async = require("Dashboards/Scripts/ActionRequiredControl");
import { DashboardsPermissionsHelper } from "Dashboards/Components/Directory/DashboardsPermissionsHelper";

import FeatureAvailability_Services = require('VSS/FeatureAvailability/Services');
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import { Spinner, ISpinnerProps, SpinnerSize } from "OfficeFabric/Spinner";
import { Overlay, IOverlayProps } from "OfficeFabric/Overlay";
import * as React from "react";
import * as ReactDOM from "react-dom";


var ErrorMessageHelper = TFS_Dashboards_Common.ErrorMessageHelper;

export function delayLoadActionRequiredControl(element: JQuery, options: Dashboard_Shared_Contracts.IActionRequiredControlOptions): void {
    VSS.requireModules(["Dashboards/Scripts/ActionRequiredControl"]).spread(
        (TFS_Dashboards_ActionRequiredControl: typeof TFS_Dashboards_ActionRequiredControl_Async) => {
            Controls.BaseControl.createIn(TFS_Dashboards_ActionRequiredControl.WidgetNotification, element, options);
        });
}

export function showWidgetAccessNotAvailableDialog(): void {
    VSS.requireModules(["Dashboards/Scripts/ActionRequiredControl"]).spread(
        (TFS_Dashboards_ActionRequiredControl: typeof TFS_Dashboards_ActionRequiredControl_Async) => {
            TFS_Dashboards_ActionRequiredControl.WidgetNotification.showDialog({
                title: TFS_Dashboards_Resources.WidgetNotificationConfigureDialogTitle,
                contentText: TFS_Dashboards_Resources.WidgetNotificationConfigureDialogMessage,
                cssClass: 'configure',
                isRichText: false
            });
        });
}


export interface IWidgetHostOptions {
    // Information needed for the creation of the widget
    widget: TFS_Dashboards_Contracts.WidgetResponse;

    // Contain permission context for the control, typically useful for toggling user context aware behaviour
    dashboardPermission: Dashboard_Shared_Contracts.IDashboardPermissions;

    // Remove callback to remove the host from the parent container
    remove(parent: Dashboard_Shared_Contracts.IWidgetHost): void;

    // Configure callback to configure the host from the parent container
    configure(parent: Dashboard_Shared_Contracts.IWidgetHost): void;

    // Notification callback to indicate that this widget has finished loading.
    isLoaded(parent: Dashboard_Shared_Contracts.IWidgetHost): void;

    // Test-Overridable Factory method.
    widgetFactory: IWidgetFactory;

    /** Widget display mode */
    displayMode: WidgetHostDisplayMode;

    // callback after modifying widgets on dashboard
    widgetsModifiedCallback?: (args: PinArgs) => void;

    /**
     * Instance of gridster
     */
    gridster: Gridster;
}

export enum WidgetHostDisplayMode {
    /** host being used for regular widget rendering */
    widget,
    /** host being used for widget preview during configuration */
    configurationPreview,
    /** host being used for widget lightbox */
    lightbox
}

// This is a special inteface that we used to support all the interface we want to support for the widget
export interface IWidgetInternal extends
    TFS_Dashboards_WidgetContracts.IConfigurableWidget,
    Dashboard_Shared_Contracts.IWidgetCustomMenu,
    Dashboard_Shared_Contracts.IWidgetSettings {

    dispose?: () => void;
    isDisposed?:() => boolean;
}

export class WidgetHostErrorType {
    static Disabled = "VS402615";
    static Timeout = "VS402647";
}

export interface WidgetLoadFailureInformation extends TFS_Dashboards_Telemetry.PublicProjectsTelemetryInformation {
    "ErrorType": string;
}

export var WidgetHostClassSelector = ".widgethost";
export const UnusableWidgetCssClass = "unusable-widget";
export const ExtensionDisabledDialogClass = "extension-disabled-widget";
export const ExtensionDisabledDialogStringFormat = "<p>{0}</p>";
export const NoPermissionsDisabledDialogClass = "no-permission-disabled-widget";
export const StakeholderDialogCssClass = "stakeholder-view";
export const TwoLinePlusLinkStringFormat = "<p>{0}</p><p>{1}</p><p><a href=\"{2}\">{3}</a></p>";

export class WidgetHost extends Controls.Control<IWidgetHostOptions> implements Dashboard_Shared_Contracts.IWidgetHost {
    widget: TFS_Dashboards_Contracts.WidgetResponse;

    private _widgetFactory: IWidgetFactory;
    private _startTime: number;
    private _loadTimeoutTime: number;
    private _widgetLoadTimeoutHandler: number;

    private widgetProxyCreatedDeferred: Q.Deferred<void> = Q.defer<void>();
    private onProxyLoaded: IPromise<void> = this.widgetProxyCreatedDeferred.promise;

    //State model of the underlying widget. Representation can evolve from this.
    public _loadState: Dashboard_Shared_Contracts.WidgetLoadState;
    public _$widgetContainer: JQuery;
    private _loadingControl: WidgetLoadingControl<WidgetLoadingOptions>;
    private _errorControl: WidgetErrorControl<WidgetErrorOptions>;
    public _viewModeMenu: TFS_Dashboards_Control_Menus.WidgetViewMenu;
    public _editOverlayControl: WidgetEditOverlayControl;

    // a reference to the remote instance of the widget.
    public _widgetProxy: IWidgetInternal;

    /**
     * Set to true if the host being used for widget preview during configuration
     */
    private isPreviewHost: boolean;

    /**
    * contribution data for the widget
    */
    public widgetContributionData: IExtensionContribution;

    /**
    * boolean to indicate if the widget can be configured
    */
    private _canConfigureWidget: boolean = false;

    /**
    * keeps track of how many reload counts have been made on the widget.
    */
    private currentReloadCount: number = 0;

    /**
     * scenario mapping widget performance
     */
    private widgetScenario: Performance.IScenarioDescriptor;

    /**
     * current status of the widget
     */
    private _widgetStatus: TFS_Dashboards_WidgetContracts.WidgetStatus;

    /**
    * end time for scenario stored in local state (as we do not want to end the scenario right away but instead once the dashboard is finished loading to reduce telemetry traffic)
    */
    private widgetScenarioEndTime: number;

    private currentUserHasTeamPermissions: boolean;

    private _canShowWidgetMenuState: boolean = true;

    private _isInitialLoad = false;

    private _isEditMode = false;

    constructor(options: IWidgetHostOptions) {
        super(options);
        this.widget = options.widget;
        this.changeLoadState(Dashboard_Shared_Contracts.WidgetLoadState.Loading);
        this._widgetFactory = options.widgetFactory || new WidgetFactory();
        this.isPreviewHost = options.displayMode === WidgetHostDisplayMode.configurationPreview;

        if (this._options.displayMode === null) {
            this._options.displayMode = WidgetHostDisplayMode.widget;
        }
    }

    public dispose(): void {
        if (this._widgetProxy) {
            let hasDispose = typeof this._widgetProxy.dispose === "function";
            let hasIsDisposed = typeof this._widgetProxy.isDisposed === "function";

            // Enhancement doesnt have a interface that we could extend from, we are having to
            // check the presence of both methods explicitly.
            if (hasDispose && hasIsDisposed)
            {
                // in case of 1st party widgets, the widget would already be disposed.
                // this is because gridster.destroy() triggers jquery.remove on the element
                // which internal content host listens to and cleans up itself. Without this check,
                // we are double disposing in case of 1st party widgets. Note that doing it this way
                // proofs us if internal content host changes in the future.
                if (!this._widgetProxy.isDisposed()) {
                    this._widgetProxy.dispose();
                    this._widgetProxy = null;
                }
            }
        }

        super.dispose();
    }

    public focusConfigurationMenu(): void {
        if (this._isEditMode) {
            if (this._editOverlayControl && this._editOverlayControl.isShowing()) {
               this.getElement().find("." + TFS_Dashboards_Constants.DomClassNames.WidgetEditMenuButton).first().focus();
            }
        }
        else {
            if (this._viewModeMenu) {
                this._viewModeMenu.getMenuBar().getElement().removeClass(TFS_Dashboards_Constants.DomClassNames.WidgetHideMenu);
                this._viewModeMenu.getMenuBar().getElement()[0].focus();
            }
        }
    }

    public onInitializationComplete(): IPromise<void> {
        return this.onProxyLoaded;
    }

    public isInitialized(): boolean {
        return !!this._$widgetContainer;
    }

    public isInitialLoad(): boolean {
        return this._isInitialLoad;
    }

    /**
     * From the option, take the information if the user can edit or not the widget
     * @returns {boolean} : True if can edit, False if cannot
     */
    public _canEdit(): boolean {
        return this._options && this._options.dashboardPermission && this._options.dashboardPermission.canEdit;
    }

    public _canSeeContextMenuActions(): boolean {
        return this._options.displayMode == WidgetHostDisplayMode.widget && this._options.widget.isEnabled;
    }

    public onDashboardLoaded(): void {
        if (this.widgetScenario && this.widgetScenario.isActive()) {
            this.widgetScenario.end(this.widgetScenarioEndTime);
        }
        if (this._widgetProxy && $.isFunction(this._widgetProxy.onDashboardLoaded)) {
            this._widgetProxy.onDashboardLoaded();
        }
    }

    public getWidget(): TFS_Dashboards_Contracts.WidgetResponse {
        return this.widget;
    }

    public getPerformanceScenario(): Performance.IScenarioDescriptor {
        return this.widgetScenario;
    }

    public load(isInitialLoad: boolean): void {
        this._isInitialLoad = isInitialLoad;
        this.currentUserHasTeamPermissions = UserPermissionsHelper.CanReadDashboards()

        this._createWidgetContainer();

        this._setInitialWidgetSize();

        if (!this.widget.isEnabled) {
            delayLoadActionRequiredControl(this.getElement(), this.getOptionsForDisabledWidgetView());
            let userType = TFS_Dashboards_Telemetry.PublicProjectsTelemetryHelper.getUserType();
            let errorType = "ExtensionNotAvailable"
            if (!this.widget.isEnabled && (userType == TFS_Dashboards_Telemetry.UserType.Anonymous || userType == TFS_Dashboards_Telemetry.UserType.Public)) {
                errorType = "BlockedForPublic";
            }
            TFS_Dashboards_Telemetry.DashboardsTelemetry.onWidgetLoadFailed("", this.widget.contributionId, WidgetHost.getWidgetFailureTelemetryData(errorType));
            this.notifyLoadSucceeded();
            return;
        }

        this._loadContributionDataForWidget(this.widget.contributionId).then((contribution: IExtensionContribution) => {

            if (!contribution || this.widget.areSettingsBlockedForUser) {
                this.widget.isEnabled = false;
                delayLoadActionRequiredControl(this.getElement(), this.getOptionsForDisabledWidgetView());
                let errorType = "ContributionNotLoaded";
                if (this.widget.areSettingsBlockedForUser) {
                    errorType = "WidgetSettingsBlocked";
                }
                TFS_Dashboards_Telemetry.DashboardsTelemetry.onWidgetLoadFailed("", this.widget.contributionId, WidgetHost.getWidgetFailureTelemetryData(errorType));
                this.notifyLoadSucceeded();
                return;
            }

            this.widgetContributionData = contribution;

            // start the widget loading scenario.
            this.setupWidgetScenario();

            this._createWidget().then(() => {
                    this.widgetProxyCreatedDeferred.resolve(null);
                });
        }, (error) => {
            TFS_Dashboards_Telemetry.DashboardsTelemetry.onWidgetLoadFailed(error, this.widget.contributionId, WidgetHost.getWidgetFailureTelemetryData("WidgetError"));
        });
    }

    // Public so it can be stubbed in testing
    public static getWidgetFailureTelemetryData(errorType: string): WidgetLoadFailureInformation {
        return {
            ...TFS_Dashboards_Telemetry.PublicProjectsTelemetryHelper.getPublicProjectsTelemetryData(),
            "ErrorType": errorType
        }
    }

    private setupWidgetScenario(): void {
        this.widgetScenario = Performance.getScenarioManager().startScenario(
            TFS_Dashboards_Telemetry.DashboardsTelemetryConstants.Area,
            TFS_Dashboards_Telemetry.DashboardScenarios.WidgetLoad);

        this.widgetScenario.addData({ widgetTypeId: this.widget.contributionId, widgetId: this.widget.id });
    }

    // Return the contribution for given contributionId wrapped in a promise from the ExtensionService
    // If the promise from the ExtensionService is rejected, then _loadContributionPromise returns a null
    // This is done to do the error handling in the caller of _loadContributionDataForWidget method
    // Made public for UTs
    public _loadContributionDataForWidget(contributionId: string): IPromise<IExtensionContribution> {
        var promise = jQuery.Deferred<IExtensionContribution>();
        return Service.getService(Contribution_Services.ExtensionService).getContribution(contributionId).
            then((contribution: IExtensionContribution) => {
                promise.resolve(contribution);
                return promise;
            }, () => {
                promise.resolve(null);
                return promise;
            });
    }

    public onConfigureWidget(dashboardMenuMode: string): void {
        TFS_Dashboards_Telemetry.DashboardsTelemetry.onConfigureWidget(
            this.widget.contributionId,
            TFS_Dashboards_Common.DashboardPageExtension.getActiveDashboard(),
            this.widget.id,
            dashboardMenuMode);
        this.configure();
    }

    public onOpenLightbox(): void {
        TFS_Dashboards_Telemetry.DashboardsTelemetry.onShowWidgetLightbox(
            TFS_Dashboards_Common.DashboardPageExtension.getActiveDashboard(),
            this.widget.contributionId,
            this.widget.id);

        // Only show lightbox if widget doesn't have an error
        // If widget has error it probably needs reconfiguration and will error out in lightbox too
        if (this._loadState === Dashboard_Shared_Contracts.WidgetLoadState.Loaded
            || this._loadState === Dashboard_Shared_Contracts.WidgetLoadState.Loading) {

            VSS.requireModules(["Dashboards/Scripts/WidgetLightBox", "VSS/Navigation/Services"]).spread(
                (WidgetLightBox: typeof WidgetLightBox_Async,
                    Navigation_Services: typeof Navigation_Services_Async) => {

                    var widgetLightBoxOptions = <Dashboard_Shared_Contracts.WidgetLightboxOptions>{
                        widgetData: this.widget,
                        addToDashboardCallback: this._options.widgetsModifiedCallback,
                        animateFromRectangle: {
                            width: this.getWidgetContainer().outerWidth(),
                            height: this.getWidgetContainer().outerHeight(),
                            top: this.getWidgetContainer().offset().top,
                            left: this.getWidgetContainer().offset().left
                        }
                    };

                    this._widgetProxy.listen(
                        WidgetHelpers.WidgetEvent.LightboxOptions,
                        WidgetHelpers.WidgetEvent.Args((data: Dashboard_Shared_Contracts.WidgetLightboxOptions) => {
                            widgetLightBoxOptions.title = data.title;
                            widgetLightBoxOptions.subtitle = data.subtitle;
                        }));

                    var dialogContainer = WidgetLightBox.WidgetLightboxDialog.create(
                        WidgetLightBox.WidgetLightboxDialog,
                        widgetLightBoxOptions
                    );

                    Navigation_Services.getHistoryService().attachNavigate(() => {
                        dialogContainer.close();
                    });
                });
        }
    }

    public onRemoveWidget(dashboardMenuMode: string): void {
        TFS_Dashboards_Telemetry.DashboardsTelemetry.onRemoveWidget(
            this.widget.contributionId,
            TFS_Dashboards_Common.DashboardPageExtension.getActiveDashboard(),
            dashboardMenuMode);
        this.remove();
    }

    /**
     * Create the edit overlay if the user can edit
     */
    public _createEditOverlay(): void {
        if (this._canEdit()) {
            if (this._editOverlayControl) {
                this._editOverlayControl.dispose();
                this._editOverlayControl = null;
            }

            this._editOverlayControl = <WidgetEditOverlayControl>WidgetEditOverlayControl.createIn(WidgetEditOverlayControl,
                this.getElement(),
                <IWidgetEditOverlayOption>{
                    widget: this.widget,
                    canConfigure: () => { return this.canConfigure(); },
                    configure: () => {
                        this.onConfigureWidget(TFS_Dashboards_Telemetry.DashboardsTelemetryConstants.DashboardEditModeMenu);
                    },
                    remove: () => {
                        this.onRemoveWidget(TFS_Dashboards_Telemetry.DashboardsTelemetryConstants.DashboardEditModeMenu);
                    },
                    gridster: this._options.gridster,
                    widgetHostParent: this.getElement().parent(),
                    widgetPosition: this.widget.position
                });

            //Place the overlay before the widget, so that while tabbing user gets to the overlay first and not the widget
            this._$widgetContainer.before(this._editOverlayControl.getElement());
        }
    }

    /*
     Verifies that the given promise wraps an object of type WidgetStatus.
     If the WidgetStatus is success, then a resolved promise is returned.
     If the WidgetStatus is failure, then a rejected promise with the errorMessage from the Widget Status object is returned
     If given promise is not valid or does not hold object of type WidgetStatus then, a rejected promise with the message
     TFS_Dashboards_Resources.Widget_Load_Invalid_WidgetStatus is returned.
    */
    private widgetStatusPromiseVerifier(statusPromise: IPromise<TFS_Dashboards_WidgetContracts.WidgetStatus>, methodName: string): IPromise<string> {
        // check if promise
        var verifierPromise = Q.defer<string>();
        var invalidStatusMessage: string = Utils_String.format(TFS_Dashboards_Resources.Widget_Load_Invalid_WidgetStatus, methodName);

        if (statusPromise == null || !Q.isPromiseAlike(statusPromise)) {
            verifierPromise.reject(ErrorMessageHelper.getErrorMessage(invalidStatusMessage));
        } else {
            statusPromise.then((status: TFS_Dashboards_WidgetContracts.WidgetStatus) => {
                this._widgetStatus = status;
                if (!status) {
                    verifierPromise.reject(ErrorMessageHelper.getConsoleMessage(invalidStatusMessage));
                }
                else {
                    verifierPromise.resolve(status.state);
                }
            }, error => {
                this._widgetStatus = null;
                var errorMessage = ErrorMessageHelper.getErrorMessage(error);
                verifierPromise.reject(errorMessage);
            });
        }

        return verifierPromise.promise;
    }

    // If widget has implemented preload(), then call it and verify the promise returned by it
    private _preload(widgetSettings: TFS_Dashboards_WidgetContracts.WidgetSettings): IPromise<{}> {
        if (this._widgetProxy && $.isFunction(this._widgetProxy.preload)) {
            try {
                return this.widgetStatusPromiseVerifier(this._widgetProxy.preload(widgetSettings), 'preload');
            } catch (e) {
                return Q.reject(ErrorMessageHelper.getErrorMessage(e));
            }
        }

        // If preload does not exist, then we do not block or show error control. We move on.
        return Q.resolve(null);
    }

    private _showLightbox(): IPromise<void> {
        if (this._widgetProxy && $.isFunction(this._widgetProxy.lightbox)) {
            return this.widgetStatusPromiseVerifier(
                this._widgetProxy.lightbox(this._getWidgetSettings(), this._getLightboxSize()), 'lightbox'
            )
                .then(() => {
                    this.notifyLoadSucceeded();
                }, (error: TFS_Dashboards_WidgetContracts.ErrorMessage) => {
                    this.notifyLoadFailed(error.message, error.isUserVisible, error.isRichText);
                });
        }

        // If lightbox does not exist, then we do not block or show error control. We move on.
        return Q.resolve(null);
    }

    public notifyLightboxResized(size: TFS_Dashboards_WidgetContracts.Size): void {
        if (this._widgetProxy && $.isFunction(this._widgetProxy.listen)) {
            this._widgetProxy.listen(WidgetHelpers.WidgetEvent.LightboxResized, WidgetHelpers.WidgetEvent.Args(size));
        }
    }

    // Call load() implemented by the widget and verify the promise returned by it
    private _load(widgetSettings: TFS_Dashboards_WidgetContracts.WidgetSettings): IPromise<{}> {
        try {
            return this.widgetStatusPromiseVerifier(this._widgetProxy.load(widgetSettings), 'load');
        } catch (e) {
            return Q.reject(ErrorMessageHelper.getErrorMessage(e));
        }
    }

    /*
        Call preload and load methods implemented by the widget
        If preload fails or load fails then call notifyLoadFailed
        If preload succeeds, then call load
        If load succeeds, then call notifyLoadSucceeded
    */

    public _preloadAndload(widgetSettings: TFS_Dashboards_WidgetContracts.WidgetSettings): IPromise<void> {
        return this._preload(widgetSettings)
            .then(() => this._load(widgetSettings)
            .then(() => this.notifyLoadSucceeded()))
            .then(null, (error: TFS_Dashboards_WidgetContracts.ErrorMessage) => {
                this.notifyLoadFailed(error.message, error.isUserVisible, error.isRichText);
            });
    }

    /*
        @returns a boolean wrapped in a promise that denotes if stakeholder view should be shown
    */
    private isStakeholderViewNeeded(widgetSettings: TFS_Dashboards_WidgetContracts.WidgetSettings): IPromise<boolean> {
        if (this._widgetProxy
            && $.isFunction(this._widgetProxy.disableWidgetForStakeholders)
            && UserPermissionsHelper.Utils.isStakeholder()) {
            return this._widgetProxy.disableWidgetForStakeholders(widgetSettings);
        }
        return Q(false);
    }

    public getExtensionDisabledDialogOptions(options: Dashboard_Shared_Contracts.IWidgetNotificationOptions): Dashboard_Shared_Contracts.IWidgetNotificationOptions {
        options.dialogOptions = {
            title: TFS_Dashboards_Resources.ExtensionDisabledWidget_DialogHeading,
            contentText: Utils_String.format(ExtensionDisabledDialogStringFormat,
                TFS_Dashboards_Resources.ExtentionDisabledWidget_DialogContentText),
            cssClass: ExtensionDisabledDialogClass,
            isRichText: true
        }

        return options;
    }

    public getNoPermissionsDialogOptions(options: Dashboard_Shared_Contracts.IWidgetNotificationOptions): Dashboard_Shared_Contracts.IWidgetNotificationOptions {
        
        options.dialogOptions = {
            title: TFS_Dashboards_Resources.DisabledWidget_DialogHeading,
            contentText: Utils_String.format(TwoLinePlusLinkStringFormat,
                TFS_Dashboards_Resources.DisabledWidget_DialogContentText_DialogSubHeading,
                TFS_Dashboards_Resources.DisabledWidget_DialogMessage,
                TFS_Dashboards_Common.FwLinks.PublicAnonLearnMore,
                TFS_Dashboards_Resources.DisabledWidgets_DialogLicenseTypesLinkText_AzureDevOps 
            ),
            cssClass: NoPermissionsDisabledDialogClass,
            isRichText: true
        }

        return options
    }

    /*
        Returns the options needed to create a WidgetNotification control for the Disabled widget view
    */
    public getOptionsForDisabledWidgetView(): Dashboard_Shared_Contracts.IWidgetNotificationOptions {
        let teamPermission = DashboardsPermissionsHelper.showMemberErrorMessage();

        let options = <Dashboard_Shared_Contracts.IWidgetNotificationOptions>{
            titleName: this.widget.name,
            message: "",
            linkText: "",
            ariaLabel: Utils_String.format(TFS_Dashboards_Resources.DisabledWidget_ScreenReaderSupportText, this.widget.name),
            cssClass: UnusableWidgetCssClass,
            widgetSize: this.widget.size,
            imageUrl: Locations.urlHelper.getVersionedContentUrl("Dashboards/unusable-widget-background.png"),
            isImageOptionalBackground: true
        };

        if (teamPermission) {
            this.getExtensionDisabledDialogOptions(options);
        } else {
            this.getNoPermissionsDialogOptions(options);
        }

        return options;
    }

    /*
        Returns the options needed to create a WidgetNotification control for the Stakeholder view
    */
    public getOptionsForStakeholderView(): Dashboard_Shared_Contracts.IWidgetNotificationOptions {

        var tfsContext = TFS_Host_TfsContext.TfsContext.getDefault();

        var dialogContent = Utils_String.format(TwoLinePlusLinkStringFormat,
            TFS_Dashboards_Resources.StakeholderView_DialogSubHeading,
            TFS_Dashboards_Resources.StakeholderView_DialogMessage,
            tfsContext.isHosted ? TFS_Dashboards_Common.FwLinks.StakeholderLicenseHosted : TFS_Dashboards_Common.FwLinks.StakeholderLicenseOnPrem,
            Utils_String.format(TFS_Dashboards_Resources.StakeholderView_DialogLicenseTypesLinkText,
                tfsContext.isHosted ? VSS_Resources_Common.TeamFoundationServiceName : VSS_Resources_Common.TeamFoundationServerName));


        var options = <Dashboard_Shared_Contracts.IWidgetNotificationOptions>{
            titleName: this.widget.name,
            message: "",
            linkText: "",
            ariaLabel: Utils_String.format(TFS_Dashboards_Resources.WidgetNotificationStakeholder_ScreenReaderSupportText, this.widget.name),
            cssClass: UnusableWidgetCssClass,
            widgetSize: this.widget.size,
            imageUrl: Locations.urlHelper.getVersionedContentUrl("Dashboards/unusable-widget-background.png"),
            isImageOptionalBackground: true,
            dialogOptions: {
                title: TFS_Dashboards_Resources.StakeholderView_DialogHeading,
                contentText: dialogContent,
                cssClass: StakeholderDialogCssClass,
                isRichText: true,
                height: "auto",
                width: 610
            }
        };

        return options;
    }

    /**
     * Sets the host element size as specified for this widget
     */
    public _setInitialWidgetSize(): void {
        if (this.isPreviewHost) {
            this._sizeWidgetForPreview();
        } else {
            this.resizeWidget();
        }
    }

    /**
     * Create loading control, contributed control and then call preload() and load() on the widget
     */
    public _createWidget(): IPromise<void> {
        this._startLoadingControl();
        return this._widgetFactory.createWidgetContainer(this.widgetContributionData, this.widget, this).then(
            (widget: IWidgetInternal) => {
                this._widgetProxy = widget;

                this._setCustomTimeOut();

                if (!this._validateWidgetContracts()) {
                    return;
                }

                var widgetSettings = this._getWidgetSettings();

                this.isStakeholderViewNeeded(widgetSettings).then((showStakeholderView: boolean) => {
                    if (showStakeholderView) {
                        // Empty the widget container, so that there is no leftover content from the widget creation that happened during Contributions_Controls.createContributedControl()
                        this.getWidgetContainer().empty();
                        delayLoadActionRequiredControl(this.getElement(), this.getOptionsForStakeholderView());
                        this.notifyLoadSucceeded();
                    } else {
                        if (this._options.displayMode !== WidgetHostDisplayMode.lightbox) {
                            this._preloadAndload(widgetSettings);
                        }
                        else {
                            this._showLightbox();
                        }
                    }
                });

            }, (error) => {
                this.notifyLoadFailed(error, false);
            });
    }

    private _getWidgetSettings(): TFS_Dashboards_WidgetContracts.WidgetSettings {
        return <TFS_Dashboards_WidgetContracts.WidgetSettings>{
            name: this.widget.name,
            size: this.widget.size,
            customSettings: {
                data: this.widget.settings,
                version: this.widget.settingsVersion
            },
            lightboxOptions: this.widget.lightboxOptions
        };
    }

    private _getLightboxSize(): TFS_Dashboards_WidgetContracts.Size {
        return <TFS_Dashboards_WidgetContracts.Size>{
            width: this.widget.lightboxOptions.width || Dashboard_Shared_Contracts.WidgetLightboxDialogConstants.defaultWidth,
            height: this.widget.lightboxOptions.height || Dashboard_Shared_Contracts.WidgetLightboxDialogConstants.defaultHeight
        }
    }

    /**
   * This would check the getTimeout method of the widget and reset the loading experience to a different timeout period. Currently supported for first parties only.
   */
    public _setCustomTimeOut(): void {
        if (this._widgetProxy &&
            $.isFunction(this._widgetProxy.getCustomTimeout) &&
            Contribution_Services.ExtensionHelper.hasInternalContent(this.widgetContributionData)) {
            this._widgetProxy.getCustomTimeout().then((timeout: number) => {
                // stop existing timeout
                this._stopLoadingTimer();

                // start with the new timer. Note that a slight delay in creating the control will allow a little affordance on the error experience for the widget but that
                // is acceptable.
                this._startLoadingTimer(timeout);
            });
        } else {
            // do nothing, default loading experience takes care of the rest.
        }
    }

    /**
     * This would check the getMenu method of the widget and create the custom menu as needed.
     * Note: this code is pending UTs.
     */
    private buildWidgetCustomMenu(widgetSettings: TFS_Dashboards_WidgetContracts.WidgetSettings): void {
        if (this._widgetProxy && $.isFunction(this._widgetProxy.getMenu) && this.currentUserHasTeamPermissions) {
            this._widgetProxy.getMenu(widgetSettings).then((customMenu) => {
                this._createViewModeMenu(customMenu);
                this._hideWidgetMenuInEditMode();
            });
        } else {
            this._createViewModeMenu();
            this._hideWidgetMenuInEditMode();
        }
    }

    /**
     *  in the case when a new widget is added, the widget menu is created in edit mode (unlike the normal case where its created in view mode), so we hide it.
     */
    private _hideWidgetMenuInEditMode(): void {
        if (this._editOverlayControl && this._editOverlayControl.isShowing() && this._viewModeMenu) {
            this._viewModeMenu.hideElement();
        }
    }

    /**
     * Takes a user-friendly error message and an error code and returns a combined string together
     * @param message The user-friendly error message
     * @param errorCode The code of the error that has occurred
     */
    public _getErrorMessage(message: string, errorCode: string): string {
        return Utils_String.format("{0}: {1}", errorCode, message);
    }

    /**
     * Used when the widget fails to load and an error should be shown.
     * @param errorMessage The user-friendly error message which gives context on the error
     * @param errorCode The error code itself to show along with the message
     */
    public showUnhandledLoadException(errorMessage: string, errorCode: string, isUserVisible: boolean = true): void {
        var error = {
            message: this._getErrorMessage(errorMessage, errorCode),
            widgetName: this.widget.name,
            isUserVisible: isUserVisible,
            isRichText: false
        };

        this._notifyLoadFailedDetailed(error, Dashboard_Shared_Contracts.WidgetLoadState.UnhandledException);
    }

    public getWidgetContainer() {
        //Host control instantiation produces mismatched types- If any widget fails out, we will collapse the element, and present error.
        return this._$widgetContainer;
    }

    public resizeWidget() {
        var hostWidth = WidgetHelpers.WidgetSizeConverter.ColumnsToPixelWidth(this.widget.size.columnSpan);
        var hostHeight = WidgetHelpers.WidgetSizeConverter.RowsToPixelHeight(this.widget.size.rowSpan);

        if (this._options.displayMode !== WidgetHostDisplayMode.lightbox) {
            this._$widgetContainer
                .css("overflow", "hidden")
                .css("width", hostWidth)
                .css("height", hostHeight)
                .css("position","absolute");
        }
    }

    /**
     * Update the widget position as per grid
     * @param row
     * @param column
     */
    public rePosition(row: number, column: number): void {
        this.widget.position.row = row;
        this.widget.position.column = column;
    }

    /**
     * This method ensures that the widget preview's size will match the container when resizing during configuration.
     */
    public _sizeWidgetForPreview(): void {
        this._$widgetContainer
            .css("overflow", "hidden")
            .css("width", "100%")
            .css("height", "100%")
            .css("position", "absolute");
    }

    private remove() {
        this._options.remove(this);
    }

    public configure() {
        this._options.configure(this);
    }

    /**
     * Create the widget menu based on user's permission.
     * @param customMenu - additional menu item we want to add to the widget menu
     */
    public _createViewModeMenu(customMenu: Controls_Menus.IMenuItemSpec[] = null): void {
        // only add the standard menu (config & delete) if the user is an admin, this avoids the cost of having the DOM element for it
        // when not needed. Also since we dont do realtime bindings, all updates on permissions happen through page refresh
        // in which case this control gets reconstructed with the right permission bindings.
        var configCallback: () => void;
        var removeCallback: () => void = null;
        if (this._canSeeContextMenuActions() && UserPermissionsHelper.CanEditDashboard()) {
            configCallback = this.canConfigure() ?
                () => {
                    this.onConfigureWidget(TFS_Dashboards_Telemetry.DashboardsTelemetryConstants.DashboardViewModeMenu);
                }
                : null;
            // If the user have the permission to edit, they should be able to remove widget as well.
            removeCallback = () => {
                this.onRemoveWidget(TFS_Dashboards_Telemetry.DashboardsTelemetryConstants.DashboardViewModeMenu);
            };
        }

        if (
            this._canSeeContextMenuActions()
            || configCallback
            || (customMenu && customMenu.length > 0)
            || this.canLightbox()
        ) {
            // Question: Is the menu ever expected to change on reload? If not, then the better fix here is to just not
            // do anything if the menu is already created. This fix (disposing existing menu) is safe without knowing the answer to that question.
            if (this._viewModeMenu) {
                this._viewModeMenu.dispose();
            }
            
            this._viewModeMenu = <TFS_Dashboards_Control_Menus.WidgetViewMenu>TFS_Dashboards_Control_Menus.WidgetViewMenu.createIn(
                TFS_Dashboards_Control_Menus.WidgetViewMenu,
                this.getElement(),
                <TFS_Dashboards_Control_Menus.WidgetViewMenuOptions>{
                    menuIconType: "bowtie-icon bowtie-ellipsis",
                    configureCallback: configCallback,
                    // Passing null to disable lightbox button if widget doesn't support it
                    openLightboxCallback: this.canLightbox() ? () => { this.onOpenLightbox() } : null,
                    menuItems: customMenu,
                    $ancestorContainer: this.getElement().closest(WidgetHostClassSelector),
                    widgetData: this.widget,
                    addToDashboardCallback: this._options.widgetsModifiedCallback,
                    removeCallback: removeCallback
                });
        }
    }

    public canConfigure(): boolean {
        return this._canConfigureWidget =
            this._canShowWidgetMenuState &&
            this.widget.isEnabled &&
            (this.widget.isNameConfigurable ||
            (this.widget.configurationContributionId != null && this.widget.configurationContributionId != ""));
    }

    public canLightbox(): boolean {
        return !!this.widget.lightboxOptions &&
            this._options.displayMode !== WidgetHostDisplayMode.lightbox &&
            this._canShowWidgetMenuState &&
            this.widget.isEnabled &&
            this._widgetStatus &&
            this._widgetStatus.statusType != TFS_Dashboards_WidgetContracts.WidgetStatusType.Unconfigured;
    }

    // call into the widget proxy to identify if the widget has entered a state where it cannot be configured.
    private _canShowWidgetMenu(): IPromise<boolean> {
        if (this._widgetProxy && $.isFunction(this._widgetProxy.canShowWidgetMenu)) {
            return this._widgetProxy.canShowWidgetMenu();
        }

        return Q.resolve(true);
    }

    private _validateWidgetContracts(): boolean {
        var error = <Dashboard_Shared_Contracts.IWidgetErrorDetails>{
            errorType: Dashboard_Shared_Contracts.WidgetErrorType.Render,
            message: undefined,
            widgetName: this.widget.name,
            isUserVisible: false,
            isRichText: false
        };

        if (this._widgetProxy == null || !$.isFunction(this._widgetProxy.load)) {
            // if widget has not implemented the load() method, throw an error control.
            error.message = TFS_Dashboards_Resources.Widget_Noload;
        } else if (this.canConfigure() && !$.isFunction(this._widgetProxy.reload)) {
            // if configurable widget has not implemented the reload() method, throw an error control.
            error.message = TFS_Dashboards_Resources.WidgetConfiguration_NoReload;
        }

        if (error.message) {
            this._notifyLoadFailedDetailed(error, Dashboard_Shared_Contracts.WidgetLoadState.UnhandledException);
            return false;
        }

        return true;
    }

    public _createWidgetContainer() {
        this._$widgetContainer = $("<div />").addClass("widget-container");
        this._$widgetContainer.appendTo(this.getElement());
    }

    private changeLoadState(desiredState: Dashboard_Shared_Contracts.WidgetLoadState): boolean {
        // We can only change the widget load state, if we're starting as uninitialized.
        // Once initialized, any supplemental events are not actionable.
        // Returns indicator of if the state changed.

        var changedState: boolean = false;
        if (this._loadState === Dashboard_Shared_Contracts.WidgetLoadState.Loading || this._loadState === undefined) {
            this._loadState = desiredState;
            changedState = true;
        }
        //Task 471762: [Todo] WidgetHost : How do we record or report erroneous calls
        return changedState;
    }

    public getLoadState(): Dashboard_Shared_Contracts.WidgetLoadState {
        return this._loadState;
    }

    public getWidgetStatus(): TFS_Dashboards_WidgetContracts.WidgetStatus {
        return this._widgetStatus;
    }

    public notifyLoadSucceeded() {
        this._stopLoadingTimer();
        if (this.changeLoadState(Dashboard_Shared_Contracts.WidgetLoadState.Loaded)) {
            this.notifyAsLoaded("success");
        }

        if (this.widgetScenario) {
            this.widgetScenarioEndTime = Performance.getTimestamp();
        }
    }

    public notifyLoadFailed(error: string, isUserVisible: boolean = true, isRichText: boolean = false): void {
        this._stopLoadingTimer();

        this._notifyLoadFailedDetailed({
            message: error,
            widgetName: this.widget.name,
            isUserVisible: isUserVisible,
            isRichText: isRichText
        });

        TFS_Dashboards_Telemetry.DashboardsTelemetry.onWidgetLoadFailed(error, this.widgetContributionData.id, WidgetHost.getWidgetFailureTelemetryData("WidgetError"));

        if (this.widgetScenario) {
            this.widgetScenario.abort();
        }
    }

    public _notifyLoadFailedDetailed(errorDetails: Dashboard_Shared_Contracts.IWidgetErrorDetails,
        state: Dashboard_Shared_Contracts.WidgetLoadState = Dashboard_Shared_Contracts.WidgetLoadState.Failed): void {
        this._stopLoadingTimer();
        // View mode menu creation may not run yet, if widget failed right away
        if (typeof this._viewModeMenu !== "undefined" && this._viewModeMenu !== null) {
            this._viewModeMenu.removeLightboxButton();
        }

        //Put the error in place of the widget.
        this._showErrorInWidget(errorDetails, state);

        this.notifyAsLoaded(errorDetails.message);
    }

    /**
     * Hide the content of the widget to display the error message
     * @param errorDetails
     */
    public _showErrorInWidget(errorDetails: Dashboard_Shared_Contracts.IWidgetErrorDetails,
        state: Dashboard_Shared_Contracts.WidgetLoadState = Dashboard_Shared_Contracts.WidgetLoadState.Failed): void {
        this.changeLoadState(state);
        this.getWidgetContainer().css("display", "none");
        this._errorControl = this._widgetFactory.createErrorWidget(this, errorDetails, this.widget, this.widgetContributionData);

        //Prepend the error control, for correct tab-order.
        this._errorControl.getElement().prependTo(this.getElement());
    }

    /**
     * Remove the error control to display the content of the widget
     */
    private hideErrorInWidget(): void {
        if (this._errorControl) {
            this._errorControl.getElement().remove();
            this._errorControl = null;
            this.getWidgetContainer().css("display", "block");
        }
    }

    /**
     * Start showing loading control and display loading experience if control doens't load for some time
     * @param overlayImmediately - when widget is created, overlay loading control immediately
     * but during reload, overlay loading control only timer has expired
     */
    public _startLoadingControl(overlayImmediately: boolean = true) {
        if (overlayImmediately) {
            this._loadingControl = this._widgetFactory.createLoadingWidget(this, this.widget, this._options.displayMode);
        }

        setTimeout(() => {
            // If widget still hasn't loaded, show the loading experience
            if (this._loadState === Dashboard_Shared_Contracts.WidgetLoadState.Loading) {
                if (!this._loadingControl) {
                    this._loadingControl = this._widgetFactory.createLoadingWidget(this, this.widget, this._options.displayMode);
                }
                this._loadingControl.showLoading();
            }
        }, TFS_Dashboards_Common.ClientConstants.WidgetLoadingAnimationStartTimeoutMs);
        this._startLoadingTimer(TFS_Dashboards_Common.ClientConstants.WidgetLoadingTimeoutErrorMs);
    }

    /**
     * Indicate if the loading control is present or not at the screen
     * @returns {boolean} True if loading is still displayed; False if not
     */
    public isShowingLoading(): boolean {
        if (this._loadingControl) {
            return this._loadingControl.isShowingLoading();
        }
        else {
            return false;
        }
    }

    private disposeLoading(): void {
        if (this._loadingControl) {
            this._loadingControl.dispose();
            this._loadingControl = null;
        }
    }

    /**
    * This method is called after a widget notifies success or failure for post widget load operations, such as closing the loading experience and telemetry.
    */
    private notifyAsLoaded(result: string): void {
        this.disposeLoading();

        this._canShowWidgetMenu().then((show: boolean) => {
            if (this.isDisposed()) {
                return;
            }

            this._canShowWidgetMenuState = show;
            this._createEditOverlay();
            this.onModeChange(this._isEditMode);
            this.buildWidgetCustomMenu(this._getWidgetSettings());

            //Notify owner that we are now loaded. This is for "aggregate telemetry" of "page scope" completion.
            if (this._options.isLoaded) {
                this._options.isLoaded(this);
            }
        });
    }

    public reload(settings: Dashboard_Shared_Contracts.ISettings): IPromise<TFS_Dashboards_WidgetContracts.WidgetStatus> {
        // check if the _widgetProxy is loaded. It is possible to not be loaded if the config is opened and actionable before the preview
        // starts loading. This blocks refresh till the preview host is ready.
        if (this._widgetProxy != null) {
            // we clear any error overlays before refreshing widget settings, so that widget can paint the correct behaviour
            this.hideErrorInWidget();

            //Change the widgetHost state to loading, otherwise the error thrown during config won't trigger a error widget
            this._loadState = Dashboard_Shared_Contracts.WidgetLoadState.Loading;

            // recreate the loading experience for the latest data.
            if (this._loadingControl) {
                this.disposeLoading();
                this._stopLoadingTimer();
            }

            this._startLoadingControl(false);

            var widgetSettings = <TFS_Dashboards_WidgetContracts.WidgetSettings>{
                name: settings.generalSettings.WidgetName,
                size: settings.generalSettings.WidgetSize,
                customSettings: settings.customSettings
            };

            this.widget.size = widgetSettings.size; // Update the widget size. Required for subsequent calls that might need to have the right widget size to render (e.g. Error)

            if (this.getLoadState() !== Dashboard_Shared_Contracts.WidgetLoadState.UnhandledException) {
                var currentReload: number = ++this.currentReloadCount;
                var statusPromise: IPromise<TFS_Dashboards_WidgetContracts.WidgetStatus> = this._widgetProxy.reload(widgetSettings);
                return this.widgetStatusPromiseVerifier(statusPromise, "reload").then((state: string) => {
                    if (this.isDisposed()) {
                        return WidgetHelpers.WidgetStatusHelper.Success();
                    }

                    this.buildWidgetCustomMenu(widgetSettings);

                    // only allow the loading control to be removed once the latest refresh request has completed.
                    // Note: this cannot handle the case where widget has promises for earlier refresh requests that finish after this and cause a relayout.
                    // each widget will need to individually keep track of that.
                    if (currentReload === this.currentReloadCount) {
                        this.notifyLoadSucceeded();
                        return WidgetHelpers.WidgetStatusHelper.Success(state);
                    }
                }, (e: TFS_Dashboards_WidgetContracts.ErrorMessage) => {
                    if (currentReload === this.currentReloadCount) {
                        this.notifyLoadFailed(e.message, e.isUserVisible, e.isRichText);
                        return WidgetHelpers.WidgetStatusHelper.Failure(e.message, e.isUserVisible, e.isRichText);
                    }
                });
            }
        }
        else {
            return WidgetHelpers.WidgetStatusHelper.Failure(
                TFS_Dashboards_Resources.WidgetHost_NotifyBeforePreview,
                false, // display on console only for the widget developer
                false // is not a rich text message.
            );
        }
    }

    public loadingTimeout(): void {
        this.showUnhandledLoadException(TFS_Dashboards_Resources.WidgetError_Timeout, WidgetHostErrorType.Timeout);
    }

    public _startLoadingTimer(errorTimeout: number): void {
        this._stopLoadingTimer();
        this._widgetLoadTimeoutHandler = window.setTimeout(() => {
            this.loadingTimeout();
        }, errorTimeout);
    }

    public _stopLoadingTimer(): void {
        if (this._widgetLoadTimeoutHandler != null) {
            window.clearTimeout(this._widgetLoadTimeoutHandler);
            this._widgetLoadTimeoutHandler = null;
        }
    }

    /**
     * The mode is changing for the dashboard view, the grid has been notified and now the widgethost.
     * This one must setup the widget overlay on top of the widget host.
     * @param {boolean} isEditMode : True = Edit mode, False = View Mode
     */
    public onModeChange(isEditMode: boolean): void {
        this._isEditMode = isEditMode;

        //If the edit overlay control is created, then show it if user is in Edit Mode
        if (this._canEdit() && this._editOverlayControl != null) {
            if (isEditMode) {
                this._editOverlayControl.show();
            } else {
                this._editOverlayControl.hide();
            }
        }

        //If the menu in the view mode is created, then show it in the View Mode
        if (this._canEdit() && this._viewModeMenu != null) {
            if (isEditMode) {
                this._viewModeMenu.hideElement();
            } else {
                this._viewModeMenu.showElement();
            }
        }
    }

}

export interface IWidgetFactory {
    createWidgetContainer(widgetContribution: IExtensionContribution, widgetData: TFS_Dashboards_Contracts.WidgetResponse, widgetHost: Dashboard_Shared_Contracts.IWidgetHost): IPromise<IWidgetInternal>;
    createErrorWidget(widgetHost: Dashboard_Shared_Contracts.IWidgetHost, error: Dashboard_Shared_Contracts.IWidgetErrorDetails, widgetData: TFS_Dashboards_Contracts.WidgetResponse, widgetContribution: IExtensionContribution): WidgetErrorControl<WidgetErrorOptions>;
    createLoadingWidget(widgetHost: Dashboard_Shared_Contracts.IWidgetHost, widgetData: TFS_Dashboards_Contracts.WidgetResponse, displayMode: WidgetHostDisplayMode): WidgetLoadingControl<WidgetLoadingOptions>;
}

class WidgetFactory implements IWidgetFactory {

    private setupWidgetOptions(
        widgetContribution: IExtensionContribution,
        widgetData: TFS_Dashboards_Contracts.WidgetResponse,
        widgetHost: Dashboard_Shared_Contracts.IWidgetHost): Dashboard_Shared_Contracts.WidgetOptions {
        var widgetOptions: Dashboard_Shared_Contracts.WidgetOptions = <Dashboard_Shared_Contracts.WidgetOptions>{};
        widgetOptions.widgetService = new WidgetHostService(widgetHost).getService();

        if (Contribution_Services.ExtensionHelper.hasInternalContent(widgetContribution)) {
            widgetOptions.typeId = widgetData.typeId;
            widgetOptions.loadingImageUrl = widgetData.loadingImageUrl;
            widgetOptions.performanceScenario = widgetHost.getPerformanceScenario();
        }

        return widgetOptions;
    }

    private setupInstanceId(widgetContribution: IExtensionContribution, widgetData: TFS_Dashboards_Contracts.WidgetResponse): string {
        return Contribution_Services.ExtensionHelper.hasInternalContent(widgetContribution) ? null : widgetData.typeId;
    }

    public createWidgetContainer(
        widgetContribution: IExtensionContribution,
        widgetData: TFS_Dashboards_Contracts.WidgetResponse,
        widgetHost: Dashboard_Shared_Contracts.IWidgetHost): IPromise<IWidgetInternal> {

        // instanceId for contributed controls.
        var instanceId: string = this.setupInstanceId(widgetContribution, widgetData);

        // WidgetOptions is a init payload container, which allows us to avoid unintentional param collisions.
        var widgetOptions: Dashboard_Shared_Contracts.WidgetOptions = this.setupWidgetOptions(widgetContribution, widgetData, widgetHost);

        // NOTE: when proxied widgets that are to be typed do not return, a console error for message having no receiver is sent.
        // we need to a way from the framework team to capture this information and show an error experience.
        return Contributions_Controls.createContributedControl<IWidgetInternal>(
            widgetHost.getWidgetContainer(),
            widgetData.contributionId,
            widgetOptions,
            null,
            instanceId,
            {
                showLoadingIndicator: false,
                showErrorIndicator: false,
                slowWarningDurationMs: 0
            });
    }

    public createErrorWidget(
        widgetHost: Dashboard_Shared_Contracts.IWidgetHost, error: Dashboard_Shared_Contracts.IWidgetErrorDetails,
        widgetData: TFS_Dashboards_Contracts.WidgetResponse,
        widgetContribution: IExtensionContribution): WidgetErrorControl<WidgetErrorOptions> {

        return <WidgetErrorControl<WidgetErrorOptions>>Controls.BaseControl.createIn(
            WidgetErrorControl,
            widgetHost.getElement(),
            <WidgetErrorOptions>{
                errorDetails: error,
                size: widgetData.size,
                contribution: widgetContribution
            });
    }

    public createLoadingWidget(widgetHost: Dashboard_Shared_Contracts.IWidgetHost, widgetData: TFS_Dashboards_Contracts.WidgetResponse, displayMode: WidgetHostDisplayMode)
        : WidgetLoadingControl<WidgetLoadingOptions> {
        return <WidgetLoadingControl<WidgetLoadingOptions>>Controls.Control.createIn<WidgetLoadingOptions>(
            WidgetLoadingControl,
            widgetHost.getElement(),
            {
                widget: widgetData,
                displayMode: displayMode
            });
    }
}

/**
 * Host service that accepts interactions from the widget
 */
export class WidgetHostService {

    private widgetHost: Dashboard_Shared_Contracts.IWidgetHost;

    constructor(widgetHost: Dashboard_Shared_Contracts.IWidgetHost) {
        this.widgetHost = widgetHost;
    }

    /**
    *  service method called by a widget to request for the configuration view to be opened by the Host.
    */
    private showConfiguration(): void {
        if (UserPermissionsHelper.CanEditDashboard()) {
            this.widgetHost.configure();
        }
        else {
            showWidgetAccessNotAvailableDialog();
        }
    }

    /**
     * Allows third party widgets to use transparent backgrounds by
     * hiding the box shadow of the widget host and removing its white background.
     * @param value - True if widget container should be unseen. False otherwise.
     */
    private hideWidgetBackground(value: boolean): void {
        this.widgetHost
            .getElement() // A div inside the element with class .widgethost
            .closest(WidgetHostClassSelector) // The parent is the one that actually has the class .widgethost
            .toggleClass("hide-background", value);
    }

    /**
     * Return the minimal service interface that we want to expose.
     */
    public getService(): IPromise<Dashboards_Services.IWidgetHostService> {
        return Q({
            showConfiguration: () => this.showConfiguration(),
            hideWidgetBackground: (value: boolean) => this.hideWidgetBackground(value),
            getWidgetId: () => {
                var widget = this.widgetHost.getWidget();
                return Q.resolve((widget != null) ? widget.id : null);
            }
        });
    }
}

export interface WidgetErrorOptions {

    /**
    * Error Message String, in plain text.
    */
    errorDetails: Dashboard_Shared_Contracts.IWidgetErrorDetails;

    /**
    * form factor to present in.
    */
    size: TFS_Dashboards_Contracts.WidgetSize;

    /*
    *  contribution for the widget for which the error is being render.
    */
    contribution: IExtensionContribution;
}

export class WidgetErrorControl<TOptions extends WidgetErrorOptions> extends Controls.Control<TOptions> {
    ///<summary>An Error overlay control for presenting widget errors.
    /// This provides a consistent min-bar User experience, for when a widget is in a failed state or could otherwise not be presented.
    /// This isn't a universal pattern. An otherwise functional widget should just provide an in-widget warning on scenarios which are recoverable.</summary>
    public _errorDetails: Dashboard_Shared_Contracts.IWidgetErrorDetails;
    public _size: TFS_Dashboards_Contracts.WidgetSize;
    private contribution: IExtensionContribution;

    constructor(options?: TOptions) {
        super(options);
        //Task 471761: [Todo] WidgetErrorControl : Constructor use Generic Option
        var errorOptions: WidgetErrorOptions = options;
        this._errorDetails = errorOptions.errorDetails;
        this._size = errorOptions.size;
        this.contribution = errorOptions.contribution;
    }

    private getDisplayMessage(): IPromise<string> {
        if (this._errorDetails.isUserVisible) {
            return Q.resolve(this._errorDetails.message);
        }
        else {
            Diag.logError(this._errorDetails.message);
            return TFS_Dashboards_Common.GalleryHelper.getExtensionMessage(this.contribution);
        }
    }

    private isRichText(): boolean {
        var isInternalRichText: boolean = this.contribution && Contribution_Services.ExtensionHelper.hasInternalContent(this.contribution) && this._errorDetails.isRichText;
        return !this._errorDetails.isUserVisible || isInternalRichText ? true : false;
    }

    public initialize() {
        super.initialize();
        this.getDisplayMessage().then((message: string) => {
            this.render(message, this.isRichText());
        });
    }

    public render(message: string, isRichText: boolean): void {
        var cssClass = "error-widget";
        var options = <Dashboard_Shared_Contracts.IWidgetNotificationOptions>{
            titleName: this._errorDetails.widgetName,
            message: TFS_Dashboards_Resources.WidgetNotificationErrorTitle,
            linkText: TFS_Dashboards_Resources.WidgetNotificationError_MoreDetails,
            ariaLabel: Utils_String.format(TFS_Dashboards_Resources.WidgetNotificationError_ScreenReaderSupportText, this._errorDetails.widgetName),
            cssClass: cssClass,
            widgetSize: this._size,
            imageUrl: this.getBackgroundImageUrl(),
            dialogOptions: {
                title: TFS_Dashboards_Resources.WidgetNotificationErrorDialogTitle,
                contentText: message,
                cssClass: "error-notification",
                isRichText: isRichText,
                height: "auto"
            }
        };

        delayLoadActionRequiredControl(this.getElement(), options);
    }

    private getBackgroundImageUrl(): string {
        let contentFileName;
        if (this._size.rowSpan == 1) {
            contentFileName = 'Dashboards/errorWidget-small.png';
        }
        else {
            contentFileName = 'Dashboards/errorWidget-large.png';
        }

        return Locations.urlHelper.getVersionedContentUrl(contentFileName);
    }
}

export interface WidgetLoadingOptions {

    /**
    * Widget data to render loading control for
    */
    widget: TFS_Dashboards_Contracts.WidgetResponse;

    displayMode: WidgetHostDisplayMode;
}

export class WidgetLoadingControl<TOptions extends WidgetLoadingOptions> extends Controls.Control<TOptions> {
    ///<summary>A loading control for presenting while widget is loading.</summary>
    private widget: TFS_Dashboards_Contracts.WidgetResponse;

    private _control: JQuery;
    private _isShowingLoading: boolean = false;

    public isShowingLoading() {
        return this._isShowingLoading;
    }

    constructor(options?: TOptions) {
        super(options);
        this.widget = options.widget;
    }

    public initialize() {
        super.initialize();

        var $container = $("<div>").addClass("widget-loading-control-container");
        this._control = $("<div>").addClass("widget-loading-control")
            .appendTo($container);

        $container.appendTo(this.getElement());
    }

    /**
    * Show the loading experience on top of the control
    */
    public showLoading() {
        let container = $("<div>")
            .addClass("widgetname")
            .text(this.widget.name)
            .appendTo(this._control);
        
        // Create Spinner
        const spinnerProps = {
            size: SpinnerSize.large,
            ariaLive: "assertive",
            ariaLabel: "Loading..."
        } as ISpinnerProps;
        const spinnerElement = React.createElement(Spinner, spinnerProps);

        // Create Overlay
        const overlayProps = {
            className: "dashboard-overlay",
            isDarkThemed: false
        } as IOverlayProps;
        const overlayElement = React.createElement(Overlay, overlayProps, spinnerElement);

        $("#widgets-container").css("z-index", 0);

        // Show Overlay with Spinner
        ReactDOM.render(
            overlayElement,
            container[0]
        );

        this._isShowingLoading = true;
    }
}

export interface IWidgetEditOverlayOption {

    /**
     * Widget data needed for WidgetEditMenuControl that the WidgetEditOverlayControl will contains. Required for action
     * like deleting and configuring.
     */
    widget: TFS_Dashboards_Contracts.WidgetResponse;

    /**
     * Indicate if the widget is configurable
     * @returns {boolean}  : True if the widget can be configured; False if the widget cannot be configured
     */
    canConfigure(): boolean;

    /**
     * Action to do when "configure widget" is triggered
     */
    configure(): void;

    /**
     * Action to take when "remove widget" is triggered
     */
    remove(): void;

    /**
     * Instance of gridster
     */
    gridster: Gridster;

    /**
     * widgethost's parent
     */
    widgetHostParent: JQuery;

    /**
     * Current position of widget in Grid (row, column)
     */
    widgetPosition: TFS_Dashboards_Contracts.WidgetPosition;
}

/**
 * Overlay that goes on top of the widget which will contains the WidgetEditMenuControl (admin actions) and also will
 * be used as a draggable handle to reposition the widget in the grid.
 */
export class WidgetEditOverlayControl extends Controls.Control<IWidgetEditOverlayOption> {
    public static ClassDragHandle: string = "widget-drag-handle";
    public static ClassShow: string = "widget-edit-overlay-control-show";
    public static ClassHide: string = "widget-edit-overlay-control-hide";

    private isShowingControl: boolean = false;
    private _gristerActionExecuter: GridsterActionExecutor;

    constructor(options: IWidgetEditOverlayOption) {
        super(options);
    }

    public initializeOptions(options?: any) {
        super.initializeOptions($.extend(
        {
            cssClass: TFS_Dashboards_Common.ClassWidgetEditOverlayControl
        },
        options));
    }

    public initialize() {
        super.initialize();
        this.getElement()
            .attr("tabindex", "0");

        this.hide();
        this._createEditMenu();

        this._gristerActionExecuter = new GridsterActionExecutor(
            this._options.gridster,
            this._options.widgetHostParent,
            this._options.widgetPosition);
        this.attachKeyDownHandler();
        this.attachKeyUpHandler();
    }

    public _createEditMenu() {
        Controls.Control.createIn<TFS_Dashboards_Control_Menus.WidgetEditMenuOptions>(
            TFS_Dashboards_Control_Menus.WidgetEditMenu,
            this.getElement(), {
                canConfigure: this._options.canConfigure,
                configure: this._options.configure,
                remove: this._options.remove,
                widget: this._options.widget,
                container: this.getElement() // edit overlay gets focus while tabbing in edit mode
            });
    }

    public show() {
        this.getElement()
            .removeClass(WidgetEditOverlayControl.ClassHide)
            .addClass(WidgetEditOverlayControl.ClassShow)
            .addClass(WidgetEditOverlayControl.ClassDragHandle)
            .on("click", () => {
                // when user clicks on a widget in edit mode, set focus to indicate widget being dragged
                // this allows user to click on widget and start using keyboard to move
                if(this.getElement()){
                    this.focus();
                }
            });

        this.isShowingControl = true;
    }

    public hide() {
        this.getElement()
            .removeClass(WidgetEditOverlayControl.ClassShow)
            .addClass(WidgetEditOverlayControl.ClassHide)
            .off("click");

        this.isShowingControl = false;
    }

    public isShowing() {
        return this.isShowingControl;
    }

    private attachKeyDownHandler(): void {
        this.getElement().on("keydown", (event: JQueryKeyEventObject) => {
            let key: number = event.keyCode || event.which;

            switch (key) {
                case Utils_UI.KeyCode.TAB:
                    // TAB is handled by browser default
                    // SHIFT + TAB needs to place focus on delete button in previous widget if it exists else browser default will be focused
                    if (!event.shiftKey) {
                        return;
                    }
                    let selectorForWidgetHost = "." + TFS_Dashboards_Constants.DomClassNames.WidgetHostInGridster;
                    let selectorForEditMenu = "." + TFS_Dashboards_Constants.DomClassNames.WidgetEditMenuButton;
                    let selectorForEditOverlay = "." + TFS_Dashboards_Common.ClassWidgetEditOverlayControl;

                    let prevWidget = this.getElement().closest(selectorForWidgetHost).prev(selectorForWidgetHost);
                    if (prevWidget && prevWidget.length > 0) {
                        let editOverlayContainer = prevWidget.find(selectorForEditOverlay);
                        // always focus on delete button, using last since configurable widgets have both configure and delete button
                        // but non-configurable widgets have only delete button
                        editOverlayContainer.find(selectorForEditMenu).last().focus();
                        return false;
                    }
                    break;
                case Utils_UI.KeyCode.CONTROL:
                    this._gristerActionExecuter.startDrag();
                    break;
            }
        });
    }

    private attachKeyUpHandler(): void {
        this.getElement().on("keyup", (event: JQueryKeyEventObject) => {
            let key: number = event.keyCode || event.which;

            switch (key) {
                case Utils_UI.KeyCode.CONTROL:
                    this.stopDrag();
                    return;
                case Utils_UI.KeyCode.UP:
                    this._gristerActionExecuter.moveUp();
                    break;
                case Utils_UI.KeyCode.LEFT:
                    this._gristerActionExecuter.moveLeft();
                    break;
                case Utils_UI.KeyCode.RIGHT:
                    this._gristerActionExecuter.moveRight();
                    break;
                case Utils_UI.KeyCode.DOWN:
                    this._gristerActionExecuter.moveDown();
                    break;
                default:
                    return;
            }

            event.ctrlKey
                ? this._gristerActionExecuter.keepDragging()
                : this.stopDrag();
        });
    }

    private stopDrag() {
        this._gristerActionExecuter.stopDrag();
        this.getElement().focus();
    }
}

export class GridsterActionExecutor {
    public static Offset = 30;
    private _gridsterControl: Gridster;
    private _widgetContainer: JQuery;
    private _widgetPosition: TFS_Dashboards_Contracts.WidgetPosition;

    // position relative to where widget was when dragging started and where it will be placed when dragging is stopped
    // pressing LEFT will increment column by 1 and RIGHT will decrement by 1
    // pressing DOWN will increment row by 1 and UP will decrement by 1
    private widgetTargetPosition: TFS_Dashboards_Contracts.WidgetPosition = {
        column: 0,
        row: 0
    };

    constructor(gridster: Gridster, widgetHostParent: JQuery, widgetPosition: TFS_Dashboards_Contracts.WidgetPosition) {
        this._gridsterControl = gridster;
        this._widgetContainer = widgetHostParent;
        this._widgetPosition = widgetPosition;
    }

    /**
     * Move widget to previous column
     */
    public moveLeft() {
        let newPos: TFS_Dashboards_Contracts.WidgetPosition = {
            row: this.widgetTargetPosition.row,
            column: this.widgetTargetPosition.column - 1
        };
        if (this.isWithinGridster(newPos)) {
            this.widgetTargetPosition.column = newPos.column;
        }
    }

    /**
     * Move widget to next column
     */
    public moveRight() {
        this.widgetTargetPosition.column += 1;
    }

    /**
     * Move widget to next row
     */
    public moveDown() {
        this.widgetTargetPosition.row += 1;
    }

    /**
     * Move widget to previous row
     */
    public moveUp() {
        let newPosition: TFS_Dashboards_Contracts.WidgetPosition = {
            row: this.widgetTargetPosition.row - 1,
            column: this.widgetTargetPosition.column
        };
        if (this.isWithinGridster(newPosition)) {
            this.widgetTargetPosition.row = newPosition.row;
        }
    }

    /**
     * Start dragging selected widget
     */
    public startDrag() {
        if (this.isWidgetDragged()) {
            return;
        }

        this.resetPositionOffset();
        let dragEvent: any = {};
        let ui: any = {};
        ui.$helper = ui.$player = $(this._widgetContainer);
        this.getGridsterDragApi().start.apply(this._widgetContainer, [dragEvent, ui]);
        return;
    }

    /**
     * Stop dragging of widget and place it in current location user wants
     */
    public stopDrag() {
        if (!this.isWidgetDragged()) {
            return;
        }
        let dragEvent: any = {};
        let ui: any = {};
        ui.$helper = ui.$player = $(this._widgetContainer);
        ui.position = this.getWidgetPositionInPixel(this.widgetTargetPosition);
        this.getGridsterDragApi().stop.apply(this._widgetContainer, [dragEvent, ui]);
        this.sortWidgetsInDOMFromTopLeftToBottomRight();
    }

    /**
     * Keep dragging the widget where user wants to
     * Slightly offset widget in grid, so user can see where it will be placed
     * @param moveTo - Locations where widget is currently present
     */
    public keepDragging() {
        let dragEvent: any = {
            pageX: this.widgetTargetPosition.column // grid adds leftdrag or rightdrag based on pageX
        };
        let ui: any = {};
        ui.$helper = ui.$player = $(this._widgetContainer);
        ui.position = this.getWidgetPositionInPixel(this.widgetTargetPosition);
        this.getGridsterDragApi().drag.apply(this._widgetContainer, [dragEvent, ui]);
        this.moveWidgetToNewPositionInGrid(ui.position);
    }

    /**
     * Get the jquery object of gridster
     */
    private getGridster(): JQuery {
        return (<any>this._gridsterControl).$el;
    }

    /**
     * Typings are not available for gridster drag api
     */
    private getGridsterDragApi(): any {
        return (<any>this._gridsterControl).drag_api.options;
    }

    /**
     * Check whether position widget is trying to move is within gridster
     * Handles pressing UP ARROW for widgets in top row and pressing LEFT ARROW for widgets in left most column
     * @param position - Position widget wants to move to
     */
    private isWithinGridster(position: TFS_Dashboards_Contracts.WidgetPosition): boolean {
        return (this._widgetPosition.column + position.column > 0 )
            && (this._widgetPosition.row + position.row > 0 );
    }

    private resetPositionOffset() {
        this.widgetTargetPosition.row = 0;
        this.widgetTargetPosition.column = 0;
    }

    private isWidgetDragged() {
        let draggedWidgetCssClass = "player";
        return this._widgetContainer.hasClass(draggedWidgetCssClass);
    }

    /**
     * Sort widgets and update gridster, so taborder follows visual representation
     * Note: When user moves widget using mouse, taborder will not be consistent will visual representation
     * but will be fixed when widget is moved again using keyboard
     */
    private sortWidgetsInDOMFromTopLeftToBottomRight() {
        let $widgets: JQuery = (<any>this._gridsterControl).$widgets;
        let $sortedWidgets = SortWidgetsFromTopLeftToBottomRight($widgets);
        this.getGridster().append($sortedWidgets);
    }

    /**
     * Get location of widget inside gridster in pixel
     * @param widget - selected widget
     * @param moveTo - Locations where widget is currently present
     */
    private getWidgetPositionInPixel(moveTo: TFS_Dashboards_Contracts.WidgetPosition): GridCoords {
        let left = WidgetHelpers.WidgetSizeConverter.ColumnsToPixelWidth(this._widgetPosition.column + moveTo.column - 1);
        let top = WidgetHelpers.WidgetSizeConverter.RowsToPixelHeight(this._widgetPosition.row + moveTo.row - 1);
        return {
            top: top,
            left: left
        };
    }

    private moveWidgetToNewPositionInGrid(position: GridCoords) {
        this._widgetContainer.css({
            top: Math.max(0, position.top) + GridsterActionExecutor.Offset + "px",
            left: Math.max(0, position.left) + GridsterActionExecutor.Offset + "px"
        });
    }
}

export interface GridCoords {
    top: number;
    left: number;
}

/**
 * Sort widgets and update gridster, so taborder follows visual representation
 * Note: When user moves widget using mouse, taborder will not be consistent will visual representation
 * but will be fixed when widget is moved again using keyboard
 */
export function SortWidgetsFromTopLeftToBottomRight($widgets: JQuery): JQuery {
    $widgets.sort((widget1: HTMLElement, widget2: HTMLElement) => {
        let $widget1 = $(widget1);
        let $widget2 = $(widget2);
        let widget1Row = parseInt($widget1.attr("data-row"));
        let widget1Col = parseInt($widget1.attr("data-col"));
        let widget2Row = parseInt($widget2.attr("data-row"));
        let widget2Col = parseInt($widget2.attr("data-col"));

        if (widget1Row > widget2Row
            || widget1Row === widget2Row
            && widget1Col > widget2Col) {
            return 1;
        }
        return -1;
    });
    return $widgets;
}
