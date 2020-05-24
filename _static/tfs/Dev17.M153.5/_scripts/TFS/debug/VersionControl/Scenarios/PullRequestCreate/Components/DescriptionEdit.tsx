import { ActionButton } from "OfficeFabric/Button";
import { DirectionalHint } from "OfficeFabric/common/DirectionalHint";
import { Label } from "OfficeFabric/Label";
import { TextField } from "OfficeFabric/TextField";
import { TooltipHost } from "VSSUI/Tooltip";
import * as React from "react";

import { MarkdownInputWidget } from "Discussion/Scripts/Components/MarkdownInputWidget/MarkdownInputWidget";
import { RenderedContent } from "Discussion/Scripts/Components/RenderedContent/RenderedContent";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import "VSS/LoaderPlugins/Css!VersionControl/DescriptionEdit";
import { DropdownButton } from "VersionControl/Scenarios/Shared/DropdownButton";
import { ICalloutProps } from 'OfficeFabric/Callout';
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import * as ServerConstants from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";

export interface DescriptionEditProps {
    description: string;
    templates: string[];
    defaultTemplatePath: string;
    canPasteCommitMessages: boolean;
    onUpdate(text: string): void;
    onPasteCommitMessages(): void;
    onPasteTemplate(path: string): void;
}

export class DescriptionEdit extends React.PureComponent<DescriptionEditProps, {}> {
    private _getItems(defaultTemplatePath: string, templateList: string[]) {
        var _this = this;
        var items: IContextualMenuItem[] = [];
        if(defaultTemplatePath) {
            items.push({
                key: defaultTemplatePath,
                name: defaultTemplatePath.substring(defaultTemplatePath.lastIndexOf('/') + 1),
                secondaryText: VCResources.PullRequest_CreateDefaultTemplate,
                onClick: () => _this.props.onPasteTemplate(defaultTemplatePath),
            });
        }
        if(templateList) {
            templateList.forEach(template => {
                items.push({
                    key: template,
                    name: template.substring(template.lastIndexOf('/') + 1),
                    onClick: () => _this.props.onPasteTemplate(template),
                })
            });
        }
        return items;
    }
    public render(): JSX.Element {
        const rightSideButton =
            this.props.canPasteCommitMessages &&
            <TooltipHost
                content={VCResources.PullRequest_CreatePullRequestPasteCommitMessagesDescription}
                directionalHint={DirectionalHint.topCenter}>
                <ActionButton iconProps={{ iconName: "Paste" }} onClick={this.props.onPasteCommitMessages}>
                    {VCResources.PullRequest_CreatePullRequestPasteCommitMessages}
                </ActionButton>
            </TooltipHost>;
        
        const templateButton =
            FeatureAvailabilityService.isFeatureEnabled(
                ServerConstants.FeatureAvailabilityFlags.WebAccessVersionControlPullRequestsTemplates, false
            ) && (this.props.templates && this.props.templates.length > 0 || this.props.defaultTemplatePath) &&
            <DropdownButton
                className="templates-picker-dropdown--action"
                items={this._getItems(this.props.defaultTemplatePath, this.props.templates)}
                title={VCResources.PullRequest_CreatePullRequestPasteTemplate}
                text={VCResources.PullRequest_CreatePullRequestPasteTemplate}
                directionalHint={DirectionalHint.bottomLeftEdge}
                calloutProps={{
                    calloutMaxHeight: 325, 
                    className: "templates-picker-items"
                } as ICalloutProps}/>

        const buttonArea = <span className="discussion-edit-buttonarea">
            {rightSideButton}
            {templateButton}
        </span>;

        return <div className="vc-pullRequestCreate-description-container">
            <Label htmlFor="description-edit"
                id="description-edit-label"
                className="vc-pullRequestCreate-label">{VCResources.PullRequest_Description}</Label>
            <MarkdownInputWidget
                className="description-edit"
                id="description-edit"
                artifactUri="newPullRequest"
                value={this.props.description}
                enableAttachments={false}
                onTextChange={this.props.onUpdate}
                placeholder={VCResources.PullRequest_DescriptionPlaceHolder}
                minHeight={100}
                maxHeight={500}
                aria-describedby="description-edit-helper"
                buttonArea={buttonArea}
            />
            <div id="description-edit-helper" className="hidden">{VCResources.PullRequestCreate_DescriptionHelperText}</div>
            <RenderedContent content={this.props.description} />
        </div>;
    }
}
