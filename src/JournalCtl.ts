/**
 * @author Thomas Novotny
 * @packageDocumentation
 */

import EventEmitter from "events";
import childProcess, { ChildProcessWithoutNullStreams } from "child_process";
import readLine from "readline";
import { JournalDEntry, JournalDEntryMinimal, JournalDPriority } from "./JournalDEntry";

/**
 * JournalCtl filter object, with key being the field name (all caps) and value being the desired value
 * Only entries where all keys exist and have the specified value are returned from Journalctl
 */
export type JournalCtlFilters = {
    [key: string]: string;
};

/** 
 * Date in the format "2012-10-30 18:17:16". If the time part is omitted, "00:00:00" is assumed. If only the
 * seconds component is omitted, ":00" is assumed. If the date component is omitted, the current day is assumed.
 */
export type JournalDDateString = `${number}${number}${number}${number}-${number}${number}-${number}${number}${`${number}${number}:${number}${number}${`:${number}${number}` | ''}` | ''}`
    | `${`${number}${number}:${number}${number}${`:${number}${number}` | ''}` | ''}`;

export type JournalCtlOptions = {
    /** Show all fields in full, even if they include unprintable characters or are very long. 
     * @default false
     */
    all?: boolean,
    /** Show the most recent journal events and limit the number of events shown. 
     * @default 10 If neither since and until are set
     */
    lines?: number,
    /** Start showing entries on or newer than the specified date. 
     * Date specifications as strings must be in the format "2012-10-30 18:17:16". If the time part is omitted, "00:00:00" is assumed. */
    since?: JournalDDateString | Date,
    /** Show entries only until specified date. When this option is set, tailing will be disabled.
     * Date specifications as strings must be in the format "2012-10-30 18:17:16". If the time part is omitted, "00:00:00" is assumed. */
    until?: JournalDDateString | Date,
    /** Show messages for the specified syslog identifier SYSLOG_IDENTIFIER. */
    identifier?: string,
    /** Show messages for the specified systemd unit (such as a service unit) */
    unit?: string,
    /** Additional filters for metadata fields. */
    filter?: JournalCtlFilters,
    /** Priority */
    priority?: JournalDPriority | { from: JournalDPriority, to: JournalDPriority; };
};

/**
 * Validata a fieldname as proper journald fieldName. Allowed are only A-Z, 0-9 and underscores
 * @param fieldName Field name to validate
 * @throws Error if field name is invalid
 * @returns The same field name
 */
function validateFieldName(fieldName: string): string {
    const RegExp_ValidFieldName = /^[A-Z0-9_]+$/;
    if (!RegExp_ValidFieldName.test(fieldName)) throw new Error(`Not a valid journald Field Name: "${fieldName}"`);
    return fieldName;
}

/**
 * Validate a string as proper syslog identifier
 * @param identifier String to validate
 * @throws Error if field syslog identifier is invalid
 * @returns The same identifier
 */
function validateSyslogIdentifier(identifier: string): string {
    const RegExp_SyslogIdentifier = /^[^\s]+$/;
    if (!RegExp_SyslogIdentifier.test(identifier)) throw new Error(`Not a valid SYSLOG_IDENTIFIER: "${identifier}"`);
    return identifier;
}

/**
 * Validate date as proper date
 * @param dateString date string
 * @throws Error if date string is invalid
 * @returns well-formed date string
 */
function validateDate(dateString: string): JournalDDateString {
    const RegExp_DateString = /^\d\d\d\d-\d\d-\d\d(?: \d\d:\d\d(?::\d\d)?)?$/;
    if (!RegExp_DateString.test(dateString)) throw new Error(`Not a valid date: "${dateString}"`);
    if (isNaN(new Date(dateString).getTime())) throw new Error(`Not a valid date: "${dateString}"`);
    return dateString as JournalDDateString;
}

/**
 * Validate that a value is a positive integer
 * @throws Error if value is either not an integer or not positive
 * @param value the value that was tested
 */
function validatePositiveInteger(value: unknown): number {
    if (!Number.isInteger(value) || isNaN(value as number)) throw new Error(`Not an integer: ${value}`);
    if (value as number < 0) throw new Error(`Not a positive integer: ${value}`);
    return value as number;
}

/**
 * Validates a journald priority.
 * If priority is an integer, the functions clamps the values to the next valid priority value
 * @param priority priority value
 * @throws Error if priority is not a number or not an integer
 * @returns valid journald priority
 */
