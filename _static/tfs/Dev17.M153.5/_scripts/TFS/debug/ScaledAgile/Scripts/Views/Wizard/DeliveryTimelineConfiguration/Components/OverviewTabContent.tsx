/// <reference types="react" />

import * as React from "react";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";

import { IDeliveryTimelineConfigurationOptions, IDeliveryTimelineConfigurationDetail } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/DeliveryTimelineConfigurationInterfaces";
import { ReactTabContent, IReactComponent } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Components/ReactTabContent";
import { TextBox } from "ScaledAgile/Scripts/Shared/Components/TextBox";
import { MultilineTextBox } from "ScaledAgile/Scripts/Shared/Components/MultilineTextBox";
import { WizardConstants } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Components/WizardConstants"; 

/**
 * What : The tab used for gerneral settings
 *
 * Why : Configuration dialog work with tab, each tab that has React configuration needs to inherit the React Tab to be injected in the dialog while
 *       still be able to use React to render components.
 */
export class OverviewTabContent extends ReactTabContent {    
    private _options: IDeliveryTimelineConfigurationOptions;
    private _changedHandler: IEventHandler;

    constructor(options: IDeliveryTimelineConfigurationOptions) {
        super();
        this._options = options;
        this._attachListenerToStore();
    }

    /**
     * What: Attach one listener to the configuration that is fired when something change about the Overview plan tab
     * Why: Need to update the isDirty and isValid for the tab to update its UI which is handled by the webaccess control
     */
    private _attachListenerToStore(): void {
        this._changedHandler = (sender: any, data: IDeliveryTimelineConfigurationDetail) => {
            this._isDirty = data.isDirty;
            this._isValid = data.isValid;
            this.fireStatesChange();
        };
        this._options.configurationStore.addTitleChangedListener(this._changedHandler);
        this._options.configurationStore.addDescriptionChangedListener(this._changedHandler);
    }

    /**
     * What: We defined the React main component for the Overview tab
     * Why: We need an entry point into the tab Flux
     */
    protected renderContent(): IReactComponent {
        const configurationStoreValue = this._options.configurationStore.getValue();
        const initialName = configurationStoreValue.general.title.value;
        const initialDescription = configurationStoreValue.general.description.value;
        const editDisabled = configurationStoreValue.editDisabled;
        return {
            component: <OverviewTabContentReact
                initialName={initialName}
                initialDescription={initialDescription}
                configurationFlux={this._options}
                editDisabled={editDisabled} />
        } as IReactComponent;
    }

    /**
     * What: Clean up events
     * Why: Remove possible callback to disposed class
     */
    public dispose(): void {
        super.dispose();
        this._options.configurationStore.removeTitleChangedListener(this._changedHandler);
        this._options.configurationStore.removeDescriptionChangedListener(this._changedHandler);
    }
}


export interface IOverviewTabContentProps {
    initialName: string;
    initialDescription: string;
    configurationFlux: IDeliveryTimelineConfigurationOptions;
    editDisabled: boolean;
}

export interface IOverviewTabContentState {
    name: IDeliveryTimelineConfigurationDetail;
    description: IDeliveryTimelineConfigurationDetail;
}

/**
 * What: The React tab used by the ReactTabContent
 * Why: We develop in React and having a class for the React tab give a good separation of the shim (ReactTabContent) and
 *      the actual configuration (this class)
 */
export class OverviewTabContentReact extends React.Component<IOverviewTabContentProps, IOverviewTabContentState> {
    private _eventTitleChangedHandler: IEventHandler;
    private _eventDescriptionChangedHandler: IEventHandler;

    constructor(props: IOverviewTabContentProps) {
        super(props);
        this.state = {
            name: { value: props.initialName, isValid: true } as IDeliveryTimelineConfigurationDetail,
            description: { value: props.initialDescription, isValid: true } as IDeliveryTimelineConfigurationDetail
        } as IOverviewTabContentState;
    }

    /**
     * What: Attach to the store to know when the title is changing
     * Why: Update the UI with the overview provided by the store
     */
    private _attachListenerToStore(): void {
        this._eventTitleChangedHandler = (sender: any, data: IDeliveryTimelineConfigurationDetail) => {
            this.setState({ name: data } as IOverviewTabContentState);
        };
        this.props.configurationFlux.configurationStore.addTitleChangedListener(this._eventTitleChangedHandler);
        this._eventDescriptionChangedHandler = (sender: any, data: IDeliveryTimelineConfigurationDetail) => {
            this.setState({ description: data } as IOverviewTabContentState);
        };
        this.props.configurationFlux.configurationStore.addDescriptionChangedListener(this._eventDescriptionChangedHandler);
    }

    public componentDidMount() {
        this._attachListenerToStore();
    }

    public render(): JSX.Element {
        const editDisabled = this.props.editDisabled;
        const header = <div className="main-header">{ScaledAgileResources.ConfigurationOverviewTabTitle}</div>;
        const subheader = <div className="main-description">{ScaledAgileResources.ConfigurationOverviewTabContentDescription}</div>;
        const name = <TextBox
            id="overviewName"
            className="section-header bowtie"
            label={ScaledAgileResources.WizardNameLabel}
            required={true}
            onChange={this._onTitleChange}
            value={this.state.name.value}
            isValid={this.state.name.isValid}
            disabled={editDisabled}
            errorMessage={<span>{this.state.name.message}</span>}
            placeholderText={ScaledAgileResources.WizardPlanNamePlaceholder} />;
        const description = <MultilineTextBox
            id="overviewDescription"
            className="section-header bowtie"
            label={ScaledAgileResources.WizardDescriptionLabel}
            value={this.state.description.value}
            onChange={this._onDescriptionChange}
            isValid={this.state.description.isValid}
            disabled={editDisabled}
            errorMessage={<span>{this.state.description.message}</span>}
            placeholderText={ScaledAgileResources.WizardPlanDescriptionPlaceholder} />;

        return <div className={WizardConstants.WIZARD_CONTAINER_CLASS}>
            {header}
            {subheader}
            {name}
            {description}
        </div>;
    }

    /**
     * What: Change event on the textbox of the plan's name
     * Why: Update the store that will add the modification to the UI. Without it, nothing happen on the UI
     * @param {string} value - New value to be applied to the textbox
     */
    private _onTitleChange = (value: string) => {
        this.props.configurationFlux.actionsCreator.setTitle(value);
    };

    /**
     * What: Change event on the textbox of the plan's description
     * Why: Update the store that will add the modification to the UI. Without it, nothing happen on the UI
     * @param {string} value - New value to be applied to the textbox
     */
    private _onDescriptionChange = (value: string) => {
        this.props.configurationFlux.actionsCreator.setDescription(value);
    };

    /**
     * What: Clean up events
     * Why: Remove possible callback to disposed class
     */
    public componentWillUnmount(): void {
        this.props.configurationFlux.configurationStore.removeTitleChangedListener(this._eventTitleChangedHandler);
        this.props.configurationFlux.configurationStore.removeDescriptionChangedListener(this._eventDescriptionChangedHandler);
        this._eventTitleChangedHandler = null;
        this._eventDescriptionChangedHandler = null;
    }

}
