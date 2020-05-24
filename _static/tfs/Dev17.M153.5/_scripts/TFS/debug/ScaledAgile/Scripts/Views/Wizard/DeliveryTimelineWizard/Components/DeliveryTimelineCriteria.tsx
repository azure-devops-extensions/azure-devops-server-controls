import * as React from "react";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import * as Utils_String from "VSS/Utils/String";

import { PageActions } from "ScaledAgile/Scripts/Shared/Actions/PageActions";
import { IconButton } from "ScaledAgile/Scripts/Shared/Components/IconButton";
import { ValidationState } from "ScaledAgile/Scripts/Shared/Models/IModelWithValidation";
import { CriteriaSetting } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Components/CriteriaSetting";
import { IDeliveryTimelineCriteriaData, ICriteriaSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/IDeliveryTimelineCriteriaInterfaces";
import { DeliveryTimelineCriteriaStore } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Stores/DeliveryTimelineCriteriaStore";
import { DeliveryTimelineCriteriaActionsCreator, IDeliveryTimelineCriteriaActionsCreator } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Actions/DeliveryTimelineCriteriaActionsCreator";
import { DeliveryTimelineCriteriaActions } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Actions/DeliveryTimelineCriteriaActions";
import { DeliveryTimelineCriteriaDataProviders } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/DataProviders/DeliveryTimelineCriteriaDataProviders";
import { ValueState } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";
import { Label } from "OfficeFabric/Label";
import { WizardConstants } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Components/WizardConstants";

export interface IDeliveryTimelineCriteriaProps extends React.Props<void> {
    /**
     * The action creator for this view.
     */
    actionsCreator: IDeliveryTimelineCriteriaActionsCreator;
    /**
     * The store for this view, used to initialize the state of the view.
     */
    store: DeliveryTimelineCriteriaStore;
    /**
     * If the settings rows have been disabled
     */
    disabled: boolean;
    /**
     * Flag to indicate if the header and help callout should be shown;
     */
    showHeader?: boolean;
}

export class DeliveryTimelineCriteria extends React.Component<IDeliveryTimelineCriteriaProps, IDeliveryTimelineCriteriaData> {
    private static c_maxCriteria = 5;
    private _eventChangedHandler: IEventHandler;
    private _applyFocusToLastRow = false;  // flag indicate whether the last row should have focus. This get sets when adding a new row.
    private _lastDeleteIndex = -1;  // store last index of the row that was deleted. This get sets when deleting a row.
    private _lastRowDelete = false; // flag indicate whether the last row has been deleted. This get sets when deleting a row.

    constructor(props: IDeliveryTimelineCriteriaProps, context?: any) {
        super(props, context);
        this.state = $.extend({
            criteria: [],
            availableFields: [],
            validationState: ValidationState.Success,
            message: ""
        }, props.store.getValue());
        this._eventChangedHandler = (data: DeliveryTimelineCriteriaStore) => {
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
            {this._renderWizardSetting()}
        </div>;
    }

    private _onCriteriaRowDeleted = (id: string) => {
        this._getLastDeleteIndex(id);
        this.props.actionsCreator.deleteCriteria(this.state.criteria, id);
    };

    private _getLastDeleteIndex(id: string) {
        if (this.state.criteria.length === 1) {
            // if this is the last setting row to be deleted, then no need to focus the delete button.
            this._lastDeleteIndex = -1;
            this._lastRowDelete = true;
        }
        else {
            for (let i = 0, l = this.state.criteria.length; i < l; i++) {
                if (this.state.criteria[i].id === id) {
                    this._lastDeleteIndex = i;
                    break;
                }
            }
        }
    }

    private _onFieldChanged = (id: string, value: string) => {
        this.props.actionsCreator.changeField(this.state.criteria, id, value);
    };

    private _onOperatorChanged = (id: string, value: string) => {
        this.props.actionsCreator.changeOperator(this.state.criteria, id, value);
    };

    private _onValueChanged = (id: string, value: string) => {
        this.props.actionsCreator.changeValue(this.state.criteria, id, value);
    };

    private _renderWizardSetting(): JSX.Element {
        let header: JSX.Element = null;
        if (this.props.showHeader) {
            header = <div className="header">
                <div className="header-label">{ScaledAgileResources.PlanFieldCriteriaTitle}</div>
                <label id="planFieldCriteriaDescription">{ScaledAgileResources.PlanFieldCriteriaMessage}</label>
            </div>;
        }

        const shouldFocusOnAddButton = this._lastRowDelete;
        this._lastRowDelete = false;

        return <div>
            <div className={WizardConstants.WIZARD_LABEL_CONTAINER_CLASS}>
                {header}
                {
                    this.state.criteria.length > 0 &&
                    <div className="labels section-header">
                        <div style={{ maxWidth: CriteriaSetting.SETTING_FIELD_WIDTH }}>
                            <Label required={true}>{ScaledAgileResources.CriteriaFieldLabel}</Label>
                        </div>
                        <div style={{ maxWidth: CriteriaSetting.SETTING_FIELD_WIDTH }}>
                            <Label required={true}>{ScaledAgileResources.CriteriaOperatorLabel}</Label>
                        </div>
                        <div style={{ maxWidth: CriteriaSetting.SETTING_FIELD_WIDTH }}>
                            <Label required={true}>{ScaledAgileResources.CriteriaValueLabel}</Label>
                        </div>
                    </div>
                }
            </div>
            <div className={WizardConstants.WIZARD_SETTING_CONTAINER_CLASS}>
                {this.state.criteria.map((value: ICriteriaSettingData, index: number) => this._renderFilterClause(value, index))}
            </div>
            <IconButton
                action={() => this._onAdd()}
                text={ScaledAgileResources.CriteriaAddLabel}
                icon="bowtie-icon bowtie-math-plus"
                className={WizardConstants.ADD_BUTTON_CLASS}
                disabled={this._isAddButtonDisabled()}
                focus={shouldFocusOnAddButton}
                descriptionId="planFieldCriteriaDescription"/>
            {this._renderMaxRowsMessage()}
            {this._renderDuplicateClauseMessage()}
        </div>;
    }

    private _onAdd() {
        if (!this._hasSettingLimitReached() && !this._isSettingLoading()) {
            this.props.actionsCreator.addCriteria(this.state.criteria);
            this._applyFocusToLastRow = true;
        }
    }

    public _isAddButtonDisabled(): boolean {
        return this._hasSettingLimitReached() || this.props.disabled || this._isSettingLoading();
    }

    private _renderFilterClause(filterClause: ICriteriaSettingData, index: number): JSX.Element {
        let applyFocusToRow = false;
        const settingLen = this.state.criteria.length;
        if ((index + 1) === settingLen) {
            // if this is the last row, focus should apply when the row is not in loading state.
            const isLastRowLoading = this.state.criteria[index].value.id === ScaledAgileResources.WizardLoadingLabel;
            applyFocusToRow = this._applyFocusToLastRow && !isLastRowLoading;
            if (applyFocusToRow) {
                this._applyFocusToLastRow = false;
            }
        }

        // check if this row should focus on delete button because the row was last deleted.
        if (this._lastDeleteIndex === settingLen) {
            this._lastDeleteIndex--;
        }
        const shouldFocusDeleteButton = this._lastDeleteIndex > -1 && this._lastDeleteIndex === index;
        if (shouldFocusDeleteButton) {
            this._lastDeleteIndex = -1;
        }

        return <CriteriaSetting key={index}
            id={filterClause.id}
            index={index}
            availableFields={this.state.availableFields}
            disabled={this.props.disabled}
            focusOnMount={applyFocusToRow}
            onDeleteRow={this._onCriteriaRowDeleted}
            focusDeleteButton={shouldFocusDeleteButton}
            onFieldChanged={this._onFieldChanged}
            onOperatorChanged={this._onOperatorChanged}
            onValueChanged={this._onValueChanged}
            {...filterClause} />;
    }

    private _isSettingLoading() {
        let isLoading = this.state.criteria && this.state.criteria.length > 0 ? this.state.criteria[0].field && this.state.criteria[0].field.valueState === ValueState.IsLoading : false;
        return isLoading;
    }

    private _hasSettingLimitReached(): boolean {
        return this.state.criteria && this.state.criteria.length >= DeliveryTimelineCriteria.c_maxCriteria;
    }

    private _renderMaxRowsMessage(): JSX.Element {
        if (this._hasSettingLimitReached()) {
            return <div aria-live="assertive" className={WizardConstants.MESSAGE_AREA_CLASS}>
                <i className={WizardConstants.MESSAGE_AREA_INFO_ICON_CLASS} />
                <span>{Utils_String.format(ScaledAgileResources.CriteriaLimitMessage, DeliveryTimelineCriteria.c_maxCriteria)}</span>
            </div>;
        }
        return null;
    }

    private _renderDuplicateClauseMessage(): JSX.Element {
        if (this.state.validationState === ValidationState.Warning) {
            return <div aria-live="assertive" className={WizardConstants.MESSAGE_AREA_CLASS}>
                <i className={WizardConstants.MESSAGE_AREA_ERROR_ICON_CLASS} />
                <span>{ScaledAgileResources.WizardDuplicateCriteriaSettingMessage}</span>
            </div>;
        }
        return null;
    }
}

/**
 * Function to initialize and create criteria component.
 */
export function initCriteria(pageActions: PageActions): JSX.Element {
    const actions = new DeliveryTimelineCriteriaActions();
    const store = new DeliveryTimelineCriteriaStore(actions);
    const dataProvider = new DeliveryTimelineCriteriaDataProviders();
    const actionsCreator = new DeliveryTimelineCriteriaActionsCreator(dataProvider, actions, pageActions);
    const props = {
        actionsCreator: actionsCreator,
        store: store,
        disabled: false,
        showHeader: true
    };
    const reactDom = React.createElement(DeliveryTimelineCriteria, props);
    actionsCreator.initializeStore(null);
    return reactDom;
}
