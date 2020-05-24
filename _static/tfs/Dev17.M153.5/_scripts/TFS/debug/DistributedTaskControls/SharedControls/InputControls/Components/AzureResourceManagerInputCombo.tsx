/// <reference types="react" />

import * as React from "react";
import * as Q from "q";

import * as TaskUtils from "DistributedTasksCommon/TFS.Tasks.Utils";
import TaskResources = require("DistributedTasksCommon/Resources/TFS.Resources.DistributedTasksLibrary");

import * as Base from "DistributedTaskControls/Common/Components/Base";
import { DtcUtils } from "DistributedTaskControls/Common/Utilities";
import { AzureResourceManagerComponentUtility, IAzureResourceManagerComponentOptions } from "DistributedTaskControls/SharedControls/InputControls/Components/AzureResourceManagerComponentUtility";
import { ComboLoadingComponent, ComboLoadingHelper } from "DistributedTaskControls/Components/ComboLoadingComponent";
import { FetchingCombo } from "DistributedTaskControls/Components/FetchingCombo";
import * as Resources from "DistributedTaskControls/Resources/TFS.Resources.DistributedTaskControls";

import { ServiceEndpoint } from "TFS/ServiceEndpoint/Contracts";
import * as DistributedTaskContracts from "TFS/DistributedTask/Contracts";

import GroupedComboBox = require("VSSPreview/Controls/GroupedComboBox");

import { BaseControl, AriaAttributes } from "VSS/Controls";
import { ComboO, IComboOptions } from "VSS/Controls/Combos";
import * as Utils_Core from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import Platform_Component = require("VSS/Flux/PlatformComponent");

export interface IAzureResourceManagerInputComboProps extends Base.IProps {
    disabled: boolean;
    onChanged: (newOption: string, selectedSubscription: DistributedTaskContracts.AzureSubscription) => void;
    onRefresh: () => IPromise<void>;
    ariaAttributes?: AriaAttributes;
}

export class AzureResourceManagerInputCombo extends Platform_Component.Component<FetchingCombo, IAzureResourceManagerInputComboProps, Base.IStateless> {

    protected createControl(element: JQuery): FetchingCombo {
        if (!this._control) {

            // Register grouped behavior on the combo box to enable "grouped" type
            GroupedComboBox.GroupedComboBehavior.registerBehavior();

            const azureRMInputCombo = BaseControl.createIn(
                FetchingCombo,
                element,
                this._getGroupedComboBoxOptions()
            ) as FetchingCombo;

            return azureRMInputCombo;
        }
    }

    public componentDidMount(): void {
        this._updateAriaAttributes();
    }

    public componentWillReceiveProps(newProps: IAzureResourceManagerInputComboProps) {
        let { disabled } = newProps;

        if (this._control) {
            this._control.setEnabled(!disabled);
        }
    }

    public setText(text: string) {

        if (this._control.getText() !== text) {
            this._control.setText(text);
        }
    }

    public getText(): string {
        return this._control.getText();
    }

