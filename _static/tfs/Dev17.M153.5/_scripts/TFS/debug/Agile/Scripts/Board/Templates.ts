import AgileControlsResources = require("Agile/Scripts/Resources/TFS.Resources.AgileControls");
import { TfsContext } from "Presentation/Scripts/TFS/TFS.Host.TfsContext";
import Diag = require("VSS/Diag");
import TFS_Knockout = require("Presentation/Scripts/TFS/TFS.Knockout");

export function loadHtmlTemplate(templateId: string, cssClass?: string): JQuery {
    renderTemplateIfNeeded(templateId);

    return TFS_Knockout.loadHtmlTemplate(templateId, cssClass);
}

//Rendering templates referenced by other templates
export function registerCommonTemplates() {
    for (const templateId in template_strings) {
        renderTemplateIfNeeded(templateId);
    }
}

function renderTemplateIfNeeded(templateId: string) {
    if ($("#" + templateId).length === 0) {
        const template = template_strings[templateId];
        Diag.Debug.assert(!!template, "Template does not exist: " + templateId);
        const script = document.createElement("script");
        script.type = "text/html";
        script.text = template;
        script.id = templateId;
        document.body.appendChild(script);
    }
}

const hostConfig = TfsContext.getDefault().configuration;
const template_strings: IDictionaryStringTo<string> = {};
template_strings["board_options_card_reordering"] = `
    <div class="board-card-reordering-container">
        <h2 class="main-header">${ AgileControlsResources.Board_Options_CardReorderingTitle}</div>
        <div class="main-description">${ AgileControlsResources.Board_Options_CardReorderingDescription}</div>
        <div class="card-reordering">
            <div class="card-reordering-radiolist">
                <div>
                    <input type="radio" name="card-reordering-radio" id="AllowBacklogReordering" value="false" data-bind="checked: preserveBacklogOrderBinding, disable: !canEdit, event: { focus: onFocus, blur: onBlur }" >
                    <label for="AllowBacklogReordering">${ AgileControlsResources.Board_Options_CardReordering_AllowBacklogReordering}</label>
                    <div>
                        <img class="card-reordering-image" alt="" src="${ hostConfig.getResourcesFile("board.png")}" data-alt="${hostConfig.getResourcesFile("boardallowbacklogreodering.gif")}" data-bind="click: toggle" />
                        <img class="card-reordering-image" alt="" src="${ hostConfig.getResourcesFile("boardallowbacklogreodering.gif")}" data-bind="visible: false" />
                    </div>
                </div>
                <div>
                    <input type="radio" name="card-reordering-radio" id="PreserveBacklogOrder" value="true" data-bind="checked: preserveBacklogOrderBinding, disable: !canEdit, event: { focus: onFocus, blur: onBlur }">
                    <label for="PreserveBacklogOrder">${ AgileControlsResources.Board_Options_CardReordering_PreserveBacklogOrder}</label>
                    <div>
                        <img class="card-reordering-image" alt="" src="${ hostConfig.getResourcesFile("board.png")}" data-alt="${hostConfig.getResourcesFile("boardpreservebacklogorder.gif")}" data-bind="click: toggle" />
                        <img class="card-reordering-image" alt="" src="${ hostConfig.getResourcesFile("boardpreservebacklogorder.gif")}" data-bind="visible: false" />
                    </div>
                </div>
            </div>
        </div>
    </div>
`;
template_strings["card_annotation_info_template"] = `
    <div class="text-area-container">
        <h2 class="main-header card-annotation-title">${ AgileControlsResources.CSC_CARDS_ANNOTATION_TAB_TITLE}</div>
        <div class="main-description card-annotation-description">${ AgileControlsResources.CardAnnotation_Description}</div>
    </div>
`;
template_strings["card_annotations_customization_template"] = `
    <div class="annotation-template-container-table-wrapper">
        <div class="annotation-template-container-table">
            <div class="annotation-settings-header" data-bind="visible: (availableAnnotations().length > 0)">
                <div data-bind="visible: annotationsLimitReached()">
                    <i class="bowtie-icon bowtie-status-info"></i>
                    <span>${ AgileControlsResources.CardAnnotation_EnabledLimit}</span>
                </div>
                <div class="annotation-settings-header-container">
                    <div class="annotation-name-heading">${ AgileControlsResources.CardAnnotation_HeaderName}</div>
                    <div class="annotation-state-heading">
                        <div class="annotation-preview-heading">${ AgileControlsResources.CardAnnotation_HeaderPreview}</div>
                        <div class="annotation-enabled-heading">${ AgileControlsResources.CardAnnotation_EnabledStateLabel}</div>
                    </div>
                </div>
            </div>
            <div class="annotations-table-row">
                <div class="annotations-table-cell">
                    <div class="annotations-container-wrapper">
                        <div class="annotations-container">
                            <div class="annotation-list-template-container" data-bind="foreach: availableAnnotations">
                                <div class="annotation-container">
                                    <div data-bind="template: { name: 'annotation_view_template' }"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;

template_strings["annotation_view_template"] = `
    <div class="compact-annotation-container">
        <div class="annotation-name" data-bind="text: name"></div>
        <div class="annotation-summary">
            <div class="annotation-icon" data-bind="html: iconControl"></div>
            <input
                type="checkbox"
                class="annotation-toggle"
                data-bind="checked: isOn, attr: { disabled: !$parent.isEditable(), 'aria-label': ariaLabel }" />
        </div>
    </div>
