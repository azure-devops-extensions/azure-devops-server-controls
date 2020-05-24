import * as React from 'react';
import { ActionCreatorBase } from 'Widgets/Scripts/ModernWidgetTypes/ActionCreatorBase';
import { AggregationMode } from 'Widgets/Scripts/ModernWidgetTypes/CommonConfigurationTypes';
import { ISettingsManager } from 'Widgets/Scripts/ModernWidgetTypes/SettingsManagerBase';
import { ViewComponentBase, ViewComponentProps } from 'Widgets/Scripts/ModernWidgetTypes/ViewComponentBase';
import { WidgetDataManagerBase, WidgetDataManagerOptions } from 'Widgets/Scripts/ModernWidgetTypes/WidgetDataManagerBase';
import { VelocityActionCreator } from 'Widgets/Scripts/Velocity/VelocityActionCreator';
import { VelocityConstants } from 'Widgets/Scripts/Velocity/VelocityConstants';
import { VelocityDataManager } from 'Widgets/Scripts/Velocity/VelocityDataManager';
import { VelocitySettings } from 'Widgets/Scripts/Velocity/VelocitySettings';
import VelocitySettingsManager from 'Widgets/Scripts/Velocity/VelocitySettingsManager';
import * as WidgetResources from "Widgets/Scripts/Resources/TFS.Resources.Widgets";
import { MessageOptions, SetIterationDatesMessageOptions, AxFaultInMessageOptions } from "Widgets/Scripts/ModernWidgetTypes/WidgetMessageCardFactory";
import { MessageType } from "WidgetComponents/LayoutState";
import TFS_Host_TfsContext = require('Presentation/Scripts/TFS/TFS.Host.TfsContext');


export interface VelocityViewComponentProps extends ViewComponentProps{}

export default class VelocityViewComponent extends ViewComponentBase<VelocityViewComponentProps, VelocitySettings> {
    protected createDataManager(options: WidgetDataManagerOptions ):WidgetDataManagerBase{
        return new VelocityDataManager(options);
    }

    protected createActionCreator(): ActionCreatorBase {
        return new VelocityActionCreator(this.dataManager, this.store, this.actions, VelocityConstants.featureName);
    }

    protected createSettingsManager(): ISettingsManager<VelocitySettings>{
        return new VelocitySettingsManager();
    }

    protected getMessageOptions(): MessageOptions {
        let options: MessageOptions;

        switch (this.getStoreState().messageType) {
            case MessageType.AxFaultIn:
                options = {
                    actionText: WidgetResources.VelocityWidget_LearnMore,
                    actionAriaLabel: WidgetResources.VelocityWidget_LearnMore,
                    actionOnClickDelegate: () => window.open(WidgetResources.VelocityWidget_LearnMoreLink, "_blank")
                } as AxFaultInMessageOptions;
                break;
            case MessageType.SetIterationDates:
                const tfsContext: TFS_Host_TfsContext.TfsContext = TFS_Host_TfsContext.TfsContext.getDefault();
                const linkToSetIterations = tfsContext.getActionUrl(
                    "",
                    "work", {
                        area: "admin",
                        team: null,
                        project: tfsContext.contextData.project.name,
                        _a: "iterations"
                    } as TFS_Host_TfsContext.IRouteData
                );

                options = {
                    actionText: WidgetResources.VelocityWidget_SetIterationDatesLink,
                    actionAriaLabel: WidgetResources.VelocityWidget_SetIterationDatesAriaLabel,
                    actionOnClickDelegate: () => window.open(linkToSetIterations, "_blank")
                } as SetIterationDatesMessageOptions;
                break;
            default:
                options = undefined;
                break;
        }

        return options;
    }

    /** Pass custom telemetry about the load event for Standardized Widget Reporting. */
    protected packWidgetLoadedTelemetryData(velocitySettings: VelocitySettings):  IDictionaryStringTo<any>{
        return {
            "WorkItemFilterKey": velocitySettings.workItemTypeFilter.identifier,
            "WorkItemFilterValue": velocitySettings.workItemTypeFilter.identifier,


            "AggregationKey": AggregationMode[velocitySettings.aggregation.identifier],
            "AggregationValue": velocitySettings.aggregation.settings,

            //The desired # in config, not the actual number which get rendered, which may be less.
            "NumberOfIterations": velocitySettings.numberOfIterations,

            "LateWorkDelayEnabled": velocitySettings.lateWorkDelay !== undefined,
            "LateWorkDelay": velocitySettings.lateWorkDelay,

            "PlannedWorkDelayEnabled": velocitySettings.plannedWorkDelay !== undefined,
            "PlannedWorkDelay": velocitySettings.plannedWorkDelay
        }
    }
}