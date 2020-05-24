import "VSS/LoaderPlugins/Css!WorkItemsHub/Scripts/WorkItemFormWrapper";

import * as ReactDOM from "react-dom";
import * as Controls from "VSS/Controls";
import { EventService } from "VSS/Events/Services";
import * as Service from "VSS/Service";
import * as VSS from "VSS/VSS";
import * as Navigation_Services from "VSS/Navigation/Services";
import * as String from "VSS/Utils/String";
import { FullScreenHelper } from "VSS/Controls/Navigation";

import { autobind } from "OfficeFabric/Utilities";

import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import * as TFS_OM_Common from "Presentation/Scripts/TFS/TFS.OM.Common";

import * as WITOM from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import * as WorkItemTitleUtils from "WorkItemTracking/Scripts/Utils/WorkItemTitleUtils";
import { WorkItemForm, IWorkItemFormOptions } from "WorkItemTracking/Scripts/Controls/WorkItemForm";
import { WorkItemInfoBar } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemInfoBar";
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { WorkItemFormView } from "WorkItemTracking/Scripts/Controls/WorkItemFormView";
import { RecycleBinConstants } from "WorkItemTracking/Scripts/RecycleBinConstants";
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import { WorkItemActions } from "WorkItemTracking/Scripts/Utils/WorkItemControlsActions";
import { InitialValueHelper } from "WorkItemTracking/Scripts/Utils/InitialValueHelper";
import { WorkItemTemplatesHelper } from "WorkItemTracking/Scripts/Utils/WorkItemTemplateUtils";
import { setClassificationNodesUsingMRU } from "WorkItemTracking/Scripts/Utils/WorkItemClassificationUtils";
import { WITPerformanceScenario } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { PerfScenarioManager } from "WorkItemTracking/Scripts/Utils/PerfScenarioManager";
import { WorkItemsHubFormShortcutGroup, ITriageShortcutOptions } from "WorkItemsHub/Scripts/WorkItemsHubFormShortcutGroup";

