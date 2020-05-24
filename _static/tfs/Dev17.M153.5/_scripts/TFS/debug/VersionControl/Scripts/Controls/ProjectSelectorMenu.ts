import * as Controls from "VSS/Controls";
import * as VSS from "VSS/VSS";

import * as TFS_Core_Contracts from "TFS/Core/Contracts";

import * as TFS_FilteredListControl from "Presentation/Scripts/TFS/FeatureRef/FilteredListControl";
import * as TFS_FilteredListDropdownMenu from "Presentation/Scripts/TFS/FeatureRef/FilteredListDropdownMenu";
import * as TFS_Host_TfsContext from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

import { ProjectSelectorControl, ProjectSelectorControlOptions } from "VersionControl/Scripts/Controls/ProjectSelectorControl";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import TfsContext = TFS_Host_TfsContext.TfsContext;

export interface ProjectSelectorMenuOptions extends TFS_FilteredListDropdownMenu.IFilteredListDropdownMenuOptions {
    tfsContext?: TfsContext;
    initialProjects?: TFS_Core_Contracts.TeamProjectReference[];
    showItemIcons?: boolean;
}

export class ProjectSelectorMenu extends TFS_FilteredListDropdownMenu.FilteredListDropdownMenu {
    public initializeOptions(options?: any) {
        super.initializeOptions($.extend({
            popupOptions: {
                elementAlign: "left-top",
                baseAlign: "left-bottom",
            },
            chevronClass: "bowtie-chevron-down-light",
            ariaDescribedByText: VCResources.ProjectSelectorAriaDescription,
            setMaxHeightToFitWindow: true,
        }, options));
    }

    public initialize() {
        super.initialize();

        this._element.addClass("vc-project-selector-menu");

        this._getPopupEnhancement()._bind("action-item-clicked", () => {
            this._hidePopup();
        });

        // ARIA attributes.  Because of the complexity of the control, consider this a button that shows a dialog.
        this._element.attr("role") || this._element.attr("role", "button");
        this._getPopupEnhancement().getElement().attr("role", "dialog");
    }

    public _createFilteredList($container: JQuery): TFS_FilteredListControl.FilteredListControl {
        return Controls.Enhancement.enhance
            (ProjectSelectorControl, $container, {
                tfsContext: this._options.tfsContext,
                initialProjects: this._options.initialProjects,
                showItemIcons: true,
                tabNames: this._options.tabNames
            } as ProjectSelectorControlOptions) as ProjectSelectorControl;
    }

    public _getItemIconClass(item: any): string {
        return "bowtie-icon bowtie-briefcase";
    }

    protected _getItemIconAriaLabel(item: any): string {
        return VCResources.ProjectSelectorItemAriaLabel;
    }

    public _getItemDisplayText(item: any): string {
        if (item) {
            return item.name;
        }
        else {
            return "";
        }
    }

    public _getItemTooltip(item: any): string {
        return this._getItemDisplayText(item);
    }

    public getSelectedProject(): TFS_Core_Contracts.TeamProjectReference {
        return this._getSelectedItem() as TFS_Core_Contracts.TeamProjectReference;
    }

    public setSelectedProject(project: TFS_Core_Contracts.TeamProjectReference) {
        this.setSelectedItem(project);
    }
}

VSS.classExtend(ProjectSelectorMenu, TfsContext.ControlExtensions);