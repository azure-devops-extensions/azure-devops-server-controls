import * as React from "react";
import * as ReactDOM from "react-dom";

import * as SDK_Shim from "VSS/SDK/Shim";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { ChangeListSearchCriteria } from "TFS/VersionControl/Contracts";
import { ITfvcHistoryListOptions } from "TFS/VersionControl/Controls";
import {TfvcRepositoryContext} from "VersionControl/Scripts/TfvcRepositoryContext";
import { TfvcHistoryViewerProps, TfvcHistoryViewer } from "VersionControl/Scenarios/Shared/TfvcHistoryViewer";

SDK_Shim.registerContent("tfs.versioncontrol.tfvc-history-list", (context: SDK_Shim.InternalContentContextData): IDisposable => {
    const historyListParams: ITfvcHistoryListOptions = context.options;
    const multipleItemPaths = historyListParams.itemPaths;

    const tfvcSearchCriteria = {} as ChangeListSearchCriteria;
    // If itemPaths of searchCriteria is filled then this takes precedence.
    if (multipleItemPaths && multipleItemPaths.length > 0) {
        tfvcSearchCriteria.itemPaths = multipleItemPaths;
    }
    else {
        tfvcSearchCriteria.itemPaths = [];
    }

    tfvcSearchCriteria.fromVersion = historyListParams.fromVersion || "";

    tfvcSearchCriteria.toVersion = historyListParams.toVersion || "";

    const tfsContext = TfsContext.getDefault();
    const tfvcRepositoryContext = TfvcRepositoryContext.create(tfsContext);

    const tfvcHistoryViewerProps: TfvcHistoryViewerProps = {
        searchCriteria: tfvcSearchCriteria,
        repositoryContext: tfvcRepositoryContext,
        onScenarioComplete: historyListParams.onScenarioComplete,
    };

    ReactDOM.render(
        <TfvcHistoryViewer {...tfvcHistoryViewerProps} />,
        context.$container[0]);

    const disposable: IDisposable = {
        dispose: (): void => {
            ReactDOM.unmountComponentAtNode(context.$container[0]);
        }
    };

    return disposable;
});