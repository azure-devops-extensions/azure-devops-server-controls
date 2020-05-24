/// <reference types="react" />

import * as React from "react";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";

import { IDeliveryTimelineConfigurationOptions, IDeliveryTimelineConfigurationTeams } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/DeliveryTimelineConfigurationInterfaces";
import { ReactTabContent, IReactComponent } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Components/ReactTabContent";

import { DeliveryTimelineTeamSettingsActionCreator } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Actions/DeliveryTimelineTeamSettingsActionsCreator";
import { DeliveryTimelineTeamSettingsServerRequestCache } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Actions/DeliveryTimelineTeamSettingsServerRequestCache";
import { DeliveryTimelineTeamSettingsActions } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Actions/DeliveryTimelineTeamSettingsActions";
import { DeliveryTimelineTeamSettingsMapper } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/DeliveryTimelineTeamSettingsMapper";
import { ITeamSelectedSettingData } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Models/DeliveryTimelineTeamSettingsInterfaces";
import { DeliveryTimelineTeamSettingsStore } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Stores/DeliveryTimelineTeamSettingsStore";
import { DeliveryTimelineTeamSettingsDataProviders } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/DataProviders/DeliveryTimelineTeamSettingsDataProviders";
import { DeliveryTimelineTeamSettings, IDeliveryTimelineTeamSettingsProps } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Components/DeliveryTimelineTeamSettings";
import { WizardMappers } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardMappers";

export class TeamSettingsTabContent extends ReactTabContent {
    private _options: IDeliveryTimelineConfigurationOptions;
    private _eventTeamsChangedHandler: IEventHandler;
    private _eventWizardStoreChange: IEventHandler;
    private _wizardStore: DeliveryTimelineTeamSettingsStore;
    private _teamWizardFlux: IDeliveryTimelineTeamSettingsProps;
    constructor(options: IDeliveryTimelineConfigurationOptions) {
        super();
        this._options = options;
    }

    /**
     * What: Create the team settings Flux but not the control
     * Why: Need to reuse the existing settings, need to built it here instead of using the init() from the Wizard because we need a hook
     *      on the store to listen to its change as well as the component to render. The component will be built when the tab will get rendered.
     */
    private _initTeamSettings(): void {
        const deliveryWizardActions = new DeliveryTimelineTeamSettingsActions();
        this._wizardStore = new DeliveryTimelineTeamSettingsStore(deliveryWizardActions);
        const actionsCreator = new DeliveryTimelineTeamSettingsActionCreator(new DeliveryTimelineTeamSettingsDataProviders(new DeliveryTimelineTeamSettingsMapper()), deliveryWizardActions, null, new DeliveryTimelineTeamSettingsServerRequestCache());
        this._teamWizardFlux = {
            actionsCreator: actionsCreator,
            store: this._wizardStore,
            disabled: false
        } as IDeliveryTimelineTeamSettingsProps;
        const existingTeams = WizardMappers.mapCollectionITeamToITeamSelectedSettingData(this._options.dataFromPlan.teams);
        const convertedExistingTeams: ITeamSelectedSettingData[] = WizardMappers.mapCollectionTeamSelectedSettingDataToITeamSelectedSettingData(existingTeams);
        actionsCreator.initializeStore(convertedExistingTeams);
    }

    /**
     * What: Listen to the wizard store to have Wizard Flux -> Configuration Flux
     * Why: Need to know when something change to tell the configuration Flux store that the team has changed because it's this Flux's model
     *      cycle that will be saved at the end and not the inner one for the TeamSetting control
     */
    private _attachListenerToWizardStore(): void {
        this._eventWizardStoreChange = (sender: DeliveryTimelineTeamSettingsStore) => {
            setTimeout(() => {
                this._options.actionsCreator.setTeams(sender.getValue());
            }, 0);
        };
        this._wizardStore.addChangedListener(this._eventWizardStoreChange);
    }

