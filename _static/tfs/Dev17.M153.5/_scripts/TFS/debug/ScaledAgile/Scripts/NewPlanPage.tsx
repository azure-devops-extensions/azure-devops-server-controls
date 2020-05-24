/// <reference types="react" />
/// <reference types="react-dom" />
import "VSS/LoaderPlugins/Css!ScaledAgile/Scripts/NewPlanPage";
import * as React from "react";
import * as ReactDOM from "react-dom";

import Events_Services = require("VSS/Events/Services");
import { Constants } from "ScaledAgile/Scripts/Generated/TFS.ScaledAgile.Constants";
import { VssIconType } from "VSSUI/VssIcon";
import { IPivotBarViewAction, PivotBarItem, PivotBarViewActionType } from "VSSUI/PivotBar";
import { Hub, IHub, IHubProps } from "VSSUI/Hub";
import { IVssHubViewStateOptions, VssHubViewState } from "VSSPreview/Utilities/VssHubViewState";
import { HubHeader, HubTileRegion, HubTextTile, IHubBreadcrumbItem } from "VSSUI/HubHeader";

import { HubEventNames, IHubEventArgs } from "VSS/Navigation/HubsService";
import { getPlansDirectoryUrl, onClickNavigationHandler } from "ScaledAgile/Scripts/Shared/Utils/PlanXhrNavigationUtils";
import { BasePage, IBasePageProps, IBasePageState } from "ScaledAgile/Scripts/BasePage";
import { PageLoadingState } from "ScaledAgile/Scripts/Shared/Models/PageInterfaces";
import { PageActions } from "ScaledAgile/Scripts/Shared/Actions/PageActions";
import { BasePageStore } from "ScaledAgile/Scripts/Main/Stores/BasePageStore";
import { ViewPerfScenarioManager } from "ScaledAgile/Scripts/Shared/Utils/Telemetry";

import * as ScaledAgileResources from "ScaledAgile/Scripts/Resources/TFS.Resources.ScaledAgile";
import { WizardStore } from "ScaledAgile/Scripts/Views/Wizard/Stores/WizardStore";
import { IWizardData } from "ScaledAgile/Scripts/Views/Wizard/Models/WizardInterfaces";
import { WizardActions } from "ScaledAgile/Scripts/Views/Wizard/Actions/WizardActions";
import { WizardActionCreator, IWizardActionCreator } from "ScaledAgile/Scripts/Views/Wizard/Actions/WizardActionsCreator";
import { PlansDataProvider } from "ScaledAgile/Scripts/Shared/DataProviders/PlansDataProvider";
import { PlanType } from "TFS/Work/Contracts";
import { init as initDeliveryTimelineWizard } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Components/DeliveryTimelineTeamSettings";
import { initCriteria } from "ScaledAgile/Scripts/Views/Wizard/DeliveryTimelineWizard/Components/DeliveryTimelineCriteria";

import { TextBox } from "ScaledAgile/Scripts/Shared/Components/TextBox";
import { MultilineTextBox } from "ScaledAgile/Scripts/Shared/Components/MultilineTextBox";
import { ButtonComponent } from "VSSPreview/Flux/Components/Button";
import { DefaultButton } from "OfficeFabric/Button";
import { VssIcon } from "VSSUI/VssIcon";
import { autobind } from "OfficeFabric/Utilities";

interface INewPlanPageProps extends IBasePageProps {
    wizardStore: WizardStore;
    wizardActionCreator: IWizardActionCreator;
}

interface INewPlanPageState extends IBasePageState {
    wizardStoreData: IWizardData;
}

class NewPlanPage extends BasePage<INewPlanPageProps, INewPlanPageState> {
    public static WIZARD_SECTION_CLASS = "wizard-section";
    public static WIZARD_CREATE_CONTAINER = "wizard-create-container cta";

    private _settings: JSX.Element;
    private _criteriaSettings: JSX.Element;

    private _hubViewState: VssHubViewState;

