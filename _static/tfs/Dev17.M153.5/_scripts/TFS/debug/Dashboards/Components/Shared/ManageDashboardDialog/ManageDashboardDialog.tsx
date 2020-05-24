import * as React from "react";
import * as ReactDOM from "react-dom";

import { autobind, BaseComponent, css, IBaseProps } from "OfficeFabric/Utilities";
import { Fabric } from "OfficeFabric/Fabric";
import { Dialog, IDialogProps, DialogType, DialogFooter } from "OfficeFabric/Dialog";
import { Label } from "OfficeFabric/Label";
import { Link } from "OfficeFabric/Link";

import * as Utils_String from "VSS/Utils/String";

import { Dashboard, DashboardGroup } from "TFS/Dashboards/Contracts";
import { TeamContext } from "TFS/Core/Contracts";

import { IManageDashboardDialogContext, ManageDashboardDialogContext } from "Dashboards/Components/Shared/ManageDashboardDialog/ManageDashboardDialogContext";
import { ManageDashboardState } from "Dashboards/Components/Shared/ManageDashboardDialog/ManageDashboardDialogModels";
import { DashboardNameField, DashboardDescriptionField, DashboardDialogConstants, DashboardDialogMessageBar, DashboardDialogOkButton, DashboardDialogCancelButton, DashboardAutoRefreshCheckbox } from "Dashboards/Components/Shared/DialogComponents";
import { DashboardItem, TeamScope } from "Dashboards/Components/Shared/Contracts";
import * as DashboardsSecurityDialog from "Dashboards/Components/Directory/DashboardsSecurityDialog"
import * as UserPermissionsHelper from "Dashboards/Scripts/Common.UserPermissionsHelper";

import { getDashboardTeamContext } from "Dashboards/Scripts/Common";
import { getDefaultWebContext } from "VSS/Context";

import * as Resources from "Dashboards/Scripts/Resources/TFS.Resources.Dashboards";

import "VSS/LoaderPlugins/Css!Dashboards/Components/Shared/ManageDashboardDialog/ManageDashboardDialog";

export function show(props?: IManageDashboardDialogProps): void {
    containerNode = document.createElement("div");
    document.body.appendChild(containerNode);
    ReactDOM.render(<ManageDashboardDialog {...props} />, containerNode);
}

/**
 * Closes the Manage dashboard dialog.
 */
export function close(): void {
    if (containerNode) {
        ReactDOM.unmountComponentAtNode(containerNode);
        containerNode.parentElement.removeChild(containerNode);
        containerNode = null;
        ManageDashboardDialogContext.clearInstance();
    }
}

export interface IManageDashboardDialogProps extends IBaseProps {
    // Metadata and team scope for the active dashboard.
    dashboard: Dashboard;

    team: TeamScope;

    // callback to invoke when the user saves changes.
    onSave: (dashboard: Dashboard) => void;
}


interface ManageDashboardDialogState {
    isChecked: boolean;
    showDialog: boolean;
    name: string;
    description: string;
    errorMessage: string;
    hasInvalidNameField: boolean;
    hasInvalidDescriptionField: boolean;
}

var containerNode: HTMLElement = null;

class ManageDashboardDialog extends BaseComponent<IManageDashboardDialogProps, ManageDashboardDialogState> {

    private controlContext: IManageDashboardDialogContext;
    private allowEdit: boolean;
    private activeDashboard: Dashboard;

    public constructor(props: IManageDashboardDialogProps) {
        super(props);

        this.controlContext = ManageDashboardDialogContext.getInstance();
        this.allowEdit = UserPermissionsHelper.CanEditDashboard();
        this.activeDashboard = this.props.dashboard;

        this.state = {
            name: this.activeDashboard.name,
            description: this.activeDashboard.description,
            isChecked: (this.activeDashboard.refreshInterval !== 0) ? true : false,
            errorMessage: !this.allowEdit ? Resources.ManageDashboardDialog_EditDisabled : null,
            showDialog: true
        } as ManageDashboardDialogState;
    }

    public componentDidMount(): void {
        super.componentDidMount();
        this.controlContext.store.addChangedListener(this.manageDashboardStoreListener);
    }

    public componentWillUnmount(): void {
        this.controlContext.store.removeChangedListener(this.manageDashboardStoreListener);
        super.componentWillUnmount();
    }

    public render(): JSX.Element {
        const dialogProps: IDialogProps = {
            hidden: false,
            dialogContentProps: {
                type: DialogType.close,
                subText: Resources.ManageDashboardDialogSubtext
            },
            modalProps: {
                className: "manage-dashboard-dialog",
                containerClassName: "manage-dashboard-dialog-container",
                isBlocking: true
            },
            title: Utils_String.format(Resources.ManageDashboardDialogTitle, this.state.name),
            forceFocusInsideTrap: true,
            onDismiss: () => {
                close();
            },
            firstFocusableSelector: "dashboard-dialog-name-field"
        };

        return (
            this.state.showDialog ?
                <Fabric>
                    <Dialog {...dialogProps}>
                        {this.renderMessageBar()}
                        <div className="manage-dashboard-dialog-edit-fields">
                            {this.renderNameField()}
                            {this.renderDescriptionField()}
                            {this.renderAutoRefreshCheckBox()}
                            {this.renderSecuritySection()}
                        </div>
                        <DialogFooter>
                            {this.renderOkButton()}
                            {this.renderCancelButton()}
                        </DialogFooter>
                    </Dialog>
                </Fabric> :
                null
        );
    }

