/// <reference types="react" />

import * as React from "react";
import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";

import { IDeliveryTimelineConfigurationOptions, IDeliveryTimelineConfigurationMarkers } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Models/DeliveryTimelineConfigurationInterfaces";
import { ReactTabContent, IReactComponent } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Components/ReactTabContent";
import { DeliveryTimelineMarkersActionCreator } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Actions/DeliveryTimelineMarkersActionsCreator";
import { DeliveryTimelineMarkersActions } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Actions/DeliveryTimelineMarkersActions";
import { DeliveryTimelineMarkersStore } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Stores/DeliveryTimelineMarkersStore";
import { MarkersSetting, IMarkersSettingsProps } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineConfiguration/Components/MarkersSetting";
import { WizardMappers } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardMappers";

export class MarkerTabContent extends ReactTabContent {
    private _options: IDeliveryTimelineConfigurationOptions;
    private _eventMarkersChangedHandler: IEventHandler;
    private _eventMarkersStoreChange: IEventHandler;
    private _markersStore: DeliveryTimelineMarkersStore;
    private _markersFlux: IMarkersSettingsProps;

    constructor(options: IDeliveryTimelineConfigurationOptions) {
        super();
        this._options = options;
    }

    /**
     * What: Create the markers flux but not the control
     * Why: Need to reuse the existing settings, need to built it here instead of using the init() from the Wizard because we need a hook
     *      on the store to listen to its change as well as the component to render. The component will be built when the tab is rendered.
     */
    private _initMarkers(): void {
        const markersActions = new DeliveryTimelineMarkersActions();
        this._markersStore = new DeliveryTimelineMarkersStore(markersActions);
        const actionsCreator = new DeliveryTimelineMarkersActionCreator(markersActions, null);
        this._markersFlux = {
            actionsCreator: actionsCreator,
            store: this._markersStore,
            disabled: false
        } as IMarkersSettingsProps;

        let markers = WizardMappers.mapCalendarMarkersToMarkersSetting(this._options.dataFromPlan.calendarMarkers);
        actionsCreator.initializeStore(markers);
    }

    private _attachListenerToMarkersStore(): void {
        this._eventMarkersStoreChange = (sender: DeliveryTimelineMarkersStore) => {
            setTimeout(() => {
                this._options.actionsCreator.setMarkers(sender.getValue());
            }, 0);
        };
        this._markersStore.addChangedListener(this._eventMarkersStoreChange);
    }

    /**
     * Need to update the isDirty and isValid for the tab to update its UI which is handled by the webaccess control
    */
    private _attachListenerToConfigurationStore(): void {
        this._eventMarkersChangedHandler = (sender: any, data: IDeliveryTimelineConfigurationMarkers) => {
            this._isDirty = data.isDirty;
            this._isValid = data.isValid;
            this.fireStatesChange();
        };
        this._options.configurationStore.addMarkersChangedListener(this._eventMarkersChangedHandler);
    }

    /**
     * What: Render the tab as well as the markers control + init events
     * Why: Reuse the control from the creation.
     */
    protected renderContent(): IReactComponent {
        this._initMarkers();
        this._attachListenerToMarkersStore();
        this._attachListenerToConfigurationStore();

        const editDisabled = this._options.configurationStore.getValue().editDisabled;

        return {
            component: <MarkerTabContentReact
                configurationFlux={this._options}
                markersProps={this._markersFlux}
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
        this._options.configurationStore.removeMarkersChangedListener(this._eventMarkersChangedHandler);
        this._markersStore.removeChangedListener(this._eventMarkersStoreChange);
    }
}

/**
 * What: The property of the markers tab
 * Why: Need to pass the configuration Flux (Actions Creator and Store) to be able to communicate with the configuration Flux and receive updates
 */
export interface IMarkerTabContentProps {
    /**
     * What: We pass down to the tab the Configuration's options.
     * Why: We need each tab to listen to event from the store and to be able to invoke the action creators of changes
     */
    configurationFlux: IDeliveryTimelineConfigurationOptions;

    /**
     * What: The marker control used in the creation 
     */
    markersProps: IMarkersSettingsProps;

    /**
     * If edit is disabled for this tab
     */
    editDisabled: boolean;
}

export class MarkerTabContentReact extends React.Component<IMarkerTabContentProps, {}> {
    public render(): JSX.Element {
        const header = <div className="main-header">{ScaledAgileResources.ConfigurationMarkersTabContentTitle}</div>;
        const description = <div className="main-description">{ScaledAgileResources.ConfigurationMarkersTabContentDescription}</div>;
        const content = <MarkersSetting
            actionsCreator={this.props.markersProps.actionsCreator}
            store={this.props.markersProps.store}
            disabled={this.props.editDisabled} />;

        return <div>
            {header}
            {description}
            {content}
        </div>;
    }
}