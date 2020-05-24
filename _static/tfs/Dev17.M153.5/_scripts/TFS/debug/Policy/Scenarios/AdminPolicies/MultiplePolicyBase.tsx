// css
import "VSS/LoaderPlugins/Css!Policy/Scenarios/AdminPolicies/MultiplePolicyBase";
// libs
import * as React from "react";
import { first } from "VSS/Utils/Array";
import { DirectionalHint, TooltipHost, TooltipOverflowMode } from "VSSUI/Tooltip";
import { autobind, css, divProperties, getNativeProps } from "OfficeFabric/Utilities";
// contracts
import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { MessageTarget } from "Policy/Scenarios/AdminPolicies/Stores/MessageStore";
import { SettingsBase } from "Policy/Scripts/PolicyTypes";
// controls
import { Icon } from "OfficeFabric/Icon";
import { Label } from "OfficeFabric/Label";
import { IColumn, ColumnActionsMode, ConstrainMode } from "OfficeFabric/DetailsList";
import { DefaultButton, CommandButton } from "OfficeFabric/Button";
import { Toggle } from "OfficeFabric/Toggle";
import { VssDetailsList } from "VSSUI/VssDetailsList";
// scenario
import { ActionCreationSignatures } from "Policy/Scenarios/AdminPolicies/Flux";
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

export interface MultiplePolicyBaseProps extends React.HTMLProps<HTMLDivElement> {
    readonlyMode: boolean;
    disableAddReason?: string;
    disableAddReasonRender?(): JSX.Element;

    configs: PolicyConfiguration[];

    showPolicyEditDialog: ActionCreationSignatures.ShowPolicyEditDialog;
    showPolicyDeleteDialog: ActionCreationSignatures.ShowPolicyDeleteDialog;
    updateLocalPolicyConfig: ActionCreationSignatures.UpdateLocalPolicyConfig;
}

export abstract class MultiplePolicyBase<TProps extends MultiplePolicyBaseProps> extends React.Component<TProps, {}> {

    public render(): JSX.Element {
        const { readonlyMode, disableAddReason, disableAddReasonRender, configs, updateLocalPolicyConfig, showPolicyEditDialog, showPolicyDeleteDialog } = this.props;
        const htmlProps = getNativeProps(this.props, divProperties);

        const policyTypeId = this.policyTypeId;

        const myConfigs = configs
            .filter(cfg => !cfg.isDeleted && cfg.type.id === policyTypeId)
            .sort(this._sortCompare);

        const hasConfigs = myConfigs.length > 0;

        const allColumns: IColumn[] = [
            ...this._firstColumns,
            ...this._lastColumns,
        ];

        let disableAddReasonContent: JSX.Element = null;
        if (disableAddReasonRender) {
            disableAddReasonContent = disableAddReasonRender();
        } else  if (!!disableAddReason){
            disableAddReasonContent = <span>{disableAddReason}</span>;
        }

        return (
            <section className="multiple-policy-section" aria-label={this._overallSectionLabel} {...htmlProps}>

                <h3 className="policy-type-heading">{this._overallHeadingText}</h3>
                <div className="policy-details">{this._overallHeadingDetail}</div>

                <DefaultButton
                    className="add-policy-button"
                    disabled={readonlyMode || !!disableAddReasonContent}
                    iconProps={{ iconName: 'Add' }}
                    onClick={this._addPolicyOnClick}
                >{this._addNewText}</DefaultButton>

                {disableAddReasonContent &&
                    <div className="ms-font-s add-policy-button-disabled-reason"><Icon iconName="Info" className="ms-font-s info-icon"/>{disableAddReasonContent}</div>
                }

                {hasConfigs &&
                    <VssDetailsList
                        key="list"
                        constrainMode={ConstrainMode.unconstrained}
                        ariaLabel={this._policyListLabel}
                        columns={allColumns}
                        items={myConfigs}
                        className={css(
                            "multiple-policy-list",
                            this._policyListClassName,
                        )}
                    />
                }
            </section>
        );
    }

    private readonly _lastColumns: IColumn[] = [
        {
            key: "edit",
            name: null,
            ariaLabel: Resources.Edit,
            onRender: this._renderEditButton,
            fieldName: null,
            minWidth: 70,
            maxWidth: 80,
            className: "multiple-policy-list-column-edit",
            columnActionsMode: ColumnActionsMode.disabled,
        },
        {
            key: "delete",
            name: null,
            ariaLabel: Resources.Delete,
            onRender: this._renderDeleteButton,
            fieldName: null,
            minWidth: 90,
            maxWidth: 100,
            className: "multiple-policy-list-column-delete",
            columnActionsMode: ColumnActionsMode.disabled,
        },
        {
            key: "enable",
            name: null,
            ariaLabel: Resources.EnableOrDisable,
            onRender: this._renderEnableToggle,
            fieldName: null,
            minWidth: 120,
            maxWidth: 130,
            className: "multiple-policy-list-column-enable",
            columnActionsMode: ColumnActionsMode.disabled,
        },
    ];

