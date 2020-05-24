/// <reference types="react" />
/// <reference types="react-dom" />
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export function renderInto(container: HTMLElement, props: ChangesetVersionProps): void {
    ReactDOM.render(
        <ChangesetVersion {...props} />,
        container);
}

export interface ChangesetVersionProps {
    version: string;
    onShowLatestClick(): void;
}

/**
 * Presentational component for the Explorer current version of TFVC repository. Hidden if current version is Top.
 */
export const ChangesetVersion = (props: ChangesetVersionProps): JSX.Element =>
    (!props.version || props.version === "T")
        ? null
        : <div className="changeset-version">
            <span>{VCResources.Changeset + " " + props.version}</span>
            <a className="show-latest" href="#" onClick={props.onShowLatestClick}>
                {VCResources.ShowLatest}
            </a>
        </div>;
