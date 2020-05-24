import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/SprintsHub/SprintEditor/Components/SprintEditorPane";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import { Team } from "Agile/Scripts/Models/Team";
import { SprintEditorActions } from "Agile/Scripts/SprintsHub/SprintEditor/ActionsCreator/SprintEditorActions";
import { SprintEditorActionsCreator } from "Agile/Scripts/SprintsHub/SprintEditor/ActionsCreator/SprintEditorActionsCreator";
import { SprintEditorView } from "Agile/Scripts/SprintsHub/SprintEditor/Components/SprintEditorView";
import { SprintEditorStore } from "Agile/Scripts/SprintsHub/SprintEditor/Store/SprintEditorStore";
import { FocusTrapZone } from "OfficeFabric/FocusTrapZone";
import { IPanelProps, Panel, PanelType } from "OfficeFabric/Panel";
import { css } from "OfficeFabric/Utilities";
import { registerLWPComponent } from "VSS/LWP";

export interface ISprintEditorPaneProps extends IPanelProps {
    /** The team context for the sprint editor form */
    currentTeam?: Team;

    /** The id of the iteration to edit*/
    editingIterationId?: string;

    /** Should hide the team selection combo box */
    hideTeamSelection?: boolean;

    /** Callback for when the iteration was created/subscribed to */
    onCompleted?: (team: Team, iteration: Iteration) => void;
}

export class SprintEditorPane extends React.Component<ISprintEditorPaneProps> {
    private _actions: SprintEditorActions;
    private _actionsCreator: SprintEditorActionsCreator;
    private _store: SprintEditorStore;

    constructor(props: ISprintEditorPaneProps) {
        super(props);

        this._actions = new SprintEditorActions();
        this._actionsCreator = new SprintEditorActionsCreator(this._actions);
        this._store = new SprintEditorStore(this._actions);
    }
    public render(): JSX.Element {
        const calloutProps = { ...this.props };
        delete calloutProps.currentTeam;

        return (
            <Panel
                {...calloutProps}
                isOpen={true}
                isBlocking={true}
                type={PanelType.medium}
                className={css("sprint-editor-pane", this.props.className)}
            >
                <FocusTrapZone isClickableOutsideFocusTrap={true} className="sprint-editor-pane-content">
                    <SprintEditorView
                        actionsCreator={this._actionsCreator}
                        store={this._store}
                        hideTeamSelection={this.props.editingIterationId != null || this.props.hideTeamSelection}
                        onCancel={this._onCancel}
                        onCompleted={this.props.onCompleted}
                    />
                </FocusTrapZone>
            </Panel>
        );
    }

    public componentDidMount(): void {
        this._actionsCreator.initialize(this.props.currentTeam, this.props.editingIterationId);
    }

    private _onCancel = (): void => {
        const {
            onDismiss
        } = this.props;

        if (onDismiss) {
            onDismiss();
        }
    }
}

registerLWPComponent("sprintPane", SprintEditorPane);