`;

//        <!-- error message area-->

template_strings["card_styling_info_template"] = `
    <div class="text-area-container">
        <h2 class="main-header card-styling-title">${ AgileControlsResources.CardStyling_Title}</div>
        <div class="main-description card-styling-description" id="cardStylingDescription">${ AgileControlsResources.CardStyling_Description}</div>
        <div class="message-container" data-bind="visible: error()">
            <div class="message-area-control error-message visible server-error">
                <span data-bind="text: error"></span>
            </div>
        </div>
        <div class="section-description card-styling-manage-rules-standalone-description">${ AgileControlsResources.CardStyling_ManageRules_Standalone_Description}</div>
    </div>
`;

template_strings["card_styling_rules_template"] = `
    <div class="rules-template-container-table-wrapper">
        <div class="rules-template-container-table">
            <div role="button" aria-label="${ AgileControlsResources.CardStyling_AddRule_Label}" aria-describedby="cardStylingDescription" class="add-control" data-bind="click: addNewStyleRule, returnKey: addNewStyleRule, hasfocus: addRuleFocus, css: { 'disable': disableAddStyle }, attr: { 'aria-disabled': disableAddStyle }" tabindex="0">
                <span class="add-control-icon">
                    <i class="bowtie-icon bowtie-math-plus" data-bind="css: { 'i.bowtie-math-plus-gray': disableAddStyle }"></i>
                </span>
                <div class="control-text">${ AgileControlsResources.CardStyling_NewStylingRule}</div>
            </div>
            <div data-bind="visible: styleRuleLimitReached()">
                <i class="bowtie-icon bowtie-status-info"></i>
                <span>${ AgileControlsResources.CardStyling_MaxRuleWarning}</span>
            </div>
            <div class="style-rules-header" data-bind="visible: (styleRules().length > 0)">
                <div class="style-rules-header-container">
                    <div class="gripper-placeholder" data-bind="visible: isEditable"></div>
                    <div class="rule-name-heading">${ AgileControlsResources.CardStyling_HeaderRuleName}</div>
                    <div class="rule-state-heading" data-bind="css: { 'rules-with-contextmenu': isEditable }">
                        <div class="rule-preview-heading">${ AgileControlsResources.CardStyling_HeaderPreview}</div>
                        <div class="rule-enabled-heading">${ AgileControlsResources.CardStyling_EnabledStateLabel}</div>
                    </div>
                </div>
            </div>
            <div class="rules-table-row">
                <div class="rules-table-cell">
                    <div class="rules-container-wrapper">
                        <div class="rules-container">
                            <div class="rule-list-template-container" data-bind="foreach: styleRules, styleRulesSortable: styleRules">
                                <div class="rule-container">
                                    <div data-bind="template: { name: 'rule_view_template' }"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
