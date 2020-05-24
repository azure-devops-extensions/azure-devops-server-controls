/// <reference types="jquery" />

import TFS = require("VSS/VSS");
import accountResources = require("Account/Scripts/Resources/TFS.Resources.Account");
import TFS_Core_Ajax = require("Presentation/Scripts/TFS/TFS.Legacy.Ajax");
import Controls = require("VSS/Controls");
import TreeViewControls = require("VSS/Controls/TreeView");
import Core = require("VSS/Utils/Core");
import Utils_String = require("VSS/Utils/String");
import TFS_Host = require("Presentation/Scripts/TFS/TFS.Host.TfsContext");
import Host_UI = require("Presentation/Scripts/TFS/TFS.Host.UI");
import TFS_UI = require("VSS/Utils/UI");

import ProfileControls = require("Account/Scripts/TFS.Details.Profile.Common.Controls");
import ProfileModels = require("Account/Scripts/TFS.Details.Profile.Common.Models");

var delegate = Core.delegate;
var domElem = TFS_UI.domElem;

export enum ProfilePreferencesFormElement {
    SaveButton,
    CancelButton,
    Language,
    DatePattern,
    TimePattern,
    TimeZone,
    Theme,
    Calendar
}

export class ProfilePreferencesPage extends Controls.BaseControl {
    // This doesn't actually override anything, only for informational purposes
    public static _controlType: string = 'ProfilePreferencesPage';

    private _navColumn: any;
    private _navEnhancement: any;
    private _initialData: ProfileModels.UserProfilePreferencesModel

    constructor(options?) {
        super(options);

        this._navColumn = $("#profile-area-nav");
    }

    private _getFormJqueryElement(elementType: ProfilePreferencesFormElement): JQuery {
        switch (elementType) {
            case ProfilePreferencesFormElement.SaveButton:
                return this._element.find(".profile-submit-button");
            case ProfilePreferencesFormElement.CancelButton:
                return this._element.find(".profile-cancel-button");
            case ProfilePreferencesFormElement.Language:
                return this._element.find(".language");
            case ProfilePreferencesFormElement.Theme:
                return this._element.find(".theme");
            case ProfilePreferencesFormElement.TimeZone:
                return this._element.find(".time-zone");
            case ProfilePreferencesFormElement.DatePattern:
                return this._element.find(".date-pattern");
            case ProfilePreferencesFormElement.TimePattern:
                return this._element.find(".time-pattern");
            case ProfilePreferencesFormElement.Calendar:
                return this._element.find(".calendar");
        }
    }

    private _isDiff(current: ProfileModels.UserProfilePreferencesModel, original: ProfileModels.UserProfilePreferencesModel) : boolean {
        return !(current.SelectedCulture == original.SelectedCulture &&
            current.SelectedTheme == original.SelectedTheme &&
            current.SelectedTimeZone == original.SelectedTimeZone &&
            current.SelectedDateFormat == original.SelectedDateFormat &&
            current.SelectedTimeFormat == original.SelectedTimeFormat);
    }

    private _determineButtonStates(e?: JQueryEventObject) {
        if (this._isDiff(this._getCurrentModel(), this._initialData)) {
            this._getFormJqueryElement(ProfilePreferencesFormElement.SaveButton).removeAttr("disabled").removeClass("disabled");
            this._getFormJqueryElement(ProfilePreferencesFormElement.CancelButton).removeAttr("disabled").removeClass("disabled");
        } else {
            this._getFormJqueryElement(ProfilePreferencesFormElement.SaveButton).attr("disabled", "disabled").addClass("disabled");
            this._getFormJqueryElement(ProfilePreferencesFormElement.CancelButton).attr("disabled", "disabled").addClass("disabled");
        }
    }

    private _getCurrentModel(): ProfileModels.UserProfilePreferencesModel {
        var preferences = new ProfileModels.UserProfilePreferencesModel();

        preferences.SelectedCulture = this._getFormJqueryElement(ProfilePreferencesFormElement.Language).val();
        if (preferences.SelectedCulture === "") {
            preferences.SelectedCulture = null;
        }

        preferences.SelectedTheme = this._getFormJqueryElement(ProfilePreferencesFormElement.Theme).val();
        preferences.SelectedTimeZone = this._getFormJqueryElement(ProfilePreferencesFormElement.TimeZone).val();
        preferences.SelectedDateFormat = this._getFormJqueryElement(ProfilePreferencesFormElement.DatePattern).val();
        preferences.SelectedTimeFormat = this._getFormJqueryElement(ProfilePreferencesFormElement.TimePattern).val();
        preferences.SelectedCalendar = this._getFormJqueryElement(ProfilePreferencesFormElement.Calendar).val();
        return preferences;
    }

