import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/SprintsHub/Directory/Components/SprintsDirectoryView";
import { AgileHubShortcutGroup } from "Agile/Scripts/Common/Controls";
import { DirectoryActions } from "Agile/Scripts/Common/Directory/ActionsCreator/DirectoryActions";
import { createSprintsDirectoryActionCreator, IDirectoryActionsCreator } from "Agile/Scripts/Common/Directory/ActionsCreator/DirectoryActionsCreator";
import { DirectoryFilterBar } from "Agile/Scripts/Common/Directory/Components/DirectoryFilterBar";
import { DirectoryFilterStore, IDirectoryFilterStore } from "Agile/Scripts/Common/Directory/Store/DirectoryFilterStore";
import { DirectoryStore, IDirectoryStore } from "Agile/Scripts/Common/Directory/Store/DirectoryStore";
import { DirectoryPivotType } from "Agile/Scripts/Common/DirectoryPivot";
import { HubDirectoryFilterShortcutGroup, IHubDirectoryFilterShortcutActions } from "Agile/Scripts/Common/HubShortcuts";
import { SprintsUrls } from "Agile/Scripts/Common/HubUrlUtilities";
import { AgileRouteParameters } from "Agile/Scripts/Generated/HubConstants";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import { Team } from "Agile/Scripts/Models/Team";
import * as SprintsHubResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub";
import { SprintsNavigationSettingsService } from "Agile/Scripts/SprintsHub/Common/SprintsNavigationSettingsService";
import { SprintsDirectoryActions } from "Agile/Scripts/SprintsHub/Directory/ActionsCreator/SprintsDirectoryActions";
import { SprintsDirectoryActionsCreator } from "Agile/Scripts/SprintsHub/Directory/ActionsCreator/SprintsDirectoryActionsCreator";
import { SprintsDirectoryDataProvider } from "Agile/Scripts/SprintsHub/Directory/ActionsCreator/SprintsDirectoryDataProvider";
import { AllSprintsComponent } from "Agile/Scripts/SprintsHub/Directory/Components/AllSprintsComponent";
import { MySprintsComponent } from "Agile/Scripts/SprintsHub/Directory/Components/MySprintsComponent";
import { ISprintsDirectoryStore, SprintsDirectoryStore } from "Agile/Scripts/SprintsHub/Directory/Store/SprintsDirectoryStore";
import { SprintEditorPane } from "Agile/Scripts/SprintsHub/SprintEditor/Components/SprintEditorPane";
import { SprintsDirectoryViewState } from "Agile/Scripts/SprintsHub/SprintsHubViewState";
import { getDefaultWebContext } from "VSS/Context";
import { IEKeyboardEvent } from "VSS/Controls/KeyboardShortcuts";
import { getService } from "VSS/Service";
import { equals } from "VSS/Utils/String";
import { IObservableViewStateUrl } from "VSSPreview/Utilities/ViewStateNavigation";
import { Hub } from "VSSUI/Components/Hub/Hub";
import { HubHeader } from "VSSUI/Components/HubHeader/HubHeader";
import { IPivotBarAction, PivotBarItem } from "VSSUI/PivotBar";
import { HubViewOptionKeys } from "VSSUI/Utilities/HubViewState";
import { VssIconType } from "VSSUI/VssIcon";
import { areAdvancedBacklogFeaturesEnabled } from "Agile/Scripts/Common/Agile";

export interface ISprintsDirectoryViewProps {
    selectedPivot: DirectoryPivotType;
}

export interface ISprintsDirectoryViewState {
    newSprintPaneOpen: boolean;
}

export class SprintsDirectoryView extends React.Component<ISprintsDirectoryViewProps, ISprintsDirectoryViewState> {
    private _hubViewState: SprintsDirectoryViewState;
    private _allPivotUrl: IObservableViewStateUrl;
    private _minePivotUrl: IObservableViewStateUrl;

    private _directoryActionsCreator: IDirectoryActionsCreator;
    private _sprintsDirectoryActionsCreator: SprintsDirectoryActionsCreator;
    private _directoryStore: IDirectoryStore;
    private _directoryFilterStore: IDirectoryFilterStore;
    private _sprintDirectoryStore: ISprintsDirectoryStore;

    constructor(props: ISprintsDirectoryViewProps) {
        super(props);

        const defaultPivot: string = this.props.selectedPivot;
        this._hubViewState = new SprintsDirectoryViewState(defaultPivot);

        this._hubViewState.selectedPivot.subscribe(this._onPivotChanged);

        const directoryActions = new DirectoryActions();
        const sprintsDirectoryActions = new SprintsDirectoryActions();
        this._directoryActionsCreator = createSprintsDirectoryActionCreator(directoryActions);
        this._sprintsDirectoryActionsCreator = new SprintsDirectoryActionsCreator(sprintsDirectoryActions, this._directoryActionsCreator, new SprintsDirectoryDataProvider());

        this._directoryStore = new DirectoryStore(directoryActions);
        this._directoryFilterStore = new DirectoryFilterStore(directoryActions, this._hubViewState.filter, this._hubViewState.viewOptions, props.selectedPivot);
        this._sprintDirectoryStore = new SprintsDirectoryStore(directoryActions, sprintsDirectoryActions);

        // Set initial state
        this.state = {
            newSprintPaneOpen: false
        };
    }

