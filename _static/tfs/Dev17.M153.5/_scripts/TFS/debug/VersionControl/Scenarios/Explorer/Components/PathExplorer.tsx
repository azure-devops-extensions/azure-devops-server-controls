import * as React from "react";
import * as VCContainer from "VersionControl/Scenarios/Explorer/Components/Container";
import { StateMappedPathExplorer } from "VersionControl/Scenarios/Shared/Path/PathExplorerContainer";

export const PathExplorerContainer = VCContainer.create(
    ["path", "pathSearch"],
    ({ isGit, pathState, pathSearchState }, { actionCreator }) =>
        <StateMappedPathExplorer
            pathState={pathState}
            pathSearchState={isGit && pathSearchState}
            onEditingStart={actionCreator.startPathEditing}
            onInputTextEdit={actionCreator.editPathText}
            onPathChange={actionCreator.changePath}
            onEditingCancel={actionCreator.cancelPathEditing}
            onSearchItemSelection={actionCreator.selectPathSearchItem}
        />);
