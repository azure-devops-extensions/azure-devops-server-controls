import * as React from "react";

import "VSS/LoaderPlugins/Css!Agile/Scripts/Common/Components/BacklogAddItemCallout/BacklogAddItemCallout";
import "VSS/LoaderPlugins/Css!VSS.Controls";
import * as TFS_Agile from "Agile/Scripts/Common/Agile";
import { BacklogAddItemCalloutActions } from "Agile/Scripts/Common/Components/BacklogAddItemCallout/BacklogAddItemCalloutActions";
import { BacklogAddItemCalloutActionsCreator } from "Agile/Scripts/Common/Components/BacklogAddItemCallout/BacklogAddItemCalloutActionsCreator";
import { BacklogAddItemCalloutStore } from "Agile/Scripts/Common/Components/BacklogAddItemCallout/BacklogAddItemCalloutStore";
import { WorkItemControlWrapper } from "Agile/Scripts/Common/Components/BacklogAddItemCallout/WorkItemControlWrapper";
import * as AgileControlsResources from "Agile/Scripts/Resources/TFS.Resources.AgileControls";
import { IButtonProps, PrimaryButton } from "OfficeFabric/Button";
import { Callout, ICalloutProps } from "OfficeFabric/Callout";
import { IContextualMenuItem } from "OfficeFabric/ContextualMenu";
import { SelectionMode } from "OfficeFabric/DetailsList";
import { Label } from "OfficeFabric/Label";
import { MessageBar, MessageBarType } from "OfficeFabric/MessageBar";
import { ITextField, TextField } from "OfficeFabric/TextField";
import { WorkItemTypeColorAndIconsProvider } from "Presentation/Scripts/TFS/FeatureRef/WorkItemTypeColorAndIconsProvider";
import { CoreFieldRefNames } from "Presentation/Scripts/TFS/Generated/TFS.WorkItemTracking.Constants";
import { getDefaultWebContext } from "VSS/Context";
import { ignoreCaseComparer } from "VSS/Utils/String";
import { KeyCode } from "VSS/Utils/UI";
import { IPickListItem, IPickListSelection, PickListDropdown } from "VSSUI/PickList";
import { IVssIconProps, VssIcon, VssIconType } from "VSSUI/VssIcon";
import { FieldDefinition, IFieldValueDictionary, WorkItem, WorkItemType } from "WorkItemTracking/Scripts/TFS.WorkItemTracking";

export const enum AddItemInsertLocation {
    Top = 0,
    Selection = 1,
    Bottom = 2
}

export interface IBacklogAddItemCalloutProps {
    /** Properties for the office fabric callout */
    calloutProps: ICalloutProps;
    /** Work item types to show in the dropdown picker */
    workItemTypes: string[];
    /** Has a filter been applied? */
    filterApplied: boolean;
    /** Callback for handling callout ouput */
    onSubmit: (workItemTypeName: string, fields: IFieldValueDictionary, insertAt: AddItemInsertLocation) => void;
    /** Additional fields to show. List of field reference names */
    additionalFieldReferenceNames: string[];
    /** Default work item type to show */
    defaultWorkItemType: string;
    /** Callout ID used for saving user settings */
    calloutId: string;
    /** Callback for parent to react on insert location changes */
    onInsertLocationChanged: (insertLocation: AddItemInsertLocation) => void;
}

export interface IBacklogAddItemCalloutState {
    /** Value of title input */
    title: string;
    /** Value of WorkItemType dropdown */
    selectedWorkItemTypeName: string;
    /** Currently selected insert location */
    selectedInsertLocation: AddItemInsertLocation;
    /** Is workItemType information loading */
    workItemTypeLoading: boolean;
    /** Currently selected workItemType for creating WorkItemControl inputs */
    workItemType: WorkItemType;
}

export class BacklogAddItemCallout extends React.Component<IBacklogAddItemCalloutProps, IBacklogAddItemCalloutState> {
    private _actionsCreator: BacklogAddItemCalloutActionsCreator;
    private _store: BacklogAddItemCalloutStore;
    private _workItem: WorkItem;
    private _titleInputRef: ITextField;

    public constructor(props: IBacklogAddItemCalloutProps) {
        super(props);
        const actions = new BacklogAddItemCalloutActions();
        this._actionsCreator = new BacklogAddItemCalloutActionsCreator(actions);
        this._store = new BacklogAddItemCalloutStore(actions);

        this._actionsCreator.initialize(this.props.calloutId, this.props.defaultWorkItemType, this.props.workItemTypes);

        this.state = {
            title: "",
            selectedWorkItemTypeName: this._store.selectedWorkItemType,
            selectedInsertLocation: this._store.insertLocation,
            workItemTypeLoading: true,
            workItemType: null
        };

        // Send the intial insert location
        this.props.onInsertLocationChanged(this.state.selectedInsertLocation);
    }