`;

template_strings["rule_view_template"] = `
    <div class="compact-rule-container" role="button" aria-describedby="CardStyleRule_AriaDescribedby" tabindex="0" data-bind="css: { 'active': isSelected }, click: $parent.onClickCompactRule, event: { keyup: $parent.onKeyPress }, attr: {'aria-label': ariaLabel, 'aria-expanded': isSelected }">
        <div id="CardStyleRule_AriaDescribedby" data-bind="visible: false" >${ AgileControlsResources.CardStyleRule_AriaDescribedby}</div>
        <div class="gripper"></div>
        <div class="rule-name" data-bind="text: name"></div>
        <div class="rule-summary">
            <div class="rule-color" data-bind="style: { backgroundColor: color, color: titleColor },
                css: { 'bold': isBoldSelected, 'italic': isItalicsSelected, 'underline': isUnderlineSelected },
                attr: { 'aria-label': getSelectedColorTooltip() }">
                ${ AgileControlsResources.CardStyling_PreviewText}
            </div>
            <input aria-label="${ AgileControlsResources.CardStyling_RuleCheckbox_ToolTip}" type="checkbox" class="rule-switch" data-bind="checked: isOn, attr: { disabled: !$parent.isEditable(), 'aria-disabled': !$parent.isEditable() }" tabindex="-1" />
            <div class="rule-state"></div>
            <div class="bowtie-icon bowtie-ellipsis" data-bind="visible: $parent.isEditable(), menuClickHandler: $data"></div>
            <div class="bowtie-icon bowtie-status-error" data-bind="visible: !isValid() && !isSelected()"></div>
        </div>
    </div>

    <div class="rule-form-container" data-bind="visible: isSelected">
        <!--name section-->
        <div class="section-header master-detail-content-topmost">${ AgileControlsResources.CardStyleRule_NameSectionTitle}</div>
        <div class="name-section">
            <div class="input-container">
                <span class="label">${ AgileControlsResources.CardStyleRule_NameLabel}</span>
                <span class="input-wrap">
                    <input aria-label="${ AgileControlsResources.CardStyleRule_NameSectionTitle}" type="text" data-bind="value: name, valueUpdate: ['keyup', 'propertychange', 'input'], css: { 'invalid': (isDuplicateName() || isNameEmpty()) }, attr: { readonly: !$parent.isEditable(), disabled: !$parent.isEditable() }" maxlength="255" />
                </span>
            </div>
            <!-- error message area-->
            <div class="message-container" data-bind="if: (isDuplicateName() || isNameEmpty())">
                <div class="message-area-control visible">
                    <div class="bowtie-icon bowtie-status-error" data-bind="visible: (isDuplicateName() || isNameEmpty())"></div>
                    <div class="agile-board-error-message" data-bind="if: !isNameEmpty() && isDuplicateName()">${ AgileControlsResources.CardStyling_DuplicateName_Error}</div>
                    <div class="agile-board-error-message" data-bind="if: isNameEmpty">${ AgileControlsResources.CardStyling_EmptyName_Error}</div>
                </div>
            </div>
        </div>

        <!--style section-->
        <div class="section-header">${ AgileControlsResources.CardStyleRule_StylingLabel}</div>
        <div class="section-description styling">${ AgileControlsResources.CardStyleRule_StyleInstruction}</div>

        <div class="style-section">
            <div class="style-sub-label card-color">${ AgileControlsResources.CardStyleRule_CardColorLabel}</div>
            <div class="card-background style-section" data-bind="tfsColorPicker: getStyleBackgroundPickerOptions()" />
            <div class="title-styling-container" data-bind="event: { keydown: onTitleToolbarKeydown }">
                <div class="style-sub-label title-style" id="CardStyleRule_TitleStyleLabelId">${ AgileControlsResources.CardStyleRule_TitleStyleLabel}</div>
                <div class="title-style style-section-container" role="group" aria-labelledby="CardStyleRule_TitleStyleLabelId">
                    <div class="title-style style-section">
                        <div class="rule-form-color-dropdown" data-bind="tfsFontColorPicker: getTitleColorPickerOptions()" />
                    </div>
                    <span role="button" class="title-bold title-style-btn noselect" aria-label="${ AgileControlsResources.CardStyleRule_Title_BoldToolTip}" data-bind="css: { 'toggle-on': isBoldSelected, 'disabled': !$parent.isEditable }, click: toggleBold, enterKeyDown: toggleBold, attr: { 'aria-disabled': !$parent.isEditable, 'aria-pressed': isBoldSelected }" tabindex="-1">
                        <span class="bowtie-icon bowtie-format-bold"></span>
                    </span>
                    <span role="button" class="title-italics title-style-btn noselect" aria-label="${ AgileControlsResources.CardStyleRule_Title_ItalicToolTip}" data-bind="css: { 'toggle-on': isItalicsSelected, 'disabled': !$parent.isEditable }, click: toggleItalics, enterKeyDown: toggleItalics, attr: { 'aria-disabled': !$parent.isEditable, 'aria-pressed': isItalicsSelected }" tabindex="-1">
                        <span class="bowtie-icon bowtie-format-italic"></span>
                    </span>
                    <span role="button" class="title-underline title-style-btn noselect" aria-label="${ AgileControlsResources.CardStyleRule_Title_UnderlineToolTip}" data-bind="css: { 'toggle-on': isUnderlineSelected, 'disabled': !$parent.isEditable }, click: toggleUnderline, enterKeyDown: toggleUnderline, attr: { 'aria-disabled': !$parent.isEditable, 'aria-pressed': isUnderlineSelected }" tabindex="-1">
                        <span class="bowtie-icon bowtie-format-underline"></span>
                    </span>
                </div>
            </div>
        </div>

        <!--criteria section-->
        <div class="section-header">${ AgileControlsResources.CardStyleRule_CriteriaLabel}</div>
        <div>${ AgileControlsResources.CardStyleRule_CriteriaInstructions}</div>
        <!-- criteria error message area-->
        <div aria-live="assertive" class="message-container" data-bind="if: (isWiqlInvalid() || (isWiqlEmpty() && hasBeenEdited()))">
            <div class="message-area-control visible">
                <div class="bowtie-icon bowtie-status-error" data-bind="visible: (isWiqlInvalid() || (!$data.hideWiqlEmptyError() && isWiqlEmpty()))"></div>
                <div class="agile-board-error-message" data-bind="if: isWiqlInvalid">${ AgileControlsResources.CardStyling_InvalidCriteria_Error}</div>
                <div class="agile-board-error-message" data-bind="if: (!$data.hideWiqlEmptyError() && isWiqlEmpty())">${ AgileControlsResources.CardStyling_EmptyCriteria_Error}</div>
            </div>
        </div>
        <div data-bind="visible: isAddClauseDisabled">
            <i class="bowtie-icon bowtie-status-info"></i>
            <span>${ AgileControlsResources.CardStyling_MaxClausesWarning}</span>
        </div>
        <div class="style-rule-criteria"></div>

    </div>
