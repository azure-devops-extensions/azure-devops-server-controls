// libs
import * as React from "react";

// utils
import { autobind } from "OfficeFabric/Utilities";
import { PolicyConfigurationUtils } from "Policy/Scenarios/AdminPolicies/PolicyConfigurationUtils";
import { first } from "VSS/Utils/Array";
import { localeFormat, localeIgnoreCaseComparer } from "VSS/Utils/String";

// contracts
import { PolicyConfiguration } from "Policy/Scripts/Generated/TFS.Policy.Contracts";
import { IBuildDefinitionMap } from "Policy/Scenarios/AdminPolicies/Stores/BuildDefinitionStore";
import { Build } from "Policy/Scripts/PolicyTypes";

// controls
import { IColumn, ColumnActionsMode } from "OfficeFabric/DetailsList";

// scenario
import { MultiplePolicyBase, MultiplePolicyBaseProps } from "Policy/Scenarios/AdminPolicies/MultiplePolicyBase";
import * as Resources from "Policy/Scripts/Resources/TFS.Resources.Policy";

export interface BuildPolicySectionProps extends MultiplePolicyBaseProps {
    buildDefinitionsById: IBuildDefinitionMap;
}

export class BuildPolicySection extends MultiplePolicyBase<BuildPolicySectionProps> {

    protected get _firstColumns(): IColumn[] { return this._columns; }

    protected readonly _columns: IColumn[] = [
            {
                key: "0",
                name: Resources.BuildDefinition,
                onRender: this._renderDisplayName,
                fieldName: null,
                minWidth: 180,
                maxWidth: 210,
                className: "build-policy-list-column-displayName",
                columnActionsMode: ColumnActionsMode.disabled,
            },
            {
                key: "1",
                name: Resources.Requirement,
                onRender: MultiplePolicyBase._renderRequirement,
                fieldName: null,
                minWidth: 65,
                maxWidth: 90,
                className: "policy-list-column-requirement",
                columnActionsMode: ColumnActionsMode.disabled,
            },
            {
                key: "2",
                name: Resources.PathFilter,
                onRender: MultiplePolicyBase._renderFilenamePatterns,
                fieldName: null,
                minWidth: 90,
                maxWidth: 150,
                className: "policy-list-column-pathFilter",
                columnActionsMode: ColumnActionsMode.disabled,
            },
            {
                key: "3",
                name: Resources.Expiration,
                onRender: BuildPolicySection._renderExpiration,
                fieldName: null,
                minWidth: 150,
                maxWidth: 175,
                className: "build-policy-list-column-expiration",
                columnActionsMode: ColumnActionsMode.disabled,
            },
            {
                key: "4",
                name: Resources.Trigger,
                onRender: BuildPolicySection._renderTrigger,
                fieldName: null,
                minWidth: 80,
                maxWidth: 125,
                className: "build-policy-list-column-trigger",
                columnActionsMode: ColumnActionsMode.disabled,
            },
        ];

    protected _renderCells(config: PolicyConfiguration): React.ReactNode {
        return null;
    }

    @autobind
    private _displayNameText(cfg: PolicyConfiguration): string {
        const settings = cfg.settings as Build.Settings;

        if (settings.displayName) {
            return cfg.settings.displayName;
        }

        if (settings.buildDefinitionId > 0) {
            const buildDef = this.props.buildDefinitionsById[settings.buildDefinitionId];

            if (buildDef && buildDef.name) {
                return buildDef.name;
            }
        }

        return localeFormat(Resources.PolicyFallbackName, cfg.id);
    }

    @autobind
    private _renderDisplayName(cfg: PolicyConfiguration): JSX.Element {
        return (
            <span><i className="icon bowtie-icon bowtie-build"></i>{this._displayNameText(cfg)}</span>
            );
    }

    private static _renderExpiration(cfg: PolicyConfiguration): string {
        const settings = cfg.settings as Build.Settings;

        if (!!settings.manualQueueOnly) {
            return Resources.BuildExpiresNever;
        }

        if (!settings.queueOnSourceUpdateOnly) {
            return Resources.BuildExpiresStrict;
        }

        const validDuration = settings.validDuration || 0;

        if (validDuration === 0) {
            return Resources.BuildExpiresNever;
        }

        if (validDuration <= 1) {
            return Resources.BuildExpiresAfter1Min;
        }

        if (validDuration <= 90) {
            const mins = Math.ceil(validDuration);
            return localeFormat(Resources.BuildExpiresAfterMins, mins);
        }

        if (validDuration <= 2880) {
            const hrs = Math.round(validDuration / 6) / 10;
            return localeFormat(Resources.BuildExpiresAfterHrs, hrs);
        }

        const days = Math.ceil(validDuration / 144) / 10;
        return localeFormat(Resources.BuildExpiresAfterDays, days);
    }

    private static _renderTrigger(cfg: PolicyConfiguration): string {
        if (!cfg.isEnabled) {
            return Resources.PolicyDisabled;
        }

        const settings = cfg.settings as Build.Settings;

        return settings.manualQueueOnly ? Resources.Manual : Resources.Automatic;
    }

    @autobind
    protected _createNewConfig(): PolicyConfiguration {
        return PolicyConfigurationUtils.getEmptyBuildPolicyConfig();
    }

    @autobind
    protected _customSort(a: PolicyConfiguration, b: PolicyConfiguration): number {
        return localeIgnoreCaseComparer(this._displayNameText(a), this._displayNameText(b));
    }

    public get policyTypeId(): string {
        return Build.Id;
    }

    protected get _policyListClassName(): string {
        return "build-policy-list";
    }

    protected get _overallSectionLabel(): string {
        return Resources.BuildSectionLabel;
    }

    protected get _overallHeadingText(): string {
        return Resources.BuildEnableText;
    }

    protected get _overallHeadingDetail(): React.ReactNode {
        return Resources.BuildEnableDetail;
    }

    protected get _policyListLabel(): string {
        return Resources.BuildListLabel;
    }

    protected get _addNewText(): string {
        return Resources.AddBuildPolicy;
    }
}
