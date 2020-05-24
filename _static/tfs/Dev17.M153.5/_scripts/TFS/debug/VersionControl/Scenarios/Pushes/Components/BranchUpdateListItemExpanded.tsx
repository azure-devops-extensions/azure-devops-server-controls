import * as React from "react";

import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { HistoryTabActionCreator } from "VersionControl/Scenarios/History/GitHistory/Actions/HistoryTabActionCreator";
import { HistoryTabStoresHub } from "VersionControl/Scenarios/History/GitHistory/Stores/HistoryTabStoresHub";
import { HistoryListContainer } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListContainer";
import { DefaultColumns } from "VersionControl/Scenarios/History/GitHistory/Components/HistoryListColumns";
import { BranchUpdateHistoryListLabel } from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { VersionSpec } from "VersionControl/Scripts/TFS.VersionControl.VersionSpecs";
import { getBranchFullName } from "VersionControl/Scripts/VersionSpecUtils";

export class HistoryListFlux implements IDisposable {
    constructor(
        public storesHub: HistoryTabStoresHub,
        public actionCreator: HistoryTabActionCreator,
        public isItemOpen: boolean = true,
    ) { }

    public dispose(): void {
        if (this.storesHub) {
            this.storesHub.dispose();
            this.storesHub = null;
        }
        this.actionCreator = null;
    }
}

export interface BranchUpdateListItemExpandedProps {
    id: string;
    repositoryContext: GitRepositoryContext;
    searchFilterItemVersion: VersionSpec;
    historyListFlux: HistoryListFlux;
}

export const BranchUpdateListItemExpanded = (props: BranchUpdateListItemExpandedProps): JSX.Element => {
    return (
        <div className={"branch-update-list-item-expanded"} id={props.id}>
            {props.historyListFlux &&
                <div
                    data-is-focusable={true}
                    aria-label={BranchUpdateHistoryListLabel}
                    role={"row"}>
                    <HistoryListContainer
                        actionCreator={props.historyListFlux.actionCreator}
                        repositoryContext={props.repositoryContext}
                        historyListStore={props.historyListFlux.storesHub.historyListStore}
                        currentBranchFullname={getBranchFullName(props.searchFilterItemVersion)}
                        headerVisible={false}
                        shouldDisplayError={true}
                        columns={DefaultColumns.BasicColumns} />
                </div>
            }
        </div>
    );
};
