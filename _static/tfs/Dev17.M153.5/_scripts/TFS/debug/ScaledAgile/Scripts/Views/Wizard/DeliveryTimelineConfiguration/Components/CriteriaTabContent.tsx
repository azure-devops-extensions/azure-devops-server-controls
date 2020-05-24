import * as React from "react";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";

import { IDeliveryTimelineConfigurationOptions, IDeliveryTimelineConfigurationCriteria } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/DeliveryTimelineConfigurationInterfaces";
import { DeliveryTimelineCriteriaActions } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Actions/DeliveryTimelineCriteriaActions";
import { DeliveryTimelineCriteriaActionsCreator } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Actions/DeliveryTimelineCriteriaActionsCreator";
import { DeliveryTimelineCriteriaStore } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Stores/DeliveryTimelineCriteriaStore";
import { IDeliveryTimelineCriteriaProps } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Components/DeliveryTimelineCriteria";
import { DeliveryTimelineCriteriaDataProviders } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/DataProviders/DeliveryTimelineCriteriaDataProviders";
import { ReactTabContent, IReactComponent } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Components/ReactTabContent";
import { DeliveryTimelineCriteria } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Components/DeliveryTimelineCriteria";
import { WizardMappers } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardMappers";

export class CriteriaTabContent extends ReactTabContent {
    private _options: IDeliveryTimelineConfigurationOptions;
    private _eventCriteriaChangedHandler: IEventHandler;
    private _eventCriteriaStoreChange: IEventHandler;
    private _criteriaStore: DeliveryTimelineCriteriaStore;
    private _criteriaFlux: IDeliveryTimelineCriteriaProps;

    constructor(options: IDeliveryTimelineConfigurationOptions) {
        super();
        this._options = options;
    }

    private _initCriteriaSettings(): void {
        const actions = new DeliveryTimelineCriteriaActions();
        const dataProvider = new DeliveryTimelineCriteriaDataProviders();
        const actionsCreator = new DeliveryTimelineCriteriaActionsCreator(dataProvider, actions, null);
        this._criteriaStore = new DeliveryTimelineCriteriaStore(actions);
        this._criteriaFlux = {
            actionsCreator: actionsCreator,
            store: this._criteriaStore,
            disabled: false
        } as IDeliveryTimelineCriteriaProps;

        let existingCriteria = WizardMappers.mapFilterClausesToICriteriaSelectedSettingData(this._options.dataFromPlan.criteria);
        actionsCreator.initializeStore(existingCriteria);
    }

    /**
    * What: Listen to the wizard store to have Wizard Flux -> Configuration Flux
    * Why: Need to know when something change to tell the configuration Flux store that the team has changed because it's this Flux's model
    *      cycle that will be saved at the end and not the inner one for the TeamSetting control
    */
    private _attachListenerToCriteriaStore(): void {
        this._eventCriteriaStoreChange = (sender: DeliveryTimelineCriteriaStore) => {
            setTimeout(() => {
                this._options.actionsCreator.setCriteria(sender.getValue());
            }, 0);
        };
        this._criteriaStore.addChangedListener(this._eventCriteriaStoreChange);
    }

    /**
     * Need to update the isDirty and isValid for the tab to update its UI which is handled by the webaccess control
    */
    private _attachListenerToConfigurationStore(): void {
        this._eventCriteriaChangedHandler = (sender: any, data: IDeliveryTimelineConfigurationCriteria) => {
            this._isDirty = data.isDirty;
            this._isValid = data.isValid;
            this.fireStatesChange();
        };
        this._options.configurationStore.addCriteriaChangedListener(this._eventCriteriaChangedHandler);
    }

    protected renderContent(): IReactComponent {
        this._initCriteriaSettings();
        this._attachListenerToConfigurationStore();
        this._attachListenerToCriteriaStore();

        const configurationStoreValue = this._options.configurationStore.getValue();
        const editDisabled = configurationStoreValue.editDisabled;

        return {
            component: <CriteriaTabContentReact
                configurationFlux={this._options}
                criteriaFlux={this._criteriaFlux}
                editDisabled={editDisabled} />
        } as IReactComponent;
    }

    /**
     * What: Clean up events
     * Why: Remove possible callback to disposed class
     */
    public dispose(): void {
        super.dispose();
        this._options.configurationStore.removeCriteriaChangedListener(this._eventCriteriaChangedHandler);
        this._criteriaStore.removeChangedListener(this._eventCriteriaStoreChange);
    }
}

export interface ICriteriaTabContentProps {
    configurationFlux: IDeliveryTimelineConfigurationOptions;
    criteriaFlux: IDeliveryTimelineCriteriaProps;
    editDisabled: boolean;
}

export class CriteriaTabContentReact extends React.Component<ICriteriaTabContentProps, {}> {
    public render(): JSX.Element {
        const header = <div className="main-header">{ScaledAgileResources.PlanFieldCriteriaTitle}</div>;
        const subheader = <div className="main-description">{ScaledAgileResources.PlanFieldCriteriaMessage}</div>;
        return <div>
            {header}
            {subheader}
            <DeliveryTimelineCriteria
                showHeader={false}
                actionsCreator={this.props.criteriaFlux.actionsCreator}
                store={this.props.criteriaFlux.store}
                disabled={this.props.editDisabled} />
        </div>;
    }
}