    private _generateOption(pattern: ProfileModels.PatternModel, calendar: ProfileModels.CalendarModel): JQuery {
        return $("<option value='" + pattern.Format + "' data-calendar='" + calendar.DisplayName + "'/>")
            .text(pattern.DisplayFormat)
            .select({ that: this }, 
                function (e?: JQueryEventObject) { 
                    e.data.that._getFormJqueryElement(ProfilePreferencesFormElement.Calendar)
                        .val(this.attr("data-calendar")); 
                });
    }

    private _updatePatterns(e?: JQueryEventObject) {
        var dataSourceElement = this._getFormJqueryElement(ProfilePreferencesFormElement.Language),
            dateFormatField = this._getFormJqueryElement(ProfilePreferencesFormElement.DatePattern),
            timeFormatField = this._getFormJqueryElement(ProfilePreferencesFormElement.TimePattern),
            selectedDateFormat = dataSourceElement.attr("data-selected-date-format"),
            selectedTimeFormat = dataSourceElement.attr("data-selected-time-format"),
            calendarsJsonString: string, 
            selectedCalendar: string,
            calendars: ProfileModels.CalendarModel[],
            targetElement: JQuery;

        // Clear the options
        dateFormatField.html("");
        timeFormatField.html("");

        calendarsJsonString = dataSourceElement.find("option:selected").attr("data-calendars");
        calendars = JSON.parse(calendarsJsonString);
        for (var calendar in calendars) {
            for (var dateFormat in calendars[calendar].DateFormats) {
                this._generateOption(calendars[calendar].DateFormats[dateFormat], calendars[calendar]).appendTo(dateFormatField);
            }

            for (var timeFormat in calendars[calendar].TimeFormats) {
                this._generateOption(calendars[calendar].TimeFormats[timeFormat], calendars[calendar]).appendTo(timeFormatField);
            }
        }
        
        // set the selected patterns
        if (selectedDateFormat && selectedDateFormat.length > 0) {
            targetElement = dateFormatField.find('option[value="' + selectedDateFormat + '"]');
            if (targetElement.length > 0) {
                dateFormatField.find('option:selected').removeAttr("selected");
                targetElement.attr("selected", "selected");
            }
        }
        if (selectedTimeFormat && selectedTimeFormat.length > 0) {
            targetElement = timeFormatField.find('option[value="' + selectedTimeFormat + '"]');
            if (targetElement.length > 0) {
                timeFormatField.find('option:selected').removeAttr("selected");
                targetElement.attr("selected", "selected");
            }
        }

        // set default calendar
        // if there are multiple calendars we actually need to display a calendar option this is a temporary solution
        this._getFormJqueryElement(ProfilePreferencesFormElement.Calendar).val(
            dateFormatField.find('option:selected').attr("data-calendar"));

        // if the language is browser then we don't save patterns
        var culture = this._getFormJqueryElement(ProfilePreferencesFormElement.Language).val();
        if (culture === "") {
            this._getFormJqueryElement(ProfilePreferencesFormElement.DatePattern).attr("disabled", "disabled").addClass("disabled");
            this._getFormJqueryElement(ProfilePreferencesFormElement.TimePattern).attr("disabled", "disabled").addClass("disabled");
        } else {
            this._getFormJqueryElement(ProfilePreferencesFormElement.DatePattern).removeAttr("disabled").removeClass("disabled");
            this._getFormJqueryElement(ProfilePreferencesFormElement.TimePattern).removeAttr("disabled").removeClass("disabled");
        }
    }