    private renderOkButton(): JSX.Element {
        return <DashboardDialogOkButton
            buttonText={Resources.DashboardDialogSaveButtonText}
            onClick={this._onManageDashboardOk}
            disabled={
                !this.allowEdit ||
                this.state.name.length === 0 ||
                this.state.hasInvalidNameField ||
                this.state.hasInvalidDescriptionField ||
                !!this.state.errorMessage} />;
    }

    private renderCancelButton(): JSX.Element {
        return <DashboardDialogCancelButton
            buttonText={Resources.DashboardDialogCancelButtonText}
            onClick={close} />
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
            isChecked={this.state.isChecked}
            disabled={!this.allowEdit}
            onChange={(ev?: React.FormEvent<HTMLInputElement>, isChecked?: boolean) => {
                this.setState({ isChecked: isChecked });
            }} />;
    }

    private renderNameField(): JSX.Element {
        return <DashboardNameField
            initialValue={this.state.name}
            errorMessage={this.state.hasInvalidNameField ? Resources.DashboardDialogNameFieldErrorMessage : ''}
            disabled={!this.allowEdit}
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
            initialValue={this.state.description}
            errorMessage={this.state.hasInvalidDescriptionField ? Resources.DashboardDialogDescriptionFieldErrorMessage : ''}
            disabled={!this.allowEdit}
            onChanged={(newValue) => {
                this.setState({ errorMessage: null, description: newValue });
            }} onNotifyValidationResult={(errorMessage: string, value: string) => {
                this.setState({ hasInvalidDescriptionField: errorMessage !== Utils_String.empty });
            }}
        />;
    }

    private renderSecuritySection(): JSX.Element {
        return <div className="dashboard-security-section">
            <div className="dashboard-security-section-heading">{Resources.ManageDashboardDialog_SecuritySectionHeading}</div>
            <Label>{Resources.ManageDashboardDialog_SecuritySectionLabel}</Label>
            <Link onClick={this._onManagePermissionsLinkClicked}>{Resources.ManageDashboardDialog_SecurityDialogLink}</Link>
        </div>;
    }

    @autobind
    private manageDashboardStoreListener(): void {
        let manageDashboardState = this.controlContext.store.getState();
        if (manageDashboardState.dashboardReceived) {
            close();
        }

        else if (manageDashboardState.error) {
            this.setState({ errorMessage: manageDashboardState.error });
        }
    }

    @autobind
    private _onManageDashboardOk(): void {
        // Save metadata settings
        this.updateActiveDashboard();
        this.controlContext.actionCreator.manageDashboard(this.activeDashboard, this.getTeamContext(), this.props.onSave);
        close();
    }

    @autobind
    private _onManagePermissionsLinkClicked(): void {
        let dashboardItem = {
            dashboard: this.activeDashboard,
            teamScope: this.props.team
        } as DashboardItem

        /**
         * The manage dialog has greater stacking context compared to the security dialog. This retains focus on the
         * manage dialog even when the security dialog is opened, making the security dialog unusable even if z-index
         * property is overriden in CSS.
         *
         * Instead, this approach 'hides' the manage dialog when the security dialog is invoked i.e. instead of the dialog
         * component, a null component is rendered. When the security dialog is closed, the callback invokes _onSecurityDialogClose(),
         * which updates state to display the manage dialog again. Changes made by the user in the manage dialog are retained since
         * rest of the state is not modified.
         */
        this.setState({ showDialog: false });
        DashboardsSecurityDialog.show(dashboardItem, this._onSecurityDialogClose);
    }

    @autobind
    private _onSecurityDialogClose(): void {
        this.setState({ showDialog: true });
    }

    private updateActiveDashboard(): void {
        this.activeDashboard.name = this.state.name;
        this.activeDashboard.description = this.state.description;
        this.activeDashboard.refreshInterval = this.state.isChecked ? DashboardDialogConstants.autoRefreshIntervalInMins : 0;
    }

    private getTeamContext(): TeamContext {
        let context = getDefaultWebContext();
        let teamContext = getDashboardTeamContext();

        let teamName = this.props.team ? this.props.team.teamName : teamContext.name;
        let teamId = this.props.team ? this.props.team.teamId : teamContext.id;

        return {
            projectId: context.project.id,
            project: context.project.name,
            team: teamName,
            teamId: teamId
        }
    }
}