    private _getGroupedComboBoxOptions(): GroupedComboBox.IGroupedComboOptions {

        let options: GroupedComboBox.IGroupedComboOptions = {
            type: "grouped",
            id: "ConnectedServiceAzureRMInputDefinition",
            allowEdit: true,
            enabled: !this.props.disabled,
            value: "",
            source: this._source,
            enableFilter: true,
            autoComplete: true,
            dropOptions: {

                // Renderer for items passed into combo box
                getItemContents: (item) => {
                    return item ? Utils_String.htmlEncode(AzureResourceManagerComponentUtility.getDisplayText(this._azureSubscriptions, this._endpoints, item)) : "";
                },

                // Display when all items have been filtered out
                emptyRenderer: () => {
                    let noSubscriptionMessage: string = (!this._source || this._source.length === 0) ? Resources.NoSubscriptionFound : TaskResources.NoMatchingSubscriptionFound;
                    return $("<div/>").addClass("group-combo-no-data-message").text(noSubscriptionMessage);
                },

                // Renderer for groups in combo box
                groupRenderer: (groupTitle) => {
                    return $("<div/>").addClass("group-combo-title").text(groupTitle);
                },

                itemCss: "group-combo-text-item",
            },

            // Text that will be sent to combo text box on item selection
            getItemText: (item) => {

                // item is key
                return item ? AzureResourceManagerComponentUtility.getDisplayText(this._azureSubscriptions, this._endpoints, item) : "";
            },

            // Used to compare input text to items in the combobox
            compareInputToItem: (key, compareText): number => {

                // if compare text is a valid option from the dropdown, currentComboValue will be the key of that option
                // if compare text is a user input, currentComboValue is null
                let currentComboValue: string = this._control && this._control.getValue();

                let displayText: string = AzureResourceManagerComponentUtility.getDisplayText(this._azureSubscriptions, this._endpoints, key);
                if (displayText !== Utils_String.empty) {
                    if (!currentComboValue) {
                        // case1: currentComboValue is null, which means compareText is a user input. In this case compareInputToItem should perform the process of filtering the options based on user input.
                        return Utils_String.localeIgnoreCaseComparer(compareText, displayText.substr(0, compareText.length));
                    }
                    else if (currentComboValue === key) {
                        // case2: currentComboValue is not null, which means compareText is a user selection from the dropdown.In this case compareInputToItem should return the exact match in the dropdown.
                        return 0;
                    }
                }

                return -1;
            },
            refreshData: () => {
                return this.props.onRefresh();
            },
            // React to text entry change
            change: () => {
                this._onChange(false);
            },
            indexChanged: (index: number) => {
                // React to text selection change
                // This is needed because the change event is not triggered if two options have the same value as text
                if (index !== -1) {
                    this._onChange(true);
                }
            },
            ariaAttributes: this.props.ariaAttributes
        };
        return options;
    }

    public updateSource(azureRMComponentOptions: IAzureResourceManagerComponentOptions) {

        if (azureRMComponentOptions.options) {
            this._control.removeLoadingComponent();
        }
        this._source = azureRMComponentOptions.options || [];
        this._endpoints = azureRMComponentOptions.endpoints || {};
        this._azureSubscriptions = azureRMComponentOptions.azureSubscriptions || {};

        this._clearSourceIfEmpty();
        this._control.setSource(this._source);
        this._updateText(azureRMComponentOptions.value);
    }

    private _clearSourceIfEmpty(): void {
        if (Object.keys(this._endpoints).length === 0 && Object.keys(this._azureSubscriptions).length === 0) {
            this._source = [];
        }
    }

    private _updateText(value: string) {
        let selectText = value;

        let updatedValue = this._endpoints[selectText] ? this._endpoints[selectText].name
            : (TaskUtils.VariableExtractor.containsVariable(selectText) ||
                DtcUtils.containsProcessParameter(selectText) ? selectText : "");

        if (!!updatedValue) {
            this._control.setText(updatedValue);
        }
    }

    // common onChange handler for index change and text change events
    private _onChange(indexChanged: boolean) {
        let comboText: string = this._control.getText();
        let comboValue: string = this._control.getValue();

        let value: string = Utils_String.empty;
        let selectedSubscription: DistributedTaskContracts.AzureSubscription = null;

        let subscription: DistributedTaskContracts.AzureSubscription;
        let endpoint: ServiceEndpoint;

        if (indexChanged && !!comboValue) {
            // user selected an option from the dropdown
            subscription = this._azureSubscriptions && this._azureSubscriptions[comboValue];
            endpoint = this._endpoints && this._endpoints[comboValue];
        }
        else {
            // user entered text 
            subscription = AzureResourceManagerComponentUtility.getSubscriptionByName(this._azureSubscriptions, comboText);
            endpoint = AzureResourceManagerComponentUtility.getEndpointByName(this._endpoints, comboText);
        }

        if (subscription) {
            selectedSubscription = subscription;
        }
        else {
            if (endpoint) {
                value = endpoint.id;
            }
            else {
                if (TaskUtils.VariableExtractor.containsVariable(comboText) || DtcUtils.containsProcessParameter(comboText)) {
                    value = comboText;
                }
            }
        }

        if (this.props.onChanged) {
            this.props.onChanged(value, selectedSubscription);
        }
    }

    private _updateAriaAttributes(): void {
        if (this._control && this.props.ariaAttributes) {
            this._control.getInput().attr({
                "aria-describedby": this.props.ariaAttributes.describedby
            });
        }
    }

    private _source: GroupedComboBox.IGroupedDataItem<string>[] = [];
    private _azureSubscriptions: IDictionaryStringTo<DistributedTaskContracts.AzureSubscription> = {};
    private _endpoints: IDictionaryStringTo<ServiceEndpoint> = {};
}