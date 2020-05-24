/// <reference types="react" />
import * as React from "react";
import * as VCContainer from "VersionControl/Scenarios/Explorer/Components/Container";
import { CompareState } from  "VersionControl/Scenarios/Explorer/Stores/CompareStore";
import { DiffViewer } from "VersionControl/Scenarios/Shared/FileViewers/DiffViewer";
import { DiffViewerOrientation } from "VersionControl/Scripts/Generated/TFS.VersionControl.WebAccess.Contracts";
import { ItemModel } from "VersionControl/Scripts/Generated/TFS.VersionControl.Legacy.Contracts";
import { RepositoryContext } from "VersionControl/Scripts/RepositoryContext";

export interface CompareCommonProps {
    className: string;
    isVisible: boolean;
    item: ItemModel;
}

export type CompareContainerProps = VCContainer.ContainerProps & CompareCommonProps;

export const CompareContainer = VCContainer.create<CompareContainerProps>(
    ["compare", "context"],
    ({ compareState, repositoryContext }, { actionCreator, className, isVisible, item }) =>
        <Compare
            className={className}
            isVisible={isVisible}
            item={item}
            repositoryContext={repositoryContext}
            onContentRendered={actionCreator.notifyContentRendered}
            onDiffLinesChanged={actionCreator.loadDiffLines}
            onVersionPicked={actionCreator.notifyCompareVersionPicked}
            {...compareState}
            />);

interface CompareProps extends CompareCommonProps, CompareState {
    repositoryContext: RepositoryContext;
    onContentRendered(): void;
    onDiffLinesChanged(diffLines: number[]): void;
    onVersionPicked(version: string, isOriginalSide: boolean): void;
}

const Compare = (props: CompareProps): JSX.Element =>
    <DiffViewer
        className="compare-tab"
        isVisible= {props.isVisible}
        hideActionsToolbar={true}
        hideVersionSelector={true}
        rightAlignVersionSelectorDropDown={false}
        hideComments={true}
        disableDownloadFile={true}
        hideFileName={true}
        item={props.item}
        oversion={props.oversion}
        mversion={props.mversion}
        opath={props.opath}
        mpath={props.mpath}
        discussionManager={undefined}
        repositoryContext={props.repositoryContext}
        orientation={props.isDiffInline ? DiffViewerOrientation.Inline : DiffViewerOrientation.SideBySide}
        desiredLine={props.diffLines[props.currentDiffIndex]}
        onError={undefined}
        onLoadComplete={props.onContentRendered}
        onDiffLinesChanged={props.onDiffLinesChanged}
        onVersionPicked={props.onVersionPicked}
        onOrientationChange={undefined}
        />;
