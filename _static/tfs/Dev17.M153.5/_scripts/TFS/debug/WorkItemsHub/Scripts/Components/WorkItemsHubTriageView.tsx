import * as React from "react";
import * as Resources from "WorkItemsHub/Scripts/Resources/TFS.Resources.WorkItemsHub";
import * as Resources_Platform from "VSS/Resources/VSS.Resources.Platform";
import * as WITResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import * as Events_Action from "VSS/Events/Action";
import * as VSS from "VSS/VSS";
import { autobind, Async } from "OfficeFabric/Utilities";
import { Hub } from "VSSUI/Hub";
import { HubHeader } from "VSSUI/HubHeader";
import { VssIconType, IVssIconProps } from "VSSUI/VssIcon";
import { HubViewState } from "VSSUI/Utilities/HubViewState";
import { PivotBarItem, IPivotBarAction, IPivotBarViewAction, PivotBarViewActionType } from "VSSUI/PivotBar";
import * as WorkItemsXhrNavigationUtils from "WorkItemsHub/Scripts/Utils/WorkItemsXhrNavigationUtils";
import { ObservableArray, IObservableArray } from "VSS/Core/Observable";
import Utils_String = require("VSS/Utils/String");
import { UsageTelemetryHelper } from "WorkItemsHub/Scripts/Utils/Telemetry";
import { WorkItemFormWrapper, ITriageOptions } from "WorkItemsHub/Scripts/WorkItemFormWrapper";
import { ITriageShortcutOptions } from "../WorkItemsHubFormShortcutGroup";
import { promptMessageDialog } from "WorkItemTracking/Scripts/Dialogs/WITDialogs";
import { ZeroDataFactory } from "WorkItemsHub/Scripts/Utils/ZeroDataFactory";
import { IVssPageContext } from "VSS/Platform/Context";

export interface IWorkItemsHubTriageViewProps {
    /**
     * Tab ID for triage view.
     */
    tabId: string;

    /**
     * Tab name for triage view.
     */
    tabName: string;

    /**
     * IDs of work items to be triaged.
     */
    workItemIds: number[];

    /**
     * Starting index from workItemIds.
     */
    startingIndex: number;

    /**
     * Sets of field names to field value which are specified as request parameters, used to initialize field when create work item.
     */
    requestParameters?: IDictionaryStringTo<string>;

    /**
     * Optional handler for navigate event.
     */
    onNavigate?: (workItemId: number) => void;

    /**
     * Optional page context from new platform.
     */
    pageContext?: IVssPageContext;
}


export interface IWorkItemsHubTriageViewState {
    serverErrorMessage?: string;
}

export class WorkItemsHubTriageView extends React.PureComponent<IWorkItemsHubTriageViewProps, IWorkItemsHubTriageViewState> {
    private _currentIndex: number;
    private _lastIndex: number;
    private _hubViewState: HubViewState;
    private _commands: IPivotBarAction[];
    private _viewActions: IObservableArray<IPivotBarViewAction>;
    private _previousLabel: string;
    private _nextLabel: string;
    private _async: Async = new Async();
    private _debouncedOnNavigate: (workItemId: number, toIndex: number) => void;
    private _fromIndex: number = -1;
    private _workItemFormWrapper: WorkItemFormWrapper;
    private _triageShortcutOptions: ITriageShortcutOptions;
    private _navigateDisabled: boolean;
    private _workItemIds: number[];
    private _disposed: boolean = false;