    @autobind
    private _renderEditButton(config: PolicyConfiguration): JSX.Element {
        const editButtonText = this.props.readonlyMode ? Resources.View : Resources.Edit;

        return (
            <CommandButton
                iconProps={{ iconName: this.props.readonlyMode ? "View" : "Edit" }}
                data-policy-config-id={config.id}
                className="shy-command"
                onClick={this._editPolicyOnClick}>
                {editButtonText}
            </CommandButton>
        );
    }

    @autobind
    private _renderDeleteButton(config: PolicyConfiguration): JSX.Element {
        return (
            <CommandButton
                iconProps={{ iconName: 'Delete' }}
                disabled={this.props.readonlyMode}
                data-policy-config-id={config.id}
                className="shy-command"
                onClick={this._deletePolicyOnClick}>
                {Resources.Delete}
            </CommandButton>
        );
    }

    @autobind
    private _renderEnableToggle(config: PolicyConfiguration): JSX.Element {
        return (
            <div className="toggle-container">
                <Toggle
                    onChanged={(checked: boolean) => this._enabledOnChanged(config, checked)}
                    onText={Resources.Enabled}
                    offText={Resources.Disabled}
                    checked={!!config.isEnabled}
                    disabled={this.props.readonlyMode}
                    onAriaLabel={Resources.Disable}
                    offAriaLabel={Resources.Enable}
                />
            </div>
        );
    }

    protected static _renderRequirement(cfg: PolicyConfiguration): React.ReactNode {
        return <span>{cfg.isBlocking ? Resources.Required : Resources.Optional}</span>;
    }

    protected static _renderFilenamePatterns(config: PolicyConfiguration): React.ReactNode {
        const filters = (config.settings as SettingsBase).filenamePatterns;

        if (filters && filters.length > 0) {
            const filterText = filters.join("; ");
            return <TooltipHost content={filterText}
                overflowMode={TooltipOverflowMode.Parent}
                calloutProps={{ gapSpace: 4 }}
                directionalHint={DirectionalHint.topCenter}>
                {filterText}
            </TooltipHost>;
        }
        else {
            return <span className="pathFilter-notSet">{Resources.NoFilter}</span>;
        }
    }

    @autobind
    private _editPolicyOnClick(ev: React.MouseEvent<HTMLButtonElement>): void {
        const dataId: any = ev.currentTarget.dataset["policyConfigId"];
        const configId = dataId | 0;

        if (configId > 0) {
            const config = first(this.props.configs, cfg => cfg.id === configId);
            const configClone = JSON.parse(JSON.stringify(config));

            this.props.showPolicyEditDialog(configClone, ev.currentTarget);
        }
    }

    @autobind
    private _addPolicyOnClick(ev: React.MouseEvent<HTMLButtonElement>): void {
        let config = this._createNewConfig();

        this.props.showPolicyEditDialog(config, ev.currentTarget);
    }

    @autobind
    private _deletePolicyOnClick(ev: React.MouseEvent<HTMLButtonElement>): void {
        const dataId: any = ev.currentTarget.dataset["policyConfigId"];
        const configId = dataId | 0;

        if (configId > 0) {
            const config = first(this.props.configs, cfg => cfg.id === configId);

            this.props.showPolicyDeleteDialog(config, ev.currentTarget, MessageTarget.page, this);
        }
    }

    @autobind
    private _enabledOnChanged(config: PolicyConfiguration, checked: boolean): void {
        if (config.isEnabled !== checked) {
            this.props.updateLocalPolicyConfig(config.id, (cfg) => {
                cfg.isEnabled = checked;
            }, true);
        }
    }

    private compareBooleans(a: boolean, b: boolean): number {
        return Number(a) - Number(b);
    }

    @autobind
    private _sortCompare(a: PolicyConfiguration, b: PolicyConfiguration): number {
        // Sort by:
        //  1. Required before optional
        //  2. customSort() if implemented by subclass -- usually sorting by name etc
        //  3. Exists on server (configId > 0) before newly created (configId < 0)
        //  3. Oldest to newest (abs(configId))

        return (
            -(this.compareBooleans(a.isBlocking, b.isBlocking))
            || this._customSort(a, b)
            || this.compareBooleans(a.id < 0, b.id < 0)
            || (Math.abs(a.id) - Math.abs(b.id))
        );
    }

    protected _customSort(a: PolicyConfiguration, b: PolicyConfiguration): number {
        return 0;
    }

    protected abstract get _firstColumns(): IColumn[];

    protected abstract _createNewConfig(): PolicyConfiguration;

    public abstract get policyTypeId(): string;

    protected abstract get _policyListClassName(): string;

    protected abstract get _overallSectionLabel(): string;

    protected abstract get _overallHeadingText(): string;

    protected abstract get _overallHeadingDetail(): React.ReactNode;

    protected abstract get _policyListLabel(): string;

    protected abstract get _addNewText(): string;
}
