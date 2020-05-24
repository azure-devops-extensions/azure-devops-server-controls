import { IMenuItemSpec } from "VSS/Controls/Menus";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { IChangeDetailsPropsBase } from "VersionControl/Scenarios/ChangeDetails/IChangeDetailsPropsBase";
import { Filter } from "VersionControl/Scripts/Controls/ChangeListSummaryControlFilter";
import { ChangeList } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { ChangeExplorerGridDisplayMode } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";
import { LatestVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export interface IDiffSummaryPropsBase extends IChangeDetailsPropsBase {
    tfsContext: TfsContext;
    repositoryContext: RepositoryContext;
    originalChangeList: ChangeList;
    versionSpec: LatestVersionSpec;
    summaryFilter?: Filter;
    isVisible: boolean;
    displayMode: ChangeExplorerGridDisplayMode;
    additionalMenuItems?: IMenuItemSpec[];
    maxDiffsToShow?: number;
    resetSummaryView: boolean;
    changeList: ChangeList;
    hideArtifactLevelDiscussion: boolean;
}