function validatePriority(priority: any): JournalDPriority {
    validatePositiveInteger(priority);
    if (priority < 0 || priority > 7) throw new Error(`Not a valid priority: ${priority}`);
    return priority as JournalDPriority;
}

/**
 * Validates a systemd unit name
 * @param unit Unit name to validate
 * @throws Error if unit name is not valid
 * @returns The unit name
 */
function validateUnit(unit: string): string {
    const RegExp_Systemd_Unit_Name = /^[A-Za-z0-9:\-_\.\\]+$/;
    if (!RegExp_Systemd_Unit_Name.test(unit)) throw new Error(`Not a valid systemd unit name: "${unit}"`);
    return unit;
}

/** Events that the Journalctl EventEmitter supports */
export type JournalCtlEvent = "message" | "exit" | "error";

/** JournalD entry with explicit field names which are defined by a const string array */
export type JournalDEntryWithExplicitFieldNames<FieldNames extends readonly string[]> = { [key in FieldNames[number]]?: string } & JournalDEntryMinimal;

/**
 * This class is an EventEmitter that watches the local systemd journal for events and emits them.
 * @typeParam FieldNames List of field names that should be included in the JournalD messages. If left undefined, the messages will include all available fields.
 */
export default class JournalCtl<FieldNames extends readonly string[] | undefined = undefined> extends EventEmitter {
    /** The journalctl process instance */
    protected journalCtl: ChildProcessWithoutNullStreams;
    /** stdErr */
    protected stdErrorText: string | null;
    /** Tracks whether an asyncgenerator exists already */
    protected generatorInstanceExtists: boolean;

    /**
     * Create a new JournalCtl interface with the specified options
     * 
     * @param options Optional options object
     * @throws Error if options are malformed or if the journalctl process can not be spawned 
     */
    public constructor(options: JournalCtlOptions = {}, outputFields?: FieldNames) {
        super();

        /** Initial args: 
         * -q (no error output)
         * -o json (output as newline delimited json) 
         */
        //const args: string[] = ['-q', '-o', 'json'];
        const args: string[] = ['-o', 'json'];

        if (options.until) {
            let dateString = typeof (options.until) === 'string' ? validateDate(options.until) : options.until.toISOString().replace(/T|\.\d\d\dZ/g, ' ').trim();
            args.push('-U', `${dateString}`);
        } else {
            // If "until" is not set, set -f (tail)
            args.push("-f");
        }
        if (options.all) args.push('-a');
        // Unless otherwise defined, default lines are 10
        if (!options.until && !options.since && options.lines === undefined) {
            args.push('-n', `${10}`);
        } else if (options.lines !== undefined) {
            args.push('-n', `${validatePositiveInteger(options.lines)}`);
        }
        if (options.since) {
            let dateString = typeof (options.since) === 'string' ? validateDate(options.since) : options.since.toISOString().replace(/T|\.\d\d\dZ/g, ' ').trim();
            args.push('-S', `${dateString}`);
        }
        if (options.since && options.until) {
            const dSince = (typeof (options.since) == 'string' ? new Date(options.since) : options.since);
            const dUntil = (typeof (options.until) == 'string' ? new Date(options.until) : options.until);
            if (dSince.getTime() > dUntil.getTime()) throw new Error(`'Since' date can not be more recent than 'Until' date.`);
        }
        if (options.priority !== undefined) {
            args.push('-p');
            if (typeof (options.priority) === 'number') {
                args.push(`${validatePriority(options.priority)}`);
            } else {
                args.push(`${validatePriority(options.priority.from)}..${validatePriority(options.priority.to)}`);
            }
        }
        if (options.identifier !== undefined) args.push('-t', validateSyslogIdentifier(options.identifier));
        if (options.unit) args.push('-u', validateUnit(options.unit));
        if (options.filter) {
            for (let key in options.filter) {
                args.push(`${validateFieldName(key)}=${options.filter[key]}`);
            }
        }
        if (outputFields) {
            outputFields.forEach((fieldName: string) => {
                args.push('--output-field', `${validateFieldName(fieldName)}`);
            });
            if (!outputFields.includes("MESSAGE")) args.push('--output-field', `MESSAGE`);
            if (!outputFields.includes("SYSLOG_IDENTIFIER")) args.push('--output-field', `SYSLOG_IDENTIFIER`);
            if (!outputFields.includes("_HOSTNAME")) args.push('--output-field', `_HOSTNAME`);
        }

        // Start journalctl
        //console.log(['journalctl', ...args].join(' '));
        this.journalCtl = childProcess.spawn('journalctl', args);

        this.stdErrorText = "";

        this.journalCtl.stderr.on('data', (chunk: any) => {
            this.stdErrorText += chunk.toString();
        });

        this.journalCtl.on("exit", (code: number | null) => {
            if (code) {
                this.emit('error', new Error(this.stdErrorText ?? `Process exited with code ${code}`));
            }
            this.emit('exit');
        });

        this.journalCtl.on("error", (err: Error) => {
            if (err.message.includes("ENOENT")) {
                this.emit('error', new Error(`journalctl executable not found. Is this a systemd distribution?`));
            } else if (err.message.includes("EACCES")) {
                this.emit('error', new Error(`journalctl executable not accessible.`));
            } else {
                this.emit('error', err);
            }
        });

        const lineReader = readLine.createInterface(this.journalCtl.stdout);

        lineReader.on('line', (line: string) => {
            try {
                // Note: apparently journald can in some cases end messages like ",  }" which adds an invalid comma. The replace function removes it
                let message = JSON.parse(line.replace(/,\s*\}$/, ' }')) as FieldNames extends readonly string[] ? JournalDEntryWithExplicitFieldNames<FieldNames> : JournalDEntry;
                if (message.MESSAGE === undefined) message.MESSAGE = "";
                if (message._HOSTNAME === undefined) message._HOSTNAME = "";
                this.emit('message', message);
            } catch (err) {
                this.emit('error', new Error(`Could not parse JSON: ${line}`));
            }
        });

