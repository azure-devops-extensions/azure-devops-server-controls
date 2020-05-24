import * as React from "react";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Checkbox, ICheckboxStyles } from "OfficeFabric/Checkbox";
import { Spinner, SpinnerSize } from "OfficeFabric/Spinner";
import { ITextField, TextField } from "OfficeFabric/TextField";

import { State } from "VSS/Flux/Component";
import * as Utils_String from "VSS/Utils/String";

import { FormatComponent } from "VSSPreview/Flux/Components/Format";

import { FeedSettingsActionCreator } from "Package/Scripts/Actions/FeedSettingsActionCreator";
import { ExternalLink } from "Package/Scripts/Components/ExternalLink";
import { IRetentionPolicySettingsState } from "Package/Scripts/Components/Settings/IFeedSettingsState";
import { IPivotDocumentProps, PivotDocument } from "Package/Scripts/Components/Settings/PivotDocument";
import { FwLinks, SettingsPivotKeys } from "Feed/Common/Constants/Constants";
import * as PackageResources from "Feed/Common/Resources";

import "VSS/LoaderPlugins/Css!Package:Package/Scripts/Components/Settings/FeedDetailsPane";

export interface IFeedDetailsPaneProps extends IPivotDocumentProps, IRetentionPolicySettingsState {
    /**
     * feed name to display
     */
    feedName: string;

    /**
     * feed description to display
     */
    feedDescription: string;

    /**
     * hideDeletedPackageVersions value to display
     */
    hideDeletedPackageVersions: boolean;

    /**
     * badgesEnabled value to display
     */
    badgesEnabled: boolean;

    /**
     * error message to display for feed name
     */
    feedNameErrorMessage: string;

    /**
     * True if the current user can make changes to the feed settings
     */
    isUserAdmin: boolean;

    /**
     * True if user has made changes to feed name/description/hideDeletedPackageVersions
     */
    hasChanges: () => boolean;

    /**
     * True if there are validation errors in the pivot
     */
    hasValidationErrors: () => boolean;

    /**
     * True if user has clicked save and save operation is not done yet
     */
    isSavingChanges: boolean;

    retentionPolicyCountLimit: string;
    retentionPolicyErrorMessage: string;
    retentionPolicyMinCountLimit: number;
    retentionPolicyMaxCountLimit: number;
    /**
     * Feed Upgrade Available
     */
    upgradeAvailable: boolean;

    /**
     * Feed Upgrade is in progress
     */
    upgradeInProgress: boolean;
}

const checkboxStyles: ICheckboxStyles = {
    textDisabled: { color: "initial" }
};

export interface IFeedDetailsPaneState extends State {
    upgradeButtonClicked: boolean;
}

export class FeedDetailsPane extends PivotDocument<IFeedDetailsPaneProps, IFeedDetailsPaneState> {
    private readonly _maxFeedNameLength = 64;
    private readonly _maxFeedDescriptionLength = 255;
    private readonly _feedDescriptionFieldRows = 5;
    private _textField: ITextField;

    constructor(props: IFeedDetailsPaneProps) {
        super(props);

        this.state = {
            upgradeButtonClicked: false
        };
    }

    public componentDidUpdate() {
        // Setting focus on textfield only when upgrade button was successfully clicked,
        // because the upgrade button will disappear on click and the focus needs to be set, otherwise it gets lost.
        if (this.props.upgradeInProgress == true && this._textField && this.state.upgradeButtonClicked === true) {
            this._textField.focus();
        }
    }

