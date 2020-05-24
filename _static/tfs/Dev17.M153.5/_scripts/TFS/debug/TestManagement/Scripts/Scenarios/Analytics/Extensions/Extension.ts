import "VSS/LoaderPlugins/Css!TestManagement/Scripts/Scenarios/Analytics/Extensions/Extension";

import { ISpinnerProps, Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as Resources from "TestManagement/Scripts/Resources/TFS.Resources.TestManagement";
import { MetadataActionsCreator } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/MetadataActionsCreator";
import { TestResultsReportActionsCreator } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Actions/TestResultsReportActionsCreator";
import { TestAnalyticsConstants } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Constants";
import { AnalyticsExtension } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Definitions";
import * as CommonTypes from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Types";
import { FluxFactory } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/FluxFactory";
import { Utility } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Common/Utility";
import { AnalyticsUnavailableMessage, IAnalyticsUnavailableMessageProps } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Components/AnalyticsUnavailableMessage";
import { ITestResultsReportViewProps, TestResultsReportView } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/ControllerViews/TestResultsReportView";
import { MetadataStore } from "TestManagement/Scripts/Scenarios/Analytics/InContextReports/Stores/MetadataStore";
import { TelemetryService } from "TestManagement/Scripts/TFS.TestManagement.Telemetry";
import { UrlHelper } from "TestManagement/Scripts/TFS.TestManagement.Utils";
import * as TCMContracts from "TFS/TestManagement/Contracts";
import * as Contributions_Contracts from "VSS/Contributions/Contracts";
import * as Controls from "VSS/Controls";
import { getService as getEventService } from "VSS/Events/Services";
import { ExtensionManagementHttpClient } from "VSS/ExtensionManagement/RestClient";
import { HubEventNames } from "VSS/Navigation/HubsService";
import * as Service from "VSS/Service";

export interface ITestResultAnalyticsExtensionOptions {
}

export abstract class TestResultAnalyticsExtension<T extends ITestResultAnalyticsExtensionOptions> extends Controls.Control<T>{

    public initialize(): void {
        super.initialize();
        this._instanceIdToReportRenderedMap = {};
        this._createMainView();
        this._setupCleanupOnHubChange();
    }

    public initializeOptions(options: T) {
        super.initializeOptions($.extend({
            cssClass: "testresults-analytics-extension"
        }, options));
    }

    /*
    * Checks whether Analytics Extension in installed or not. Based on that creates appropriate view.
    */
    public _createMainView(): void {   
        this._getAnalyticsComponentsLoadingSpinner();
        
        if (!this._installedExtensionPromise) {
            this._installedExtensionPromise = Service.getClient(ExtensionManagementHttpClient).getInstalledExtensionByName(AnalyticsExtension.PublisherName, AnalyticsExtension.ExtensionName);
        }
        
        this._installedExtensionPromise.then((installedextension: Contributions_Contracts.InstalledExtension) => {
            if (installedextension && installedextension.installState
                && ((installedextension.installState.flags & Contributions_Contracts.ExtensionStateFlags.Disabled) !== Contributions_Contracts.ExtensionStateFlags.Disabled)) {

                try {
                    // This call needs to be done in sequence to ensure that the Ax service does not fault-in accounts that do not have Ax installed. 
                    if (this.definitionId) {
                        MetadataActionsCreator.getInstance().getDefinitionSK(this.definitionId, this.contextType);
                    }
                }
                finally {
                    this._createView();
                }
            }
            else {
                this._getExtensionDisabledComponent();
            }
        }, (error) => {
            this._getExtensionNotInstalledComponent();
        });
    }

    /*
    * This method is added to support testing.
    */
    public loadImage(): boolean {
        return true;
    }

    public dispose(): void {
        this._cleanupFlux();
        if (this._element) {
            let container: HTMLElement = this._element.get(0);
            ReactDOM.unmountComponentAtNode(container);
        }

        super.dispose();
    }

    /*
    * Override this view to create custom report view.
    */
    protected _createReportView(testReportContext: CommonTypes.ITestReportContext, instanceId: string): void {
        this._renderReportView(testReportContext, instanceId);
    }
    
    /*
    * Override this method to create custom view.
    */
    protected abstract _createView(): void;
    
    /*
    * Creates Analytics not installed view.
    */
    protected _getExtensionNotInstalledComponent(definitionId?: number): void {
        if (this._element) {
            let container: HTMLElement = this._element.get(0);
            //Unmount any component inside container.
            ReactDOM.unmountComponentAtNode(container);

            ReactDOM.render(React.createElement(AnalyticsUnavailableMessage, {
                imageName: this.loadImage() ? AnalyticsExtension.ImageExtensionNotInstalled : undefined,
                message: Resources.AnalyticsExtensionNotInstalledMessage,
                suggestion: Resources.AnalyticsExtensionNotInstalledSuggestion,
                linkText: Resources.InstallAnalytics,
                linkUrl: AnalyticsExtension.MarketPlaceUrlForExtension,
                ariaDescription: Resources.InstallAnalyticsExtensionAriaDescription
            } as IAnalyticsUnavailableMessageProps), container);

            this._publishGettingStartedTelemetry(TelemetryService.featureTestAX_InstallAX);
        }
    }

    /*
    * Creates Analytics disabled view.
    */
    protected _getExtensionDisabledComponent(definitionId?: number): void {
        if (this._element) {
            let container: HTMLElement = this._element.get(0);
            //Unmount any component inside container.
            ReactDOM.unmountComponentAtNode(container);

            ReactDOM.render(React.createElement(AnalyticsUnavailableMessage, {
                imageName: this.loadImage() ? AnalyticsExtension.ImageExtensionNotInstalled : undefined,
                message: Resources.AnalyticsExtensionDisabledMessage,
                suggestion: Resources.AnalyticsExtensionDisabledSuggestion,
                linkText: Resources.ViewExtensions,
                linkUrl : UrlHelper.getManageExtensionsPath(),
                ariaDescription: Resources.DisabledAnalyticsExtensionAriaDescription
            } as IAnalyticsUnavailableMessageProps), container);

            this._publishGettingStartedTelemetry(TelemetryService.featureTestAX_EnableAX);
        }
    }

    /*
    * Get Props for Analytics Loading Spinner 
    */
    protected _getAnalyticsComponentsLoadingSpinnerProps (): ISpinnerProps {
        return {
            className: "analytics-loading-spinner",
            size: SpinnerSize.large
        } as ISpinnerProps;
    }

    private async _renderReportView(testReportContext: CommonTypes.ITestReportContext, instanceId: string): Promise<void> {
        /*
         * This looks blocking rendering of UI and calls to fetch report data below.
         * But API call has already been triggered as part of AX extension validation so here promise(which is cached in first invocation) we receive will be either in-progress or already resolved.
         * This is done to optimize load time of page.
         */

        // Since render is called as a handler for an Ajax request, it is possible that the control is disposed (due to navigation) before the handler is called. 
        if (this._element) {
            testReportContext = await this._fetchTestReportContextAdditionalInfo(testReportContext);

            const container: HTMLElement = this._element.get(0);

            //Unmount any component inside container.
            ReactDOM.unmountComponentAtNode(container);

            //Render report component inside container with initially default props/state with store.
            ReactDOM.render(React.createElement(TestResultsReportView, { testResultContext: testReportContext, instanceId: instanceId } as ITestResultsReportViewProps), container);

            //Avoid making calls to re-render report for a release definition already once selected. If re-rendering then avoid rendering with default configuration values.
            if (!this._instanceIdToReportRenderedMap[instanceId]) {
                this._instanceIdToReportRenderedMap[instanceId] = true;

                //Invoke actions to start filling in data.
                TestResultsReportActionsCreator.getInstance(instanceId).beginRenderingTestResultsReport(testReportContext);

                //Initialization of store.
                MetadataStore.getInstance();

                if (testReportContext.contextType === TCMContracts.TestResultsContextType.Release) {
                    // Fetching release defns to resolve stage Id with its name when group By Stage.
                    MetadataActionsCreator.getInstance().updateReleaseDefinitionMetadata(testReportContext.release.definitionId);
                }
            }
        }
    }

    private async _fetchTestReportContextAdditionalInfo(testReportContext: CommonTypes.ITestReportContext): Promise<CommonTypes.ITestReportContext> {
        if (testReportContext.definitionId) {
            try {
                testReportContext.definitionSK = await MetadataActionsCreator.getInstance().getDefinitionSK(testReportContext.definitionId, testReportContext.contextType);
            }
            catch (error) {
                /* Ignore exceptions coming from this API.
                 * 1) If model not ready exception comes then subsequent API calls will also throw Model Not ready exception and rendering appropriate UI is handled for that.
                 * 2) If any generic Odata exception comes then we will not block rendering of report because of this. We will query by definitionId instead.
                 * */
            }
        }

        return testReportContext;
    }

    /*
    * Creates loading spinner for analytics views 
    */
    private _getAnalyticsComponentsLoadingSpinner(): void {
        if (this._element) {
            let container: HTMLElement = this._element.get(0);
            //Unmount any component inside container
            ReactDOM.unmountComponentAtNode(container);

            ReactDOM.render(React.createElement(Spinner, this._getAnalyticsComponentsLoadingSpinnerProps()), container);
        }
    }

    private _publishGettingStartedTelemetry(featureName: string){        
        let testResultsContext : TCMContracts.TestResultsContext = this.contextType === TCMContracts.TestResultsContextType.Build 
            ? {build : {definitionId : this.definitionId}, contextType: this.contextType} as TCMContracts.TestResultsContext 
            : {release: {definitionId: this.definitionId}, contextType: this.contextType} as TCMContracts.TestResultsContext;

        Utility.publishTelemetryForGettingStarted(featureName, TestAnalyticsConstants.TestFailures, testResultsContext);
    }

    private _setupCleanupOnHubChange(): void {
        getEventService().attachEvent(HubEventNames.PreXHRNavigate, this._hubChangeHandler);
    }

    private _hubChangeHandler = (sender: any, event: any) => {
        getEventService().detachEvent(HubEventNames.PreXHRNavigate, this._hubChangeHandler);
        this.dispose();
    }

    private _cleanupFlux(): void {
        FluxFactory.instance().dispose();
    }

    protected _instanceIdToReportRenderedMap: IDictionaryStringTo<boolean>;
    protected definitionId: number;
    protected contextType: TCMContracts.TestResultsContextType;

    private _installedExtensionPromise: IPromise<Contributions_Contracts.InstalledExtension>;
}