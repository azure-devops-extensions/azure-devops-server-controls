import Controls = require("VSS/Controls");
import IdentityPicker = require("VSS/Identities/Picker/Controls");
import Identities_RestClient = require("VSS/Identities/Picker/RestClient");

import Component_Platform = require("VSS/Flux/PlatformComponent");

import Resources = require("Utilization/Scripts/Resources/TFS.Resources.Utilization");

export interface IdentityPickerProps extends Component_Platform.Props<IdentityPicker.IIdentityPickerDropdownOptions> {
    initialUserId?: string;
    userIsPCA?: boolean;
    onValueChanged?: (id: string) => void;
    consumerId: string;
}

export interface IdentityPickerState extends Component_Platform.State {
}

export class IdentityPickerWrapper extends Component_Platform.Component<IdentityPicker.IdentityPickerSearchControl, IdentityPickerProps, IdentityPickerState> {

    private _currentSelectedId: string;

    constructor(props: IdentityPickerProps) {
        super(props);

        this._currentSelectedId = this.props.initialUserId ? this.props.initialUserId : "";
    }

    public focus() {
        this._control.getElement().find(".identity-picker-input").focus();
    }

    protected createControl(element: JQuery): IdentityPicker.IdentityPickerSearchControl {
        var control: IdentityPicker.IdentityPickerSearchControl = Controls.create<IdentityPicker.IdentityPickerSearchControl, IdentityPicker.IIdentityPickerDropdownOptions>(IdentityPicker.IdentityPickerSearchControl, $(element), {
            callbacks: {
                onItemSelect: (item: Identities_RestClient.IEntity) => {
                    this._currentSelectedId = item.localId;
                    control.addIdentitiesToMru([item]);
                    if (this.props.onValueChanged) {
                        this.props.onValueChanged(item.localId);
                    }
                },
                onInputBlur: () => {
                    if (this._control.isDropdownVisible()) {
                        this._control.showMruDropdown();
                    }

                    if (this._currentSelectedId) {
                        this._control.setEntities([], [this._currentSelectedId]);
                    }

                }
            },
            items: this._currentSelectedId,
            multiIdentitySearch: false,
            showContactCard: false,
            identityType: { User: true },
            operationScope: { IMS: true },
            showMruTriangle: true,
            showMru: true,
            highlightResolved: false, // if true, it interferes with detecting when you clear input and creates lots of false positives
            consumerId: this.props.consumerId,
            size: IdentityPicker.IdentityPickerControlSize.Medium,
            placeholderText: Resources.IdentityPicker_Placeholder
        } as IdentityPicker.IIdentityPickerDropdownOptions);

        if (this.props.onValueChanged) {
            control._bind(IdentityPicker.IdentityPickerSearchControl.RESOLVED_INPUT_REMOVED_EVENT, () => {
                this._currentSelectedId = "";
                this.props.onValueChanged("");
            });
        }

        control.getElement().bind("click", (e: JQueryEventObject) => {
            let wasDropDownVisible = this._control.isDropdownVisible();
            // this call toggles the dropdown
            this._control.showMruDropdown();

            // if the dropdown was visible before toggle it is hidden now, so show the current selected entity in input area
            // else clear the input area so that user can start typing
            if (wasDropDownVisible) {
                if (this._currentSelectedId) {
                    this._control.setEntities([], [this._currentSelectedId]);
                }
            } else {
                this._control.clear();
            }
        });

        if (!this.props.userIsPCA) {
            control.enableReadOnlyMode();
            control._element.find(".identity-picker-input").attr("readonly", "readonly")
                .attr("placeholder", "");
        }

        return control;
    }


    public componentDidMount() {
        super.componentDidMount();
        // set focus on load
        this.focus();
    }

    public componentWillUnmount(): void {
    }

    public componentWillReceiveProps(nextProps) {
        this._currentSelectedId = nextProps.initialUserId ? nextProps.initialUserId : "";
        if (this._currentSelectedId) {
            this._control.setEntities([], [this._currentSelectedId]);
        }
        else {
            this._control.clear();
        }
    }
}
