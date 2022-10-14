export const EMERG = 0;
export const ALERT = 1;
export const CRIT = 2;
export const ERROR = 3;
export const WARNING = 4;
export const NOTICE = 5;
export const INFO = 6;
export const DEBUG = 7;

export type JournalDPriority = typeof EMERG | typeof ALERT | typeof CRIT | typeof ERROR | typeof WARNING | typeof NOTICE | typeof INFO | typeof DEBUG;

export const JOURNALD_PRIORITY_STRING = [
    "EMERG",
    "ALERT",
    "CRIT",
    "ERROR",
    "WARNING",
    "NOTICE",
    "INFO",
    "DEBUG",
] as const;

/** The minimum fields that a JournalD entry will have */
export type JournalDEntryMinimal = {
    /**
     * The cursor for the entry. A cursor is an opaque text string
     * that uniquely describes the position of an entry in the
     * journal and is portable across machines, platforms and
     * journal files.
     */
    __CURSOR: string;

    /**
     * The wallclock time (CLOCK_REALTIME) at the point in time the
     * entry was received by the journal, in microseconds since the
     * epoch UTC, formatted as a decimal string. This has different
     * properties from "_SOURCE_REALTIME_TIMESTAMP=", as it is
     * usually a bit later but more likely to be monotonic.
     */
    __REALTIME_TIMESTAMP: string;

    /**
     * The monotonic time (CLOCK_MONOTONIC) at the point in time the
     * entry was received by the journal in microseconds, formatted
     * as a decimal string. To be useful as an address for the
     * entry, this should be combined with the boot ID in
     * "_BOOT_ID=".
    */
    __MONOTONIC_TIMESTAMP: string;

    /** The kernel boot ID for the boot the message was generated in, formatted as a 128-bit hexadecimal string. */
    _BOOT_ID: string;

    // MESSAGE can possibly be empty, but this package ensures that message is at the very least ""
    /**
     * The human-readable message string for this entry. This is
     * supposed to be the primary text shown to the user. It is
     * usually not translated (but might be in some cases), and is
     * not supposed to be parsed for metadata.
     */
    MESSAGE: string | "";

    /**
    * Syslog compatibility field containing the identifier string (i.e.
    * "tag"). (Note that the tag is usually derived from
    * glibc's program_invocation_short_name variable, see
    * program_invocation_short_name(3).)
    */
    SYSLOG_IDENTIFIER: string | "";
};