    constructor(props: IWorkItemsHubTriageViewProps) {
        super(props);
        this.state = {};

        const { tabId, tabName, startingIndex } = this.props;
        this._workItemIds = [...this.props.workItemIds];

        this._triageShortcutOptions = {
            navigatePrevious: this._navigatePrevious,
            navigateNext: this._navigateNext,
            returnToTab: WorkItemsXhrNavigationUtils.navigateToWorkItemHub
        };

        this._currentIndex = startingIndex;
        this._lastIndex = this._workItemIds.length - 1;
        this._hubViewState = new HubViewState();

        this._initCommands(tabName);
        this._initViewActions(tabName);
        this._debouncedOnNavigate = this._async.debounce(
            (workItemId: number, toIndex: number) => {
                UsageTelemetryHelper.publishTriageViewNavigationTelemetry(tabId, this._fromIndex, toIndex, this._workItemIds.length);

                // reset error and go to new work item
                this.setState({ serverErrorMessage: null } as IWorkItemsHubTriageViewState, () => this._onNavigate(workItemId));
                this._fromIndex = -1;
            },
            250,
            { leading: false, trailing: true });
    }

    public render(): JSX.Element {
        const { serverErrorMessage } = this.state;
        const content: JSX.Element = serverErrorMessage ?
            ZeroDataFactory.createForServerError(serverErrorMessage) : <div className="triage-view-content body-font" ref={this._onContainerRef} />;

        return (
            <Hub className="work-items-hub-triage-view" hubViewState={this._hubViewState} hideFullScreenToggle={true}>
                <HubHeader title={this.props.tabName} />
                <PivotBarItem name="main" itemKey="main" className="customPadding" commands={this._commands} viewActions={this._viewActions}>
                    {content}
                </PivotBarItem>
            </Hub>
        );
    }

    public componentWillUnmount(): void {
        this._disposed = true;

        if (this._async) {
            this._async.dispose();
            this._async = null;
        }

        if (this._workItemFormWrapper) {
            this._workItemFormWrapper.dispose();
            this._workItemFormWrapper = null;
        }
    }

    @autobind
    private _onNavigate(nextWorkItemId: number): void {
        if (this._workItemFormWrapper) {
            this._workItemFormWrapper.beginShowWorkItem(nextWorkItemId);
            WorkItemsXhrNavigationUtils.replaceHubStateWithEditWorkItem(nextWorkItemId);
        }

        this.props.onNavigate && this.props.onNavigate(nextWorkItemId);
    }

    @autobind
    private _navigatePrevious(): void {
        this._navigate(Math.max(0, this._currentIndex - 1));
    }

    @autobind
    private _navigateNext(): void {
        this._navigate(Math.min(this._lastIndex, this._currentIndex + 1));
    }

    @autobind
    private _onContainerRef(ref: HTMLDivElement): void {
        // _workItemFormWrapper will only be null initially and after unmount
        // otherwise, only when there's an error loading the work item will _workItemFormWrapper be set to null
        if (this._workItemFormWrapper) {
            this._workItemFormWrapper.dispose();
            this._workItemFormWrapper = null;
        }

        if (!ref) {
            return;
        }

        // Workaround for react 16.x where nested ReactDOM.render performs async rendering
        // This should be revisted if the UI completedly overhauled with react
        setTimeout(() => {
            // Check ref again since this is async
            if (!ref) {
                return;
            }

            const { requestParameters } = this.props;
            this._workItemFormWrapper = WorkItemFormWrapper.createForView(
                this.props.pageContext,
                ref,
                this._workItemIds[this._currentIndex],
                requestParameters,
                {
                    shortcutOptions: this._triageShortcutOptions,
                    onWorkItemDeleteSuccess: this._onWorkItemDeleteSuccess,
                    onError: this._onError
                } as ITriageOptions);
        }, 0);
    }

