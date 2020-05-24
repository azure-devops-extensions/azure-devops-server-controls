import * as Q from "q";
import { localeIgnoreCaseComparer, ignoreCaseComparer } from "VSS/Utils/String";
import { defaultComparer } from "VSS/Utils/Date";
import { union, subtract } from "VSS/Utils/Array";
import { VssIconType } from "VSSUI/VssIcon";
import { WorkItemStateColorsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateColorsProvider";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { IdentityHelper, IdentityImageMode, IdentityImageSize } from "Presentation/Scripts/TFS/TFS.OM.Identities";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { WorkItemStateCellRenderer } from "Presentation/Scripts/TFS/FeatureRef/WorkItemStateCellRenderer";
import { INode } from "Presentation/Scripts/TFS/FeatureRef/TFS.AgileCommon";
import { WorkItemTypeColorAndIconsProvider, WorkItemTypeColorAndIcons, IColorAndIcon } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { isPromise, makePromise, IOptionalPromise } from "Presentation/Scripts/TFS/TFS.Core.Utils";
import {
    IWorkItemFilterItemProvider, IWorkItemFilterItem, DataSourceFilterValueProvider, IWorkItemFilterPickListItemResult,
    IWorkItemFilterPickListItem, workItemFilterItemComparer
} from "WorkItemTracking/Scripts/Controls/Filters/WorkItemFilter";
import { IFilterDataSource, FilterValue } from "WorkItemTracking/Scripts/Filtering/FilterManager";
import { WorkItemStore, Project } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { WiqlOperators } from "WorkItemTracking/Scripts/OM/WiqlOperators";
import * as Resources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { NodesCacheManager } from "WorkItemTracking/Scripts/OM/NodesCacheManager";

const MeFilterItem: IWorkItemFilterItem = {
    key: WiqlOperators.MacroMe,
    display: `${WiqlOperators.MacroStart}${Resources.Wiql_MacroMe}`,
    value: WiqlOperators.MacroMe
};

const UnassignedFilterItem: IWorkItemFilterItem = {
    key: "_Unassigned_",
    display: Resources.AssignedToEmptyText,
    value: ""
};

/**
 * Assigned to data provider, takes all assigned to values and adds "Unassigned" as well as the '@Me' macro in the first position
 */
export class AssignedToFilterValueProvider extends DataSourceFilterValueProvider {
    constructor(dataSource: IFilterDataSource, private _excludeMeFilter: boolean = false) {
        super(CoreFieldRefNames.AssignedTo, dataSource);
    }

    getItems(persistedValues?: FilterValue[]): IOptionalPromise<IWorkItemFilterItem[]> {
        const values = super.getItems(persistedValues);

        if (isPromise(values)) {
            return values.then(this.addMacros);
        } else {
            return this.addMacros(values);
        }
    }

    getItemsForValues(values: FilterValue[]): IOptionalPromise<IWorkItemFilterItem[]> {
        const results: IPromise<IWorkItemFilterItem>[] = [];

        for (const value of values) {
            if (value === UnassignedFilterItem.value) {
                results.push(Q(UnassignedFilterItem));
            } else if (value === WiqlOperators.MacroMe) {
                results.push(Q(MeFilterItem));
            } else {
                results.push(makePromise(super.getItemsForValues([value])).then(r => r[0]));
            }
        }

        return Q.all(results);
    }

    getListItem(item: IWorkItemFilterItem): IWorkItemFilterPickListItemResult {
        // Special handling for unassigned and @me for now. We might improve this in the future, for now we just check the value
        if (item.key === MeFilterItem.key || item.key === UnassignedFilterItem.key) {
            return super.getListItem(item);
        }

        let { key, value, display, imageUrl } = item;
        if (!imageUrl) {
            // Fall back to the legacy approach for pages not supporting IdentityRef
            const entity = IdentityHelper.parseUniquefiedIdentityName(value as string);
            imageUrl = IdentityHelper.getIdentityImageUrl(entity, IdentityImageMode.ShowGenericImage, IdentityImageSize.Small);
            display = entity.displayName
        }

        // For now leave this as-is, this is a bug in the picklist control which will be fixed soon (size is incorrect for images).
        // TODO:  Remove once Open ALM fixes issue with rendering images.
        const imageStyle = {
            width: "20px",
            height: "20px",
        };

        return {
            item: {
                key,
                name: display,
                value,
                iconProps: {
                    iconType: VssIconType.image,
                    imageProps: {
                        style: imageStyle,
                        src: imageUrl,
                        className: "avatar"
                    }
                }
            }
        };
    }

    private addMacros(values: IWorkItemFilterItem[]): IWorkItemFilterItem[] {
        const macros = [MeFilterItem, UnassignedFilterItem];
        // make sure there are no macro dupes that came from persisted values.
        values = subtract(values, macros, workItemFilterItemComparer);

        if (this._excludeMeFilter) {
            macros.shift(); // remove MeFilterItem
        }
        return macros.concat(values);
    }
}

/**
 * Helper function used when retrieving state/work item type information.  For a given field value, finds that value in a row in the provided data
 * set.  If that row is associated with the 'current' project then that project/work item type pair is returned,
 * otherwise it will keep looking for a match on the 'current' project.  If no match for 'current' project is found, it will return the project/type 
 * for the first instance it encountered. If nothing found - fallback to the current project and unknown work item type.
 * @param fieldName Field which will contain 'value'
 * @param value Value to search for in the data
 */
function getWorkItemTypeFor(projectName: string, dataSource: IFilterDataSource, fieldName: string, value: string): IProjectAndType {
    // Rip thru the data provider to any work item type with the specified values

    let currentValue: IProjectAndType;
    const ids = dataSource.getIds();

    for (const id of ids) {
        const columnValue = dataSource.getValue(id, fieldName);

        if (value === columnValue) {
            const workItemProjectName = dataSource.getValue(id, CoreFieldRefNames.TeamProject) || projectName;
            const workItemTypeName = dataSource.getValue(id, CoreFieldRefNames.WorkItemType);
            const thisValue: IProjectAndType = {
                projectName: workItemProjectName,
                workItemType: workItemTypeName
            };

            // If it matches the project name and the value then this is the one we want
            // Otherwise just record it and if we don't find a better match return that one.
            if (localeIgnoreCaseComparer(workItemProjectName, projectName) === 0) {
                currentValue = thisValue;
                break;
            }

            if (!currentValue) {
                currentValue = thisValue;
            }
        }
    }

    // default to the current project in case there are no items that match the filter in the dataSource.
    if (!currentValue) {
        currentValue = { projectName };
    }

    return currentValue;
}

/**
 * Internal interface used as a return value.
 */
interface IProjectAndType {
    projectName: string;

    workItemType?: string;
}

/**
 * Work item state value provider
 */
export class StateFilterValueProvider extends DataSourceFilterValueProvider {
    constructor(private defaultProjectNameOrId: string, dataSource: IFilterDataSource) {
        super(CoreFieldRefNames.State, dataSource);
    }

    getListItem(item: IWorkItemFilterItem): IWorkItemFilterPickListItemResult {
        const stateName = item.value as string;

        const iconDimension = "12px";
        const defaultWhiteColor = "#ffffff";
        const workItemTypeData = getWorkItemTypeFor(this.defaultProjectNameOrId, this.dataSource, CoreFieldRefNames.State, stateName);
        const stateColorProvider = WorkItemStateColorsProvider.getInstance();

        let refreshPromise: IPromise<IWorkItemFilterPickListItem> = null;

        let color: string;
        if (workItemTypeData && workItemTypeData.projectName) {
            if (stateColorProvider.isPopulated(workItemTypeData.projectName)) {
                color = stateColorProvider.getColor(workItemTypeData.projectName, workItemTypeData.workItemType, stateName);
            } else {
                color = defaultWhiteColor;
                refreshPromise = stateColorProvider.getColorAsync(workItemTypeData.projectName, workItemTypeData.workItemType, stateName).then(() => {
                    // The state color provider caches, so now color should be available, just call the same codepath again.
                    return this.getListItem(item).item;
                });
            }
        } else {
            color = defaultWhiteColor;
        }

        const stateColors = WorkItemStateCellRenderer.getProcessedStateColor(color);

        return {
            item: {
                key: stateName,
                name: stateName,
                value: stateName,
                iconProps: {
                    style: {
                        border: `1px solid ${stateColors.borderColor}`,
                        backgroundColor: stateColors.backgroundColor,
                        borderRadius: "50%",
                        height: iconDimension,
                        width: iconDimension
                    }
                }
            },
            promise: refreshPromise
        };
    }
}

/////////

export class WorkItemTypeFilterValueProvider extends DataSourceFilterValueProvider {
    constructor(private projectName: string, dataSource: IFilterDataSource) {
        super(CoreFieldRefNames.WorkItemType, dataSource);
    }

    getListItem(item: IWorkItemFilterItem): IWorkItemFilterPickListItemResult {
        const workItemTypeName = item.value as string;
        const dataProvider = WorkItemTypeColorAndIconsProvider.getInstance();
        const workItemTypeData = getWorkItemTypeFor(this.projectName, this.dataSource, CoreFieldRefNames.WorkItemType, workItemTypeName);

        // Default color and icon
        let colorAndIcon: IColorAndIcon = {
            color: WorkItemTypeColorAndIcons.DEFAULT_WORKITEMTYPE_COLOR,
            icon: WorkItemTypeColorAndIcons.DEFAULT_WORKITEMTYPE_ICON
        };

        let refreshPromise: IPromise<IWorkItemFilterPickListItem> = null;

        if (workItemTypeData && workItemTypeData.projectName) {
            // If project and work item type are not empty and icon already exist in cache, then get the icon.
            // Otherwise get icon async.
            if (dataProvider.isPopulated(workItemTypeData.projectName)) {
                colorAndIcon = dataProvider.getColorAndIcon(workItemTypeData.projectName, workItemTypeName);
            } else {
                refreshPromise = Q(dataProvider.getColorAndIconAsync(workItemTypeData.projectName, workItemTypeName)).then(() => {
                    // The work item type data provider caches, so now color should be available, just call the same codepath again.
                    return this.getListItem(item).item;
                });
            }
        }

        return {
            item: {
                key: workItemTypeName,
                name: workItemTypeName,
                value: workItemTypeName,
                iconProps: {
                    iconType: VssIconType.bowtie,
                    iconName: colorAndIcon.icon,
                    style: {
                        color: colorAndIcon.color
                    }
                }
            },
            promise: refreshPromise
        };
    }
}

const CurrentIterationFilterItem: IWorkItemFilterItem = {
    key: WiqlOperators.MacroCurrentIteration,
    value: WiqlOperators.MacroCurrentIteration,
    display: `${WiqlOperators.MacroStart}${Resources.Wiql_MacroCurrentIteration}`
};

/**
 * Data provider for iteration path filters, takes all iteration path values, sorted by start data, and adds the '@CurrentIteration" macro 
 * at the very first position, resolving to the current team's current iteration.
 */
export class IterationPathFilterValueProvider implements IWorkItemFilterItemProvider {
    constructor(private projectNameOrId: string, private dataSource: IFilterDataSource) {
    }

    getItems(persistedValues?: string[]): IOptionalPromise<IWorkItemFilterItem[]> {
        const tfsContext = TfsContext.getDefault();
        const connection = ProjectCollection.getConnection(tfsContext);
        const store = connection.getService<WorkItemStore>(WorkItemStore);

        return Q.all([this.getIterationPathValues(), Q.Promise<Project>((resolve, reject) => store.beginGetProject(this.projectNameOrId, resolve, reject))])
            .spread<{ path: string; node: INode; }[]>((iterationPathValues: string[], project: Project) => {
                if (persistedValues) {
                    // make sure there are no macro dupes that came from persisted values.
                    persistedValues = subtract(persistedValues, [CurrentIterationFilterItem.key], localeIgnoreCaseComparer);
                    iterationPathValues = union(iterationPathValues, persistedValues, localeIgnoreCaseComparer);
                }
                return iterationPathValues.map(iterationPathValue => ({
                    path: iterationPathValue,
                    node: project.nodesCacheManager.findIterationNodeByPath(iterationPathValue)
                }));
            })
            .then(nodes => {
                nodes.sort((a, b) => {
                    const nodeA = a.node;
                    const nodeB = b.node;

                    // Sort by start date first
                    const dateComparison = defaultComparer(nodeA.startDate, nodeB.startDate);
                    if (dateComparison !== 0) {
                        return dateComparison;
                    }

                    // Fall back to name
                    const nameComparison = localeIgnoreCaseComparer(nodeA.name, nodeB.name);
                    if (nameComparison !== 0) {
                        return nameComparison;
                    }

                    return nodeA.id - nodeB.id;
                });

                return [CurrentIterationFilterItem]
                    .concat(nodes.map(n => ({
                        key: n.path,
                        value: n.path,
                        display: n.node.name
                    })));
            });
    }

    getItemsForValues(values: FilterValue[]): IOptionalPromise<IWorkItemFilterItem[]> {
        return this.getNodesCacheManager()
            .then(nodesCacheManager => {
                let filterItems: IWorkItemFilterItem[] = [];

                values.forEach((value: string) => {
                    if (value === WiqlOperators.MacroCurrentIteration) {
                        filterItems.push(CurrentIterationFilterItem);
                    }
                    else {
                        const node = nodesCacheManager.findIterationNodeByPath(value);

                        if (node) {
                            filterItems.push(this.transformNode(value, node));
                        }
                    }
                });

                return filterItems;
            });
    }

    getListItem(filterItem: IWorkItemFilterItem): IWorkItemFilterPickListItemResult {
        return {
            item: {
                key: filterItem.key,
                name: filterItem.display,
                value: filterItem.value
            }
        };
    }

    private transformNode(path: string, node: INode): IWorkItemFilterItem {
        return {
            key: path,
            value: path,
            display: node.name
        };
    }

    private getNodesCacheManager(): IPromise<NodesCacheManager> {
        const tfsContext = TfsContext.getDefault();
        const connection = ProjectCollection.getConnection(tfsContext);
        const store = connection.getService<WorkItemStore>(WorkItemStore);

        return Q.Promise<Project>((resolve, reject) => store.beginGetProject(this.projectNameOrId, resolve, reject))
            .then(project => project.nodesCacheManager)
            .then(nodesCacheManager => {
                // Ensure nodes are available before returning the cache manager
                return nodesCacheManager.beginGetNodes().then(_ => nodesCacheManager);
            });
    }

    private getIterationPathValues(): IPromise<FilterValue[]> {
        return makePromise(this.dataSource.getUniqueValues(CoreFieldRefNames.IterationPath));
    }
}