`;

template_strings["tag_coloring_info_template"] = `
    <div class="text-area-container">
        <h2 class="main-header tag-coloring-title">${ AgileControlsResources.CSC_CARDS_TAGCOLOR_TAB_TITLE}</div>
        <div class="main-description tag-coloring-description" id="tagColoringDescription">${ AgileControlsResources.TagColoring_Description}</div>
    </div>
`;

template_strings["tag_coloring_rules_template"] = `
    <div class="tag-color-template-container-table-wrapper">
        <div class="tag-color-template-container-table">
            <div role="button" class="add-control" data-bind="click: addNewTagColor, tagColorReturnKey: addNewTagColor, hasfocus: focusOnAddTag, css: { 'disable': disableAdd }, attr: { 'aria-describedby': disableAdd ? 'tagColoringMaxWaring' : 'tagColoringDescription', 'aria-disabled': disableAdd }" tabindex="0" aria-label="${ AgileControlsResources.CardOptions_NewTagColorToolTip}">
                <span class="add-control-icon">
                    <i class="bowtie-icon bowtie-math-plus" data-bind="css: { 'i.bowtie-math-plus-gray': disableAdd }"></i>
                </span>
                <div class="control-text">${ AgileControlsResources.TagColoring_NewTag}</div>
            </div>
            <div data-bind="visible: showWarning">
                <i class="bowtie-icon bowtie-status-info"></i>
                <span id="tagColoringMaxWaring">${ AgileControlsResources.TagColoring_MaxRuleWarning}</span>
            </div>
            <div class="tags-container-wrapper">
                <table class="tag-fields-header">
                    <tr class="tags-caption" data-bind="visible: ($data.styleRules().length > 0)">
                        <th class="tags-caption-name">${ AgileControlsResources.TagColoring_TagHeader}</th>
                        <th class="tags-caption-color">${ AgileControlsResources.TagColoring_ColorHeader}</th>
                        <th class="tags-caption-enable">${ AgileControlsResources.TagColoring_EnabledHeader}</th>
                        <th></th>
                        <th></th>
                    </tr>
                </table>
                <div class="tag-fields-scrollable-section">
                    <table class="tags-container">
                        <tbody class="tag-fields-section" data-bind="foreach: styleRules">
                            <tr class="tag-field-content-area" data-bind="handleFocusOnCombo: $data, event: { mouseover: $parent.onMouseOver, onfocusin: $parent.onMouseOver }">
                                <td class="tag-field" data-bind="tagcombo: $data, comboOptions: $parent.tagsComboOptions, comboContainer: $parent.COMBOCONTAINERSELECTOR">
                                    <div class="comboarea"></div>
                                </td>
                                <td class="style-section tag-color-picker" data-bind="tfsColorPicker: getTagColorPickerOptions()" />
                                <td class="tag-enable-checkbox" aria-label="${ AgileControlsResources.CardOptions_EnableDisableTagColor}">
                                    <input aria-label="${ AgileControlsResources.CardOptions_EnableDisableTagColor}" type="checkbox" data-bind="checked: isOn, enable: $parent.isEditable(), attr: { 'aria-disabled': !$parent.isEditable() }" />
                                </td>
                                <td class="tag-delete-section">
                                    <i role="button" aria-label="${ AgileControlsResources.CardOptions_DeleteTagColor}" class="bowtie-icon bowtie-math-multiply" data-bind="click: $parent.removeTagColor, clickOnEnterKey: true, visible: $parent.isEditable()" tabindex="0"></i>
                                </td>
                                <td class="error-message-section">
                                    <div class="control-message-area" data-bind="visible: $data.isDuplicate() ">
                                        <div class="bowtie-icon bowtie-status-error" style="display: none" data-bind="visible: $data.hasError" />
                                        <div class="agile-board-error-message" data-bind="text: $data.errorMessage" />
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
`;

template_strings["test_annotation_config_template"] = `
    <h2 class="main-header">${ AgileControlsResources.CSC_TESTS_TAB_TITLE}</div>
    <div class="main-description">${ AgileControlsResources.TestAnnotation_Configuration_Description}</div>
    <div data-bind="template: { name: 'test_plan_configuration_template', data: planSettingsViewModel }"></div>
    <div data-bind="template: { name: 'test_outcome_configuration_template', data: outcomeSettingsViewModel }"></div>