    public componentWillMount(): void {
        this._store.addChangedListener(this._onStoreChanged);
        this._actionsCreator.loadWorkItemType(this.state.selectedWorkItemTypeName);
    }

    public componentWillUnmount(): void {
        // Cleanup store
        this._store.removeChangedListener(this._onStoreChanged);
        this._store.dispose();
    }

    public componentDidMount(): void {
        this._setFocusOnTitle();
    }

    public getFieldOutput(): IFieldValueDictionary {
        const fields: IFieldValueDictionary = {};
        if (this._workItem) {
            for (const field of this.props.additionalFieldReferenceNames) {
                fields[field] = this._workItem.getFieldValue(field);
            }
        }
        fields[CoreFieldRefNames.Title] = this.state.title;
        return fields;
    }

    public render(): JSX.Element {
        return (
            <Callout {...this.props.calloutProps} role="dialog" ariaLabel={AgileControlsResources.BacklogAddItemCallout_Title}>
                {
                    this.props.filterApplied &&
                    <MessageBar messageBarType={MessageBarType.warning} isMultiline={false}>
                        {AgileControlsResources.BacklogAddItemCallout_Disabled}
                    </MessageBar>
                }
                {this._renderAddContent()}
            </Callout>
        );
    }

    private _renderAddContent(): JSX.Element {
        let workItemType: JSX.Element;
        if (this.props.workItemTypes.length > 1) {
            workItemType = (
                <PickListDropdown
                    selectedItems={[this.state.selectedWorkItemTypeName]}
                    getListItem={this._getListItem}
                    selectionMode={SelectionMode.single}
                    getPickListItems={this._getPickListItems}
                    disabled={this.state.workItemTypeLoading}
                    onSelectionChanged={this._onWorkItemTypeChanged}
                />
            );
        } else {
            const { name, iconProps } = this._getListItem(this.props.workItemTypes[0]);
            workItemType = (
                <div className="work-item-type-single">
                    <VssIcon {...iconProps} />
                    <div>{name}</div>
                </div>
            );
        }

        // Enable the text field while type is loading since most of the time we will have a title
        // Disable the text field if the work item type does not have title
        const textFieldDisabled = this.state.workItemType && !this.state.workItemType.getFieldDefinition(CoreFieldRefNames.Title);

        return (
            <div className="backlog-add-item-callout new-work-item-view">
                <div className="add-work-item-inputs witform-layout">
                    <div className="row">
                        <div className="type-label">
                            {workItemType}
                        </div>
                        <div className="input">
                            <TextField
                                ariaLabel={AgileControlsResources.BacklogAddItemCallout_NameLabel}
                                componentRef={this._getTitleInputRef}
                                value={this.state.title}
                                onChanged={this._onTitleFieldChanged}
                                disabled={textFieldDisabled}
                                onKeyPress={this._onKeyPress}
                            />
                        </div>
                    </div>
                    {this._renderAdditionalFieldInputs()}
                </div>
                <div className="submit-button">
                    <PrimaryButton
                        {...this._getButtonProps()}
                        disabled={this.props.filterApplied}
                        onClick={this._onSubmitButtonClick}
                    />
                </div>
            </div>
        );
    }

    private _getTitleInputRef = (ref: ITextField): void => {
        this._titleInputRef = ref;
    }

    private _onKeyPress = (e: React.KeyboardEvent<HTMLElement>): void => {
        if (e.charCode === KeyCode.ENTER) {
            this._onSubmitButtonClick();
        }
    }

    private _getListItem = (workItemTypeName: string): IPickListItem => {
        const workItemTypeIconDetails = WorkItemTypeColorAndIconsProvider.getInstance().getColorAndIcon(getDefaultWebContext().project.name, workItemTypeName);
        const iconProps: IVssIconProps = {
            iconName: workItemTypeIconDetails.icon,
            iconType: VssIconType.bowtie,
            style: { color: workItemTypeIconDetails.color }
        };
        return { key: workItemTypeName, name: workItemTypeName, iconProps: iconProps };
    }

    private _onWorkItemTypeChanged = (selection: IPickListSelection): void => {
        this._workItem = null;
        const workItemTypeName = selection.selectedItems[0];
        this._actionsCreator.setSelectedWorkItemType(this.props.calloutId, workItemTypeName);
    }

    private _onTitleFieldChanged = (text: string): void => {
        this.setState({ title: text });
    }

    private _onSubmitButtonChanged = (location: AddItemInsertLocation): void => {
        // Save user button seting
        this._actionsCreator.setSelectedInsertLocation(this.props.calloutId, location);
    }