    private _save(e?: JQueryEventObject) {
        var data : ProfileModels.UserProfilePreferencesModel = this._getCurrentModel(),
            url = $(e.srcElement).attr("data-post-target"),
            dataToPass: ProfileModels.UserPreferencesModel = new ProfileModels.UserPreferencesModel(),
            that = this;

        dataToPass.Theme = data.SelectedTheme;
        dataToPass.TimeZoneId = data.SelectedTimeZone;
        dataToPass.LCID = null;
        if (data.SelectedCulture) {
            dataToPass.LCID = data.SelectedCulture;
            // Don't pass the calendar
            // dataToPass.Calendar = data.SelectedCalendar;
            dataToPass.DatePattern = data.SelectedDateFormat;
            dataToPass.TimePattern = data.SelectedTimeFormat;
        }

        dataToPass.__RequestVerificationToken = $("input[name=__RequestVerificationToken]").val();

        this._element.find(".edit-form .wait").show();
        this._getFormJqueryElement(ProfilePreferencesFormElement.SaveButton)
            .addClass("disabled")
            .attr("disabled", "disabled");

        this._getFormJqueryElement(ProfilePreferencesFormElement.CancelButton)
            .addClass("disabled")
            .attr("disabled", "disabled");

        if (this._isDiff(this._getCurrentModel(), this._initialData)) {
            TFS_Core_Ajax.postHTML(
                '/_api/_common/UpdateUserProfile?__v=5',
                {
                    updatePackage: Core.stringifyMSJSON(dataToPass)
                },
                function (data) {
                    window.location.reload();
                },
                function (error) {
                    that._getFormJqueryElement(ProfilePreferencesFormElement.SaveButton)
                        .removeClass("disabled")
                        .removeAttr("disabled");

                    that._getFormJqueryElement(ProfilePreferencesFormElement.CancelButton)
                        .removeClass("disabled")
                        .removeAttr("disabled");

                    that._element.find(".edit-form .wait").hide();

                    if (error && error.message) {
                        ProfileControls.MessageAreaHelper.SetMessageAreaMessage(Utils_String.htmlDecode(error.message));
                    } else {
                        ProfileControls.MessageAreaHelper.SetMessageAreaMessage(accountResources.UserProfilePreferencesSaveFailed);
                    }
                },
                null
                );
        }
    }

    private _cancelEdits(e?: JQueryEventObject) {
        var elementListFirst = [ProfilePreferencesFormElement.Language],
            elementListData = [ProfilePreferencesFormElement.Theme, ProfilePreferencesFormElement.TimeZone],
            defaultValue: string;
        // elements for which the first element is the default value
        for (var element in elementListFirst) { // reselct the first element in each field
            this._getFormJqueryElement(elementListFirst[element]).find('option:selected').removeAttr("selected");
            this._getFormJqueryElement(elementListFirst[element]).find('option:first').attr("selected", "selected");
        }

        // elements which have a data-default-value attribute
        for (var element in elementListData) {
            this._getFormJqueryElement(elementListData[element]).find('option:selected').removeAttr("selected");
            defaultValue = this._getFormJqueryElement(elementListData[element]).attr("data-default-value");
            if (defaultValue && defaultValue !== null && defaultValue !== "") {
                this._getFormJqueryElement(elementListData[element]).find('option[value="' + defaultValue + '"]').attr("selected", "selected");
            } else {
                this._getFormJqueryElement(elementListData[element]).find('option:first').attr("selected", "selected");
            }
        }

        this._determineButtonStates();
    }

    public initialize() {
        super.initialize();
        var selectedDateFormat: string, selectedTimeFormat: string, targetElement: JQuery,
            elementList = [ProfilePreferencesFormElement.Language, ProfilePreferencesFormElement.Theme, ProfilePreferencesFormElement.TimeZone,
                ProfilePreferencesFormElement.DatePattern, ProfilePreferencesFormElement.TimePattern];
        this._initializeNav();

        // attach handlers
        this._getFormJqueryElement(ProfilePreferencesFormElement.Language).change(Core.delegate(this, this._updatePatterns));
        this._updatePatterns();

        this._initialData = this._getCurrentModel();

        for (var element in elementList)
            this._getFormJqueryElement(elementList[element]).change(Core.delegate(this, this._determineButtonStates));

        this._determineButtonStates();

        this._getFormJqueryElement(ProfilePreferencesFormElement.SaveButton).click(Core.delegate(this, this._save));
        this._getFormJqueryElement(ProfilePreferencesFormElement.CancelButton).click(Core.delegate(this, this._cancelEdits));

    }

    /// <summary>Initialized the navigation on the left side</summary>
    private _initializeNav() {
        var navContainer = $("<div class='nav-container' />").appendTo(this._navColumn);
        this._navEnhancement = <ProfileControls.ProfileNav>Controls.Enhancement.enhance(ProfileControls.ProfileNav, navContainer, { gutter: false, selectedNavItem: "preferences" });
    }
}

TFS.classExtend(ProfilePreferencesPage, TFS_Host.TfsContext.ControlExtensions);
Controls.Enhancement.registerEnhancement(ProfilePreferencesPage, ".profile-preferences")

// TFS plugin model requires this call for each tfs module.
TFS.tfsModuleLoaded("TFS.Details.Profile.Information.Controls", exports);