`;

template_strings["test_plan_configuration_template"] = `
    <div class="section-header">${ AgileControlsResources.TestAnnotation_Configuration_TestPlan_Title}</div>
    <div class="section-description">${ AgileControlsResources.TestAnnotation_Configuration_TestPlan_Description}</div>
    <div class="team-settings test-settings">
        <div class="teamsettings-radiolist">
            <!-- value radio button is bound to enum where 0 is default and 1 is for custom -->
            <div class="test-settings-option">
                <input type="radio" name="testPlanType" value="0" id="defaultPlan" data-bind="checked: model.testPlanType, attr: { disabled: !$parent.isEditable(), 'aria-disabled': !$parent.isEditable() }" />
                <label for="defaultPlan">${ AgileControlsResources.TestAnnotation_Configuration_TestPlan_Default}</label>
            </div>
            <div class="test-settings-option">
                <input type="radio" name="testPlanType" value="1" id="customPlan" data-bind="checked: model.testPlanType, attr: { disabled: !$parent.isEditable(), 'aria-disabled': !$parent.isEditable() }" />
                <label for="customPlan">${ AgileControlsResources.TestAnnotation_Configuration_TestPlan_Custom}</label>
            </div>
        </div>
        <div class="test-plan-selection">
            <input class="selected-test-plan" aria-label="${ AgileControlsResources.TestAnnotation_Configuration_TestPlan_Custom_Placeholder}" data-bind="value: testPlanTitle, enable: Number(model.testPlanType()) === 1 && $parent.isEditable()" placeholder="${AgileControlsResources.TestAnnotation_Configuration_TestPlan_Custom_Placeholder}" readonly tabindex="-1"/>
            <button class="browse-test-plans" data-bind="click: openQueryDialog, enable: Number(model.testPlanType()) === 1 && $parent.isEditable()" title="${ AgileControlsResources.TestAnnotation_Configuration_TestPlan_Custom_Placeholder}">...</button>
        </div>
    </div>
`;

template_strings["test_outcome_configuration_template"] = `
    <div class="section-header">${ AgileControlsResources.Configure_Outcome_Title}</div>
    <div class="section-description">${ AgileControlsResources.Configure_Outcome_Description}</div>
    <div class="team-settings test-settings">
        <div class="outcome-settings-container">
            <input id="configureTestOutcome" aria-describedby="configureOutcomeInfo" type="checkbox" data-bind="checked: model.propagateOutcome, attr: { disabled: !$parent.isEditable(), 'aria-disabled': !$parent.isEditable() }" />
            <label for="configureTestOutcome">${ AgileControlsResources.Configure_Outcome_Label}</label>
        </div>
        <div>
            <span class="info-icon bowtie-icon bowtie-status-info"></span><span style="margin-left: 6px;" id="configureOutcomeInfo">${ AgileControlsResources.Configure_Outcome_Info}</span>
        </div>
    </div>
`;

template_strings["field-settings-tab-content-template"] = `
    <div>
        <div class="section-header">${ AgileControlsResources.CommonSettings_Fields_CoreFieldsSectionHeader}</div>
        <div class="core-fields-checkbox">
            <input type="checkbox" id="showId" data-bind="checked: showID">
            <label for="showId" data-bind="text: idLabelText"></label>
        </div>
        <div class="core-fields-checkbox">
            <input type="checkbox" id="showAssignedTo" data-bind="checked: showAssignedTo">
            <label for="showAssignedTo" data-bind="text: assignedToLabelText"></label>
        </div>
        <div>
            <span class="field-format-selector"  data-bind="combo: assignedToSelectedFormat, comboOptions: assignedToComboOptions, comboContainer: comboContainerSelector"><div class="comboarea"></div></span>
        </div>
        <div class="core-fields-checkbox" data-bind="visible: hasEffortField">
            <input type="checkbox" id="showEffort" data-bind="checked: showEffort">
            <label for="showEffort" data-bind="text: effortLabelText"></label>
        </div>      
        <div class="core-fields-checkbox">
            <input type="checkbox" id="showTags" data-bind="checked: showTags">
            <label for="showTags" data-bind="text: tagsLabelText"></label>
        </div>
        <div class="section-header additional-field-section-header">${ AgileControlsResources.CommonSettings_Fields_AdditionalFieldsSectionHeader}</div>
        <div class="section-header-description" id="additionalFieldsHelpText">${ AgileControlsResources.CardOptions_AdditionalFieldsSectionHelpText}</div>
        <div role="button" aria-describedby="additionalFieldsHelpText" aria-label="${ AgileControlsResources.CardFields_AddNewField_Label}" class="add-control" data-bind="click: addAdditionalField, hasfocus: focusOnAddField, clickOnEnterKey: true, css: {'disable': !fieldAdditionEnabled() }, attr: { 'aria-disabled': !fieldAdditionEnabled() }" tabindex="0">
            <span class="add-control-icon">
                <i class="icon bowtie-icon bowtie-math-plus" data-bind="css: { 'i.bowtie-math-plus-gray': !fieldAdditionEnabled() }"></i>
            </span>
            <div class="control-text">${ AgileControlsResources.CardOptions_AddField}</div>
        </div>
        <div  class="additional-fields-section" data-bind="foreach: additionalFields, additionalFieldsSortable: additionalFields">
           <div class="additional-field" data-bind="combo: $data, comboOptions: $parent.additionalFieldComboOptions, comboContainer: $parent.comboContainerSelector" tabindex="0" aria-label="${ AgileControlsResources.CardOptions_AddField}">
              <span class="additionalfield-content-area" data-bind="handleFocus: true">
                  <div class="gripper" style="display:none" data-bind="visible: true"></div>
                  <div class="comboarea"></div>
                  <i role="button" aria-label="${ AgileControlsResources.CardFields_Settings_AdditionalFields_Delete_Label}" class="icon bowtie-icon bowtie-math-multiply" style="display:none" data-bind="click: $parent.removeAdditionalField, clickOnEnterKey: true, visible: $parent.canEdit" tabindex="0"></i>
              </span>
              <div aria-live="assertive" class="control-message-area" data-bind="visible: $data.showError">
                  <div class="icon bowtie-icon bowtie-status-error" style="display:none" data-bind="visible: $data.hasError" />
                  <div class="agile-board-error-message" data-bind="text: $data.errorMessage"/>
              </div>
           </div>
        </div>

        <div class="section-header" data-bind="text: showEmptyFieldsLabelText" ></div>
        <div class="core-fields-checkbox">
            <input type="checkbox" id="showEmptyFields" data-bind="checked: showEmptyFields">
            <label for="showEmptyFields">${ AgileControlsResources.CardFieldOptions_ShowEmptyFieldsHelpText}</label>
        </div>
    </div>