    private _navigate(toIndex: number): void {
        if ((!this._workItemFormWrapper && !this.state.serverErrorMessage) || this._navigateDisabled) {
            return;
        }

        this._fromIndex = this._fromIndex === -1 ? this._currentIndex : this._fromIndex; // set from-index only if debounce has cleared it with -1
        if (this._fromIndex === toIndex) {
            return;
        }

        const proceedWithNavigation = () => {
            this._currentIndex = toIndex;
            this._viewActions.value = this._getViewActions();
            this._debouncedOnNavigate(this._workItemIds[toIndex], toIndex);
        }

        // navigate immediately if not dirty
        if (!this._workItemFormWrapper || !this._workItemFormWrapper.isDirty()) {
            proceedWithNavigation();
            return;
        }

        // navigate only if prompt result is "leave" (also reset dirty if so)
        this._navigateDisabled = true; // disable navigate so we don't have a bunch of prompts
        promptMessageDialog(
            Events_Action.getService().performAction(Events_Action.CommonActions.ACTION_WINDOW_UNLOAD, {}) as string,
            Resources_Platform.UnsavedChangesMessageTitle,
            [
                { id: "leave", text: Resources_Platform.UnsavedChangesLeaveButton, reject: false },
                { id: "stay", text: Resources_Platform.UnsavedChangesStayButton, reject: true }
            ] as IMessageDialogButton[],
            true).then((dialogResult: IMessageDialogResult) => {
                proceedWithNavigation();
                this._workItemFormWrapper.resetDirty();
                this._navigateDisabled = false;
            },
                () => this._navigateDisabled = false);
    }

    private _initCommands(tabName: string): void {
        const backToTabTooltip = Utils_String.format(Resources.TriageBackToTabTooltip, tabName);
        this._commands = [
            {
                key: "back-to-work-items",
                name: Resources.BackToWorkItems,
                ariaLabel: backToTabTooltip,
                title: backToTabTooltip,
                important: true,
                iconProps: { iconName: "RevToggleKey", iconType: VssIconType.fabric } as IVssIconProps,
                onClick: () => {
                    UsageTelemetryHelper.publishBackToWorkItemsFromTriageViewTelemetry(this.props.tabId, this._workItemIds.length);
                    WorkItemsXhrNavigationUtils.navigateToWorkItemHub(this.props.pageContext);
                }
            }
        ] as IPivotBarAction[];
    }

    private _initViewActions(tabName: string): void {
        this._previousLabel = Utils_String.format(Resources.TriagePreviousWorkItemTooltip, tabName);
        this._nextLabel = Utils_String.format(Resources.TriageNextWorkItemTooltip, tabName);
        this._viewActions = new ObservableArray<IPivotBarViewAction>(this._getViewActions());
    }

    @autobind
    private _onWorkItemDeleteSuccess(): void {
        if (!this._disposed) {
            --this._lastIndex;
            if (this._lastIndex < 0) {
                // nothing left to show, navigate to WIH
                WorkItemsXhrNavigationUtils.navigateToWorkItemHub(this.props.pageContext);
                return;
            }

            this._workItemIds.splice(this._currentIndex, 1);
            if (this._currentIndex > this._lastIndex) {
                this._currentIndex = this._lastIndex;
            }
            this._viewActions.value = this._getViewActions();
            this._onNavigate(this._workItemIds[this._currentIndex]);
        }
    }

    @autobind
    private _onError(error: any): void {
        if (!this._disposed) {
            this.setState({ serverErrorMessage: VSS.getErrorMessage(error) });
        }
    }

    @autobind
    private _getViewActions(enabled: boolean = true): IPivotBarViewAction[] {
        const currentIndex = this._currentIndex;

        return [
            {
                key: "work-item-status",
                name: Utils_String.format(WITResources.TriageSummary, currentIndex + 1, this._workItemIds.length),
                important: true
            },
            {
                key: "previous-work-item",
                actionType: PivotBarViewActionType.Command,
                ariaLabel: this._previousLabel,
                title: this._previousLabel,
                iconProps: { iconName: "Up", iconType: VssIconType.fabric } as IVssIconProps,
                important: true,
                disabled: !enabled || currentIndex <= 0,
                onClick: this._navigatePrevious
            },
            {
                key: "next-work-item",
                actionType: PivotBarViewActionType.Command,
                ariaLabel: this._nextLabel,
                title: this._nextLabel,
                iconProps: { iconName: "Down", iconType: VssIconType.fabric } as IVssIconProps,
                important: true,
                disabled: !enabled || currentIndex >= this._lastIndex,
                onClick: this._navigateNext
            }
        ];
    }
}
