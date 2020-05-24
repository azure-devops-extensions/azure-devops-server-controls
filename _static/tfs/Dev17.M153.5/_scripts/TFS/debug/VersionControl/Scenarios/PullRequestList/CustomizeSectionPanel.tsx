import "VSS/LoaderPlugins/Css!VersionControl/CustomizeSectionPanel";

import * as React from "react";
import { Panel, PanelType } from 'OfficeFabric/Panel';
import { TextField } from "OfficeFabric/TextField";
import { PrimaryButton, DefaultButton, IconButton } from "OfficeFabric/Button";
import { autobind, css, DelayedRender } from "OfficeFabric/Utilities";
import { AnimationClassNames } from "OfficeFabric/Styling";
import { IdentityPickerSearch } from "Presentation/Scripts/TFS/Components/IdentityPickerSearch";
import { IEntity } from "VSS/Identities/Picker/RestClient";
import { Label } from "OfficeFabric/Label";
import { ComboBox, IComboBoxOption } from "OfficeFabric/ComboBox";
import { IdentityPickerControlSize } from "VSS/Identities/Picker/Controls";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";
import { PullRequestListQueryCriteria, CustomizeSectionName } from "VersionControl/Scenarios/PullRequestList/PullRequestListQueryCriteria";
import { PullRequestStatus } from "TFS/VersionControl/Contracts";
import * as Utils_String from "VSS/Utils/String";
import * as Utils_Array from "VSS/Utils/Array";
import { TelemetryEventData, publishEvent } from "VSS/Telemetry/Services";
import * as CustomerIntelligenceConstants from "VersionControl/Scripts/CustomerIntelligenceConstants";

export interface ICustomizeSectionPanelProps {
    sectionCriteria: PullRequestListQueryCriteria;
    sectionId: string;
    withDefaults?: boolean;
    onUpdateSectionCriteria(sectionId: string, sectionCriteria: PullRequestListQueryCriteria): void;
    onDismiss(): void;
    telemetryEntryPoint: string;
}

export interface ICustomizeSectionPanelState {
    title?: string;
    reviewerIds?: string[];
    authorIds?: string[];
    status?: PullRequestStatus;
}

const CUSTOM_TITLE_MAX_LENGTH = 256;
export const CUSTOM_MAX_PEOPLE = 20;

export class CustomizeSectionPanel extends React.PureComponent<ICustomizeSectionPanelProps, ICustomizeSectionPanelState> {
    private _startingState: ICustomizeSectionPanelState;

    constructor(props: ICustomizeSectionPanelProps) {
        super(props);

        this._setStartingState(props);
        this.state = this._startingState;
    }

    public render(): JSX.Element {
        return <Panel
                className={"vc-pullRequest-list-customize-panel"} 
                isOpen={true}
                type={PanelType.medium}
                headerText={VCResources.PullRequestListCustomSectionConfigureTitle}
                onRenderFooterContent={this._renderPanelFooter}
                closeButtonAriaLabel={VCResources.PullRequestListCustomSectionCancel}
                focusTrapZoneProps={{ ignoreExternalFocusing: true }}
                isFooterAtBottom={true}
                onDismissed={this.props.onDismiss}
                >
                    <div className={"vc-pullRequest-list-customize-instructions-part1"}>{VCResources.PullRequestListCustomSectionConfigureDescription}</div>

                    <TextField label={VCResources.PullRequestListCustomTitleLabel} 
                                required={true} 
                                value={this.state.title} 
                                onChanged={this._setTitle}
                                errorMessage={this.state.title.length > CUSTOM_TITLE_MAX_LENGTH && Utils_String.format(VCResources.PullRequestListCustomTitleLengthError, CUSTOM_TITLE_MAX_LENGTH)}
                                />

                    <ComboBox selectedKey={this.state.status} 
                        label={VCResources.PullRequestListCustomStatusLabel} 
                        allowFreeform={false} 
                        options={this._statusOptions()}
                        onChanged={this._onStatusChange}
                        useComboBoxAsMenuWidth={true}
                        />

                    <Label htmlFor="vc-pullRequestList-custom-section-authors-edit">{VCResources.PullRequestListFilterCreatorPlaceholder}</Label>
                    <IdentityPickerSearch className="vc-pullRequestList-author-selector"
                        consumerId={"vc-pullRequestList-custom-section"}
                        focusOnLoad={false}
                        showMruOnClick={true}
                        identitiesUpdated={this._setAuthors}
                        inlineSelectedEntities={true}
                        multiIdentitySearch={true}
                        defaultEntities={this.state.authorIds}
                        controlSize={IdentityPickerControlSize.Medium}
                        id={"vc-pullRequestList-custom-section-authors-edit"}
                        preDropdownRender={this._filterUnresolvedIdentities}
                        includeGroups={false}
                        />

                    { (this.state.authorIds || []).length > CUSTOM_MAX_PEOPLE && 
                        <DelayedRender>
                            <span aria-live='assertive' className={css("vc-pullRequestList-errormessage", AnimationClassNames.slideDownIn20)} data-automation-id='error-message'>
                                { Utils_String.format(VCResources.PullRequestListPeopleLengthError, CUSTOM_MAX_PEOPLE) }
                            </span>
                        </DelayedRender>
                    }

                    <Label htmlFor="vc-pullRequestList-custom-section-reviewers-edit">{VCResources.PullRequestListFilterReviewerPlaceholder}</Label>
                    <IdentityPickerSearch className="vc-pullRequestList-reviewers-selector"
                        consumerId={"vc-pullRequestList-custom-section"}
                        focusOnLoad={false}
                        showMruOnClick={true}
                        identitiesUpdated={this._setReviewers}
                        inlineSelectedEntities={true}
                        multiIdentitySearch={true}
                        defaultEntities={this.state.reviewerIds}
                        controlSize={IdentityPickerControlSize.Medium}
                        id={"vc-pullRequestList-custom-section-reviewers-edit"}
                        preDropdownRender={this._filterUnresolvedIdentities}
                        />

                    { (this.state.reviewerIds || []).length > CUSTOM_MAX_PEOPLE && 
                        <DelayedRender>
                            <span aria-live='assertive' className={css("vc-pullRequestList-errormessage", AnimationClassNames.slideDownIn20)} data-automation-id='error-message'>
                                { Utils_String.format(VCResources.PullRequestListPeopleLengthError, CUSTOM_MAX_PEOPLE) }
                            </span>
                        </DelayedRender>
                    }

            </Panel>;
    }

