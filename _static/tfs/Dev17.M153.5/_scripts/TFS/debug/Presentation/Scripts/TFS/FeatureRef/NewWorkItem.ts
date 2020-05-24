import * as React from "react";
import * as Service from "VSS/Service";
import * as Contribution_Services from "VSS/Contributions/Services";
import { uniqueSort } from "VSS/Utils/Array";
import { localeIgnoreCaseComparer } from "VSS/Utils/String";
import { IPivotBarAction } from "VSSUI/PivotBar";
import { VssIconType, IVssIconProps } from "VSSUI/VssIcon";
import * as DataProvider from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { INewWorkItemData } from "Presentation/Scripts/TFS/FeatureRef/INewWorkItemData";
import { NewWorkItemItemButtonText } from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";

export interface IActionOptions {
    /**
     * Callback when Add New Item is clicked
     */
    addNewItem: (e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, item: IPivotBarAction, workItemTypeName: string) => void;
    /**
     * Optional list of work item type names, when not provided shows all work item types in the project
     */
    workItemTypesNames?: string[];
    /**
     * True is the action should be in disabled state
     */
    disabled?: boolean;
    /**
     * True to make the pivot bar action important (default is true)
     */
    important?: boolean;
}

export class PivotBarActionHelper {
    public static readonly newWorkItemCommandKey = "new-work-item";

    /**
     * Gets the Pivot Bar Actions for New Work Item
     * @param options Options for the pivot bar action
     */
    public static getNewWorkItemPivotBarActions(options: IActionOptions): IPivotBarAction[] {
        const dataProvider = new DataProvider.WorkItemTypeColorAndIcons();
        return PivotBarActionHelper._getWorkItemTypeMenuItems(options, dataProvider);
    }

    /**
     * Gets Pivot Bar Action for New Item (New Work Item)
     * @param options Options for the pivot bar action
     */
    public static getNewWorkItemPivotBarAction(options: IActionOptions): IPivotBarAction {
        const important = options.important == null ? true : options.important;  // default is True
        const dataProvider = new DataProvider.WorkItemTypeColorAndIcons();
        const vssIconProps = {
            iconName: "bowtie-math-plus-light",
            iconType: VssIconType.bowtie
        };

        // Do not show drop down when there is only one work item type
        if (options.workItemTypesNames && options.workItemTypesNames.length === 1) {
            return {
                key: PivotBarActionHelper.newWorkItemCommandKey,
                disabled: options.disabled,
                name: NewWorkItemItemButtonText,
                iconProps: vssIconProps,
                important: important,
                onClick: (ev, item) => options.addNewItem(ev, item, options.workItemTypesNames[0])
            };
        }

        return {
            key: PivotBarActionHelper.newWorkItemCommandKey,
            disabled: options.disabled,
            name: NewWorkItemItemButtonText,
            iconProps: vssIconProps,
            important: important,
            children: PivotBarActionHelper._getWorkItemTypeMenuItems(options, dataProvider)
        };
    }

    private static _getWorkItemTypeMenuItems(options: IActionOptions, dataProvider: DataProvider.WorkItemTypeColorAndIcons): IPivotBarAction[] {
        const webPageDataSvc = Service.getService(Contribution_Services.WebPageDataService);
        const workItemData = webPageDataSvc.getPageData<INewWorkItemData>("ms.vss-work-web.new-workitem-data-provider-non-cached");
        if (!workItemData) {
            return [];
        }
        let types: string[];
        if (options.workItemTypesNames && options.workItemTypesNames.length > 0) {
            types = uniqueSort(options.workItemTypesNames, localeIgnoreCaseComparer);
        } else {
            types = uniqueSort(workItemData.workItemTypes, localeIgnoreCaseComparer);
        }

        return types.map((workItemTypeName: string) => PivotBarActionHelper._createMenuItem(options, dataProvider, workItemData, workItemTypeName));
    }

    private static _createMenuItem(
        options: IActionOptions,
        dataProvider: DataProvider.WorkItemTypeColorAndIcons,
        workItemData: INewWorkItemData,
        workItemTypeName: string): IPivotBarAction {

        const colorAndIcon = PivotBarActionHelper._getWorkItemTypeColorAndIcon(dataProvider, workItemData, workItemTypeName);
        const vssIconProps: IVssIconProps = {
            iconName: colorAndIcon.icon,
            iconType: VssIconType.bowtie,
            style: {
                color: colorAndIcon.color
            }
        };

        const menuItem: IPivotBarAction = {
            key: workItemTypeName,
            disabled: options.disabled,
            name: workItemTypeName,
            iconProps: vssIconProps,
            onClick: (ev, item) => options.addNewItem(ev, item, workItemTypeName)
        };

        return menuItem;
    }

    private static _getWorkItemTypeColorAndIcon(
        dataProvider: DataProvider.WorkItemTypeColorAndIcons,
        workItemData: INewWorkItemData,
        typeName: string): DataProvider.IColorAndIcon {

        let result: DataProvider.IColorAndIcon;

        typeName = DataProvider.getNormalizedValue(typeName);
        if (typeName && workItemData.colorAndIcons) {
            const colorAndIcon = workItemData.colorAndIcons[typeName];
            if (colorAndIcon) {
                result = dataProvider.setColorAndIcon(typeName, colorAndIcon.color, colorAndIcon.icon);
            }
        }

        if (!result) {
            result = DataProvider.WorkItemTypeColorAndIcons.getDefault();
        }

        return result;
    }
}
