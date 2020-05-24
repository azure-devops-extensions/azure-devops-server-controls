import * as React from "react";
import { StoresHub } from "VersionControl/Scenarios/PullRequestCreate/Stores/StoresHub";
import { PullRequestCreateActionCreator } from "VersionControl/Scenarios/PullRequestCreate/Actions/PullRequestCreateActionCreator";
import { LinkedWorkItemInfo, PullRequestProperties } from "VersionControl/Scenarios/PullRequestCreate/Stores/PullRequestPropertiesStore";
import { PageState } from "VersionControl/Scenarios/PullRequestCreate/Stores/PageStateStore";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { GitRepositoryContext } from "VersionControl/Scripts/GitRepositoryContext";
import { IInternalLinkedArtifactDisplayData  } from "Presentation/Scripts/TFS/Controls/LinkedArtifacts/Contracts";
import { IdentityRef } from "VSS/WebApi/Contracts";

import * as TFSTagService from "Presentation/Scripts/TFS/FeatureRef/TFS.TagService";
import * as TFSOMCommon from "Presentation/Scripts/TFS/TFS.OM.Common";
import { CreateButton } from "VersionControl/Scenarios/PullRequestCreate/Components/CreateButton";
import { DescriptionEdit } from "VersionControl/Scenarios/PullRequestCreate/Components/DescriptionEdit";
import { TitleEdit } from "VersionControl/Scenarios/PullRequestCreate/Components/TitleEdit";
import { ReviewersSelector } from "VersionControl/Scenarios/PullRequestCreate/Components/ReviewersSelector";
import { WorkItemsSelector } from "VersionControl/Scenarios/PullRequestCreate/Components/WorkItemsSelector";
import { LabelEditor } from "VersionControl/Scenarios/PullRequestCreate/Components/LabelEditor";
import { autobind } from "OfficeFabric/Utilities";

import * as Constants from "VersionControl/Scenarios/PullRequestCreate/Constants";
import { pullRequestLabelsKindId } from "VersionControl/Scenarios/Shared/Constants";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import * as Utils_String from "VSS/Utils/String";
import { WorkItemsHelper, LabelsHelper } from "VersionControl/Scenarios/PullRequestCreate/Helpers";

export interface PropertiesEditorContainerProps {
    storesHub: StoresHub;
    actionCreator: PullRequestCreateActionCreator;
}

export interface PropertiesEditorContainerState {
    pullRequestProperties: PullRequestProperties;
    pageState: PageState;
    templates: string[];
    defaultTemplatePath: string;
    hasBranches: boolean;
    tfsContext: TfsContext;
    draftIsEnabled: boolean;
}

export class PropertiesEditorContainer extends React.Component<PropertiesEditorContainerProps, PropertiesEditorContainerState> {
    constructor(props: PropertiesEditorContainerProps) {
        super(props);
        this.state = this._getStateFromStores();
    }

    public componentDidMount() {
        this.props.storesHub.propertiesStore.addChangedListener(this._onChange);
        this.props.storesHub.pageStateStore.addChangedListener(this._onChange);
        this.props.storesHub.branchesStore.addChangedListener(this._onChange);
        this.props.storesHub.contextStore.addChangedListener(this._onChange);
        this.props.storesHub.featureAvailabilityStore.addChangedListener(this._onChange);
        this.props.storesHub.templateStore.addChangedListener(this._onChange);
    }

    public componentWillUnmount() {
        this.props.storesHub.propertiesStore.removeChangedListener(this._onChange);
        this.props.storesHub.pageStateStore.removeChangedListener(this._onChange);
        this.props.storesHub.branchesStore.removeChangedListener(this._onChange);
        this.props.storesHub.contextStore.removeChangedListener(this._onChange);
        this.props.storesHub.featureAvailabilityStore.removeChangedListener(this._onChange);
        this.props.storesHub.templateStore.removeChangedListener(this._onChange);
    }

    private _onChange = () => {
        this.setState(this._getStateFromStores());
    }

    @autobind
    private _getStateFromStores(): PropertiesEditorContainerState {
        return {
            pullRequestProperties: this.props.storesHub.propertiesStore.state,
            pageState: this.props.storesHub.pageStateStore.state,
            templates: this.props.storesHub.templateStore.templateList,
            defaultTemplatePath: this.props.storesHub.templateStore.defaultTemplatePath,
            hasBranches: this.props.storesHub.branchesStore.hasBranches(),
            tfsContext: this.props.storesHub.contextStore.getTfsContext(),
            draftIsEnabled: this.props.storesHub.featureAvailabilityStore.getDraftPullRequestsIsEnabled(),
        };
    }

