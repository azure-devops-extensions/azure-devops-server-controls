import * as React from "react";
import * as ReactDom from "react-dom";
import * as AdminResources from "Admin/Scripts/Resources/TFS.Resources.Admin";
import { GroupSectionConstants } from "Admin/Scripts/Common/WorkItemLayout.Common";
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";

function toJQuery(elem: JSX.Element): JQuery {
    const parent = $("<div/>")[0];
    const component = ReactDom.render(elem, parent);
    if (component instanceof Element || component instanceof React.Component) {
        const node = ReactDom.findDOMNode(component);
        return $(node);
    }
    throw new Error("No nulls");
}


export const createDefinitionLayout = () => toJQuery(
    <div id="field-definition-page" className="field-definition-container" role="tabpanel" aria-labelledby="add-field-tab-item-definition">
        <div className="description">
            <p>{AdminResources.SelectFieldDescription}</p>
            <div className="input-section existing-field-section">
                <input type="radio" className="radio-button" name="existing" value="true" id="radio1" />
                <label htmlFor="radio1" className="radio-label">{AdminResources.UseExistingField}</label>
                <div style={{ display: "table" }} className="input-table">
                    <div style={{ display: "table-row" }}>
                        <label id="existing-field-label" style={{ display: "table-cell" }}>{AdminResources.ExistingFieldComboLabel}</label>
                        <div style={{ display: "table-cell" }} className="existing-field">
                            <div className="existing-field-combo-container"></div>
                            <div className="existing-field-name-error-message error-message"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="input-section new-field-section">
                <input type="radio" className="radio-button" name="existing" value="false" id="radio2" defaultChecked />
                <label htmlFor="radio2" className="radio-label">{AdminResources.CreateAField}</label>
                <div style={{ display: "table" }} className="input-table">
                    <div style={{ display: "table-row-group" }}>
                        <div style={{ display: "table-row" }}>
                            <label id="field-name-label" htmlFor="field-name-input" style={{ display: "table-cell" }}>{AdminResources.Name}</label>
                            <div style={{ display: "table-cell" }} className="field-name">
                                <input id="field-name-input" aria-labelledby="field-name-label" type="text" className="new-field-name" maxLength={128} />
                                <div className="new-field-name-error-message error-message"></div>
                            </div>
                        </div>
                        <div style={{ display: "table-row" }} className="spacer"></div>
                        <div style={{ display: "table-row" }}>
                            <label id="field-type-label" style={{ display: "table-cell" }}>{AdminResources.FieldType}</label>
                            <div style={{ display: "table-cell" }} className="field-type">
                                <div className="field-type-combo-container"></div>
                                <div className="field-type-combo-error-message error-message"></div>
                            </div>
                        </div>
                        <div style={{ display: "table-row" }} className="spacer"></div>
                        <div style={{ display: "table-row" }}>
                            <label id="field-description-label" htmlFor="field-description-textarea" style={{ display: "table-cell" }}>{AdminResources.Description}</label>
                            <div style={{ display: "table-cell" }} className="field-description-cell">
                                <textarea id="field-description-textarea" aria-labelledby="field-description-label" className="field-description" rows={2} maxLength={256}></textarea>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="picklist-container input-table"></div>
            </div>
        </div>
    </div>
);

