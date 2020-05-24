/// <reference types='react' />

import * as React from "react";
import { Fabric } from "OfficeFabric/Fabric";
import { Checkbox } from "OfficeFabric/Checkbox";
import { Dropdown } from "OfficeFabric/components/Dropdown/Dropdown";
import { IDropdownOption } from "OfficeFabric/components/Dropdown/Dropdown.types";


import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import { ICardSettings, IdentityPickerRenderingOption, IAdditionalField } from "ScaledAgile/Scripts/Shared/Card/Models/ICardSettings";
import { IDeliveryTimelineConfigurationFields, IDeliveryTimelineConfigurationOptions } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/DeliveryTimelineConfigurationInterfaces";
import { IReactComponent, ReactTabContent } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Components/ReactTabContent";
import { AdditionalFieldsConfiguration } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Components/AdditionalFieldsConfiguration";

/**
 * What: The property of the team's setting tab
 * Why: Need to pass the configuration Flux (Actions Creator and Store) to be able to communicate with the configuration Flux and receive updates
 */
export interface ICardFieldSettingsTabContentProps {
    /**
     * What: We pass down to the initial ICardSettings
     * Why: Used for initializing the control
     */
    initialCardFields: ICardSettings;
    /**
     * What: We pass down to the tab the Configuration's options.
     * Why: We need each tab to listen to event from the store and to be able to invoke the action creators of changes
     */
    configurationFlux: IDeliveryTimelineConfigurationOptions;
    /**
     * What: If edit is disabled of this tab
     * Why: If the user doesn't have permissions
     */
    editDisabled: boolean;
}

export class CardFieldSettingsTabContent extends ReactTabContent {
    private _options: IDeliveryTimelineConfigurationOptions;
    private _eventCardFieldsChangedHandler: IEventHandler;

    constructor(options: IDeliveryTimelineConfigurationOptions) {
        super();
        this._options = options;
        this._attachListenerToConfigurationStore();
    }

    /**
     * What: Attach listener to the ConfigurationStore
     * Why: Need to update the isDirty and isValid for the tab to update its UI which is handled by the webaccess control
     */
    private _attachListenerToConfigurationStore(): void {
        this._eventCardFieldsChangedHandler = (sender: any, data: IDeliveryTimelineConfigurationFields) => {
            this._isDirty = data.isDirty;
            this._isValid = data.isValid;
            this.fireStatesChange();
        };
        this._options.configurationStore.addCardFieldsChangedListener(this._eventCardFieldsChangedHandler);
    }

    /**
     * What: Render the tab as well as the teams wizard control + init events
     * Why: Reuse the control from the creation.
     */
    protected renderContent(): IReactComponent {
        const initialCardFields = this._options.configurationStore.getValue().cards.fields.fieldSettings || {};
        const editDisabled = this._options.configurationStore.getValue().editDisabled;
        return {
            component: <CardFieldSettingsTabContentReact
                configurationFlux={this._options}
                initialCardFields={initialCardFields}
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
        this._options.configurationStore.removeCardFieldsChangedListener(this._eventCardFieldsChangedHandler);
        this._eventCardFieldsChangedHandler = null;
    }
}

export class CardFieldSettingsTabContentReact extends React.Component<ICardFieldSettingsTabContentProps, IDeliveryTimelineConfigurationFields> {
    private _eventCardFieldsChangedHandler: IEventHandler;

    // CSS Constants
    private readonly _css_card_field_settings_container = "card-field-settings-container";
    private readonly _css_core_fields_section = "core-fields-section";
    private readonly _css_additional_fields_section = "additional-fields-section";
    private readonly _css_empty_fields_section = "empty-fields-section";
    private readonly _css_section_header = "section-header";
    private readonly _css_checkbox_component = "checkbox-component";
    private readonly _css_assigned_to_dropdown = "assigned-to-dropdown";
    private readonly _css_main_header = "main-header";
    private readonly _css_main_description = "main-description";

    public refs: {
        [key: string]: (Element);
        settingsContainer: HTMLDivElement;
    };

    constructor(props: ICardFieldSettingsTabContentProps) {
        super(props);
        this.state = {
            fieldSettings: props.initialCardFields,
            isValid: true,
        } as IDeliveryTimelineConfigurationFields;
    }

    /**
     * What: Attach to the store to know when the card fields are changing
     * Why: Update the UI with the fields provided by the store
     */
    private _attachListenerToStore(): void {
        this._eventCardFieldsChangedHandler = (sender: any, data: IDeliveryTimelineConfigurationFields) => {
            this.setState(data);
        };

        this.props.configurationFlux.configurationStore.addCardFieldsChangedListener(this._eventCardFieldsChangedHandler);
    }

    public componentDidMount() {
        this._attachListenerToStore();
    }

