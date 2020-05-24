import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/SprintsHub/SprintEditor/Components/SprintEditorCallout";
import { Iteration } from "Agile/Scripts/Models/Iteration";
import { Team } from "Agile/Scripts/Models/Team";
import * as SprintsHubResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub";
import * as SprintEditorResources from "Agile/Scripts/Resources/TFS.Resources.SprintsHub.SprintEditor";
import { SprintEditorActions } from "Agile/Scripts/SprintsHub/SprintEditor/ActionsCreator/SprintEditorActions";
import { SprintEditorActionsCreator } from "Agile/Scripts/SprintsHub/SprintEditor/ActionsCreator/SprintEditorActionsCreator";
import { SprintEditorView } from "Agile/Scripts/SprintsHub/SprintEditor/Components/SprintEditorView";
import { SprintEditorStore } from "Agile/Scripts/SprintsHub/SprintEditor/Store/SprintEditorStore";
import { Callout, ICalloutProps } from "OfficeFabric/Callout";
import { FocusTrapZone } from "OfficeFabric/FocusTrapZone";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { css } from "OfficeFabric/Utilities";
import { SettingsService } from "TfsCommon/Scripts/Navigation/SettingsService";
import { getLocalService } from "VSS/Service";
import { registerLWPComponent } from "VSS/LWP";

export interface ISprintEditorCalloutProps extends ICalloutProps {
    /** The team context for the sprint editor form */
    currentTeam: Team;

    /** Callback for when the iteration was created/subscribed to */
    onCompleted?: (team: Team, iteration: Iteration) => void;

    /** Hide the sprint status message */
    hideStatusMessage?: boolean;
}

export interface ISprintEditorCalloutState {
    /** Is the callout message visible */
    messageVisible: boolean;
}

const MESSAGE_BAR_SETTINGS_KEY = "SprintEditorCalloutMessageBarVisible";
export class SprintEditorCallout extends React.Component<ISprintEditorCalloutProps, ISprintEditorCalloutState> {
    private _actions: SprintEditorActions;
    private _actionsCreator: SprintEditorActionsCreator;
    private _store: SprintEditorStore;

    constructor(props: ISprintEditorCalloutProps) {
        super(props);

        const messageVisible = getLocalService(SettingsService).getUserSetting(MESSAGE_BAR_SETTINGS_KEY, true);
        this.state = { messageVisible: !props.hideStatusMessage && messageVisible };

        this._actions = new SprintEditorActions();
        this._actionsCreator = new SprintEditorActionsCreator(this._actions);
        this._store = new SprintEditorStore(this._actions);

        this._actionsCreator.initialize(props.currentTeam);
    }
    public render(): JSX.Element {
        const {
            messageVisible
        } = this.state;

        const calloutProps = { ...this.props };
        delete calloutProps.currentTeam;

        return (
            <Callout
                {...calloutProps}
                className={css("sprint-editor-callout", this.props.className, { "sprint-editor-callout--message-visible": messageVisible })}
                role="dialog"
                ariaLabel={SprintsHubResources.NewSprint}
            >
                <FocusTrapZone isClickableOutsideFocusTrap={true} className="sprint-editor-callout-content">
                    {
                        messageVisible &&
                        <MessageBar
                            messageBarType={MessageBarType.info}
                            onDismiss={this._onMessageDismiss}
                        >
                            {SprintEditorResources.DialogMessage}
                        </MessageBar>
                    }
                    <SprintEditorView
                        actionsCreator={this._actionsCreator}
                        store={this._store}
                        hideTeamSelection={true}
                        onCancel={this._onCancel}
                        onCompleted={this.props.onCompleted}
                    />
                </FocusTrapZone>
            </Callout>
        );
    }

    private _onCancel = (): void => {
        const {
            onDismiss
        } = this.props;

        if (onDismiss) {
            onDismiss();
        }
    }

    private _onMessageDismiss = (): void => {
        this.setState({ messageVisible: false });
        getLocalService(SettingsService).setUserSetting(MESSAGE_BAR_SETTINGS_KEY, false);
    }
}

registerLWPComponent("sprintCallout", SprintEditorCallout);