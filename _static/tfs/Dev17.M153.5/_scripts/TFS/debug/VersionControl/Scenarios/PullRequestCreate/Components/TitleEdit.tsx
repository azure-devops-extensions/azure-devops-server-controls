import { Label } from "OfficeFabric/Label";
import { TextField } from "OfficeFabric/TextField";
import * as React from "react";
import * as Utils_String from "VSS/Utils/String";

import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

export interface TitleEditProps {
    title: string;
    onUpdate(title: string): void;
}

export class TitleEdit extends React.PureComponent<TitleEditProps, {}> {
    public render(): JSX.Element {
        const errorMessage = !this.props.title
            ? VCResources.PullRequest_Title_Edit
            : "";

        return <div className="vc-pullRequestCreate-title-container">
            <TextField
                autoFocus
                required
                label={VCResources.PullRequest_Title}
                onChanged={this.props.onUpdate}
                value={this.props.title}
                errorMessage={errorMessage}
                placeholder={VCResources.PullRequest_CreatePullRequestTitlePlaceholder}
            />
        </div>;
    }
}