// css
import "VSS/LoaderPlugins/Css!Policy/Scenarios/AdminPolicies/AdminPoliciesHub";
import "VSS/LoaderPlugins/Css!Policy/Scenarios/AdminPolicies/StatusPolicyPanelContainer";

// libs
import { autobind, css, getId } from "OfficeFabric/Utilities";
import * as React from "react";
import { Debug } from "VSS/Diag";

// contracts
import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { Status } from "Policy/Scripts/PolicyTypes";
import { GitStatusContext } from "TFS/VersionControl/Contracts";
import { IEntity } from "VSS/Identities/Picker/RestClient";
import { format } from "VSS/Utils/String";
import { IdentityRef } from "VSS/WebApi/Contracts";

// controls
import { DefaultButton, PrimaryButton, CommandButton } from "OfficeFabric/Button";
import { Checkbox } from "OfficeFabric/Checkbox";
import { ChoiceGroup, IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { VirtualizedComboBox, IComboBoxOption } from "OfficeFabric/ComboBox";
import { Icon } from "OfficeFabric/Icon";
import { Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/Link";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Panel, PanelType } from "OfficeFabric/Panel";
import { TextField } from "OfficeFabric/TextField";
import { DirectionalHint, TooltipHost } from "VSSUI/Tooltip";
import { IdentityPicker } from "Policy/Scenarios/AdminPolicies/Components/IdentityPicker";
import { MessageListContainer } from "Policy/Scenarios/AdminPolicies/MessageListContainer";
import { MessageTarget } from "Policy/Scenarios/AdminPolicies/Stores/MessageStore";
import { PanelFooter } from "Policy/Scenarios/Shared/PanelFooter";
import { PathFilter } from "Policy/Scenarios/Shared/PathFilter";
import { PolicyRequirement } from "Policy/Scenarios/Shared/PolicyRequirement";

// scenario
import { ActionCreator } from "Policy/Scenarios/AdminPolicies/Actions/AdminPoliciesActionCreator";
import { Flux, Actions } from "Policy/Scenarios/AdminPolicies/Flux";
import { IdentityStore } from "Policy/Scenarios/AdminPolicies/Stores/IdentityStore";
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

export interface StatusOption extends IComboBoxOption {
    status: GitStatusContext;
}

export interface StatusPolicyPanelContainerProps {
    flux: Flux;
}

export interface StatusPolicyPanelContainerState {
    // status items
    statusOptions?: StatusOption[];

    // User has no permission to edit
    readonlyMode?: boolean;

    // Policy config being edited
    config?: PolicyConfiguration;

    allowAnyAuthor?: boolean;

    panelIsOpen?: boolean;

    // Go back where we came from
    elementToFocusOnDismiss?: HTMLElement;

    // Invalid identities that were not resolved
    invalidIdentities?: string[];

    advancedExpanded?: boolean;
}

const DefaultDisplayNameMaxLength: number = 50;

export class StatusPolicyPanelContainer extends React.Component<StatusPolicyPanelContainerProps, StatusPolicyPanelContainerState> {

    constructor(props: StatusPolicyPanelContainerProps) {
        super(props);
        this.state = this._getStateFromStores();
    }

    public componentDidMount(): void {
        this.props.flux.storesHub.adminPoliciesHubStore.addChangedListener(this._onStoreChanged);
        this.props.flux.storesHub.statusesStore.addChangedListener(this._onStoreChanged);

        this.props.flux.actionsHub.showStatusPolicyEditDialog.addListener(this._onShowDialog);
        this.props.flux.actionsHub.dismissDialog.addListener(this._dismissDialog);
    }

    public componentWillUnmount(): void {
        this.props.flux.storesHub.adminPoliciesHubStore.removeChangedListener(this._onStoreChanged);
        this.props.flux.storesHub.statusesStore.removeChangedListener(this._onStoreChanged);

        this.props.flux.actionsHub.showStatusPolicyEditDialog.removeListener(this._onShowDialog);
        this.props.flux.actionsHub.dismissDialog.removeListener(this._dismissDialog);
    }

    public render(): JSX.Element {
        if (!this.state.config) {
            return null;
        }

        const dialogTitle = !this.state.config.id ? Resources.StatusPolicyDialogTitleAdd : Resources.StatusPolicyDialogTitleEdit;

        return (
            <Panel
                headerText={dialogTitle}
                isOpen={this.state.panelIsOpen}
                isBlocking={true}
                className={css("policy-panel", "status-policy-panel-container")}
                type={PanelType.medium}
                isLightDismiss={false}
                isFooterAtBottom={true}
                onRenderFooterContent={this._renderFooter}
                onDismissed={this._onDismiss}
                elementToFocusOnDismiss={this.state.elementToFocusOnDismiss}
                closeButtonAriaLabel={Resources.PanelCloseButtonAriaLabel} >

                <MessageListContainer flux={this.props.flux} messageTarget={MessageTarget.statusErrors} />

                {this.state.invalidIdentities && this.state.invalidIdentities.map((name, index) => (
                    <MessageBar
                        key={"invalid" + index}
                        messageBarType={MessageBarType.error}
                    >{format(Resources.StatusPolicyAuthorInvalid, name)}</MessageBar>
                ))}

                <Label>{Resources.StatusPolicyDialogDetails}</Label>

                {this._renderMainFields()}
            </Panel>
        );
    }

    private _renderMainFields(): JSX.Element {
        const { readonlyMode, config, statusOptions } = this.state;
        const settings: Status.Settings = config.settings as Status.Settings;

        const comboboxClass = "select-status-combobox";
        const comboboxId = getId(comboboxClass);

        return <div>
            {this._renderSelectStatusLabel(comboboxId)}

            <VirtualizedComboBox
                id={comboboxId}
                className={comboboxClass}
                ariaLabel={Resources.StatusPolicyDialogStatus}
                disabled={readonlyMode}
                required={true}
                options={statusOptions}
                autoComplete={"on"}
                allowFreeform={true}
                scrollSelectedToTop={true}
                useComboBoxAsMenuWidth={true}
                value={StatusPolicyHelper.getStatusDisplayName(settings)}
                onChanged={this._onStatusSelected} />

            <PolicyRequirement
                className={"policy-setting"}
                readonlyMode={readonlyMode}
                onChange={this._onIsBlockingChanged}
                requiredDetails={Resources.StatusPolicyRequiredDetails}
                optionalDetails={Resources.StatusPolicyOptionalDetails}
                isBlocking={config.isBlocking} />

            <CommandButton
                className="expand-advanced-button"
                iconProps={{ iconName: this.state.advancedExpanded ? "ChevronUp" : "ChevronDown" }}
                onClick={this._onExpandClicked}
                aria-expanded={this.state.advancedExpanded}
                aria-pressed={this.state.advancedExpanded}>
                {Resources.AdvancedSettings}
            </CommandButton>

            {this.state.advancedExpanded &&
                this._renderAdvancedSettings(readonlyMode, settings, config)}
        </div>;
    }

    private _renderSelectStatusLabel(comboboxId: string): JSX.Element {
        return <Label htmlFor={comboboxId} required={true}>
            <span>{Resources.StatusPolicyDialogStatus}</span>
            <TooltipHost
                hostClassName="statuses-info-tooltip-host"
                calloutProps={{ gapSpace: 4 }}
                tooltipProps={{ onRenderContent: this._renderTooltipContent }}
                directionalHint={DirectionalHint.topCenter}>
                <Icon
                    ariaLabel={Resources.StatusPolicyDialogStatusInfo}
                    role={"note"}
                    className={css("bowtie-icon", "bowtie-status-info-outline")}
                    tabIndex={0} />
            </TooltipHost>
        </Label>;
    }

    @autobind
    private _renderTooltipContent(): JSX.Element {
        return <div>
            <div>{Resources.StatusPolicyDialogStatusInfo}</div><br />
            <div>{Resources.StatusPolicyDialogStatusInfoCase1}</div><br />
            <div>{Resources.StatusPolicyDialogStatusInfoCase2}</div><br />
            <div>{Resources.StatusPolicyDialogStatusInfoCase3}</div><br />
        </div>;
    }

    private _renderAdvancedSettings(readonlyMode: boolean, settings: Status.Settings, config: PolicyConfiguration): JSX.Element {

        // This lets the user edit an existing policy with a too-long display name, but not create a new one.
        // If they do edit a value which is too long, they won't be able to make it longer.
        const displayNameMaxLength = Math.max((settings.defaultDisplayName || "").length, DefaultDisplayNameMaxLength);

        const defaultDisplayNameId = getId("default-display-name");

        return <div className="advanced-policy-settings">

            <AuthorizedIdentityChoice
                readOnlyMode={readonlyMode}
                allowAnyAuthor={this.state.allowAnyAuthor}
                identities={settings.authorId ? [settings.authorId] : []}
                identityStore={this.props.flux.storesHub.identityStore}
                actionCreator={this.props.flux.actionCreator}
                onChanged={this._onAuthorizedIdentitiesChanged}
                onInvalidIdentitiesChanged={this._onInvalidIdentitiesChanged} />

            <Label className="policy-setting">
                <span>{Resources.StatusPolicyExpiration}</span>
                <TooltipHost
                    content={Resources.StatusPolicyExpiratonOnSourceUpdateDescription}
                    hostClassName="statuses-info-tooltip-host"
                    calloutProps={{ gapSpace: 4 }}
                    directionalHint={DirectionalHint.topCenter}>
                    <Icon
                        ariaLabel={Resources.StatusPolicyExpiratonOnSourceUpdateDescription}
                        role={"note"}
                        className={css("bowtie-icon", "bowtie-status-info-outline")}
                        tabIndex={0} />
                </TooltipHost>
            </Label>
            <Checkbox
                className={"policy-expiration-checkbox"}
                label={Resources.StatusPolicyExpirationOnSourceUpdateText}
                checked={settings.invalidateOnSourceUpdate}
                onChange={this._onExpirationChanged}
                disabled={readonlyMode}
            />
            {settings.invalidateOnSourceUpdate && this._renderStatusExpirationWarning()}

            <PathFilter
                className={"policy-setting"}
                readonlyMode={readonlyMode}
                filenamePatterns={settings.filenamePatterns}
                onChanged={this._onPathFilterChanged} />

            <ChoiceGroup
                className={"policy-setting"}
                disabled={readonlyMode}
                label={Resources.StatusPolicyApplicability}
                onChange={this._onDefaultApplicabilityChanged}
                options={[
                    {
                        key: "applyByDefault",
                        disabled: (readonlyMode),
                        text: ([
                            <div key="1">{Resources.StatusPolicyApplyByDefault}</div>,
                            <div key="2" className="policy-details">{Resources.StatusPolicyApplyByDefaultDescription}</div>
                        ]) as any,
                        checked: settings.policyApplicability == null
                        || settings.policyApplicability === Status.PolicyApplicability.applyByDefault
                    },
                    {
                        key: "applyWhenStatusExists",
                        disabled: (readonlyMode),
                        text: ([
                            <div key="1">{Resources.StatusPolicyApplyWhenStatusExists}</div>,
                            <div key="2" className="policy-details">{Resources.StatusPolicyApplyWhenStatusExistsDescription}</div>
                        ]) as any,
                        checked: settings.policyApplicability === Status.PolicyApplicability.applyWhenStatusExists,
                    },
                ]} />

            <Label
                htmlFor={defaultDisplayNameId}
                className="policy-setting">
                <span>{Resources.DefaultDisplayName}</span>
                <TooltipHost
                    content={Resources.StatusPolicyDefaultDisplayNameInfoText}
                    hostClassName="statuses-info-tooltip-host"
                    calloutProps={{ gapSpace: 4 }}
                    directionalHint={DirectionalHint.topCenter}>
                    <Icon
                        ariaLabel={Resources.StatusPolicyDefaultDisplayNameInfoText}
                        role={"note"}
                        className={css("bowtie-icon", "bowtie-status-info-outline")}
                        tabIndex={0} />
                </TooltipHost>
            </Label>

            <TextField
                id={defaultDisplayNameId}
                disabled={readonlyMode}
                value={settings.defaultDisplayName || ""}
                onChanged={this._onDefaultDisplayNameChanged}
                maxLength={displayNameMaxLength}
                placeholder={StatusPolicyHelper.getStatusDisplayName(settings)} />
        </div>;
    }

    @autobind
    private _renderFooter(): JSX.Element {
        const settings: Status.Settings = this.state.config.settings as Status.Settings;
        const canSave = Boolean(settings.statusName && (this.state.allowAnyAuthor || settings.authorId));

        return <PanelFooter
            readonlyMode={this.state.readonlyMode}
            canSave={canSave}
            onSaveClicked={this._onSaveClicked}
            onCancelClicked={this._onDismiss} />;
    }

    private _renderStatusExpirationWarning(): JSX.Element {
        return <MessageBar className="reset-status-warning" messageBarType={MessageBarType.warning}>
            <span>{Resources.StatusPolicyExpireOnSourceUpdateWarningText}</span>
            <Link
                className="learn-more-link"
                href="https://docs.microsoft.com/en-us/rest/api/vsts/git/pull%20request%20iteration%20statuses"
                target="_blank"
                rel="noopener noreferrer">
                {Resources.LearnMore}
            </Link>
        </MessageBar>;
    }

    private _getStateFromStores(): StatusPolicyPanelContainerState {
        return {
            readonlyMode: this.props.flux.storesHub.adminPoliciesHubStore.readonlyMode,
            ...this._getStatusesState(this.state && this.state.config)
        };
    }

    private _getStatusesState(config: PolicyConfiguration): StatusPolicyPanelContainerState {
        if (!config) {
            return {};
        }

        const statuses = this.props.flux.storesHub.statusesStore.getStatuses();

        return {
            statusOptions: statuses ? statuses.map(StatusPolicyHelper.getStatusItem) : [],
        };
    }

    @autobind
    private _onStoreChanged(): void {
        this.setState(this._getStateFromStores());
    }

    @autobind
    private _onShowDialog(payload: Actions.ShowPolicyEditDialogPayload): void {
        const config = payload.config;

        if (config.type.id !== Status.Id) {
            Debug.fail("Policy config has wrong type id");
            return;
        }

        if (!this.state.panelIsOpen) {
            const settings = config.settings as Status.Settings;
            const statuses = this.props.flux.storesHub.statusesStore.getStatuses();

            const allowAnyAuthor = !Boolean(settings.authorId);

            // expand advanced settings to make sure user sees the reset status warning
            const advancedExpanded = settings.invalidateOnSourceUpdate
                || !allowAnyAuthor
                || (settings.filenamePatterns && settings.filenamePatterns.length > 0)
                || settings.policyApplicability > 0
                || Boolean(settings.defaultDisplayName);

            this.setState({
                panelIsOpen: true,
                config: config,
                elementToFocusOnDismiss: payload.elementToFocusOnDismiss,
                statusOptions: statuses ? statuses.map(StatusPolicyHelper.getStatusItem) : [],
                allowAnyAuthor,
                advancedExpanded,
            });
        }
    }

    @autobind
    private _onExpandClicked(): void {
        this.setState({ advancedExpanded: !this.state.advancedExpanded });
    }

    @autobind
    private _onDismiss(): void {
        this._dismissDialog({ dialog: this });
    }

    @autobind
    private _dismissDialog(payload: Actions.DismissDialogPayload): void {
        if (payload.dialog === this) {
            this.setState(
                {
                    panelIsOpen: false,
                    config: null,
                },
                () => this.props.flux.actionCreator.cleanupUrl()
            );
        }
    }

    @autobind
    private _onStatusSelected(option?: StatusOption, index?: number, value?: string) {
        let statusName: string;
        let statusGenre: string;

        const status = option && option.status;
        if (status) {
            statusName = status.name;
            statusGenre = status.genre;
        }
        else {
            const result = StatusPolicyHelper.getStatusNameAndGenre(value);
            statusName = result && result.statusName;
            statusGenre = result && result.statusGenre;
        }

        const config = { ...this.state.config };
        const settings = config.settings as Status.Settings;
        settings.statusName = statusName;
        settings.statusGenre = statusGenre;

        this.setState({ config });
    }

    @autobind
    private _onAuthorizedIdentitiesChanged(allowAnyAuthor: boolean, identities: string[]): void {
        const config = { ...this.state.config };
        const settings = config.settings as Status.Settings;

        settings.authorId = identities && identities[0];

        this.setState({ allowAnyAuthor, config });
    }

    @autobind
    private _onInvalidIdentitiesChanged(invalidIdentities: string[]): void {
        this.setState({ invalidIdentities });
    }

    @autobind
    private _onExpirationChanged(ev: React.FormEvent<HTMLElement | HTMLInputElement>, checked: boolean): void {
        const config = { ...this.state.config };
        const settings = config.settings as Status.Settings;
        settings.invalidateOnSourceUpdate = checked;

        this.setState({ config });
    }

    @autobind
    private _onDefaultApplicabilityChanged(ev: React.FormEvent<HTMLElement | HTMLInputElement>, option: IChoiceGroupOption): void {
        const config = { ...this.state.config };
        const settings = config.settings as Status.Settings;

        if (option.key === "applyWhenStatusExists") {
            settings.policyApplicability = Status.PolicyApplicability.applyWhenStatusExists;
        } else {
            settings.policyApplicability = Status.PolicyApplicability.applyByDefault;
        }

        this.setState({ config });
    }

    @autobind
    private _onPathFilterChanged(newValue: string[]) {
        const newSettings: Status.Settings = {
            ...this.state.config.settings,
            filenamePatterns: newValue,
        };

        this.setState({ config: { ...this.state.config, settings: newSettings } });
    }

    @autobind
    private _onIsBlockingChanged(ev: React.FormEvent<HTMLElement | HTMLInputElement>, option: IChoiceGroupOption): void {
        this.setState({
            config: {
                ...this.state.config,
                isBlocking: (option.key === "true")
            }
        });
    }

    @autobind
    private _onDefaultDisplayNameChanged(newValue: string) {
        newValue = (newValue || null);

        const newSettings: Status.Settings = {
            ...this.state.config.settings,
            defaultDisplayName: newValue,
        };

        this.setState({ config: { ...this.state.config, settings: newSettings } });
    }

    @autobind
    private _onSaveClicked(): void {
        const config = this.state.config;

        if (this.state.allowAnyAuthor) {
            config.settings.authorId = null;
        }

        if (!config.id) {
            // add new policy
            this.props.flux.actionCreator.createLocalPolicyConfig(config, true, MessageTarget.statusErrors, this);
        }
        else {
            // update policy
            this.props.flux.actionCreator.updateLocalPolicyConfig(
                config.id,
                (existingConfig: PolicyConfiguration) => {
                    existingConfig.isBlocking = config.isBlocking;
                    existingConfig.isEnabled = config.isEnabled;
                    existingConfig.settings = config.settings;
                },
                true,
                MessageTarget.statusErrors,
                this
            );
        }
    }
}

export interface AuthorizedIdentityChoiceProps {
    readOnlyMode: boolean;
    allowAnyAuthor: boolean;
    identities: string[];
    identityStore: IdentityStore;
    actionCreator: ActionCreator;
    onChanged(allowAnyAuthor: boolean, identities: string[]);
    onInvalidIdentitiesChanged(invalidIdentities: string[]);
}

export class AuthorizedIdentityChoice extends React.PureComponent<AuthorizedIdentityChoiceProps> {

    public render(): JSX.Element {
        return (
            <div className="authorized-identities-choice">
                <ChoiceGroup
                    disabled={this.props.readOnlyMode}
                    className={"policy-setting"}
                    label={Resources.StatusPolicyAuthoredAccount}
                    onChange={this._onOptionChanged}
                    options={[
                        {
                            key: "anyAuthor",
                            disabled: this.props.readOnlyMode,
                            text: Resources.StatusPolicyAuthorNotRequired,
                            checked: this.props.allowAnyAuthor,
                        },
                        {
                            key: "requireAuthor",
                            disabled: this.props.readOnlyMode,
                            text: Resources.StatusPolicyAuthorRequired,
                            checked: !this.props.allowAnyAuthor,
                        }
                    ]} />
                <div className="require-author-picker">
                    {this._renderIdentityPicker()}
                </div>
            </div>
        );
    }

    @autobind
    private _renderIdentityPicker(): JSX.Element {
        const isReadOnly = this.props.readOnlyMode || this.props.allowAnyAuthor;

        return <IdentityPicker
            readOnlyMode={isReadOnly}
            defaultEntities={this.props.identities}
            consumerId={"2b67fc45-2ff3-4871-9249-71e840c02759"}
            includeGroups={false}
            multiIdentitySearch={false}
            minRequired={1}
            clearOnUpdate={this.props.allowAnyAuthor}
            identityStore={this.props.identityStore}
            cacheIdentity={this.props.actionCreator.cacheIdentity}
            materializeAadGroup={this.props.actionCreator.materializeAadGroup}
            identitiesUpdated={this._identitiesUpdated} />;
    }

    @autobind
    private _onOptionChanged(ev: React.FormEvent<HTMLElement | HTMLInputElement>, option: IChoiceGroupOption): void {
        if (this.props.onChanged) {
            this.props.onChanged(option.key === "anyAuthor", null);
        }
    }

    @autobind
    private _identitiesUpdated(validIdentities: string[], invalidIdentityNames: string[], pendingAadGroups: IEntity[]): void {
        if (this.props.onChanged) {
            this.props.onChanged(this.props.allowAnyAuthor, validIdentities);
        }

        if (this.props.onInvalidIdentitiesChanged) {
            this.props.onInvalidIdentitiesChanged(invalidIdentityNames);
        }
    }
}

export namespace StatusPolicyHelper {
    export function getStatusItem(statusContext: GitStatusContext): StatusOption {
        const displayName = statusContext
            ? getStatusName(statusContext.genre, statusContext.name)
            : null;

        return {
            key: displayName,
            text: displayName,
            status: statusContext,
        };
    }

    export function getStatusDisplayName(settings: Status.Settings): string {
        if (!settings) {
            return null;
        }

        return getStatusName(settings.statusGenre, settings.statusName);
    }

    export function getStatusNameAndGenre(value: string): { statusName: string, statusGenre?: string } {
        if (!value) {
            return null;
        }

        const delimiterIndex = value.lastIndexOf("/");
        if (delimiterIndex > 0) {
            return {
                statusGenre: value.substr(0, delimiterIndex),
                statusName: value.substr(delimiterIndex + 1),
            };
        }

        return { statusName: value };
    }

    function getStatusName(genre: string, name: string): string {
        return genre ? `${genre}/${name || ""}` : name;
    }
}