    public render(): JSX.Element {
        const header = <div className={this._css_main_header}>{ScaledAgileResources.ConfigurationFieldsTabContentTitle}</div>;
        const description = <div className={this._css_main_description}>{ScaledAgileResources.ConfigurationFieldsTabContentDescription}</div>;
        const fieldSettings = this.state.fieldSettings;
        const additionalData = this.props.configurationFlux.configurationStore.getAdditionalData();

        const content = <Fabric>
            <div className={`${this._css_card_field_settings_container} ${this._css_core_fields_section}`}>
                <label className={this._css_section_header}>
                    {ScaledAgileResources.ConfigurationFields_CoreFieldsSectionHeader}
                </label>
                <Checkbox className={this._css_checkbox_component}
                    label={ScaledAgileResources.ConfigurationFields_ShowID}
                    defaultChecked={fieldSettings.showId}
                    disabled={this.props.editDisabled}
                    onChange={(ev: React.FormEvent<HTMLInputElement>, newValue: boolean) => this._onShowIdChanged(ev, newValue)} />
                <Checkbox className={this._css_checkbox_component}
                    label={ScaledAgileResources.ConfigurationFields_ShowAssignedTo}
                    defaultChecked={fieldSettings.showAssignedTo}
                    disabled={this.props.editDisabled}
                    onChange={(ev: React.FormEvent<HTMLInputElement>, newValue: boolean) => this._onShowAssignedToChanged(ev, newValue)} />
                <div className={this._css_assigned_to_dropdown}>
                    <Dropdown
                        label={""}
                        ariaLabel={ScaledAgileResources.ConfigurationFields_ShowAssignedTo}
                        options={this._getAssignedToComboOptions()}
                        disabled={!fieldSettings.showAssignedTo || this.props.editDisabled}
                        onChanged={(option: IDropdownOption, index?: number) => this._onAssignedToRenderingOptionChanged(option, index)} />
                </div>
                <Checkbox className={this._css_checkbox_component}
                    label={ScaledAgileResources.ConfigurationFields_ShowTags}
                    defaultChecked={fieldSettings.showTags}
                    disabled={this.props.editDisabled}
                    onChange={(ev: React.FormEvent<HTMLInputElement>, newValue: boolean) => this._onShowTagsChanged(ev, newValue)} />
                <Checkbox className={this._css_checkbox_component}
                    label={ScaledAgileResources.ConfigurationFields_ShowState}
                    defaultChecked={fieldSettings.showState}
                    disabled={this.props.editDisabled}
                    onChange={(ev: React.FormEvent<HTMLInputElement>, newValue: boolean) => this._onShowStateChanged(ev, newValue)} />
            </div>
            <AdditionalFieldsConfiguration className={`${this._css_card_field_settings_container} ${this._css_additional_fields_section}`}
                fields={fieldSettings.additionalFields}
                allowedFields={additionalData ? additionalData.supportedFieldDefinitions : null}
                disabled={this.props.editDisabled}
                onChanged={(newFields: IAdditionalField[]): void => this._onAdditionalFieldsChanged(newFields)} />
            <div className={`${this._css_card_field_settings_container} ${this._css_empty_fields_section}`}>
                <label className={this._css_section_header}>
                    {ScaledAgileResources.ConfigurationFields_EmptyFieldsSectionHeader}
                </label>
                <Checkbox className={this._css_checkbox_component}
                    label={ScaledAgileResources.ConfigurationFields_ShowEmptyFields}
                    defaultChecked={fieldSettings.showEmptyFields}
                    disabled={this.props.editDisabled}
                    onChange={(ev: React.FormEvent<HTMLInputElement>, newValue: boolean) => this._onShowEmptyFieldsChanged(ev, newValue)} />
            </div>
        </Fabric>;

        return <div ref="settingsContainer">
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
        this.props.configurationFlux.configurationStore.removeCardFieldsChangedListener(this._eventCardFieldsChangedHandler);
    }

    private _onShowIdChanged(ev: React.FormEvent<HTMLInputElement>, newValue: boolean) {
        this._setFields({ showId: newValue } as ICardSettings);
    }

    private _onShowAssignedToChanged(ev: React.FormEvent<HTMLInputElement>, newValue: boolean) {
        this._setFields({ showAssignedTo: newValue } as ICardSettings);
    }

    private _onAssignedToRenderingOptionChanged(option: IDropdownOption, index?: number) {
        this._setFields({ assignedToRenderingOption: IdentityPickerRenderingOption[option.key] as IdentityPickerRenderingOption } as ICardSettings);
    }

    private _onShowTagsChanged(ev: React.FormEvent<HTMLInputElement>, newValue: boolean) {
        this._setFields({ showTags: newValue } as ICardSettings);
    }

    private _onShowStateChanged(ev: React.FormEvent<HTMLInputElement>, newValue: boolean) {
        this._setFields({ showState: newValue } as ICardSettings);
    }

    private _onShowEmptyFieldsChanged(ev: React.FormEvent<HTMLInputElement>, newValue: boolean) {
        this._setFields({ showEmptyFields: newValue } as ICardSettings);
    }

    private _onAdditionalFieldsChanged(newValue: IAdditionalField[]) {
        this._setFields({ additionalFields: newValue } as ICardSettings);
    }

    private _setFields(cardFields: ICardSettings) {
        // Clone the state and update the value for showId
        let updatedCardFields = $.extend({}, this.state.fieldSettings, cardFields);
        // Invoke setFields action
        this.props.configurationFlux.actionsCreator.setFields(updatedCardFields);
    }

    private _getAssignedToComboOptions(): IDropdownOption[] {
        return [{
            key: IdentityPickerRenderingOption[IdentityPickerRenderingOption.AvatarAndFullName],
            text: ScaledAgileResources.CardOptionsShowAvatarAndFullName,
            isSelected: this.state.fieldSettings.assignedToRenderingOption === IdentityPickerRenderingOption.AvatarAndFullName
        },
        {
            key: IdentityPickerRenderingOption[IdentityPickerRenderingOption.AvatarOnly],
            text: ScaledAgileResources.CardOptionsShowAvatarOnly,
            isSelected: this.state.fieldSettings.assignedToRenderingOption === IdentityPickerRenderingOption.AvatarOnly
        },
        {
            key: IdentityPickerRenderingOption[IdentityPickerRenderingOption.FullName],
            text: ScaledAgileResources.CardOptionsShowFullName,
            isSelected: this.state.fieldSettings.assignedToRenderingOption === IdentityPickerRenderingOption.FullName
        }];
    }
}
