import { ErrorParser } from "Analytics/Scripts/AnalyticsExceptionUtilities";
import { WidgetConfigurationOptions } from 'Dashboards/Scripts/Contracts';
import { SelectorControl } from 'Dashboards/Scripts/Selector';
import { SettingsField } from 'Dashboards/Scripts/SettingsField';
import * as Q from 'q';
import * as WidgetContracts from 'TFS/Dashboards/WidgetContracts';
import * as WidgetHelpers from 'TFS/Dashboards/WidgetHelpers';
import * as WidgetConfigHelpers from 'TFS/Dashboards/WidgetConfigHelpers';
import { DelayedFunction } from 'VSS/Utils/Core';
import { BehaviorTiming, NotificationMode } from 'Widgets/Scripts/ModernWidgetTypes/ConfigurationViewContracts';
import WidgetResources = require('Widgets/Scripts/Resources/TFS.Resources.Widgets');
import * as WidgetLiveTitle from 'Widgets/Scripts/Shared/WidgetLiveTitle';
import { BaseWidgetConfiguration } from 'Widgets/Scripts/VSS.Control.BaseWidgetConfiguration';

import { SettingsManagerBase } from 'Widgets/Scripts/ModernWidgetTypes/SettingsManagerBase';
import { WidgetCustomSettings } from 'Widgets/Scripts/ModernWidgetTypes/ViewComponentBase';

/** Describes a control which implements the validate pattern. */
export interface IValidate {
    validate(): string;
}

/** Describes a widget configuration control with predictable support for reading settings, validating and reacting to updated context.*/
export interface IConfigurationControl<SettingsT, ContextT> extends IValidate {
    getSettings(): SettingsT;
    setContext(context: ContextT): IPromise<void>
}

