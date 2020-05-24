import * as React from "react";
import * as _VCRepositoryContext from "VersionControl/Scripts/RepositoryContext";
import * as _CodeContracts from "Search/Scenarios/WebApi/Code.Contracts"
import * as _TfvcHistoryContainer from "Search/Scenarios/Code/Components/TfvcHistoryContainer";
import * as _GitHistoryContainer from "Search/Scenarios/Code/Components/GitHistoryContainer";
import { getAsyncLoadedComponent } from "VSS/Flux/AsyncLoadedComponent";
import { isTfvcType, isGitType } from "Search/Scenarios/Code/Utils";


export interface HistoryContainerProps {
    repoContext: _VCRepositoryContext.RepositoryContext;

    filePath: string;

    changeId: string;

    branch: string;

    vcType: _CodeContracts.VersionControlType;

    onScenarioComplete?: (splitTimingName?: string) => void;
}

export const HistoryContainer: React.StatelessComponent<HistoryContainerProps> = (props: HistoryContainerProps) => {
    const { repoContext, onScenarioComplete, changeId, filePath, branch } = props;
    return (
        repoContext
            ? <div className="search-History">
                {
                    isTfvcType(props.vcType) &&
                    <TfvcHistoryContainerAsync
                        changeId={changeId}
                        filePath={filePath}
                        onScenarioComplete={onScenarioComplete}
                        repoContext={repoContext} />
                }
                {
                    isGitType(props.vcType) &&
                    <GitHistoryContainerAsync
                        repoContext={repoContext}
                        filePath={filePath}
                        onScenarioComplete={onScenarioComplete}
                        branch={branch} />
                }
            </div>
            : null
    );
}

const TfvcHistoryContainerAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/Code/Components/TfvcHistoryContainer"],
    (tfvcHistoryContainer: typeof _TfvcHistoryContainer) => tfvcHistoryContainer.TfvcHistoryContainer);
const GitHistoryContainerAsync = getAsyncLoadedComponent(
    ["Search/Scenarios/Code/Components/GitHistoryContainer"],
    (gitHistoryContainer: typeof _GitHistoryContainer) => gitHistoryContainer.GitHistoryContainer);