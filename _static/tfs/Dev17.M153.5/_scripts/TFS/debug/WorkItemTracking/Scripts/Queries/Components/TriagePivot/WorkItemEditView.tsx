import "VSS/LoaderPlugins/Css!Queries/Components/TriagePivot/WorkItemEditView";

import * as React from "react";
import * as Q from "q";
import Controls = require("VSS/Controls");
import { delay } from "VSS/Utils/Core";
import { WorkItemForm } from "WorkItemTracking/Scripts/Controls/WorkItemForm";
import { WorkItemInfoBar } from "WorkItemTracking/Scripts/Controls/WorkItemForm/WorkItemInfoBar";
import { IContributionHubViewStateRouterContext } from "Presentation/Scripts/TFS/Router/ContributionHubViewStateRouter";
import { WorkItemFormView } from "WorkItemTracking/Scripts/Controls/WorkItemFormView";
import { WorkItemToolbar } from "WorkItemTracking/Scripts/Controls/WorkItemToolbar";
import { WorkItemChangeType } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import * as WorkItemTitleUtils from "WorkItemTracking/Scripts/Utils/WorkItemTitleUtils";
import { WorkItemStore, WorkItem, Project, WorkItemType } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import * as Utils_String from "VSS/Utils/String";
import TemplateUtils = require("WorkItemTracking/Scripts/Utils/WorkItemTemplateUtils");
import { WorkItemManager } from "WorkItemTracking/Scripts/OM/WorkItemManager";
import VSS_Resources_Common = require("VSS/Resources/VSS.Resources.Common");
import Telemetry = require("VSS/Telemetry/Services");
import { WITCustomerIntelligenceArea } from "WorkItemTracking/Scripts/CustomerIntelligence";
import { InitialValueHelper } from "WorkItemTracking/Scripts/Utils/InitialValueHelper";
import Resources = require("WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking");
import { ActionParameters, ActionUrl } from "WorkItemTracking/Scripts/ActionUrls";
import { HistoryBehavior } from "VSSPreview/Utilities/ViewStateNavigation";
import * as Events_Services from "VSS/Events/Services";
import { RecycleBinConstants } from "WorkItemTracking/Scripts/RecycleBinConstants";
import { IWorkItemEditViewProps } from "WorkItemTracking/Scripts/Queries/Components/TriagePivot/WorkItemEditViewProps";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { QueriesHub, IQueriesHubState } from "WorkItemTracking/Scripts/Queries/Components/QueriesHub";
import { setClassificationNodesUsingMRU } from "WorkItemTracking/Scripts/Utils/WorkItemClassificationUtils";
import { createForServerError } from "WorkItemTracking/Scripts/Utils/WorkItemTrackingZeroDataUtils";

export interface IWorkItemEditViewState extends IQueriesHubState {
    errorMessage: string | null;
}

export class WorkItemEditView extends QueriesHub<IWorkItemEditViewProps, IWorkItemEditViewState> {
    private _workItemHeaderToolBar: WorkItemToolbar;
    private _workItemInfoBar: WorkItemInfoBar;
    private _form: WorkItemForm;
    private _tfsContext: TfsContext = TfsContext.getDefault();
    private _projectId: string;
    private _store: WorkItemStore;

    private _deleteItemSuccessEventDelegate: () => void = () => {
        if (this.props.onWorkItemDeleted) {
            this.props.onWorkItemDeleted();
        }
    }

    constructor(props: IWorkItemEditViewProps, context?: IContributionHubViewStateRouterContext) {
        super(props, context);

        this._projectId = this._tfsContext.navigation.projectId;
        this._store = ProjectCollection.getConnection(this._tfsContext).getService<WorkItemStore>(WorkItemStore);
        this.state = {
            errorMessage: null
        };
    }

    public componentDidMount() {
        // Workaround for react 16.x where nested ReactDOM.render performs async rendering
        // This should be revisted if the UI completedly overhauled with react
        setTimeout(() => {
            this._initializeForm();
            this._bindWorkItemToForm(this.props);
            this._attachRecycleBinEvents();
        }, 0);
    }

    public componentWillUnmount() {
        if (this._form) {
            this._detachRecycleBinEvents();
            this._form.dispose();
            this._form = null;
        }
    }

    public componentWillReceiveProps(nextProps: IWorkItemEditViewProps) {
        if (this.props.id !== nextProps.id || this.props.templateId !== nextProps.templateId
            || this.props.witd !== nextProps.witd || this.props.isNew !== nextProps.isNew) {
            this._bindWorkItemToForm(nextProps);
        }
    }

    public render(): JSX.Element {
        return <div className="query-results-view explorer work-items-view new-queries-view body-font">
            <div className="queries-view-content workitem-edit-view">
                {this.state.errorMessage ? createForServerError(this.state.errorMessage) :
                    <div className="workitem-title" />
                }
            </div>
        </div>;
    }

