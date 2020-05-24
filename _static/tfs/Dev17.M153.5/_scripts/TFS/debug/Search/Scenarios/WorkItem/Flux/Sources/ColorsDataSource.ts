import * as VSS from "VSS/VSS";
import * as _WorkItemStateColorsProvider from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateColorsProvider";
import { ColorsDataPayload } from "Search/Scenarios/WorkItem/Flux/ActionsHub";
import { getFieldValue } from "Search/Scenarios/WorkItem/Utils";
import { WorkItemResult } from "Search/Scenarios/WebApi/WorkItem.Contracts";

export class ColorsDataSource {
    public getColorsData(items: WorkItemResult[]): IPromise<ColorsDataPayload> {
        return new Promise<ColorsDataPayload>((resolve, reject) => {
            VSS.using(["Presentation/Scripts/TFS/FeatureRef/WorkItemStateColorsProvider"],
                (WorkItemStateColors: typeof _WorkItemStateColorsProvider) => {
                    const stateColorsProvider = WorkItemStateColors
                        .WorkItemStateColorsProvider
                        .getInstance(),
                        projects = items.map(x => x.project),
                        projectsForStateToFetch = projects
                            .filter((x, i) => projects.indexOf(x) === i) // remove duplicates.
                            .filter(x => !stateColorsProvider.isPopulated(x));

                    let stateColors: ColorsDataPayload = {
                        colorsData: {}
                    };

                    stateColorsProvider
                        .ensureColorsArePopulated(projectsForStateToFetch)
                        .then(() => {
                            for (let item of items) {
                                const workitemId = getFieldValue(item.fields, "system.id"),
                                    workItemType = getFieldValue(item.fields, "system.workitemtype"),
                                    state = getFieldValue(item.fields, "system.state");
                                stateColors.colorsData[workitemId] = stateColorsProvider.getColor(item.project, workItemType, state);
                            }
                            resolve(stateColors);
                        }, reject);
                });
        });
    }
}