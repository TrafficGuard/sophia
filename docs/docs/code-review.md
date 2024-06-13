# AI Code reviews

Nous has support for AI code reviews of GitLab merge requests. GitHub support is a good candidate for using the Code Editor agent to assist with!

The configuration files are located in the [/resources](https://github.com/TrafficGuard/nous/tree/preview/resources/codeReview) folder.

Code review are useful for guidelines where a lint rule doesn't exist yet, or it can't easily be codified.

It can be useful when a lint rule does exist, but there are many violations which need be fixed in a project before the rule can be enabled at the error level.
In this case the AI reviewer can stop additional violations of a lint rule being added to the code base.

The configuration has two elements to filter diffs to review to minimize LLM costs.

- file_extensions: The file must end with one of the provided file extension(s)
- requires: The diff must contain the provided text.

Lines numbers are added to the diffs as comments every 10 lines and in blank lines to assist the AI in providing the correct line number to add the comment.

```XML
<code_review xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="schema.xsd">
    <description>
        All TypeScript functions should have the typing for the return type. If it's possible to confidently infer the return
        type, then include it in the review comment, otherwise use the placeholder TODO. If the function is async then ensure
        the return type is a Promise.
    </description>
    <file_extensions>
        <include>.ts</include>
    </file_extensions>
    <requires>
        <text>) {</text>
    </requires>
    <examples>
        <example>
            <code><![CDATA[
                async function sendBirthdayGreeting(user: User | null) {
                    if (!user) throw new Error('User was null');
                    if (user.dateOfBirth < Date.now()) throw new Error(`dateOfBirth in the future for user ${user.id}`);
                    if (dayOfYear(user.dateOfBirth) === dayOfYear(Date.now())) {
                        await this.emailService.sendEmail(this.createBdayEmail(user));
                    }
                }
            ]]></code>
            <review_comment><![CDATA[
                Functions must specify a return type.
                ```
                async sendBirthdayGreeting(user: User | null): Promise<void> {
                ```
            ]]></review_comment>
        </example>
        <example>
            <code><![CDATA[
                async function processAsync() {
                    return buildComplexTypeAsync()
                }
            ]]></code>
            <review_comment><![CDATA[
                Functions must specify a return type.
                ```
                async function processAsync(): Promise<TODO> {
                ```
            ]]></review_comment>
        </example>
        <example>
            <code><![CDATA[
                function processSync() {
                    return buildComplexTypeSync()
                }
            ]]></code>
            <review_comment><![CDATA[
                Functions must specify a return type.
                ```
                function processSync(): TODO {
                ```
            ]]></review_comment>
        </example>
    </examples>
</code_review>
```


```xml
<code_review xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="schema.xsd">
    <description>
        Prefer returning/throwing early, and handling null/empty cases first.
        If an else block throws or returns, switch the ordering of the if/else blocks, which will result in not having an else block.
        The line number should be the line of the `if` statement.
        If there are multiple nested if/else block violations then leave a single review comment covering all violations.
    </description>
    <file_extensions>
        <include>.ts</include>
        <include>.js</include>
    </file_extensions>
    <requires>
        <text>else {</text>
    </requires>
    <examples>
        <example>
            <code><![CDATA[
                async sendBirthdayGreeting(user: User | null): Promise<void> {
                    if (user) {
                        if(user.dateOfBirth > Date.now()) {
                            if (dayOfYear(user.dateOfBirth) === dayOfYear(Date.now())) {
                                await this.emailService.sendEmail(this.createBdayEmail(user));
                            }
                        } else {
                            throw new Error(`dateOfBirth in the future for user ${user.id}`);
                        }
                    } else {
                        throw new Error('User was null');
                    }
                }
            ]]></code>
            <review_comment><![CDATA[
                Handle exceptional cases first and exit early to simplify the code flow.
                ```
                async sendBirthdayGreeting(user: User | null): Promise<void> {
                    if (!user) throw new Error('User was null');
                    if (user.dateOfBirth < Date.now()) throw new Error(`dateOfBirth in the future for user ${user.id}`);

                    if (dayOfYear(user.dateOfBirth) === dayOfYear(Date.now())) {
                        await this.emailService.sendEmail(this.createBdayEmail(user));
                    }
                }
                ```
            ]]></review_comment>
        </example>
        <example>
            <code><![CDATA[
                async function deleteReservation(): Promise<boolean> {
                    const reservations = this.getReservations();
                    if (reservations.length) {
                        await this.reservationsClient.deleteReservation({ name: reservations[0].name });
                        return true;
                    } else {
                        logger.info("No BigQuery reservation found.");
                        return false;
                    }
                }
            ]]></code>
            <review_comment><![CDATA[
                Handle exceptional cases first and exit early to simplify the code flow.
                ```
                async function deleteReservation(): Promise<boolean> {
                    const reservations = this.getReservations();

                    if (!reservations.length) {
                        logger.info("No BigQuery reservation found.");
                        return false;
                    }

                    await this.reservationsClient.deleteReservation({ name: reservations[0].name });
                    return true;
                }
                ```
            ]]></review_comment>
        </example>
    </examples>
</code_review>
```
