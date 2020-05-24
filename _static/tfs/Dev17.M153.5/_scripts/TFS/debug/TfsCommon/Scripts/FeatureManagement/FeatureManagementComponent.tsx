import "VSS/LoaderPlugins/Css!fabric"
import "VSS/LoaderPlugins/Css!TfsCommon/FeatureManagement/FeatureManagement";

import * as React from "react";
import * as ReactDOM from "react-dom";

import * as ComponentBase from "VSS/Flux/Component";
import * as Context from "VSS/Context";
import * as FeatureManagement_Contracts from "VSS/FeatureManagement/Contracts";
import * as Resources from "TfsCommon/Scripts/Resources/TFS.Resources.TfsCommon";
import * as VSS from "VSS/VSS";
import * as StringUtils from "VSS/Utils/String";

import * as Actions from "TfsCommon/Scripts/FeatureManagement/FeatureManagementActions";
import { FeaturesStore, IFeatureStatesUpdatedEvent } from "TfsCommon/Scripts/FeatureManagement/FeatureManagementStore";

import { DefaultButton, PrimaryButton } from "OfficeFabric/Button";
import { Dropdown, IDropdownOption } from "OfficeFabric/Dropdown";
import { Dialog, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { Fabric } from "OfficeFabric/Fabric";
import { FocusZone } from "OfficeFabric/FocusZone";
import { Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/Link";
import { List } from "OfficeFabric/List";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { Panel, PanelType } from "OfficeFabric/Panel";
import { TextField } from "OfficeFabric/TextField";
import { Toggle } from "OfficeFabric/Toggle";

interface IFeatureComponentProps extends ComponentBase.Props {
    featuresStore: FeaturesStore;
    feature: FeatureManagement_Contracts.ContributedFeature;
    highlight: boolean;
    scope: Actions.IFeatureManagementScope;
    collectFeedback: boolean;
}

interface IFeatureComponentState {
    featureState?: FeatureManagement_Contracts.ContributedFeatureState;
    errorText?: string;
    confirmScopeMessage?: string;
    confirmDialogTitle?: string;
    confirmButtonText?: string;
    collectFeedback?: boolean;
    hasBeenToggled?: boolean;
}

class FeatureComponent extends React.Component<IFeatureComponentProps, IFeatureComponentState> {

    private _feedbackText: string;

    constructor(props: IFeatureComponentProps) {
        super(props);
        this.state = {};
    }

    public componentDidMount() {
        this.setState({
            featureState: this.props.featuresStore.getFeatureState(this.props.feature.id, this.props.scope),
        });
        this.props.featuresStore.addListener(FeaturesStore.FeatureStatesUpdatedEvent, this._onFeatureStateChanged);
    }

    public componentWillUnmount() {
        this.props.featuresStore.removeListener(FeaturesStore.FeatureStatesUpdatedEvent, this._onFeatureStateChanged);
    }

    public render(): JSX.Element {
        return <div className={"feature" + (this.props.highlight ? " highlighted-feature" : "")}>
            <div className="feature-header">
                <div className="feature-name">{this.props.feature.name}</div>
                <Toggle
                    className={this.state.featureState ? undefined : "loading"}
                    aria-disabled={this.state.featureState ? undefined : true}
                    onText={Resources.ManageFeaturesOnLabel}
                    offText={Resources.ManageFeaturesOffLabel}
                    onAriaLabel={StringUtils.format(Resources.ToggleFeatureOnAriaLabelFormat, this.props.feature.name) + " " + this.props.feature.description}
                    offAriaLabel={StringUtils.format(Resources.ToggleFeatureOffAriaLabelFormat, this.props.feature.name) + " " + this.props.feature.description}
                    checked={this.state.featureState && this.state.featureState.state === FeatureManagement_Contracts.ContributedFeatureEnabledValue.Enabled}
                    onChanged={this._onToggleChanged.bind(this)}
                    disabled={!this.props.scope.canManage || (this.state.featureState && this.state.featureState.overridden)}
                    title={this.state.featureState && this.state.featureState.reason}
                    />
            </div>
            <div className="feature-description">
                <span>{this.props.feature.description}</span>
                {
                    (this.props.feature._links && this.props.feature._links.learn) ?
                        <Link
                            href={this.props.feature._links.learn.href}
                            className="learn-more"
                            aria-label={StringUtils.format(Resources.FeatureLearnMoreAriaLabel, this.props.feature.name)}
                            target="_blank">{Resources.LearnMore}</Link> : null
                }
            </div>
            {
                this.state.errorText ?
                    <MessageBar
                        className="feature-toggle-error"
                        messageBarType={MessageBarType.error}
                        onDismiss={() => { this.setState({ errorText: null }); } }>
                        {this.state.errorText}</MessageBar> : null
            }
            {
                (this.state.confirmDialogTitle) ?
                    <Dialog
                        isOpen={true}
                        type={DialogType.normal}
                        isBlocking={true}
                        title={this.state.confirmDialogTitle}
                        onDismiss={this._closeConfirmDialog.bind(this, false)}
                        containerClassName="feature-feedback-dialog"
                    >
                        {
                            this.state.confirmScopeMessage ?
                                <MessageBar
                                    className="feature-toggle-error"
                                    messageBarType={MessageBarType.warning}>{this.state.confirmScopeMessage}</MessageBar> : null
                        }
                        {
                            this.state.collectFeedback ?
                                <TextField
                                    className="feature-feedback-text"
                                    label={Resources.TurnOffFeatureDialogLabel}
                                    multiline={true}
                                    resizable={false}
                                    onChanged={(text) => { this._feedbackText = text; }}
                                /> : null
                        }
                        <DialogFooter>
                            <PrimaryButton onClick={this._closeConfirmDialog.bind(this, true)}>{this.state.confirmButtonText}</PrimaryButton>
                            <DefaultButton onClick={this._closeConfirmDialog.bind(this, false)}>{Resources.CancelButtonText}</DefaultButton>
                        </DialogFooter>
                    </Dialog> : null
            }
        </div>;
    }

    private _onFeatureStateChanged = (sender, updateEvent: IFeatureStatesUpdatedEvent): void => {
        if (!updateEvent.featureId || updateEvent.featureId === this.props.feature.id) {
            let error = this.props.featuresStore.getFeatureStateUpdateError(this.props.feature.id, this.props.scope);
            this.setState({
                featureState: this.props.featuresStore.getFeatureState(this.props.feature.id, this.props.scope),
                errorText: error ? VSS.getErrorMessage(error) : null
            });
        }
    };

    private _closeConfirmDialog(toggle: boolean) {

        this.setState({
            collectFeedback: false,
            confirmDialogTitle: null,
            confirmScopeMessage: null,
            confirmButtonText: null
        });

        if (toggle) {

            const newState = this.state.featureState.state === FeatureManagement_Contracts.ContributedFeatureEnabledValue.Enabled ?
                FeatureManagement_Contracts.ContributedFeatureEnabledValue.Disabled :
                FeatureManagement_Contracts.ContributedFeatureEnabledValue.Enabled;

            this._toggleFeatureState(newState, this._feedbackText);
        }
    }

    private _onToggleChanged() {

        if (!this.state.featureState) {
            return;
        }

        const newState = this.state.featureState.state === FeatureManagement_Contracts.ContributedFeatureEnabledValue.Enabled ?
            FeatureManagement_Contracts.ContributedFeatureEnabledValue.Disabled :
            FeatureManagement_Contracts.ContributedFeatureEnabledValue.Enabled;

        this._feedbackText = null;

        const turnOff = newState === FeatureManagement_Contracts.ContributedFeatureEnabledValue.Disabled;
        const collectFeedback = turnOff && this.props.collectFeedback && !this.state.hasBeenToggled;

        let confirmScopeMessage = this.props.scope.scopeWarningText;
        if (collectFeedback || confirmScopeMessage) {
            this.setState({
                collectFeedback: collectFeedback,
                confirmDialogTitle: StringUtils.format(turnOff ? Resources.TurnOffFeatureDialogTitleFormat : Resources.TurnOnFeatureDialogTitleFormat, this.props.feature.name),
                confirmScopeMessage: confirmScopeMessage,
                confirmButtonText: turnOff ? Resources.TurnOffFeatureButtonText : Resources.TurnOnFeatureButtonText
            });
        }
        else {
            this._toggleFeatureState(newState, null);
        }
    }

    private _toggleFeatureState(newState: FeatureManagement_Contracts.ContributedFeatureEnabledValue, feedbackText: string) {

        const update: Actions.IFeatureStateUpdate = {
            feature: this.props.feature,
            scope: this.props.scope,
            scopeValue: this.props.featuresStore.state.scopeValues[this.props.scope.featureScope.settingScope],
            newState: newState,
            reason: feedbackText
        };

        Actions.FeatureManagementActionCreator.updateFeatureState(update);

        if (!this.state.hasBeenToggled) {
            // Remember that this feature has been toggled. We want to prevent showing the telemetry dialog
            // in the case that someone enables then disables the feature without closing the management UI.
            this.setState({
                hasBeenToggled: true
            });
        }
    }
}

interface IFeaturesListComponentProps extends ComponentBase.Props {
    featuresStore: FeaturesStore;
    features: FeatureManagement_Contracts.ContributedFeature[];
    scope: Actions.IFeatureManagementScope;
    collectFeedback: boolean;
    highlightFeatureId?: string;
}

interface IFeaturesListComponentState {
}

class FeaturesListComponent extends React.Component<IFeaturesListComponentProps, IFeaturesListComponentState> {

    constructor(props: IFeaturesListComponentProps) {
        super(props);

        this.state = {};
    }

    public render(): JSX.Element {
        return (
            <FocusZone>
                <List
                    className={"features-list"}
                    items={this.props.features || []}
                    onRenderCell={this._onRenderCell}
                    />
            </FocusZone>
        );
    }

    private _onRenderCell = (item?: any, index?: number): React.ReactNode => {
        const feature = item as FeatureManagement_Contracts.ContributedFeature;
        return (
             <FeatureComponent
                    key={feature.id}
                    featuresStore={this.props.featuresStore}
                    feature={feature}
                    scope={this.props.scope}
                    highlight={this.props.highlightFeatureId === feature.id}
                    collectFeedback={this.props.collectFeedback && feature.id.substr(0, 3) === "ms."}
                    />
        );
    }
}

export interface IFeatureManagementPanelComponentProps extends ComponentBase.Props {
    featuresStore: FeaturesStore;
    onClose?: () => void;
    initialSelectedFeatureId?: string;
}

export interface IFeatureManagementPanelComponentState {
    showPanel?: boolean;
    features?: FeatureManagement_Contracts.ContributedFeature[];
    devModeFeatures?: FeatureManagement_Contracts.ContributedFeature[];
    scopes?: Actions.IFeatureManagementScope[];
    selectedScope?: Actions.IFeatureManagementScope;
}

export class FeatureManagementPanelComponent extends React.Component<IFeatureManagementPanelComponentProps, IFeatureManagementPanelComponentState> {

    constructor(props: IFeatureManagementPanelComponentProps) {
        super(props);
        this.state = {
            showPanel: true
        };
    }

    public componentDidMount() {
        this.props.featuresStore.addChangedListener(this._onFeaturesStoreChanged);
    }

    public componentWillUnmount() {
        this.props.featuresStore.removeChangedListener(this._onFeaturesStoreChanged);
    }

    public render(): JSX.Element {
        const selectedScope = this.state.selectedScope;

        return <Fabric>
            <Panel
                isOpen={this.state.showPanel}
                isLightDismiss={true}
                headerClassName="features-panel-header"
                className="features-panel"
                type={PanelType.medium}
                headerText={Context.getPageContext().webAccessConfiguration.isHosted ? Resources.ManageFeaturesHeader : Resources.ManageFeaturesHeaderOnPrem}
                onDismiss={this._closePanel.bind(this)}
                closeButtonAriaLabel={Resources.CloseButtonLabel}
                >
                <div className="feature-management-container">
                    {
                        !this.state.scopes ?
                            <Label className="feature-message">{Resources.Loading}</Label> :
                            <div>
                                <Label>{Context.getPageContext().webAccessConfiguration.isHosted ? Resources.ManageFeaturesSubHeading : Resources.ManageFeaturesSubHeadingOnPrem}</Label>
                                {
                                    this.state.scopes.length <= 1 ?
                                        null :
                                        <div className="feature-scope-dropdown">
                                            <Dropdown
                                                label={null}
                                                ariaLabel={Resources.FeatureScope}
                                                options={this.state.scopes.map((scope, index) => {
                                                    return {
                                                        key: scope.displayName,
                                                        index: index,
                                                        text: scope.displayName,
                                                    }
                                                })}
                                                onChanged={this._onScopeChanged}
                                                selectedKey={selectedScope && selectedScope.displayName}
                                                />
                                        </div>
                                }
                                {
                                    this.state.selectedScope && !this.state.selectedScope.canManage ?
                                        <MessageBar
                                            className="scope-no-write-permission-message"
                                            messageBarType={MessageBarType.info}
                                        >{Resources.NoFeatureScopeWritePermission}</MessageBar> : null
                                }
                                {
                                    !this.state.features || !this.state.features.length ?
                                        <Label className="feature-message">{Resources.NoFeaturesAvailable}</Label> :
                                        <FeaturesListComponent
                                            featuresStore={this.props.featuresStore}
                                            features={this.state.features}
                                            scope={this.state.selectedScope}
                                            collectFeedback={Context.getPageContext().webAccessConfiguration.isHosted}
                                            highlightFeatureId={this.props.initialSelectedFeatureId}
                                            />
                                }
                                {
                                    !this.state.devModeFeatures || !this.state.devModeFeatures.length ?
                                        null :
                                        <div className="dev-mode-features">
                                            <Label className="dev-mode-label" title={Resources.DevModeFeaturesHeaderTooltip}>{Resources.DevModeFeaturesHeader}</Label>
                                            <FeaturesListComponent
                                                featuresStore={this.props.featuresStore}
                                                features={this.state.devModeFeatures}
                                                scope={this.state.selectedScope}
                                                collectFeedback={false}
                                                highlightFeatureId={this.props.initialSelectedFeatureId}
                                                />
                                        </div>
                                }
                            </div>
                    }
                </div>
            </Panel>
        </Fabric>;
    }

    private _onFeaturesStoreChanged = (): void => {
        let scopes = this.props.featuresStore.state.scopes;

        if (scopes && scopes.length) {

            let selectedScope = scopes[0];
            if (scopes.length > 1 && this.props.initialSelectedFeatureId) {

                // Find the selected feature and pick the first scope at which it can be managed
                let selectedFeature = this.props.featuresStore.getFeatureById(this.props.initialSelectedFeatureId);
                if (selectedFeature) {

                    for (let scope of scopes) {
                        if (selectedFeature.scopes.filter(s => s.userScoped === scope.featureScope.userScoped && s.settingScope === scope.featureScope.settingScope).length) {
                            selectedScope = scope;
                            break;
                        }
                    }
                }
            }

            // Can't fire an action within another action, so queue up setting the scope
            window.setTimeout(() => {
                this._setSelectedScope(selectedScope, scopes);
            }, 0);
        }
        else {
            this.setState({
                selectedScope: null,
                features: null,
                scopes: scopes
            });
        }
    };

    private _onScopeChanged = (option: IDropdownOption): void => {
        const selectedScope = this.state.scopes[option.index];
        this._setSelectedScope(selectedScope);
    }

    private _setSelectedScope(scope: Actions.IFeatureManagementScope, allScopes?: Actions.IFeatureManagementScope[]) {
        let features = this.props.featuresStore.getFeaturesForScope(scope);
        let devFeatures = this.props.featuresStore.getDevModeFeaturesForScope(scope);

        let stateUpdate: IFeatureManagementPanelComponentState = {
            selectedScope: scope,
            features: features,
            devModeFeatures: devFeatures
        };

        if (allScopes) {
            stateUpdate.scopes = allScopes;
        }

        this.setState(stateUpdate);

        if (features.length) {
            Actions.FeatureManagementActionCreator.loadFeatureStates(features, scope, this.props.featuresStore.state.scopeValues);
        }

        if (devFeatures.length) {
            Actions.FeatureManagementActionCreator.loadFeatureStates(devFeatures, scope, this.props.featuresStore.state.scopeValues);
        }
    }

    private _closePanel() {
        this.setState({ showPanel: false });
        if (this.props.onClose) {
            this.props.onClose.call(this);
        }
    }
}