export const createOptionsLayout = () => toJQuery(
    <div id="field-options-page" className="field-options-container" role="tabpanel" aria-labelledby="add-field-tab-item-options">
        <div className="field-options">
            <div className="input-section">
                <div className="description">{AdminResources.FieldOptionsDescription}</div>
                <input type="checkbox" name="field-properties" className="is-required-checkbox" id="isRequiredFieldCheckbox" />
                <label htmlFor="isRequiredFieldCheckbox" className="is-required-label">{AdminResources.Required}</label><br />
                <div className="suggested-value-option">
                    <input type="checkbox" name="field-properties" className="is-suggested-checkbox" id="isSuggestedPicklistCheckbox" />
                    <label htmlFor="isSuggestedPicklistCheckbox" className="is-suggested-label">{AdminResources.SuggestedPicklist}</label><br />
                </div>
                <div className="allow-groups-option">
                    <input type="checkbox" name="field-properties" className="allow-groups-checkbox" id="allowGroupsCheckbox" />
                    <label htmlFor="allowGroupsCheckbox" className="is-required-label">{AdminResources.AllowAssigningToGroups}</label><br />
                </div>
            </div>
            <div className="input-section" id="default-value-option-block">
                <div id="field-default-value" className="description">{AdminResources.DefaultValue}</div>
                <div className="field-default-value"></div>
                <div className="field-default-value-error-message error-message"></div>
                <div className="identity-default-value">
                    <input type="radio" name="identityDefaultRadio" value="false" id="defaultUser" />
                    <label htmlFor="defaultUser" className="default-identity-value-label">{AdminResources.SetTheDefaultValueToAUserOrGroup}</label>
                    <div className="identity-default"></div>
                    <input type="radio" name="identityDefaultRadio" value="false" id="currentUser" />
                    <label htmlFor="currentUser" className="default-identity-value-label">{AdminResources.SetCurrentUserAsDefault}</label>
                    <input type="radio" name="identityDefaultRadio" value="false" id="noDefaultIdentity" defaultChecked />
                    <label htmlFor="noDefaultIdentity" className="default-identity-value-label">{AdminResources.NoDefaultValue}</label>
                </div>
                <div className="current-datetime-option">
                    <input type="checkbox" name="field-properties" className="current-datetime-checkbox" id="currentDateTimeCheckbox" />
                    <label htmlFor="currentDateTimeCheckbox" className="current-datetime-label">{AdminResources.DateTimeDefaultValue}</label><br />
                </div>
                <div className="default-bool-value">
                    <div>
                        <input type="radio" className="radio-button" name="defaultBoolValue" value="false" id="defaultBoolValueFalse" />
                        <label htmlFor="defaultBoolValueFalse" className="default-bool-value-radio-label">{AdminResources.Boolean_False}</label>
                    </div>
                    <div>
                        <input type="radio" className="radio-button" name="defaultBoolValue" value="true" id="defaultBoolValueTrue" />
                        <label htmlFor="defaultBoolValueTrue" className="default-bool-value-radio-label">{AdminResources.Boolean_True}</label>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export const createLayoutLayout = () => toJQuery(
    <div id="field-layout-page" className="field-layout-container" role="tabpanel" aria-labelledby="add-field-tab-item-layout">
        <p className="description">{AdminResources.FieldDetailsLayoutDescription}</p>
        <div className="input-section add-edit-field">
            <input type="checkbox" className="is-field-visible" id="field-visible-on-form-checkbox" defaultChecked />
            <label className="is-field-visible-label" htmlFor="field-visible-on-form-checkbox">{AdminResources.ShowFieldInForm}</label>
            <div style={{ display: "table" }} className="input-table">
                <div style={{ display: "table-row-group" }}>
                    <div style={{ display: "table-row" }}>
                        <label htmlFor="layout-label" style={{ display: "table-cell" }}>{AdminResources.Label}</label>
                        <div style={{ display: "table-cell" }}>
                            <input id="layout-label" type="text" className="field-form-name" maxLength={128} />
                            <div className="field-form-name-error-message error-message"></div>
                        </div>
                    </div>
                    <div style={{ display: "table-row" }} className="spacer"></div>
                    <div style={{ display: "table-row" }} className="field-group-container">
                        <label id="layout-page" style={{ display: "table-cell" }}>{AdminResources.Page}</label>
                        <div style={{ display: "table-cell" }}>
                            <div className="page-group"></div>
                            <div className="field-form-page-error-message error-message"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="control-group-container">
                <div className="group-input-section">
                    <input type="radio" className="radio-button group-radio-button" name="groupRadio" value="true" id="existingGroupRadio" defaultChecked />
                    <label htmlFor="existingGroupRadio" className="radio-label group-radio-label">{AdminResources.ExistingGroupText}</label>
                </div>
                <div className="group-input">
                    <div className="group-label-container"><label id="layout-existing-group">{AdminResources.Group}</label></div>
                    <div className="group-combo-container"><div className="field-group"></div>
                        <div className="field-form-group-error-message error-message"></div></div>
                </div>
                <div className="group-input-section">
                    <input type="radio" className="radio-button group-radio-button" name="groupRadio" value="false" id="newGroupRadio" />
                    <label htmlFor="newGroupRadio" className="radio-label group-radio-label" style={{ display: "table-cell" }}>{AdminResources.CreateGroupText}</label>
                </div>
                <div className="group-input">
                    <div className="group-label-container">
                        <label htmlFor="layout-new-group">{AdminResources.Group}</label>
                    </div>
                    <div className="group-combo-container">
                        <input id="layout-new-group" type="text" className="group-name" maxLength={128} />
                        <div className="group-name-error-message error-message"></div>
                    </div>
                </div>
            </div>


            <div className="section-info-container">
                <div className="group-input-section"> <span className="icon icon-info" > </span>
                    <span className="info-text">{AdminResources.FieldLayoutSection1InfoText}</span></div>
                <div className="spacer"></div>
                <label>{AdminResources.SelectColumnForHtmlField}</label>
                <div className="spacer"></div>
                <div>
                    <input type="radio" id={GroupSectionConstants.SECTIONS[0].id} className="group-radio-input" name={GroupSectionConstants.RADIO_BUTTON_NAME} />
                    <img src={TfsContext.getDefault().configuration.getResourcesFile(GroupSectionConstants.SECTIONS[0].imageFileName)}
                        title={AdminResources.Section1}
                        id={GroupSectionConstants.SECTIONS[0].imageId}
                        alt={GroupSectionConstants.SECTIONS[0].altText} />
                </div>
                <div className="spacer"></div>
                <div>
                    <input type="radio" id={GroupSectionConstants.SECTIONS[1].id} className="group-radio-input" name={GroupSectionConstants.RADIO_BUTTON_NAME} />
                    <img src={TfsContext.getDefault().configuration.getResourcesFile(GroupSectionConstants.SECTIONS[1].imageFileName)}
                        title={AdminResources.Section2}
                        id={GroupSectionConstants.SECTIONS[1].imageId}
                        alt={GroupSectionConstants.SECTIONS[1].altText} />
                </div>
                <div className="spacer"></div>
                <div>
                    <input type="radio" id={GroupSectionConstants.SECTIONS[2].id} className="group-radio-input" name={GroupSectionConstants.RADIO_BUTTON_NAME} />
                    <img src={TfsContext.getDefault().configuration.getResourcesFile(GroupSectionConstants.SECTIONS[2].imageFileName)}
                        title={AdminResources.Section3}
                        id={GroupSectionConstants.SECTIONS[2].imageId}
                        alt={GroupSectionConstants.SECTIONS[2].altText} />
                </div>
            </div>
        </div>
    </div>
);

export const createEditFieldDefinitionLayout = () => toJQuery(
    <div id="edit-field-definition-page" className="field-definition-container edit-field" role="tabpanel" aria-labelledby="add-field-tab-item-definition">
        <div className="description">
            <p>{AdminResources.SelectFieldDescription}</p>
            <div className="input-section">
                <div style={{ display: "table" }} className="input-table">
                    <div style={{ display: "table-row-group" }}>
                        <div style={{ display: "table-row" }}>
                            <label style={{ display: "table-cell" }}>{AdminResources.Name}</label>
                            <div style={{ display: "table-cell" }} className="field-name">
                                <input type="text" className="new-field-name" disabled />
                                <div className="new-field-name-error-message error-message"></div>
                            </div>
                        </div>
                        <div style={{ display: "table-row" }} className="spacer"></div>
                        <div style={{ display: "table-row" }}>
                            <label id="field-type-label" style={{ display: "table-cell" }}>{AdminResources.FieldType}</label>
                            <div style={{ display: "table-cell" }} className="field-type">
                                <div className="field-type-combo-container"></div>
                                <div className="field-type-combo-error-message error-message"></div>
                            </div>
                        </div>
                        <div style={{ display: "table-row" }} className="spacer"></div>
                        <div style={{ display: "table-row" }}>
                            <label style={{ display: "table-cell" }}>{AdminResources.Description}</label>
                            <div style={{ display: "table-cell" }} className="field-description-cell">
                                <textarea className="field-description" rows={3} maxLength={256}></textarea>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="picklist-container input-table"></div>
            </div>
        </div>
    </div>
);
