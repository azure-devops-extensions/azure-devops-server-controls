import * as Q from "q";
import * as React from "react";
import { CustomSettings, Size } from "TFS/Dashboards/WidgetContracts";
import { ComponentLayoutEngine, ComponentLayoutMapping, DefaultComponentLayouts } from "WidgetComponents/ComponentLayoutEngine";
import { LayoutActions } from "WidgetComponents/LayoutActions";
import { ILayoutComponentFactory } from "WidgetComponents/LayoutComponents";
import { LayoutState } from "WidgetComponents/LayoutState";
import { LayoutStore } from "WidgetComponents/LayoutStore";
import { ActionCreatorBase } from "Widgets/Scripts/ModernWidgetTypes/ActionCreatorBase";
import { WidgetConfigChange } from "Widgets/Scripts/ModernWidgetTypes/ModernWidgetContracts";
import { ISettingsManager } from "Widgets/Scripts/ModernWidgetTypes/SettingsManagerBase";
import { WidgetDataManagerBase, WidgetDataManagerOptions } from "Widgets/Scripts/ModernWidgetTypes/WidgetDataManagerBase";
import { MessageOptions, WidgetMessageCardFactory } from "Widgets/Scripts/ModernWidgetTypes/WidgetMessageCardFactory";
import { WidgetTelemetry } from "Widgets/Scripts/VSS.Widget.Telemetry";

export interface ViewComponentProps {
    change: WidgetConfigChange;
    suppressAnimations: boolean;
    /*** Contract for signalling to consumer of render completion. Consumer must instantiate initial deferred object, in order to receive subsequent notification. */
    deferredRenderCompletion: Q.Deferred<{}>;
}

/** Type-placeholder for Widget's locally defined Custom Settings type */
export interface WidgetCustomSettings {}

/** Encapsulates common state and flow patterns on View Component layer */
export abstract class ViewComponentBase<P extends ViewComponentProps, WidgetCustomSettings> extends React.Component<P, LayoutState> {
    protected store: LayoutStore;
    protected actions: LayoutActions;
    protected actionsCreator: ActionCreatorBase;
    protected layoutFactory: ILayoutComponentFactory<LayoutState>;
    protected setStoreStateDelegate = () => this.setStoreState();

    protected dataManager: WidgetDataManagerBase;
    protected settingsManager: ISettingsManager<WidgetCustomSettings>;

    /**
     * handles boilerplate one-time creation of all flux-oriented members on the ViewComponent.
     */
    protected initializeCommonMembers(){
        // Perform one time-setup of supporting state & action facilities.
        this.dataManager = this.instantiateDataManager(this.props.change);
        this.actions = new LayoutActions();
        this.store = new LayoutStore(this.actions, this.dataManager.getInitialState());
        this.actionsCreator = this.createActionCreator();

        this.layoutFactory = this.selectLayoutFactory();
        // Register demands, and request initial demanded state be provided via actionCreator (Note: this is synchronous, with no actual requests going out yet).
        this.layoutFactory.registerDemands(this.actionsCreator);
        this.actionsCreator.initialize();
        this.setState(this.getStoreState());
        this.settingsManager = this.createSettingsManager();
    }

    public componentWillMount(): void {
        this.initializeCommonMembers();

        /*
         * At this point, we are aware of the demands we need to satisfy. However, we are not guaranteed
         * to have the configuration state for widget rendering
         */
        this.settingsManager.ensureInitialSettings(this.getCustomSettings(this.props.change))
            .then((customSettings: WidgetCustomSettings) => {
                let changeWithDefaults = $.extend({}, this.props.change);
                changeWithDefaults.config = $.extend({}, changeWithDefaults.config); // Copy
                changeWithDefaults.config.customSettings = { data: JSON.stringify(customSettings) };

                let dataManagerOptions = {
                    title: changeWithDefaults.config.name,
                    settings: changeWithDefaults.config.customSettings,
                    widgetTypeId: this.props.change.widgetCreationOptions.typeId,
                    suppressAnimations: this.props.suppressAnimations
                }
                this.updateWithLatestConfiguration(dataManagerOptions, customSettings);

            }, (error) => {
                this.props.deferredRenderCompletion.reject(error.message);
            });
    }

    protected instantiateDataManager(change:WidgetConfigChange): WidgetDataManagerBase{
        let changePayload = $.extend({}, this.props.change);
        let dataManagerOptions = {
            title: changePayload.config.name,
            settings: changePayload.config.customSettings,
            widgetTypeId: this.props.change.widgetCreationOptions.typeId,
            suppressAnimations: this.props.suppressAnimations
        }
        return this.createDataManager(dataManagerOptions);
    }

