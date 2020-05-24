/// <reference types="jqueryui" />

import * as React from "react";
import { PageActions } from "ScaledAgile/Scripts/Shared/Actions/PageActions";
import { IconButton } from "ScaledAgile/Scripts/Shared/Components/IconButton";
import { IDeliveryTimelineTeamSettingsActionCreator, DeliveryTimelineTeamSettingsActionCreator } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Actions/DeliveryTimelineTeamSettingsActionsCreator";
import { DeliveryTimelineTeamSettingsServerRequestCache } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Actions/DeliveryTimelineTeamSettingsServerRequestCache";
import { DeliveryTimelineTeamSettingsActions } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Actions/DeliveryTimelineTeamSettingsActions";
import { DeliveryTimelineTeamSettingsMapper } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/DeliveryTimelineTeamSettingsMapper";
import { IDeliveryTimelineTeamSettingsData, ITeamSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/DeliveryTimelineTeamSettingsInterfaces";
import { DeliveryTimelineTeamSettingsStore } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Stores/DeliveryTimelineTeamSettingsStore";
import { DeliveryTimelineTeamSettingsDataProviders } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/DataProviders/DeliveryTimelineTeamSettingsDataProviders";
import { TeamSetting } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Components/TeamSetting";
import { FeatureEnablement } from "ScaledAgile/Scripts/Shared/Utils/FeatureEnablement";
import { ValidationState } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import { WizardConstants } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Components/WizardConstants";
import { DragDropZoneEnclosureConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";
import * as Utils_String from "VSS/Utils/String";
import { autobind } from "OfficeFabric/Utilities";
import { Label } from "OfficeFabric/Label";

import { DragAndDropZoneEnclosure } from "Presentation/Scripts/TFS/Components/DragDropZone/DragAndDropZoneEnclosure";
import { DropZone } from "Presentation/Scripts/TFS/Components/DragDropZone/DropZone";
import { DragZone } from "Presentation/Scripts/TFS/Components/DragDropZone/DragZone";

export interface IDeliveryTimelineTeamSettingsProps extends React.Props<void> {
    /**
     * The action creator for this view.
     */
    actionsCreator: IDeliveryTimelineTeamSettingsActionCreator;
    /**
     * The store for this view, used to initialize the state of the view.
     */
    store: DeliveryTimelineTeamSettingsStore;

    /**
     * If the team settings rows have been disabled
     */
    disabled: boolean;
}

export class DeliveryTimelineTeamSettings extends React.Component<IDeliveryTimelineTeamSettingsProps, IDeliveryTimelineTeamSettingsData> {

    public static DROP_TYPE = "teamsetting";
    
    private _applyFocusToLastRowInput = false;  // flag indicate whether the last row should have focus. This get sets when adding a new row.
    private _lastDeleteIndex = -1;  // store last index of the row that was deleted. This get sets when deleting a row.
    private _lastRowDelete = false; // flag indicate whether the last row has been deleted. This get sets when deleting a row.
    private _focusRowIndex = -1; // store new index of row on reorder to place focus on that row after reorder completes

    // This constant matches the "c_maxExpandedTeamsDefault" value defined in DeliveryTimelineSettings.cs
    private static c_maxExpandedTeamsDefault = 10;
    private _eventChangedHandler: IEventHandler;


    public refs: {
        [key: string]: Element;
        dropDom: HTMLDivElement;
    };

    constructor(props: IDeliveryTimelineTeamSettingsProps, context?: any) {
        super(props, context);
        this.state = $.extend({
            settings: [],
            validationState: ValidationState.Success,
            message: ""
        }, props.store.getValue());
        this._eventChangedHandler = (data: DeliveryTimelineTeamSettingsStore) => {
            if (data.getValue()) {
                this.setState(data.getValue());
            }
        };
    }

    public componentDidMount() {
        this.props.store.addChangedListener(this._eventChangedHandler);
    }

    public componentWillUnmount() {
        this.props.store.removeChangedListener(this._eventChangedHandler);
    }

    public onSettingsRowDeleted = (id: string) => {
        this._getLastDeleteIndex(id);
        this.props.actionsCreator.deleteTeamSetting(this.state.settings, id);
    }

    private _getLastDeleteIndex(id: string) {
        if (this.state.settings.length <= 2) {
            // if the settings only have two rows that could be deleted, 
            // this means there are no more row that can be deleted since we hide the delete button when there is only one row.
            // Hence no need to focus the delete button.
            this._lastDeleteIndex = -1;
            this._lastRowDelete = true;
        }
        else {
            for (let i = 0, l = this.state.settings.length; i < l; i++) {
                if (this.state.settings[i].id === id) {
                    this._lastDeleteIndex = i;
                    break;
                }
            }
        }
    }

    public onProjectChanged = (id: string, value: string) => {
        this.props.actionsCreator.changeProject(this.state.settings, id, value);
    }

    public onTeamChanged = (id: string, value: string) => {
        this.props.actionsCreator.changeTeam(this.state.settings, id, value);
    }

    public onBacklogLevelChanged = (id: string, value: string) => {
        this.props.actionsCreator.changeBacklogLevel(this.state.settings, id, value);
    }

    public render(): JSX.Element {
        if (this.state.settings && this.state.settings.length > 1) {
            return <DragAndDropZoneEnclosure
                idContext={DragDropZoneEnclosureConstants.CONTEXT_ID_TEAMS_CONFIGURATION}
                showPlaceHolderOnHover={false}
                showPossibleDropOnDragStart={false}
                className={WizardConstants.WIZARD_CONTAINER_CLASS}
                disabled={this.props.disabled}
            >
                <DropZone
                    idContext={DragDropZoneEnclosureConstants.CONTEXT_ID_TEAMS_CONFIGURATION}
                    restraintToYAxis={true}
                    isMovementAnimated={FeatureEnablement.isCardMovementAnimated()}
                    zoneTypes={[DeliveryTimelineTeamSettings.DROP_TYPE]}
                    onSortStart={() => { this._onSortStart(); }}
                    onSortCompleted={(id: string, newIndex: number, dragData: any) => { this._onSortUpdate(id, newIndex); }}
                >
                    {this._renderWizardSetting()}
                </DropZone>
            </DragAndDropZoneEnclosure>;
        }
        else {
            return <div className={WizardConstants.WIZARD_CONTAINER_CLASS}>
                {this._renderWizardSetting()}
            </div>;
        }
    }

    /**
     * What: When sort start we need to remove some Html from the placeholder
     * Why: We close the combo BUT JQuery UI is making a copy of the Dom to be dragged. The copy is done before
     *      the close occurs. We do not have an event to listen before the Placeholder creation, hence we need
     *      to alter the placeholder by removing the open section of the combo.
     */
    private _onSortStart(): void {
        //Get the closest enclosure (parent) and remove all combo which we know will be there for Wizard
        $(this.refs.dropDom)
            .closest("." + DragAndDropZoneEnclosure.getUniqueClassName(DragDropZoneEnclosureConstants.CONTEXT_ID_TEAMS_CONFIGURATION))
            .find(".combo-drop-popup")
            .remove();
    }

    private _renderWizardSetting(): JSX.Element {
        const shouldFocusOnAddButton = this._lastRowDelete;
        this._lastRowDelete = false;

        return <div ref="dropDom">
            <div className={WizardConstants.WIZARD_LABEL_CONTAINER_CLASS}>
                <div className="labels section-header">
                    <div style={{ maxWidth: TeamSetting.TEAM_SETTING_FIELD_WIDTH }}>
                        <Label required={true}>{ScaledAgileResources.ProjectLabel}</Label>
                    </div>
                    <div style={{ maxWidth: TeamSetting.TEAM_SETTING_FIELD_WIDTH }}>
                        <Label required={true}>{ScaledAgileResources.Team}</Label>
                    </div>
                    <div style={{ maxWidth: TeamSetting.TEAM_SETTING_FIELD_WIDTH }}>
                        <Label required={true}>{ScaledAgileResources.BacklogLevelLabel}</Label>
                    </div>
                </div>
            </div>
            <div className={WizardConstants.WIZARD_SETTING_CONTAINER_CLASS}>
                {this.state.settings.map((value: ITeamSettingData, index: number) => this._renderTeamSettings(value, index, this.state.settings && this.state.settings.length > 1))}
            </div>
            <IconButton
                action={() => this._onAdd()}
                text={ScaledAgileResources.AddSettingButton}
                icon="bowtie-icon bowtie-math-plus"
                className={WizardConstants.ADD_BUTTON_CLASS}
                disabled={this._isAddButtonDisabled()}
                focus={shouldFocusOnAddButton} />
            {this._renderMaxRowsMessage()}
            {this._renderDuplicateBacklogMessage()}
        </div>;
    }

    private _onAdd() {
        if (!this._hasSettingLimitReached()) {
            this.props.actionsCreator.addTeamSetting(this.state.settings, this.state.defaultSetting);
            this._applyFocusToLastRowInput = true;
        }
    }

    /**
     * Public for unit testing
     */
    public _isAddButtonDisabled(): boolean {
        return this._hasSettingLimitReached() || (this.state.settings.length === 0) || this.props.disabled;
    }

    /**
     * Render a complete line that represent the team with which backlog we will show in the Delivery Time Line
     * @param {ITeamSettingData} settingData - Settings for the whole row
     * @param {number} index - Rows index
     * @param {boolean} canDelete - Whether the team setting row can be deleted
     */
    private _renderTeamSettings(settingData: ITeamSettingData, index: number, canDelete: boolean): JSX.Element {
        const settingLen = this.state.settings.length;
        const applyFocusToRowInput = this._applyFocusToLastRowInput && ((index + 1) === settingLen);
        if (applyFocusToRowInput) {
            this._applyFocusToLastRowInput = false;
        }

        // check if this row should focus on delete button because the row was last deleted.
        if (this._lastDeleteIndex === settingLen) {
            this._lastDeleteIndex--;
        }
        const shouldFocusDeleteButton = this._lastDeleteIndex > -1 && this._lastDeleteIndex === index;
        if (shouldFocusDeleteButton) {
            this._lastDeleteIndex = -1;
        }

        let focusOnRow = false;
        if(this._focusRowIndex === index) {
            focusOnRow = true;
            this._focusRowIndex = -1;
        }

        return <DragZone
            idContext={DragDropZoneEnclosureConstants.CONTEXT_ID_TEAMS_CONFIGURATION}
            key={settingData.id}
            id={settingData.id}
            zoneTypes={[DeliveryTimelineTeamSettings.DROP_TYPE]}
            payload={settingData}
        ><TeamSetting key={index}
                id={settingData.id}
                index={index}
                canDelete={canDelete}
                focusDeleteButton={shouldFocusDeleteButton}
                focusOnMount={applyFocusToRowInput}
                focusOnRow={focusOnRow}
                onKeyboardReorder={this._onKeyboardSortUpdate}
                disabled={this.props.disabled}
                onDeleteRow={this.onSettingsRowDeleted}
                onProjectChanged={this.onProjectChanged}
                onTeamChanged={this.onTeamChanged}
                onBacklogLevelChanged={this.onBacklogLevelChanged}
                {...settingData} />
        </DragZone>;
    }

    @autobind
    private _onKeyboardSortUpdate(itemId: string, newIndex: number) {
        if(newIndex >= 0 && newIndex < this.state.settings.length) {
            this._focusRowIndex = newIndex;
            this._onSortUpdate(itemId, newIndex);
        }
    }

    /**
     * Callback after sort event is done.
     */
    private _onSortUpdate(itemId: string, newIndex: number) {
        this.props.actionsCreator.moveTeamSetting(this.state.settings, itemId, newIndex);
    }

    private _hasSettingLimitReached(): boolean {
        if (this.state.settings && this.state.settings.length >= DeliveryTimelineTeamSettings.c_maxExpandedTeamsDefault) {
            return true;
        }
        return false;
    }

    private _renderMaxRowsMessage(): JSX.Element {
        if (this._hasSettingLimitReached()) {
            return <div aria-live="assertive" className={WizardConstants.MESSAGE_AREA_CLASS}>
                <i className={WizardConstants.MESSAGE_AREA_INFO_ICON_CLASS} />
                <span>{Utils_String.format(ScaledAgileResources.WizardTeamSettingLimitMessage, DeliveryTimelineTeamSettings.c_maxExpandedTeamsDefault)}</span>
            </div>;
        }
        return null;
    }

    private _renderDuplicateBacklogMessage(): JSX.Element {
        if (this.state.validationState === ValidationState.Warning) {
            return <div aria-live="assertive" className={WizardConstants.MESSAGE_AREA_CLASS}>
                <i className={WizardConstants.MESSAGE_AREA_ERROR_ICON_CLASS} />
                <span>{ScaledAgileResources.WizardNonUniqueTeamSettingMessage}</span>
            </div>;
        }
        return null;
    }
}

export function init(pageActions: PageActions): JSX.Element {
    let deliveryWizarActions = new DeliveryTimelineTeamSettingsActions();
    let wizardStore = new DeliveryTimelineTeamSettingsStore(deliveryWizarActions);
    let actionsCreator = new DeliveryTimelineTeamSettingsActionCreator(new DeliveryTimelineTeamSettingsDataProviders(new DeliveryTimelineTeamSettingsMapper()), deliveryWizarActions, pageActions, new DeliveryTimelineTeamSettingsServerRequestCache());
    let props = {
        actionsCreator: actionsCreator,
        store: wizardStore,
        disabled: false
    };
    let reactDom = React.createElement(DeliveryTimelineTeamSettings, props);
    actionsCreator.initializeStore(null);
    return reactDom;
}
