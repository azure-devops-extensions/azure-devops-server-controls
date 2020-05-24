import { ConfigActionCreator } from "VSSPreview/Config/Framework/ConfigActionCreator";

import { WorkPropertyKeys } from "Widgets/Scripts/Work/Framework/WorkPropertyKeys";
import { WorkDataProvider } from "Widgets/Scripts/Work/Framework/WorkDataProvider";

import * as Resources from 'Analytics/Resources/TFS.Resources.Analytics';

export class WorkActionCreator {
    private workDataProvider = new WorkDataProvider();

    constructor(private configActionCreator: ConfigActionCreator) {}

    public demandBacklogConfigurations(): void {
        this.workDataProvider.getBacklogConfigurations().then(
            backlogConfigurations => {
                this.configActionCreator.setProperty(WorkPropertyKeys.BacklogConfigurations, backlogConfigurations);
            },
            reason => {
                this.configActionCreator.handleError(Resources.AnalyticsTrendsConfig_LoadWorkItemTypesFailed)
            }
        )
    }

    public demandWitTypes(): void {
        this.workDataProvider.getWorkItemTypes().then(
            workItemTypes => {
                this.configActionCreator.setProperty(WorkPropertyKeys.WorkItemTypes, workItemTypes);
            },
            reason => {
                this.configActionCreator.handleError(Resources.AnalyticsTrendsConfig_LoadBacklogConfigurationsFailed)
            }
        );
    }
}