        this.generatorInstanceExtists = false;
    }

    /**
     * Registers event handler for "exit" event
     * @param event "exit" 
     * @param callBack Callback function that gets executed when the journalctl process is closed or killed
     */
    public override on(event: "exit", callBack: () => void): this;
    /**
     * Registers event handler for "message" event
     * @param event "message"
     * @param callBack Callback function which gets called with the incoming message object as sole argument
     */
    public override on(event: "message", callBack: (message: FieldNames extends readonly string[] ? JournalDEntryWithExplicitFieldNames<FieldNames> : JournalDEntry) => void): this;
    /**
     * Registers event handler for "error" event
     * @param event "error"
     * @param callBack Callback function which gets called when any error occurs during the reading of the systemd journal
     */
    public override on(event: "error", callBack: (err: Error) => void): this;
    public override on(event: JournalCtlEvent, callBack: ((...args: any[]) => void)): this {
        return super.on(event, callBack);
    }

    /**
     * Creates an AsyncGenerator for this instance
     * @returns AsyncGenerator which yields one journald message at a time as they come in
     */
    public async *createGenerator(): AsyncGenerator<FieldNames extends readonly string[] ? JournalDEntryWithExplicitFieldNames<FieldNames> : JournalDEntry, { totalEntries: number; }> {
        if (this.generatorInstanceExtists) {
            throw new Error(`Only one instance of the async message generator can be created per JournalCtl instance.`);
        }
        this.generatorInstanceExtists = true;
        type JournalDEntryActual = FieldNames extends readonly string[] ? JournalDEntryWithExplicitFieldNames<FieldNames> : JournalDEntry;

        let totalEntries = 0;
        let resolve: (value: JournalDEntryActual | undefined) => void;
        //let reject: (err: Error) => void;
        const messagePromises: Promise<JournalDEntryActual | undefined>[] = [];
        const createPromise = () => new Promise<JournalDEntryActual | undefined>((res /*, rej */) => { resolve = res; /*reject = rej;*/ });
        messagePromises.push(createPromise());

        this.on('error', () => {
            //reject(err);
            resolve(undefined);
        }).on('message', message => {
            const oldResolve: (value: JournalDEntryActual) => void = resolve;
            messagePromises.push(createPromise());
            totalEntries++;
            oldResolve(message);
        }).on('exit', () => {
            resolve(undefined);
        });

        let result: JournalDEntryActual | undefined;
        while (result = await messagePromises.shift()) {
            yield result;
        }
        return { totalEntries: totalEntries };
    }

    /**
     * Stops the journalctl process and causes this instance to eventually emit the 'exit' event
     * @returns the return value of ChildProcess.kill()
     */
    public stop(): boolean {
        return this.journalCtl.kill();
    }
}