    public render(): JSX.Element {
        return <PropertiesEditor {...this.getComponentProps()} />;
    }

    public getComponentProps(): PropertiesEditorProps {
        return {
            pullRequestPropeties: this.state.pullRequestProperties,
            templates: this.state.templates,
            defaultTemplatePath: this.state.defaultTemplatePath,
            isValidationPending: this.state.pageState.isValidationPending,
            canCreate: canCreatePullRequest(this.state),
            tfsContext: this.state.tfsContext,
            onTitleUpdate: this.updateTitle,
            onDescriptionUpdate: this.updateDescription,
            onPasteCommitMessages: this.props.actionCreator.pasteCommitMessages,
            onPasteTemplate: this.props.actionCreator.pasteTemplate,
            labelsAvailable: this.props.storesHub.featureAvailabilityStore.getPullRequestLabelsFeatureIsEnabled(),
            addLabel: this.addLabel,
            removeLabel: this.removeLabel,
            beginGetSuggestedLabels: this.getSuggestedLabels,
            onReviewersUpdate: this.updateReviewers,
            addWorkItem: this.addWorkItem,
            removeWorkItem: this.removeWorkItem,
            removeAllWorkItems: this.removeAllWorkItems,
            containsWorkItem: this.containsWorkItem,
            draftIsEnabled: this.state.draftIsEnabled,
            onCreate: this.createPullRequest,
            onError: this.onError,
        };
    }

    @autobind
    private updateTitle(title: string): void {
        if (this.state.pullRequestProperties.title !== title) {
            this.props.actionCreator.updatePullRequestProperties({
                ...this.state.pullRequestProperties,
                title,
            });
        }
    }

    @autobind
    private updateDescription(description: string): void {
        if (this.state.pullRequestProperties.description !== description) {
            this.props.actionCreator.updatePullRequestProperties({
                ...this.state.pullRequestProperties,
                description,
            });
        }
    }

    @autobind
    private updateReviewers(reviewers: IdentityRef[]): void {
        if (this.state.pullRequestProperties.reviewers !== reviewers) {
            this.props.actionCreator.updatePullRequestProperties({
                ...this.state.pullRequestProperties,
                reviewers,
            });
        }
    }

    @autobind
    private updateWorkItems(workItems: LinkedWorkItemInfo[]): void {
        if (this.state.pullRequestProperties.workItemIds !== workItems) {
            this.props.actionCreator.updatePullRequestProperties({
                ...this.state.pullRequestProperties,
                workItemIds: workItems,
            });
        }
    }

    @autobind
    private addWorkItem(id: number): void {
        this.updateWorkItems(WorkItemsHelper.addWorkItem(this.state.pullRequestProperties.workItemIds, id));
    }

    @autobind
    private removeWorkItem(id: IInternalLinkedArtifactDisplayData ): void {
        this.updateWorkItems(WorkItemsHelper.removeWorkItem(this.state.pullRequestProperties.workItemIds, id));
    }

    @autobind
    private removeAllWorkItems(): void {
        this.updateWorkItems([]);
    }

    @autobind
    private containsWorkItem(id: number): boolean {
        return WorkItemsHelper.containsWorkItem(this.state.pullRequestProperties.workItemIds, id);
    }

    @autobind
    private updateLabels(newLabels: string[]): void {
        if (this.state.pullRequestProperties.labels !== newLabels) {
            this.props.actionCreator.updatePullRequestProperties({
                ...this.state.pullRequestProperties,
                labels: newLabels,
            });
        }
    }

    @autobind
    private addLabel(label: string): void {
        this.updateLabels(LabelsHelper.addLabel(this.state.pullRequestProperties.labels, label));
    }

    @autobind
    private removeLabel(label: string): void {
        this.updateLabels(LabelsHelper.removeLabel(this.state.pullRequestProperties.labels, label));
    }

    @autobind
    private getSuggestedLabels(callback: (tagNames: string[]) => void): void {
        const projectId = this.props.storesHub.contextStore.getRepositoryContext().getRepository().project.id;
        this.props.actionCreator.beginGetSuggestedLabels(projectId, callback);
    }

