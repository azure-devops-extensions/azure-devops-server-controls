export class UserProfileInformationModel {
    public MailAddress: string;
    public CustomDisplayName: string;
	public ProviderDisplayName: string;
    public IsEmailConfirmationPending: boolean;
    public IdentityInformation: IdentityViewModelBase;
    public __RequestVerificationToken: any;
}

export class UserProfileModel {
    public providerDisplayName: string;
    public defaultMailAddress: string;
    public identity: IdentityViewModelBase;
    public userPreferences: UserPreferencesModel;
    public basicAuthenticationEnabled: boolean;
    public allThemes: ThemeModel[];
    public allTimeZones: TimeZoneInfoModel[];
    public allCultures: CultureInfoModel[];
}

export class UserProfilePreferencesModel {
    public AllThemes: ThemeModel[];
    public AllCultures: CultureInfoModel[];
    public AllTimeZones: TimeZoneInfoModel[];
    public SelectedCulture: any;
    public SelectedTimeZone: string;
    public SelectedTheme: string;
    public SelectedTimeFormat: string;
    public SelectedDateFormat: string;
    public SelectedCalendar: string;
}

export class TimeZoneInfoModel {
    public DisplayName: string;
    public Id: string;
}

export class ThemeModel {
    public DisplayName: string;
    public ThemeName: string;
}

export class CultureInfoModel {
    public OptionalCalendars: CalendarModel[];
    public DisplayName: string;
    public LCID: number;
}

export class CalendarModel {
    public DisplayName: string;
    public DateFormats: PatternModel[];
    public TimeFormats: PatternModel[];
}

export class PatternModel {
    public Format: string;
    public DisplayFormat: string;
}

export class IdentityViewModelBase {
    public AccountName: string;
    public IdentityType: string;
    public DisplayName: string;
    public FriendlyDisplayName: string;
    public Domain: string;
    public SubHeader: string;
    public TeamFoundationId: string; // Guid

    public Errors: string[];
    public Warnings: string[];

    public DescriptorIdentityType: string;
    public DescriptorIdentifier: string;
}

export class UserPreferencesModel {
    public CustomDisplayName: string;
    public PreferredEmail: string;
    public IsEmailConfirmationPending: boolean;
    public Theme: string;
    public TimeZoneId: string;
    public LCID: number;
    public Calendar: string;
    public DatePattern: string;
    public TimePattern: string;
    public ResetEmail: boolean;
    public ResetDisplayName: boolean;
    public __RequestVerificationToken: any;
}