import { autobind } from "OfficeFabric/Utilities";
import * as WITConstants from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ProjectCollection } from "Presentation/Scripts/TFS/TFS.OM.Common";
import { getPageContext } from "VSS/Context";
import { publishErrorToTelemetry } from "VSS/Error";
import * as Utils_String from "VSS/Utils/String";
import { ActionsCreator } from "WorkItemsHub/Scripts/Actions/ActionsCreator";
import {
    MentionedTabDataProvider,
    RecentActivityConstants,
    WorkItemsHubTabs,
} from "WorkItemsHub/Scripts/Generated/Constants";
import { WorkItemsHubColumnOption, WorkItemsHubSortOption } from "WorkItemsHub/Scripts/Generated/Contracts";
import * as Resources from "WorkItemsHub/Scripts/Resources/TFS.Resources.WorkItemsHub";
import { updateColumnSettings } from "WorkItemsHub/Scripts/Utils/WorkItemsHubTabSettings";
import { TabEnumValueByTabIdMap } from "WorkItemsHub/Scripts/Utils/WorkItemsHubTabUtils";
import {
    IColumnOptionsPanelDisplayColumn,
    IColumnOptionsPanelSortColumn,
    IColumnOptionsResult,
} from "WorkItemTracking/Scripts/OM/QueryInterfaces";
import { FieldFlags, FieldUsages } from "WorkItemTracking/Scripts/OM/WorkItemConstants";
import { IFieldEntry } from "WorkItemTracking/Scripts/OM/WorkItemInterfaces";
import {
    IColumnOptionsPanelProps,
    showColumnOptionsPanel,
} from "WorkItemTracking/Scripts/Queries/Components/ColumnOptions/ColumnOptionsPanel";
import { FieldDefinition, WorkItemStore } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";
import { UsageTelemetryHelper } from "WorkItemsHub/Scripts/Utils/Telemetry";

/**
 * Utility to launch column options panel with custom available fields for work items hub
 */
export class ColumnOptionsPanelLauncher {

    /**
    * Version
    */
    private _version: number;

    constructor(private _tabId: string, private _actionCreator: ActionsCreator) {
    }

    public openColumnOptionPanel(currentColumns: WorkItemsHubColumnOption[], sortOptions: WorkItemsHubSortOption[], version: number) {
        const displayColumns: IColumnOptionsPanelDisplayColumn[] = currentColumns.map(column => ({
            fieldRefName: column.fieldReferenceName,
            width: column.width,
        } as IColumnOptionsPanelDisplayColumn));

        const sortColumns: IColumnOptionsPanelSortColumn[] = sortOptions.map(option => ({
            fieldRefName: option.fieldReferenceName,
            descending: !option.isAscending
        } as IColumnOptionsPanelSortColumn));

        this._version = version;
        const projectId = getPageContext().webContext.project.id;

        const defaultProps: IColumnOptionsPanelProps = {
            displayColumns,
            sortColumns,
            allowSort: true,
            project: projectId,
            getAvailableFields: this._getAvailableFields,
            onOkClick: this._onOkCick
        };

        showColumnOptionsPanel({ ...defaultProps });
    }

    @autobind
    private _onOkCick(result: IColumnOptionsResult, dataChanged?: boolean): void {
        if (!dataChanged) {
            return;
        }

        const projectId = getPageContext().webContext.project.id;

        // persist settings
        const columnOptions = result.display.map(column => ({
            fieldReferenceName: column.name,
            width: column.width
        } as WorkItemsHubColumnOption));

        const sortOptions = result.sort.map(column => ({
            fieldReferenceName: column.name,
            isAscending: column.asc
        } as WorkItemsHubSortOption));

        updateColumnSettings(projectId, this._tabId, columnOptions, sortOptions, this._version).then(() => {
            // refresh grid data only after setting was persisted otherwise we may get old column settings
            this._actionCreator.invalidateTabData(this._tabId);
            this._actionCreator.refreshDataProviderAsync(this._tabId);

            UsageTelemetryHelper.publishColumnOptionsChange(this._tabId,
                {
                    columns: result.display.map(value => value.name).join(),
                    sortOptions: result.sort.map(value => value.name).join(),
                    addedColumns: result.added.join(),
                    removedColumns: result.removed.join(),
                    addedColumnsCount: result.added.length,
                    removedColumnsCount: result.removed.length
                }
            );
        }, (reason) => {
            publishErrorToTelemetry(
                new Error(`Failed to store column settings for work items hub ${this._tabId}, columns: ${columnOptions.length}, sort: ${sortOptions.length}, ${reason}`)
            );
        });
    }

