import * as React from "react";

import { BacklogNotifications, IBacklogGridItem, IBacklogGridSelectionChangedEventArgs } from "Agile/Scripts/Backlog/Events";
import { HubError } from "Agile/Scripts/Common/Components/AgileHubError";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";
import * as Contributions_Controls from "VSS/Contributions/Controls";
import * as Contributions_Services from "VSS/Contributions/Services";
import { publishErrorToTelemetry } from "VSS/Error";
import * as Service from "VSS/Service";
import { getErrorMessage } from "VSS/VSS";

/**
 * Defines a contribution targeting the right Pane of the sprints hub.
 */
export interface IContributionDetails {
    id: string;
    contributionType: string;
    description: string;
    title: string;
    name: string;
    uri: string;
    /** Id of the object registered for the Pane */
    registeredObjectId: string;
}

/**
 * Interface implemented by backlog pages third-party extensions.
 */
export interface IContributedPanel {
    /**
     * Handles notification of work items selection changed in the backlog pages.
     */
    workItemSelectionChanged?: (selectedWorkItems: IBacklogGridItem[]) => void;
}

export interface IContributedPanelProps {
    eventHelper: ScopedEventHelper;
    contributionData: IContributionDetails;
    getSelectedWorkItems: () => IBacklogGridItem[];
}

export interface IContributedPaneState {
    exceptionInfo: ExceptionInfo;
}

/**
 * This can be used to render a Backlog panel contribution that reacts to selection change in backlog grid
 */
export class ContributedPanel extends React.Component<IContributedPanelProps, IContributedPaneState> {
    private _container: HTMLDivElement;
    private _contributedPane: IContributedPanel;
    private readonly IterationBacklogExtensionContainer: string = "backlogs-extension-tool-Pane-container";

    constructor(props: IContributedPanelProps) {
        super(props);
    }

    public componentDidMount(): void {
        this._showContributedPane();
        this._registerForWorkItemSelectionChanged(this.props.eventHelper);
    }

    public componentWillUnmount(): void {
        this._unregisterFromWorkItemSelectionChanged(this.props.eventHelper);
    }

    public componentWillReceiveProps(nextProps: IContributedPanelProps) {

        if (nextProps.eventHelper !== this.props.eventHelper) {
            this._unregisterFromWorkItemSelectionChanged(this.props.eventHelper);
            this._registerForWorkItemSelectionChanged(nextProps.eventHelper);
        }
    }

    public render(): JSX.Element {
        const {
            exceptionInfo
        } = this.state;

        if (exceptionInfo) {
            return (
                <div className={"right-Pane-error-container"}>
                    <HubError exceptionsInfo={[exceptionInfo]} />
                </div>
            );
        }

        return (
            <div
                ref={this._resolveContainerRef}
                className={this.IterationBacklogExtensionContainer}
            />
        );
    }

    /**
     * Notifies the third-party extension rendered by this component of changes
     * in the work items selection.
     * @param selectedWorkItems List of selected work item.
     */
    protected _notifyExtensionOfSelectionChange = (selectedWorkItems: IBacklogGridItem[]) => {
        if (this._contributedPane) {
            if (this._contributedPane.workItemSelectionChanged &&
                typeof (this._contributedPane.workItemSelectionChanged) === "function") {

                this._contributedPane.workItemSelectionChanged(selectedWorkItems);
            }
        }
    }

    private _resolveContainerRef = (element: HTMLDivElement): void => {
        this._container = element;
    }

    private _showContributedPane(): void {
        this._contributedPane = null;
        const contributionId = this.props.contributionData.id;
        const errorHandler = this._errorHandler("ErrorInShowContributedPane");

        Contributions_Controls.createExtensionHost(
            $(this._container),
            contributionId,
            {}).then((host) => {
                Service.getService(Contributions_Services.ExtensionService).getContribution(contributionId).then((contribution) => {

                    host.getRegisteredInstance<IContributedPanel>(contribution.properties["registeredObjectId"]).then((instance) => {
                        this._contributedPane = instance;
                        const selectedWorkItems: IBacklogGridItem[] = (this.props.getSelectedWorkItems) ?
                            this.props.getSelectedWorkItems() :
                            [];

                        this._notifyExtensionOfSelectionChange(selectedWorkItems);
                        this.setState({
                            exceptionInfo: null
                        });
                    }, errorHandler);
                }, errorHandler);
            }, errorHandler);
    }

    private _registerForWorkItemSelectionChanged(eventHelper: ScopedEventHelper): void {
        eventHelper.attachEvent(
            BacklogNotifications.BACKLOG_GRID_SELECTION_CHANGED,
            (source, args: IBacklogGridSelectionChangedEventArgs) => {
                this._notifyExtensionOfSelectionChange(args.selectedWorkItems);
            }
        );
    }

    private _unregisterFromWorkItemSelectionChanged(eventHelper: ScopedEventHelper): void {
        eventHelper.detachEvent(
            BacklogNotifications.BACKLOG_GRID_SELECTION_CHANGED,
            this._notifyExtensionOfSelectionChange);
    }

    private _errorHandler(errorCode: string): (error: Error, exceptionInfo?: ExceptionInfo) => void {
        return (error: Error, exceptionInfo?: ExceptionInfo) => {
            publishErrorToTelemetry({
                name: errorCode,
                message: getErrorMessage(error)
            });

            exceptionInfo = exceptionInfo || {
                exceptionMessage: getErrorMessage(error)
            } as ExceptionInfo;

            this.setState({
                exceptionInfo
            });
        };
    }
}