`;

template_strings["filter-control-template"] = `
    <div class="filter-control">
        <table>
            <tr class="field-filters-container" data-bind="if: areFieldFiltersAvailable, visible: showFieldFilters">
                <td>
                    <div>
                        <!-- ko foreach: fieldFilterViewModels  -->
                        <div class="field-filter" data-bind="fieldFilter: $data"></div>
                        <!-- /ko -->
                        <div data-bind="visible: hasSelectedFilters" class="clearall-section">
                            <a><span role="button" title="${ AgileControlsResources.Filtering_ClearAll}" data-bind="click: clearAllFilters, clickOnEnterKey: true" tabindex="0">${AgileControlsResources.Filtering_ClearAll}</span></a>
                        </div>
                    </div>
                </td>
            </tr>
        </table>
    </div>
`;

template_strings["tabstrip-collection-template"] = `
    <div class="tabstrip-collection" role="tablist" data-bind="foreach: tabs, sortable: tabs">
        <div class="tabstrip" role="tab" tabindex="-1" data-bind="attr: { 'aria-label': tabName, 'aria-selected': (($parent.activeTabIndex() === $index()) ? 'true' : 'false') }, selectTabHandler: $data, tabMenuRightClickHandler: $data, css: { 'active': $parent.activeTabIndex() == $index(), 'unsortable': !$data.isSortable() }, icon: { project: $data.projectName, type: $data.workItemTypeName, containerSelector: '.work-item-icon' }">
            <span class="work-item-icon"></span>
            <div class="header-gripper" data-bind="hidden: $parent.tabs().length == 1 || !isSortable()"></div>
            <div class="header" data-bind="text: tabName"></div>
            <div class="icon bowtie-icon bowtie-ellipsis tabstrip-menu" role="button" data-bind="tabMenuClickHandler: $data" />
            <div class="icon bowtie-icon bowtie-status-error" data-bind="visible: !isValid()" />
        </div>
    </div>
