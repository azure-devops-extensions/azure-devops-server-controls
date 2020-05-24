import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/SprintsHub/SprintEditor/Components/SprintEditorView";
import { LoadingComponent } from "Presentation/Scripts/TFS/Components/LoadingComponent";
import { PerformanceTelemetryHelper } from "Presentation/Scripts/TFS/PerformanceTelemetryHelper";
import { SprintsHubConstants, SprintsHubRoutingConstants } from "Agile/Scripts/Generated/HubConstants";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import { Team } from "Agile/Scripts/Models/Team";
import { SprintEditorActionsCreator } from "Agile/Scripts/SprintsHub/SprintEditor/ActionsCreator/SprintEditorActionsCreator";
import { SprintEditorFormPage } from "Agile/Scripts/SprintsHub/SprintEditor/Components/SprintEditorFormPage";
import { ISprintEditorViewState, SprintEditorSelectors } from "Agile/Scripts/SprintsHub/SprintEditor/Selectors/SprintEditorSelectors";
import { SprintEditorStore } from "Agile/Scripts/SprintsHub/SprintEditor/Store/SprintEditorStore";
import { DelayedRender } from "OfficeFabric/Utilities";
import { Component, Props } from "VSS/Flux/Component";
import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";

export interface ISprintEditorViewProps extends Props {
    /** The actions creator to use with this component */
    actionsCreator: SprintEditorActionsCreator;
    /** The store that drives this component */
    store: SprintEditorStore;

    /** Should hide the team selection combo box */
    hideTeamSelection?: boolean;

    /** Form cancel handler */
    onCancel?: () => void;

    onCompleted?: (team: Team, iteration: Iteration) => void;
}

/**
 * Displays a form and creates a sprint editor
 */
export class SprintEditorView extends Component<ISprintEditorViewProps, ISprintEditorViewState> {
    private _ttiPublished: boolean;

    constructor(props: ISprintEditorViewProps) {
        super(props);
        this.state = SprintEditorSelectors.GetSprintEditorViewState(props.store);
        this._ttiPublished = false;
    }

    public render(): JSX.Element {
        const {
            editingIteration,
            hasFatalError,
            initialized,
            isCreatingSprint,
            isFetchingTeamIterations,
            messages,
            nextSuggestedIterationPath,
            projectIterationHierarchy,
            selectedTeam,
            selectedTeamBacklogIteration,
            selectedTeamDaysOff,
            selectedTeamIterationPaths,
            suggestedParentNode,
            teams
        } = this.state;

        const {
            hideTeamSelection,
            onCancel
        } = this.props;

        return (
            !initialized ?
                (
                    <div className="sprint-editor-loading">
                        <DelayedRender delay={1000}>
                            <LoadingComponent />
                        </DelayedRender>
                    </div>
                ) :
                (
                    <SprintEditorFormPage
                        editingIteration={editingIteration}
                        isCreating={isCreatingSprint}
                        isFetching={isFetchingTeamIterations}
                        hasFatalError={hasFatalError}
                        hideTeamSelection={hideTeamSelection}
                        messages={messages}
                        nextSuggestedIterationPath={nextSuggestedIterationPath}
                        projectIterationHierarchy={projectIterationHierarchy}
                        selectedTeam={selectedTeam}
                        selectedTeamBacklogIteration={selectedTeamBacklogIteration}
                        selectedTeamDaysOff={selectedTeamDaysOff}
                        selectedTeamIterationPaths={selectedTeamIterationPaths}
                        suggestedParentNode={suggestedParentNode}
                        teams={teams}
                        onCancel={onCancel}
                        onCreateIteration={this._onCreateIteration}
                        onEditIteration={this._onEditIteration}
                        onSelectIteration={this._onSelectIteration}
                        onTeamChanged={this._onSelectedTeamChanged}
                        onCloseMessage={this._onCloseMessage}
                    />
                )
        );
    }

    public componentWillMount() {
        const telemetryHelper = PerformanceTelemetryHelper.getInstance(SprintsHubConstants.HUB_NAME);
        if (telemetryHelper.isActive()) {
            telemetryHelper.split(`${SprintsHubConstants.HUB_NAME}_PivotWillMount: ${SprintsHubRoutingConstants.NewPivot}`);
        }
    }

    public componentDidMount(): void {
        const {
            store
        } = this.props;


        super.componentDidMount();

        store.addChangedListener(this._onStoreChanged);
        this._publishTTI();
    }

    public componentDidUpdate(): void {
        this._publishTTI();
    }

    public componentWillUnmount(): void {
        const {
            store
        } = this.props;

        store.removeChangedListener(this._onStoreChanged);
    }

    protected getStore(): SprintEditorStore {
        return this.props.store;
    }

    protected getState(): ISprintEditorViewState {
        return SprintEditorSelectors.GetSprintEditorViewState(this.props.store);
    }

    private _onCloseMessage = (id: string) => {
        const {
            actionsCreator
        } = this.props;
        actionsCreator.clearPageMessage(id);
    };

    private _onCreateIteration = (name: string, startDate: Date, endDate: Date, parentIterationPath: string): void => {
        const {
            actionsCreator,
            onCompleted
        } = this.props;

        const {
            selectedTeam
        } = this.state;

        actionsCreator.createAndSubscribeIteration(selectedTeam.id, selectedTeam.name, name, startDate, endDate, parentIterationPath).then((iteration) => {
            if (iteration && onCompleted) {
                onCompleted(selectedTeam, iteration);
            }
        });
    }

    private _onEditIteration = (iteration: INode, name: string, startDate: Date, endDate: Date): void => {
        const {
            actionsCreator,
            onCompleted
        } = this.props;

        const {
            selectedTeam
        } = this.state;

        actionsCreator.editIteration(iteration, name, startDate, endDate).then((iteration) => {
            if (iteration && onCompleted) {
                onCompleted(selectedTeam, iteration);
            }
        });
    }

    private _onSelectIteration = (iterationPath: string): void => {
        const {
            actionsCreator,
            onCompleted
        } = this.props;

        const {
            selectedTeam
        } = this.state;

        actionsCreator.subscribeToIteration(selectedTeam.id, selectedTeam.name, iterationPath).then((iteration) => {
            if (iteration && onCompleted) {
                onCompleted(selectedTeam, iteration);
            }
        });
    }

    private _onSelectedTeamChanged = (teamId: string): void => {
        const {
            actionsCreator
        } = this.props;

        actionsCreator.changeSelectedTeam(teamId);
    }

    private _onStoreChanged = (): void => {
        const {
            store
        } = this.props;

        this.setState(SprintEditorSelectors.GetSprintEditorViewState(store));
    }

    private _publishTTI(): void {
        if (!this._ttiPublished) {
            if (this.state.initialized) {
                this._ttiPublished = true;
                const telemetryHelper = PerformanceTelemetryHelper.getInstance(SprintsHubConstants.HUB_NAME);
                if (telemetryHelper.isActive()) {
                    telemetryHelper.end();
                }
            }
        }
    }
}