    private _onSubmitButtonClick = (): void => {
        const {
            filterApplied
        } = this.props;

        if (!filterApplied) {
            const location = this.state.selectedInsertLocation;
            // Call on submit
            const fields = this.getFieldOutput();
            this.props.onSubmit(this.state.selectedWorkItemTypeName, fields, location);

            // Clear work item fields and title
            if (this.state.workItemType) {
                this._workItem = this.state.workItemType.create();
            }
            this._onTitleFieldChanged("");
            // Reset focus to title
            this._setFocusOnTitle();
        }
    }

    private _setFocusOnTitle(): void {
        if (this._titleInputRef) {
            this._titleInputRef.focus();
        }
    }

    private _getButtonProps(): IButtonProps {
        if (!TFS_Agile.areAdvancedBacklogFeaturesEnabled()) {
            return {
                text: AgileControlsResources.BacklogAddItemCallout_AddToBottom
            };
        }

        let currentButtonText: string;
        const menuItems: IContextualMenuItem[] = [];

        if (this.state.selectedInsertLocation === AddItemInsertLocation.Top) {
            currentButtonText = AgileControlsResources.BacklogAddItemCallout_AddToTop;
        } else {
            menuItems.push({
                key: "add-at-top",
                name: AgileControlsResources.BacklogAddItemCallout_AddToTop,
                onClick: () => this._onSubmitButtonChanged(AddItemInsertLocation.Top)
            });
        }

        if (this.state.selectedInsertLocation === AddItemInsertLocation.Selection) {
            currentButtonText = AgileControlsResources.BacklogAddItemCallout_AddAtSelection;
        } else {
            menuItems.push({
                key: "add-at-selection",
                name: AgileControlsResources.BacklogAddItemCallout_AddAtSelection,
                onClick: () => this._onSubmitButtonChanged(AddItemInsertLocation.Selection)
            });
        }

        if (this.state.selectedInsertLocation === AddItemInsertLocation.Bottom) {
            currentButtonText = AgileControlsResources.BacklogAddItemCallout_AddToBottom;
        } else {
            menuItems.push({
                key: "add-at-bottom",
                name: AgileControlsResources.BacklogAddItemCallout_AddToBottom,
                onClick: () => this._onSubmitButtonChanged(AddItemInsertLocation.Bottom)
            });
        }

        return {
            ariaLabel: currentButtonText,
            splitButtonAriaLabel: AgileControlsResources.BacklogAddItemCallout_SplitLabel,
            split: true,
            text: currentButtonText,
            menuProps: {
                items: menuItems
            }
        };
    }

    private _getPickListItems = (): string[] => {
        return this.props.workItemTypes;
    }

    private _renderAdditionalFieldInputs(): JSX.Element[] {
        // We already render title, do not add a WorkItemControl
        const additionalFieldsToRender = this.props.additionalFieldReferenceNames.filter(refName => ignoreCaseComparer(refName, CoreFieldRefNames.Title) !== 0);
        if (this.state.workItemTypeLoading ||
            additionalFieldsToRender.length === 0) {
            return null;
        }

        // Setup a work item so we can use WorkItemControls
        if (!this._workItem) {
            this._workItem = this.state.workItemType.create();
        }

        // Add a row for each field
        const rows: JSX.Element[] = [];
        for (const fieldRefName of additionalFieldsToRender) {
            const fieldDef = this.state.workItemType.getFieldDefinition(fieldRefName);
            // Check that this work item type has this field
            if (fieldDef) {
                rows.push(this._renderAdditionalFieldRow(fieldDef, this._workItem));
            }
        }
        return rows;
    }

    private _renderAdditionalFieldRow(fieldDef: FieldDefinition, workItem): JSX.Element {
        const controlId = fieldDef.referenceName.replace(/\./g, "_");
        return (
            <div className="row legacy-input" key={controlId}>
                <div>
                    <Label
                        htmlFor={controlId}
                        className={"type-label"}
                    >
                        {fieldDef.name}
                    </Label>
                </div>
                <div className="input workitemcontrol">
                    <WorkItemControlWrapper
                        fieldDef={fieldDef}
                        controlId={controlId}
                        workItem={workItem}
                        onKeyPress={this._onKeyPress}
                    />
                </div>
            </div>
        );
    }

    private _onStoreChanged = () => {
        if (this.state.selectedInsertLocation !== this._store.insertLocation) {
            this.props.onInsertLocationChanged(this._store.insertLocation);
        }

        this.setState({
            selectedInsertLocation: this._store.insertLocation,
            selectedWorkItemTypeName: this._store.selectedWorkItemType,
            workItemTypeLoading: this._store.isLoadingWorkItemType,
            workItemType: this._store.currentWorkItemType
        });
    }
}