    /**
     * Snapshot initial criteria when beginning customization, so we can check modified.
     */
    private _setStartingState(nextProps: ICustomizeSectionPanelProps) {
        this._startingState = {
            title: nextProps.sectionCriteria.criteriaTitle,
            authorIds: nextProps.sectionCriteria.customSectionAuthorIds || [],
            reviewerIds: nextProps.sectionCriteria.customSectionReviewerIds || [],
            status: nextProps.sectionCriteria.status,
        };
    }

    private _statusOptions(): IComboBoxOption[] {
        return [
            { key: PullRequestStatus.All, text: VCResources.PullRequest_Filter_AllPullRequests},
            { key: PullRequestStatus.Active, text: VCResources.PullRequest_PullRequestDetailsStatusActive},
            { key: PullRequestStatus.Completed, text: VCResources.PullRequest_PullRequestDetailsStatusCompleted},
            { key: PullRequestStatus.Abandoned, text: VCResources.PullRequest_PullRequestDetailsStatusAbandoned}
        ];
    }

    @autobind
    private _saveCustomizations(): void {

        let { title, reviewerIds, authorIds, status } = this.state;

        let criteriaClone = new PullRequestListQueryCriteria(status,
            authorIds,
            reviewerIds,
            title,
            this.props.sectionCriteria.clientFilter,
            this.props.sectionCriteria.telemetryGroupName,
            CustomizeSectionName);
        
        let changedStatus = status !== this._startingState.status;
        let authorAdditionsCount = authorIds.filter(id => this._startingState.authorIds.indexOf(id) < 0).length;
        let authorDeletionsCount = this._startingState.authorIds.filter(id => authorIds.indexOf(id) < 0).length;
        let reviewerAdditionsCount = reviewerIds.filter(id => this._startingState.reviewerIds.indexOf(id) < 0).length;
        let reviewerDeletionsCount = this._startingState.reviewerIds.filter(id => reviewerIds.indexOf(id) < 0).length;

        let telemEvent = new TelemetryEventData(
            CustomerIntelligenceConstants.VERSION_CONTROL_AREA,
            CustomerIntelligenceConstants.PULL_REQUESTS_LIST_CUSTOMIZE, {
                entryPoint: this.props.telemetryEntryPoint,
                changedStatus,
                authorAdditionsCount,
                authorDeletionsCount,
                reviewerAdditionsCount,
                reviewerDeletionsCount,
                status,
                authorCount: authorIds.length,
                reviewerCount: reviewerIds.length
            });
        publishEvent(telemEvent);

        this.props.onUpdateSectionCriteria(this.props.sectionId, criteriaClone);
        this.props.onDismiss();
    }

    @autobind
    private _renderPanelFooter(): JSX.Element {
        let nothingChanged = this.state.status === this._startingState.status &&
                             this.state.title === this._startingState.title &&
                             Utils_Array.arrayEquals(this.state.authorIds, this._startingState.authorIds, (a, b) => a === b) &&
                             Utils_Array.arrayEquals(this.state.reviewerIds, this._startingState.reviewerIds, (a, b) => a === b);
                            
        let enableSave = (this.props.withDefaults || !nothingChanged) && 
                         this.state.title && this.state.title.length <= CUSTOM_TITLE_MAX_LENGTH &&
                         (this.state.authorIds || []).length <= CUSTOM_MAX_PEOPLE &&
                         (this.state.reviewerIds || []).length <= CUSTOM_MAX_PEOPLE;

        return <div>
            <PrimaryButton className={"vc-pullRequest-list-customize-panel-button"} onClick={ this._saveCustomizations } disabled={!enableSave}>{ VCResources.PullRequestListCustomSectionSave }</PrimaryButton>
            <DefaultButton className={"vc-pullRequest-list-customize-panel-button"} onClick={ this.props.onDismiss } >{ VCResources.PullRequestListCustomSectionCancel }</DefaultButton>
        </div>;
    }

    @autobind
    private _setTitle(title: string): void {
        this.setState({title: title});
    }

    @autobind
    private _setReviewers(identities: IEntity[]): void {
        let localIds = identities.map(i => i.localId);
        this.setState({
            reviewerIds: localIds
        })
    }
    
    @autobind
    private _setAuthors(identities: IEntity[]): void {
        let localIds = identities.map(i => i.localId);
        this.setState({
            authorIds: localIds
        })
    }

    @autobind
    private _filterUnresolvedIdentities(identities: IEntity[]): IEntity[] {
        return identities.filter(i => i.localId);
    }

    @autobind
    private _onStatusChange(option?: IComboBoxOption, index?: number, value?: string): void {
        this.setState({
            status: option.key as PullRequestStatus
        });
    }
}