`;

template_strings["test_list_template"] = `
    <!-- refactor css classes currently reuse test list class-->
    <div class="test-list">
        <div class="separator"></div>
        <div class="test-list-header">
          <div class="add-test-container" role="button" data-bind="click: onAddTestClick, clickBubble: false" tabindex="0">
            <div class="bowtie-icon bowtie-math-plus"></div>
            <span class="add-item-text">${ AgileControlsResources.TestAnnotation_AddTest}</span>
        </div>
          <div  class="navigate-to-suite-container" role="link" data-bind="click: onNavigateToSuiteClick, clickBubble: false" tabindex="0">
                <div class="add-test-separator"></div>
                <div class="bowtie-icon bowtie-arrow-open"></div>
          </div>
        </div>
        <div class="test-list-container" data-bind="foreach: testPointCollection, droppableTestPointContainer: $data">
            <div class="test" tabindex="0" data-bind="click: onClickTestDiv, event: { contextmenu: openMoreMenu, 'keydown.VSS.Agile': onKeyUp }, clickBubble: false, scrollTo: $root.scrolledItem() == $data, css: { 'tabbed-focus': isContextMenuOpen, 'point-edit-mode': isEditing}, draggableTestPointItem: { item: $data, parentItem: $root } ">
                <div class="gripper"></div>
                <div class="test-state icon" data-bind="testOutcome: testPoint().outcome"></div>
                <div class="error-message-icon bowtie-icon bowtie-status-error" data-bind="visible: testPoint().isErrorOccured" />
                <div class="test-title-container">
                    <div class="title ellipsis" data-bind="clampText: testPoint().testCase().name">
                        <span class="clamped-text clickable-title" data-bind="text: testPoint().testCase().name, css: { 'error-title': testPoint().isErrorOccured }, visible: !isEditing(), click: open"></span>
                        <textarea maxlength="255" class="editableTitleContent" data-bind="visible: isEditing, click: onClickHandler, value: testPoint().testCase().name, valueUpdate: ['keyup', 'paste'], hasfocus: isEditing, event: { contextmenu: onContextMenu, selectstart: onSelectStart }"></textarea>
                    </div>
                </div>
                <div class="test-point-context-menu" data-bind="click: openMoreMenu">
                    <div class="bowtie-icon bowtie-ellipsis test-menu" data-bind="visible: !isNew(), css: { 'tabbed-focus': isContextMenuOpen }"></div>
                </div>
            </div>
        </div>
    </div>
`;

template_strings["work_item_list_template"] = `
    <div class="work-item-list">
        <div class="separator" />
        <div class="add-work-item-container" role="button" data-bind="visible: workItemCreationEnabled, click: addNewDefaultWorkItem, clickBubble: false" tabindex="0">
            <div class="bowtie-icon bowtie-math-plus" />
            <span class="add-item-text" data-bind="text: addItemText"></span>
        </div>
        <div class="work-item-list-container" data-bind="click: onClickWorkItemListContainer, clickBubble: true, foreach: listItems, sortableChecklistContainer: listItems">
            <div class="work-item" role="checkbox" tabindex="0" data-bind="click: onClickWorkItem, event: { contextmenu: createContextMenu, 'keydown.VSS.Agile': onKeyDownWorkItemHandler }, clickBubble: true, attr: { id: id(), itemType: $data.itemType }, scrollTo: $root.scrolledItem() == $data, sortableChecklistItem: { item: $data, parentItemList: $root.listItems }, icon: { project: $data.projectName, type: $data.workItemTypeName, containerSelector: '.work-item-icon' }">
                <div class="gripper" data-bind="style: { visibility: canReorder() ? '' : 'hidden' }"></div>
                <input class="work-item-state" type="checkbox" data-bind="checked: isComplete, disable: isSaving, click: onClickWorkItemStateCheckBox, clickBubble: true, style: { visibility: isSaved() ? '' : 'hidden' }" tabindex="-1" />
                <span class="work-item-icon"></span>
                <div class="error-message-icon bowtie-icon bowtie-status-error" data-bind="visible: !isValid()" />
                <div class="work-item-title-container" data-bind="css: { 'show-error': !isValid() }">
                    <div class="title ellipsis" data-bind = "css: { 'completed': isComplete }">
                        <span class="clickable-title" data-bind="text: name, css: { 'error-title': !isValid() }, visible: !isEditing(), click: openWorkItem" />
                    </div>
                </div>
                <div class="work-item-context-menu" data-bind="click: createContextMenu">
                    <div class="bowtie-icon bowtie-ellipsis work-item-menu" data-bind="visible: isSaved(), css: { 'tabbed-focus': isContextMenuOpen() }"></div>
                </div>
            </div>
        </div>
    </div>
`;

template_strings["swimlane-settings-tab-content-template"] = `
    <div class="section-header master-detail-content-topmost">
        <span data-bind="text: title"/>
    </div>
    <div class="section-description">
        <span data-bind="text: subtitle"/>
    </div>
    <div class="input-container" data-bind="visible: isLaneNameEditable">
        <span class="label">${ AgileControlsResources.Swimlane_Settings_Lane_Label}</span>
        <!-- Add an wrapper span and use the border of the wrapper span instead of input board to solve the FF high contrast issue -->
        <span class="input-wrap">
            <input aria-label="${ AgileControlsResources.Swimlane_Settings_Tab_Title}" type="text" data-bind="value: name, valueUpdate: 'keyup', css: { 'invalid': !isValid() }, attr: { 'aria-invalid': !isValid() }" class="swimlane-name-input"/>
        </span>
    </div>
    <div aria-live="assertive" class="control-message-area" data-bind="visible: message() || warningMessage()">
        <div class="icon bowtie-icon bowtie-status-error" data-bind="visible: !isValid()"/>
        <div class="agile-board-error-message" data-bind="text: message(), visible: !isValid()"/>
        <div class="icon bowtie-icon bowtie-status-warning" data-bind="visible: isValid() && warningMessage()"/>
        <div class="warning-message" data-bind="text: warningMessage()"/>
    </div>
