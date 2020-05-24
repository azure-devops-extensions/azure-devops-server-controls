import * as Q from "q";
import { SettingsManagerBase } from '../ModernWidgetTypes/SettingsManagerBase';

/**
 * Used by widget views that have incomplete default settings so they don't try to interpret partial custom settings.
 */
export class EmptySettingsManager<T> extends SettingsManagerBase<T> {
    constructor(private featureName: string) {
        super();
     }

    public getFeatureName() : string{
         return this.featureName;
    }

    public generateDefaultSettings(): IPromise<T> {
        // We use undefined here because the value null is stringified in JSON as the string "null" which means default settings has a value.
        // That is not the intention of this class which is to produce an empty default settings object to indicate unconfigured.
        // Undefined stays undefined through the pipeline.
        return Q(undefined);
    }
}