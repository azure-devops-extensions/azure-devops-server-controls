import * as React from "react";
import * as ReactDOM from "react-dom";

import { autobind, BaseComponent, IBaseProps } from "OfficeFabric/Utilities";
import { Fabric } from "OfficeFabric/Fabric";
import { Dialog, IDialogProps, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { Dropdown, IDropdownOption, DropdownMenuItemType } from "OfficeFabric/Dropdown";

import { getDashboardTeamContext } from "Dashboards/Scripts/Common";
import { getDefaultWebContext } from "VSS/Context";

import * as Utils_String from "VSS/Utils/String";
import { Dashboard } from "TFS/Dashboards/Contracts";
import * as Resources from "Dashboards/Scripts/Resources/TFS.Resources.Dashboards";
import TFS_Core_Contracts = require("TFS/Core/Contracts");
import { ICreateDashboardDialogContext, CreateDashboardDialogContext } from "Dashboards/Components/Shared/CreateDashboardDialog/CreateDashboardDialogContext";
import { CreatedDashboardItem } from "Dashboards/Components/Shared/CreateDashboardDialog/CreateDashboardDialogModels";
import { DashboardNameField, DashboardDescriptionField, DashboardDialogConstants, DashboardDialogMessageBar, DashboardDialogOkButton, DashboardDialogCancelButton, DashboardAutoRefreshCheckbox } from "Dashboards/Components/Shared/DialogComponents";
import { registerLWPComponent } from "VSS/LWP";

import "VSS/LoaderPlugins/Css!Dashboards/Components/Shared/CreateDashboardDialog/CreateDashboardDialog";

export function show(props?: ICreateDashboardDialogProps): void {
    containerNode = document.createElement("div");
    document.body.appendChild(containerNode);
    ReactDOM.render(<CreateDashboardDialog {...props} />, containerNode);
}

/**
 * Closes the create dashboard dialog.
 */
export function close(): void {
    if (containerNode) {
        ReactDOM.unmountComponentAtNode(containerNode);
        containerNode.parentElement.removeChild(containerNode);
        containerNode = null;
        CreateDashboardDialogContext.clearInstance();
    }
}

export interface ICreateDashboardDialogProps extends IBaseProps {
    // allow the user to select a team from the team picker. Defaults to false if nothing is provided (the team appears but is disabled)
    // If a selection is made in the picker thats the team in whose context the dashboard is created.
    allowTeamSelection?: boolean;

    // callback for when the dashboard is created successfully
    onDashboardCreated?(dashboard: CreatedDashboardItem): void;

    // callback for when the dialog is closed without creating a dashboard
    onDismiss?(): void;
}


interface CreateDashboardDialogState {
    isChecked: boolean;
    name: string;
    description: string;
    errorMessage: string;
    teamId: string;
    teamName: string;
    hasInvalidNameField: boolean;
    hasInvalidDescriptionField: boolean;
    isSaving: boolean;
}

var containerNode: HTMLElement = null;

class CreateDashboardDialog extends BaseComponent<ICreateDashboardDialogProps, CreateDashboardDialogState> {

    private controlContext: ICreateDashboardDialogContext;

    public constructor(props: ICreateDashboardDialogProps) {
        super(props);

        this.controlContext = CreateDashboardDialogContext.getInstance();
        this.controlContext.actionCreator.loadTeamsForPicker();
        let teamContext = getDashboardTeamContext();
        // Use empty string if team cant be found. This is less than ideal but prevents a null access exception. TODO #1374386.
        if (!teamContext) {
            teamContext = {
                id: "",
                name: ""
            };
        }

        this.state = {
            name: "",
            teamName: teamContext.name,
            teamId: teamContext.id
        } as CreateDashboardDialogState;
    }

    public componentDidMount(): void {
        super.componentDidMount();
        this.controlContext.store.addChangedListener(this.createDashboardStoreListener);
    }

    public componentWillUnmount(): void {
        this.controlContext.store.removeChangedListener(this.createDashboardStoreListener);
        super.componentWillUnmount();
    }

    public render(): JSX.Element {
        const dialogProps: IDialogProps = {
            hidden: false,
            dialogContentProps: {
                type: DialogType.close
            },
            modalProps: {
                className: "new-dashboard-dialog",
                containerClassName: "new-dashboard-dialog-container",
                isBlocking: true
            },
            title: Resources.NewDashboardDialogTitle,
            forceFocusInsideTrap: true,
            onDismiss: this.onDismiss,
            firstFocusableSelector: "dashboard-dialog-name-field"
        };

        return (
            <Fabric>
                <Dialog {...dialogProps}>
                    {this.renderMessageBar()}
                    {this.renderNameField()}
                    {this.renderTeamPicker()}
                    {this.renderDescriptionField()}
                    {this.renderAutoRefreshCheckBox()}
                    <DialogFooter>
                        {this.renderOkButton()}
                        {this.renderCancelButton()}
                    </DialogFooter>
                </Dialog>
            </Fabric>
        );
    }

    private onDismiss = (): void => {
        close();
        if (typeof this.props.onDismiss === "function") {
            this.props.onDismiss();
        }
    }

    private renderOkButton(): JSX.Element {
        return <DashboardDialogOkButton
            buttonText={Resources.NewDashboardDialogOKButtonText}
            onClick={this._onNewDashboardOk}
            isSaving={this.state.isSaving}
            disabled={
                this.state.name.length === 0 ||
                !this.state.teamName ||
                this.state.hasInvalidNameField ||
                this.state.hasInvalidDescriptionField ||
                !!this.state.errorMessage ||
                this.state.isSaving} />;
    }

    private renderCancelButton(): JSX.Element {
        return <DashboardDialogCancelButton
            buttonText={Resources.DashboardDialogCancelButtonText}
            disabled={this.state.isSaving}
            onClick={this.onDismiss} />
    }

    private renderMessageBar(): JSX.Element {
        return <DashboardDialogMessageBar
            message={this.state.errorMessage}
            onDismiss={() => {
                this.setState({ errorMessage: null });
            }} />
    }

    private renderAutoRefreshCheckBox(): JSX.Element {
        return <DashboardAutoRefreshCheckbox
            disabled={this.state.isSaving}
            isChecked={this.state.isChecked}
            onChange={(ev?: React.FormEvent<HTMLInputElement>, isChecked?: boolean) => {
                this.setState({ isChecked: isChecked });
            }} />;
    }

    private renderNameField(): JSX.Element {
        return <DashboardNameField
            disabled={this.state.isSaving}
            errorMessage={this.state.hasInvalidNameField ? Resources.DashboardDialogNameFieldErrorMessage : ''}
            onChanged={(newValue) => {
                this.setState({ name: newValue, errorMessage: null });
            }}
            onNotifyValidationResult={(errorMessage: string, value: string) => {
                this.setState({ hasInvalidNameField: errorMessage !== Utils_String.empty });
            }}
        />;
    }

    private renderDescriptionField(): JSX.Element {
        return <DashboardDescriptionField
            disabled={this.state.isSaving}
            errorMessage={this.state.hasInvalidDescriptionField ? Resources.DashboardDialogDescriptionFieldErrorMessage : ''}
            onChanged={(newValue) => {
                this.setState({ errorMessage: null, description: newValue });
            }} onNotifyValidationResult={(errorMessage: string, value: string) => {
                this.setState({ hasInvalidDescriptionField: errorMessage !== Utils_String.empty });
            }}
        />;
    }

    private renderTeamPicker(): JSX.Element {
        let state = this.controlContext.store.getState();
        let options: IDropdownOption[] = [];
        options.push(...this.getDropdownOptionsForTeams(state.teamsMine));
        options.push({ key: 'divider', text: '', itemType: DropdownMenuItemType.Divider });
        options.push(...this.getDropdownOptionsForTeams(state.teamsAll));

        return <Dropdown
            label={Resources.NewDashboardDialogTeamFieldLabel}
            options={options}
            required={true}
            placeHolder={
                !!this.controlContext.store.getState().teamsLoaded ?
                    Resources.NewDashboardDialogSelectATeam :
                    Resources.NewDashboardDialogTeamsLoading
            }
            disabled={ this.state.isSaving || !this.props.allowTeamSelection || !this.controlContext.store.getState().teamsLoaded}
            selectedKey={this.state.teamId}
            onChanged={(item: IDropdownOption) => {
                this.setState(
                    {
                        teamId: item.key.toString(),
                        teamName: item.text
                    }
                );
            }} />
    }

    private getDropdownOptionsForTeams(teams: TFS_Core_Contracts.WebApiTeam[]): IDropdownOption[] {
        return teams
            .map(team => {
                return {
                    key: team.id,
                    text: team.name
                };
            })
            .sort((a, b) => Utils_String.localeComparer(a.text, b.text));
    }

    private getDashboard(): Dashboard {
        return {
            name: this.state.name,
            refreshInterval: this.state.isChecked ? DashboardDialogConstants.autoRefreshIntervalInMins : 0,
            description: this.state.description
        } as Dashboard;
    }

    private getTeamContext(): TFS_Core_Contracts.TeamContext {
        let context = getDefaultWebContext();
        return {
            projectId: context.project.id,
            project: context.project.name,
            team: this.state.teamName,
            teamId: this.state.teamId
        }
    }

    @autobind
    private createDashboardStoreListener(): void {
        let dashboardCreationState = this.controlContext.store.getState();
        if (dashboardCreationState.dashboard) {
            if (this.props.onDashboardCreated && typeof this.props.onDashboardCreated == "function") {
                this.props.onDashboardCreated(dashboardCreationState.dashboard);
            }
            close();
        }

        else if (dashboardCreationState.error) {
            this.setState({ errorMessage: dashboardCreationState.error, isSaving: false });
        }

        else if (dashboardCreationState.teamsLoaded) {
            // we just need to force a re render to have the dropdown updated.
            this.setState(this.state);
        }
    }

    @autobind
    private _onNewDashboardOk(): void {
        this.setState({ isSaving: true });
        this.controlContext.actionCreator.createDashboard(this.getDashboard(), this.getTeamContext());
    }
}

/**
 * Allows rendering the old web platform create dashboard dialog in the new web platform.
 */
class CreateDashboardDialogShim extends React.Component<ICreateDashboardDialogProps> {
    public static readonly componentType = "CreateDashboardDialog";

    public componentDidMount() {
        show(this.props);
    }

    public render(): null {
        return null;
    }
}

registerLWPComponent(CreateDashboardDialogShim.componentType, CreateDashboardDialogShim);
