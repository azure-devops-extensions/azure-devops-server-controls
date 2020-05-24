import * as Q from 'q';
import { DemandType } from 'WidgetComponents/Demands/DemandType';
import { IDemandHandler } from 'WidgetComponents/Demands/IDemandHandler';
import { IDataManager } from 'WidgetComponents/IDataManager';
import { LayoutActions } from 'WidgetComponents/LayoutActions';
import { LayoutState, MessageType } from 'WidgetComponents/LayoutState';
import { LayoutStore } from 'WidgetComponents/LayoutStore';
import { WidgetTelemetry } from 'Widgets/Scripts/VSS.Widget.Telemetry';
import { ErrorParser } from "Analytics/Scripts/AnalyticsExceptionUtilities";


/**
 * Provides public API's for driving action behavior, which leads to transformations of state.
 *
 * Notably: Declaring data dependencies from consumers, initializing data state and handling user driven events.
 */
export abstract class ActionCreatorBase implements IDemandHandler {
    protected _state: LayoutStore;
    protected _dataManager: IDataManager;
    protected _actions: LayoutActions;
    protected _widgetTypeName: string;

    constructor(dataManager: IDataManager, data: LayoutStore, actions: LayoutActions, widgetTypeName: string) {
        this._state = data;
        this._dataManager = dataManager;
        this._actions = actions;
        this._widgetTypeName = widgetTypeName;
    }

    /**
     *  Responsible for performs flux data-bootstrapping process.
     *  In particular, we get minimal format of data associated with current demands from data manager, and put out a ProvideData
     */
    public initialize() : void {
        this._actions.ProvideData.invoke(this._dataManager.getInitialState());
    }

    /**
     * Responsible for starting async load of demanded data.
     */
    public requestData(): IPromise<{}> {
        let deferred = Q.defer();
        this._dataManager.getData().then((state) => {
            this._actions.ProvideData.invoke(state);
            deferred.resolve(null);
        }, (state) => {
            WidgetTelemetry.onWidgetMessageDisplayed(this._widgetTypeName, MessageType[state.messageType]);
            this._actions.ProvideData.invoke(state);
            if (state.messageType === MessageType.WidgetError) {
                deferred.reject(state.message);
            } else {
                let errorMessage = ErrorParser.stringifyODataError(state);
                deferred.reject(errorMessage);
            }
            });
        return deferred.promise;
    }

    public handleMessageState(messageType: MessageType, message?: string): void {
        var state: LayoutState = {
            title: null,
            subtitle: null,
            scalarData: null,
            chartData: null,
            messageType: messageType,
            message: message ? message : null,
            showMessage: true
        };

        this._actions.ProvideData.invoke(state);
    }


    public registerDemand(demandType: DemandType): void {
        this._dataManager.registerDemand(demandType);
    }
}