    constructor(props: INewPlanPageProps, context?: any) {
        super(props, context);
        (this.state as INewPlanPageState).wizardStoreData = this.props.wizardStore.getValue();
        this._hubViewState = new VssHubViewState({
            defaultPivot: Constants.PlansNewPagePivot,
            pivotNavigationParamName: Constants.PlansRouteParameterKey
        });
    }

    protected startScenario() {
        ViewPerfScenarioManager.startCreateWizardLoadScenario();
    }

    protected endScenario(): boolean {
        let handled = false;
        if (this.state) {
            if (this.state.pageLoadingState === PageLoadingState.WithMinimumData ||
                this.state.pageLoadingState === PageLoadingState.FullyLoaded) {
                ViewPerfScenarioManager.end();
                handled = true;
            }
            else if (this.state.pageLoadingState === PageLoadingState.Fail) {
                ViewPerfScenarioManager.abort();
                handled = true;
            }
        }
        return handled;
    }

    protected _getName(): string {
        return "new-plan-page";
    }

    public componentDidMount() {
        super.componentDidMount();
        this.props.wizardStore.addChangedListener(this._onWizardStoreChanged);
    }

    public componentWillUnmount() {
        super.componentWillUnmount();
        this.props.wizardStore.removeChangedListener(this._onWizardStoreChanged);
        this._onWizardStoreChanged = null;

        this._hubViewState.dispose();
    }

    protected _renderContent(): JSX.Element {
        return <Hub hubViewState={this._hubViewState} hideFullScreenToggle={true}>
            <HubHeader />
            <PivotBarItem itemKey={Constants.PlansNewPagePivot} name={ScaledAgileResources.NewDeliveryPlanLabel} className="bowtie wizard-container">
                <div className="wizard-title">
                    <VssIcon iconType={VssIconType.bowtie} iconName="plan" />
                    <span>{ScaledAgileResources.NewDeliveryPlanLabel}</span>
                </div>
                <div className="wizard-header">
                    {ScaledAgileResources.WizardPlanHeader + " "}
                    <a aria-label={ScaledAgileResources.LearnMoreLinkLabel} href="https://go.microsoft.com/fwlink/?linkid=839004" target="_blank" rel='noopener noreferrer'>
                        {ScaledAgileResources.LearnMoreLinkText}
                        <i className="bowtie-icon bowtie-navigate-external" />
                    </a>
                </div>
                <div className={NewPlanPage.WIZARD_SECTION_CLASS}>
                    <TextBox
                        id="wizardName"
                        className="wizard-input"
                        label={ScaledAgileResources.WizardNameLabel}
                        required={true}
                        value={this.state.wizardStoreData.name.value}
                        onChange={this._onNameChange}
                        isValid={!this.state.wizardStoreData.name.isDirty || this.state.wizardStoreData.name.isValid}
                        errorMessage={this._getNameErrorMessage()}
                        placeholderText={ScaledAgileResources.WizardPlanNamePlaceholder}
                        focusOnMount={true}
                    />
                </div>
                <div className={NewPlanPage.WIZARD_SECTION_CLASS}>
                    <MultilineTextBox
                        id="wizardDescription"
                        className="wizard-input"
                        label={ScaledAgileResources.WizardDescriptionLabel}
                        value={this.state.wizardStoreData.description.value}
                        onChange={this._onDescriptionChange}
                        isValid={this.state.wizardStoreData.description.isValid}
                        errorMessage={this._getDescriptionErrorMessage()}
                        placeholderText={ScaledAgileResources.WizardPlanDescriptionPlaceholder}
                    />
                </div>
                <div className={NewPlanPage.WIZARD_SECTION_CLASS}>
                    {this._getWizardSettings()}
                </div>
                <div className={NewPlanPage.WIZARD_SECTION_CLASS}>
                    {this._getCriteriaSettings()}
                </div>
                {this._renderButtons()}
            </PivotBarItem>
        </Hub>;
    }

