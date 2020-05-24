import * as React from "react";
import * as _VCRepositoryContext from "VersionControl/Scripts/RepositoryContext";
import * as _VCContracts from "TFS/VersionControl/Contracts";
import { TfvcHistoryViewerProps, TfvcHistoryViewer } from "VersionControl/Scenarios/Shared/TfvcHistoryViewer";
import { ChangesetVersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";

export interface TfvcHistoryContainerProps {
    filePath: string;

    changeId: string;

    repoContext: _VCRepositoryContext.RepositoryContext;

    onScenarioComplete?: (splitTimingName?: string) => void;
}

export const TfvcHistoryContainer: React.StatelessComponent<TfvcHistoryContainerProps> = (props: TfvcHistoryContainerProps) => {
    return (
        <TfvcHistoryViewer {...getTfvcHistoryViewerProps(props) } />);
}

function getTfvcHistoryViewerProps(props: TfvcHistoryContainerProps): TfvcHistoryViewerProps {
    const { filePath, changeId, repoContext, onScenarioComplete } = props,
        itemPath = filePath ? filePath : repoContext.getRootPath(),
        itemVersion = new ChangesetVersionSpec(props.changeId).toVersionString();

    const searchCriteria = { itemPath, itemVersion } as _VCContracts.ChangeListSearchCriteria

    return {
        searchCriteria,
        repositoryContext: repoContext,
        showFilters: true,
        onScenarioComplete
    };
}