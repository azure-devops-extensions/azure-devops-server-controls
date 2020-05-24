import * as Q from "q";

import * as React from 'react';
import * as ReactDOM from 'react-dom';

import * as SDK from 'VSS/SDK/Shim';
import * as Controls from 'VSS/Controls';

import { Config } from "VSSPreview/Config/Components/Config";

import { ModernConfigurationBase } from 'Widgets/Scripts/ModernWidgetTypes/ModernConfigurationBase';
import { SettingsManagerBase } from 'Widgets/Scripts/ModernWidgetTypes/SettingsManagerBase';
import { EmptySettingsManager } from 'Widgets/Scripts/ModernWidgetTypes/EmptySettingsManager';
import { BehaviorTiming } from 'Widgets/Scripts/ModernWidgetTypes/ConfigurationViewContracts';
import { WidgetConfigurationOptions } from "Dashboards/Scripts/Contracts";

/**
 * Use this to create a widget configuration that is built on the <Config> control.
 */

export abstract class WidgetConfig<TSettings> extends ModernConfigurationBase<TSettings> {

    protected abstract getChildren(): React.ReactNode;

    public initialize(): void {
        super.initialize();

        this.propertiesToSave = null;
        this.canSave = true;
    }

    /**
     * Converts the config properties into widget settings.
     *
     * This implementation assumes that the names of your config properties and widget settings are the same. You can
     * use the `propertyName` prop of config components to achieve this. If you don't, you'll have to provide your own
     * implementation.
     */
    protected getSettingsFromProperties(properties: IDictionaryStringTo<any>): TSettings {
        let settings = {} as TSettings;
        for (let key in properties) {
            settings[key] = properties[key];
        }
        return settings;
    }

    /**
     * Converts the widget settings into config properties.
     *
     * This implementation assumes that the names of your config properties and widget settings are the same. You can
     * use the `propertyName` prop of config components to achieve this. If you don't, you'll have to provide your own
     * implementation.
     */
    protected getPropertiesFromSettings(settings: TSettings): IDictionaryStringTo<any> {
        let properties: IDictionaryStringTo<any> = {};
        for (let key in settings) {
            properties[key] = settings[key];
        }
        return properties;
    }

    /**
     * @deprecated
     *
     * Use the <Config> framework's PropertyDefinition.getDefaultValue() to provide defaults.
     */
    protected getSettingsManager(): SettingsManagerBase<TSettings> {
        /**
         * featureName is just used to log telemetry for the time taken to generate default settings.
         * Since the Config framework handles defaults, we do not need to provide a meaningful featureName for
         * telemetry since the timeTaken will always be negligible.
         */
        let featureName = "WidgetConfig";
        return new EmptySettingsManager<TSettings>(featureName);
    }

    /**
     * @deprecated
     *
     * If a config component needs to load async data, request the data in componentDidMount, and then use
     * ConfigActionCreator's setProperty or updateProperty to inform the framework of the loaded data.
     */
    protected loadDataAndSetSelections(settings: any): IPromise<void | void[]> {
        return Q<void[]>(null);
    }

    /**
     * @deprecated
     *
     * If a config property is in an invalid state, indicate it via PropertyDefinition.canSave.
     */
    protected isValid(): boolean {
        return this.canSave;
    }

    /**
     * @deprecated
     *
     * Use WidgetConfig.getSettingsFromProperties.
     */
    protected getSettings(): TSettings {
        return this.getSettingsFromProperties(this.propertiesToSave);
    }

    /**
     * @deprecated
     *
     * Use WidgetConfig.getChildren
     *
     */
    protected render(settings: any): void {
        const $container = this.getElement()[0];

        this.propertiesToSave = this.unpackSettings(settings);
        ReactDOM.render(
            (
                <div className="widget-config">
                    <Config
                        onChanged={(propertiesToSave, canSave) => this.onConfigChanged(propertiesToSave, canSave)}
                        onError={(error) => this.notifyError(error)}
                        properties={this.propertiesToSave}
                    >
                        {this.getChildren()}
                    </Config>
                </div>
            ),
            $container
        );
    }

    private unpackSettings(settings: TSettings): IDictionaryStringTo<any> {
        if (settings == null) {
            return null;
        }
        return this.getPropertiesFromSettings(settings);
    }

    private onConfigChanged(propertiesToSave: IDictionaryStringTo<any>, canSave: boolean) {
        this.propertiesToSave = propertiesToSave;
        this.canSave = canSave;
        this.packSettingsAndRequestWidgetReload(BehaviorTiming.Immediate);
    }

    private propertiesToSave: IDictionaryStringTo<any>;
    private canSave: boolean;
}

export function registerWidgetConfig<T extends Controls.Control<any>>(
    nameId: string,
    contentNameId: string,
    config: new(options: WidgetConfigurationOptions) => T,
) {
    SDK.VSS.register(nameId, config);
    SDK.registerContent(contentNameId, (context) => {
        let options: WidgetConfigurationOptions = context.options;
        return Controls.create(config, context.$container, options);
    });
}