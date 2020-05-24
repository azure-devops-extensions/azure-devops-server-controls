import * as React from "react";
import { IconButton } from "ScaledAgile/Scripts/Shared/Components/IconButton";
import { IDeliveryTimelineMarkersActionCreator } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Actions/DeliveryTimelineMarkersActionsCreator";
import { ValidationState } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";
import { DeliveryTimelineMarkersStore } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Stores/DeliveryTimelineMarkersStore";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import * as Utils_String from "VSS/Utils/String";
import { Label } from "OfficeFabric/Label";
import { MarkersSettingRow } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Components/MarkersSettingRow";
import { IDeliveryTimelineMarkersData, IMarkersSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/IDeliveryTimelineMarkersInterfaces";
import { WizardConstants } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Components/WizardConstants"; 

export interface IMarkersSettingsProps {
    /**
     * The action creator for this view.
     */
    actionsCreator: IDeliveryTimelineMarkersActionCreator;

    /**
     * The store for this view, used to initialize the state of the view.
     */
    store: DeliveryTimelineMarkersStore;

    /**
     * If the team settings rows have been disabled
     */
    disabled: boolean;
}

export class MarkersSetting extends React.Component<IMarkersSettingsProps, IDeliveryTimelineMarkersData> {
    private _applyFocusToFirstRow = false;  // flag indicate whether the first row should have focus. This get sets when adding a new row.    

    private static c_maxMarkersDefault = 30;
    private _eventChangedHandler: IEventHandler;

    constructor(props: IMarkersSettingsProps) {
        super(props);

        this.state = {
            markers: props.store.getValue().markers,
            validationState: ValidationState.Success,
            message: "",
        };
        this._eventChangedHandler = (data: DeliveryTimelineMarkersStore) => {
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

    public render(): JSX.Element {
        return <div className={WizardConstants.WIZARD_CONTAINER_CLASS}>
            {this._renderMarkerSetting()}
        </div>;
    }

    private _renderMarkerSetting(): JSX.Element {
        return <div>
            <IconButton
                action={() => this._onAdd()}
                text={ScaledAgileResources.AddMarkerButton}
                icon="bowtie-icon bowtie-math-plus"
                className={WizardConstants.ADD_BUTTON_CLASS}
                disabled={this._isAddButtonDisabled()} />
            {this._renderMaxRowsMessage()}
            {
                this.state.markers.length > 0 &&
                <div className={WizardConstants.WIZARD_LABEL_CONTAINER_CLASS}>
                    <div className="labels section-header">
                        <div style={{ minWidth: MarkersSettingRow.DatePickerWidth, maxWidth: MarkersSettingRow.DatePickerWidth }}>
                            <Label required={true}>{ScaledAgileResources.DateLabel}</Label>
                        </div>
                        <div style={{ maxWidth: MarkersSettingRow.LabelWidth }}>
                            <Label required={true}>{ScaledAgileResources.LabelLabel}</Label>
                        </div>
                        <div style={{ maxWidth: MarkersSettingRow.ColorPickerWidth }}>
                            <Label required={true}>{ScaledAgileResources.ColorLabel}</Label>
                        </div>
                    </div>
                </div>
            }
            <div className={WizardConstants.WIZARD_SETTING_CONTAINER_CLASS}>
                {this.state.markers.map((value: IMarkersSettingData, index: number) => this._renderMarkerSettings(value, index))}
            </div>
        </div>;
    }

    private _onAdd() {
        if (!this._hasSettingLimitReached()) {
            this.props.actionsCreator.addMarker(this.state.markers);
            this._applyFocusToFirstRow = true;
        }
    }

    private _isAddButtonDisabled(): boolean {
        return this._hasSettingLimitReached() || this.props.disabled;
    }

    private _renderMarkerSettings(markerData: IMarkersSettingData, index: number) {
        return <MarkersSettingRow
            key={index}
            markerData={markerData}
            disabled={this.props.disabled}
            onDeleteRow={this._onMarkerRowDeleted}
            onColorChanged={this._onColorChanged}
            onLabelChanged={this._onLabelChanged}
            onDateChanged={this._onDateChanged}
            focusOnMount={this._applyFocusToFirstRow && index == 0}
        />;
    }

    private _onMarkerRowDeleted = (id: string) => {
        this.props.actionsCreator.deleteMarker(this.state.markers, id);
    }

    private _onDateChanged = (id: string, value: Date) => {
        this.props.actionsCreator.changeDate(this.state.markers, id, value);
    }

    private _onColorChanged = (id: string, value: string) => {
        this.props.actionsCreator.changeColor(this.state.markers, id, value);
    }

    private _onLabelChanged = (id: string, value: string) => {
        this.props.actionsCreator.changeLabel(this.state.markers, id, value);
    }

    private _hasSettingLimitReached(): boolean {
        if (this.state.markers && this.state.markers.length >= MarkersSetting.c_maxMarkersDefault) {
            return true;
        }
        return false;
    }

    private _renderMaxRowsMessage(): JSX.Element {
        if (this._hasSettingLimitReached()) {
            return <div className={WizardConstants.MESSAGE_AREA_CLASS}>
                <i className={WizardConstants.MESSAGE_AREA_INFO_ICON_CLASS} />
                <span>{Utils_String.format(ScaledAgileResources.WizardMarkersLimitMessage, MarkersSetting.c_maxMarkersDefault)}</span>
            </div>;
        }
        return null;
    }
}