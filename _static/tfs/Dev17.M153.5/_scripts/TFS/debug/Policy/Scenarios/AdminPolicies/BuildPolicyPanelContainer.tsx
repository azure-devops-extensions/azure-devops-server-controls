// css
import "VSS/LoaderPlugins/Css!Policy/Scenarios/AdminPolicies/BuildPolicyPanelContainer";

// libs
import { autobind, css } from "OfficeFabric/Utilities";
import * as React from "react";
import { Debug } from "VSS/Diag";
import { format, localeFormat } from "VSS/Utils/String";

// contracts
import { MessageTarget } from "Policy/Scenarios/AdminPolicies/Stores/MessageStore";
import { IBuildDefinitionMap } from "Policy/Scenarios/AdminPolicies/Stores/BuildDefinitionStore";
import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { Build } from "Policy/Scripts/PolicyTypes";

// controls
import { PrimaryButton, DefaultButton } from "OfficeFabric/Button";
import { Checkbox } from "OfficeFabric/Checkbox";
import { ChoiceGroup, IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";
import { Icon } from "OfficeFabric/Icon";
import { Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/Link";
import { Panel, PanelType } from "OfficeFabric/Panel";
import { TextField, ITextFieldProps } from "OfficeFabric/TextField";
import { MessageListContainer } from "Policy/Scenarios/AdminPolicies/MessageListContainer";
import { BuildDefinitionDropdown } from "Policy/Scenarios/AdminPolicies/BuildDefinitionDropdown";
import { NumberTextField } from "Policy/Scenarios/Shared/NumberTextField";
import { PanelFooter } from "Policy/Scenarios/Shared/PanelFooter";
import { PathFilter } from "Policy/Scenarios/Shared/PathFilter";
import { PolicyRequirement } from "Policy/Scenarios/Shared/PolicyRequirement";
import { FormatComponent } from "VSSPreview/Flux/Components/Format";

// scenario
import { IFlux, StoresHub, Actions, ActionCreationSignatures } from "Policy/Scenarios/AdminPolicies/Flux";
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

export interface BuildPolicyPanelContainerProps {
    flux: IFlux;
}

export interface BuildPolicyPanelContainerState {
    // User has no permission to edit
    readonlyMode?: boolean;

    // Build definitions
    buildDefinitionsById?: IBuildDefinitionMap;
    buildDefinitionsSorted?: Build.IBuildDefinitionSummary[];
    allDefinitionsLoaded?: boolean;

    // Name of branch for policy scope
    friendlyBranchName?: string;

    // Policy config being edited
    config?: PolicyConfiguration;

    // Panel is open
    panelIsOpen?: boolean;

    // Go back where we came from
    elementToFocusOnDismiss?: HTMLElement;

    // Most recent value of expiration. We can't just save this in the settings object, because validDuration has to be
    // set to zero when we're not in buddy mode.
    mostRecentValidDuration?: number;

    // Don't clobber the user's typing when the control has focus
    validDurationHasFocus?: boolean;

    // Set a max length for display name, but we need to support existing policies where the display name is too long
    displayNameMaxLength?: number;
}

export class BuildPolicyPanelContainer extends React.Component<BuildPolicyPanelContainerProps, BuildPolicyPanelContainerState> {

    constructor(props: BuildPolicyPanelContainerProps) {
        super(props);

        this.state = this._getStateFromStores();
    }

    private _validDurationTextField: HTMLElement;

    private _calloutTarget: HTMLElement;

    public static readonly DefaultDisplayNameMaxLength: number = 50;

    @autobind
    private _onShowDialog(payload: Actions.ShowPolicyEditDialogPayload): void {
        const config = payload.config;
        const settings = config.settings as Build.Settings;

        if (config.type.id !== Build.Id) {
            Debug.fail("Policy config has wrong type id");
            return;
        }

        let mostRecentValidDuration: number = settings.validDuration;

        if (mostRecentValidDuration <= 0) {
            // Default to 12 hrs
            mostRecentValidDuration = 720;
        }

        const displayNameMaxLength =
            // This lets the user edit an existing policy with a too-long display name, but not create a new one.
            // If they do edit a value which is too long, they won't be able to make it longer.
            Math.max((settings.displayName || "").length, BuildPolicyPanelContainer.DefaultDisplayNameMaxLength);

        if (!this.state.panelIsOpen) {
            this.setState({
                panelIsOpen: true,
                config: config,
                elementToFocusOnDismiss: payload.elementToFocusOnDismiss,
                mostRecentValidDuration: mostRecentValidDuration,
                validDurationHasFocus: false,
                displayNameMaxLength: displayNameMaxLength,
            });
        }
    }

    public render(): JSX.Element {

        const {
            readonlyMode,
            config,
            displayNameMaxLength,
            buildDefinitionsById,
            buildDefinitionsSorted,
            allDefinitionsLoaded,
        } = this.state;

        if (config == null) {
            return null;
        }

        const addingNewPolicy = (config.id == null || config.id < 1);

        const settings = this._settings;

        let initialSelection: Build.IBuildDefinitionSummary = null;

        if (!addingNewPolicy) {
            initialSelection = buildDefinitionsById[settings.buildDefinitionId];
        }

        let dialogTitle: string;

        if (addingNewPolicy) {
            dialogTitle = Resources.AddBuildPolicy;
        }
        else if (settings.displayName) {
            dialogTitle = format(Resources.EditBuildPolicyNamed, settings.displayName);
        } else {
            dialogTitle = Resources.EditBuildPolicyUnnamed;
        }

        const isManual: boolean = !!settings.manualQueueOnly;

        const validDurationMinutes: number = settings.validDuration;

        const isStrict: boolean = !isManual && !settings.queueOnSourceUpdateOnly;
        const isExpiring: boolean = !isManual && !!settings.queueOnSourceUpdateOnly && validDurationMinutes > 0;
        const isBuddy: boolean = isManual || (!!settings.queueOnSourceUpdateOnly && validDurationMinutes <= 0);

        const validDurationHrsText: string = isExpiring ? this._validDurationInHoursTextValue(settings.validDuration) : "";

        const disableSaveButton: boolean = !(settings.buildDefinitionId > 0);

        return(
            <Panel
                headerText={dialogTitle}
                isOpen={this.state.panelIsOpen}
                isBlocking={true}
                isLightDismiss={false}
                type={PanelType.medium}
                className={css("policy-panel", "build-policy-panel-container")}
                isFooterAtBottom={true}
                onRenderFooterContent={this._renderFooter}
                onDismissed={this._onDismiss}
                elementToFocusOnDismiss={this.state.elementToFocusOnDismiss}
                closeButtonAriaLabel={Resources.PanelCloseButtonAriaLabel} >

                {/* Message center */}

                <MessageListContainer flux={this.props.flux} messageTarget={MessageTarget.buildErrors} />

                {/* Build definition */}

                <Label required={true}>{Resources.BuildDefinition}</Label>

                <BuildDefinitionDropdown
                    initialSelection={initialSelection}
                    buildDefinitionsSorted={buildDefinitionsSorted}
                    allDefinitionsLoaded={allDefinitionsLoaded}
                    onChanged={this._definitionOnChange}
                />

                {/* Path filter */}

                <PathFilter
                    className={"policy-setting"}
                    readonlyMode={readonlyMode}
                    filenamePatterns={settings.filenamePatterns}
                    onChanged={this._onPathFilterChanged}
                />

                {/* Automatic / manual trigger */}

                <ChoiceGroup
                    className={"policy-setting"}
                    disabled={readonlyMode}
                    label={Resources.Trigger}
                    onChange={this._triggerOnChange}
                    options={[
                        {
                            key: "false",
                            disabled: readonlyMode,
                            text: Resources.BuildTriggerAutomatic,
                            checked: !settings.manualQueueOnly,
                        },
                        {
                            key: "true",
                            disabled: readonlyMode,
                            text: Resources.Manual,
                            checked: settings.manualQueueOnly,
                        },
                    ]} />

                {/* Required / optional policy */}

                <PolicyRequirement
                    className={"policy-setting"}
                    readonlyMode={readonlyMode}
                    onChange={this._isBlockingOnChange}
                    requiredDetails={Resources.EditBuildRequiredDetail}
                    optionalDetails={Resources.EditBuildOptionalDetail}
                    isBlocking={config.isBlocking} />

                {/* Expiration options (strict / expiring / buddy) */}

                <ChoiceGroup
                    className={"policy-setting"}
                    disabled={readonlyMode || isManual}
                    label={Resources.BuildExpiration}
                    onChange={this._expirationTypeChoiceOnChange}
                    options={[
                        {
                            key: "strict",
                            disabled: (readonlyMode || isManual),
                            //text: localeFormat(Resources.BuildExpirationStrict, this.state.friendlyBranchName),
                            text: (
                                <FormatComponent
                                    format={Resources.BuildExpirationStrict}
                                    className="expiringChoice"
                                >
                                    <span className="policy-branch-name-with-icon">
                                        <i className="icon bowtie-icon bowtie-tfvc-branch" />
                                        {this.state.friendlyBranchName}
                                    </span>
                                </FormatComponent>
                            ) as any,
                            checked: isStrict,
                        },
                        {
                            key: "expiring",
                            disabled: (readonlyMode || isManual),
                            text: (
                                <FormatComponent
                                    format={Resources.BuildExpirationWindow}
                                    className="expiringChoice"
                                >
                                    <NumberTextField
                                        disabled={readonlyMode || !isExpiring}
                                        /* This keeps us from clobbering the value while the user is actively typing */
                                        value={this.state.validDurationHasFocus ? undefined : validDurationHrsText}
                                        integer={false}
                                        minValue={0.01}
                                        maxValue={1000}
                                        maxLength={4}
                                        onFocus={this._validDurationOnFocusOnBlur}
                                        onBlur={this._validDurationOnFocusOnBlur}
                                        className="build-valid-duration-container"
                                        inputClassName="build-valid-duration-input"
                                        onNotifyValidationResult={this._validDurationNotifyValidationResult}
                                    />
                                    <span className="policy-branch-name-with-icon">
                                        <i className="icon bowtie-icon bowtie-tfvc-branch" />
                                        {this.state.friendlyBranchName}
                                    </span>
                                </FormatComponent>
                            ) as any,
                            checked: isExpiring,
                        },
                        {
                            key: "buddy",
                            disabled: (readonlyMode || isManual),
                            text: Resources.Never,
                            checked: isBuddy,
                        },
                    ]} />

                    
                <TextField
                    className={"policy-setting"}
                    disabled={readonlyMode}
                    value={settings.displayName || ""}
                    onChanged={this._displayNameOnChanged}
                    maxLength={displayNameMaxLength}
                    label={Resources.DisplayName} />

            </Panel>
        );
    }

    @autobind
    private _renderFooter(): JSX.Element {
        const disableSaveButton: boolean = !(this._settings.buildDefinitionId > 0);

        return <PanelFooter
            readonlyMode={this.state.readonlyMode}
            canSave={!disableSaveButton}
            onSaveClicked={this._saveOnClick}
            onCancelClicked={this._onDismiss} />;
    }

    @autobind
    private _isBlockingOnChange(ev: React.FormEvent<HTMLElement | HTMLInputElement>, option: IChoiceGroupOption) {
        this.setState({
            config: {
                ...this.state.config,
                isBlocking: (option.key === "true")
            }
        });
    }

    @autobind
    private _onPathFilterChanged(newValue: string[]) {
        const newSettings: Build.Settings = {
            ...this._settings,
            filenamePatterns: newValue,
        };

        this.setState({ config: { ...this.state.config, settings: newSettings } });
    }

    @autobind
    private _expirationTypeChoiceOnChange(ev?: React.FormEvent<HTMLElement | HTMLInputElement>, option?: IChoiceGroupOption): void {
        const newSettings: Build.Settings = { ...this._settings };

        switch (option.key) {
            case "strict":
                newSettings.queueOnSourceUpdateOnly = false;
                newSettings.validDuration = 0;
                break;

            case "expiring":
                newSettings.queueOnSourceUpdateOnly = true;
                newSettings.validDuration = this.state.mostRecentValidDuration;
                break;

            case "buddy":
                newSettings.queueOnSourceUpdateOnly = true;
                newSettings.validDuration = 0;
                break;

            default:
                break;
        }

        this.setState({ config: { ...this.state.config, settings: newSettings } });
    }

    @autobind
    private _validDurationOnFocusOnBlur(ev: React.FocusEvent<ITextFieldProps>): void {
        this.setState({ validDurationHasFocus: (ev.type === "focus") });
    }

    @autobind
    private _validDurationNotifyValidationResult(errorMessage: string, stringValue: string, numericValue?: number): void {
        if (numericValue !== undefined) {
            const minutes: number = Math.round(numericValue * 100) * 0.6;

            this._settings.validDuration = minutes;

            if (this.state.mostRecentValidDuration !== minutes) {
                this.setState({ mostRecentValidDuration: minutes });
            }
        }
    }

    @autobind
    private _definitionOnChange(buildDefinitionId: number): void {
        const newSettings: Build.Settings = {
            ...this._settings,
            buildDefinitionId,
        };

        this.setState({ config: { ...this.state.config, settings: newSettings } });
    }

    @autobind
    private _triggerOnChange(ev?: React.FormEvent<HTMLElement | HTMLInputElement>, option?: IChoiceGroupOption): void {
        const newSettings: Build.Settings = {
            ...this._settings,
            manualQueueOnly: (option.key === "true")
        };

        this.setState({ config: { ...this.state.config, settings: newSettings } });
    }

    private _validDurationInHoursTextValue(validDuration: number): string {
        const hrs = validDuration / 60;

        if (hrs > 0) {
            return "" + parseFloat(hrs.toFixed(2));
        }
        else {
            return "";
        }
    }

    @autobind
    private _displayNameOnChanged(newValue: any) {
        newValue = (newValue || null);

        if (newValue === this._settings.displayName) {
            return;
        }

        const newSettings: Build.Settings = {
            ...this._settings,
            displayName: newValue
        }

        this.setState({ config: { ...this.state.config, settings: newSettings } });
    }

    @autobind
    private _saveOnClick(): void {
        const config = this.state.config;
        const settings = this._settings;
        const addingNewPolicy = (config.id == null || config.id < 0);

        if (settings.manualQueueOnly) {
            // We hold onto settings like expiration time, isBlocking, etc when the user sets build to manual.
            // That way if they immediately turn manual off again, their settings are still there.
            // However, Manual builds are currently always optional / never expire. When the user saves, make
            // sure their settings reflect that.

            settings.queueOnSourceUpdateOnly = true;
            settings.validDuration = 0;
        }

        if (addingNewPolicy) {
            this.props.flux.actionCreator.createLocalPolicyConfig(config, true, MessageTarget.buildErrors, this);
        }
        else {
            this.props.flux.actionCreator.updateLocalPolicyConfig(
                config.id,
                (existingConfig: PolicyConfiguration) => {
                    existingConfig.isBlocking = config.isBlocking;
                    existingConfig.isEnabled = config.isEnabled;
                    existingConfig.settings = config.settings;
                },
                true,
                MessageTarget.buildErrors,
                this
            );
        }
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

    private get _settings(): Build.Settings {
        return this.state.config.settings as Build.Settings;
    }

    public componentDidMount(): void {
        this.props.flux.storesHub.adminPoliciesHubStore.addChangedListener(this._storesOnChanged);
        this.props.flux.storesHub.buildDefinitionStore.addChangedListener(this._storesOnChanged);
        this.props.flux.storesHub.policyConfigStore.addChangedListener(this._storesOnChanged);

        this.props.flux.actionsHub.showBuildPolicyEditDialog.addListener(this._onShowDialog);
        this.props.flux.actionsHub.dismissDialog.addListener(this._dismissDialog);
    }

    public componentWillUnmount(): void {
        this.props.flux.actionsHub.dismissDialog.removeListener(this._dismissDialog);
        this.props.flux.actionsHub.showBuildPolicyEditDialog.removeListener(this._onShowDialog);

        this.props.flux.storesHub.policyConfigStore.removeChangedListener(this._storesOnChanged);
        this.props.flux.storesHub.buildDefinitionStore.removeChangedListener(this._storesOnChanged);
        this.props.flux.storesHub.adminPoliciesHubStore.removeChangedListener(this._storesOnChanged);
    }

    @autobind
    private _storesOnChanged(): void {
        this.setState(this._getStateFromStores());
    }

    private _getStateFromStores(): BuildPolicyPanelContainerState {
        return {
            readonlyMode: this.props.flux.storesHub.adminPoliciesHubStore.readonlyMode,
            buildDefinitionsById: this.props.flux.storesHub.buildDefinitionStore.buildDefinitionsById,
            buildDefinitionsSorted: this.props.flux.storesHub.buildDefinitionStore.buildDefinitionsSorted,
            allDefinitionsLoaded: this.props.flux.storesHub.buildDefinitionStore.allDefinitionsLoaded,
            friendlyBranchName: this.props.flux.storesHub.adminPoliciesHubStore.friendlyBranchName,
        };
    }
}
