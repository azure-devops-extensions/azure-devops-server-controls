/// <reference types="react" />
import * as React from "react";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { getParentPaths } from "VersionControl/Scripts/VersionControlPath";
import * as VCContainer from  "VersionControl/Scenarios/Explorer/Components/Container";

const uiSourceErrorContent = "not-found-error-page";

export const ErrorContentContainer = VCContainer.create(
    ["itemContent", "knownItems", "version"],
    ({ itemContentState, knownItemsState, versionState }, { actionCreator }) => {
        const lastKnownParent = getLastKnownParent(itemContentState.path, knownItemsState.knownItems);
        return (
            <ErrorContent
                errorMessage={itemContentState.notFoundErrorMessage}
                parentPath={lastKnownParent}
                isVersionValid={!isEmptyObject(knownItemsState.knownItems)}
                isDefaultVersion={versionState.isDefaultBranch}
                onGoRootClick={() => actionCreator.goRoot(uiSourceErrorContent)}
                onGoParentClick={() => actionCreator.changePath(lastKnownParent, undefined, uiSourceErrorContent)}
                onGoToDefaultBranch={() => knownItemsState.isGit ? actionCreator.goToDefaultBranch(uiSourceErrorContent) : actionCreator.goLatestChangeset(uiSourceErrorContent)}
                />);
    });

function getLastKnownParent(path: string, knownItems: IDictionaryStringTo<any>): string {
    const parentsExceptRoot = getParentPaths(path).slice(0, -1);

    for (const parent of parentsExceptRoot) {
        if (knownItems[parent]) {
            return parent;
        }
    }
}

function isEmptyObject(object: any): boolean {
    return Object.getOwnPropertyNames(object).length === 0;
}

interface ErrorContentProps {
    errorMessage: string;
    parentPath: string;
    isVersionValid: boolean;
    isDefaultVersion: boolean;
    onGoRootClick(): void;
    onGoParentClick(): void;
    onGoToDefaultBranch(): void;
}

const ErrorContent = (props: ErrorContentProps): JSX.Element =>
    <div className="vc-error-tab absolute-full">
        <MessageBar messageBarType={MessageBarType.error} isMultiline={true}>
            {props.errorMessage}
        </MessageBar>
        <ul>
            {
                props.isVersionValid &&
                <li>
                    <a onClick={props.onGoRootClick}>{VCResources.GoToRepositoryRoot}</a>
                </li>
            }
            {
                props.parentPath &&
                <li>
                    {VCResources.GoToParent + " "}
                    <a onClick={props.onGoParentClick}>{props.parentPath}</a>
                </li>
            }
            {
                !props.isDefaultVersion &&
                <li>
                    <a onClick={props.onGoToDefaultBranch}>{VCResources.GoToDefaultBranch}</a>
                </li>
            }
        </ul>
    </div>;
