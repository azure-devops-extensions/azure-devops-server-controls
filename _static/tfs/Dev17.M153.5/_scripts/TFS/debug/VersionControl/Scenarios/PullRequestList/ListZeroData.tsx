import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { Link } from "OfficeFabric/Link";
import { autobind } from "OfficeFabric/Utilities";
import * as React from "react";

import { ZeroData } from "Presentation/Scripts/TFS/Components/ZeroData";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import { PullRequestListActionCreator } from "VersionControl/Scenarios/PullRequestList/Actions/PullRequestListActionCreator";
import { CustomizeSectionPanel } from "VersionControl/Scenarios/PullRequestList/CustomizeSectionPanel";
import { PullRequestListSection } from "VersionControl/Scenarios/PullRequestList/PullRequestListDataModel";
import { PullRequestListQueryCriteria } from "VersionControl/Scenarios/PullRequestList/PullRequestListQueryCriteria";
import { StoresHub } from "VersionControl/Scenarios/PullRequestList/Stores/StoresHub";
import * as VCResources from "VersionControl/Scripts/Resources/TFS.Resources.VersionControl";

import "VSS/LoaderPlugins/Css!VersionControl/ListZeroData";

export interface ListZeroDataContainerProps {
    tfsContext: TfsContext;
    actionCreator: PullRequestListActionCreator;
    storesHub: StoresHub;
    /**
     * A (maybe empty) custom section that can be configured if provided.
     * This must be null if custom section is not enabled.
     * That's the case when Vertical Nav is not enabled, this is TabInfoActionCreator's responsibility.
     */
    customSection: PullRequestListSection;
    isMyAccountPage: boolean;
}

export const ListZeroDataContainer = (props: ListZeroDataContainerProps) =>
    <ListZeroData
        imageUrl={props.tfsContext.configuration.getResourcesFile("emptyPRList.svg")}
        newPullRequestUrl={props.storesHub.pullRequestListStore.getNewPullRequestUrl()}
        onNewPullRequestClick={props.actionCreator.navigateToNewPullRequestFromZeroDataButton}
        teamMembership={props.storesHub.pullRequestListStore.getTeamMembership()}
        currentIdentityId={props.tfsContext.currentIdentity.id}
        isZeroDayExperience={props.storesHub.pullRequestListStore.getIsDayZeroExperience()}
        customSection={props.customSection}
        onUpdateCustomSection={props.actionCreator.updateSectionCriteria}
        canCreatePullRequest={!props.isMyAccountPage && props.storesHub.permissionsStore.getPermissions().createPullRequest}
        canCreateCustomSection={!props.isMyAccountPage && props.storesHub.permissionsStore.getPermissions().createCustomSection}
    />;

export interface ListZeroDataProps {
    imageUrl: string;
    newPullRequestUrl: string;
    canCreatePullRequest: boolean;
    onNewPullRequestClick(event: React.MouseEvent<HTMLAnchorElement>): void;
    canCreateCustomSection: boolean;
    isZeroDayExperience: boolean;
    customSection: PullRequestListSection;
    onUpdateCustomSection(sectionId: string, sectionCriteria: PullRequestListQueryCriteria): void;
    teamMembership: string[];
    currentIdentityId: string;
}

export interface ListZeroDataState {
    editingCriteria: PullRequestListQueryCriteria;
    isNewCriteria: boolean;
    customizeTelemetryEntryPoint: string;
}

export class ListZeroData extends React.PureComponent<ListZeroDataProps, ListZeroDataState> {
    public state = {} as ListZeroDataState;

    public render(): JSX.Element {
        return <ZeroData
            imageUrl={this.props.imageUrl}
            primaryText={VCResources.PullRequest_EmptyListMessage_Primary}
            secondaryTextElement={this._renderSecondaryMessageAndButtons()}
        />;
    }

    private _renderSecondaryMessageAndButtons(): JSX.Element {
        return <div>
            <span>
                {VCResources.PullRequest_EmptyListMessage_Secondary}
                <Link
                    className="learn-more-link"
                    href={VCResources.PullRequest_LearnMoreLink}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {VCResources.LearnMore}
                </Link>
            </span>
                <div className="zero-data-buttons-container">
                {
                    this.props.canCreatePullRequest &&
                    <PrimaryButton title={VCResources.PullRequest_CreatePullRequestButtonToolTip}
                        href={this.props.newPullRequestUrl}
                        onClick={this.props.onNewPullRequestClick}>
                        {VCResources.PullRequest_CreatePullRequestButtonCaption}
                    </PrimaryButton>
                }
                {
                    this.renderCustomSectionButton()
                }
                {
                    this.state.editingCriteria &&
                    <CustomizeSectionPanel
                        sectionId={this.props.customSection.sectionInfo.id}
                        sectionCriteria={this.state.editingCriteria}
                        onUpdateSectionCriteria={this.props.onUpdateCustomSection}
                        onDismiss={this.onDismissEditing}
                        withDefaults={this.state.isNewCriteria}
                        telemetryEntryPoint={this.state.customizeTelemetryEntryPoint}
                    />
                }
            </div>
        </div>;
    }

    private renderCustomSectionButton() {
        const {
            isZeroDayExperience,
            canCreateCustomSection,
            customSection,
        } = this.props;

        if (isZeroDayExperience || !customSection || !canCreateCustomSection) {
            return null;
        }

        return <DefaultButton
                onClick={this.onEditExistingCustomSection}
            >
                {VCResources.PullRequestListEditCustomSectionTitle}
            </DefaultButton>
    }

    @autobind
    private onEditExistingCustomSection() {
        this.setState({
            editingCriteria: this.props.customSection.sectionInfo.criteria,
            isNewCriteria: false,
            customizeTelemetryEntryPoint: "re-customize from zero data"
        });
    }

    @autobind
    private onEditNewCustomSection(initialCriteria?: PullRequestListQueryCriteria, telemetryEntryPoint?: string) {
        this.setState({
            editingCriteria: initialCriteria,
            isNewCriteria: true,
            customizeTelemetryEntryPoint: telemetryEntryPoint
        });
    }

    @autobind
    private onDismissEditing() {
        this.setState({ editingCriteria: undefined });
    }
}