import * as WorkItemsXhrNavigationUtils from "WorkItemsHub/Scripts/Utils/WorkItemsXhrNavigationUtils";
import { ZeroDataFactory } from "WorkItemsHub/Scripts/Utils/ZeroDataFactory";
import { UsageTelemetryHelper } from "WorkItemsHub/Scripts/Utils/Telemetry";
import { HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import { WorkItemFormBase } from "WorkItemTracking/Scripts/Controls/WorkItemFormBase";
import { publishErrorToTelemetry } from "VSS/Error";

import { WatchDogService } from "Presentation/Scripts/TFS/FeatureRef/TFS.WatchDogService";
import * as CIConstants from "WorkItemTracking/Scripts/CustomerIntelligence";
import { IVssPageContext } from "VSS/Platform/Context";
import { IVssPerformanceService } from "VSS/Platform/Performance";

interface IWorkItemFormWrapperOptions {
    /**
     * Work item id. If define, then display work item with the given id.
     */
    id?: number;

    /**
     * Work item type. If define, then display work item form in creation view with the given type.
     */
    workItemType?: string;

    /**
     * Sets of field names to field value which are specified as request parameters, used to initialize field when create work item.
     */
    requestParameters?: IDictionaryStringTo<string>;

    /**
     * Optional options for triage mode.
     */
    triageOptions?: ITriageOptions;
}

export interface ITriageOptions {
    /**
     * Triage shortcut options.
     */
    shortcutOptions: ITriageShortcutOptions;

    /**
     * Optional callback to override default handling of work item delete success event.
     */
    onWorkItemShown?: (workItemId: number) => void;

    /**
     * Callback to override default handling of work item delete success event.
     */
    onWorkItemDeleteSuccess: () => void;

    /**
     * Callback to override default error handling.
     */
    onError: IErrorCallback;
}

export class WorkItemFormWrapper implements IDisposable {
    private _eventService: EventService = Service.getLocalService(EventService);
    private _tfsContext: TfsContext = TfsContext.getDefault();
    private _workItemForm: WorkItemForm;
    private _options: IWorkItemFormWrapperOptions;
    private _container: HTMLElement;
    private _showingError: boolean = false;
    private _store: WITOM.WorkItemStore;
    private _witManager: WorkItemManager;

    private constructor(pageContext: IVssPageContext, container: HTMLElement, options: IWorkItemFormWrapperOptions) {
        this._store = TFS_OM_Common.ProjectCollection.getDefaultConnection().getService<WITOM.WorkItemStore>(WITOM.WorkItemStore);
        this._witManager = WorkItemManager.get(this._store);
        this._options = options;

        const { workItemType, id, requestParameters, triageOptions } = this._options;

        // workItemType defined => new/create, otherwise => view/edit
        let scenarioName = WITPerformanceScenario.WORKITEM_OPENFORM_NEWLAYOUT;
        if (workItemType) {
            UsageTelemetryHelper.publishCreateNewWorkItemTelemetry(workItemType);
            scenarioName = WITPerformanceScenario.WORKITEM_OPENFORM_CREATE_NEWLAYOUT;
        }
        this._eventService.attachEvent(HubEventNames.PreXHRNavigate, WorkItemFormWrapper.preXHRNavigationHandler);

        let isFpsNavigation = false;

        if (pageContext) {
            const performanceService = pageContext.getService<IVssPerformanceService>("IVssPerformanceService");
            if (performanceService) {
                isFpsNavigation = performanceService.isFastPageSwitchScenario();
            }
        }

        const scenarioDescriptor = PerfScenarioManager.startScenarioWithOptions(scenarioName, {
            fromPageNavigation: !isFpsNavigation,
            isPageInteractive: true
        });

        scenarioDescriptor.addData({ source: "workItemsHub" });
        scenarioDescriptor.addSplitTiming("WorkItemFormWrapper.Start");
        Service.getService(WatchDogService).startWatchScenario(
            /* ScenarioName */ scenarioName,
            /* FromPageNavigation */ !isFpsNavigation,
            /* Timeout = 15 seconds */ 15000,
            /* Area */ CIConstants.WITCustomerIntelligenceArea.WORK_ITEM_TRACKING,
            /* Component */ "WorkItemFormWrapper",
            /* Feature */ CIConstants.WITCustomerIntelligenceFeature.WIT_WATCHDOG_OPEN_FORM
        );

        this._container = container;
        this._attachEvents();

        const formOptions: IWorkItemFormOptions = {
            tfsContext: this._tfsContext,
            formViewType: WorkItemFormView,
            infoBar: {
                options: {
                    update: (infoBar: WorkItemInfoBar) => {
                        if (infoBar.workItem) {
                            infoBar.delayExecute(WorkItemTitleUtils.DefaultUpdateDelayEventName, WorkItemTitleUtils.DefaultUpdateDelayMs, true, () => {
                                this._updateDocumentTitle(infoBar.workItem);
                            });
                        }
                    }
                }
            },
            toolbar: {
                showFullScreenMenu: false,
                inline: true,
                discardWorkItemDelegate: () => {
                    this.dispose();
                    WorkItemsXhrNavigationUtils.navigateToWorkItemHub();
                }
            },
            workItemChanged: (args: WITOM.IWorkItemChangedArgs): void => {
                if (args.change === WorkItemChangeType.Saved && args.firstSave) {
                    this._updateDocumentTitle(args.workItem);
                    WorkItemsXhrNavigationUtils.replaceHubStateWithEditWorkItem(args.workItem.id);
                }
            }
        };
        $(container).addClass("work-item-form-wrapper");

        this._workItemForm = Controls.BaseControl.createIn(WorkItemForm, container, formOptions) as WorkItemForm;

        if (requestParameters && String.equals(requestParameters.fullScreen, "true", true)) {
            // turn off and remove full screen param.
            FullScreenHelper.setFullScreen(null, false, false, false, true);
        }

        if (workItemType) {
            this._createWorkItem();
        }
        else {
            this.beginShowWorkItem(id);
        }

        WorkItemsHubFormShortcutGroup.Register(triageOptions && triageOptions.shortcutOptions);
    }

    public static createForView(
        pageContext: IVssPageContext, container: HTMLElement, id: number, requestParameters?: IDictionaryStringTo<string>, triageOptions?: ITriageOptions): WorkItemFormWrapper {

        return new WorkItemFormWrapper(pageContext, container, { id, requestParameters, triageOptions } as IWorkItemFormWrapperOptions);
    }

    public static createForNew(pageContext: IVssPageContext, container: HTMLElement, workItemType: string, requestParameters?: IDictionaryStringTo<string>): WorkItemFormWrapper {
        return new WorkItemFormWrapper(pageContext, container, { workItemType, requestParameters } as IWorkItemFormWrapperOptions);
    }

    public beginShowWorkItem(id: number): void {
        this._workItemForm.beginShowWorkItem(id, this._onWorkItemShown, this._showError);
    }

    public resetDirty(): void {
        this._witManager.resetDirtyWorkItems();
    }

    public isDirty(): boolean {
        return this._witManager.isDirty();
    }

    public dispose(): void {
        this._detachEvents();
        this._disposeWorkItemForm();
        if (this._showingError && this._container) {
            ReactDOM.unmountComponentAtNode(this._container);
            this._container = null;
        }
    }

    private _disposeWorkItemForm(): void {
        if (this._workItemForm) {
            this._workItemForm.dispose();
            this._workItemForm = null;
        }

        if (this._witManager) {
            this._witManager.dispose();
            this._witManager = null;
        }
    }

    private _updateDocumentTitle(workItem: WITOM.WorkItem): void {
        const title = WorkItemTitleUtils.getWorkItemEditorTitle(workItem, WorkItemTitleUtils.DefaultTrimmedWorkItemEditorLength);
        document.title = Navigation_Services.getDefaultPageTitle(title);
    }

    private _createWorkItem(): void {
        this._workItemForm.showLoadingIndicator(0);
        const projectId = this._tfsContext.navigation.projectId;

        this._store.beginGetProject(projectId, (project: WITOM.Project) => {
            project.beginGetWorkItemType(this._options.workItemType, (workitemType: WITOM.WorkItemType) => {
                const workItem = this._witManager.createWorkItem(workitemType);

                setClassificationNodesUsingMRU(workItem, projectId).then(() => {
                    this._showWorkItem(workItem);
                }, this._showError);
            }, this._showError);
        }, this._showError);
    }

    private _showWorkItem(workItem: WITOM.WorkItem): void {
        const requestParameters = this._options.requestParameters;
        if (requestParameters) {
            if (requestParameters.templateId) {
                let ownerId = requestParameters.ownerId;
                if (!ownerId) { // Resolve ownerId
                    const team = this._tfsContext.contextData.team;
                    ownerId = team ? team.id : null;
                }

                if (ownerId) {
                    // If templateId is specified, get template and apply it to the workitem
                    WorkItemTemplatesHelper.getAndApplyWorkItemTemplateForNewWorkItem(this._tfsContext, workItem, ownerId, requestParameters.templateId);
                } else {
                    publishErrorToTelemetry(new Error(`WorkItemFormWrapper: Couldn't apply template because ownerId is undefined`));
                }

                // Cleanup route parameters
                WorkItemTemplatesHelper.removeTemplateIdFromNavigationState();
            }
            else {
                InitialValueHelper.assignInitialValues(workItem, requestParameters);
            }
        }

        this._workItemForm.showWorkItem(workItem).then(() => {
            this._workItemForm.focus();
        });
    }

    @autobind
    private _onWorkItemShown(form: WorkItemFormBase, workItem: WITOM.WorkItem): void {
        const { triageOptions } = this._options;
        if (triageOptions && triageOptions.onWorkItemShown) {
            triageOptions.onWorkItemShown(workItem.id);
        }
    }

    @autobind
    private _showError(e: any) {
        const { triageOptions } = this._options;
        if (triageOptions) {
            triageOptions.onError(e);
            return;
        }

        this._disposeWorkItemForm();
        ReactDOM.render(ZeroDataFactory.createForServerError(VSS.getErrorMessage(e)), this._container);
        this._showingError = true;
    }

    @autobind
    private _deleteItemEventStartDelegate(): void {
        this._eventService.fire(WorkItemActions.ACTION_SHOW_WORKITEM_FORM_BUSY);
    }

    @autobind
    private _deleteItemEventFailDelegate(): void {
        this._eventService.fire(WorkItemActions.ACTION_HIDE_WORKITEM_FORM_BUSY);
    }

    @autobind
    private _deleteItemEventSuccessDelegate(sender: any, eventArgs: any): void {

        if (eventArgs &&
            eventArgs.workItemIds &&
            eventArgs.workItemIds instanceof Array &&
            eventArgs.workItemIds.indexOf(this._options.id) < 0) {
            this._eventService.fire(WorkItemActions.ACTION_HIDE_WORKITEM_FORM_BUSY);
            return;
        }

        const { triageOptions } = this._options;
        if (triageOptions) {
            triageOptions.onWorkItemDeleteSuccess();
            return;
        }

        // navigate to workitem hub (XHR code will automatically call dispose)
        WorkItemsXhrNavigationUtils.navigateToWorkItemHub();
    }

    private _attachEvents(): void {
        // attach work item delete event.
        this._eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_STARTED, this._deleteItemEventStartDelegate);
        this._eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, this._deleteItemEventFailDelegate);
        this._eventService.attachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this._deleteItemEventSuccessDelegate);
        // EVENT_DELETE_FAILED notification is suppressed when delete action is invoked from WIT form and only WORKITEM_DELETE_ERROR
        // is fired from inside the errorcallback
        this._eventService.attachEvent(WorkItemActions.WORKITEM_DELETE_ERROR, this._deleteItemEventFailDelegate);
    }

    private _detachEvents(): void {
        this._eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_STARTED, this._deleteItemEventStartDelegate);
        this._eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_FAILED, this._deleteItemEventFailDelegate);
        this._eventService.detachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this._deleteItemEventSuccessDelegate);
        this._eventService.detachEvent(WorkItemActions.WORKITEM_DELETE_ERROR, this._deleteItemEventFailDelegate);
    }

    private static preXHRNavigationHandler(sender: any, args: IHubEventArgs): void {
        // abort perf scenario before navigating away from work items hub
        PerfScenarioManager.abortScenario(WITPerformanceScenario.WORKITEM_OPENFORM_NEWLAYOUT);
        PerfScenarioManager.abortScenario(WITPerformanceScenario.WORKITEM_OPENFORM_CREATE_NEWLAYOUT);

        Service.getService<WatchDogService>(WatchDogService).endWatchScenario(WITPerformanceScenario.WORKITEM_OPENFORM_NEWLAYOUT);
        Service.getService<WatchDogService>(WatchDogService).endWatchScenario(WITPerformanceScenario.WORKITEM_OPENFORM_CREATE_NEWLAYOUT);

        // Unregister event handler
        Service.getLocalService(EventService).detachEvent(HubEventNames.PreXHRNavigate, WorkItemFormWrapper.preXHRNavigationHandler);
    }
}