    public componentWillMount(): void {
        this._allPivotUrl = this._hubViewState.createObservableUrl({
            [AgileRouteParameters.Pivot]: DirectoryPivotType.all as string
        });

        this._minePivotUrl = this._hubViewState.createObservableUrl({
            [AgileRouteParameters.Pivot]: DirectoryPivotType.mine as string
        });

        this._initializeShortcuts();
    }

    public componentWillUnmount(): void {
        if (this._hubViewState) {
            if (this._hubViewState.selectedPivot) {
                this._hubViewState.selectedPivot.unsubscribe(this._onPivotChanged);
            }
            this._hubViewState.dispose();
            this._hubViewState = null;
        }
    }

    public render() {
        return (
            <div className="sprints-directory-content">
                <Hub
                    hubViewState={this._hubViewState}
                    commands={this.getHubCommands()}
                    onRenderFilterBar={this._renderFilterBar}
                >
                    <HubHeader
                        title={SprintsHubResources.Sprints}
                    />
                    <PivotBarItem
                        key={`pivotBarItem.${SprintsHubResources.MinePivot}`}
                        className={"sprints-directory-pivotBarItem"}
                        name={SprintsHubResources.MinePivot}
                        url={this._minePivotUrl}
                        itemKey={DirectoryPivotType.mine as string}
                    >
                        <MySprintsComponent
                            directoryActionsCreator={this._directoryActionsCreator}
                            directoryFilterStore={this._directoryFilterStore}
                            directoryStore={this._directoryStore}
                            sprintDirectoryActionsCreator={this._sprintsDirectoryActionsCreator}
                            sprintDirectoryStore={this._sprintDirectoryStore}
                            filter={this._hubViewState.filter}
                        />
                    </PivotBarItem>
                    <PivotBarItem
                        key={`pivotBarItem.${SprintsHubResources.AllPivot}`}
                        name={SprintsHubResources.AllPivot}
                        className={"sprints-directory-pivotBarItem"}
                        url={this._allPivotUrl}
                        itemKey={DirectoryPivotType.all as string}
                    >
                        <AllSprintsComponent
                            directoryActionsCreator={this._directoryActionsCreator}
                            directoryFilterStore={this._directoryFilterStore}
                            directoryStore={this._directoryStore}
                            sprintDirectoryActionsCreator={this._sprintsDirectoryActionsCreator}
                            sprintDirectoryStore={this._sprintDirectoryStore}
                            filter={this._hubViewState.filter}
                            onNewSprint={this._onNewSprintClicked}
                        />
                    </PivotBarItem>
                </Hub>
                {this._renderSprintEditorPane()}
            </div>
        );
    }

    private _renderFilterBar = (): JSX.Element => {
        return (
            <DirectoryFilterBar
                activePivot={this._hubViewState.selectedPivot.value as DirectoryPivotType}
                filter={this._hubViewState.filter}
                directoryStore={this._directoryStore}
            />
        );
    }

    private _renderSprintEditorPane(): JSX.Element {
        const {
            newSprintPaneOpen
        } = this.state;

        if (newSprintPaneOpen) {
            return (
                <SprintEditorPane
                    onCompleted={this._onNewSprintCompleted}
                    onDismiss={this._onNewSprintDismissed}
                />
            );
        }
    }

    private getHubCommands(): IPivotBarAction[] {
        if (!areAdvancedBacklogFeaturesEnabled()) {
            return [];
        }

        return [{
            key: "new-sprint",
            name: SprintsHubResources.NewSprint,
            important: true,
            iconProps: { iconName: "CalculatorAddition", iconType: VssIconType.fabric },
            onClick: this._onNewSprintClicked
        }];
    }

    private _initializeShortcuts() {
        const actions: IHubDirectoryFilterShortcutActions = {
            filterResultsAction: this._showFilterBarShortcutAction
        };

        new AgileHubShortcutGroup(this._hubViewState.viewOptions);
        new HubDirectoryFilterShortcutGroup(actions);
    }

    private _onNewSprintClicked = (): void => {
        this.setState({ newSprintPaneOpen: true });
    }

    private _onNewSprintCompleted = (team: Team, iteration: Iteration): void => {
        const url = SprintsUrls.getExternalSprintContentUrl(team.name, iteration.iterationPath);

        const webContext = getDefaultWebContext();

        if (!webContext.team || equals(webContext.team.id, team.id, true)) {
            SprintsUrls.navigateToSprintsHubUrl(url);
        } else {
            //  If we are navigating to a different team, then let the event go through so user gets redirected to the
            //  sprint URL forcing a full-page refresh.
            window.location.href = url;
        }
    }

    private _onNewSprintDismissed = (): void => {
        this.setState({ newSprintPaneOpen: false });
    }

    private _onPivotChanged = (newPivotKey: string) => {
        // // Persist selected pivot.
        getService(SprintsNavigationSettingsService).directoryPivot = newPivotKey;
        this._directoryActionsCreator.pivotChanged(newPivotKey as DirectoryPivotType);
    }

    private _showFilterBarShortcutAction = (e: IEKeyboardEvent, combo: string) => {
        this._hubViewState.viewOptions.setViewOption(HubViewOptionKeys.showFilterBar, true);
    }
}