/*** Handles the repetitive concerns of Widget configuration which makes life suck. Derived implementations must implement the abstract methods. */
export abstract class ModernConfigurationBase<WidgetCustomSettings>
    extends BaseWidgetConfiguration<WidgetConfigurationOptions>
    implements WidgetContracts.IWidgetConfiguration {

    // Abstract contracts below are responsability of ALL derived config implementations.
    /** Handles generation of Widget default Title */
    protected abstract getSettingsManager(): SettingsManagerBase<WidgetCustomSettings>;

    /** Handles generation of Widget default Title */
    protected abstract getCalculatedWidgetTitle(): string ;

    /** Synchronously constructs pertinent controls, and applies settings with known-data controls. Dynamic data population and selections against dynamic data happens in loadDataAndSetSelections().*/
    protected abstract render(settings: WidgetCustomSettings): void ;

    /** Perform Dynamic data population and selections against dynamic data sets. */
    protected abstract loadDataAndSetSelections(settings: WidgetCustomSettings): IPromise<void | void[]>;

    /** Performs validation of all fields. Stops on first failure. */
    protected abstract isValid(): boolean;

    /** Assembles the widget configuration based on the current state of the config UI controls.*/
    protected abstract getSettings(): WidgetCustomSettings;

    /*
     * Delayed notifications are used for de-bouncing on rapid-fire config changes which manifest as distinct queries when a user is typing quickly.
     * Note: Immediate notification is the way to go if an input does not cause cache resets on existing data. e.g. title and purely presentational considerations.
     */
    private delayedNotify: DelayedFunction;
    private latestNotifyArgs: WidgetContracts.EventArgs<WidgetContracts.CustomSettings>;
    private widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext;
    protected liveTitleState: WidgetLiveTitle.WidgetLiveTitleEditor;


    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            coreCssClass: "modern-configuration-base"
        }, options));
    }

    public load(widgetSettings: WidgetContracts.WidgetSettings, widgetConfigurationContext: WidgetContracts.IWidgetConfigurationContext): IPromise<WidgetContracts.WidgetStatus> {
        this.widgetConfigurationContext = widgetConfigurationContext;
        return this.getSettingsManager().ensureInitialSettings(widgetSettings.customSettings)
            .then((preparedSettings: WidgetCustomSettings) => {
                this.createDelayedNotificationHandler();
                this.render(preparedSettings);
                this.liveTitleState = WidgetLiveTitle.WidgetLiveTitleEditor.fromSettings(
                    preparedSettings,
                    WidgetResources.Burndown_DefaultWidgetName);

                return this.loadDataAndSetSelections(preparedSettings)
                    .then(
                        () => WidgetHelpers.WidgetStatusHelper.Success(),
                        e => WidgetHelpers.WidgetStatusHelper.Failure(ErrorParser.stringifyODataError(e), /*isUserVisible*/ true)
                    );
            });
    }

    public onSave(): IPromise<WidgetContracts.SaveStatus> {
        if (this.isValid()) {
            let data = this.packWidgetCustomSettings(this.getSettings());
            return WidgetHelpers.WidgetConfigurationSave.Valid(data);
        } else {
            return WidgetHelpers.WidgetConfigurationSave.Invalid();
        }
    }

    /** Behavior for "leaf level" controls:
     * 1 -Hides any previous validation errors
     * 2 -validates
     * 3 -Acts on outcome:
     *   -notifies on success, if notifyChanges = true
     *   -shows error on failure
     * Note: this implementation isn't currently factored to cover intermediate step of delegated notifications to downstream controls before resuming outcome logic, as is neccessary for WIT mode choice or  team change scenario.
     * */
    protected validateAndReact<TControl extends SelectorControl>(notificationMode: NotificationMode, settingsField: SettingsField<TControl>): IPromise<void> {
        settingsField.hideError();

        let childControl = settingsField.control;
        let errMessage = childControl.validate();
        if (errMessage == null) {
            if (notificationMode === NotificationMode.On) {
                this.packSettingsAndRequestWidgetReload();
            }
        }
        else {
            settingsField.showError(errMessage);
        }
        return Q<void>(null);
    }

    protected notifyError(error: string): void {
        let packedErrorData: WidgetContracts.EventArgs<string> = this.packWidgetConfigErrorMessage(error);
        this.widgetConfigurationContext.notify(WidgetConfigHelpers.ConfigurationEvent.ConfigurationError, packedErrorData)
    }

    /** Defines the delayed notification handler. Note, this is a common pattern across configs, which should be encapsulated as a common abstraction. */
    private createDelayedNotificationHandler(): void {
        const notifyThrottleMs = 750;

        this.delayedNotify = new DelayedFunction(
            this,
            notifyThrottleMs,
            "notifySettings",
            this.notifySettingsImmediately);
    }

    /**
     * Notifies the widget of a config change with the latest packed widget event args.
     */
    private notifySettingsImmediately(): void {
        if (this.latestNotifyArgs !== null) {
            this.widgetConfigurationContext.notify(WidgetHelpers.WidgetEvent.ConfigurationChange, this.latestNotifyArgs);
        }
    }


    /** Causes packing of Widget reload notification arguments. By default, it is delayed, but can be opted as immediate for presentation-centric options with no data impact.*/
    protected packSettingsAndRequestWidgetReload(whenToNotify: BehaviorTiming = BehaviorTiming.Delayed) {
        if (this.isValid()) {
            this.packNotifyArgs();
            if (whenToNotify === BehaviorTiming.Delayed) {
                this.delayedNotify.reset();
            } else {
                this.notifySettingsImmediately();
            }
        }
    }

    /**
     * Prepares settings for use in a widget reload notification.
     * Called when settings are changed in the config.
     * Updates live title and prepares the current config settings for being notified to the widget.
     */
    private packNotifyArgs(): void {
        let settings = this.getSettings();
        this.liveTitleState.updateTitleOnLatestArtifact(this.configureName, this.getCalculatedWidgetTitle());
        this.liveTitleState.appendToSettings(settings);

        let customSettings = this.packWidgetCustomSettings(settings);
        this.latestNotifyArgs = WidgetHelpers.WidgetEvent.Args(customSettings);
    }


    /** Handles packing of custom settings of your widget for notification to framework. */
    private packWidgetCustomSettings(settings: WidgetCustomSettings): WidgetContracts.CustomSettings {
        return {
            data: JSON.stringify(settings)
            // Currently no version
        };
    }

    private packWidgetConfigErrorMessage(error: string): WidgetContracts.EventArgs<string> {
       return WidgetConfigHelpers.ConfigurationEvent.Args(error);
    }
}
