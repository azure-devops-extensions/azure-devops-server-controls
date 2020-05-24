import { FunctionNameParser } from 'Dashboards/Scripts/Common';
import * as Q from 'q';
import * as WidgetContracts from 'TFS/Dashboards/WidgetContracts';
import { WidgetTelemetry } from 'Widgets/Scripts/VSS.Widget.Telemetry';

/** This is a re-usable contract for shared data generation on configurable widgets. */
 export interface ISettingsManager<T>{

    /**
     * Provides initial settings, base on the last state.
     * If unconfigured, this will auto-populate smart defaults.
     * Note: a mis-configured widget won't be corrected through this process.
     */
    ensureInitialSettings(customSettings: WidgetContracts.CustomSettings): IPromise<T>;

    /** Signifies if the widget is configured. If not, we're operating with defaults. Note: A stored configuration may be entirely composed of defaults. */
    isConfigured(customSettings: WidgetContracts.CustomSettings): boolean;
}


export abstract class SettingsManagerBase<T> implements ISettingsManager<T>{

    public isConfigured(customSettings: WidgetContracts.CustomSettings): boolean{
        /*
         * If there's *anything* in data, we don't have a default configuration.
         * We consider null the same as undefined: Unconfigured.
         */
        return customSettings.data != null;
    }

    public ensureInitialSettings(customSettings: WidgetContracts.CustomSettings): IPromise<T> {
        let initialSettings: T;
        if (this.isConfigured(customSettings)) {
            initialSettings = JSON.parse(customSettings.data);
            return Q.resolve(initialSettings);
        }
        else {
            return WidgetTelemetry.executeAndTimeAsync(this.getFeatureName(), FunctionNameParser.getMethodName(this, this.ensureInitialSettings),
                () => this.generateDefaultSettings());
        }
    }

    public abstract getFeatureName() : string;

    public abstract generateDefaultSettings(): IPromise<T>;
}