    @autobind
    private createPullRequest(event: React.SyntheticEvent<HTMLElement>, isDraft: boolean) {
        this.props.actionCreator.createPullRequest(event, isDraft);
    }

    private onError = (error: Error, component: string): void => {
        this.props.actionCreator.traceError(error, component);
    }
}

export function canCreatePullRequest(state: PropertiesEditorContainerState): boolean {
    const hasTitle = state.pullRequestProperties.title && state.pullRequestProperties.title.length;
    return hasTitle && state.hasBranches && !state.pageState.isValidationPending && !state.pageState.isCreationPending;
}

export interface PropertiesEditorProps {
    tfsContext: TfsContext;
    pullRequestPropeties: PullRequestProperties;
    templates: string[];
    defaultTemplatePath: string;
    canCreate: boolean;
    isValidationPending: boolean;
    addWorkItem(workItemId: number): void;
    containsWorkItem(workItemId: number): boolean;
    removeWorkItem(workItemId: IInternalLinkedArtifactDisplayData ): void;
    removeAllWorkItems(): void;
    addLabel(newLabel: string): void;
    removeLabel(newLabel: string): void;
    beginGetSuggestedLabels(callback: (tagNames: string[]) => void): void;
    labelsAvailable: boolean;
    onTitleUpdate(text: string): void;
    onDescriptionUpdate(text: string): void;
    onReviewersUpdate(reviewers: IdentityRef[]): void;
    onPasteCommitMessages(): void;
    onPasteTemplate(path: string): void;
    draftIsEnabled: boolean;
    onCreate(event: React.SyntheticEvent<any>, isDraft?: boolean): void;
    onError(error: Error, component: string): void;
}

// NOTE: Keep this regex in sync with the C# regex at
// ...\Git\Server\Services\PullRequest\TeamFoundationGitPullRequestService.Core.cs
const wipRegex = /^(\[WIP\]|WIP\s)/i;

export const PropertiesEditor = (props: PropertiesEditorProps) => {

    let draftIsDefault = false;
    if (props.draftIsEnabled) {
        draftIsDefault = wipRegex.test(props.pullRequestPropeties.title);
    }

    return <div className="vc-pullRequestCreate-panel"
            role="region"
            aria-label={VCResources.PullRequestCreate_EditFieldsRegionLabel}>
        <TitleEdit
            title={props.pullRequestPropeties.title}
            onUpdate={props.onTitleUpdate}
        />
        <LabelEditor
            labelsAvailable={props.labelsAvailable}
            labels={props.pullRequestPropeties.labels}
            addLabel={props.addLabel}
            removeLabel={props.removeLabel}
            beginGetSuggestedLabels={props.beginGetSuggestedLabels}
            onError={props.onError} />
        <DescriptionEdit
            description={props.pullRequestPropeties.description}
            canPasteCommitMessages={props.pullRequestPropeties.canPasteCommitMessages}
            templates={props.templates}
            defaultTemplatePath={props.defaultTemplatePath}
            onUpdate={props.onDescriptionUpdate}
            onPasteCommitMessages={props.onPasteCommitMessages}
            onPasteTemplate={props.onPasteTemplate}
        />
        <ReviewersSelector onIdentitiesUpdated={props.onReviewersUpdate}
            defaultReviewers={props.pullRequestPropeties.reviewers} />
        <WorkItemsSelector tfsContext={props.tfsContext}
            addWorkItem={props.addWorkItem}
            removeWorkItem={props.removeWorkItem}
            removeAllWorkItems={props.removeAllWorkItems}
            containsWorkItem={props.containsWorkItem}
            workItemIds={props.pullRequestPropeties.workItemIds.map(wi => wi.id)}
            validationMessage={props.pullRequestPropeties.workItemIds.length > Constants.DEFAULT_MAX_NUM_WORK_ITEMS_TO_LINK ?
                Utils_String.format(VCResources.PullRequest_NumWorkItemsLimitExceeded, Constants.DEFAULT_MAX_NUM_WORK_ITEMS_TO_LINK) : null} />
        <div className="vc-pullRequestCreate-createButton">
            <CreateButton
                onCreate={props.onCreate}
                isActive={props.canCreate}
                draftIsEnabled={props.draftIsEnabled}
                draftIsDefault={draftIsDefault}
            />
        </div>
    </div>;
};
