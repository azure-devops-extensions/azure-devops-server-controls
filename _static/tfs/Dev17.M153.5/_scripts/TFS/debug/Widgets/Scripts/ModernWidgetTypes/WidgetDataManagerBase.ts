import * as Q from 'q';
import * as WidgetContracts from 'TFS/Dashboards/WidgetContracts';
import { DemandTracker } from 'WidgetComponents/Demands/DemandTracker';
import { DemandType } from 'WidgetComponents/Demands/DemandType';
import { IDataManager } from 'WidgetComponents/IDataManager';
import { isErrorMessageType, LayoutState, MessageType } from 'WidgetComponents/LayoutState';
import { WidgetTelemetry } from 'Widgets/Scripts/VSS.Widget.Telemetry';


/** Describes options neccessary for constructing a data manager used with a versioned widget. (Aspects such as size are intentionally hidden away as irrelevant - such asks need to come in as demands).*/
export interface WidgetDataManagerOptions {
    title: string;

    //Note: We don't want tight coupling to WidgetContracts here. Version aspect drives this right now.
    settings: WidgetContracts.CustomSettings;
    widgetTypeId: string;

    /** Signifies if animations are suppressed. This is relevant for widget configuration reload scenarios, where animations during param changes are obnoxious. */
    suppressAnimations: boolean;
}

/** Responsible for intelligently handling requests of data on the widget, and generating state objects for use by the store.
 *  The base class contains commonly managed state, and covers routine "registerDemand" bookkeeping, so derived types can focus on the heavy lifting of "getData()" implementation.
*/
export abstract class WidgetDataManagerBase implements IDataManager{
    protected title: string;
    protected settings: WidgetContracts.CustomSettings;
    protected widgetTypeId: string;
    protected suppressAnimations: boolean;

    // In the beginning, state is empty. As demands are registered, state is expanded.
    protected currentState: LayoutState = <LayoutState>{};

    protected demandTracker: DemandTracker;

    constructor(options: WidgetDataManagerOptions) {
        this.update(options);
        this.demandTracker = new DemandTracker();
    }

        /** Default implementation- Sets up initial state to reflect demanded information. */
    public registerDemand(demand: DemandType): void {
        if (!this.demandTracker.isDemandPresent(demand)) {
            this.demandTracker.registerDemand(demand);

            //Title information is available any time after creation. For everything else, there's getData().
            switch (demand) {
                case DemandType.title:
                    this.currentState.title = { text: this.title }
                    break;
                case DemandType.subtitle:
                case DemandType.scalar:
                case DemandType.chart:
                case DemandType.submetrics:
                    break;
                default:
                    throw new Error("An unrecognized demand was issued to the DataManager.");
            }
        }
    }

    public update(options: WidgetDataManagerOptions): void {
        this.title = options.title;
        this.settings = options.settings;
        this.suppressAnimations = options.suppressAnimations;
        this.widgetTypeId = options.widgetTypeId;
    }

    public getInitialState(): LayoutState {
        return this.currentState;
    }


    // Updates state based on message type
    public packMessageAsState(messageType: MessageType, message?: string): IPromise<LayoutState> {
        this.currentState = {
            title: null,
            subtitle: null,
            scalarData: null,
            chartData: null,
            submetricsData: null,
            showMessage: true,
            messageType: messageType,
            message: message
        };

        WidgetTelemetry.onWidgetMessageDisplayed(this.widgetTypeId, MessageType[messageType]);

        return isErrorMessageType(messageType)
            ? Q.reject(this.currentState)
            : Q.resolve(this.currentState);
    }

    /** All implementations must repond to demands issued on them in the getData method. */
    public abstract getData(): IPromise<LayoutState>;
}