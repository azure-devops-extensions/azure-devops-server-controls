/// <reference types="react" />

import "VSS/LoaderPlugins/Css!fabric";
import "VSS/LoaderPlugins/Css!WorkCustomization/Views/Processes/Components/ProcessesPivot";

import * as React from "react";
import { Fabric } from "OfficeFabric/Fabric";
import { CommandBar, ICommandBarProps } from "OfficeFabric/CommandBar";
import { IContextualMenuItem } from "OfficeFabric/components/ContextualMenu/ContextualMenu.types";
import { commandBarIcon } from "VSSPreview/OfficeFabric/Helpers";
import { IIconProps, IconType } from "OfficeFabric/Icon";
import { css } from "OfficeFabric/Utilities";
import { Component, Props, State } from "VSS/Flux/Component";
import { DialogManager } from "WorkCustomization/Scripts/Dialogs/Components/DialogManager";
import * as DialogActions from "WorkCustomization/Scripts/Dialogs/Actions/DialogActions";
import { ProcessesGrid } from "WorkCustomization/Scripts/Views/Processes/Components/ProcessesGrid";
import { ProcessNavBreadCrumb } from "WorkCustomization/Scripts/Common/Components/ProcessNavBreadCrumb";
import { UrlUtils } from "WorkCustomization/Scripts/Utils/UrlUtils";
import { contextualMenuIcon } from "VSSPreview/OfficeFabric/Helpers";
import Resources = require("WorkCustomization/Scripts/Resources/TFS.Resources.WorkCustomization");
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as VSSContext from "VSS/Context";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";

export interface IProcessesPivotProps extends Props {
    initialSelectedProcessName?: string;
}

const isHosted = VSSContext.getPageContext().webAccessConfiguration.isHosted;

export class ProcessesPivot extends Component<IProcessesPivotProps, State> {
    render(): JSX.Element {
        let commandBar: JSX.Element = null;

        const isXmlCustomizationEnabled = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessProcessUpload);
        const isXmlTemplateProcessEnabled = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebAccessXmlTemplateProcess);
        const isWebaccessProcessHierarchyEnabled = FeatureAvailabilityService.isFeatureEnabled(FeatureAvailabilityFlags.WebaccessProcessHierarchy);

        // Show the button if XML Process Customization (aka Phase1) enabled OR Process Template Editor enabled (which is onprem with no Inherited process enabled)
        if (isXmlCustomizationEnabled || (isXmlTemplateProcessEnabled && !isWebaccessProcessHierarchyEnabled)) {
            let items: IContextualMenuItem[] = [];

            items.push({
                key: "IMPORT_PROCESS",
                name: isXmlCustomizationEnabled ? Resources.ImportProcessButtonText : Resources.UploadProcessButtonText,
                iconProps: contextualMenuIcon("bowtie-math-plus-light"),
                onClick: (ev?: React.MouseEvent<HTMLElement>, item?) => {
                    DialogActions.setDialogAction.invoke({ dialogType: DialogActions.DialogType.ImportProcess, data: null });
                }
            });

            commandBar = <CommandBar items={items} className="flex-fixed" />;
        }

        return (
            <Fabric className="work-hub-content process-list-page-container">
                {commandBar}
                <ProcessesGrid gridContainerClassName={css("process-grid-container", { "on-prem": !isHosted })}
                    initialSelectedProcessName={this.props.initialSelectedProcessName} />
            </Fabric>
        );
    }
}