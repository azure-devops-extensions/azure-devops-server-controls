import * as React from "react";
import * as _VCLegacyContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import * as _VCRepositoryContext from "VersionControl/Scripts/RepositoryContext";
import * as Container from "Search/Scenarios/Code/Components/Container";
import * as VCContracts from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { CodeResult } from "Search/Scenarios/WebApi/Code.Contracts";
import { DiffViewer } from "VersionControl/Scenarios/Shared/FileViewers/DiffViewer";

export interface CompareContainerProps extends Container.ContainerProps {
    isVisible: boolean;

    itemModel: _VCLegacyContracts.ItemModel;

    repositoryContext: _VCRepositoryContext.RepositoryContext;

    selectedItem: CodeResult;
}

export const CompareContainer = Container.create<CompareContainerProps>(
    ["compareStore"],
    ({ compareState }, props) => {
        const { repositoryContext, itemModel, selectedItem, actionCreator } = props;

        return repositoryContext
            ? <DiffViewer
                className="search-Compare"
                isVisible={props.isVisible}
                hideActionsToolbar={false}
                hideVersionSelector={false}
                rightAlignVersionSelectorDropDown={false}
                hideComments={true}
                disableDownloadFile={true}
                hideFileName={true}
                item={itemModel}
                oversion={compareState.oversion}
                mversion={compareState.mversion}
                opath={selectedItem.path}
                mpath={selectedItem.path}
                discussionManager={undefined}
                repositoryContext={repositoryContext}
                orientation={compareState.isDiffInline ? VCContracts.DiffViewerOrientation.Inline : VCContracts.DiffViewerOrientation.SideBySide}
                desiredLine={compareState.diffLines[compareState.currentDiffIndex]}
                onError={actionCreator.onPreviewLoadFailed}
                onLoadComplete={actionCreator.onPreviewLoaded}
                onDiffLinesChanged={actionCreator.onDiffLinesChanged}
                onVersionPicked={actionCreator.onCompareVersionPicked}
                onOrientationChange={() => { }} />
            : null
    })