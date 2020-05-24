// css
import "VSS/LoaderPlugins/Css!Policy/Scenarios/AdminPolicies/AdminPoliciesHub";
import "VSS/LoaderPlugins/Css!Policy/Scenarios/AdminPolicies/AutomaticReviewersPolicyPanelContainer";

// libs
import { autobind, css } from "OfficeFabric/Utilities";
import * as React from "react";
import { Debug } from "VSS/Diag";
import { format } from "VSS/Utils/String";

// contracts
import { MessageTarget } from "Policy/Scenarios/AdminPolicies/Stores/MessageStore";
import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { AutomaticReviewers } from "Policy/Scripts/PolicyTypes";
import { IEntity } from "VSS/Identities/Picker/RestClient";

// controls
import { CommandButton, DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { IChoiceGroupOption } from "OfficeFabric/ChoiceGroup";
import { Dialog, DialogFooter } from "OfficeFabric/Dialog";
import { Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/Link";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Panel, PanelType } from "OfficeFabric/Panel";
import { TextField } from "OfficeFabric/TextField";
import { IdentityPicker } from "Policy/Scenarios/AdminPolicies/Components/IdentityPicker";
import { MessageListContainer } from "Policy/Scenarios/AdminPolicies/MessageListContainer";
import { PanelFooter } from "Policy/Scenarios/Shared/PanelFooter";
import { PathFilter } from "Policy/Scenarios/Shared/PathFilter";
import { PolicyRequirement } from "Policy/Scenarios/Shared/PolicyRequirement";

// scenario
import { Flux, StoresHub, Actions, ActionCreationSignatures } from "Policy/Scenarios/AdminPolicies/Flux";
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

// stores
import { IdentityStore } from "Policy/Scenarios/AdminPolicies/Stores/IdentityStore";

export interface AutomaticReviewersPolicyPanelContainerProps {
    flux: Flux;
}

export interface AutomaticReviewersPolicyPanelContainerState {
    // User has no permission to edit
    readonlyMode?: boolean;

    // Policy config being edited
    config?: PolicyConfiguration;

    // Dialog is open
    panelIsOpen?: boolean;

    // Go back where we came from
    elementToFocusOnDismiss?: HTMLElement;

    // Set a max length for display name, but we need to support existing policies where the display name is too long
    messageMaxLength?: number;

    // User asked for these reviewers, but they can't be reviewers for one reason or another
    invalidIdentityDisplayNames?: string[];

    // User asked for these AAD groups and we are trying to get TFIDs for them
    pendingAadGroups?: IEntity[];
}

export class AutomaticReviewersPolicyPanelContainer
    extends React.Component<
    AutomaticReviewersPolicyPanelContainerProps,
    AutomaticReviewersPolicyPanelContainerState>{

    constructor(props: AutomaticReviewersPolicyPanelContainerProps) {
        super(props);

        this.state = {
            ...this._getStateFromStores(),

            invalidIdentityDisplayNames: [],
            pendingAadGroups: [],
        };
    }

    private _calloutTarget: HTMLElement;

    public static readonly DefaultMessageMaxLength: number = 4000;

    public static readonly identityPickerConsumerId = "da410659-1b4b-4e74-981f-be6133591b43";

    @autobind
    private _onShowDialog(payload: Actions.ShowPolicyEditDialogPayload): void {
        const config: PolicyConfiguration = payload.config;
        const settings: AutomaticReviewers.Settings = config.settings as AutomaticReviewers.Settings;

        if (config.type.id !== AutomaticReviewers.Id) {
            Debug.fail("Policy config has wrong type id");
            return;
        }

        // These let the user edit an existing policy with a string which is too long, but not create a new one.
        // If they do edit a value which is too long, they won't be able to make it longer.

        const messageMaxLength: number =
            Math.max((settings.message || "").length, AutomaticReviewersPolicyPanelContainer.DefaultMessageMaxLength);

        if (!this.state.panelIsOpen) {
            this.setState({
                panelIsOpen: true,
                config: config,
                elementToFocusOnDismiss: payload.elementToFocusOnDismiss,
                messageMaxLength: messageMaxLength,
                invalidIdentityDisplayNames: [],
                pendingAadGroups: []
            });
        }
    }

    public render(): JSX.Element {
        const {
            readonlyMode,
            config,
            messageMaxLength,
            invalidIdentityDisplayNames,
            pendingAadGroups,
        } = this.state;

        if (config == null) {
            return null;
        }

        const addingNewPolicy: boolean = (config.id == null || config.id < 1);

        const settings: AutomaticReviewers.Settings = this._settings;

        const dialogTitle = addingNewPolicy ? Resources.AddAutomaticReviewersPolicy : Resources.EditAutomaticReviewersPolicy;

        return (
            <Panel
                headerText={dialogTitle}
                isOpen={this.state.panelIsOpen}
                className={css("policy-panel", "reviewers-policy-dialog-container")}
                type={PanelType.medium}
                isLightDismiss={false}
                isFooterAtBottom={true}
                onRenderFooterContent={this._renderFooter}
                onDismissed={this._onDismiss}
                isBlocking={true}
                elementToFocusOnDismiss={this.state.elementToFocusOnDismiss}
                closeButtonAriaLabel={Resources.PanelCloseButtonAriaLabel} >

                {/* Message center */}

                <MessageListContainer flux={this.props.flux} messageTarget={MessageTarget.reviewersErrors} />

                {/* Invalid reviewer identities */}

                {invalidIdentityDisplayNames.map((name, index) => (
                    <MessageBar
                        key={"invalid" + index}
                        messageBarType={MessageBarType.error}
                    >{format(Resources.AutomaticReviewersInvalidReviewerName, name)}</MessageBar>
                ))}

                {pendingAadGroups.map((identity, index) => (
                    <MessageBar
                        key={"pending" + index}
                        messageBarType={MessageBarType.info}
                    >{format(Resources.AutomaticReviewersPendingReviewerName, identity.displayName)}</MessageBar>
                ))}

                {/* Reviewers picker */}

                <div key="pickerContainer" className={css("policy-setting", "reviewers-picker-container")}>
                    <Label required>{Resources.Reviewers}</Label>

                    <IdentityPicker
                        className={"reviewers-picker"}
                        readOnlyMode={readonlyMode}
                        defaultEntities={settings.requiredReviewerIds}
                        consumerId={AutomaticReviewersPolicyPanelContainer.identityPickerConsumerId}
                        includeGroups={true}
                        multiIdentitySearch={true}
                        minRequired={1}
                        identityStore={this.props.flux.storesHub.identityStore}
                        cacheIdentity={this.props.flux.actionCreator.cacheIdentity}
                        materializeAadGroup={this.props.flux.actionCreator.materializeAadGroup}
                        identitiesUpdated={this._reviewerIdentitiesUpdated} />
                </div>

                {/* Path filter */}

                <PathFilter
                    className={"policy-setting"}
                    readonlyMode={readonlyMode}
                    filenamePatterns={settings.filenamePatterns}
                    onChanged={this._onPathFilterChanged}
                />

                {/* Required / optional policy */}

                <PolicyRequirement
                    className={"policy-setting"}
                    readonlyMode={readonlyMode}
                    onChange={this._isBlockingOnChange}
                    requiredDetails={Resources.EditAutomaticReviewersRequiredDetail}
                    optionalDetails={Resources.EditAutomaticReviewersOptionalDetail}
                    isBlocking={config.isBlocking} />

                {/* Custom policy message */}

                <TextField
                    className={"policy-setting"}
                    readOnly={readonlyMode}
                    value={settings.message || ""}
                    onChanged={this._messageOnChanged}
                    maxLength={messageMaxLength}
                    label={Resources.CustomMessage} />
            </Panel>
        );
    }

    @autobind
    private _renderFooter(): JSX.Element {
        const { invalidIdentityDisplayNames, pendingAadGroups } = this.state;
        const settings: AutomaticReviewers.Settings = this._settings;

        const disableSaveButton: boolean =
            !settings.requiredReviewerIds
            || settings.requiredReviewerIds.length < 1
            || invalidIdentityDisplayNames.length > 0
            || pendingAadGroups.length > 0;

        return <PanelFooter
            readonlyMode={this.state.readonlyMode}
            canSave={!disableSaveButton}
            onSaveClicked={this._saveOnClick}
            onCancelClicked={this._onDismiss} />;
    }

    @autobind
    private _reviewerIdentitiesUpdated(validIdentities: string[], invalidIdentityNames: string[], pendingAadGroups: IEntity[]) {
        if (!this.state.config) {
            // The identity picker control likes to send us one last update after this dialog has already closed.
            return;
        }

        const newSettings: AutomaticReviewers.Settings = {
            ...this._settings,
            requiredReviewerIds: validIdentities
        };

        this.setState({
            config: { ...this.state.config, settings: newSettings },
            invalidIdentityDisplayNames: invalidIdentityNames,
            pendingAadGroups: pendingAadGroups
        });
    }

    @autobind
    private _isBlockingOnChange(ev: React.FormEvent<HTMLElement | HTMLInputElement>, option: IChoiceGroupOption): void {
        this.setState({
            config: {
                ...this.state.config,
                isBlocking: (option.key === "true")
            }
        });
    }

    @autobind
    private _onPathFilterChanged(newValue: string[]) {
        const newSettings: AutomaticReviewers.Settings = {
            ...this._settings,
            filenamePatterns: newValue,
        };

        this.setState({ config: { ...this.state.config, settings: newSettings } });
    }

    @autobind
    private _messageOnChanged(newValue: any) {
        newValue = (newValue || null);

        if (newValue !== this._settings.message) {
            const newSettings: AutomaticReviewers.Settings = {
                ...this._settings,
                message: newValue
            };

            this.setState({ config: { ...this.state.config, settings: newSettings } });
        }
    }

    @autobind
    private _saveOnClick(): void {
        const config: PolicyConfiguration = this.state.config;
        const addingNewPolicy: boolean = (config.id == null || config.id < 0);

        if (addingNewPolicy) {
            this.props.flux.actionCreator.createLocalPolicyConfig(config, true, MessageTarget.reviewersErrors, this);
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
                MessageTarget.reviewersErrors,
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

    private get _settings(): AutomaticReviewers.Settings {
        return this.state.config.settings as AutomaticReviewers.Settings;
    }

    public componentDidMount(): void {
        this.props.flux.storesHub.adminPoliciesHubStore.addChangedListener(this._storesOnChanged);
        this.props.flux.storesHub.identityStore.addChangedListener(this._identitiesChanged);

        this.props.flux.actionsHub.showAutomaticReviewersPolicyEditDialog.addListener(this._onShowDialog)
        this.props.flux.actionsHub.dismissDialog.addListener(this._dismissDialog)
    }

    public componentWillUnmount(): void {
        this.props.flux.actionsHub.dismissDialog.removeListener(this._dismissDialog)
        this.props.flux.actionsHub.showAutomaticReviewersPolicyEditDialog.removeListener(this._onShowDialog)

        this.props.flux.storesHub.identityStore.removeChangedListener(this._identitiesChanged);
        this.props.flux.storesHub.adminPoliciesHubStore.removeChangedListener(this._storesOnChanged);
    }

    @autobind
    private _storesOnChanged(): void {
        this.setState(this._getStateFromStores());
    }

    @autobind
    private _identitiesChanged(): void {
        let hasChanges: boolean = false;
        let newPendingGroups: IEntity[] = [];
        let newInvalidIdentityNames: string[] = [];
        let newValidIdentities: string[] = [];

        let store: IdentityStore = this.props.flux.storesHub.identityStore;

        this.state.pendingAadGroups.forEach((identity: IEntity) => {
            if (store.isAadGroupPendingMaterialization(identity)) {
                newPendingGroups.push(identity);
            }
            else {
                hasChanges = true;
                if (store.hasAadGroupMaterializationFailed(identity)) {
                    newInvalidIdentityNames.push(identity.displayName);
                }
                else {
                    let tfid: string = store.getTfidForAadGroup(identity);
                    if (tfid) {
                        newValidIdentities.push(tfid);
                    }
                }
            }
        });

        if (hasChanges) {
            //append the existing items
            newInvalidIdentityNames.push(...this.state.invalidIdentityDisplayNames);
            newValidIdentities.push(...this._settings.requiredReviewerIds);

            //update the state
            const newSettings: AutomaticReviewers.Settings = {
                ...this._settings,
                requiredReviewerIds: newValidIdentities
            };

            this.setState({
                config: { ...this.state.config, settings: newSettings },
                invalidIdentityDisplayNames: newInvalidIdentityNames,
                pendingAadGroups: newPendingGroups
            });
        }
    }

    private _getStateFromStores(): AutomaticReviewersPolicyPanelContainerState {
        return {
            readonlyMode: this.props.flux.storesHub.adminPoliciesHubStore.readonlyMode,
        };
    }
}