    /**
     * What: Attach 2 differents listener. One global that is fired when the store get its plan, one that is when something change about the team plan tab
     * Why: Need to update the isDirty and isValid for the tab to update its UI which is handled by the webaccess control
     */
    private _attachListenerToConfigurationStore(): void {
        this._eventTeamsChangedHandler = (sender: any, data: IDeliveryTimelineConfigurationTeams) => {
            this._isDirty = data.isDirty;
            this._isValid = data.isValid;
            this.fireStatesChange();
        };
        this._options.configurationStore.addTeamsChangedListener(this._eventTeamsChangedHandler);
    }

    /**
     * What: Render the tab as well as the teams wizard control + init events
     * Why: Reuse the control from the creation.
     */
    protected renderContent(): IReactComponent {
        this._initTeamSettings();
        this._attachListenerToConfigurationStore();
        this._attachListenerToWizardStore();

        const editDisabled = this._options.configurationStore.getValue().editDisabled;
        return {
            component: <TeamSettingsTabContentReact
                configurationFlux={this._options}
                teamsWizardFlux={this._teamWizardFlux}
                editDisabled={editDisabled}
            />
        } as IReactComponent;
    }

    /**
     * What: Clean up events
     * Why: Remove possible callback to disposed class
     */
    public dispose(): void {
        super.dispose();
        this._options.configurationStore.removeTeamsChangedListener(this._eventTeamsChangedHandler);
        this._wizardStore.removeChangedListener(this._eventWizardStoreChange);
    }
}

/**
 * What: The property of the team's setting tab
 * Why: Need to pass the configuration Flux (Actions Creator and Store) to be able to communicate with the configuration Flux and receive updates
 */
export interface ITeamSettingsTabContentProps {
    /**
     * What: We pass down to the tab the Configuration's options.
     * Why: We need each tab to listen to event from the store and to be able to invoke the action creators of changes
     */
    configurationFlux: IDeliveryTimelineConfigurationOptions;

    /**
     * What: The Teams control used in the creation 
     */
    teamsWizardFlux: IDeliveryTimelineTeamSettingsProps;

    /**
     * If edit is disabled for this tab
     */
    editDisabled: boolean;
}

export class TeamSettingsTabContentReact extends React.Component<ITeamSettingsTabContentProps, IDeliveryTimelineConfigurationTeams> {
    private _eventTeamsChangedHandler: IEventHandler;

    constructor(props: ITeamSettingsTabContentProps) {
        super(props);
        this.state = {
            isValid: true,
        } as IDeliveryTimelineConfigurationTeams;
    }

    /**
     * What: Attach to the store to know when the team is changing
     * Why: Update the UI with the team provided by the store
     */
    private _attachListenerToConfigurationStore(): void {
        this._eventTeamsChangedHandler = (sender: any, data: IDeliveryTimelineConfigurationTeams) => {
            this.setState(data);
        };
        this.props.configurationFlux.configurationStore.addTeamsChangedListener(this._eventTeamsChangedHandler);
    }

    public componentDidMount() {
        this._attachListenerToConfigurationStore();
    }

    public render(): JSX.Element {
        const header = <div className="main-header">{ScaledAgileResources.ConfigurationTeamsTabContentTitle}</div>;
        const description = <div className="main-description">{ScaledAgileResources.ConfigurationTeamsTabContentDescription}</div>;
        const content = <DeliveryTimelineTeamSettings actionsCreator={this.props.teamsWizardFlux.actionsCreator} store={this.props.teamsWizardFlux.store} disabled={this.props.editDisabled} />;

        return <div>
            {header}
            {description}
            {content}
        </div>;
    }

    /**
     * What: Clean up events
     * Why: Remove possible callback to disposed class
     */
    public componentWillUnmount() {
        this.props.configurationFlux.configurationStore.removeTeamsChangedListener(this._eventTeamsChangedHandler);
    }
}