`;

template_strings["column-settings-tab-content-template"] = `
    <div class="column-settings-tab-content">
        <!-- Column Name Section -->
        <div class="section-header master-detail-content-topmost">${ AgileControlsResources.Column_Settings_Name_Title}</div>
        <div class="input-container" >
            <span class="label">${ AgileControlsResources.Column_Settings_Name_Label}</span>
            <span class="input-wrap">
                <input aria-label="${ AgileControlsResources.Column_Settings_Name_Title}" type="text" data-bind="value: name, valueUpdate: ['keyup', 'paste'], css: {'invalid': !nameIsValid()}, attr: { 'aria-invalid': !isValid() }" class="column-name-input"/>
            </span>
        </div>
        <div aria-live="assertive" class="control-message-area" data-bind="visible: nameMessage">
            <div class="icon bowtie-icon bowtie-status-error" data-bind="visible: !nameIsValid()" />
            <div class="agile-board-error-message" data-bind="text: nameMessage"/>
        </div>           
        <!-- ko if: isInProgressColumn() -->
        <!-- WIP Limit Section -->
        <div class="section-header">${ AgileControlsResources.Column_Settings_WIP_Limit_Title}</div>
        <div class="section-description" id="columnSettingWipLimit">${ AgileControlsResources.Column_Settings_WIP_Limit_Subtitle}</div>
        <div class="input-container" >
            <span class="label">${ AgileControlsResources.Column_Settings_WIP_Limit_Label}</span>
            <span class="input-wrap">
                    <input aria-label="${ AgileControlsResources.Column_Settings_WIP_Limit_Title}" aria-describedby="columnSettingWipLimit" class="wip-limit-input" type="text" data-bind="value: itemLimit, valueUpdate: ['keyup', 'paste'], css: {'invalid': !itemLimitIsValid()}"/>
            </span>
        </div>
        <div aria-live="assertive" class="control-message-area" data-bind="visible: itemLimitMessage">
            <div class="icon bowtie-icon bowtie-status-error" data-bind="visible: !itemLimitIsValid()"/>
            <div class="agile-board-error-message" data-bind="text: itemLimitMessage"/>
        </div>

        <!-- Split Columns Section -->
        <div class="section-checkbox">
            <span><input id="splitColumnCheckbox" type="checkbox" data-bind="checked: isSplit"/></span>
            <label class="split-column-label" for="splitColumnCheckbox">${ AgileControlsResources.Column_Settings_Split_Columns_Title}</label>
        </div>
        <!-- /ko -->

        <!-- State Mapping Section -->
        <div class="section-header">
            ${ AgileControlsResources.Column_Settings_State_Mapping_Title}
        </div>
        <div class="section-description" data-bind="text: stateMappingsDescription" />
        <div data-bind="foreach: stateMappings">
            <div class="input-container" >
                <div class="column-state-label label" data-bind="text: stateName"></div>
                <!-- ko if: allowEditing() -->
                <div aria-label="${ AgileControlsResources.Column_Settings_State_Mapping_Label}" class="column-state-value" data-bind="vssCombo: getComboOptions(), css: { 'invalid': !isValid() }, attr: { 'aria-invalid': !isValid() }"></div>
                <!-- /ko -->
                <!-- ko if: !allowEditing() -->
                    <span class="input-wrap">
                        <input aria-disabled="false" type="text" data-bind="value: stateValue, enable: false, attr: { 'aria-invalid': !isValid(), 'aria-label': stateName }" />
                    </span>
                <!-- /ko -->
            </div>
            <div aria-live="assertive" class="control-message-area" data-bind="visible: message">
                <div class ="icon bowtie-icon bowtie-status-error" data-bind="visible: !isValid()"/>
                <div class="agile-board-error-message" data-bind="text: message(), visible: !isValid()"/>
                <div class="icon bowtie-icon bowtie-status-warning" data-bind="visible: isValid() && message()"/>
                <div class="warning-message" data-bind="text: message, visible: isValid() && message()"/>
            </div>
        </div>
        
        <!-- ko if: isInProgressColumn() -->
        <!-- Definition of Done -->
        <div class="section-header">${ AgileControlsResources.Column_Settings_Definition_of_Done_Title}</div>
        <div class="section-description" id="columnSettingsDoD">${ AgileControlsResources.Column_Settings_Definition_of_Done_Subtitle}</div>
        <div>
            <textarea aria-label="${ AgileControlsResources.Column_Settings_Definition_of_Done_Title}" aria-describedby="columnSettingsDoD" rows="5" type="text" data-bind="value: description, valueUpdate: ['change', 'keyup', 'paste']" />
        </div>
        <div aria-live="assertive" class="control-message-area" data-bind="visible: descriptionMessage">
            <div class="icon bowtie-icon bowtie-status-error" data-bind="visible: !descriptionIsValid()"/>
            <div class="agile-board-error-message" data-bind="text: descriptionMessage"/>
        </div>
        <!-- /ko -->
    </div>
`;
