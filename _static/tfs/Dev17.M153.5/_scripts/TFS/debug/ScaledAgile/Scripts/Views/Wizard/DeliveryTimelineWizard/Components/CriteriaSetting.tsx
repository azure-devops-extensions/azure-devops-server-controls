import * as React from "react";
import * as Utils_UI from "VSS/Utils/UI";
import * as Utils_String from "VSS/Utils/String";
import ScaledAgileResources = require("ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile");

import { IComboOptions } from "VSS/Controls/Combos";
import { ICriteriaSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/IDeliveryTimelineCriteriaInterfaces";
import { IFieldShallowReference, ValueState } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";
import { SettingFilterDropdownCombo } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Components/SettingFilterDropdownCombo";
import { DeliveryTimeLineViewClassNameConstants } from "ScaledAgile/Scripts/Views/DeliveryTimeLine/Components/Constants";

export interface ICriteriaSettingProps extends ICriteriaSettingData {
    /**
     * Unique guid identifier of the setting
     */
    id: string;
    /**
     * The row index of the setting
     */
    index: number;

    /**
     * Available field options for the field dropdown
     */
    availableFields: IFieldShallowReference[];

    /**
     * The callback whenever a criteria setting row is asked to be deleted
     */
    onDeleteRow: IArgsFunctionR<void>;

    /**
     * The callback whenever value in the field control is changed
     */
    onFieldChanged: IArgsFunctionR<void>;

    /**
     * The callback whenever value in the operator control is changed
     */
    onOperatorChanged: IArgsFunctionR<void>;

    /**
     * The callback whenever value in the value control is changed
     */
    onValueChanged: IArgsFunctionR<void>;

    /**
     * If the setting should be disabled
     */
    disabled: boolean;

    /*
     * Whether this setting row should focus on mount
     */
    focusOnMount?: boolean;

    /*
     * Whether this setting row should focus on delete button when rerender
     */
    focusDeleteButton?: boolean;
}

export class CriteriaSetting extends React.Component<ICriteriaSettingProps, {}> {
    public static SETTINGS_CONTAINER = "wizard-setting-row";
    public static SETTING_CONTAINER = "wizard-setting";
    public static SETTING_DELETE_CONTAINER = "wizard-delete-icon-container";
    public static SETTING_DELETE_ICON = "bowtie-icon bowtie-math-multiply";
    public static SETTING_FIELD_CLASS = "wizard-field";
    public static SETTINGS_FIELD_CONTROL = "field-control";
    public static SETTINGS_OPERATOR_CONTROL = "operator-control";
    public static SETTINGS_VALUE_CONTROL = "value-control";
    public static SETTING_GRIP = "wizard-grip";
    public static SETTING_FIELD_WIDTH = 320;
    public static SETTING_DELETE_CONTAINER_WIDTH = 14;
    public static SETTING_FIELD_MARGIN_RIGHT = 12;
    public static SETTING_FIELD_MARGIN_TOP = 5;

    private _deleteButtonDom: HTMLDivElement;

    constructor(props: ICriteriaSettingProps) {
        super(props);
        this._onFieldChanged = this._onFieldChanged.bind(this);
        this._onOperatorChanged = this._onOperatorChanged.bind(this);
    }

    private _onFieldChanged(value: string) {
        this.props.onFieldChanged(this.props.id, value);
    }

    private _onOperatorChanged(value: string) {
        this.props.onOperatorChanged(this.props.id, value);
    }

    private _onValueChanged(value: string) {
        this.props.onValueChanged(this.props.id, value);
    }

    public render(): JSX.Element {
        return <div className={CriteriaSetting.SETTINGS_CONTAINER} id={this.props.id}>
            {this._renderSetting()}
        </div>;
    }

    public componentDidMount() {
        if (this.props.focusDeleteButton) {
            this._deleteButtonDom.focus();
        }
    }

    public componentDidUpdate() {
        if (this.props.focusDeleteButton) {
            this._deleteButtonDom.focus();
        }
    }

    private _renderSetting(): JSX.Element {
        let fieldErrorMessage = this.props.field.name ? Utils_String.format(ScaledAgileResources.FieldDoesNotExistMessage, this.props.field.name) : ScaledAgileResources.FieldEmptyNameMessage;
        let operatorErrorMessage = this.props.operator.name ? Utils_String.format(ScaledAgileResources.OperatorDoesNotExistMessage, this.props.operator.name) : ScaledAgileResources.OperatorEmptyNameMessage;
        let isValueValid = this.props.value.valueState !== ValueState.ReadyButInvalid;
        let valueErrorMessage = ScaledAgileResources.NotSupportedFieldValueMessage;

        const teamFieldStyle = this._getTeamFieldDivStyle();
        return <div className={CriteriaSetting.SETTING_CONTAINER}>
            <div className={CriteriaSetting.SETTING_GRIP}></div>
            <div className={`${CriteriaSetting.SETTING_FIELD_CLASS} ${CriteriaSetting.SETTINGS_FIELD_CONTROL}`} style={teamFieldStyle}>
                {this._createFilterDropdownControl(this.props.availableFields,
                    this.props.field,
                    this._onFieldChanged,
                    this.props.id + "_field",
                    ScaledAgileResources.CriteriaFieldPlaceholder,
                    ScaledAgileResources.CriteriaFieldLabel,
                    this.props.focusOnMount)}
                <div aria-live="assertive" className="input-error-tip" hidden={this.props.field.valueState !== ValueState.ReadyButInvalid}>{fieldErrorMessage}</div>
            </div>
            <div className={`${CriteriaSetting.SETTING_FIELD_CLASS} ${CriteriaSetting.SETTINGS_OPERATOR_CONTROL}`} style={teamFieldStyle}>
                {this._createFilterDropdownControl(this.props.availableOperators,
                    this.props.operator,
                    this._onOperatorChanged,
                    this.props.id + "_operator",
                    ScaledAgileResources.CriteriaOperatorPlaceholder,
                    ScaledAgileResources.CriteriaOperatorLabel)}
                <div aria-live="assertive" className="input-error-tip" hidden={this.props.operator.valueState !== ValueState.ReadyButInvalid}>{operatorErrorMessage}</div>
            </div>
            <div className={`${CriteriaSetting.SETTING_FIELD_CLASS} ${CriteriaSetting.SETTINGS_VALUE_CONTROL}`} style={teamFieldStyle}>
                {this._createValueControl(isValueValid)}
                <div aria-live="assertive" className="input-error-tip" hidden={isValueValid}>{valueErrorMessage}</div>
            </div>
            <div className={CriteriaSetting.SETTING_DELETE_CONTAINER + " " + DeliveryTimeLineViewClassNameConstants.propagateKeydownEvent}
                ref={(element) => { this._deleteButtonDom = element; } }
                tabIndex={0}
                role="button"
                aria-label={ScaledAgileResources.CriteriaDeleteTooltip}
                onClick={(e) => { this._onDeleteButtonClick(e); }}
                onKeyDown={(e) => { this._onDeleteButtonKeyDown(e); }}>
                <i className={CriteriaSetting.SETTING_DELETE_ICON} />
            </div>
        </div>;
    }

    private _getTeamFieldDivStyle(): React.CSSProperties {
        let pixel = "px ";
        return {
            width: CriteriaSetting.SETTING_FIELD_WIDTH,
            margin: CriteriaSetting.SETTING_FIELD_MARGIN_TOP + pixel + CriteriaSetting.SETTING_FIELD_MARGIN_RIGHT + pixel + CriteriaSetting.SETTING_FIELD_MARGIN_TOP + pixel + "0px"
        };
    }

    private _onDeleteButtonClick(e: React.MouseEvent<HTMLElement>) {
        this._onDeleteButtonHandler();
    }

    private _onDeleteButtonKeyDown(e: React.KeyboardEvent<HTMLElement>) {
        if (e.keyCode === Utils_UI.KeyCode.ENTER) {
            this._onDeleteButtonHandler();
        }
        return false;
    }

    private _onDeleteButtonHandler() {
        if (!this.props.disabled) {
            this.props.onDeleteRow(this.props.id);
        }
    }

    private _createFilterDropdownControl(
        values: IFieldShallowReference[],
        initialValue: IFieldShallowReference,
        onInputChange: IArgsFunctionR<void>,
        controlId: string,
        placeholderText?: string,
        ariaLabel?: string,
        focusOnMount?: boolean): JSX.Element {
        let defaultOptions: IComboOptions = {
            placeholderText: placeholderText
        };

        let filterDropdownControl = <SettingFilterDropdownCombo
            id={controlId}
            values={values}
            options={defaultOptions}
            initialValue={initialValue}
            onInputChange={onInputChange}
            disabled={this.props.disabled}
            ariaLabel={ariaLabel}
            focusOnMount={focusOnMount}
        />;

        return filterDropdownControl;
    }

    private _createValueControl(isValid: boolean): JSX.Element {
        return this._createFilterDropdownControl(this.props.availableValues,
            this.props.value,
            (value) => { this._onValueChanged(value); },
            this.props.id + "_value",
            ScaledAgileResources.CriteriaValuePlaceholder,
            ScaledAgileResources.CriteriaValueLabel);
    }
}