    @autobind
    private _getAvailableFields(): IPromise<FieldDefinition[]> {
        const projectId = getPageContext().webContext.project.id;
        const tfsContext = TfsContext.getDefault();
        const store = ProjectCollection.getConnection(tfsContext).getService<WorkItemStore>(WorkItemStore);

        return new Promise((resolve, reject) => store.beginGetProject(projectId, project => {
            const fields: FieldDefinition[] = [];
            const fieldIdMap: IDictionaryNumberTo<boolean> = {};
            let minFieldId = 0;

            for (const fieldId of project.fieldIds) {
                if (!(fieldId in fieldIdMap)) {
                    fieldIdMap[fieldId] = true;
                    const definition = store.getFieldDefinition(fieldId);

                    // manually set Tags field to be sortable
                    if (Utils_String.equals(definition.referenceName, WITConstants.CoreFieldRefNames.Tags, true)) {
                        definition.flags = definition.flags | FieldFlags.Sortable;
                    }

                    if (fieldId < minFieldId) {
                        minFieldId = fieldId;
                    }

                    fields.push(definition);
                }
            }

            const additionalFields: FieldDefinition[] = this._getAdditionalField(minFieldId);
            if (additionalFields) {
                fields.push(...additionalFields);
            }

            resolve(fields);
        }, error => reject(error)));
    }

    @autobind
    private _getAdditionalField(minFieldId: number): FieldDefinition[] {
        const fields: FieldDefinition[] = [];
        switch (TabEnumValueByTabIdMap[this._tabId]) {
            case WorkItemsHubTabs.Mentioned:
                fields.push(this._createWorkItemsHubField(--minFieldId, MentionedTabDataProvider.MentionedDateField, Resources.MentionedDateColumnDisplayName));
                break;

            case WorkItemsHubTabs.MyActivity:
                fields.push(this._createWorkItemsHubField(--minFieldId, RecentActivityConstants.MyActivityDetailsField, Resources.MyActivityDetailsColumnDisplayName));
                fields.push(this._createWorkItemsHubField(--minFieldId, RecentActivityConstants.MyActivityDateField, Resources.ActivityDateColumnDisplayName));
                break;

            case WorkItemsHubTabs.RecentlyUpdated:
                fields.push(this._createWorkItemsHubField(--minFieldId, RecentActivityConstants.RecentlyUpdatedDateField, Resources.ActivityDateColumnDisplayName));
                break;

            default:
                return null;
        }

        return fields;
    }

    private _createWorkItemsHubField(id: number, fieldReferenceName: string, fieldDisplayName: string): FieldDefinition {
        const tfsContext = TfsContext.getDefault();
        const store = ProjectCollection.getConnection(tfsContext).getService<WorkItemStore>(WorkItemStore);

        const fieldEntry: IFieldEntry = {
            id,
            name: fieldDisplayName,
            referenceName: fieldReferenceName,
            type: WITConstants.FieldType.DateTime,
            flags: FieldFlags.Sortable | FieldFlags.Computed | FieldFlags.Queryable,
            usages: FieldUsages.WorkItem,
            isIdentity: false,
            isHistoryEnabled: false
        } as IFieldEntry;

        return new FieldDefinition(store, fieldEntry);
    }
}