    /** Handles updating the UI based on he current Widget Configuration. */
    protected updateWithLatestConfiguration(dataManagerOptions: WidgetDataManagerOptions, customSettings: WidgetCustomSettings){
        /*
            * These two steps are tightly coupled. Once we have the configuration, we can
            * request the data to be loaded asynchronously.
            */
        this.dataManager.update(dataManagerOptions);
        this.actionsCreator.requestData().then((success) => {
            this.publishLoadedEvent(customSettings, this.props.change);
            this.props.deferredRenderCompletion.resolve(null);
        }, (error) => {
            this.props.deferredRenderCompletion.reject(error);
        });
    }

    /** Extension point for widgets to add their unique telemetry  */
    protected packWidgetLoadedTelemetryData(customSettings: WidgetCustomSettings): IDictionaryStringTo<any>{
        return {};
    }

    /** Pass custom telemetry about the load event for Standardized Widget Reporting. */
    private publishLoadedEvent(customSettings: WidgetCustomSettings, change: WidgetConfigChange): void {
        let isConfigured = this.settingsManager.isConfigured(this.props.change.config.customSettings);
        this.props.change.widgetCreationOptions.getId().then((widgetId) => {
            let customProperties = this.packWidgetLoadedTelemetryData(customSettings);

            //Indicative of a completely unconfigured widget. Simply saving *any* configuration will cause this to be false.
            customProperties["IsConfigured"] = isConfigured;

            /** Only save telemetry when we are in conventional Widget scenario. */
            if (!change.config.isLightBox) {
                customProperties["Size"] = change.config.sizeInGrid.rowSpan+"*"+change.config.sizeInGrid.columnSpan;
                WidgetTelemetry.onWidgetLoaded(this.props.change.widgetCreationOptions.typeId, widgetId, customProperties);
            }

        });
    }

    /** Required by derived types: Creates concrete data manager associated with the widget. */
    protected abstract createDataManager(options:WidgetDataManagerOptions ): WidgetDataManagerBase;

    /** Required by derived types: Creates concrete action creator associated with the widget. */
    protected abstract createActionCreator(): ActionCreatorBase;

    /** Responsible for providing a settings manager implementation, which handles preparation of default settings. */
    protected abstract createSettingsManager(): ISettingsManager<WidgetCustomSettings>;

    /** Describes the set of layout mappings supported by this widget. */
    protected getLayoutMappings(): ComponentLayoutMapping[]{
        return DefaultComponentLayouts.getDefaultMappings();
    }

    /** Instantiates a layout factory, with assumption of default layouts. */
    protected selectLayoutFactory(): ILayoutComponentFactory<LayoutState>{
        let layoutEngine = new ComponentLayoutEngine();
        let layoutFactory= layoutEngine.selectLayoutFactory(
            this.getSize(),
            this.getLayoutMappings()
        );
        return layoutFactory;
    }

    /** Render Happy-Path/Message State experience based on state */
    public render(): JSX.Element {
        return this.getStoreState().showMessage ? this.renderMessageCard() : this.renderView();
    }

    /**
     * Returns additional options for particular message types that should be given to the WidgetMessageCardFactory.
     */
    protected abstract getMessageOptions(): MessageOptions;

    /** Render message card for atypical cases */
    private renderMessageCard() {
        let title = this.props.change.config.name;
        let size = this.getSize();
        let message = this.getStoreState().message;
        let messageType  = this.getStoreState().messageType;
        let messageOptions = this.getMessageOptions();

        return (<WidgetMessageCardFactory
                messageType={messageType}
                message={message}
                messageOptions={messageOptions}
                title={title}
                size={size}
            />);
    }

    /** Render the happy path view */
    private renderView(){
        return (<div className="view-component-base">
                {this.layoutFactory.render(this.getStoreState())}
            </div>);
    }

    protected setStoreState(): void {
        this.setState(this.getStoreState());
    }

    protected getStoreState(): LayoutState {
        return this.store.getState();
    }

    public componentDidMount(): void {
        this.store && this.store.addChangedListener(this.setStoreStateDelegate);
    }

    public componentWillUnmount(): void {
        this.store && this.store.removeChangedListener(this.setStoreStateDelegate);
    }



    // UTILITY METHODS. Inherited from prior form. Avoid adding new capabilities to ViewComponentBase without prior discussion of problem.
    protected getSize() : Size {
        return this.props.change.config.sizeInPixels;
    }

    protected getCustomSettings(change: WidgetConfigChange): CustomSettings {
        return change.config.customSettings;
    }
}