    public render(): JSX.Element {
        const formHeadingId = "feed-details-form-h2";
        const manualUpgradeId = "feed-details-manual-upgrade";
        const deletedPackagesId = "feed-details-deleted-packages";
        const packageSharingId = "feed-details-package-sharing";
        const retentionPoliciesId = "feed-details-retention-policies";
        return (
            <div role="form" aria-labelledby={formHeadingId} className="feed-details-pane">
                <h2 id={formHeadingId}>
                    {
                        PackageResources.FeedDetailsPane_Heading /*This hidden heading is here for accessibility purposes*/
                    }
                </h2>
                {this.props.upgradeInProgress && (
                    <section aria-labelledby={manualUpgradeId}>
                        <h3 className={"fontSizeL header margin-bottom"}>
                            {Utils_String.format(PackageResources.FeedDetailsPane_ManualUpgrade, this.props.feedName)}
                        </h3>
                        <div className={"fontSizeM margin-bottom"}>
                            {PackageResources.FeedDetailsPane_UpgradeInProgress}
                        </div>
                    </section>
                )}
                {this.props.upgradeAvailable &&
                    !this.props.upgradeInProgress && (
                        <section aria-labelledby={manualUpgradeId}>
                            <h3 id={manualUpgradeId} className={"fontSizeL header margin-bottom"}>
                                {Utils_String.format(
                                    PackageResources.FeedDetailsPane_ManualUpgrade,
                                    this.props.feedName
                                )}
                            </h3>
                            <div className={"fontSizeM margin-bottom"}>
                                {PackageResources.FeedDetailsPane_UpgradeMessage1}
                            </div>
                            <div className={"fontSizeM margin-bottom"}>
                                {PackageResources.FeedDetailsPane_UpgradeMessage2}
                            </div>
                            <ul className={"fontSizeM margin-bottom"}>
                                <li>{PackageResources.FeedDetailsPane_UpgradeItem1}</li>
                                <li>{PackageResources.FeedDetailsPane_UpgradeItem2}</li>
                                <li>{PackageResources.FeedDetailsPane_UpgradeItem3}</li>
                            </ul>
                            <div className={"fontSizeM margin-bottom"}>
                                <ExternalLink
                                    className={"external-link margin-bottom"}
                                    href={FwLinks.ManualUpgradeLearnMore}
                                >
                                    {PackageResources.FeedDetailsPane_UpgradeLearnMore}
                                </ExternalLink>
                            </div>
                            <div className={"fontSizeM margin-bottom"}>
                                <DefaultButton
                                    onClick={() => this._feedDetailsUpgrade()}
                                    disabled={this.props.isSavingChanges === true}
                                    text={PackageResources.FeedDetailsPane_ManualUpgradeAction}
                                    ariaLabel={Utils_String.format(
                                        PackageResources.FeedDetailsPane_ManualUpgrade,
                                        this.props.feedName
                                    )}
                                    ariaDescription={PackageResources.FeedDetailsPane_UpgradeMessage1}
                                />
                            </div>
                        </section>
                    )}
                <TextField
                    className={"text-field margin-bottom"}
                    label={PackageResources.FeedDetailsPane_Name}
                    value={this.props.feedName}
                    maxLength={this._maxFeedNameLength}
                    errorMessage={this.props.feedNameErrorMessage}
                    onChanged={this._onfeedNameChanged}
                    disabled={!this.props.isUserAdmin}
                    componentRef={(element: ITextField) => (this._textField = element)}
                />
                <TextField
                    className={"text-field margin-bottom"}
                    label={PackageResources.FeedDetailsPane_Description}
                    value={this.props.feedDescription}
                    multiline={true}
                    maxLength={this._maxFeedDescriptionLength}
                    rows={this._feedDescriptionFieldRows}
                    resizable={false}
                    autoAdjustHeight={true}
                    onChanged={this._onfeedDescriptionChanged}
                    disabled={!this.props.isUserAdmin}
                />
                <section aria-labelledby={deletedPackagesId}>
                    <h3 id={deletedPackagesId} className={"fontSizeL header margin-bottom"}>
                        {PackageResources.FeedDetailsPane_DeletedPackages}
                    </h3>
                    <p className={"fontSizeM margin-bottom"}>
                        <FormatComponent format={PackageResources.FeedDetailsPane_DeletedPackagesDescription}>
                            <ExternalLink href={FwLinks.EditFeedDeletedPackagesTabImmutableFeed}>
                                {PackageResources.FeedDetailsPane_FeedsAreImmutable}
                            </ExternalLink>
                        </FormatComponent>
                    </p>
                    <Checkbox
                        className="edit-checkBox"
                        checked={this.props.hideDeletedPackageVersions === true}
                        onChange={this._onhideDeletedPackageVersionsChanged}
                        label={PackageResources.FeedDetailsPane_HideDeletedPackageVersions}
                        styles={checkboxStyles}
                        disabled={!this.props.isUserAdmin}
                    />
                </section>
                <section aria-labelledby={packageSharingId}>
                    <h3 id={packageSharingId} className={"fontSizeL header margin-bottom"}>
                        {PackageResources.FeedDetailsPane_PackageSharing}
                    </h3>
                    <p className={"fontSizeM margin-bottom"}>
                        {PackageResources.FeedDetailsPane_PackageBadgesDescription}
                    </p>
                    <Checkbox
                        className="edit-checkBox"
                        checked={this.props.badgesEnabled === true}
                        onChange={this._onPackageBadgesEnabledChanged}
                        label={PackageResources.FeedDetailsPane_EnablePackageBadges}
                        styles={checkboxStyles}
                        disabled={!this.props.isUserAdmin}
                    />
                </section>
                {this.props.retentionPolicyEnabled && (
                    <section aria-labelledby={retentionPoliciesId}>
                        <h3 id={retentionPoliciesId} className={"fontSizeL header margin-bottom"}>
                            {PackageResources.FeedDetailsPane_RetentionPolicies_Title}
                        </h3>
                        {this.props.retentionPolicyLoading ? (
                            <Spinner className="loading-spinner" size={SpinnerSize.medium} />
                        ) : (
                            <div>
                                <p className={"fontSizeM margin-bottom"}>
                                    {PackageResources.FeedDetailsPane_RetentionPolicies_DescriptionText}
                                </p>
                                <TextField
                                    className={"text-field margin-bottom"}
                                    min={this.props.retentionPolicyMinCountLimit}
                                    max={this.props.retentionPolicyMaxCountLimit}
                                    aria-valuemin={this.props.retentionPolicyMinCountLimit}
                                    aria-valuemax={this.props.retentionPolicyMaxCountLimit}
                                    label={PackageResources.FeedDetailsPane_RetentionPolicies_CountLimitLabel}
                                    defaultValue={this.props.retentionPolicyCountLimit}
                                    errorMessage={this.props.retentionPolicyErrorMessage}
                                    onChanged={value => this._onfeedRetentionPolicyCountChanged(value)}
                                    disabled={!this.props.isUserAdmin}
                                    placeholder={
                                        PackageResources.FeedDetailsPane_RetentionPolicies_CountLimitPlaceHolder
                                    }
                                />
                            </div>
                        )}
                    </section>
                )}
                {this.props.isUserAdmin === true && (
                    <div className="feed-details-footer">
                        <PrimaryButton
                            disabled={this.props.hasChanges() === false || this.props.isSavingChanges === true}
                            onClick={() => this._feedDetailsSaveChanges()}
                            text={PackageResources.FeedSettings_SaveButton_Label}
                        />
                        <DefaultButton
                            disabled={this.props.hasChanges() === false || this.props.isSavingChanges === true}
                            onClick={() => this._feedDetailsUndoChanges()}
                            text={PackageResources.FeedSettings_CancelButton_Label}
                        />
                    </div>
                )}
            </div>
        );
    }