    protected _renderButtons(): JSX.Element {
        let buttonText: string;
        let isButtonDisabled: boolean;
        let buttonIcon: string;
        if (this.state.wizardStoreData.isSaving) {
            buttonText = ScaledAgileResources.CreateViewButtonText_Saving;
            isButtonDisabled = true;
            buttonIcon = "bowtie-spinner";
        }
        else {
            buttonText = ScaledAgileResources.CreateViewButtonText;
            isButtonDisabled = !this.state.wizardStoreData.isValid;
        }

        return (
            <div className="new-plan-buttons">
                <ButtonComponent
                    cssClass={NewPlanPage.WIZARD_CREATE_CONTAINER}
                    iconCssClass={buttonIcon} text={buttonText}
                    onClick={this._onCreateClick}
                    disabled={isButtonDisabled}
                />
                <DefaultButton onClick={this._onCancelClick}>
                    Cancel
                </DefaultButton>
            </div >
        );
    }

    protected _getNameErrorMessage(): JSX.Element {
        if (!this.state.wizardStoreData.name.isValid) {
            return <span>{this.state.wizardStoreData.name.message}</span>;
        }
        return null;
    }

    protected _getDescriptionErrorMessage(): JSX.Element {
        if (!this.state.wizardStoreData.description.isValid) {
            return <span>{this.state.wizardStoreData.description.message}</span>;
        }
        return null;
    }

    @autobind
    protected _onWizardStoreChanged(wizardStore: WizardStore): void {
        this.setState({ wizardStoreData: wizardStore.getValue() } as INewPlanPageState);
    }

    @autobind
    protected _onNameChange(value: string): void {
        this.props.wizardActionCreator.nameChanged(value);
    }

    @autobind
    protected _onDescriptionChange(value: string): void {
        this.props.wizardActionCreator.descriptionChanged(value);
    }

    @autobind
    protected _onCreateClick(): void {
        this.props.wizardActionCreator.createPlan({
            name: this.state.wizardStoreData.name.value,
            description: this.state.wizardStoreData.description.value,
            viewType: this.state.wizardStoreData.viewType,
            viewProperties: {
                teamBacklogMappings: this.state.wizardStoreData.teamBacklogMappings.teamBacklogMappings,
                criteria: this.state.wizardStoreData.criteria.filterClauses
            }
        });
    }

    @autobind
    private _onCancelClick(event: React.MouseEvent<any>): void {
        onClickNavigationHandler(getPlansDirectoryUrl(), event);
    }

    private _getWizardSettings(): JSX.Element {
        if (!this._settings) {
            const viewType = this.state.wizardStoreData.viewType;
            if (viewType === PlanType.DeliveryTimelineView) {
                this._settings = initDeliveryTimelineWizard(this.props.pageActions);
            }
            else {
                throw new Error("Unknown view type: " + (viewType as PlanType).toString());
            }
        }
        return this._settings;
    }

    private _getCriteriaSettings(): JSX.Element {
        if (!this._criteriaSettings) {
            const viewType = this.state.wizardStoreData.viewType;
            if (viewType === PlanType.DeliveryTimelineView) {
                this._criteriaSettings = initCriteria(this.props.pageActions);
            }
            else {
                throw new Error("Unknown view type: " + (viewType as PlanType).toString());
            }
        }
        return this._criteriaSettings;
    }
}

export function initNewPlanPage(container: HTMLElement) {
    const historyService = Events_Services.getService();
    const pageActions = new PageActions();
    const pageStore = new BasePageStore(pageActions);
    const wizardActions = new WizardActions();
    const wizardActionCreator = new WizardActionCreator(new PlansDataProvider(), wizardActions, pageActions);
    const wizardStore = new WizardStore(wizardActions);

    const preXhrNavigateHandler = (sender: any, args: IHubEventArgs) => {
        ReactDOM.unmountComponentAtNode(container);
        historyService.detachEvent(HubEventNames.PreXHRNavigate, preXhrNavigateHandler);
    };

    ReactDOM.render(<NewPlanPage
        pageActions={pageActions}
        pageStore={pageStore}
        wizardStore={wizardStore}
        wizardActionCreator={wizardActionCreator}
    />, container);

    historyService.attachEvent(HubEventNames.PreXHRNavigate, preXhrNavigateHandler);
}
