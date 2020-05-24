import * as React from "react";
import * as ReactDOM from "react-dom";
import { ChoiceGroup } from "OfficeFabric/ChoiceGroup";
import { IMessageBarProps, MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { IFeatureConfig, IFeatureConfigComponentProps } from "Presentation/Scripts/TFS/SkypeTeamTabs/IFeatureConfig";
import { FeatureInfoView } from "Presentation/Scripts/TFS/SkypeTeamTabs/FeatureInfoView";
import * as Resources from "Presentation/Scripts/TFS/Resources/TFS.Resources.Presentation";
import { format } from "VSS/Utils/String";
import { MSTeamsTheme } from "Presentation/Scripts/TFS/SkypeTeamTabs/MSTeamsTheme";
import { FeatureAvailabilityService } from "VSS/FeatureAvailability/Services";
import { FeatureAvailabilityFlags } from "Presentation/Scripts/TFS/Generated/TFS.Server.WebAccess.Constants";
import * as microsoftTeams from "@microsoft/teams-js";

// We use 'any' here because each feature config will implement their action creator and store
// differently from the other feature configs. Additionally, the TabConfigView does not care about
// specific types for these type variables since it merely passes the objects to the feature config
// components. It does not interrogate the objects.
export type FeatureConfigComponentProps = IFeatureConfigComponentProps<any, any>;
export type FeatureConfig = IFeatureConfig<any, any, FeatureConfigComponentProps>;

/**
 * Top-level component props interface.
 * This is responsible for providing the configs for rendering the radio button
 * group and accompanying right side component for each button.
 */
export interface ITabConfigViewProps {
    featureConfigs: IDictionaryStringTo<FeatureConfig>;
    account: string;
    defaultSelection: string;
}

/**
 * Maintains which radio button is selected indicating which feature config to render.
 */
export interface ITabConfigViewState {
    selectedRadioValue: string;
    msTeamsTheme: MSTeamsTheme;
}

/**
 * The top-level component that renders the configuration experience for configuring a tab for MS Teams.
 * Each feature config provided to this component is given a radio button, which, when selected, renders
 * the feature's config experience.
 */
export class TabConfigView extends React.Component<ITabConfigViewProps, ITabConfigViewState> {

    private eventChangedHandler: () => void;

    constructor(props: ITabConfigViewProps) {
        super(props);

        this.state = {
            selectedRadioValue : this.props.defaultSelection,
            msTeamsTheme: MSTeamsTheme.Default
        };

        this.eventChangedHandler = () => {
            let isValid = this.getConfig().store.isValueValid();
            microsoftTeams.settings.setValidityState(isValid);
            if (isValid) {
                microsoftTeams.settings.setSettings(this.getConfig().store.getTabSettings());
            }
            this.forceUpdate();
        }

        microsoftTeams.settings.registerOnSaveHandler((saveEvent: microsoftTeams.settings.SaveEvent) => {
            if (this.getConfig().onSave) {
                this.getConfig().onSave(saveEvent);
            } else {
                saveEvent.notifySuccess();
            }
        });
    }

    /**
     * Register the initial store to listen to for triggering re-renders.
     */
    public componentDidMount(): void {
        this.updateStoreObservation(this.state.selectedRadioValue);

        // Get the theme so custom styles can be applied everywhere.
        microsoftTeams.getContext((context: microsoftTeams.Context) => {
            if (context && context.theme) {
                this.setState({
                    selectedRadioValue: this.state.selectedRadioValue,
                    msTeamsTheme: context.theme as MSTeamsTheme // This cast assumes the SDK strings match our defined enum
                });
            }
        });
    }

    /**
     * get an error message from the active config's store if one exists.
     */
    private getErrorMessage(): JSX.Element {
        let activeConfigStore = this.getConfig().store;
        let errorMessage = activeConfigStore.getErrorMessage();
        let messageBar = null;
        if (errorMessage) {
            messageBar =
                <MessageBar
                    className={ "error-message-feature-tab" }
                    messageBarType={ MessageBarType.error }
                    onDismiss={() => activeConfigStore.dismissErrorMessage()}
                >
                    { errorMessage }
                </MessageBar>;
        }

        return messageBar;
    }

    /**
     * Render the full config view including account, radio group, feature details, and feature config.
     */
    public render(): JSX.Element {
        return <div className={"feature-tab-config-view" + " "  + this.state.msTeamsTheme}>
            { this.getErrorMessage() }
            <div className="account-text">{format(Resources.MSTeamsVSTSConfig_AccountText, this.props.account)}</div>
            {
                this.showFeatureSelection()
                    ? this.renderFeatureSelection()
                    : this.renderFeatureConfig()
            }
        </div>
    }

    private renderFeatureSelection(): JSX.Element {
        return <div className={"configuration-view"}>
            <div className="left-pane">
                <ChoiceGroup
                    options={Object.keys(this.props.featureConfigs).map(x => {
                        return {
                            key: this.props.featureConfigs[x].key,
                            text: this.props.featureConfigs[x].displayName
                        }
                    })}
                    selectedKey={this.state.selectedRadioValue}
                    onChange={(ev, selection) => this.onFeatureSelectionChange(selection.key)}
                />
            </div>
            <div className="right-pane">
                {this.renderFeatureConfig()}
            </div>
        </div>
    }

    private renderFeatureConfig() {
        const selectedFeatureConfig: FeatureConfig = this.getConfig();

        const props: FeatureConfigComponentProps = {
            actionCreator: selectedFeatureConfig.actionCreator,
            value: selectedFeatureConfig.store.getValue(),
            msTeamsTheme: this.state.msTeamsTheme
        };

        return <>
            <FeatureInfoView
                description={selectedFeatureConfig.description}
                learnMoreUrl={selectedFeatureConfig.learnMoreUrl}
                learnMoreText={selectedFeatureConfig.learnMoreText}
            />
            <selectedFeatureConfig.configComponent
                {...props}
            />
        </>
    }

    /**
     * Handles the radio button selection changing.
     * @param selectedValue the key for the radio button they selected.
     *      This should match the key to a feature config in props.featureConfigs.
     */
    private onFeatureSelectionChange(selectedValue: string): void {
        this.updateStoreObservation(selectedValue, this.state.selectedRadioValue);

        this.setState({
            selectedRadioValue : selectedValue,
            msTeamsTheme: this.state.msTeamsTheme
        }, this.eventChangedHandler);
    }

    /**
     * Updates which feature's store the component will listen to.
     * This keeps inactive feature configs from triggering updates after async events complete.
     * Both parameters should be keys to feature configs in the react props.
     * @param nextSelection The new selected radio button
     * @param previousSelection The old selected button
     */
    private updateStoreObservation(nextSelection: string, previousSelection?: string): void {
        if (nextSelection === previousSelection) {
            return;
        }

        if (previousSelection) {
            this.getConfig(previousSelection).store.removeChangedListener(this.eventChangedHandler);
        }

        this.getConfig(nextSelection).store.addChangedListener(this.eventChangedHandler);
    }

    private getConfig(key?: string): FeatureConfig {
        if (key) {
            return this.props.featureConfigs[key];
        }
        return this.props.featureConfigs[this.state.selectedRadioValue];
    }
    
    /**
     * Returns true if the radio button selectors allowing users to choose a feature should be rendered.
     * Returns false if only the selected feature config should be rendered.
     */
    private showFeatureSelection(): boolean {
        return Object.keys(this.props.featureConfigs).length > 1;
    }
}