    protected getPivotKey(): string {
        return SettingsPivotKeys.details;
    }

    private _onfeedNameChanged(value: string): void {
        FeedSettingsActionCreator.onFeedNameChanged.invoke(value);
    }

    private _onfeedDescriptionChanged(value: string): void {
        FeedSettingsActionCreator.onFeedDescriptionChanged.invoke(value);
    }

    private _onfeedRetentionPolicyCountChanged(value: string): void {
        FeedSettingsActionCreator.onFeedRetentionPolicyCountChanged.invoke(value);
    }

    private _onhideDeletedPackageVersionsChanged(
        event: React.FormEvent<HTMLElement | HTMLInputElement>,
        checked: boolean
    ): void {
        FeedSettingsActionCreator.toggleHideDeletedPackageVersions.invoke(checked);
    }

    private _onPackageBadgesEnabledChanged(
        event: React.FormEvent<HTMLElement | HTMLInputElement>,
        checked: boolean
    ): void {
        FeedSettingsActionCreator.toggleBadgesEnabled.invoke(checked);
    }

    private _feedDetailsUndoChanges(): void {
        FeedSettingsActionCreator.undoFeedDetailsChanges.invoke(null);
    }

    private _feedDetailsSaveChanges(): void {
        FeedSettingsActionCreator.saveFeedDetailsChanges.invoke(null);
    }
    private _feedDetailsUpgrade(): void {
        FeedSettingsActionCreator.upgradeFeed.invoke(null);
        this.setState({ upgradeButtonClicked: true });
    }
}
