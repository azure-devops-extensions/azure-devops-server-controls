import { first } from "VSS/Utils/Array";
import { equals } from "VSS/Utils/String";
import { CoreFieldRefNames, WellKnownControlNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import * as WorkItemTrackingResources from "WorkItemTracking/Scripts/Resources/TFS.Resources.WorkItemTracking";
import { PageType, PageLayoutMode, ILayout, IControl, IPage, IGroup } from "WorkItemTracking/Scripts/Form/Models";
import {
    IWorkItemFormLayoutTransformation, WorkItemFormLayoutTransformationResult, ILayoutControl
} from "WorkItemTracking/Scripts/Form/Layout";

/**
 * This transformation contains the default OOB header layout, updates it based on the 'systemControls' contained in the layout, 
 * and builds the layout as an IPage in headerPage. 
 */
export class InjectHeaderPageTransformation implements IWorkItemFormLayoutTransformation {
    apply(layout: ILayout): WorkItemFormLayoutTransformationResult {
        // Section 1
        const section1Controls: IControl[] = [];

        // State is always there and cannot be overriden
        const stateControl = this._getSystemControl(
            layout,
            CoreFieldRefNames.State,
            WorkItemTrackingResources.StateLabel,
            WellKnownControlNames.FieldControl,
            WorkItemTrackingResources.StateEmptyText);
        section1Controls.push(stateControl);

        // Reason
        const reasonControl = this._getSystemControl(
            layout,
            CoreFieldRefNames.Reason,
            WorkItemTrackingResources.ReasonLabel,
            WellKnownControlNames.FieldControl,
            null
        );
        if (reasonControl) {
            section1Controls.push(reasonControl);
        }

        // Section 2
        const section2Controls: IControl[] = [];

        // Area
        const areaControl = this._getSystemControl(
            layout,
            CoreFieldRefNames.AreaPath,
            WorkItemTrackingResources.AreaLabel,
            WellKnownControlNames.ClassificationControl,
            null);
        if (areaControl) {
            section2Controls.push(areaControl);
        }

        // Iteration
        const iterationControl = this._getSystemControl(
            layout,
            CoreFieldRefNames.IterationPath,
            WorkItemTrackingResources.IterationLabel,
            WellKnownControlNames.ClassificationControl,
            null);
        if (iterationControl) {
            section2Controls.push(iterationControl);
        }

        // 3. Build
        const headerPage: IPage = {
            label: "",
            id: "Header",
            visible: true,
            pageType: PageType.header,
            layoutMode: PageLayoutMode.firstColumnWide,
            inherited: false,
            locked: true,
            sections: [
                {
                    id: "Header-Section1",
                    groups: [this._getHeaderGroup("Header-Section1-Group1", section1Controls)]
                },
                {
                    id: "Header-Section2",
                    groups: [this._getHeaderGroup("Header-Section2-Group1", section2Controls)]
                }
            ]
        };

        layout.headerPage = headerPage;

        return WorkItemFormLayoutTransformationResult.LayoutChanged;
    }

    private _getHeaderGroup(id: string, controls: IControl[]): IGroup {
        return {
            id,
            label: "",
            controls: controls,
            visible: true,
            order: 1,
            inherited: false
        };
    }

    private _getSystemControl(layout: ILayout, fieldRefName: string, label: string, controlType: string, watermark: string): ILayoutControl {
        const systemControl = this._getServerOrDefaultSystemControl(layout, fieldRefName, label, controlType, watermark);

        // Apply hiding
        if (systemControl.visible === false) {
            // Control is permanently hidden, do not return
            return null;
        }

        const controlOptions = {
            ...systemControl.controlOptions,
            // Header controls should never get a chrome border, force it to false
            chromeBorder: false
        };

        return {
            ...systemControl,
            controlOptions
        };
    }

    private _getServerOrDefaultSystemControl(layout: ILayout, fieldRefName: string, label: string, controlType: string, watermark: string): ILayoutControl {
        let serverSentControl = first(layout.systemControls, c => equals(c.id, fieldRefName, true)) as ILayoutControl;

        if (!serverSentControl) {
            // Create default control
            serverSentControl = this._getDefaultSystemControl(fieldRefName, label, controlType, watermark);
        }

        // Apply replace
        const replacementControl = first(
            layout.systemControls,
            c => equals(c.replacesFieldReferenceName, fieldRefName, true)) as ILayoutControl;
        if (replacementControl) {
            return replacementControl;
        }

        return serverSentControl;
    }

    private _getDefaultSystemControl(fieldRefName: string, label: string, controlType: string, watermark: string): ILayoutControl {
        return {
            id: fieldRefName,
            controlType: controlType || WellKnownControlNames.FieldControl,
            metadata: null,
            order: -1,
            visible: true,
            hideLabel: false,
            readonly: false,
            inherited: true,
            watermark,
            label,
            controlOptions: {}
        };
    }
}
