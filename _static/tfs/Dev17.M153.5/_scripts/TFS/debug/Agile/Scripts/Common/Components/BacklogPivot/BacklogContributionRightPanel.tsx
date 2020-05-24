import * as React from "react";

import { BacklogNotifications, IBacklogGridItem, IBacklogGridSelectionChangedEventArgs } from "Agile/Scripts/Backlog/Events";
import { IContributedPanel } from "Agile/Scripts/Common/Agile";
import { HubError } from "Agile/Scripts/Common/Components/AgileHubError";
import { RightPaneHeader } from "Agile/Scripts/Common/Components/RightPaneHeader/RightPaneHeader";
import { ExceptionInfo } from "Agile/Scripts/Models/ExceptionInfo";
import { ITeam } from "Agile/Scripts/Models/Team";
import { Backlog_RightPanelContribution_LoadError } from "Agile/Scripts/Resources/TFS.Resources.BacklogsHub.BacklogView";
import { ScopedEventHelper } from "Agile/Scripts/ScopedEventHelper";
import { Contribution } from "VSS/Contributions/Contracts";
import * as Contributions_Controls from "VSS/Contributions/Controls";
import * as Contributions_Services from "VSS/Contributions/Services";
import { publishErrorToTelemetry } from "VSS/Error";
import * as Service from "VSS/Service";
import { announce } from "VSS/Utils/Accessibility";
import { format } from "VSS/Utils/String";
import { getErrorMessage } from "VSS/VSS";


import "VSS/LoaderPlugins/Css!Agile/Scripts/Common/Components/BacklogPivot/BacklogContributionRightPanel";


export interface IBacklogContributionRightPanelProps {
    eventHelper: ScopedEventHelper;
    contributionData: Contribution;
    getSelectedWorkItems: () => IBacklogGridItem[];
    onDismiss: () => void;
    team: ITeam;
}

export interface IBacklogContributionRightPanelState {
    contributionLoadingExceptionInfo?: ExceptionInfo;
}

export class BacklogContributionRightPanel extends React.Component<IBacklogContributionRightPanelProps, IBacklogContributionRightPanelState> {
    private _container: HTMLDivElement;
    private _contributedPanel: IContributedPanel;
    private _host: Contributions_Controls.IExtensionHost;
    private readonly IterationBacklogExtensionContainer: string = "backlogs-extension-tool-panel-container";

    constructor(props: IBacklogContributionRightPanelProps) {
        super(props);

        this.state = {
            contributionLoadingExceptionInfo: null
        };
    }

    public componentDidMount(): void {
        this._showContributedPanel();
        this._registerForWorkItemSelectionChanged(this.props.eventHelper);
    }

    public componentDidUpdate(): void {
        this._disposeHost();
        this._showContributedPanel();
    }

    public componentWillUnmount(): void {
        this._unregisterFromWorkItemSelectionChanged(this.props.eventHelper);
        this._disposeHost();
    }

    public componentWillReceiveProps(nextProps: IBacklogContributionRightPanelProps) {
        if (nextProps.eventHelper !== this.props.eventHelper) {
            this._unregisterFromWorkItemSelectionChanged(this.props.eventHelper);
            this._registerForWorkItemSelectionChanged(nextProps.eventHelper);
        }
    }

    public shouldComponentUpdate(nextProps: IBacklogContributionRightPanelProps, nextState: IBacklogContributionRightPanelState): boolean {
        return nextProps.contributionData !== this.props.contributionData ||
            nextState.contributionLoadingExceptionInfo !== this.state.contributionLoadingExceptionInfo;
    }

    public render(): JSX.Element {
        const { contributionLoadingExceptionInfo } = this.state;

        if (contributionLoadingExceptionInfo) {

            //  Errors from the left side of the splitter have been announced already, only
            //  need to announce errors from contribution loading.
            announce(
                format(
                    Backlog_RightPanelContribution_LoadError,
                    contributionLoadingExceptionInfo.exceptionMessage,
                    true));

            return (
                <div className={"right-panel-error-container"}>
                    <HubError exceptionsInfo={[contributionLoadingExceptionInfo]} />
                </div>
            );
        } else {
            return (
                <RightPaneHeader title={this.props.contributionData.properties.name} onDismissClicked={this.props.onDismiss}>
                    <div className="right-panel-contribution-outer-container">

                        <div ref={this._resolveContainerRef} className={this.IterationBacklogExtensionContainer} />
                    </div>
                </RightPaneHeader>
            );
        }
    }

    /**
     * Notifies the third-party extension rendered by this component of changes
     * in the work items selection.
     * @param selectedWorkItems List of selected work item.
     */
    protected _notifyExtensionOfSelectionChange = (selectedWorkItems: IBacklogGridItem[]) => {
        if (this._contributedPanel) {
            if (this._contributedPanel.workItemSelectionChanged &&
                typeof (this._contributedPanel.workItemSelectionChanged) === "function") {

                this._contributedPanel.workItemSelectionChanged(selectedWorkItems);
            }
        }
    }

    private _resolveContainerRef = (element: HTMLDivElement): void => {
        this._container = element;
    }

    private _showContributedPanel(): void {

        this._contributedPanel = null;
        this._host = null;
        const contributionId = this.props.contributionData.id;
        const errorHandler = this._errorHandler("ErrorInShowContributedPanel");
        const initialConfig = {
            team: this.props.team,
        };
        Contributions_Controls.createExtensionHost(
            $(this._container),
            contributionId,
            initialConfig
        ).then((host) => {
            this._host = host;
            Service.getService(Contributions_Services.ExtensionService).getContribution(contributionId).then((contribution) => {
                const registeredObjectId = contribution.properties["registeredObjectId"];
                if (registeredObjectId) {
                    host.getRegisteredInstance<IContributedPanel>(registeredObjectId).then((instance) => {
                        this._contributedPanel = instance;
                        const selectedWorkItems: IBacklogGridItem[] = (this.props.getSelectedWorkItems) ?
                            this.props.getSelectedWorkItems() :
                            [];

                        this._notifyExtensionOfSelectionChange(selectedWorkItems);
                    }, errorHandler);
                }
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

    private _disposeHost(): void {
        if (this._host) {
            this._host.dispose();
            this._host = null;
        }
    }

    private _errorHandler(errorCode: string): (error: Error, exceptionInfo?: ExceptionInfo) => void {
        return (error: Error, exceptionInfo?: ExceptionInfo) => {
            publishErrorToTelemetry({
                name: errorCode,
                message: getErrorMessage(error)
            });

            const exception = exceptionInfo ? exceptionInfo : {
                exceptionMessage: getErrorMessage(error)
            } as ExceptionInfo;

            this.setState({
                contributionLoadingExceptionInfo: exception
            });
        };
    }
}