export type JournalDEntry = JournalDEntryMinimal & {
    // Fields prefixed with an underscore are trusted fields, i.e.
    // fields that are implicitly added by the journal and cannot be
    // altered by client code.

    /** The process ID of the process the journal entry originates from formatted as a decimal string */
    _PID?: string;

    /** The user ID of the process the journal entry originates from formatted as a decimal string. */
    _UID?: string;

    /** The group ID of the process the journal entry originates from formatted as a decimal string. */
    _GID?: string;

    /** The name of the process the journal entry originates from. */
    _COMM?: string;

    /** The executable path of the process the journal entry originates from. */
    _EXE?: string;

    /** The command line of the process the journal entry originates from. */
    _CMDLINE?: string;

    /** The effective capabilities of the process the journal entry originates from. */
    _CAP_EFFECTIVE?: string;

    /** The session of the process the journal entry originates from, as maintained by the kernel audit subsystem. */
    _AUDIT_SESSION?: string;

    /** The login UID of the process the journal entry originates from, as maintained by the kernel audit subsystem. */
    _AUDIT_LOGINUID?: string;

    /** The control group path in the systemd hierarchy */
    _SYSTEMD_CGROUP?: string;

    /** The systemd slice unit name */
    _SYSTEMD_SLICE?: string;

    /** The systemd unit name */
    _SYSTEMD_UNIT?: string;

    /** The unit name in the systemd user manager (if any) */
    _SYSTEMD_USER_UNIT?: string;

    /** The systemd user slice unit name */
    _SYSTEMD_USER_SLICE?: string;

    /** The systemd session ID (if any) */
    _SYSTEMD_SESSION?: string;

    /** The owner UID of the systemd user unit or systemd session (if any) of the process the journal entry originates from. */
    _SYSTEMD_OWNER_UID?: string;

    /** The SELinux security context (label) of the process the journal entry originates from. */
    _SELINUX_CONTEXT?: string;

    /**
     * The earliest trusted timestamp of the message, if any is
     * known that is different from the reception time of the
     * journal. This is the time in microseconds since the epoch
     * UTC, formatted as a decimal string.
     */
    _SOURCE_REALTIME_TIMESTAMP?: string;

    /** The machine ID of the originating host, as available in machine-id(5). */
    _MACHINE_ID: string;

    /**
     * The invocation ID for the runtime cycle of the unit the
     * message was generated in, as available to processes of the
     * unit in $INVOCATION_ID (see systemd.exec(5)).
     */
    _SYSTEMD_INVOCATION_ID?: string;

    /** The name of the originating host. */
    _HOSTNAME: string;

    /**
     * How the entry was received by the journal service. Valid
     * transports are:
     * 
     * audit - for those read from the kernel audit subsystem
     * driver - for internally generated messages
     * syslog - for those received via the local syslog socket with the syslog protocol
     * journal - for those received via the native journal protocol
     * stdout - for those read from a service's standard output or error output
     * kernel - for those read from the kernel
     */
    _TRANSPORT?: 'audit' | 'driver' | 'syslog' | 'journal' | 'stdout' | 'kernel';

    /**
     * Only applies to "_TRANSPORT=stdout" records: specifies a
     * randomized 128bit ID assigned to the stream connection when
     * it was first created. This ID is useful to reconstruct
     * individual log streams from the log records: all log records
     * carrying the same stream ID originate from the same stream.
     */
    _STREAM_ID?: string;

    /**
     * Only applies to "_TRANSPORT=stdout" records: indicates that
     * the log message in the standard output/error stream was not
     * terminated with a normal newline character ("\n", i.e. ASCII
     * 10). Specifically, when set this field is one of nul (in case
     * the line was terminated by a NUL byte), line-max (in case the
     * maximum log line length was reached, as configured with
     * LineMax= in journald.conf(5)), eof (if this was the last log
     * record of a stream and the stream ended without a final
     * newline character), or pid-change (if the process which
     * generated the log output changed in the middle of a line).
     * Note that this record is not generated when a normal newline
     * character was used for marking the log line end.
     */
    _LINE_BREAK?: string;

    /**
     * If this file was written by a systemd-journald instance
     * managing a journal namespace that is not the default, this
     * field contains the namespace identifier. See
     * systemd-journald.service(8) for details about journal
     * namespaces.
     */
    _NAMESPACE?: string;

    /**
     * A priority value between 0 ("emerg") and 7 ("debug")
     * formatted as a decimal string. This field is compatible with
     * syslog's priority concept.
     */
    PRIORITY: `${JournalDPriority}`;

    /** Syslog compatibility field containing the facility (formatted as decimal string). */
    SYSLOG_FACILITY?: string;

    /** Syslog compatibility field containing the client PID. */
    SYSLOG_PID?: `${number}`,

    /** Syslog compatibility field containing the timestamp as specified in the original datagram. */
    SYSLOG_TIMESTAMP?: string,

    /**
     * The original contents of the syslog line as received in the
     * syslog datagram. This field is only included if the MESSAGE=
     * field was modified compared to the original payload or the
     * timestamp could not be located properly and is not included
     * in SYSLOG_TIMESTAMP=. Message truncation occurs when when the
     * message contains leading or trailing whitespace (trailing and
     * leading whitespace is stripped), or it contains an embedded
     * NUL byte (the NUL byte and anything after it is not
     * included). Thus, the original syslog line is either stored as
     * SYSLOG_RAW= or it can be recreated based on the stored
     * priority and facility, timestamp, identifier, and the message
     * payload in MESSAGE=.
     */
    SYSLOG_RAW?: string;

    /**
     * A documentation URL with further information about the topic
     * of the log message. Tools such as journalctl will include a
     * hyperlink to an URL specified this way in their output.
     * Should be a "http://", "https://", "file:/", "man:" or
     * "info:" URL.
     */
    DOCUMENTATION?: string;

    /**
     * The human-readable message string for this entry. This is
     * supposed to be the primary text shown to the user. It is
     * usually not translated (but might be in some cases), and is
     * not supposed to be parsed for metadata.
     */
    MESSAGE: string;

    /**
     * A 128-bit message identifier ID for recognizing certain
     * message types, if this is desirable. This should contain a
     * 128-bit ID formatted as a lower-case hexadecimal string,
     * without any separating dashes or suchlike. This is
     * recommended to be a UUID-compatible ID, but this is not
     * enforced, and formatted differently. Developers can generate
     * a new ID for this purpose with systemd-id128 new.
     */
    MESSAGE_ID?: string;

    /** Source filename of the code location generating this message, if known. */
    CODE_FILE?: string;

    /** Source line of the code location generating this message, if known. */
    CODE_LINE?: string;

    /** Source function of the code location generating this message, if known. */
    CODE_FUNC?: string;

    /**
     * The low-level Unix error number causing this entry, if any.
     * Contains the numeric value of errno(3) formatted as a decimal
     * string.
     */
    ERRNO?: string;

    /** A randomized, unique 128-bit ID identifying each runtime cycle of the unit. */
    INVOCATION_ID?: string;

    /** A randomized, unique 128-bit ID identifying each runtime cycle of the unit. */
    USER_INVOCATION_ID?: string;
} | { [key: string]: string; };