    private _initializeForm(): void {
        this._workItemHeaderToolBar = Controls.BaseControl.createIn(WorkItemToolbar, $(".workitem-title"), {
            workItemsNavigator: null,
            showWorkItemMenus: false,
            contributionIds: []
        }) as WorkItemToolbar;

        this._workItemInfoBar = Controls.BaseControl.createIn(WorkItemInfoBar, $(".workitem-title"), {
            workItemsNavigator: null,
            update: (infoBar, args) => {
                if (infoBar.workItem) {
                    delay(WorkItemTitleUtils.DefaultUpdateDelayEventName, WorkItemTitleUtils.DefaultUpdateDelayMs, () => {
                        document.title = WorkItemTitleUtils.getWorkItemEditorTitle(infoBar.workItem, WorkItemTitleUtils.DefaultTrimmedWorkItemEditorLength);
                    });
                }
            }
        }) as WorkItemInfoBar;

        const toolbarOptions = {
            toolbar: {
                inline: true,
                showFullScreenMenu: false
            },
            headerToolbar: this._workItemHeaderToolBar
        };

        this._form = Controls.BaseControl.createIn(WorkItemForm, $(".queries-view-content"), $.extend({
            tfsContext: this._tfsContext,
            infoBar: this._workItemInfoBar,
            workItemChanged: (args) => {
                if (args.change === WorkItemChangeType.Saved && args.firstSave) {
                    const state = {};
                    state[ActionParameters.ID] = args.workItem.id.toString();
                    state[ActionParameters.TEMPLATEID] = "";
                    state[ActionParameters.WITD] = "";
                    this._queriesHubContext.queryHubViewState.updateNavigationState(HistoryBehavior.replace, () => {
                        this._queriesHubContext.queryHubViewState.viewOptions.setViewOptions(state);
                        this._queriesHubContext.queryHubViewState.selectedPivot.value = ActionUrl.ACTION_EDIT;
                    });
                }
            },
            formViewType: WorkItemFormView
        }, toolbarOptions)) as WorkItemForm;

        this._form.infoBar = this._workItemInfoBar;
        this._form.setHeaderToolbar(this._workItemHeaderToolBar);
        this._form.showElement();
    }

    private _bindWorkItemToForm(props: IWorkItemEditViewProps): void {
        const workItemId: number = parseInt(props.id, 10);
        if (props.isNew && props.witd) {
            this._newWorkItem(props.witd, props.templateId, props.requestParams);
        } else if (props.id && !isNaN(workItemId)) {
            if (!Utils_String.equals(this._queriesHubContext.queryHubViewState.selectedPivot.value, ActionUrl.ACTION_EDIT, true)) {
                this._queriesHubContext.queryHubViewState.updateNavigationState(HistoryBehavior.replace, () => {
                    this._queriesHubContext.queryHubViewState.selectedPivot.value = ActionUrl.ACTION_EDIT;
                });
            }

            this._editWorkItem(props.id);
        } else {
            this._queriesHubContext.navigationActionsCreator.navigateToQueriesHub("", false, true);
        }
    }

    private _editWorkItem(id: string) {
        const workItemId: number = Number(id);

        if (isNaN(workItemId) === false) {
            this._form.beginShowWorkItem(
                workItemId,
                (editor, workItem: WorkItem) => {
                    editor.focus();
                },
                this.setError);

            // Update navigator immediately instead of wait for work item to render.
            // Work item form rendering is throttled to make sure it gets rendered only once if user switch between items fast.
            this._queriesHubContext.triageViewActionCreator.updateNavigatorInWorkItemEditView();
            this.setError(null);
        } else {
            this.setError(Resources.WorkItemIdNaN);
        }
    }

    private setError = (errorMessage: string) => {
        this.setState({ errorMessage }, () => {
            errorMessage ? this._form.hideElement() : this._form.showElement();
        });
    }

    private _newWorkItem(witd: string, templateId: string, requestParams: IDictionaryStringTo<string>) {
        const projectNameOrId: string = this._projectId;
        const startTime: number = Date.now();

        if (!witd) {
            throw new Error(Utils_String.format(VSS_Resources_Common.InvalidParameter, "witd"));
        }

        // NOTE: This code path is triggered only when workItemsHub is Off. It's safe to use tfsContext for team here
        const team = this._tfsContext.contextData.team;
        if (templateId && team) {
            // Prefetch workitem template for performance
            TemplateUtils.WorkItemTemplatesHelper.getWorkItemTemplate(this._tfsContext, team.id, templateId);
        }

        this._form.showLoadingIndicator(100);

        this._store.beginGetProject(projectNameOrId, (project: Project) => {
            project.beginGetWorkItemType(witd, (wit: WorkItemType) => {
                const workItem = WorkItemManager.get(this._store).createWorkItem(wit);
                const showWorkItem = (assignInitialValues: boolean) => {
                    if (assignInitialValues) {
                        if (templateId && team) {
                            // If templateId is specified, get template and apply it to the workitem
                            TemplateUtils.WorkItemTemplatesHelper.getAndApplyWorkItemTemplateForNewWorkItem(this._tfsContext, workItem, team.id, templateId);
                        } else {
                            InitialValueHelper.assignInitialValues(workItem, requestParams);
                        }
                    }

                    this._form.showWorkItem(workItem);
                    this._form.focus();
                };

                setClassificationNodesUsingMRU(workItem, project.guid).then(() => {
                    showWorkItem(true);
                }, (error: TfsError) => {
                    showWorkItem(true);
                });

                Telemetry.publishEvent(
                    new Telemetry.TelemetryEventData(WITCustomerIntelligenceArea.WORK_ITEM_TRACKING, "WorkItem.New.TriageView", {}, startTime));
            }, (error: TfsError) => {
                this._queriesHubContext.actionsCreator.showErrorMessageForTriageView(Utils_String.format(Resources.UnableToCreateBugOfType, witd));
                this._form.hideLoadingIndicator();
            });
        });
    }

    private _attachRecycleBinEvents() {
        Events_Services.getService().attachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this._deleteItemSuccessEventDelegate);
    }

    private _detachRecycleBinEvents() {
        Events_Services.getService().detachEvent(RecycleBinConstants.EVENT_DELETE_SUCCEEDED, this._deleteItemSuccessEventDelegate);
    }
}
